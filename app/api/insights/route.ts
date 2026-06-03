import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/family-auth";
import { serverError } from "@/lib/api-response";

function serializeInsight(i: {
  id: string;
  familyMemberId: string | null;
  type: string;
  title: string;
  message: string;
  severity: string;
  isRead: boolean;
  createdAt: Date;
  familyMember?: { id: string; fullName: string; relation: string } | null;
}) {
  return {
    id: i.id,
    familyMemberId: i.familyMemberId,
    familyMember: i.familyMember
      ? { id: i.familyMember.id, fullName: i.familyMember.fullName, relation: i.familyMember.relation }
      : null,
    type: i.type,
    title: i.title,
    message: i.message,
    severity: i.severity,
    isRead: i.isRead,
    createdAt: i.createdAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(req.url);
    const familyMemberId = searchParams.get("familyMemberId");
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const type = searchParams.get("type");

    const where: Record<string, unknown> = { userId: auth.payload.userId };
    if (familyMemberId) where.familyMemberId = familyMemberId;
    if (unreadOnly) where.isRead = false;
    if (type) where.type = type;

    const items = await prisma.healthInsight.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        familyMember: { select: { id: true, fullName: true, relation: true } },
      },
    });

    const [total, unread, warnings, critical] = await Promise.all([
      prisma.healthInsight.count({ where: { userId: auth.payload.userId } }),
      prisma.healthInsight.count({
        where: { userId: auth.payload.userId, isRead: false },
      }),
      prisma.healthInsight.count({
        where: { userId: auth.payload.userId, severity: "warning" },
      }),
      prisma.healthInsight.count({
        where: { userId: auth.payload.userId, severity: "critical" },
      }),
    ]);

    return NextResponse.json({
      items: items.map(serializeInsight),
      stats: { total, unread, warnings, critical },
    });
  } catch (err) {
    console.error("Insights list error:", err);
    return serverError();
  }
}
