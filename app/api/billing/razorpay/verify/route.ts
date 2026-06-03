import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/family-auth";
import { isRazorpayConfigured, verifyAndActivatePayment } from "@/lib/billing/razorpay";
import { fail, ok, serverError, validationError } from "@/lib/api-response";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";
import { PLAN_LIMITS } from "@/lib/plans";

const bodySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    if (!isRazorpayConfigured()) {
      return fail(
        "Payments are temporarily unavailable. Please contact support.",
        503,
        "RAZORPAY_NOT_CONFIGURED"
      );
    }

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0]?.message || "Invalid payment data");
    }

    try {
      const result = await verifyAndActivatePayment({
        userId: auth.payload.userId,
        razorpayOrderId: parsed.data.razorpay_order_id,
        razorpayPaymentId: parsed.data.razorpay_payment_id,
        razorpaySignature: parsed.data.razorpay_signature,
        email: auth.payload.email,
      });

      await auditUserAction(
        req,
        auth.payload.userId,
        auth.payload.email,
        AUDIT_ACTIONS.RAZORPAY_PAYMENT_VERIFIED,
        {
          entityType: "payment_transaction",
          metadata: {
            orderId: parsed.data.razorpay_order_id,
            paymentId: parsed.data.razorpay_payment_id,
            plan: result.plan,
          },
        }
      );

      const limits = PLAN_LIMITS[result.plan];
      return ok({
        success: true,
        verified: true,
        alreadyVerified: result.alreadyVerified,
        plan: result.plan,
        planName: limits.name,
        expiresAt: result.expiresAt,
        message: result.alreadyVerified
          ? `Your ${limits.name} plan is already active.`
          : `Payment verified. Your ${limits.name} plan is active.`,
      });
    } catch (e) {
      const code = e instanceof Error ? e.message : "PAYMENT_VERIFY_FAILED";
      if (code === "PAYMENT_SIGNATURE_INVALID") {
        return fail(
          "Payment could not be verified. Please try again.",
          400,
          "PAYMENT_SIGNATURE_INVALID"
        );
      }
      if (code === "PAYMENT_ORDER_NOT_FOUND") {
        return fail("Payment order not found.", 404, "PAYMENT_ORDER_NOT_FOUND");
      }
      if (code === "PAYMENT_AMOUNT_MISMATCH") {
        return fail("Payment amount mismatch.", 400, "PAYMENT_AMOUNT_MISMATCH");
      }
      throw e;
    }
  } catch (err) {
    console.error("[razorpay_verify]", err);
    return serverError("Could not verify payment.");
  }
}
