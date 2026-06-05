export type PlanKey = "free" | "pro" | "family";

export interface PlanLimits {
  name: string;
  priceMonthly: number;
  priceLabel: string;
  description: string;
  uploadsPerMonth: number;
  aiSummariesPerMonth: number;
  chatMessagesPerMonth: number;
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
    uploadsPerMonth: 5,
    aiSummariesPerMonth: 5,
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
    uploadsPerMonth: 50,
    aiSummariesPerMonth: 50,
    chatMessagesPerMonth: 500,
    chatMessagesPerDay: 500,
    maxImagePagesPerReport: 20,
    caregiverSharing: true,
    familyMembersLimit: 12,
  },
};

export function normalizePlanKey(plan: string | null | undefined): PlanKey {
  if (plan === "pro" || plan === "family") return plan;
  return "free";
}

export function getPlanLimits(plan: string | null | undefined): PlanLimits {
  return PLAN_LIMITS[normalizePlanKey(plan)];
}

export function checkImagePageCount(
  plan: PlanKey,
  selectedPages: number
): { allowed: boolean; limit: number } {
  const limit = PLAN_LIMITS[plan].maxImagePagesPerReport;
  return { allowed: selectedPages <= limit, limit };
}

export function planAllowsCaregiverSharing(plan: string | null | undefined): boolean {
  return getPlanLimits(plan).caregiverSharing;
}
