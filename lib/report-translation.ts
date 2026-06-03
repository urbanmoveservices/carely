import prisma from "@/lib/prisma";
import type { Report } from "@prisma/client";
import type {
  AbnormalValue,
  ChartDataPoint,
  ContextualInsight,
  KeyFinding,
  MedicalSummaryResult,
  RiskFlag,
} from "@/lib/ai-summary";
import {
  DEFAULT_LANGUAGE,
  isSupportedLanguage,
} from "@/lib/i18n/languages";
import {
  applyMockReportTranslation,
  isMockAiMode,
} from "@/lib/i18n/mock-report-translations";
import { translateObject } from "@/lib/translation/translate-object";
import {
  AI_TRANSLATION_CONSENT_REQUIRED,
  assertOpenAiTranslationConfigured,
} from "@/lib/translation/service";
import {
  getOpenAiTranslationModel,
  isOpenAiTranslationConfigured,
} from "@/lib/translation/openai-translation-provider";

export type TranslatedReportContent = {
  summary: string;
  keyFindings: KeyFinding[];
  abnormalValues: AbnormalValue[];
  foodRecommendations: string[];
  exerciseRecommendations: string[];
  lifestyleAdvice: string[];
  riskFlags: RiskFlag[];
  chartData: ChartDataPoint[];
  contextualInsights?: ContextualInsight[];
};

export type TranslateReportResult = {
  content: TranslatedReportContent;
  translated: boolean;
  fromCache: boolean;
  partial?: boolean;
  warning?: string;
  aiModelUsed?: string;
};

function parseJsonArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function extractReportContent(
  report: Pick<
    Report,
    | "summary"
    | "keyFindings"
    | "abnormalValues"
    | "foodRecommendations"
    | "exerciseRecommendations"
    | "lifestyleAdvice"
    | "riskFlags"
    | "chartData"
  > & { contextualInsights?: unknown }
): TranslatedReportContent {
  return {
    summary: report.summary,
    keyFindings: parseJsonArray<KeyFinding>(report.keyFindings),
    abnormalValues: parseJsonArray<AbnormalValue>(report.abnormalValues),
    foodRecommendations: parseJsonArray<string>(report.foodRecommendations),
    exerciseRecommendations: parseJsonArray<string>(
      report.exerciseRecommendations
    ),
    lifestyleAdvice: parseJsonArray<string>(report.lifestyleAdvice),
    riskFlags: parseJsonArray<RiskFlag>(report.riskFlags),
    chartData: parseJsonArray<ChartDataPoint>(report.chartData),
    contextualInsights: parseJsonArray<ContextualInsight>(
      report.contextualInsights
    ),
  };
}

function cacheToContent(row: {
  summary: string;
  keyFindings: unknown;
  abnormalValues: unknown;
  foodRecommendations: unknown;
  exerciseRecommendations: unknown;
  lifestyleAdvice: unknown;
  riskFlags: unknown;
  chartData: unknown;
}): TranslatedReportContent {
  return {
    summary: row.summary,
    keyFindings: parseJsonArray<KeyFinding>(row.keyFindings),
    abnormalValues: parseJsonArray<AbnormalValue>(row.abnormalValues),
    foodRecommendations: parseJsonArray<string>(row.foodRecommendations),
    exerciseRecommendations: parseJsonArray<string>(
      row.exerciseRecommendations
    ),
    lifestyleAdvice: parseJsonArray<string>(row.lifestyleAdvice),
    riskFlags: parseJsonArray<RiskFlag>(row.riskFlags),
    chartData: parseJsonArray<ChartDataPoint>(row.chartData),
  };
}

async function performTranslation(
  content: TranslatedReportContent,
  language: string,
  allowCloud: boolean
): Promise<{
  content: TranslatedReportContent;
  model: string;
  partial: boolean;
  warning?: string;
}> {
  if (!allowCloud) {
    return {
      content,
      model: "consent-required",
      partial: true,
      warning: AI_TRANSLATION_CONSENT_REQUIRED,
    };
  }

  if (isMockAiMode() && !isOpenAiTranslationConfigured()) {
    const translated = applyMockReportTranslation(
      content as MedicalSummaryResult,
      language
    );
    const partial = language !== "hi";
    return {
      content: translated,
      model: partial ? "mock-partial" : "mock-hi",
      partial,
      warning: partial
        ? "Full translation is not available for this language yet."
        : undefined,
    };
  }

  try {
    assertOpenAiTranslationConfigured();
    const translated = await translateObject({
      data: content,
      targetLanguage: language,
      sourceLanguage: "en",
      allowCloud: true,
      context: "medical_report",
    });
    return {
      content: translated as TranslatedReportContent,
      model: `${getOpenAiTranslationModel()}-translate`,
      partial: false,
    };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "AI_TRANSLATION_CONSENT_REQUIRED") {
      return {
        content,
        model: "consent-required",
        partial: true,
        warning: AI_TRANSLATION_CONSENT_REQUIRED,
      };
    }
    console.error("OpenAI report translation failed:", err);
    if (language === "hi" && !isOpenAiTranslationConfigured()) {
      const fallback = applyMockReportTranslation(
        content as MedicalSummaryResult,
        "hi"
      );
      return {
        content: fallback,
        model: "mock-hi",
        partial: true,
        warning: "Some report content could not be fully translated.",
      };
    }
    return {
      content,
      model: "fallback-en",
      partial: true,
      warning: "Some report content could not be fully translated.",
    };
  }
}

export async function translateReportContent(params: {
  report: Report;
  language: string;
  force?: boolean;
  allowCloud?: boolean;
}): Promise<TranslateReportResult> {
  const { report, force = false, allowCloud = false } = params;
  const language = isSupportedLanguage(params.language)
    ? params.language
    : DEFAULT_LANGUAGE;

  const original = extractReportContent(report);

  if (language === DEFAULT_LANGUAGE) {
    return {
      content: original,
      translated: false,
      fromCache: false,
    };
  }

  if (!force) {
    const cached = await prisma.reportTranslation.findUnique({
      where: {
        reportId_language: { reportId: report.id, language },
      },
    });
    if (cached) {
      return {
        content: cacheToContent(cached),
        translated: true,
        fromCache: true,
        aiModelUsed: cached.aiModelUsed ?? undefined,
      };
    }
  }

  const {
    content: translated,
    model,
    partial,
    warning: performWarning,
  } = await performTranslation(original, language, allowCloud);

  await prisma.reportTranslation.upsert({
    where: {
      reportId_language: { reportId: report.id, language },
    },
    create: {
      reportId: report.id,
      language,
      summary: translated.summary,
      keyFindings: translated.keyFindings as object,
      abnormalValues: translated.abnormalValues as object,
      foodRecommendations: translated.foodRecommendations as object,
      exerciseRecommendations: translated.exerciseRecommendations as object,
      lifestyleAdvice: translated.lifestyleAdvice as object,
      riskFlags: translated.riskFlags as object,
      chartData: translated.chartData as object,
      aiModelUsed: model,
    },
    update: {
      summary: translated.summary,
      keyFindings: translated.keyFindings as object,
      abnormalValues: translated.abnormalValues as object,
      foodRecommendations: translated.foodRecommendations as object,
      exerciseRecommendations: translated.exerciseRecommendations as object,
      lifestyleAdvice: translated.lifestyleAdvice as object,
      riskFlags: translated.riskFlags as object,
      chartData: translated.chartData as object,
      aiModelUsed: model,
      translatedAt: new Date(),
    },
  });

  return {
    content: translated,
    translated: true,
    fromCache: false,
    partial,
    aiModelUsed: model,
    warning:
      performWarning ??
      (partial
        ? "Some report content could not be fully translated and may appear in English."
        : undefined),
  };
}
