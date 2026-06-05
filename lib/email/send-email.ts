import prisma from "@/lib/prisma";
import { isSmtpConfigured } from "./provider";
import { renderEmailTemplate, type EmailTemplateType } from "./templates";
import nodemailer from "nodemailer";
import { sendSmtpMessage } from "./smtp";
import { getDefaultFromAddress } from "./config";
import type { EmailCategory } from "./preferences";

type MailAttachment = NonNullable<nodemailer.SendMailOptions["attachments"]>[number];

export async function sendEmail(params: {
  to: string;
  type: EmailTemplateType | string;
  data: Record<string, string>;
  userId?: string | null;
  subject?: string;
  html?: string;
  text?: string;
  attachments?: MailAttachment[];
  category?: EmailCategory | string | null;
  templateKey?: string | null;
  headers?: Record<string, string>;
}): Promise<{ ok: boolean; preview?: boolean; logId: string; error?: string }> {
  const rendered = renderEmailTemplate(params.type as EmailTemplateType, params.data);
  const subject = params.subject ?? rendered.subject;
  const html = params.html ?? rendered.html;
  const text = params.text ?? rendered.text;
  const fromEmail = getDefaultFromAddress();

  const log = await prisma.emailLog.create({
    data: {
      userId: params.userId ?? null,
      to: params.to,
      fromEmail,
      subject,
      type: params.type,
      templateKey: params.templateKey ?? params.type,
      category: params.category ?? null,
      status: "queued",
    },
  });

  if (!isSmtpConfigured()) {
    console.info(`[email:dev] Email not sent: SMTP not configured → ${params.to} | ${subject}`);
    await prisma.emailLog.update({
      where: { id: log.id },
      data: { status: "sent", sentAt: new Date() },
    });
    return { ok: true, preview: true, logId: log.id };
  }

  try {
    const info = await sendSmtpMessage({
      to: params.to,
      subject,
      html,
      text,
      attachments: params.attachments,
      headers: params.headers,
    });
    await prisma.emailLog.update({
      where: { id: log.id },
      data: {
        status: "sent",
        sentAt: new Date(),
        providerMessageId: info?.messageId ?? null,
      },
    });
    return { ok: true, logId: log.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Send failed";
    console.error(`[email] SMTP send failed to ${params.to}:`, message);
    await prisma.emailLog.update({
      where: { id: log.id },
      data: { status: "failed", error: message.slice(0, 500) },
    });
    return { ok: false, logId: log.id, error: message };
  }
}
