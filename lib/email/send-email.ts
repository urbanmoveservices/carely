import prisma from "@/lib/prisma";
import { isSmtpConfigured } from "./provider";
import { renderEmailTemplate, type EmailTemplateType } from "./templates";
import nodemailer from "nodemailer";
import { sendSmtpMessage } from "./smtp";

type MailAttachment = NonNullable<nodemailer.SendMailOptions["attachments"]>[number];

export async function sendEmail(params: {
  to: string;
  type: EmailTemplateType;
  data: Record<string, string>;
  userId?: string | null;
  subject?: string;
  html?: string;
  text?: string;
  attachments?: MailAttachment[];
}): Promise<{ ok: boolean; preview?: boolean; logId: string; error?: string }> {
  const rendered = renderEmailTemplate(params.type, params.data);
  const subject = params.subject ?? rendered.subject;
  const html = params.html ?? rendered.html;
  const text = params.text ?? rendered.text;

  const log = await prisma.emailLog.create({
    data: {
      userId: params.userId ?? null,
      to: params.to,
      subject,
      type: params.type,
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
    await sendSmtpMessage({
      to: params.to,
      subject,
      html,
      text,
      attachments: params.attachments,
    });
    await prisma.emailLog.update({
      where: { id: log.id },
      data: { status: "sent", sentAt: new Date() },
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
