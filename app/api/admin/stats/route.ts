import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";
import { ok, unauthorized, forbidden, serverError, rateLimited } from "@/lib/api-response";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { auditAdminAction, AUDIT_ACTIONS } from "@/lib/audit-log";
import {
  hasAppNotificationDelegate,
  hasHealthRiskDelegate,
  hasReminderSuggestionDelegate,
} from "@/lib/prisma-delegate-guards";

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return unauthorized();

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") return forbidden("Admin access required");

    const rl = checkRateLimit("admin-api", payload.userId, RATE_LIMITS.ADMIN_API);
    if (!rl.allowed) return rateLimited();

    const [
      totalUsers,
      totalDocuments,
      totalReports,
      completedReports,
      textExtractedDocuments,
      processingDocuments,
      failedDocuments,
      totalReminders,
      pendingReminders,
      doneReminders,
      totalFamilyMembers,
      totalInsights,
      reportsThisMonth,
      activeHealthRisks,
      criticalHealthRisks,
      warningHealthRisks,
      pendingReminderSuggestions,
      totalNotifications,
      totalChatThreads,
      totalChatMessages,
      failedChatCalls,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.document.count(),
      prisma.report.count(),
      prisma.report.count(),
      prisma.document.count({ where: { uploadStatus: "text_extracted" } }),
      prisma.document.count({
        where: { uploadStatus: { in: ["processing", "uploaded"] } },
      }),
      prisma.document.count({ where: { uploadStatus: "failed" } }),
      prisma.reminder.count(),
      prisma.reminder.count({ where: { status: "pending" } }),
      prisma.reminder.count({ where: { status: "done" } }),
      prisma.familyMember.count(),
      prisma.healthInsight.count(),
      prisma.report.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      hasHealthRiskDelegate()
        ? prisma.healthRisk.count({ where: { status: "active" } })
        : Promise.resolve(0),
      hasHealthRiskDelegate()
        ? prisma.healthRisk.count({ where: { status: "active", level: "critical" } })
        : Promise.resolve(0),
      hasHealthRiskDelegate()
        ? prisma.healthRisk.count({ where: { status: "active", level: "warning" } })
        : Promise.resolve(0),
      hasReminderSuggestionDelegate()
        ? prisma.reminderSuggestion.count({ where: { status: "pending" } })
        : Promise.resolve(0),
      hasAppNotificationDelegate()
        ? prisma.appNotification.count()
        : Promise.resolve(0),
      prisma.chatThread.count().catch(() => 0),
      prisma.chatMessage.count().catch(() => 0),
      prisma.errorLog
        .count({
          where: {
            source: "chat",
            createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        })
        .catch(() => 0),
    ]);

    const recentUsers = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        _count: { select: { documents: true, reports: true } },
      },
    });

    const recentDocuments = await prisma.document.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        user: { select: { id: true, name: true, email: true } },
        report: { select: { id: true } },
      },
    });

    await auditAdminAction(req, payload.userId, payload.email, AUDIT_ACTIONS.ADMIN_VIEWED_DASHBOARD);

    return ok({
      totalUsers,
      totalDocuments,
      totalReports,
      completedReports,
      textExtractedDocuments,
      processingDocuments,
      failedDocuments,
      totalReminders,
      pendingReminders,
      doneReminders,
      totalFamilyMembers,
      totalInsights,
      reportsThisMonth,
      activeHealthRisks,
      criticalHealthRisks,
      warningHealthRisks,
      pendingReminderSuggestions,
      totalNotifications,
      totalChatThreads,
      totalChatMessages,
      failedChatCallsLast30Days: failedChatCalls,
      recentUsers: recentUsers.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        lastLoginAt: u.lastLoginAt?.toISOString() || null,
        createdAt: u.createdAt.toISOString(),
        documentCount: u._count.documents,
        reportCount: u._count.reports,
      })),
      recentDocuments: recentDocuments.map((d) => ({
        id: d.id,
        originalFilename: d.originalFilename,
        fileType: d.fileType,
        fileSize: d.fileSize,
        uploadStatus: d.uploadStatus,
        errorMessage: d.errorMessage,
        createdAt: d.createdAt.toISOString(),
        user: d.user,
        reportId: d.report?.id || null,
      })),
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    return serverError();
  }
}
