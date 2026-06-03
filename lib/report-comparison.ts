import prisma from "@/lib/prisma";
import { hasHealthRiskDelegate, hasLabTrendRecordDelegate } from "@/lib/prisma-delegate-guards";

interface AbnormalEntry {
  name: string;
  value: string;
  severity?: string;
  reportId: string;
  reportDate: string;
}

export async function buildReportComparison(userId: string, familyMemberId: string) {
  const member = await prisma.familyMember.findFirst({
    where: { id: familyMemberId, userId },
  });
  if (!member) return null;

  const documents = await prisma.document.findMany({
    where: {
      userId,
      familyMemberId,
      uploadStatus: "ai_completed",
      report: { isNot: null },
    },
    orderBy: { createdAt: "asc" },
    include: { report: true },
  });

  const reports = documents
    .filter((d) => d.report)
    .map((d) => ({
      id: d.report!.id,
      documentId: d.id,
      originalFilename: d.originalFilename,
      summary: d.report!.summary,
      keyFindings: d.report!.keyFindings as Array<{
        title?: string;
        value?: string;
        status?: string;
      }>,
      abnormalValues: d.report!.abnormalValues as Array<{
        name?: string;
        value?: string;
        severity?: string;
        normalRange?: string;
      }>,
      chartData: d.report!.chartData as Array<{
        label?: string;
        value?: number;
        unit?: string;
      }>,
      healthScore: d.report!.healthScore,
      createdAt: d.report!.createdAt.toISOString(),
    }));

  const abnormalMap = new Map<
    string,
    { name: string; entries: AbnormalEntry[] }
  >();

  for (const r of reports) {
    const list = Array.isArray(r.abnormalValues) ? r.abnormalValues : [];
    for (const av of list) {
      const name = av.name || "Unknown";
      if (!abnormalMap.has(name)) {
        abnormalMap.set(name, { name, entries: [] });
      }
      abnormalMap.get(name)!.entries.push({
        name,
        value: av.value || "",
        severity: av.severity,
        reportId: r.id,
        reportDate: r.createdAt,
      });
    }
  }

  const commonFindings = new Map<string, number>();
  for (const r of reports) {
    const kf = Array.isArray(r.keyFindings) ? r.keyFindings : [];
    for (const f of kf) {
      const key = f.title || "Finding";
      commonFindings.set(key, (commonFindings.get(key) || 0) + 1);
    }
  }

  const chartPoints: { label: string; value: number; unit?: string; date: string }[] =
    [];
  for (const r of reports) {
    const charts = Array.isArray(r.chartData) ? r.chartData : [];
    for (const c of charts) {
      if (c.label && typeof c.value === "number") {
        chartPoints.push({
          label: c.label,
          value: c.value,
          unit: c.unit,
          date: r.createdAt,
        });
      }
    }
  }

  const labTrends = hasLabTrendRecordDelegate()
    ? await prisma.labTrendRecord.findMany({
        where: { userId, familyMemberId },
        orderBy: [{ markerKey: "asc" }, { measuredAt: "asc" }],
      })
    : [];

  const trendByMarker = new Map<
    string,
    { markerName: string; markerKey: string; points: { value: number | null; unit: string | null; status: string | null; measuredAt: string | null; reportId: string | null }[] }
  >();
  for (const t of labTrends) {
    if (!trendByMarker.has(t.markerKey)) {
      trendByMarker.set(t.markerKey, {
        markerName: t.markerName,
        markerKey: t.markerKey,
        points: [],
      });
    }
    trendByMarker.get(t.markerKey)!.points.push({
      value: t.value,
      unit: t.unit,
      status: t.status,
      measuredAt: t.measuredAt?.toISOString() || null,
      reportId: t.reportId,
    });
  }

  const riskHistory = hasHealthRiskDelegate()
    ? await prisma.healthRisk.findMany({
        where: { userId, familyMemberId, reportId: { not: null } },
        select: { reportId: true, category: true, level: true, title: true, detectedAt: true },
        orderBy: { detectedAt: "desc" },
      })
    : [];

  return {
    familyMember: {
      id: member.id,
      fullName: member.fullName,
      relation: member.relation,
    },
    reports,
    commonFindings: [...commonFindings.entries()]
      .filter(([, count]) => count >= 2)
      .map(([title, count]) => ({ title, count })),
    abnormalHistory: [...abnormalMap.values()],
    chartData: chartPoints,
    labTrends: [...trendByMarker.values()],
    riskHistory,
  };
}
