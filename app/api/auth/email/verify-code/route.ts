import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/family-auth";
import prisma from "@/lib/prisma";
import { ok, fail, serverError, rateLimited, validationError } from "@/lib/api-response";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
  shouldBypassAuthRateLimit,
} from "@/lib/rate-limit";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";
import { verifyEmailOtpCode } from "@/lib/auth/email-otp-service";
import { serializeUser } from "@/lib/user-serialize";

const verifySchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Enter a 6-digit code"),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const body = await req.json();
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0]?.message || "Invalid code");
    }

    if (!shouldBypassAuthRateLimit(auth.payload.email)) {
      const ip = getClientIp(req);
      const rl = checkRateLimit(
        "otp-verify",
        `${ip}:${auth.payload.userId}`,
        RATE_LIMITS.OTP_VERIFY
      );
      if (!rl.allowed) return rateLimited();
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.payload.userId },
    });
    if (!user) return fail("User not found", 404);
    if (user.emailVerified) {
      return ok({ success: true, message: "Email verified.", user: serializeUser(user) });
    }

    const result = await verifyEmailOtpCode({
      userId: user.id,
      type: "email_verification",
      code: parsed.data.code,
    });

    if (!result.ok) {
      const status = result.code === "OTP_ATTEMPTS_EXCEEDED" ? 429 : 400;
      return fail(result.message, status, result.code);
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, emailVerifiedAt: new Date() },
    });

    await auditUserAction(req, user.id, user.email, AUDIT_ACTIONS.EMAIL_VERIFIED, {
      metadata: { delivery: "otp" },
    });

    const { onEmailVerified } = await import("@/lib/email/automation-triggers");
    void onEmailVerified(user.id);

    return ok({
      success: true,
      message: "Email verified.",
      user: serializeUser(updated),
    });
  } catch (err) {
    console.error("Verify email code error:", err);
    return serverError();
  }
}
