/**
 * Re-parse lab values and repair AI summaries for existing reports.
 * Usage: npm run reports:repair-values [-- --dry-run] [--report-id=...] [--user-id=...] [--limit=50]
 */
import prisma from "../lib/prisma";
import { parseLabValuesFromText, LAB_PARSER_VERSION } from "../lib/lab-value-parser";
import { parseAndSaveLabValues, loadStructuredLabValues } from "../lib/lab-value-service";
import { validateReportSummary } from "../lib/ai/report-summary-validator";
import { repairReportSummary } from "../lib/ai/report-summary-repair";
import { computeHealthScoreFromLabValues } from "../lib/health-score";
import { extractAndSaveHealthRisks } from "../lib/health-risk-extractor";
import { extractAndSaveLabTrends } from "../lib/lab-trend-extractor";
import { loadReportPostProcessingContext } from "../lib/report-post-processing";

function argFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function argValue(name: string): string | undefined {
  const pref = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(pref));
  return hit ? hit.slice(pref.length) : undefined;
}

async function main() {
  const dryRun = argFlag("dry-run");
  const reportId = argValue("report-id");
  const userId = argValue("user-id");
  const limit = parseInt(argValue("limit") || "200", 10);

  const where: {
    document: { uploadStatus: string; extractedText: { not: null } };
    id?: string;
    userId?: string;
  } = {
    document: { uploadStatus: "ai_completed", extractedText: { not: null } },
  };
  if (reportId) where.id = reportId;
  if (userId) where.userId = userId;

  const reports = await prisma.report.findMany({
    where,
    include: {
      document: {
        select: {
          id: true,
          extractedText: true,
          originalFilename: true,
          familyMemberId: true,
          createdAt: true,
        },
      },
    },
    take: limit,
    orderBy: { createdAt: "desc" },
  });

  let scanned = 0;
  let repaired = 0;
  let labValuesParsed = 0;
  let unknownRemoved = 0;
  let risksMerged = 0;
  let normalRisksRemoved = 0;
  let scoreRecalculated = 0;

  for (const report of reports) {
    scanned++;
    const text = report.document.extractedText || "";
    if (text.length < 50) continue;

    const parsed = parseLabValuesFromText(text);
    labValuesParsed += parsed.length;

    const before = validateReportSummary(
      {
        summary: report.summary,
        keyFindings: report.keyFindings as never[],
        abnormalValues: report.abnormalValues as never[],
        foodRecommendations: [],
        exerciseRecommendations: [],
        lifestyleAdvice: [],
        riskFlags: report.riskFlags as never[],
        chartData: report.chartData as never[],
        healthScore: report.healthScore ?? undefined,
      },
      parsed
    );

    const structuredPreview = parsed;
    const scorePreview = computeHealthScoreFromLabValues(
      structuredPreview,
      report.healthScore ?? undefined
    );

    const needsScoreRepair = (report.healthScore ?? null) !== scorePreview.score;
    const needsRepair =
      !before.valid || before.hasUnknownFindings || needsScoreRepair;
    if (!needsRepair && parsed.length === 0) continue;

    if (dryRun) {
      console.log("[dry-run] would repair", report.id, {
        parsed: parsed.length,
        issues: before.issues.length,
        oldScore: report.healthScore,
        newScore: scorePreview.score,
        factorsCount: scorePreview.factors.length,
        scoreSource: scorePreview.scoreSource,
      });
      continue;
    }

    await parseAndSaveLabValues({
      userId: report.userId,
      documentId: report.documentId,
      reportId: report.id,
      familyMemberId: report.document.familyMemberId,
      extractedText: text,
    });

    const structured = await loadStructuredLabValues({
      userId: report.userId,
      documentId: report.documentId,
      reportId: report.id,
      reparseIfEmpty: false,
    });

    const fixed = repairReportSummary(
      {
        summary: report.summary,
        keyFindings: (report.keyFindings as never[]) || [],
        abnormalValues: (report.abnormalValues as never[]) || [],
        foodRecommendations: (report.foodRecommendations as string[]) || [],
        exerciseRecommendations: (report.exerciseRecommendations as string[]) || [],
        lifestyleAdvice: (report.lifestyleAdvice as string[]) || [],
        riskFlags: (report.riskFlags as never[]) || [],
        chartData: (report.chartData as never[]) || [],
        contextualInsights: (report.contextualInsights as never[]) || undefined,
        healthScore: report.healthScore ?? undefined,
      },
      structured
    );

    const after = validateReportSummary(fixed, structured);
    if (before.hasUnknownFindings && !after.hasUnknownFindings) unknownRemoved++;

    const oldScore = report.healthScore;
    const { score, factors, scoreSource } = computeHealthScoreFromLabValues(
      structured,
      report.healthScore ?? undefined
    );
    if (oldScore !== score) scoreRecalculated++;

    const risksBefore = await prisma.healthRisk.count({
      where: { reportId: report.id, userId: report.userId },
    });

    await prisma.report.update({
      where: { id: report.id },
      data: {
        summary: fixed.summary,
        keyFindings: fixed.keyFindings as object,
        abnormalValues: fixed.abnormalValues as object,
        chartData: fixed.chartData as object,
        riskFlags: fixed.riskFlags as object,
        healthScore: score,
        scoreFactors: factors as object,
        scoreSource,
        valueParserVersion: LAB_PARSER_VERSION,
        summaryValidationStatus: after.valid ? "repaired" : "repaired_partial",
        repairedAt: new Date(),
        usesStructuredValues: structured.length > 0,
      },
    });

    const ctx = await loadReportPostProcessingContext(report.userId, report.documentId);
    const risks = await extractAndSaveHealthRisks({
      userId: report.userId,
      documentId: report.documentId,
      reportId: report.id,
      familyMemberId: report.document.familyMemberId,
      report: {
        id: report.id,
        abnormalValues: fixed.abnormalValues,
        keyFindings: fixed.keyFindings,
        riskFlags: fixed.riskFlags,
        chartData: fixed.chartData,
      },
      context: ctx,
      structuredLabValues: structured,
    });
    risksMerged += risks.length;
    if (risksBefore > risks.length) {
      normalRisksRemoved += risksBefore - risks.length;
    }

    await extractAndSaveLabTrends({
      userId: report.userId,
      documentId: report.documentId,
      reportId: report.id,
      familyMemberId: report.document.familyMemberId,
      report: {
        abnormalValues: fixed.abnormalValues,
        keyFindings: fixed.keyFindings,
        chartData: fixed.chartData,
      },
      document: { createdAt: report.document.createdAt },
    });

    repaired++;
    console.log("repaired", report.id, report.document.originalFilename, {
      oldScore,
      newScore: score,
      factors: factors.length,
      scoreSource,
    });
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        reportsScanned: scanned,
        reportsRepaired: repaired,
        labValuesParsed,
        unknownFindingsRemoved: unknownRemoved,
        healthRisksWritten: risksMerged,
        scoresRecalculated: scoreRecalculated,
        normalRisksRemoved,
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
