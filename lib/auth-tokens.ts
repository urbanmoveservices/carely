import prisma from "./prisma";
import { generateSecureToken } from "./secure-token";

export type AuthTokenType = "email_verification" | "password_reset";

export async function createAuthToken(
  userId: string,
  type: AuthTokenType,
  expiresInMinutes: number
): Promise<string> {
  const token = generateSecureToken(32);
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
  await prisma.authToken.create({
    data: { userId, type, token, expiresAt },
  });
  return token;
}

export async function consumeAuthToken(token: string, type: AuthTokenType) {
  const record = await prisma.authToken.findUnique({ where: { token } });
  if (!record || record.type !== type) {
    return { ok: false as const, error: "Invalid or expired token" };
  }
  if (record.usedAt) {
    return { ok: false as const, error: "Token already used" };
  }
  if (record.expiresAt < new Date()) {
    return { ok: false as const, error: "Token expired" };
  }
  await prisma.authToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });
  return { ok: true as const, userId: record.userId, record };
}

export async function invalidateAuthTokens(userId: string, type: AuthTokenType) {
  await prisma.authToken.updateMany({
    where: { userId, type, usedAt: null },
    data: { usedAt: new Date() },
  });
}
