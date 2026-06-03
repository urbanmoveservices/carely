import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, requireFamilyMember } from "@/lib/family-auth";
import { hasLabTrendRecordDelegate, warnMissingDelegate } from "@/lib/prisma-delegate-guards";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const memberCheck = await requireFamilyMember(auth.payload.userId, id);
  if ("error" in memberCheck) return memberCheck.error;

  if (!hasLabTrendRecordDelegate()) {
    warnMissingDelegate("labTrendRecord");
    return NextResponse.json({ items: [] });
  }

  const trends = await prisma.labTrendRecord.findMany({
    where: { userId: auth.payload.userId, familyMemberId: id },
    orderBy: [{ markerKey: "asc" }, { measuredAt: "desc" }],
    take: 100,
  });

  return NextResponse.json({
    items: trends.map((t) => ({
      id: t.id,
      markerName: t.markerName,
      markerKey: t.markerKey,
      value: t.value,
      unit: t.unit,
      normalMin: t.normalMin,
      normalMax: t.normalMax,
      status: t.status,
      measuredAt: t.measuredAt?.toISOString() || null,
      reportId: t.reportId,
    })),
  });
}
