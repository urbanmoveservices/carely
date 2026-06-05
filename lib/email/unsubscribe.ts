import { createHash, randomBytes } from "crypto";
import prisma from "@/lib/prisma";
import { absoluteUrl } from "@/lib/app-url";

export function hashUnsubscribeToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createUnsubscribeToken(params: {
  userId?: string | null;
  email: string;
  category?: string | null;
  ttlDays?: number;
}): Promise<string> {
  const raw = randomBytes(32).toString("hex");
  const tokenHash = hashUnsubscribeToken(raw);
  const expiresAt = new Date(Date.now() + (params.ttlDays ?? 90) * 24 * 3600 * 1000);
  await prisma.emailUnsubscribeToken.create({
    data: {
      userId: params.userId ?? null,
      email: params.email.toLowerCase(),
      tokenHash,
      category: params.category ?? null,
      expiresAt,
    },
  });
  return raw;
}

export function unsubscribeUrl(token: string): string {
  return absoluteUrl(`/unsubscribe?token=${encodeURIComponent(token)}`);
}

export function oneClickUnsubscribeUrl(token: string): string {
  return absoluteUrl(`/api/email/unsubscribe/one-click?token=${encodeURIComponent(token)}`);
}

export async function verifyUnsubscribeToken(rawToken: string) {
  const tokenHash = hashUnsubscribeToken(rawToken);
  const row = await prisma.emailUnsubscribeToken.findUnique({ where: { tokenHash } });
  if (!row || row.usedAt) return null;
  if (row.expiresAt && row.expiresAt < new Date()) return null;
  return row;
}

export async function applyUnsubscribe(params: {
  token: string;
  scope: "marketing" | "lifecycle" | "all_optional";
  reason?: string;
}): Promise<{ ok: boolean; email?: string }> {
  const row = await verifyUnsubscribeToken(params.token);
  if (!row) return { ok: false };

  const user = row.userId
    ? await prisma.user.findUnique({ where: { id: row.userId } })
    : await prisma.user.findFirst({ where: { email: row.email } });

  if (user) {
    await prisma.emailPreference.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        marketingEnabled: false,
        newsletterEnabled: false,
        productUpdatesEnabled: false,
        lifecycleEnabled: params.scope === "marketing",
        unsubscribedAt: new Date(),
        unsubscribeReason: params.reason ?? params.scope,
      },
      update: {
        marketingEnabled: false,
        newsletterEnabled: false,
        productUpdatesEnabled: false,
        lifecycleEnabled:
          params.scope === "marketing"
            ? undefined
            : params.scope === "lifecycle" || params.scope === "all_optional"
              ? false
              : undefined,
        reminderEmailsEnabled:
          params.scope === "all_optional" ? false : undefined,
        reportEmailsEnabled:
          params.scope === "all_optional" ? false : undefined,
        unsubscribedAt: new Date(),
        unsubscribeReason: params.reason ?? params.scope,
      },
    });
  }

  await prisma.emailUnsubscribeToken.update({
    where: { tokenHash: row.tokenHash },
    data: { usedAt: new Date() },
  });

  await prisma.emailLog.create({
    data: {
      userId: user?.id ?? null,
      to: row.email,
      subject: "Unsubscribed",
      type: "unsubscribe",
      templateKey: "unsubscribe",
      category: "transactional",
      status: "unsubscribed",
      metadata: { scope: params.scope },
    },
  });

  return { ok: true, email: row.email };
}

export async function buildListUnsubscribeHeaders(params: {
  userId?: string | null;
  email: string;
  category?: string;
  token?: string;
}): Promise<Record<string, string>> {
  const token =
    params.token ??
    (await createUnsubscribeToken({
      userId: params.userId,
      email: params.email,
      category: params.category,
    }));
  const url = oneClickUnsubscribeUrl(token);
  return {
    "List-Unsubscribe": `<${url}>, <mailto:${process.env.SUPPORT_EMAIL || "support@vaidya-gpt.com"}?subject=unsubscribe>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}
