import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";
import { ok, unauthorized, forbidden, notFound, serverError, rateLimited } from "@/lib/api-response";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { auditAdminAction, AUDIT_ACTIONS } from "@/lib/audit-log";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return unauthorized();

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") return forbidden("Admin access required");

    const rl = checkRateLimit("admin-api", payload.userId, RATE_LIMITS.ADMIN_API);
    if (!rl.allowed) return rateLimited();

    const { id } = await params;

    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        document: {
          select: {
            id: true,
            originalFilename: true,
            fileType: true,
            fileSize: true,
            uploadStatus: true,
            createdAt: true,
          },
        },
        manualLabValues: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!report) return notFound("Report not found");

    await auditAdminAction(req, payload.userId, payload.email, AUDIT_ACTIONS.ADMIN_VIEWED_REPORT, {
      entityType: "report",
      entityId: id,
    });

    return ok({
      id: report.id,
      summary: report.summary,
      keyFindings: report.keyFindings,
      abnormalValues: report.abnormalValues,
      foodRecommendations: report.foodRecommendations,
      exerciseRecommendations: report.exerciseRecommendations,
      lifestyleAdvice: report.lifestyleAdvice,
      riskFlags: report.riskFlags,
      chartData: report.chartData,
      healthScore: report.healthScore,
      scoreFactors: report.scoreFactors,
      valueParserVersion: report.valueParserVersion,
      summaryValidationStatus: report.summaryValidationStatus,
      repairedAt: report.repairedAt?.toISOString() ?? null,
      usesStructuredValues: report.usesStructuredValues,
      parsedLabValues: report.manualLabValues,
      aiModelUsed: report.aiModelUsed,
      processingTimeMs: report.processingTimeMs,
      createdAt: report.createdAt.toISOString(),
      user: report.user,
      document: {
        id: report.document.id,
        originalFilename: report.document.originalFilename,
        fileType: report.document.fileType,
        fileSize: report.document.fileSize,
        uploadStatus: report.document.uploadStatus,
        createdAt: report.document.createdAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("Admin report detail error:", err);
    return serverError();
  }
}
