import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { detectCategory, normalizeAbnormalValues } from "@/lib/report-data-normalize";
import { hasLabTrendRecordDelegate } from "@/lib/prisma-delegate-guards";

async function existsToday(
  userId: string,
  title: string,
  familyMemberId: string | null
) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return prisma.healthInsight.findFirst({
    where: {
      userId,
      title,
      familyMemberId,
      createdAt: { gte: start },
    },
  });
}

async function addInsight(
  userId: string,
  data: {
    familyMemberId?: string | null;
    type: string;
    title: string;
    message: string;
    severity?: string;
    metadata?: Record<string, unknown>;
  }
) {
  if (await existsToday(userId, data.title, data.familyMemberId ?? null)) return 0;
  await prisma.healthInsight.create({
    data: {
      userId,
      familyMemberId: data.familyMemberId ?? null,
      type: data.type,
      title: data.title,
      message: data.message,
      severity: data.severity ?? "info",
      metadata: data.metadata
        ? (data.metadata as Prisma.InputJsonValue)
        : undefined,
    },
  });
  return 1;
}

export async function createInsightsFromReport(params: {
  userId: string;
  documentId: string;
  reportId: string;
  familyMemberId?: string | null;
  report: {
    summary: string;
    abnormalValues: unknown;
    originalFilename?: string;
  };
  healthRiskCount: number;
  trendCount: number;
}): Promise<number> {
  let count = 0;

  count += await addInsight(params.userId, {
    familyMemberId: params.familyMemberId,
    type: "report",
    title: "New AI report is ready",
    message: `An AI summary was generated for ${params.report.originalFilename || "your report"}. Review findings and suggested next steps.`,
    severity: "info",
    metadata: { reportId: params.reportId, documentId: params.documentId },
  });

  const abnormal = normalizeAbnormalValues(params.report.abnormalValues);
  for (const a of abnormal.slice(0, 5)) {
    const cat = detectCategory(`${a.name} ${a.value}`);
    count += await addInsight(params.userId, {
      familyMemberId: params.familyMemberId,
      type: cat,
      title: `${a.name} may need attention`,
      message: `Your report includes ${a.name} (${a.value}). Based on uploaded data—not a final diagnosis. Discuss with your doctor.`,
      severity: a.severity === "critical" ? "critical" : a.severity === "high" ? "warning" : "info",
      metadata: { reportId: params.reportId, marker: a.name },
    });
  }

  if (params.healthRiskCount > 0) {
    count += await addInsight(params.userId, {
      familyMemberId: params.familyMemberId,
      type: "risk",
      title: "Health risks updated from report",
      message: `${params.healthRiskCount} health risk card(s) were created from your latest report. View them on the Health Risk Dashboard.`,
      severity: "warning",
      metadata: { reportId: params.reportId, count: params.healthRiskCount },
    });
  }

  if (abnormal.length > 0) {
    count += await addInsight(params.userId, {
      familyMemberId: params.familyMemberId,
      type: "followup",
      title: "Doctor follow-up may be useful",
      message:
        "Your report contains values that may need medical review. Consider scheduling a follow-up with your doctor.",
      severity: "info",
      metadata: { reportId: params.reportId },
    });
  }

  if (params.familyMemberId) {
    const reportCount = await prisma.report.count({
      where: {
        userId: params.userId,
        document: { familyMemberId: params.familyMemberId },
      },
    });
    if (reportCount >= 2) {
      count += await addInsight(params.userId, {
        familyMemberId: params.familyMemberId,
        type: "comparison",
        title: "Compare this report with previous reports",
        message:
          "You can now compare this report with previous reports to spot trends over time.",
        severity: "info",
        metadata: { reportId: params.reportId },
      });
    }

    if (hasLabTrendRecordDelegate()) {
    for (const key of ["fasting_blood_sugar", "hemoglobin", "vitamin_d", "total_cholesterol"]) {
      const trends = await prisma.labTrendRecord.findMany({
        where: {
          userId: params.userId,
          familyMemberId: params.familyMemberId,
          markerKey: key,
          status: { in: ["high", "low"] },
        },
        orderBy: { measuredAt: "desc" },
        take: 3,
      });
      if (trends.length >= 2) {
        count += await addInsight(params.userId, {
          familyMemberId: params.familyMemberId,
          type: "trend",
          title: `${trends[0].markerName} trend across reports`,
          message: `This marker appeared outside typical range in multiple reports. Review trends with your doctor—not a final diagnosis.`,
          severity: "warning",
          metadata: { markerKey: key, reportId: params.reportId },
        });
        break;
      }
    }
    }
  }

  return count;
}
