import { PRODUCT_NAME, COMPANY_NAME, getSupportEmail } from "@/lib/company";

export type OtpEmailKind = "email_verification" | "password_reset";

export function renderOtpEmail(params: {
  kind: OtpEmailKind;
  name: string;
  code: string;
  expiryMinutes: number;
}): { subject: string; html: string; text: string } {
  const support = getSupportEmail();
  const subject =
    params.kind === "email_verification"
      ? `Your ${PRODUCT_NAME} verification code`
      : `Your ${PRODUCT_NAME} password reset code`;

  const intro =
    params.kind === "email_verification"
      ? `Hi ${params.name}, use this code to verify your email for ${PRODUCT_NAME}:`
      : `Hi ${params.name}, use this code to reset your ${PRODUCT_NAME} password:`;

  const footer = `${PRODUCT_NAME}
Operated by ${COMPANY_NAME}
Support: ${support}`;

  const html = `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; color: #111; line-height: 1.5;">
  <p>${intro}</p>
  <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 24px 0;">${params.code}</p>
  <p>This code expires in <strong>${params.expiryMinutes} minutes</strong>.</p>
  <p>If you did not request this, you can safely ignore this email.</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
  <p style="font-size: 12px; color: #666; white-space: pre-line;">${footer}</p>
</body>
</html>`;

  const text = `${intro}

${params.code}

This code expires in ${params.expiryMinutes} minutes.

If you did not request this, you can safely ignore this email.

${footer}`;

  return { subject, html, text };
}
