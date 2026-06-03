import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, requireFamilyMember } from "@/lib/family-auth";
import { serverError } from "@/lib/api-response";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const { id } = await params;
    const check = await requireFamilyMember(auth.payload.userId, id);
    if ("error" in check) return check.error;

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "all";
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: Record<string, unknown> = {
      userId: auth.payload.userId,
      familyMemberId: id,
      value: { not: null },
    };
    if (type !== "all") where.type = type;
    if (from || to) {
      where.measuredAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    const vitals = await prisma.vitalRecord.findMany({
      where,
      orderBy: { measuredAt: "asc" },
    });

    const values = vitals.map((v) => v.value as number);
    const summary =
      values.length > 0
        ? {
            count: values.length,
            latest: values[values.length - 1],
            average: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10,
            min: Math.min(...values),
            max: Math.max(...values),
          }
        : { count: 0, latest: null, average: null, min: null, max: null };

    await auditUserAction(
      req,
      auth.payload.userId,
      auth.payload.email,
      AUDIT_ACTIONS.VITAL_TRENDS_VIEWED,
      {
        entityType: "vital_trends",
        entityId: id,
        metadata: { type, count: summary.count },
      }
    );

    return NextResponse.json({
      familyMember: {
        id: check.member.id,
        fullName: check.member.fullName,
      },
      type,
      items: vitals.map((v) => ({
        measuredAt: v.measuredAt.toISOString(),
        label: v.label,
        value: v.value,
        unit: v.unit,
      })),
      summary,
    });
  } catch (err) {
    console.error("Vital trends error:", err);
    return serverError();
  }
}
