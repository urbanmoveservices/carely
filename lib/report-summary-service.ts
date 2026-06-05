import type { Prisma } from "@prisma/client";
import { Prisma as PrismaNamespace } from "@prisma/client";
import prisma from "@/lib/prisma";
import { AppError } from "@/lib/app-error";
import type { MedicalSummaryResult } from "@/lib/ai-summary";
import {
  runReportIntelligencePipeline,
  LAB_PARSER_VERSION,
} from "@/lib/report-intelligence-pipeline";
import type { AiHealthContextBundle } from "@/lib/report-context-service";
import {
  assertExtractedTextReady,
  assertOpenAiConfigured,
} from "@/lib/summary-error-messages";
import {
  loadReportPostProcessingContext,
  runReportPostProcessing,
  type PostProcessingResult,
} from "@/lib/report-post-processing";

export function logSummaryGenerationDev(params: {
  documentId: string;
  originalFilename: string;
  extractedTextLength: number;
  regenerate?: boolean;
}) {
  if (process.env.NODE_ENV === "production") return;
  console.log("[ai-summary]", {
    documentId: params.documentId,
    filename: params.originalFilename,
    extractedTextLength: params.extractedTextLength,
    aiProvider: "openai",
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
    mockSummariesEnabled: false,
    regenerate: params.regenerate ?? false,
  });
}

function toPrismaReportCreateData(params: {
  userId: string;
  documentId: string;
  result: MedicalSummaryResult;
  aiModelUsed: string;
  processingTimeMs: number;
  scoreFactors?: unknown;
  scoreSource?: string;
  validationStatus?: string;
  usesStructuredValues?: boolean;
}): Prisma.ReportUncheckedCreateInput {
  return {
    userId: params.userId,
    documentId: params.documentId,
    summary: params.result.summary,
    keyFindings: (params.result.keyFindings ?? []) as unknown as Prisma.InputJsonValue,
    abnormalValues: (params.result.abnormalValues ?? []) as unknown as Prisma.InputJsonValue,
    foodRecommendations: (params.result.foodRecommendations ?? []) as unknown as Prisma.InputJsonValue,
    exerciseRecommendations: (params.result.exerciseRecommendations ?? []) as unknown as Prisma.InputJsonValue,
    lifestyleAdvice: (params.result.lifestyleAdvice ?? []) as unknown as Prisma.InputJsonValue,
    riskFlags: (params.result.riskFlags ?? []) as unknown as Prisma.InputJsonValue,
    chartData: (params.result.chartData ?? []) as unknown as Prisma.InputJsonValue,
    contextualInsights: (params.result.contextualInsights ?? []) as unknown as Prisma.InputJsonValue,
    healthScore: params.result.healthScore ?? null,
    scoreFactors: (params.scoreFactors ?? undefined) as Prisma.InputJsonValue | undefined,
    scoreSource: params.scoreSource ?? null,
    valueParserVersion: LAB_PARSER_VERSION,
    summaryValidationStatus: params.validationStatus ?? null,
    usesStructuredValues: params.usesStructuredValues ?? false,
    aiModelUsed: params.aiModelUsed,
    processingTimeMs: params.processingTimeMs,
  };
}

export async function generateAndPersistReport(params: {
  userId: string;
  documentId: string;
  extractedText: string;
  originalFilename: string;
  uploadMode?: string | null;
  pageCount?: number | null;
  language?: string | null;
  replaceExisting?: boolean;
  healthContext: AiHealthContextBundle;
}): Promise<{
  report: {
    id: string;
    summary: string;
    createdAt: Date;
    aiModelUsed: string | null;
    processingTimeMs: number | null;
  };
  result: MedicalSummaryResult;
  model: string;
  postProcessing: PostProcessingResult;
}> {
  const { replaceExisting = false } = params;

  assertOpenAiConfigured();
  assertExtractedTextReady(params.extractedText);

  logSummaryGenerationDev({
    documentId: params.documentId,
    originalFilename: params.originalFilename,
    extractedTextLength: params.extractedText.length,
    regenerate: replaceExisting,
  });

  const pipeline = await runReportIntelligencePipeline({
    userId: params.userId,
    documentId: params.documentId,
    extractedText: params.extractedText,
    originalFilename: params.originalFilename,
    uploadMode: params.uploadMode,
    pageCount: params.pageCount,
    language: params.language,
    healthContext: params.healthContext,
    replaceParsed: true,
  });

  const {
    result,
    model,
    durationMs,
    scoreFactors,
    scoreSource,
    validationStatus,
    structuredValues,
  } = pipeline;

  const reportData = toPrismaReportCreateData({
    userId: params.userId,
    documentId: params.documentId,
    result,
    aiModelUsed: model,
    processingTimeMs: durationMs,
    scoreFactors,
    scoreSource,
    validationStatus,
    usesStructuredValues: structuredValues.length > 0,
  });

  try {
    const report = await prisma.$transaction(async (tx) => {
      if (replaceExisting) {
        await tx.report.deleteMany({
          where: { documentId: params.documentId, userId: params.userId },
        });
      }

      return tx.report.create({ data: reportData });
    });

    const document = await prisma.document.update({
      where: { id: params.documentId },
      data: { uploadStatus: "ai_completed", errorMessage: null },
    });

    const contextBundle = await loadReportPostProcessingContext(
      params.userId,
      params.documentId
    );

    const postProcessing = await runReportPostProcessing({
      userId: params.userId,
      documentId: params.documentId,
      reportId: report.id,
      familyMemberId: document.familyMemberId,
      structuredLabValues: structuredValues,
      report: {
        id: report.id,
        summary: report.summary,
        keyFindings: report.keyFindings,
        abnormalValues: report.abnormalValues,
        riskFlags: report.riskFlags,
        chartData: report.chartData,
        contextualInsights: report.contextualInsights,
        healthScore: report.healthScore,
        createdAt: report.createdAt,
      },
      document: {
        id: document.id,
        originalFilename: params.originalFilename,
        createdAt: document.createdAt,
      },
      context: contextBundle,
    });

    return {
      report: {
        id: report.id,
        summary: report.summary,
        createdAt: report.createdAt,
        aiModelUsed: report.aiModelUsed,
        processingTimeMs: report.processingTimeMs,
      },
      result,
      model,
      postProcessing,
    };
  } catch (err) {
    console.error("[ai-summary] report save failed:", err);
    if (err instanceof AppError) throw err;
    if (err instanceof PrismaNamespace.PrismaClientKnownRequestError) {
      throw new AppError("Could not save AI summary.", "REPORT_SAVE_FAILED", 500);
    }
    throw new AppError("Could not save AI summary.", "REPORT_SAVE_FAILED", 500);
  }
}
