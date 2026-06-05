import nodemailer from "nodemailer";

import { getDefaultFromAddress } from "./config";



type MailAttachment = NonNullable<nodemailer.SendMailOptions["attachments"]>[number];



export function createSmtpTransport() {

  const port = Number(process.env.SMTP_PORT || 587);

  const secure =

    process.env.SMTP_SECURE === "true" || process.env.SMTP_SECURE === "1" || port === 465;



  return nodemailer.createTransport({

    host: process.env.SMTP_HOST?.trim(),

    port,

    secure,

    requireTLS: !secure && port === 587,

    auth: {

      user: process.env.SMTP_USER?.trim() || "",

      pass: process.env.SMTP_PASS?.trim() || "",

    },

  });

}



export async function sendSmtpMessage(payload: {

  to: string;

  subject: string;

  html: string;

  text?: string;

  attachments?: MailAttachment[];

  headers?: Record<string, string>;

}): Promise<{ messageId?: string }> {

  const transporter = createSmtpTransport();

  const info = await transporter.sendMail({

    from: getDefaultFromAddress(),

    to: payload.to,

    subject: payload.subject,

    html: payload.html,

    text: payload.text,

    attachments: payload.attachments,

    headers: payload.headers,

  });

  return { messageId: info.messageId };

}


