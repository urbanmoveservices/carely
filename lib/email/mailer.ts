import { sendEmail } from "@/lib/email/send-email";
import { renderOtpEmail, getOtpEmailAttachments } from "@/lib/email/templates-otp";
import { getOtpExpiresMinutes } from "@/lib/auth/otp";

export async function sendEmailVerificationOtp(params: {
  to: string;
  name: string;
  code: string;
  userId?: string | null;
}): Promise<{ ok: boolean; preview?: boolean; error?: string }> {
  const { subject, html, text } = renderOtpEmail({
    kind: "email_verification",
    name: params.name,
    code: params.code,
    expiryMinutes: getOtpExpiresMinutes(),
  });

  const result = await sendEmail({
    to: params.to,
    type: "email_verification",
    templateKey: "email_verification_otp",
    category: "transactional",
    data: { code: params.code, name: params.name },
    userId: params.userId,
    subject,
    html,
    text,
    attachments: getOtpEmailAttachments(),
  });

  return { ok: result.ok, preview: result.preview, error: result.error };
}

export async function sendPasswordResetOtp(params: {
  to: string;
  name: string;
  code: string;
  userId?: string | null;
}): Promise<{ ok: boolean; preview?: boolean; error?: string }> {
  const { subject, html, text } = renderOtpEmail({
    kind: "password_reset",
    name: params.name,
    code: params.code,
    expiryMinutes: getOtpExpiresMinutes(),
  });

  const result = await sendEmail({
    to: params.to,
    type: "password_reset",
    templateKey: "password_reset_otp",
    category: "transactional",
    data: { code: params.code, name: params.name },
    userId: params.userId,
    subject,
    html,
    text,
    attachments: getOtpEmailAttachments(),
  });

  return { ok: result.ok, preview: result.preview, error: result.error };
}
