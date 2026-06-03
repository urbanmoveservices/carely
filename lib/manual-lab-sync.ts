import type { ManualLabValue } from "@prisma/client";
import prisma from "@/lib/prisma";
import { extractAndSaveLabTrends } from "@/lib/lab-trend-extractor";
import { extractAndSaveHealthRisks } from "@/lib/health-risk-extractor";

export async function syncManualLabValuesToPipeline(params: {
  userId: string;
  documentId?: string | null;
  reportId?: string | null;
  familyMemberId?: string | null;
}) {
  const report = params.reportId
    ? await prisma.report.findUnique({
        where: { id: params.reportId },
        include: { document: true },
      })
    : params.documentId
      ? await prisma.report.findUnique({
          where: { documentId: params.documentId },
          include: { document: true },
        })
      : null;

  if (!report) return { synced: false, count: 0 };

  const manualValues = await prisma.manualLabValue.findMany({
    where: {
      userId: params.userId,
      OR: [{ reportId: report.id }, { documentId: report.documentId }],
    },
  });

  if (manualValues.length === 0) return { synced: false, count: 0 };

  const abnormalValues = manualValues.map((v: ManualLabValue) => ({
    name: v.testName,
    value: v.valueText || String(v.value ?? ""),
    normalRange: v.normalText || "",
    severity:
      (v.status as "low" | "moderate" | "high" | "critical" | "unknown") ||
      "unknown",
    meaning: v.notes || "Manual correction",
  }));

  const chartData = manualValues.map((v: ManualLabValue) => ({
    label: v.testName,
    value: v.value ?? 0,
    normalMin: v.normalMin ?? undefined,
    normalMax: v.normalMax ?? undefined,
    unit: v.unit ?? undefined,
  }));

  const reportPayload = {
    ...report,
    abnormalValues,
    chartData,
    keyFindings: report.keyFindings,
    riskFlags: report.riskFlags,
  };

  await extractAndSaveLabTrends({
    userId: params.userId,
    documentId: report.documentId,
    reportId: report.id,
    familyMemberId:
      params.familyMemberId ?? report.document.familyMemberId ?? null,
    report: reportPayload,
    document: { createdAt: report.document.createdAt },
  });

  await extractAndSaveHealthRisks({
    userId: params.userId,
    documentId: report.documentId,
    reportId: report.id,
    familyMemberId:
      params.familyMemberId ?? report.document.familyMemberId ?? null,
    report: reportPayload,
  });

  return { synced: true, count: manualValues.length };
}
