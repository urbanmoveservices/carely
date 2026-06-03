import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { hasAppNotificationDelegate, warnMissingDelegate } from "@/lib/prisma-delegate-guards";

export async function createReportNotifications(params: {
  userId: string;
  reportId: string;
  healthRiskCount: number;
  suggestionCount: number;
}) {
  if (!hasAppNotificationDelegate()) {
    warnMissingDelegate("appNotification");
    return [];
  }

  const created = [];

  const summaryNotif = await prisma.appNotification.create({
    data: {
      userId: params.userId,
      type: "ai_summary_ready",
      title: "AI Summary Ready",
      message: "Your AI medical report summary is ready to view.",
      href: `/reports/${params.reportId}`,
      metadata: { reportId: params.reportId } as Prisma.InputJsonValue,
    },
  });
  created.push(summaryNotif);

  if (params.healthRiskCount > 0) {
    const riskNotif = await prisma.appNotification.create({
      data: {
        userId: params.userId,
        type: "health_risks_updated",
        title: "Health Risks Updated",
        message: `${params.healthRiskCount} health risk card(s) were added from your latest report.`,
        href: "/health-risks",
        metadata: {
          reportId: params.reportId,
          count: params.healthRiskCount,
        } as Prisma.InputJsonValue,
      },
    });
    created.push(riskNotif);
  }

  if (params.suggestionCount > 0) {
    const sugNotif = await prisma.appNotification.create({
      data: {
        userId: params.userId,
        type: "followup_suggestions",
        title: "Suggested Follow-ups Available",
        message: "Review suggested next steps based on your latest report.",
        href: `/reports/${params.reportId}`,
        metadata: { reportId: params.reportId } as Prisma.InputJsonValue,
      },
    });
    created.push(sugNotif);
  }

  return created;
}

export async function getUnreadNotificationCount(userId: string) {
  if (!hasAppNotificationDelegate()) return 0;
  return prisma.appNotification.count({
    where: { userId, isRead: false },
  });
}
