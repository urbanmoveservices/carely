import prisma from "@/lib/prisma";
import { isSmtpConfigured } from "./provider";
import { renderEmailTemplate, type EmailTemplateType } from "./templates";
import { getDefaultFromAddress } from "./config";

export async function sendEmail(params: {
  to: string;
  type: EmailTemplateType;
  data: Record<string, string>;
  userId?: string | null;
  subject?: string;
  html?: string;
  text?: string;
}): Promise<{ ok: boolean; preview?: boolean; logId: string }> {
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
    console.info(`[email:dev] To: ${params.to} | ${subject}`);
    await prisma.emailLog.update({
      where: { id: log.id },
      data: { status: "sent", sentAt: new Date() },
    });
    return { ok: true, preview: true, logId: log.id };
  }

  try {
    await sendViaSmtp({ to: params.to, subject, html, text });
    await prisma.emailLog.update({
      where: { id: log.id },
      data: { status: "sent", sentAt: new Date() },
    });
    return { ok: true, logId: log.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Send failed";
    await prisma.emailLog.update({
      where: { id: log.id },
      data: { status: "failed", error: message.slice(0, 500) },
    });
    return { ok: false, logId: log.id };
  }
}

async function sendViaSmtp(payload: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  const host = process.env.SMTP_HOST!;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = getDefaultFromAddress();
  const body = [
    `From: ${from}`,
    `To: ${payload.to}`,
    `Subject: ${payload.subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=utf-8",
    "",
    payload.html,
  ].join("\r\n");

  const net = await import("net");
  const tls = port === 465 ? await import("tls") : null;

  await new Promise<void>((resolve, reject) => {
    const onConnect = () => {
      socket.write(`EHLO carely\r\n`);
      socket.write(`MAIL FROM:<${from}>\r\n`);
      socket.write(`RCPT TO:<${payload.to}>\r\n`);
      socket.write(`DATA\r\n`);
      socket.write(`${body}\r\n.\r\n`);
      socket.write(`QUIT\r\n`);
      socket.end();
      resolve();
    };
    const socket = tls
      ? tls.connect({ port, host, servername: host }, onConnect)
      : net.createConnection(port, host, onConnect);
    socket.on("error", reject);
  });
}
