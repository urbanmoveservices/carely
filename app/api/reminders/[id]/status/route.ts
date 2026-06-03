import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/family-auth";
import { reminderStatusSchema } from "@/lib/reminder-schemas";
import { serializeReminder, reminderIncludeMember } from "@/lib/reminder-serialize";
import { getReminderIfOwned } from "@/lib/reminder-auth";
import { validationError, serverError } from "@/lib/api-response";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";

const STATUS_ACTIONS: Record<string, string> = {
  done: AUDIT_ACTIONS.REMINDER_MARKED_DONE,
  skipped: AUDIT_ACTIONS.REMINDER_MARKED_SKIPPED,
  cancelled: AUDIT_ACTIONS.REMINDER_CANCELLED,
};

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
    const parsed = reminderStatusSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0]?.message || "Invalid status");
    }

    const updated = await prisma.reminder.update({
      where: { id },
      data: { status: parsed.data.status },
      include: reminderIncludeMember,
    });

    const action = STATUS_ACTIONS[parsed.data.status] || AUDIT_ACTIONS.REMINDER_UPDATED;
    await auditUserAction(req, auth.payload.userId, auth.payload.email, action, {
      entityType: "reminder",
      entityId: id,
      metadata: { status: parsed.data.status, type: updated.type },
    });

    // Repeating reminders: spawn next occurrence when marked done
    if (parsed.data.status === "done" && updated.repeatType !== "none") {
      const next = new Date(updated.scheduledAt);
      if (updated.repeatType === "daily") next.setDate(next.getDate() + 1);
      else if (updated.repeatType === "weekly") next.setDate(next.getDate() + 7);
      else if (updated.repeatType === "monthly") next.setMonth(next.getMonth() + 1);

      if (next.getTime() > Date.now()) {
        await prisma.reminder.create({
          data: {
            userId: updated.userId,
            familyMemberId: updated.familyMemberId,
            type: updated.type,
            title: updated.title,
            description: updated.description,
            scheduledAt: next,
            repeatType: updated.repeatType,
            status: "pending",
            relatedMedicationId: updated.relatedMedicationId,
            relatedAppointmentId: updated.relatedAppointmentId,
          },
        });
      }
    }

    return NextResponse.json(serializeReminder(updated));
  } catch (err) {
    console.error("Reminder status error:", err);
    return serverError();
  }
}
