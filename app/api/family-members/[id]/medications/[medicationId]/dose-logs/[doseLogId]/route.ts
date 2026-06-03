import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, requireFamilyMember } from "@/lib/family-auth";
import { notFound, serverError, validationError } from "@/lib/api-response";
import { doseLogPatchSchema } from "@/lib/family-schemas";
import { serializeDoseLog } from "@/lib/family-serialize";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; medicationId: string; doseLogId: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const { id, medicationId, doseLogId } = await params;
    const check = await requireFamilyMember(auth.payload.userId, id);
    if ("error" in check) return check.error;

    const existing = await prisma.medicationDoseLog.findFirst({
      where: {
        id: doseLogId,
        medicationId,
        userId: auth.payload.userId,
        familyMemberId: id,
      },
    });
    if (!existing) return notFound("Dose log not found");

    const body = await req.json();
    const parsed = doseLogPatchSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error.issues[0]?.message || "Invalid input");

    const takenAt = parsed.data.status === "taken" ? new Date() : null;
    const log = await prisma.medicationDoseLog.update({
      where: { id: doseLogId },
      data: {
        status: parsed.data.status,
        takenAt,
        notes: parsed.data.notes ?? existing.notes,
      },
    });

    const medUpdate: Record<string, unknown> = {};
    if (parsed.data.status === "taken") {
      medUpdate.lastTakenAt = new Date();
    } else if (parsed.data.status === "missed") {
      await prisma.medication.update({
        where: { id: medicationId },
        data: { missedDoseCount: { increment: 1 } },
      });
    }

    if (parsed.data.status === "taken" && Object.keys(medUpdate).length) {
      await prisma.medication.update({
        where: { id: medicationId },
        data: medUpdate,
      });
    }

    const auditAction =
      parsed.data.status === "taken"
        ? AUDIT_ACTIONS.MEDICATION_DOSE_TAKEN
        : parsed.data.status === "missed"
          ? AUDIT_ACTIONS.MEDICATION_DOSE_MISSED
          : AUDIT_ACTIONS.MEDICATION_DOSE_SKIPPED;

    await auditUserAction(req, auth.payload.userId, auth.payload.email, auditAction, {
      entityType: "medication_dose_log",
      entityId: doseLogId,
      metadata: { medicationId, familyMemberId: id },
    });

    return NextResponse.json(serializeDoseLog(log as Record<string, unknown>));
  } catch (err) {
    console.error("Dose log update error:", err);
    return serverError();
  }
}
