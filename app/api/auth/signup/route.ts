import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { signToken } from "@/lib/jwt";
import { ok, validationError, fail, serverError, rateLimited } from "@/lib/api-response";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
  shouldBypassAuthRateLimit,
} from "@/lib/rate-limit";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";
import { createAndSendEmailOtp } from "@/lib/auth/email-otp-service";
import { serializeUser } from "@/lib/user-serialize";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  legalConsentAccepted: z
    .boolean()
    .refine((v) => v === true, {
      message:
        "You must accept the Terms, Privacy Policy, and medical consent to create an account.",
    }),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(parsed.error.issues[0].message);
    }

    const { name, email: rawEmail, password } = parsed.data;
    const email = rawEmail.trim().toLowerCase();

    if (!shouldBypassAuthRateLimit(email)) {
      const ip = getClientIp(req);
      const rl = checkRateLimit("signup", ip, RATE_LIMITS.SIGNUP);
      if (!rl.allowed) return rateLimited();
    }
    const consentAt = new Date();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return fail("Email already registered", 400);
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        onboardingCompleted: false,
        termsAcceptedAt: consentAt,
        privacyAcceptedAt: consentAt,
        medicalConsentAcceptedAt: consentAt,
        emailVerified: false,
        currentPlan: "free",
      },
    });

    await createAndSendEmailOtp({
      email: user.email,
      type: "email_verification",
      userId: user.id,
      name: user.name,
      skipCooldown: true,
    });

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    await auditUserAction(req, user.id, user.email, AUDIT_ACTIONS.USER_SIGNUP);
    await auditUserAction(
      req,
      user.id,
      user.email,
      AUDIT_ACTIONS.USER_LEGAL_CONSENT_ACCEPTED,
      { metadata: { source: "signup" } }
    );
    await auditUserAction(
      req,
      user.id,
      user.email,
      AUDIT_ACTIONS.EMAIL_VERIFICATION_SENT,
      { metadata: { delivery: "otp", source: "signup" } }
    );

    return ok({
      access_token: token,
      token_type: "bearer",
      user: serializeUser(user),
    });
  } catch (err) {
    console.error("Signup error:", err);
    return serverError();
  }
}
