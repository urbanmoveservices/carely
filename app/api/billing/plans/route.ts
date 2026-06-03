import { PLAN_LIMITS } from "@/lib/plans";
import { PAID_PLAN_BILLING } from "@/lib/billing/plan-billing";
import { isRazorpayConfigured } from "@/lib/billing/razorpay";
import { ok, serverError } from "@/lib/api-response";

export async function GET() {
  try {
    const razorpayConfigured = isRazorpayConfigured();
    return ok({
      razorpayConfigured,
      plans: Object.entries(PLAN_LIMITS).map(([key, plan]) => ({
        key,
        ...plan,
        amountPaise:
          key === "pro"
            ? PAID_PLAN_BILLING.pro.amountPaise
            : key === "family"
              ? PAID_PLAN_BILLING.family.amountPaise
              : 0,
        durationDays:
          key === "pro"
            ? PAID_PLAN_BILLING.pro.durationDays
            : key === "family"
              ? PAID_PLAN_BILLING.family.durationDays
              : null,
        requiresPayment: key === "pro" || key === "family",
      })),
      disclaimer: razorpayConfigured
        ? "Paid plans are activated only after Razorpay payment verification."
        : "Payments are temporarily unavailable. Please contact support.",
    });
  } catch (err) {
    console.error("Billing plans error:", err);
    return serverError();
  }
}
