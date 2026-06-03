import prisma from "@/lib/prisma";
import { extractAndSaveHealthRisks } from "@/lib/health-risk-extractor";
import { extractAndSaveLabTrends } from "@/lib/lab-trend-extractor";
import { createInsightsFromReport } from "@/lib/report-insights-from-report";
import { createReportTimelineEvents } from "@/lib/report-timeline-events";
import { createReminderSuggestionsFromReport } from "@/lib/reminder-suggestion-generator";
import { createReportNotifications } from "@/lib/app-notifications";
import {
  highestRiskLevel,
  updateFamilyMemberAfterReport,
} from "@/lib/family-profile-post-report";
import { isPostProcessingSchemaReady, getStaleClientWarning } from "@/lib/prisma-delegate-guards";
import type { ParsedLabValue } from "@/lib/lab-value-parser";

export type PostProcessingResult = {
  healthRisksCreated: number;
  insightsCreated: number;
  timelineEventsCreated: number;
  trendRecordsCreated: number;
  reminderSuggestionsCreated: number;
  notificationsCreated: number;
};

export async function runReportPostProcessing(params: {
  userId: string;
  documentId: string;
  reportId: string;
  familyMemberId?: string | null;
  report: {
    id: string;
    summary: string;
    keyFindings: unknown;
    abnormalValues: unknown;
    riskFlags: unknown;
    chartData: unknown;
    contextualInsights?: unknown;
    healthScore?: number | null;
    createdAt: Date;
  };
  document: {
    id: string;
    originalFilename: string;
    createdAt: Date;
  };
  context?: Record<string, unknown> | null;
  structuredLabValues?: ParsedLabValue[];
}): Promise<PostProcessingResult> {
  if (!isPostProcessingSchemaReady()) {
    const warning = getStaleClientWarning();
    if (warning) console.warn("[post-processing]", warning);
    return {
      healthRisksCreated: 0,
      insightsCreated: 0,
      timelineEventsCreated: 0,
      trendRecordsCreated: 0,
      reminderSuggestionsCreated: 0,
      notificationsCreated: 0,
    };
  }

  const result: PostProcessingResult = {
    healthRisksCreated: 0,
    insightsCreated: 0,
    timelineEventsCreated: 0,
    trendRecordsCreated: 0,
    reminderSuggestionsCreated: 0,
    notificationsCreated: 0,
  };

  let risks: { level: string }[] = [];

  try {
    risks = await extractAndSaveHealthRisks({
      userId: params.userId,
      documentId: params.documentId,
      reportId: params.reportId,
      familyMemberId: params.familyMemberId,
      report: params.report,
      context: params.context,
      structuredLabValues: params.structuredLabValues,
    });
    result.healthRisksCreated = risks.length;
  } catch (err) {
    console.error("[post-processing] health risks failed:", params.reportId, err);
  }

  try {
    const trends = await extractAndSaveLabTrends({
      userId: params.userId,
      documentId: params.documentId,
      reportId: params.reportId,
      familyMemberId: params.familyMemberId,
      report: params.report,
      document: params.document,
    });
    result.trendRecordsCreated = trends.length;
  } catch (err) {
    console.error("[post-processing] lab trends failed:", params.reportId, err);
  }

  try {
    result.insightsCreated = await createInsightsFromReport({
      userId: params.userId,
      documentId: params.documentId,
      reportId: params.reportId,
      familyMemberId: params.familyMemberId,
      report: {
        summary: params.report.summary,
        abnormalValues: params.report.abnormalValues,
        originalFilename: params.document.originalFilename,
      },
      healthRiskCount: result.healthRisksCreated,
      trendCount: result.trendRecordsCreated,
    });
  } catch (err) {
    console.error("[post-processing] insights failed:", params.reportId, err);
  }

  try {
    result.timelineEventsCreated = await createReportTimelineEvents({
      userId: params.userId,
      documentId: params.documentId,
      reportId: params.reportId,
      familyMemberId: params.familyMemberId,
      originalFilename: params.document.originalFilename,
      healthRiskCount: result.healthRisksCreated,
      trendCount: result.trendRecordsCreated,
    });
  } catch (err) {
    console.error("[post-processing] timeline failed:", params.reportId, err);
  }

  try {
    result.reminderSuggestionsCreated = await createReminderSuggestionsFromReport({
      userId: params.userId,
      documentId: params.documentId,
      reportId: params.reportId,
      familyMemberId: params.familyMemberId,
      report: params.report,
      healthRiskCount: result.healthRisksCreated,
    });
  } catch (err) {
    console.error("[post-processing] reminder suggestions failed:", params.reportId, err);
  }

  try {
    const notifs = await createReportNotifications({
      userId: params.userId,
      reportId: params.reportId,
      healthRiskCount: result.healthRisksCreated,
      suggestionCount: result.reminderSuggestionsCreated,
    });
    result.notificationsCreated = notifs.length;
  } catch (err) {
    console.error("[post-processing] notifications failed:", params.reportId, err);
  }

  try {
    await updateFamilyMemberAfterReport({
      familyMemberId: params.familyMemberId,
      healthScore: params.report.healthScore,
      reportCreatedAt: params.report.createdAt,
      highestRiskLevel: highestRiskLevel(risks.map((r) => r.level)),
    });
  } catch (err) {
    console.error("[post-processing] family profile failed:", params.reportId, err);
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("[post-processing] completed", {
      reportId: params.reportId,
      documentId: params.documentId,
      ...result,
    });
  }

  return result;
}

export async function loadReportPostProcessingContext(
  userId: string,
  documentId: string
) {
  const ctx = await prisma.reportContext.findUnique({
    where: { documentId },
  });
  if (!ctx || ctx.userId !== userId) return null;
  return {
    questionnaire: {
      smokingStatus: ctx.smokingStatus,
      alcoholUse: ctx.alcoholUse,
      physicalActivity: ctx.physicalActivity,
      sugarIntake: ctx.sugarIntake,
      fastingStatus: ctx.fastingStatus,
    },
  };
}
