import type { Prisma } from "@prisma/client";
import prisma from "./prisma";

const SENSITIVE_KEYS = /password|token|secret|extractedText|medical|summary/i;

function sanitizeMetadata(
  metadata?: Record<string, unknown> | null
): Prisma.InputJsonValue | undefined {
  if (!metadata) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(metadata)) {
    if (SENSITIVE_KEYS.test(k)) continue;
    if (typeof v === "string" && v.length > 500) {
      out[k] = `${v.slice(0, 500)}…`;
      continue;
    }
    out[k] = v;
  }
  return out as Prisma.InputJsonValue;
}

export async function logError(params: {
  source: string;
  message: string;
  userId?: string | null;
  stack?: string | null;
  severity?: string;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    await prisma.errorLog.create({
      data: {
        source: params.source.slice(0, 120),
        message: params.message.slice(0, 2000),
        userId: params.userId ?? null,
        stack: params.stack?.slice(0, 4000) ?? null,
        severity: params.severity ?? "error",
        metadata: sanitizeMetadata(params.metadata),
      },
    });
  } catch (err) {
    console.error("[error-log] Failed to persist:", err);
  }
}
