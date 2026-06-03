export type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export interface EmailProvider {
  readonly name: string;
  send(payload: EmailPayload): Promise<void>;
}

export function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() && process.env.SMTP_FROM?.trim()
  );
}
