import type { Reminder, FamilyMember } from "@prisma/client";

type ReminderRow = Reminder & {
  familyMember?: Pick<FamilyMember, "id" | "fullName" | "relation"> | null;
};

export function serializeReminder(r: ReminderRow) {
  return {
    id: r.id,
    familyMemberId: r.familyMemberId,
    familyMember: r.familyMember
      ? {
          id: r.familyMember.id,
          fullName: r.familyMember.fullName,
          relation: r.familyMember.relation,
        }
      : null,
    type: r.type,
    title: r.title,
    description: r.description,
    scheduledAt: r.scheduledAt.toISOString(),
    repeatType: r.repeatType,
    status: r.status,
    relatedMedicationId: r.relatedMedicationId,
    relatedAppointmentId: r.relatedAppointmentId,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export const reminderIncludeMember = {
  familyMember: { select: { id: true, fullName: true, relation: true } },
} as const;
