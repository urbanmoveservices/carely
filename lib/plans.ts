import prisma from "./prisma";
import { auditUserAction, AUDIT_ACTIONS } from "./audit-log";
import { isRazorpayConfigured } from "@/lib/billing/razorpay";

export type PlanKey = "free" | "pro" | "family";

export interface PlanLimits {
  name: string;
  priceMonthly: number;
  priceLabel: string;
  description: string;
  uploadsPerMonth: number;
  aiSummariesPerMonth: number;
  chatMessagesPerMonth: number;
  /** Daily AI chat asks (enforced on /api/chat/ask). */
  chatMessagesPerDay: number;
  maxImagePagesPerReport: number;
  caregiverSharing: boolean;
  familyMembersLimit: number;
}

export const PLAN_LIMITS: Record<PlanKey, PlanLimits> = {
  free: {
    name: "Free",
    priceMonthly: 0,
    priceLabel: "₹0/month",
    description: "Basic personal report understanding",
    uploadsPerMonth: 3,
    aiSummariesPerMonth: 1,
    chatMessagesPerMonth: 20,
    chatMessagesPerDay: 20,
    maxImagePagesPerReport: 3,
    caregiverSharing: false,
    familyMembersLimit: 2,
  },
  pro: {
    name: "Pro",
    priceMonthly: 9,
    priceLabel: "₹9/month",
    description: "More uploads and AI summaries for active users",
    uploadsPerMonth: 50,
    aiSummariesPerMonth: 50,
    chatMessagesPerMonth: 200,
    chatMessagesPerDay: 200,
    maxImagePagesPerReport: 20,
    caregiverSharing: false,
    familyMembersLimit: 5,
  },
  family: {
    name: "Family",
    priceMonthly: 249,
    priceLabel: "₹249/month",
    description: "Full family health management with caregiver sharing",
    uploadsPerMonth: 500,
    aiSummariesPerMonth: 500,
    chatMessagesPerMonth: 500,
    chatMessagesPerDay: 500,
    maxImagePagesPerReport: 20,
    caregiverSharing: true,
    familyMembersLimit: 25,
  },
};

export function normalizePlanKey(plan: string | null | undefined): PlanKey {
  if (plan === "pro" || plan === "family") return plan;
  return "free";
}

export function getPlanLimits(plan: string | null | undefined): PlanLimits {
  return PLAN_LIMITS[normalizePlanKey(plan)];
}

export function getCurrentMonthKey(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

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
  }) => Promise<{ uploadsUsed: number; aiSummariesUsed: number; chatMessagesUsed: number }>;
  findUnique?: (args: {
    where: { userId_monthKey: { userId: string; monthKey: string } };
  }) => Promise<{ uploadsUsed: number; aiSummariesUsed: number; chatMessagesUsed: number } | null>;
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

async function getOrCreateUsageCounter(userId: string, monthKey = getCurrentMonthKey()) {
  const usageCounter = getUsageCounterDelegate();
  if (!usageCounter) {
    throw new Error(USAGE_COUNTER_DELEGATE_MISSING_MSG);
  }
  return usageCounter.upsert({
    where: { userId_monthKey: { userId, monthKey } },
    create: { userId, monthKey },
    update: {},
  });
}

async function readUsageCounts(userId: string, monthKey = getCurrentMonthKey()) {
  if (!getUsageCounterDelegate()) {
    return { uploadsUsed: 0, aiSummariesUsed: 0, chatMessagesUsed: 0 };
  }
  try {
    const counter = await getOrCreateUsageCounter(userId, monthKey);
    return {
      uploadsUsed: counter.uploadsUsed,
      aiSummariesUsed: counter.aiSummariesUsed,
      chatMessagesUsed: counter.chatMessagesUsed ?? 0,
    };
  } catch {
    return { uploadsUsed: 0, aiSummariesUsed: 0, chatMessagesUsed: 0 };
  }
}

export async function getImagePageLimitForUser(userId: string): Promise<{
  limit: number;
  plan: PlanKey;
}> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const plan = normalizePlanKey(user?.currentPlan);
  return { limit: PLAN_LIMITS[plan].maxImagePagesPerReport, plan };
}

export function checkImagePageCount(
  plan: PlanKey,
  selectedPages: number
): { allowed: boolean; limit: number } {
  const limit = PLAN_LIMITS[plan].maxImagePagesPerReport;
  return { allowed: selectedPages <= limit, limit };
}

export async function canUpload(userId: string): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
}> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { allowed: false, used: 0, limit: 0 };
  const limits = getPlanLimits(user.currentPlan);
  const counter = await readUsageCounts(userId);
  return {
    allowed: counter.uploadsUsed < limits.uploadsPerMonth,
    used: counter.uploadsUsed,
    limit: limits.uploadsPerMonth,
  };
}

export async function canGenerateAiSummary(userId: string): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
}> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { allowed: false, used: 0, limit: 0 };
  const limits = getPlanLimits(user.currentPlan);
  const counter = await readUsageCounts(userId);
  return {
    allowed: counter.aiSummariesUsed < limits.aiSummariesPerMonth,
    used: counter.aiSummariesUsed,
    limit: limits.aiSummariesPerMonth,
  };
}

export async function canSendChatMessage(userId: string): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
}> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { allowed: false, used: 0, limit: 0 };
  const limits = getPlanLimits(user.currentPlan);
  const counter = await readUsageCounts(userId);
  return {
    allowed: counter.chatMessagesUsed < limits.chatMessagesPerMonth,
    used: counter.chatMessagesUsed,
    limit: limits.chatMessagesPerMonth,
  };
}

export async function canAddFamilyMember(userId: string): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
}> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { allowed: false, used: 0, limit: 0 };
  const limits = getPlanLimits(user.currentPlan);
  const used = await prisma.familyMember.count({ where: { userId } });
  return {
    allowed: used < limits.familyMembersLimit,
    used,
    limit: limits.familyMembersLimit,
  };
}

export function planAllowsCaregiverSharing(plan: string | null | undefined): boolean {
  return getPlanLimits(plan).caregiverSharing;
}

export async function incrementUploadUsage(
  userId: string,
  request?: Request,
  email?: string
): Promise<void> {
  const usageCounter = getUsageCounterDelegate();
  if (!usageCounter) {
    console.warn(USAGE_COUNTER_DELEGATE_MISSING_MSG);
    return;
  }
  const monthKey = getCurrentMonthKey();
  await usageCounter.upsert({
    where: { userId_monthKey: { userId, monthKey } },
    create: { userId, monthKey, uploadsUsed: 1 },
    update: { uploadsUsed: { increment: 1 } },
  });
  if (request && email) {
    await auditUserAction(request, userId, email, AUDIT_ACTIONS.USAGE_UPLOAD_INCREMENTED, {
      entityType: "usage_counter",
      metadata: { monthKey },
    });
  }
}

export async function incrementAiSummaryUsage(
  userId: string,
  request?: Request,
  email?: string
): Promise<void> {
  const usageCounter = getUsageCounterDelegate();
  if (!usageCounter) {
    console.warn(USAGE_COUNTER_DELEGATE_MISSING_MSG);
    return;
  }
  const monthKey = getCurrentMonthKey();
  await usageCounter.upsert({
    where: { userId_monthKey: { userId, monthKey } },
    create: { userId, monthKey, aiSummariesUsed: 1 },
    update: { aiSummariesUsed: { increment: 1 } },
  });
  if (request && email) {
    await auditUserAction(request, userId, email, AUDIT_ACTIONS.USAGE_AI_INCREMENTED, {
      entityType: "usage_counter",
      metadata: { monthKey },
    });
  }
}

export async function incrementChatMessageUsage(userId: string): Promise<void> {
  const usageCounter = getUsageCounterDelegate();
  if (!usageCounter) {
    console.warn(USAGE_COUNTER_DELEGATE_MISSING_MSG);
    return;
  }
  const monthKey = getCurrentMonthKey();
  await usageCounter.upsert({
    where: { userId_monthKey: { userId, monthKey } },
    create: { userId, monthKey, chatMessagesUsed: 1 },
    update: { chatMessagesUsed: { increment: 1 } },
  });
}

export interface UsageSummary {
  plan: PlanKey;
  planName: string;
  priceLabel: string;
  description: string;
  subscriptionStatus: string;
  planStartedAt: string | null;
  planExpiresAt: string | null;
  billingProvider: string | null;
  razorpayConfigured: boolean;
  monthKey: string;
  usage: {
    uploadsUsed: number;
    uploadsLimit: number;
    aiSummariesUsed: number;
    aiSummariesLimit: number;
    chatMessagesUsed: number;
    chatMessagesLimit: number;
    familyMembersUsed: number;
    familyMembersLimit: number;
    maxImagePagesPerReport: number;
    caregiverSharing: boolean;
  };
  warning?: string;
}

export async function getUsageSummarySafe(
  userId: string
): Promise<UsageSummary & { usageCounterUnavailable?: boolean }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const plan = normalizePlanKey(user.currentPlan);
  const limits = PLAN_LIMITS[plan];
  const monthKey = getCurrentMonthKey();
  const familyMembersUsed = await prisma.familyMember.count({
    where: { userId },
  });

  const base: UsageSummary = {
    plan,
    planName: limits.name,
    priceLabel: limits.priceLabel,
    description: limits.description,
    subscriptionStatus: user.subscriptionStatus,
    planStartedAt: user.subscriptionStartedAt?.toISOString() ?? null,
    planExpiresAt: user.subscriptionEndsAt?.toISOString() ?? null,
    billingProvider: user.billingProvider ?? null,
    razorpayConfigured: isRazorpayConfigured(),
    monthKey,
    usage: {
      uploadsUsed: 0,
      uploadsLimit: limits.uploadsPerMonth,
      aiSummariesUsed: 0,
      aiSummariesLimit: limits.aiSummariesPerMonth,
      chatMessagesUsed: 0,
      chatMessagesLimit: limits.chatMessagesPerMonth,
      familyMembersUsed,
      familyMembersLimit: limits.familyMembersLimit,
      maxImagePagesPerReport: limits.maxImagePagesPerReport,
      caregiverSharing: limits.caregiverSharing,
    },
  };

  if (!getUsageCounterDelegate()) {
    return {
      ...base,
      usageCounterUnavailable: true,
      warning: "Usage counter unavailable; regenerate Prisma client.",
    };
  }

  try {
    const counter = await getOrCreateUsageCounter(userId, monthKey);
    return {
      ...base,
      usage: {
        ...base.usage,
        uploadsUsed: counter.uploadsUsed,
        aiSummariesUsed: counter.aiSummariesUsed,
        chatMessagesUsed: counter.chatMessagesUsed ?? 0,
        chatMessagesLimit: limits.chatMessagesPerMonth,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("UsageCounter delegate missing")) {
      return {
        ...base,
        usageCounterUnavailable: true,
        warning: "Usage counter unavailable; regenerate Prisma client.",
      };
    }
    throw err;
  }
}

export async function getUsageSummary(userId: string): Promise<UsageSummary> {
  const summary = await getUsageSummarySafe(userId);
  if (summary.usageCounterUnavailable) {
    console.warn(USAGE_COUNTER_DELEGATE_MISSING_MSG);
  }
  const { usageCounterUnavailable: _u, ...rest } = summary;
  return rest;
}
