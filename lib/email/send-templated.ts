import { getDefaultFromAddress } from "@/lib/email/config";
import { canSendEmail } from "@/lib/email/preferences";
import { sanitizeEmailSubject } from "@/lib/email/privacy";
import { sendEmail } from "@/lib/email/send-email";
import { renderBrandedTemplate } from "@/lib/email/templates-branded";
import { categoryForTemplate, type EmailTemplateKey } from "@/lib/email/template-keys";
import {
  buildListUnsubscribeHeaders,
  unsubscribeUrl,
  createUnsubscribeToken,
} from "@/lib/email/unsubscribe";
import { getOtpEmailAttachments } from "@/lib/email/templates-otp";
import { logoAttachmentForNodemailer, resolveEmailLogo } from "@/lib/email/logo-attachment";
import prisma from "@/lib/prisma";

export async function sendTemplatedEmail(params: {
  to: string;
  userId?: string | null;
  templateKey: EmailTemplateKey;
  data?: Record<string, string>;
  subject?: string;
  skipPreferenceCheck?: boolean;
  includeUnsubscribe?: boolean;
}): Promise<{ ok: boolean; skipped?: boolean; reason?: string; logId?: string; preview?: boolean }> {
  const category = categoryForTemplate(params.templateKey);
  const data = { ...(params.data ?? {}) };

  if (params.userId && !params.skipPreferenceCheck) {
    const check = await canSendEmail({
      userId: params.userId,
      category,
      templateKey: params.templateKey,
    });
    if (!check.allowed) {
      const log = await prisma.emailLog.create({
        data: {
          userId: params.userId,
          to: params.to,
          fromEmail: getDefaultFromAddress(),
          subject: params.subject || params.templateKey,
          type: params.templateKey,
          templateKey: params.templateKey,
          category,
          status: "skipped",
          metadata: { reason: check.reason },
        },
      });
      return { ok: true, skipped: true, reason: check.reason, logId: log.id };
    }
  }

  let headers: Record<string, string> | undefined;
  if (
    (params.includeUnsubscribe || category === "marketing" || category === "lifecycle") &&
    category !== "transactional"
  ) {
    const token = await createUnsubscribeToken({
      userId: params.userId,
      email: params.to,
      category,
    });
    data.unsubscribeLink = unsubscribeUrl(token);
    headers = await buildListUnsubscribeHeaders({
      userId: params.userId,
      email: params.to,
      category,
      token,
    });
  }

  const rendered = renderBrandedTemplate(params.templateKey, data);
  const subject = sanitizeEmailSubject(params.subject || rendered.subject);

  const logo = resolveEmailLogo();
  const attachments =
    params.templateKey === "email_verification_otp" ||
    params.templateKey === "password_reset_otp"
      ? getOtpEmailAttachments()
      : logo.path
        ? logoAttachmentForNodemailer(logo)
        : undefined;

  const result = await sendEmail({
    to: params.to,
    type: params.templateKey as Parameters<typeof sendEmail>[0]["type"],
    data,
    userId: params.userId,
    subject,
    html: rendered.html,
    text: rendered.text,
    attachments,
    category,
    templateKey: params.templateKey,
    headers,
  });

  return {
    ok: result.ok,
    logId: result.logId,
    preview: result.preview,
  };
}
