import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { ok, fail, serverError, rateLimited, validationError } from "@/lib/api-response";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
  shouldBypassAuthRateLimit,
} from "@/lib/rate-limit";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";
import { verifyEmailOtpCode } from "@/lib/auth/email-otp-service";
import { invalidateAuthTokens } from "@/lib/auth-tokens";

const schema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/, "Enter a 6-digit code"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0]?.message || "Invalid input");
    }

    const email = parsed.data.email.trim().toLowerCase();

    if (!shouldBypassAuthRateLimit(email)) {
      const ip = getClientIp(req);
      const rl = checkRateLimit("otp-reset", `${ip}:${email}`, RATE_LIMITS.OTP_RESET);
      if (!rl.allowed) return rateLimited();
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return fail("Invalid or expired code. Please request a new one.", 400, "INVALID_OTP");
    }

    const result = await verifyEmailOtpCode({
      email,
      userId: user.id,
      type: "password_reset",
      code: parsed.data.code,
    });

    if (!result.ok) {
      const status = result.code === "OTP_ATTEMPTS_EXCEEDED" ? 429 : 400;
      return fail(result.message, status, result.code);
    }

    const passwordHash = await hashPassword(parsed.data.newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    await invalidateAuthTokens(user.id, "password_reset");
    await invalidateAuthTokens(user.id, "email_verification");

    await auditUserAction(req, user.id, user.email, AUDIT_ACTIONS.PASSWORD_RESET_COMPLETED, {
      metadata: { delivery: "otp" },
    });

    return ok({
      success: true,
      message: "Password reset successfully.",
    });
  } catch (err) {
    console.error("Reset password with code error:", err);
    return serverError();
  }
}
