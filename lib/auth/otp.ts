import { createHash, randomInt, timingSafeEqual } from "crypto";

export type EmailOtpType = "email_verification" | "password_reset";

export function getOtpExpiresMinutes(): number {
  const raw = Number(process.env.OTP_EXPIRES_MINUTES || 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 10;
}

export function getOtpResendCooldownSeconds(): number {
  const raw = Number(process.env.OTP_RESEND_COOLDOWN_SECONDS || 60);
  return Number.isFinite(raw) && raw >= 0 ? raw : 60;
}

export function getOtpMaxAttempts(): number {
  const raw = Number(process.env.OTP_MAX_ATTEMPTS || 5);
  return Number.isFinite(raw) && raw > 0 ? raw : 5;
}

export function generateSixDigitOtp(): string {
  return String(randomInt(100000, 1000000));
}

function otpPepper(): string {
  return process.env.JWT_SECRET?.trim() || "dev-otp-pepper";
}

export function hashOtp(code: string): string {
  return createHash("sha256")
    .update(`${code.trim()}:${otpPepper()}`)
    .digest("hex");
}

export function verifyOtpHash(code: string, hash: string): boolean {
  const a = Buffer.from(hashOtp(code));
  const b = Buffer.from(hash);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function getOtpExpiry(): Date {
  return new Date(Date.now() + getOtpExpiresMinutes() * 60 * 1000);
}

export function canResendOtp(lastSentAt: Date): {
  allowed: boolean;
  retryAfterSeconds: number;
} {
  const cooldownMs = getOtpResendCooldownSeconds() * 1000;
  const elapsed = Date.now() - lastSentAt.getTime();
  if (elapsed >= cooldownMs) {
    return { allowed: true, retryAfterSeconds: 0 };
  }
  return {
    allowed: false,
    retryAfterSeconds: Math.ceil((cooldownMs - elapsed) / 1000),
  };
}

export function isValidSixDigitCode(code: string): boolean {
  return /^\d{6}$/.test(code.trim());
}

export function shouldDevPrintOtp(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.DEV_PRINT_OTP === "true"
  );
}

export function isE2eTestEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith("@vaidya.test");
}

export function canUseTestOtpHelper(email: string): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.E2E_ALLOW_TEST_HELPERS === "true" &&
    isE2eTestEmail(email)
  );
}
