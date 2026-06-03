import prisma from "@/lib/prisma";
import {
  getCachedTranslation,
  getCachedTranslationsBatch,
  saveCachedTranslationsBatch,
} from "./cache";
import { getActiveTranslationProvider } from "./provider";
import {
  isOpenAiTranslationConfigured,
  type TranslationContext,
} from "./openai-translation-provider";
import { MockTranslationProvider } from "./mock-provider";

export const AI_TRANSLATION_CONSENT_REQUIRED =
  "Enable AI translation in Settings to translate medical report content.";

/** @deprecated Use AI_TRANSLATION_CONSENT_REQUIRED */
export const CLOUD_CONSENT_REQUIRED = AI_TRANSLATION_CONSENT_REQUIRED;

export async function getUserAllowCloudTranslation(
  userId: string
): Promise<boolean> {
  const pref = await prisma.userPreference.findUnique({
    where: { userId },
    select: { allowCloudTranslation: true },
  });
  return pref?.allowCloudTranslation ?? false;
}

export function requiresMedicalTranslationConsent(
  context: TranslationContext = "general"
): boolean {
  return context === "medical_report";
}

export function assertOpenAiTranslationConfigured(): void {
  if (!isOpenAiTranslationConfigured()) {
    const err = new Error("OpenAI translation is not configured.");
    (err as Error & { code: string }).code = "TRANSLATION_NOT_CONFIGURED";
    throw err;
  }
}

export function assertMedicalTranslationAllowed(
  allowCloud: boolean,
  context: TranslationContext
): void {
  if (requiresMedicalTranslationConsent(context) && !allowCloud) {
    const err = new Error(AI_TRANSLATION_CONSENT_REQUIRED);
    (err as Error & { code: string }).code = "AI_TRANSLATION_CONSENT_REQUIRED";
    throw err;
  }
}

/** UI/legal/general require OpenAI; medical also requires consent */
export function assertTranslationAllowed(
  allowCloud: boolean,
  context: TranslationContext
): void {
  if (context === "medical_report") {
    assertOpenAiTranslationConfigured();
    assertMedicalTranslationAllowed(allowCloud, context);
    return;
  }
  if (context === "ui" || context === "legal" || context === "general") {
    if (!isOpenAiTranslationConfigured()) {
      return;
    }
  }
}

export async function translateTextWithCache(params: {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string;
  allowCloud?: boolean;
  context?: TranslationContext;
}): Promise<{
  translatedText: string;
  cached: boolean;
  provider: string;
  warning?: string;
}> {
  const {
    text,
    targetLanguage,
    sourceLanguage = "en",
    allowCloud = true,
    context = "general",
  } = params;

  if (targetLanguage === "en") {
    return { translatedText: text, cached: false, provider: "openai" };
  }

  const { shouldSkipTextTranslation } = await import("./should-translate");
  if (shouldSkipTextTranslation(text)) {
    return { translatedText: text, cached: false, provider: "openai" };
  }

  assertTranslationAllowed(allowCloud, context);
  if (
    requiresMedicalTranslationConsent(context) &&
    !isOpenAiTranslationConfigured()
  ) {
    assertOpenAiTranslationConfigured();
  }

  const cached = await getCachedTranslation(text, targetLanguage, context);
  if (cached) {
    return { translatedText: cached, cached: true, provider: "openai" };
  }

  const { provider, name } = getActiveTranslationProvider(context);

  if (name === "mock" && context === "medical_report") {
    assertOpenAiTranslationConfigured();
  }

  const translatedText = await provider.translateText({
    text,
    targetLanguage,
    sourceLanguage,
  });

  if (name === "openai") {
    await saveCachedTranslationsBatch(
      [{ sourceText: text, translatedText }],
      targetLanguage,
      sourceLanguage,
      name,
      context
    );
  }

  let warning: string | undefined;
  if (name === "mock") {
    warning =
      MockTranslationProvider.unsupportedNotice(targetLanguage) ??
      "OpenAI translation is not configured. Using limited local UI labels.";
  }

  return { translatedText, cached: false, provider: name, warning };
}

export async function translateBatchWithCache(params: {
  texts: string[];
  targetLanguage: string;
  sourceLanguage?: string;
  allowCloud?: boolean;
  context?: TranslationContext;
}): Promise<{
  texts: string[];
  cachedFlags: boolean[];
  provider: string;
  warning?: string;
}> {
  const {
    texts,
    targetLanguage,
    sourceLanguage = "en",
    allowCloud = true,
    context = "general",
  } = params;

  if (targetLanguage === "en") {
    return {
      texts,
      cachedFlags: texts.map(() => false),
      provider: "openai",
    };
  }

  assertTranslationAllowed(allowCloud, context);
  if (
    requiresMedicalTranslationConsent(context) &&
    !isOpenAiTranslationConfigured()
  ) {
    assertOpenAiTranslationConfigured();
  }

  const { shouldSkipTextTranslation } = await import("./should-translate");
  const cachedList = await getCachedTranslationsBatch(
    texts,
    targetLanguage,
    context
  );
  const { provider, name } = getActiveTranslationProvider(context);

  if (name === "mock" && context === "medical_report") {
    assertOpenAiTranslationConfigured();
  }

  const toTranslate: { index: number; text: string }[] = [];
  const results = [...texts];

  texts.forEach((text, i) => {
    if (shouldSkipTextTranslation(text)) {
      results[i] = text;
      return;
    }
    const cached = cachedList[i];
    if (cached !== null && cached !== undefined) {
      results[i] = cached;
    } else {
      toTranslate.push({ index: i, text });
    }
  });

  const cachedFlags = texts.map((text, i) => {
    if (shouldSkipTextTranslation(text)) return false;
    const c = cachedList[i];
    return c !== null && c !== undefined;
  });

  if (toTranslate.length > 0) {
    const batchTexts = toTranslate.map((x) => x.text);
    const translated = await provider.translateBatch({
      texts: batchTexts,
      targetLanguage,
      sourceLanguage,
    });

    const saveItems: { sourceText: string; translatedText: string }[] = [];
    toTranslate.forEach((item, j) => {
      results[item.index] = translated[j] ?? item.text;
      if (name === "openai") {
        saveItems.push({
          sourceText: item.text,
          translatedText: results[item.index],
        });
      }
    });

    if (saveItems.length > 0) {
      await saveCachedTranslationsBatch(
        saveItems,
        targetLanguage,
        sourceLanguage,
        name,
        context
      );
    }
  }

  let warning: string | undefined;
  if (name === "mock") {
    warning =
      MockTranslationProvider.unsupportedNotice(targetLanguage) ??
      "OpenAI translation is not configured. Using limited local UI labels.";
  }

  return { texts: results, cachedFlags, provider: name, warning };
}

export function getTranslationProviderStatus() {
  const { name, isCloud } = getActiveTranslationProvider();
  const model = process.env.OPENAI_TRANSLATION_MODEL || "gpt-4o-mini";
  return {
    provider: name,
    isCloud,
    openAiConfigured: isOpenAiTranslationConfigured(),
    translationModel: model,
    medicalConsentRequired: true,
  };
}
