import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, requireFamilyMember } from "@/lib/family-auth";
import { notFound, serverError, validationError } from "@/lib/api-response";
import { doseLogSchema } from "@/lib/family-schemas";
import { serializeDoseLog } from "@/lib/family-serialize";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; medicationId: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const { id, medicationId } = await params;
    const check = await requireFamilyMember(auth.payload.userId, id);
    if ("error" in check) return check.error;

    const med = await prisma.medication.findFirst({
      where: { id: medicationId, userId: auth.payload.userId, familyMemberId: id },
    });
    if (!med) return notFound("Medication not found");

    const logs = await prisma.medicationDoseLog.findMany({
      where: { medicationId, userId: auth.payload.userId },
      orderBy: { scheduledAt: "desc" },
      take: 60,
    });

    return NextResponse.json(logs.map((l) => serializeDoseLog(l as Record<string, unknown>)));
  } catch (err) {
    console.error("Dose logs list error:", err);
    return serverError();
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; medicationId: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const { id, medicationId } = await params;
    const check = await requireFamilyMember(auth.payload.userId, id);
    if ("error" in check) return check.error;

    const med = await prisma.medication.findFirst({
      where: { id: medicationId, userId: auth.payload.userId, familyMemberId: id },
    });
    if (!med) return notFound("Medication not found");

    const body = await req.json();
    const parsed = doseLogSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error.issues[0]?.message || "Invalid input");

    const log = await prisma.medicationDoseLog.create({
      data: {
        userId: auth.payload.userId,
        familyMemberId: id,
        medicationId,
        scheduledAt: new Date(parsed.data.scheduledAt),
        status: parsed.data.status ?? "pending",
        notes: parsed.data.notes ?? null,
      },
    });

    return NextResponse.json(serializeDoseLog(log as Record<string, unknown>), { status: 201 });
  } catch (err) {
    console.error("Dose log create error:", err);
    return serverError();
  }
}
