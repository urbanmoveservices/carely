import { timingSafeEqual } from "crypto";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

export type AdminEnvCredentials = {
  name: string;
  email: string;
  password: string;
};

/** Admin login identity from environment (ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD). */
export function getAdminCredentialsFromEnv(): AdminEnvCredentials | null {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "Vaidya Admin";

  if (!email || !password?.trim()) {
    return null;
  }

  return {
    name,
    email,
    password,
  };
}

export function isAdminEnvAuthConfigured(): boolean {
  return getAdminCredentialsFromEnv() != null;
}

function secureCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function envAdminCredentialsMatch(
  email: string,
  password: string,
  creds: AdminEnvCredentials = getAdminCredentialsFromEnv()!
): boolean {
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail !== creds.email) return false;
  return secureCompare(password, creds.password);
}

/** Create or update the admin User row to match env credentials (password hash synced from env). */
export async function ensureAdminUserFromEnv(
  creds: AdminEnvCredentials = getAdminCredentialsFromEnv()!
) {
  const passwordHash = await hashPassword(creds.password);
  const existing = await prisma.user.findUnique({
    where: { email: creds.email },
  });

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        name: creds.name,
        role: "admin",
        passwordHash,
        isActive: true,
      },
    });
  }

  return prisma.user.create({
    data: {
      name: creds.name,
      email: creds.email,
      passwordHash,
      role: "admin",
      isActive: true,
    },
  });
}

/** Public-safe view for admin settings (never exposes password). */
export function getAdminCredentialsPublicInfo() {
  const creds = getAdminCredentialsFromEnv();
  return {
    configured: creds != null,
    source: creds ? ("env" as const) : ("database" as const),
    name: creds?.name ?? null,
    email: creds?.email ?? null,
    envKeys: ["ADMIN_NAME", "ADMIN_EMAIL", "ADMIN_PASSWORD"],
    changeInstructions:
      "Update ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD in the server .env file, then restart the app (e.g. pm2 restart vaidya-gpt).",
  };
}
