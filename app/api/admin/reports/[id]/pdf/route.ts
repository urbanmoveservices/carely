import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";
import { generateReportPdf } from "@/lib/pdf-report";
import {
  unauthorized,
  forbidden,
  notFound,
  fail,
  rateLimited,
} from "@/lib/api-response";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { auditAdminAction, AUDIT_ACTIONS } from "@/lib/audit-log";
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
    if (!payload || payload.role !== "admin") {
      return forbidden("Admin access required");
    }

    userId = payload.userId;

    const rl = checkRateLimit("admin-api", payload.userId, RATE_LIMITS.ADMIN_API);
    if (!rl.allowed) return rateLimited();

    const { id } = await params;
    reportId = id;

    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true } },
        document: {
          select: { originalFilename: true, fileType: true },
        },
      },
    });

    if (!report) return notFound("Report not found");

    const pdfBuffer = await generateReportPdf({
      report: {
        id: report.id,
        createdAt: report.createdAt.toISOString(),
        healthScore: report.healthScore ?? undefined,
        summary: report.summary,
        keyFindings: report.keyFindings,
        abnormalValues: report.abnormalValues,
        foodRecommendations: report.foodRecommendations,
        exerciseRecommendations: report.exerciseRecommendations,
        lifestyleAdvice: report.lifestyleAdvice,
        riskFlags: report.riskFlags,
        chartData: report.chartData,
        contextualInsights: report.contextualInsights ?? [],
        aiModelUsed: report.aiModelUsed ?? undefined,
        processingTimeMs: report.processingTimeMs,
        document: report.document ?? {
          originalFilename: "Medical report",
          fileType: "unknown",
        },
        user: report.user,
      },
      generatedFor: "admin",
    });

    await auditAdminAction(req, payload.userId, payload.email, AUDIT_ACTIONS.ADMIN_DOWNLOADED_REPORT, {
      entityType: "report",
      entityId: report.id,
    });

    const filename = `vaidya-gpt-admin-report-${report.id}.pdf`;
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
    console.error("[admin_report_pdf]", { reportId, userId, message });
    await logError({
      source: "admin_report_pdf",
      error: err,
      userId,
      metadata: { reportId },
    });
    return fail("Could not generate PDF report.", 500, "PDF_GENERATION_FAILED");
  }
}
