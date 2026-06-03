import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { fail, ok, validationError } from "@/lib/api-response";
import { activatePaidPlan } from "@/lib/billing/razorpay";
import { isPaidPlanKey } from "@/lib/billing/plan-billing";
import { normalizePlanKey, type PlanKey } from "@/lib/plans";

const bodySchema = z.object({
  email: z.string().email(),
  plan: z.enum(["free", "pro", "family"]),
});

function testHelpersEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.E2E_ALLOW_TEST_HELPERS === "true"
  );
}

export async function POST(req: NextRequest) {
  if (!testHelpersEnabled()) {
    return fail("Not found", 404, "NOT_FOUND");
  }

  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0]?.message || "Invalid body");
    }

    const email = parsed.data.email.trim().toLowerCase();
    if (!email.endsWith("@vaidya.test")) {
      return fail("Only @vaidya.test emails allowed", 403, "FORBIDDEN");
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return fail("User not found", 404, "NOT_FOUND");
    }

    const plan = parsed.data.plan as PlanKey;

    if (plan === "free") {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          currentPlan: "free",
          subscriptionStatus: "active",
          subscriptionStartedAt: null,
          subscriptionEndsAt: null,
          billingProvider: null,
          billingCustomerId: null,
        },
      });
      return ok({ success: true, plan: "free", email });
    }

    if (!isPaidPlanKey(plan)) {
      return validationError("Invalid paid plan");
    }

    const activated = await activatePaidPlan({
      userId: user.id,
      plan,
      provider: "test_helper",
    });

    return ok({
      success: true,
      email,
      plan: activated.plan,
      expiresAt: activated.expiresAt?.toISOString() ?? null,
    });
  } catch (err) {
    console.error("[test_force_plan]", err);
    return fail("Force plan failed", 500, "FORCE_PLAN_FAILED");
  }
}
