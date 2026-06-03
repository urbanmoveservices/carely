import type { MedicalSummaryResult } from "@/lib/ai-summary";
import { generateMedicalSummary } from "@/lib/ai-summary";
import type { AiHealthContextBundle } from "@/lib/report-context-service";
import type { ParsedLabValue } from "@/lib/lab-value-parser";
import {
  parseAndSaveLabValues,
  loadStructuredLabValues,
  LAB_PARSER_VERSION,
} from "@/lib/lab-value-service";
import { validateReportSummary } from "@/lib/ai/report-summary-validator";
import {
  repairReportSummary,
  buildDeterministicSummary,
} from "@/lib/ai/report-summary-repair";
import { computeHealthScoreFromLabs } from "@/lib/health-score";
import type { HealthScoreFactor } from "@/lib/health-score";

export type IntelligencePipelineResult = {
  result: MedicalSummaryResult;
  model: string;
  durationMs: number;
  structuredValues: ParsedLabValue[];
  validationStatus: string;
  scoreFactors: HealthScoreFactor[];
  repaired: boolean;
  usedDeterministicFallback: boolean;
};

export async function runReportIntelligencePipeline(params: {
  documentId: string;
  userId: string;
  reportId?: string | null;
  familyMemberId?: string | null;
  extractedText: string;
  originalFilename: string;
  uploadMode?: string | null;
  pageCount?: number | null;
  language?: string | null;
  healthContext: AiHealthContextBundle;
  replaceParsed?: boolean;
}): Promise<IntelligencePipelineResult> {
  const start = Date.now();

  await parseAndSaveLabValues({
    userId: params.userId,
    documentId: params.documentId,
    reportId: params.reportId,
    familyMemberId: params.familyMemberId,
    extractedText: params.extractedText,
    replaceParsed: params.replaceParsed ?? true,
  });

  const structuredValues = await loadStructuredLabValues({
    userId: params.userId,
    documentId: params.documentId,
    reportId: params.reportId,
    extractedText: params.extractedText,
    reparseIfEmpty: false,
  });

  const { result: rawResult, model, durationMs: aiMs } = await generateMedicalSummary({
    documentId: params.documentId,
    extractedText: params.extractedText,
    originalFilename: params.originalFilename,
    uploadMode: params.uploadMode,
    pageCount: params.pageCount,
    language: params.language,
    healthContext: params.healthContext,
    structuredLabValues: structuredValues,
  });

  let result = rawResult;
  let validation = validateReportSummary(result, structuredValues);
  let repaired = false;
  let usedDeterministicFallback = false;

  if (!validation.valid) {
    result = repairReportSummary(result, structuredValues);
    repaired = true;
    validation = validateReportSummary(result, structuredValues);
  }

  if (!validation.valid && structuredValues.length > 0) {
    const det = buildDeterministicSummary(structuredValues);
    result = {
      ...det,
      foodRecommendations:
        rawResult.foodRecommendations?.length > 0
          ? rawResult.foodRecommendations
          : det.foodRecommendations,
      exerciseRecommendations:
        rawResult.exerciseRecommendations?.length > 0
          ? rawResult.exerciseRecommendations
          : det.exerciseRecommendations,
      lifestyleAdvice:
        rawResult.lifestyleAdvice?.length > 0
          ? rawResult.lifestyleAdvice
          : det.lifestyleAdvice,
      contextualInsights: rawResult.contextualInsights ?? det.contextualInsights,
    };
    usedDeterministicFallback = true;
    repaired = true;
    validation = validateReportSummary(result, structuredValues);
  }

  const { score, factors } = computeHealthScoreFromLabs(structuredValues);
  result.healthScore = score;

  const validationStatus = validation.valid
    ? repaired
      ? "repaired"
      : "valid"
    : validation.hasUnknownFindings
      ? "unknown_findings_remain"
      : "invalid";

  return {
    result,
    model,
    durationMs: Date.now() - start,
    structuredValues,
    validationStatus,
    scoreFactors: factors,
    repaired,
    usedDeterministicFallback,
  };
}

export { LAB_PARSER_VERSION };
