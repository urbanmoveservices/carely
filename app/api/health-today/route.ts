import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/family-auth";
import { serializeReminder, reminderIncludeMember } from "@/lib/reminder-serialize";
import { startOfToday, endOfToday } from "@/lib/reminder-helpers";
import { serverError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const userId = auth.payload.userId;
    const todayStart = startOfToday();
    const todayEnd = endOfToday();
    const now = new Date();

    const [
      todayReminders,
      pendingCount,
      completedTodayCount,
      upcomingAppointments,
      activeMedications,
      recentVitals,
      pendingReports,
      upcomingApptCount,
    ] = await Promise.all([
      prisma.reminder.findMany({
        where: {
          userId,
          status: "pending",
          scheduledAt: { gte: todayStart, lte: todayEnd },
        },
        orderBy: { scheduledAt: "asc" },
        take: 20,
        include: reminderIncludeMember,
      }),
      prisma.reminder.count({
        where: { userId, status: "pending", scheduledAt: { lte: todayEnd } },
      }),
      prisma.reminder.count({
        where: {
          userId,
          status: "done",
          updatedAt: { gte: todayStart, lte: todayEnd },
        },
      }),
      prisma.appointment.findMany({
        where: {
          userId,
          status: "upcoming",
          appointmentAt: { gte: now },
        },
        orderBy: { appointmentAt: "asc" },
        take: 5,
        include: {
          familyMember: { select: { id: true, fullName: true, relation: true } },
        },
      }),
      prisma.medication.findMany({
        where: { userId, status: "active" },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          familyMember: { select: { id: true, fullName: true, relation: true } },
        },
      }),
      prisma.vitalRecord.findMany({
        where: { userId },
        orderBy: { measuredAt: "desc" },
        take: 3,
        include: {
          familyMember: { select: { id: true, fullName: true, relation: true } },
        },
      }),
      prisma.document.findMany({
        where: { userId, uploadStatus: "text_extracted" },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          familyMember: { select: { id: true, fullName: true, relation: true } },
        },
      }),
      prisma.appointment.count({
        where: {
          userId,
          status: "upcoming",
          appointmentAt: { gte: todayStart, lte: todayEnd },
        },
      }),
    ]);

    return NextResponse.json({
      todayReminders: todayReminders.map(serializeReminder),
      upcomingAppointments: upcomingAppointments.map((a) => ({
        id: a.id,
        title: a.title,
        appointmentAt: a.appointmentAt.toISOString(),
        doctorName: a.doctorName,
        hospitalName: a.hospitalName,
        familyMember: a.familyMember
          ? {
              id: a.familyMember.id,
              fullName: a.familyMember.fullName,
              relation: a.familyMember.relation,
            }
          : null,
      })),
      activeMedications: activeMedications.map((m) => ({
        id: m.id,
        name: m.name,
        dosage: m.dosage,
        familyMember: m.familyMember
          ? {
              id: m.familyMember.id,
              fullName: m.familyMember.fullName,
              relation: m.familyMember.relation,
            }
          : null,
      })),
      recentVitals: recentVitals.map((v) => ({
        id: v.id,
        label: v.label,
        value: v.value,
        valueText: v.valueText,
        unit: v.unit,
        measuredAt: v.measuredAt.toISOString(),
        familyMember: v.familyMember
          ? {
              id: v.familyMember.id,
              fullName: v.familyMember.fullName,
              relation: v.familyMember.relation,
            }
          : null,
      })),
      pendingReports: pendingReports.map((d) => ({
        id: d.id,
        original_filename: d.originalFilename,
        created_at: d.createdAt.toISOString(),
        family_member: d.familyMember
          ? {
              id: d.familyMember.id,
              fullName: d.familyMember.fullName,
              relation: d.familyMember.relation,
            }
          : null,
      })),
      stats: {
        pendingReminders: pendingCount,
        completedToday: completedTodayCount,
        upcomingAppointments: upcomingApptCount,
        reportsAwaitingSummary: pendingReports.length,
      },
    });
  } catch (err) {
    console.error("Health today error:", err);
    return serverError();
  }
}
