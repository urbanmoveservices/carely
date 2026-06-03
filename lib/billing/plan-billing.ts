import type { PlanKey } from "@/lib/plans";

export type PaidPlanKey = "pro" | "family";

export type PaidPlanBillingConfig = {
  amountPaise: number;
  durationDays: number;
};

export const PAID_PLAN_BILLING: Record<PaidPlanKey, PaidPlanBillingConfig> = {
  pro: { amountPaise: 900, durationDays: 30 },
  family: { amountPaise: 24900, durationDays: 30 },
};

export function isPaidPlanKey(plan: string): plan is PaidPlanKey {
  return plan === "pro" || plan === "family";
}

export function getPaidPlanBilling(plan: string): PaidPlanBillingConfig | null {
  if (!isPaidPlanKey(plan)) return null;
  return PAID_PLAN_BILLING[plan];
}

export function getPaidPlanAmountPaise(plan: string): number | null {
  return getPaidPlanBilling(plan)?.amountPaise ?? null;
}
