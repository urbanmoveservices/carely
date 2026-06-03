/**
 * Send a test OTP-style email to verify SMTP settings.
 * Run: tsx scripts/test-smtp.ts you@example.com
 */
import { sendEmailVerificationOtp } from "../lib/email/mailer";
import { isSmtpConfigured } from "../lib/email/provider";

async function main() {
  const to = process.argv[2]?.trim();
  if (!to) {
    console.error("Usage: tsx scripts/test-smtp.ts recipient@example.com");
    process.exit(1);
  }

  console.log("SMTP configured:", isSmtpConfigured());
  console.log("SMTP_HOST:", process.env.SMTP_HOST ? "set" : "missing");
  console.log("SMTP_USER:", process.env.SMTP_USER ? "set" : "missing");
  console.log("SMTP_FROM:", process.env.SMTP_FROM || "(missing)");

  const result = await sendEmailVerificationOtp({
    to,
    name: "Test User",
    code: "123456",
  });

  if (result.ok) {
    console.log(result.preview ? "Preview mode (SMTP not configured)" : "Test email sent.");
    process.exit(0);
  }

  console.error("Send failed:", result.error || "unknown error");
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
