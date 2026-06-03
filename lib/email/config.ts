import { getSupportEmail } from "@/lib/company";

export function getDefaultFromAddress(): string {
  const from = process.env.SMTP_FROM?.trim();
  if (from) return from;
  return `Vaidya GPT <${getSupportEmail()}>`;
}

export function getSmtpFromDomain(): string | null {
  const from = process.env.SMTP_FROM?.trim() || getSupportEmail();
  const match = from.match(/@([a-zA-Z0-9.-]+)/);
  return match?.[1] ?? null;
}
