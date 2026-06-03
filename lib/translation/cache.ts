import { createHash } from "crypto";
import prisma from "@/lib/prisma";
import type { TranslationContext } from "./openai-translation-provider";
import {
  normalizeSourceText,
  shouldCacheTranslation,
  shouldSkipTextTranslation,
} from "./should-translate";

export function hashSourceText(text: string, context: string = "general"): string {
  const normalized = normalizeSourceText(text);
  return createHash("sha256")
    .update(`${normalized}|${context}`, "utf8")
    .digest("hex");
}

export async function getCachedTranslation(
  sourceText: string,
  targetLanguage: string,
  context: TranslationContext = "general"
): Promise<string | null> {
  if (!shouldCacheTranslation(sourceText)) return sourceText;

  const sourceHash = hashSourceText(sourceText, context);
  const row = await prisma.translationCache.findUnique({
    where: {
      sourceHash_targetLanguage_context: {
        sourceHash,
        targetLanguage,
        context,
      },
    },
  });
  return row?.translatedText ?? null;
}

export async function getCachedTranslationsBatch(
  texts: string[],
  targetLanguage: string,
  context: TranslationContext = "general"
): Promise<(string | null)[]> {
  const hashes = texts.map((t) =>
    shouldCacheTranslation(t) ? hashSourceText(t, context) : null
  );

  const validHashes = hashes.filter((h): h is string => h !== null);
  if (validHashes.length === 0) {
    return texts.map((t) => (shouldSkipTextTranslation(t) ? t : null));
  }

  const rows = await prisma.translationCache.findMany({
    where: {
      sourceHash: { in: validHashes },
      targetLanguage,
      context,
    },
  });

  const map = new Map(rows.map((r) => [r.sourceHash, r.translatedText]));

  return texts.map((text, i) => {
    if (shouldSkipTextTranslation(text)) return text;
    const h = hashes[i];
    if (!h) return null;
    return map.get(h) ?? null;
  });
}

export async function saveCachedTranslation(params: {
  sourceText: string;
  translatedText: string;
  targetLanguage: string;
  sourceLanguage?: string;
  provider: string;
  context?: TranslationContext;
}): Promise<void> {
  const {
    sourceText,
    translatedText,
    targetLanguage,
    sourceLanguage = "en",
    provider,
    context = "general",
  } = params;
  if (!shouldCacheTranslation(sourceText)) return;
  if (!translatedText?.trim()) return;

  const sourceHash = hashSourceText(sourceText, context);
  await prisma.translationCache.upsert({
    where: {
      sourceHash_targetLanguage_context: {
        sourceHash,
        targetLanguage,
        context,
      },
    },
    create: {
      sourceHash,
      sourceLanguage,
      targetLanguage,
      context,
      sourceText: normalizeSourceText(sourceText).slice(0, 8000),
      translatedText,
      provider,
    },
    update: {
      translatedText,
      provider,
      updatedAt: new Date(),
    },
  });
}

export async function saveCachedTranslationsBatch(
  items: {
    sourceText: string;
    translatedText: string;
  }[],
  targetLanguage: string,
  sourceLanguage: string,
  provider: string,
  context: TranslationContext = "general"
): Promise<void> {
  for (const item of items) {
    await saveCachedTranslation({
      sourceText: item.sourceText,
      translatedText: item.translatedText,
      targetLanguage,
      sourceLanguage,
      provider,
      context,
    });
  }
}

export async function getTranslationCacheStats() {
  const count = await prisma.translationCache.count();
  return { count };
}
