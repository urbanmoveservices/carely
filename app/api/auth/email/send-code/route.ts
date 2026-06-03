import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/family-auth";
import prisma from "@/lib/prisma";
import { ok, fail, failWithMeta, serverError, rateLimited } from "@/lib/api-response";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
  shouldBypassAuthRateLimit,
} from "@/lib/rate-limit";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";
import { createAndSendEmailOtp } from "@/lib/auth/email-otp-service";
import { maskEmail } from "@/lib/auth/mask-email";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const user = await prisma.user.findUnique({
      where: { id: auth.payload.userId },
    });
    if (!user) return fail("User not found", 404);

    if (user.emailVerified) {
      return ok({
        success: true,
        message: "Email already verified.",
        code: "EMAIL_ALREADY_VERIFIED",
        emailMasked: maskEmail(user.email),
      });
    }

    if (!shouldBypassAuthRateLimit(user.email)) {
      const ip = getClientIp(req);
      const rl = checkRateLimit("otp-send", `${ip}:${user.id}`, RATE_LIMITS.OTP_SEND);
      if (!rl.allowed) return rateLimited();
    }

    const sent = await createAndSendEmailOtp({
      email: user.email,
      type: "email_verification",
      userId: user.id,
      name: user.name,
    });

    if (!sent.ok) {
      return failWithMeta(sent.message, 429, {
        code: sent.code,
        retryAfterSeconds: sent.retryAfterSeconds,
      });
    }

    await auditUserAction(
      req,
      user.id,
      user.email,
      AUDIT_ACTIONS.EMAIL_VERIFICATION_SENT,
      { metadata: { delivery: "otp" } }
    );

    return ok({
      success: true,
      message: "Verification code sent.",
      emailMasked: sent.emailMasked,
    });
  } catch (err) {
    console.error("Send verification code error:", err);
    return serverError();
  }
}
