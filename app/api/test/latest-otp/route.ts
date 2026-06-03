import { NextRequest } from "next/server";
import { ok, fail, forbidden } from "@/lib/api-response";
import { getLatestTestOtp } from "@/lib/auth/email-otp-service";
import { isE2eTestEmail, type EmailOtpType } from "@/lib/auth/otp";

const ALLOWED_TYPES: EmailOtpType[] = ["email_verification", "password_reset"];

export async function GET(req: NextRequest) {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.E2E_ALLOW_TEST_HELPERS !== "true"
  ) {
    return forbidden("Not available");
  }

  const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase();
  const type = req.nextUrl.searchParams.get("type") as EmailOtpType | null;

  if (!email || !type || !ALLOWED_TYPES.includes(type)) {
    return fail("email and type query params required", 400);
  }

  if (!isE2eTestEmail(email)) {
    return fail("Only @vaidya.test emails supported", 403);
  }

  const code = getLatestTestOtp(email, type);
  if (!code) {
    return fail("No active OTP found", 404, "OTP_NOT_FOUND");
  }

  return ok({ email, type, code });
}
