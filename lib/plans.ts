import type { BillingUsageApiResponse } from "@/lib/billing/usage-limits";

export type { PlanKey, PlanLimits } from "@/lib/billing/plan-config";
export {
  PLAN_LIMITS,
  normalizePlanKey,
  getPlanLimits,
  checkImagePageCount,
  planAllowsCaregiverSharing,
} from "@/lib/billing/plan-config";

export function getCurrentMonthKey(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export {
  assertCanUpload as canUpload,
  assertCanGenerateAiSummary as canGenerateAiSummary,
  assertCanCreateFamilyMember as canAddFamilyMember,
  incrementUploadUsage,
  incrementAiSummaryUsage,
  incrementChatMessageUsage,
  getImagePageLimitForUser,
  getServerBillingUsage as getUsageSummarySafe,
  getCurrentBillingPeriod,
  getEffectivePlan,
  getUsageCounterDelegate,
  USAGE_COUNTER_DELEGATE_MISSING_MSG,
  LIMIT_RESET_NOTE,
  getUsageQuotaView,
} from "@/lib/billing/usage-limits";

export type UsageSummary = BillingUsageApiResponse & {
  monthKey?: string;
  usage?: {
    uploadsUsed: number;
    uploadsLimit: number;
    aiSummariesUsed: number;
    aiSummariesLimit: number;
    chatMessagesUsed?: number;
    chatMessagesLimit?: number;
    familyMembersUsed: number;
    familyMembersLimit: number;
    maxImagePagesPerReport: number;
    caregiverSharing: boolean;
  };
};

export async function getUsageSummary(userId: string): Promise<UsageSummary> {
  const { getServerBillingUsage, USAGE_COUNTER_DELEGATE_MISSING_MSG } = await import(
    "@/lib/billing/usage-limits"
  );
  const summary = await getServerBillingUsage(userId);
  if (summary.usageCounterUnavailable) {
    console.warn(USAGE_COUNTER_DELEGATE_MISSING_MSG);
  }
  return toLegacyUsageSummary(summary);
}

export function toLegacyUsageSummary(summary: BillingUsageApiResponse): UsageSummary {
  return {
    ...summary,
    monthKey: summary.periodKey,
    usage: {
      uploadsUsed: summary.used.uploads,
      uploadsLimit: summary.limits.uploads,
      aiSummariesUsed: summary.used.aiSummaries,
      aiSummariesLimit: summary.limits.aiSummaries,
      chatMessagesUsed: summary.chatMessagesUsed,
      chatMessagesLimit: summary.chatMessagesLimit,
      familyMembersUsed: summary.used.familyMembers,
      familyMembersLimit: summary.limits.familyMembers,
      maxImagePagesPerReport: summary.maxImagePagesPerReport,
      caregiverSharing: summary.caregiverSharing,
    },
  };
}
