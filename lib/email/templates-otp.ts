import { PRODUCT_NAME, getSupportEmail } from "@/lib/company";
import { otpCodeBlock, wrapBrandedEmailHtml } from "@/lib/email/email-layout";
import {
  logoAttachmentForNodemailer,
  resolveEmailLogo,
} from "@/lib/email/logo-attachment";

export type OtpEmailKind = "email_verification" | "password_reset";

export function renderOtpEmail(params: {
  kind: OtpEmailKind;
  name: string;
  code: string;
  expiryMinutes: number;
}): { subject: string; html: string; text: string } {
  const support = getSupportEmail();
  const logo = resolveEmailLogo();
  const greeting = params.name && params.name !== "there" ? params.name : "there";

  const subject =
    params.kind === "email_verification"
      ? `Your ${PRODUCT_NAME} verification code`
      : `Your ${PRODUCT_NAME} password reset code`;

  const headline =
    params.kind === "email_verification"
      ? "Verify your email"
      : "Reset your password";

  const intro =
    params.kind === "email_verification"
      ? `Hi ${greeting}, enter this code on ${PRODUCT_NAME} to verify your email address.`
      : `Hi ${greeting}, enter this code on ${PRODUCT_NAME} to reset your password.`;

  const preheader = `${params.code} is your ${PRODUCT_NAME} code (expires in ${params.expiryMinutes} minutes)`;

  const bodyHtml = `
    <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#0f172a;">${headline}</h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;">${intro}</p>
    ${otpCodeBlock(params.code, params.expiryMinutes)}`;

  const html = wrapBrandedEmailHtml({
    logo,
    preheader,
    title: subject,
    bodyHtml,
  });

  const text = `${headline}

${intro}

Your code: ${params.code}

This code expires in ${params.expiryMinutes} minutes.

If you did not request this, you can safely ignore this email.

${PRODUCT_NAME}
Support: ${support}`;

  return { subject, html, text };
}

export function getOtpEmailAttachments() {
  return logoAttachmentForNodemailer(resolveEmailLogo());
}
