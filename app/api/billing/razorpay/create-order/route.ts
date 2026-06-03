import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/family-auth";
import { isPaidPlanKey } from "@/lib/billing/plan-billing";
import {
  createRazorpayOrder,
  isRazorpayConfigured,
} from "@/lib/billing/razorpay";
import {
  evaluateProfileCompletion,
  getRazorpayPrefill,
} from "@/lib/profile";
import { fail, ok, serverError, validationError } from "@/lib/api-response";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";

const bodySchema = z.object({
  plan: z.enum(["pro", "family"]),
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
      return validationError(parsed.error.issues[0]?.message || "Invalid plan");
    }

    const plan = parsed.data.plan;
    if (!isPaidPlanKey(plan)) {
      return validationError("Only Pro and Family plans require payment");
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.payload.userId },
    });
    if (!user) {
      return fail("User not found", 404, "NOT_FOUND");
    }

    const { billingProfileCompleted } = evaluateProfileCompletion(user);
    if (!billingProfileCompleted) {
      return fail(
        "Please add your full name and phone number before payment. Razorpay requires a valid contact number.",
        400,
        "BILLING_PROFILE_INCOMPLETE"
      );
    }

    const order = await createRazorpayOrder({
      userId: auth.payload.userId,
      plan,
      email: user.email,
    });

    const prefill = getRazorpayPrefill(user);

    await auditUserAction(
      req,
      auth.payload.userId,
      auth.payload.email,
      AUDIT_ACTIONS.RAZORPAY_ORDER_CREATED,
      {
        entityType: "payment_order",
        entityId: order.paymentOrderId,
        metadata: { plan, providerOrderId: order.providerOrderId },
      }
    );

    return ok({
      keyId: order.keyId,
      orderId: order.providerOrderId,
      amount: order.amountPaise,
      currency: order.currency,
      plan: order.plan,
      receipt: order.receipt,
      prefill,
    });
  } catch (err) {
    console.error("[razorpay_create_order]", err);
    return serverError("Could not create payment order.");
  }
}
