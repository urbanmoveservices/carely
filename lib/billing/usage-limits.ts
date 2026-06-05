import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";
import { isRazorpayConfigured } from "@/lib/billing/razorpay";
import prisma from "@/lib/prisma";
import {
  getPlanLimits,
  normalizePlanKey,
  planAllowsCaregiverSharing,
  type PlanKey,
  type PlanLimits,
} from "@/lib/billing/plan-config";

export const USAGE_COUNTER_DELEGATE_MISSING_MSG =
  "Prisma UsageCounter delegate missing. Run npx prisma generate and restart the dev server.";

type UsageCounterDelegate = {
  upsert: (args: {
    where: { userId_monthKey: { userId: string; monthKey: string } };
    create: {
      userId: string;
      monthKey: string;
      uploadsUsed?: number;
      aiSummariesUsed?: number;
      chatMessagesUsed?: number;
    };
    update: Record<string, unknown>;
  }) => Promise<{
    uploadsUsed: number;
    aiSummariesUsed: number;
    chatMessagesUsed: number;
  }>;
};

export function getUsageCounterDelegate(): UsageCounterDelegate | null {
  const delegate = (
    prisma as unknown as { usageCounter?: UsageCounterDelegate }
  ).usageCounter;
  if (!delegate || typeof delegate.upsert !== "function") {
    return null;
  }
  return delegate;
}

export const LIMIT_RESET_NOTE =
  "Usage resets monthly based on Vaidya GPT server billing period, not your device date.";

export type UsageLimitCode =
  | "UPLOAD_LIMIT_REACHED"
  | "AI_SUMMARY_LIMIT_REACHED"
  | "FAMILY_MEMBER_LIMIT_REACHED";

export type PlanUserRecord = {
  id: string;
  currentPlan: string | null;
  subscriptionEndsAt: Date | null;
  subscriptionStatus?: string | null;
  subscriptionStartedAt?: Date | null;
  billingProvider?: string | null;
};

/** Server UTC billing period — never derived from client input. */
export function getCurrentBillingPeriod(serverNow: Date = new Date()): string {
  const y = serverNow.getUTCFullYear();
  const m = String(serverNow.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function getEffectivePlan(
  user: Pick<PlanUserRecord, "currentPlan" | "subscriptionEndsAt"> | null | undefined,
  serverNow: Date = new Date()
): PlanKey {
  if (!user) return "free";
  const stored = normalizePlanKey(user.currentPlan);
  if (stored === "free") return "free";
  const endsAt = user.subscriptionEndsAt;
  if (endsAt && endsAt.getTime() < serverNow.getTime()) {
    return "free";
  }
  return stored;
}

export function getPlanLimitsForUser(
  user: Pick<PlanUserRecord, "currentPlan" | "subscriptionEndsAt"> | null | undefined,
  serverNow: Date = new Date()
): PlanLimits {
  return getPlanLimits(getEffectivePlan(user, serverNow));
}

export async function getUserForUsage(userId: string): Promise<PlanUserRecord | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      currentPlan: true,
      subscriptionEndsAt: true,
      subscriptionStatus: true,
      subscriptionStartedAt: true,
      billingProvider: true,
    },
  });
}

export async function getOrCreateUsageCounter(
  userId: string,
  periodKey = getCurrentBillingPeriod()
) {
  const usageCounter = getUsageCounterDelegate();
  if (!usageCounter) {
    throw new Error(USAGE_COUNTER_DELEGATE_MISSING_MSG);
  }
  return usageCounter.upsert({
    where: { userId_monthKey: { userId, monthKey: periodKey } },
    create: { userId, monthKey: periodKey },
    update: {},
  });
}

async function readUsageCounts(userId: string, periodKey = getCurrentBillingPeriod()) {
  if (!getUsageCounterDelegate()) {
    return { uploadsUsed: 0, aiSummariesUsed: 0, chatMessagesUsed: 0 };
  }
  try {
    const counter = await getOrCreateUsageCounter(userId, periodKey);
    return {
      uploadsUsed: counter.uploadsUsed,
      aiSummariesUsed: counter.aiSummariesUsed,
      chatMessagesUsed: counter.chatMessagesUsed ?? 0,
    };
  } catch {
    return { uploadsUsed: 0, aiSummariesUsed: 0, chatMessagesUsed: 0 };
  }
}

export async function countFamilyMembers(userId: string): Promise<number> {
  return prisma.familyMember.count({ where: { userId } });
}

export async function assertCanUpload(userId: string): Promise<{
  allowed: boolean;
  code?: UsageLimitCode;
  message?: string;
  used: number;
  limit: number;
  plan: PlanKey;
  periodKey: string;
}> {
  const serverNow = new Date();
  const periodKey = getCurrentBillingPeriod(serverNow);
  const user = await getUserForUsage(userId);
  if (!user) {
    return {
      allowed: false,
      code: "UPLOAD_LIMIT_REACHED",
      message: "User not found.",
      used: 0,
      limit: 0,
      plan: "free",
      periodKey,
    };
  }
  const plan = getEffectivePlan(user, serverNow);
  const limits = getPlanLimits(plan);
  const counter = await readUsageCounts(userId, periodKey);
  const allowed = counter.uploadsUsed < limits.uploadsPerMonth;
  return {
    allowed,
    code: allowed ? undefined : "UPLOAD_LIMIT_REACHED",
    message: allowed
      ? undefined
      : `Monthly upload limit reached (${limits.uploadsPerMonth}/month on ${limits.name}). ${LIMIT_RESET_NOTE}`,
    used: counter.uploadsUsed,
    limit: limits.uploadsPerMonth,
    plan,
    periodKey,
  };
}

export async function assertCanGenerateAiSummary(userId: string): Promise<{
  allowed: boolean;
  code?: UsageLimitCode;
  message?: string;
  used: number;
  limit: number;
  plan: PlanKey;
  periodKey: string;
}> {
  const serverNow = new Date();
  const periodKey = getCurrentBillingPeriod(serverNow);
  const user = await getUserForUsage(userId);
  if (!user) {
    return {
      allowed: false,
      code: "AI_SUMMARY_LIMIT_REACHED",
      message: "User not found.",
      used: 0,
      limit: 0,
      plan: "free",
      periodKey,
    };
  }
  const plan = getEffectivePlan(user, serverNow);
  const limits = getPlanLimits(plan);
  const counter = await readUsageCounts(userId, periodKey);
  const allowed = counter.aiSummariesUsed < limits.aiSummariesPerMonth;
  return {
    allowed,
    code: allowed ? undefined : "AI_SUMMARY_LIMIT_REACHED",
    message: allowed
      ? undefined
      : `Monthly AI summary limit reached (${limits.aiSummariesPerMonth}/month on ${limits.name}). ${LIMIT_RESET_NOTE}`,
    used: counter.aiSummariesUsed,
    limit: limits.aiSummariesPerMonth,
    plan,
    periodKey,
  };
}

export async function assertCanCreateFamilyMember(userId: string): Promise<{
  allowed: boolean;
  code?: UsageLimitCode;
  message?: string;
  used: number;
  limit: number;
  plan: PlanKey;
}> {
  const serverNow = new Date();
  const user = await getUserForUsage(userId);
  if (!user) {
    return {
      allowed: false,
      code: "FAMILY_MEMBER_LIMIT_REACHED",
      message: "User not found.",
      used: 0,
      limit: 0,
      plan: "free",
    };
  }
  const plan = getEffectivePlan(user, serverNow);
  const limits = getPlanLimits(plan);
  const used = await countFamilyMembers(userId);
  const allowed = used < limits.familyMembersLimit;
  return {
    allowed,
    code: allowed ? undefined : "FAMILY_MEMBER_LIMIT_REACHED",
    message: allowed
      ? undefined
      : `Family member limit reached (${limits.familyMembersLimit} on ${limits.name}).`,
    used,
    limit: limits.familyMembersLimit,
    plan,
  };
}

export async function incrementUploadUsage(
  userId: string,
  documentId: string,
  request?: Request,
  email?: string
): Promise<void> {
  const usageCounter = getUsageCounterDelegate();
  if (!usageCounter) {
    console.warn(USAGE_COUNTER_DELEGATE_MISSING_MSG);
    return;
  }
  const periodKey = getCurrentBillingPeriod();
  await usageCounter.upsert({
    where: { userId_monthKey: { userId, monthKey: periodKey } },
    create: { userId, monthKey: periodKey, uploadsUsed: 1 },
    update: { uploadsUsed: { increment: 1 } },
  });
  if (request && email) {
    await auditUserAction(request, userId, email, AUDIT_ACTIONS.USAGE_UPLOAD_INCREMENTED, {
      entityType: "usage_counter",
      entityId: documentId,
      metadata: { monthKey: periodKey, documentId },
    });
  }
}

export async function incrementAiSummaryUsage(
  userId: string,
  reportId: string,
  request?: Request,
  email?: string
): Promise<void> {
  const usageCounter = getUsageCounterDelegate();
  if (!usageCounter) {
    console.warn(USAGE_COUNTER_DELEGATE_MISSING_MSG);
    return;
  }
  const periodKey = getCurrentBillingPeriod();
  await usageCounter.upsert({
    where: { userId_monthKey: { userId, monthKey: periodKey } },
    create: { userId, monthKey: periodKey, aiSummariesUsed: 1 },
    update: { aiSummariesUsed: { increment: 1 } },
  });
  if (request && email) {
    await auditUserAction(request, userId, email, AUDIT_ACTIONS.USAGE_AI_INCREMENTED, {
      entityType: "usage_counter",
      entityId: reportId,
      metadata: { monthKey: periodKey, reportId },
    });
  }
}

export async function incrementChatMessageUsage(userId: string): Promise<void> {
  const usageCounter = getUsageCounterDelegate();
  if (!usageCounter) {
    console.warn(USAGE_COUNTER_DELEGATE_MISSING_MSG);
    return;
  }
  const periodKey = getCurrentBillingPeriod();
  await usageCounter.upsert({
    where: { userId_monthKey: { userId, monthKey: periodKey } },
    create: { userId, monthKey: periodKey, chatMessagesUsed: 1 },
    update: { chatMessagesUsed: { increment: 1 } },
  });
}

export interface ServerBillingUsage {
  plan: PlanKey;
  periodKey: string;
  serverTime: string;
  limits: {
    uploads: number;
    aiSummaries: number;
    familyMembers: number;
  };
  used: {
    uploads: number;
    aiSummaries: number;
    familyMembers: number;
  };
  remaining: {
    uploads: number;
    aiSummaries: number;
    familyMembers: number;
  };
}

export interface BillingUsageApiResponse extends ServerBillingUsage {
  planName: string;
  priceLabel: string;
  description: string;
  subscriptionStatus: string;
  planStartedAt: string | null;
  planExpiresAt: string | null;
  billingProvider: string | null;
  razorpayConfigured: boolean;
  maxImagePagesPerReport: number;
  caregiverSharing: boolean;
  chatMessagesUsed: number;
  chatMessagesLimit: number;
  storedPlan: PlanKey;
  effectivePlan: PlanKey;
  limitResetNote: string;
  warning?: string;
  usageCounterUnavailable?: boolean;
}

export async function getServerBillingUsage(userId: string): Promise<BillingUsageApiResponse> {
  const serverNow = new Date();
  const periodKey = getCurrentBillingPeriod(serverNow);
  const user = await getUserForUsage(userId);
  if (!user) throw new Error("User not found");

  const storedPlan = normalizePlanKey(user.currentPlan);
  const effectivePlan = getEffectivePlan(user, serverNow);
  const limits = getPlanLimits(effectivePlan);
  const familyMembersUsed = await countFamilyMembers(userId);

  const baseUsed = {
    uploads: 0,
    aiSummaries: 0,
    familyMembers: familyMembersUsed,
  };

  let used = { ...baseUsed };
  let chatMessagesUsed = 0;
  let warning: string | undefined;
  let usageCounterUnavailable = false;

  if (!getUsageCounterDelegate()) {
    usageCounterUnavailable = true;
    warning = "Usage counter unavailable; regenerate Prisma client.";
  } else {
    try {
      const counter = await getOrCreateUsageCounter(userId, periodKey);
      used = {
        uploads: counter.uploadsUsed,
        aiSummaries: counter.aiSummariesUsed,
        familyMembers: familyMembersUsed,
      };
      chatMessagesUsed = counter.chatMessagesUsed ?? 0;
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("UsageCounter delegate missing")) {
        usageCounterUnavailable = true;
        warning = "Usage counter unavailable; regenerate Prisma client.";
      } else {
        throw err;
      }
    }
  }

  const quotaLimits = {
    uploads: limits.uploadsPerMonth,
    aiSummaries: limits.aiSummariesPerMonth,
    familyMembers: limits.familyMembersLimit,
  };

  return {
    plan: effectivePlan,
    storedPlan,
    effectivePlan,
    periodKey,
    serverTime: serverNow.toISOString(),
    limits: quotaLimits,
    used,
    remaining: {
      uploads: Math.max(0, quotaLimits.uploads - used.uploads),
      aiSummaries: Math.max(0, quotaLimits.aiSummaries - used.aiSummaries),
      familyMembers: Math.max(0, quotaLimits.familyMembers - used.familyMembers),
    },
    planName: limits.name,
    priceLabel: limits.priceLabel,
    description: limits.description,
    subscriptionStatus: user.subscriptionStatus ?? "inactive",
    planStartedAt: user.subscriptionStartedAt?.toISOString() ?? null,
    planExpiresAt: user.subscriptionEndsAt?.toISOString() ?? null,
    billingProvider: user.billingProvider ?? null,
    razorpayConfigured: isRazorpayConfigured(),
    maxImagePagesPerReport: limits.maxImagePagesPerReport,
    caregiverSharing: planAllowsCaregiverSharing(effectivePlan),
    chatMessagesUsed,
    chatMessagesLimit: limits.chatMessagesPerMonth,
    limitResetNote: LIMIT_RESET_NOTE,
    warning,
    usageCounterUnavailable,
  };
}

export async function getImagePageLimitForUser(userId: string): Promise<{
  limit: number;
  plan: PlanKey;
}> {
  const user = await getUserForUsage(userId);
  const plan = getEffectivePlan(user);
  return { limit: getPlanLimits(plan).maxImagePagesPerReport, plan };
}

/** Normalize API usage payload for UI (supports legacy `usage` block). */
export function getUsageQuotaView(summary: {
  used?: { uploads: number; aiSummaries: number; familyMembers: number };
  limits?: { uploads: number; aiSummaries: number; familyMembers: number };
  usage?: {
    uploadsUsed: number;
    uploadsLimit: number;
    aiSummariesUsed: number;
    aiSummariesLimit: number;
    familyMembersUsed: number;
    familyMembersLimit: number;
  };
}) {
  if (summary.used && summary.limits) {
    return {
      uploadsUsed: summary.used.uploads,
      uploadsLimit: summary.limits.uploads,
      aiSummariesUsed: summary.used.aiSummaries,
      aiSummariesLimit: summary.limits.aiSummaries,
      familyMembersUsed: summary.used.familyMembers,
      familyMembersLimit: summary.limits.familyMembers,
    };
  }
  const u = summary.usage;
  return {
    uploadsUsed: u?.uploadsUsed ?? 0,
    uploadsLimit: u?.uploadsLimit ?? 0,
    aiSummariesUsed: u?.aiSummariesUsed ?? 0,
    aiSummariesLimit: u?.aiSummariesLimit ?? 0,
    familyMembersUsed: u?.familyMembersUsed ?? 0,
    familyMembersLimit: u?.familyMembersLimit ?? 0,
  };
}
