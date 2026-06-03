import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";
import { ok, unauthorized, forbidden, notFound, serverError, rateLimited } from "@/lib/api-response";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { parseAndSaveLabValues, loadStructuredLabValues } from "@/lib/lab-value-service";
import { repairReportSummary } from "@/lib/ai/report-summary-repair";
import { validateReportSummary } from "@/lib/ai/report-summary-validator";
import { computeHealthScoreFromLabs } from "@/lib/health-score";
import { extractAndSaveHealthRisks } from "@/lib/health-risk-extractor";
import { extractAndSaveLabTrends } from "@/lib/lab-trend-extractor";
import { loadReportPostProcessingContext } from "@/lib/report-post-processing";
import { LAB_PARSER_VERSION } from "@/lib/lab-value-parser";
import { auditAdminAction, AUDIT_ACTIONS } from "@/lib/audit-log";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return unauthorized();

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") return forbidden("Admin access required");

    const rl = checkRateLimit("admin-repair-values", payload.userId, RATE_LIMITS.ADMIN_API);
    if (!rl.allowed) return rateLimited();

    const { id: reportId } = await params;

    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        document: {
          select: {
            id: true,
            extractedText: true,
            familyMemberId: true,
            createdAt: true,
          },
        },
      },
    });

    if (!report?.document?.extractedText) {
      return notFound("Report or extracted text not found");
    }

    await parseAndSaveLabValues({
      userId: report.userId,
      documentId: report.documentId,
      reportId: report.id,
      familyMemberId: report.document.familyMemberId,
      extractedText: report.document.extractedText,
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

    const validation = validateReportSummary(fixed, structured);
    const { score, factors } = computeHealthScoreFromLabs(structured);

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
        valueParserVersion: LAB_PARSER_VERSION,
        summaryValidationStatus: validation.valid ? "repaired" : "repaired_partial",
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

    await auditAdminAction(req, payload.userId, payload.email, AUDIT_ACTIONS.ADMIN_VIEWED_REPORT, {
      entityType: "report",
      entityId: reportId,
      metadata: { action: "repair_values", parsedCount: structured.length },
    });

    return ok({
      reportId: report.id,
      parsedLabValues: structured.length,
      validationStatus: validation.valid ? "repaired" : "repaired_partial",
      unknownFindingsRemain: validation.hasUnknownFindings,
      healthRisksUpdated: risks.length,
      labValues: structured,
    });
  } catch (err) {
    console.error("Admin repair values error:", err);
    return serverError();
  }
}
