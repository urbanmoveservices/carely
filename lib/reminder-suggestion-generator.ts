import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { detectCategory, normalizeAbnormalValues } from "@/lib/report-data-normalize";
import {
  hasHealthRiskDelegate,
  hasReminderSuggestionDelegate,
  warnMissingDelegate,
} from "@/lib/prisma-delegate-guards";

export async function createReminderSuggestionsFromReport(params: {
  userId: string;
  documentId: string;
  reportId: string;
  familyMemberId?: string | null;
  report: { abnormalValues: unknown; riskFlags: unknown };
  healthRiskCount: number;
}): Promise<number> {
  if (!hasReminderSuggestionDelegate()) {
    warnMissingDelegate("reminderSuggestion");
    return 0;
  }

  await prisma.reminderSuggestion.deleteMany({
    where: { reportId: params.reportId, userId: params.userId, status: "pending" },
  });

  const abnormal = normalizeAbnormalValues(params.report.abnormalValues);
  const suggestions: Array<{
    type: string;
    title: string;
    message: string;
    suggestedDate: Date | null;
    metadata?: Prisma.InputJsonValue;
  }> = [];

  const in14 = new Date();
  in14.setDate(in14.getDate() + 14);

  if (abnormal.length > 0 || params.healthRiskCount > 0) {
    suggestions.push({
      type: "doctor_followup",
      title: "Schedule doctor follow-up",
      message:
        "Your report has values that may need review. Consider booking a follow-up with your doctor.",
      suggestedDate: in14,
    });
  }

  const hasCritical = params.healthRiskCount > 0;
  if (hasCritical && hasHealthRiskDelegate()) {
    const criticalCount = await prisma.healthRisk.count({
      where: { reportId: params.reportId, level: "critical", status: "active" },
    });
    if (criticalCount > 0) {
      suggestions.push({
        type: "doctor_followup",
        title: "Discuss urgent findings with doctor",
        message:
          "Some report-based risk cards are marked critical. Prompt discussion with a qualified doctor is recommended.",
        suggestedDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      });
    }
  }

  for (const a of abnormal) {
    const cat = detectCategory(`${a.name} ${a.value}`);
    if (cat === "sugar") {
      suggestions.push({
        type: "repeat_test",
        title: "Repeat sugar or HbA1c discussion",
        message:
          "Blood sugar related values were noted. Ask your doctor if repeat testing or monitoring is needed.",
        suggestedDate: in14,
        metadata: { marker: a.name },
      });
      break;
    }
    if (cat === "cholesterol") {
      suggestions.push({
        type: "repeat_test",
        title: "Lipid follow-up suggestion",
        message:
          "Cholesterol or lipid values may need follow-up. Discuss lipid panel timing with your doctor.",
        suggestedDate: in14,
      });
      break;
    }
    if (cat === "vitamin") {
      suggestions.push({
        type: "lifestyle_check",
        title: "Vitamin level follow-up",
        message:
          "Vitamin or mineral markers were noted. Discuss supplementation or diet with your doctor.",
        suggestedDate: in14,
      });
      break;
    }
  }

  if (suggestions.length === 0 && abnormal.length === 0) {
    suggestions.push({
      type: "lifestyle_check",
      title: "Routine health check-in",
      message: "Keep your report handy for your next routine health visit.",
      suggestedDate: in14,
    });
  }

  let count = 0;
  for (const s of suggestions) {
    await prisma.reminderSuggestion.create({
      data: {
        userId: params.userId,
        familyMemberId: params.familyMemberId ?? null,
        documentId: params.documentId,
        reportId: params.reportId,
        type: s.type,
        title: s.title,
        message: s.message,
        suggestedDate: s.suggestedDate,
        status: "pending",
        metadata: s.metadata,
      },
    });
    count += 1;
  }

  return count;
}
