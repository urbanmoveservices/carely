import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/family-auth";
import { serverError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const accessList = await prisma.caregiverAccess.findMany({
      where: { caregiverUserId: auth.payload.userId },
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    const owners = await Promise.all(
      accessList.map(async (access) => {
        const familyMembers = access.canViewFamily
          ? await prisma.familyMember.findMany({
              where: { userId: access.ownerUserId },
              select: {
                id: true,
                fullName: true,
                relation: true,
                bloodGroup: true,
              },
            })
          : [];

        const reports = access.canViewReports
          ? await prisma.report.findMany({
              where: { userId: access.ownerUserId },
              orderBy: { createdAt: "desc" },
              take: 20,
              select: {
                id: true,
                summary: true,
                healthScore: true,
                createdAt: true,
                document: {
                  select: {
                    originalFilename: true,
                    familyMember: { select: { fullName: true, relation: true } },
                  },
                },
              },
            })
          : [];

        const reminders = access.canManageReminders
          ? await prisma.reminder.findMany({
              where: { userId: access.ownerUserId, status: "pending" },
              orderBy: { scheduledAt: "asc" },
              take: 10,
              select: {
                id: true,
                title: true,
                scheduledAt: true,
                type: true,
                familyMember: { select: { fullName: true } },
              },
            })
          : [];

        return {
          accessId: access.id,
          owner: access.owner,
          permissions: {
            canViewReports: access.canViewReports,
            canViewFamily: access.canViewFamily,
            canAddNotes: access.canAddNotes,
            canManageReminders: access.canManageReminders,
            role: access.role,
          },
          familyMembers,
          reports: reports.map((r) => ({
            id: r.id,
            summary: r.summary.slice(0, 200),
            healthScore: r.healthScore,
            createdAt: r.createdAt.toISOString(),
            originalFilename: r.document.originalFilename,
            familyMember: r.document.familyMember,
          })),
          reminders: reminders.map((r) => ({
            id: r.id,
            title: r.title,
            scheduledAt: r.scheduledAt.toISOString(),
            type: r.type,
            familyMemberName: r.familyMember?.fullName ?? null,
          })),
        };
      })
    );

    return NextResponse.json({ owners });
  } catch (err) {
    console.error("Caregiver shared-with-me error:", err);
    return serverError();
  }
}
