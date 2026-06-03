import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";
import { generateReportPdf } from "@/lib/pdf-report";
import {
  unauthorized,
  notFound,
  fail,
  rateLimited,
} from "@/lib/api-response";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";
import { resolveReportForUser } from "@/lib/report-resolve";
import { getPdfLabels } from "@/lib/i18n/translations";
import { isSupportedLanguage, DEFAULT_LANGUAGE } from "@/lib/i18n/languages";
import {
  extractReportContent,
  translateReportContent,
} from "@/lib/report-translation";
import { getUserAllowCloudTranslation } from "@/lib/translation/service";
import { logError } from "@/lib/error-logger";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let reportId: string | undefined;
  let userId: string | undefined;

  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return unauthorized();

    const payload = verifyToken(token);
    if (!payload) return unauthorized("Invalid token");

    userId = payload.userId;

    const rl = checkRateLimit("pdf-download", payload.userId, RATE_LIMITS.PDF_DOWNLOAD);
    if (!rl.allowed) return rateLimited();

    const { id } = await params;
    reportId = id;

    const resolved = await resolveReportForUser(payload.userId, id);
    if (!resolved) return notFound("Report not found");

    const report = await prisma.report.findUnique({
      where: { id: resolved.report.id, userId: payload.userId },
      include: {
        document: {
          select: { originalFilename: true, fileType: true },
        },
      },
    });

    if (!report) return notFound("Report not found");

    const langParam = req.nextUrl.searchParams.get("language");
    const pref = await prisma.userPreference.findUnique({
      where: { userId: payload.userId },
      select: { language: true },
    });
    const language =
      langParam && isSupportedLanguage(langParam)
        ? langParam
        : pref?.language && isSupportedLanguage(pref.language)
          ? pref.language
          : DEFAULT_LANGUAGE;

    const labels = getPdfLabels(language);

    let content = extractReportContent(report);

    if (language !== DEFAULT_LANGUAGE) {
      const allowCloud = await getUserAllowCloudTranslation(payload.userId);
      const translated = await translateReportContent({
        report,
        language,
        force: false,
        allowCloud,
      });
      content = translated.content;
    }

    const pdfBuffer = await generateReportPdf({
      labels,
      report: {
        id: report.id,
        createdAt: report.createdAt.toISOString(),
        healthScore: report.healthScore ?? undefined,
        summary: content.summary,
        keyFindings: content.keyFindings,
        abnormalValues: content.abnormalValues,
        foodRecommendations: content.foodRecommendations,
        exerciseRecommendations: content.exerciseRecommendations,
        lifestyleAdvice: content.lifestyleAdvice,
        riskFlags: content.riskFlags,
        chartData: content.chartData,
        contextualInsights: content.contextualInsights ?? [],
        aiModelUsed: report.aiModelUsed ?? undefined,
        processingTimeMs: report.processingTimeMs,
        document: report.document ?? {
          originalFilename: "Medical report",
          fileType: "unknown",
        },
      },
      generatedFor: "user",
    });

    await auditUserAction(req, payload.userId, payload.email, AUDIT_ACTIONS.PDF_DOWNLOADED, {
      entityType: "report",
      entityId: report.id,
      metadata: { language },
    });

    const filename = `vaidya-gpt-report-${report.id}.pdf`;
    const body = new Uint8Array(pdfBuffer);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "PDF generation failed";
    console.error("[report_pdf]", { reportId, userId, message });
    await logError({
      source: "report_pdf",
      error: err,
      userId,
      metadata: { reportId },
    });
    return fail("Could not generate PDF report.", 500, "PDF_GENERATION_FAILED");
  }
}
