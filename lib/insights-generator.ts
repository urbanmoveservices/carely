import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

const SUGAR_TYPES = ["sugar", "blood_sugar", "glucose"];

async function existsToday(
  userId: string,
  title: string,
  familyMemberId: string | null
) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const existing = await prisma.healthInsight.findFirst({
    where: {
      userId,
      title,
      familyMemberId: familyMemberId ?? null,
      createdAt: { gte: start },
    },
  });
  return !!existing;
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
  if (await existsToday(userId, data.title, data.familyMemberId ?? null)) return;
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
}

export async function generateHealthInsights(userId: string, familyMemberId?: string) {
  const memberWhere = familyMemberId ? { id: familyMemberId, userId } : { userId };
  const members = await prisma.familyMember.findMany({ where: memberWhere });

  const pendingReports = await prisma.document.count({
    where: {
      userId,
      uploadStatus: "text_extracted",
      ...(familyMemberId ? { familyMemberId } : {}),
    },
  });
  if (pendingReports > 0) {
    await addInsight(userId, {
      type: "report",
      title: "Reports awaiting AI summary",
      message: `You have ${pendingReports} report${pendingReports > 1 ? "s" : ""} ready for AI diagnosis and treatment summary.`,
      severity: "info",
      metadata: { count: pendingReports },
    });
  }

  for (const member of members) {
    const upcomingAppts = await prisma.appointment.count({
      where: {
        userId,
        familyMemberId: member.id,
        status: "upcoming",
        appointmentAt: { gte: new Date() },
      },
    });
    if (upcomingAppts >= 2) {
      await addInsight(userId, {
        familyMemberId: member.id,
        type: "general",
        title: "Upcoming appointments",
        message: `${member.fullName} has ${upcomingAppts} upcoming appointments. Consider reviewing preparation notes in the app.`,
        severity: "info",
        metadata: { count: upcomingAppts },
      });
    }

    const skippedReminders = await prisma.reminder.count({
      where: {
        userId,
        familyMemberId: member.id,
        status: "skipped",
        updatedAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
      },
    });
    if (skippedReminders >= 2) {
      await addInsight(userId, {
        familyMemberId: member.id,
        type: "reminder",
        title: "Skipped reminders",
        message: `Several health reminders were skipped recently for ${member.fullName}. You may want to review your reminder schedule.`,
        severity: "warning",
        metadata: { count: skippedReminders },
      });
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentVitals = await prisma.vitalRecord.count({
      where: {
        userId,
        familyMemberId: member.id,
        measuredAt: { gte: thirtyDaysAgo },
      },
    });
    if (recentVitals === 0) {
      const hasActiveMeds = await prisma.medication.count({
        where: { userId, familyMemberId: member.id, status: "active" },
      });
      if (hasActiveMeds > 0 || (await prisma.healthCondition.count({
        where: { userId, familyMemberId: member.id, status: "active" },
      })) > 0) {
        await addInsight(userId, {
          familyMemberId: member.id,
          type: "trend",
          title: "No recent vitals",
          message: `No vitals recorded in the last 30 days for ${member.fullName}. Logging vitals helps you track trends over time (informational only).`,
          severity: "info",
        });
      }
    }

    const vitals = await prisma.vitalRecord.findMany({
      where: {
        userId,
        familyMemberId: member.id,
        value: { not: null },
        OR: [
          { type: { in: SUGAR_TYPES } },
          { label: { contains: "sugar", mode: "insensitive" } },
          { label: { contains: "glucose", mode: "insensitive" } },
        ],
      },
      orderBy: { measuredAt: "desc" },
      take: 10,
    });
    const highReadings = vitals.filter((v) => (v.value ?? 0) >= 140);
    if (highReadings.length >= 2) {
      await addInsight(userId, {
        familyMemberId: member.id,
        type: "trend",
        title: "Multiple higher sugar readings",
        message: `${member.fullName} has multiple higher blood sugar readings logged. Review trends with your clinician—this app does not diagnose.`,
        severity: "warning",
        metadata: { count: highReadings.length },
      });
    }

    const activeMeds = await prisma.medication.count({
      where: { userId, familyMemberId: member.id, status: "active" },
    });
    const upcomingFollowUp = await prisma.appointment.count({
      where: {
        userId,
        familyMemberId: member.id,
        status: "upcoming",
        appointmentAt: { gte: new Date() },
      },
    });
    if (activeMeds > 0 && upcomingFollowUp === 0) {
      await addInsight(userId, {
        familyMemberId: member.id,
        type: "medication",
        title: "Active medications, no upcoming visit",
        message: `${member.fullName} has active medications but no upcoming appointment logged. Consider scheduling a follow-up if appropriate.`,
        severity: "info",
      });
    }
  }

  const count = await prisma.healthInsight.count({
    where: {
      userId,
      ...(familyMemberId ? { familyMemberId } : {}),
      createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    },
  });
  return { generated: count };
}
