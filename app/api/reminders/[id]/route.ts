import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/family-auth";
import { reminderPatchSchema, parseScheduledAt } from "@/lib/reminder-schemas";
import { serializeReminder, reminderIncludeMember } from "@/lib/reminder-serialize";
import { getReminderIfOwned, validateFamilyMemberForUser } from "@/lib/reminder-auth";
import { validationError, serverError } from "@/lib/api-response";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const { id } = await params;
    const result = await getReminderIfOwned(auth.payload.userId, id);
    if ("error" in result) return result.error;
    return NextResponse.json(serializeReminder(result.reminder));
  } catch (err) {
    console.error("Reminder get error:", err);
    return serverError();
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const { id } = await params;
    const result = await getReminderIfOwned(auth.payload.userId, id);
    if ("error" in result) return result.error;

    const body = await req.json();
    const parsed = reminderPatchSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0]?.message || "Invalid input");
    }

    if (parsed.data.familyMemberId !== undefined) {
      const check = await validateFamilyMemberForUser(
        auth.payload.userId,
        parsed.data.familyMemberId
      );
      if (check !== true) return check;
    }

    const data: Record<string, unknown> = {};
    const d = parsed.data;
    if (d.familyMemberId !== undefined) data.familyMemberId = d.familyMemberId || null;
    if (d.type !== undefined) data.type = d.type;
    if (d.title !== undefined) data.title = d.title.trim();
    if (d.description !== undefined) data.description = d.description;
    if (d.scheduledAt !== undefined) {
      const at = parseScheduledAt(d.scheduledAt);
      if (!at) return validationError("Valid scheduled date/time is required");
      data.scheduledAt = at;
    }
    if (d.repeatType !== undefined) data.repeatType = d.repeatType;
    if (d.relatedMedicationId !== undefined)
      data.relatedMedicationId = d.relatedMedicationId;
    if (d.relatedAppointmentId !== undefined)
      data.relatedAppointmentId = d.relatedAppointmentId;

    const updated = await prisma.reminder.update({
      where: { id },
      data,
      include: reminderIncludeMember,
    });

    await auditUserAction(req, auth.payload.userId, auth.payload.email, AUDIT_ACTIONS.REMINDER_UPDATED, {
      entityType: "reminder",
      entityId: id,
      metadata: { type: updated.type, familyMemberId: updated.familyMemberId },
    });

    return NextResponse.json(serializeReminder(updated));
  } catch (err) {
    console.error("Reminder update error:", err);
    return serverError();
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const { id } = await params;
    const result = await getReminderIfOwned(auth.payload.userId, id);
    if ("error" in result) return result.error;

    await prisma.reminder.delete({ where: { id } });

    await auditUserAction(req, auth.payload.userId, auth.payload.email, AUDIT_ACTIONS.REMINDER_DELETED, {
      entityType: "reminder",
      entityId: id,
      metadata: { type: result.reminder.type },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Reminder delete error:", err);
    return serverError();
  }
}
