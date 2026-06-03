import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  hasFamilyTimelineEventDelegate,
  warnMissingDelegate,
} from "@/lib/prisma-delegate-guards";

export async function createReportTimelineEvents(params: {
  userId: string;
  documentId: string;
  reportId: string;
  familyMemberId?: string | null;
  originalFilename: string;
  healthRiskCount: number;
  trendCount: number;
}): Promise<number> {
  if (!hasFamilyTimelineEventDelegate()) {
    warnMissingDelegate("familyTimelineEvent");
    return 0;
  }

  let count = 0;

  const base = {
    userId: params.userId,
    familyMemberId: params.familyMemberId ?? null,
    documentId: params.documentId,
    reportId: params.reportId,
    occurredAt: new Date(),
  };

  await prisma.familyTimelineEvent.create({
    data: {
      ...base,
      type: "ai_summary_generated",
      title: "AI summary generated",
      description: `Report summary generated for ${params.originalFilename}.`,
      metadata: { reportId: params.reportId } as Prisma.InputJsonValue,
    },
  });
  count += 1;

  if (params.healthRiskCount > 0) {
    await prisma.familyTimelineEvent.create({
      data: {
        ...base,
        type: "risk_detected",
        title: "Health risks updated",
        description: `${params.healthRiskCount} health risk card(s) were created from this report.`,
        metadata: { count: params.healthRiskCount } as Prisma.InputJsonValue,
      },
    });
    count += 1;
  }

  if (params.trendCount > 0) {
    await prisma.familyTimelineEvent.create({
      data: {
        ...base,
        type: "lab_trends_extracted",
        title: "Lab trends extracted",
        description: `${params.trendCount} lab marker(s) saved for trend tracking.`,
        metadata: { count: params.trendCount } as Prisma.InputJsonValue,
      },
    });
    count += 1;
  }

  return count;
}
