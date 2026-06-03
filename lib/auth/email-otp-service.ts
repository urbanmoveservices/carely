import prisma from "@/lib/prisma";
import {
  canResendOtp,
  canUseTestOtpHelper,
  generateSixDigitOtp,
  getOtpExpiry,
  getOtpMaxAttempts,
  hashOtp,
  isE2eTestEmail,
  isValidSixDigitCode,
  shouldDevPrintOtp,
  verifyOtpHash,
  type EmailOtpType,
} from "@/lib/auth/otp";
import { maskEmail } from "@/lib/auth/mask-email";
import {
  sendEmailVerificationOtp,
  sendPasswordResetOtp,
} from "@/lib/email/mailer";
import { isSmtpConfigured } from "@/lib/email/provider";

const testOtpStore = new Map<
  string,
  { code: string; expiresAt: number; type: EmailOtpType }
>();

function testStoreKey(email: string, type: EmailOtpType): string {
  return `${type}:${email.trim().toLowerCase()}`;
}

function rememberTestOtp(email: string, type: EmailOtpType, code: string) {
  if (process.env.NODE_ENV === "production") return;
  if (!isE2eTestEmail(email)) return;
  testOtpStore.set(testStoreKey(email, type), {
    code,
    expiresAt: Date.now() + 15 * 60 * 1000,
    type,
  });
}

export function getLatestTestOtp(
  email: string,
  type: EmailOtpType
): string | null {
  if (!canUseTestOtpHelper(email)) return null;
  const entry = testOtpStore.get(testStoreKey(email, type));
  if (!entry || entry.expiresAt < Date.now()) return null;
  return entry.code;
}

async function invalidateUnusedOtps(params: {
  email: string;
  type: EmailOtpType;
  userId?: string | null;
}) {
  await prisma.emailOtp.updateMany({
    where: {
      email: params.email.trim().toLowerCase(),
      type: params.type,
      usedAt: null,
      ...(params.userId ? { userId: params.userId } : {}),
    },
    data: { usedAt: new Date() },
  });
}

export async function createAndSendEmailOtp(params: {
  email: string;
  type: EmailOtpType;
  userId?: string | null;
  name?: string | null;
  skipCooldown?: boolean;
}): Promise<
  | {
      ok: true;
      emailMasked: string;
      message: string;
      code?: string;
      retryAfterSeconds?: number;
    }
  | { ok: false; code: string; message: string; retryAfterSeconds?: number }
> {
  const email = params.email.trim().toLowerCase();
  const emailMasked = maskEmail(email);

  if (!params.skipCooldown) {
    const latest = await prisma.emailOtp.findFirst({
      where: { email, type: params.type, usedAt: null },
      orderBy: { createdAt: "desc" },
    });
    if (latest) {
      const resend = canResendOtp(latest.lastSentAt);
      if (!resend.allowed) {
        return {
          ok: false,
          code: "OTP_RESEND_COOLDOWN",
          message: `Please wait ${resend.retryAfterSeconds} seconds before requesting a new code.`,
          retryAfterSeconds: resend.retryAfterSeconds,
        };
      }
    }
  }

  const code = generateSixDigitOtp();
  const codeHash = hashOtp(code);
  const expiresAt = getOtpExpiry();
  const maxAttempts = getOtpMaxAttempts();

  await invalidateUnusedOtps({
    email,
    type: params.type,
    userId: params.userId,
  });

  await prisma.emailOtp.create({
    data: {
      userId: params.userId ?? null,
      email,
      type: params.type,
      codeHash,
      expiresAt,
      maxAttempts,
      lastSentAt: new Date(),
    },
  });

  rememberTestOtp(email, params.type, code);

  const displayName = params.name?.trim() || "there";
  const sendResult =
    params.type === "email_verification"
      ? await sendEmailVerificationOtp({
          to: email,
          name: displayName,
          code,
          userId: params.userId ?? null,
        })
      : await sendPasswordResetOtp({
          to: email,
          name: displayName,
          code,
          userId: params.userId ?? null,
        });

  if (!sendResult.ok && isSmtpConfigured()) {
    return {
      ok: false,
      code: "EMAIL_SEND_FAILED",
      message: "Could not send email. Check SMTP settings or try again shortly.",
    };
  }

  if (shouldDevPrintOtp()) {
    console.info(
      `[otp:dev] ${params.type} for ${emailMasked}: ${code} (expires ${getOtpExpiry().toISOString()})`
    );
  } else if (!isSmtpConfigured()) {
    console.info(`Email not sent: SMTP not configured (${params.type} → ${emailMasked})`);
  }

  return {
    ok: true,
    emailMasked,
    message:
      params.type === "email_verification"
        ? "Verification code sent."
        : "If an account exists, a reset code has been sent.",
    ...(canUseTestOtpHelper(email) ? { code } : {}),
  };
}

export async function verifyEmailOtpCode(params: {
  email?: string;
  userId?: string;
  type: EmailOtpType;
  code: string;
}): Promise<
  | { ok: true; userId: string | null; email: string }
  | { ok: false; code: string; message: string }
> {
  if (!isValidSixDigitCode(params.code)) {
    return { ok: false, code: "INVALID_OTP", message: "Enter a valid 6-digit code." };
  }

  const email = params.email?.trim().toLowerCase();
  const record = await prisma.emailOtp.findFirst({
    where: {
      type: params.type,
      usedAt: null,
      ...(params.userId ? { userId: params.userId } : {}),
      ...(email ? { email } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    return {
      ok: false,
      code: "INVALID_OTP",
      message: "Invalid or expired code. Please request a new one.",
    };
  }

  if (record.expiresAt < new Date()) {
    return {
      ok: false,
      code: "OTP_EXPIRED",
      message: "This code has expired. Please request a new one.",
    };
  }

  if (record.attempts >= record.maxAttempts) {
    return {
      ok: false,
      code: "OTP_ATTEMPTS_EXCEEDED",
      message: "Too many attempts. Please request a new code.",
    };
  }

  if (!verifyOtpHash(params.code, record.codeHash)) {
    const attempts = record.attempts + 1;
    await prisma.emailOtp.update({
      where: { id: record.id },
      data: { attempts },
    });
    if (attempts >= record.maxAttempts) {
      return {
        ok: false,
        code: "OTP_ATTEMPTS_EXCEEDED",
        message: "Too many attempts. Please request a new code.",
      };
    }
    return { ok: false, code: "INVALID_OTP", message: "Invalid code. Please try again." };
  }

  await prisma.emailOtp.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return {
    ok: true,
    userId: record.userId,
    email: record.email,
  };
}
