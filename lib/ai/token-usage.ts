import { createHash } from "crypto";
import prisma from "@/lib/prisma";
import { hasAiUsageLogDelegate } from "@/lib/prisma-delegate-guards";

export function hashInput(parts: (string | number | null | undefined)[]): string {
  return createHash("sha256")
    .update(parts.filter((p) => p != null).join("|"))
    .digest("hex");
}

export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export async function logAiUsage(params: {
  userId?: string | null;
  feature: string;
  model?: string | null;
  inputTokens?: number;
  outputTokens?: number;
  cached?: boolean;
  source?: "openai" | "local" | "cache";
  reportId?: string | null;
  documentId?: string | null;
}): Promise<void> {
  if (!hasAiUsageLogDelegate()) return;
  const input = params.inputTokens ?? 0;
  const output = params.outputTokens ?? 0;
  try {
    await prisma.aiUsageLog.create({
      data: {
        userId: params.userId ?? null,
        feature: params.feature,
        model: params.model ?? null,
        inputTokens: input || null,
        outputTokens: output || null,
        totalTokens: input + output || null,
        cached: params.cached ?? false,
        source: params.source ?? (params.cached ? "cache" : "openai"),
        reportId: params.reportId ?? null,
        documentId: params.documentId ?? null,
      },
    });
  } catch (err) {
    console.warn("[ai-usage] log failed:", err);
  }
}
