import prisma from "@/lib/prisma";
import { hashInput, estimateTokens } from "@/lib/ai/token-usage";

function hasDelegate(): boolean {
  return typeof (prisma as { aiContextCache?: unknown }).aiContextCache !== "undefined";
}

export async function getCachedContext<T>(params: {
  userId: string;
  type: string;
  sourceHash: string;
}): Promise<T | null> {
  if (!hasDelegate()) return null;
  const row = await prisma.aiContextCache.findUnique({
    where: {
      userId_type_sourceHash: {
        userId: params.userId,
        type: params.type,
        sourceHash: params.sourceHash,
      },
    },
  });
  if (!row) return null;
  return row.contextJson as T;
}

export async function setCachedContext(params: {
  userId: string;
  type: string;
  sourceHash: string;
  documentId?: string | null;
  reportId?: string | null;
  context: unknown;
}): Promise<void> {
  if (!hasDelegate()) return;
  const json = JSON.stringify(params.context);
  await prisma.aiContextCache.upsert({
    where: {
      userId_type_sourceHash: {
        userId: params.userId,
        type: params.type,
        sourceHash: params.sourceHash,
      },
    },
    create: {
      userId: params.userId,
      type: params.type,
      sourceHash: params.sourceHash,
      documentId: params.documentId ?? null,
      reportId: params.reportId ?? null,
      contextJson: params.context as object,
      tokenEstimate: estimateTokens(json),
    },
    update: {
      contextJson: params.context as object,
      tokenEstimate: estimateTokens(json),
      documentId: params.documentId ?? null,
      reportId: params.reportId ?? null,
    },
  });
}

export async function getCachedResponse<T>(params: {
  userId: string;
  type: string;
  inputHash: string;
}): Promise<T | null> {
  if (typeof (prisma as { aiResponseCache?: unknown }).aiResponseCache === "undefined") {
    return null;
  }
  const row = await prisma.aiResponseCache.findUnique({
    where: {
      userId_type_inputHash: {
        userId: params.userId,
        type: params.type,
        inputHash: params.inputHash,
      },
    },
  });
  if (!row) return null;
  if (row.expiresAt && row.expiresAt < new Date()) {
    await prisma.aiResponseCache.delete({ where: { id: row.id } }).catch(() => {});
    return null;
  }
  return row.outputJson as T;
}

export async function setCachedResponse(params: {
  userId: string;
  type: string;
  inputHash: string;
  output: unknown;
  model?: string;
  tokensSaved?: number;
  ttlHours?: number;
}): Promise<void> {
  if (typeof (prisma as { aiResponseCache?: unknown }).aiResponseCache === "undefined") {
    return;
  }
  const expiresAt = params.ttlHours
    ? new Date(Date.now() + params.ttlHours * 3600 * 1000)
    : new Date(Date.now() + 24 * 3600 * 1000);
  await prisma.aiResponseCache.upsert({
    where: {
      userId_type_inputHash: {
        userId: params.userId,
        type: params.type,
        inputHash: params.inputHash,
      },
    },
    create: {
      userId: params.userId,
      type: params.type,
      inputHash: params.inputHash,
      outputJson: params.output as object,
      model: params.model ?? null,
      tokensSaved: params.tokensSaved ?? null,
      expiresAt,
    },
    update: {
      outputJson: params.output as object,
      model: params.model ?? null,
      tokensSaved: params.tokensSaved ?? null,
      expiresAt,
    },
  });
}

export function buildResponseCacheHash(parts: {
  userId: string;
  feature: string;
  reportId?: string | null;
  documentId?: string | null;
  question: string;
  contextHash: string;
  language?: string;
  model?: string;
}): string {
  return hashInput([
    parts.userId,
    parts.feature,
    parts.reportId,
    parts.documentId,
    parts.question.trim().toLowerCase(),
    parts.contextHash,
    parts.language,
    parts.model,
  ]);
}
