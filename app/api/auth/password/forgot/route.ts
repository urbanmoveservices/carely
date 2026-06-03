import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { ok, validationError, serverError, rateLimited } from "@/lib/api-response";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
  shouldBypassAuthRateLimit,
} from "@/lib/rate-limit";
import { createAndSendEmailOtp } from "@/lib/auth/email-otp-service";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";
import { createAccessLog, accessFromRequest, ACCESS_ACTIONS } from "@/lib/access-log";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0]?.message || "Invalid email");
    }

    const email = parsed.data.email.trim().toLowerCase();
    const generic = {
      success: true,
      message: "If an account exists, a reset code has been sent.",
    };

    if (!shouldBypassAuthRateLimit(email)) {
      const ip = getClientIp(req);
      const rl = checkRateLimit("otp-forgot", `${ip}:${email}`, RATE_LIMITS.OTP_FORGOT);
      if (!rl.allowed) return rateLimited();
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      await createAndSendEmailOtp({
        email: user.email,
        type: "password_reset",
        userId: user.id,
        name: user.name,
      });
      await auditUserAction(
        req,
        user.id,
        user.email,
        AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED,
        { metadata: { delivery: "otp" } }
      );
      await createAccessLog({
        ...accessFromRequest(req, user.id),
        action: ACCESS_ACTIONS.PASSWORD_RESET,
      });
    }

    return ok(generic);
  } catch (err) {
    console.error("Password forgot OTP error:", err);
    return serverError();
  }
}
