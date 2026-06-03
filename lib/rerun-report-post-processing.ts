import prisma from "@/lib/prisma";
import {
  loadReportPostProcessingContext,
  runReportPostProcessing,
  type PostProcessingResult,
} from "@/lib/report-post-processing";

export async function rerunPostProcessingForReport(
  userId: string,
  reportId: string
): Promise<PostProcessingResult | null> {
  const report = await prisma.report.findFirst({
    where: { id: reportId, userId },
    include: {
      document: {
        select: {
          id: true,
          originalFilename: true,
          createdAt: true,
          familyMemberId: true,
          uploadStatus: true,
        },
      },
    },
  });

  if (!report?.document) return null;
  if (report.document.uploadStatus !== "ai_completed") return null;

  const context = await loadReportPostProcessingContext(userId, report.documentId);

  return runReportPostProcessing({
    userId,
    documentId: report.documentId,
    reportId: report.id,
    familyMemberId: report.document.familyMemberId,
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
      id: report.document.id,
      originalFilename: report.document.originalFilename,
      createdAt: report.document.createdAt,
    },
    context,
  });
}
