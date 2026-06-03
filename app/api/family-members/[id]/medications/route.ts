import prisma from "@/lib/prisma";
import { medicationSchema, parseDateField } from "@/lib/family-schemas";
import { createSubresourceRoutes } from "@/lib/family-subresource";
import { serializeMedication } from "@/lib/family-serialize";
import { AUDIT_ACTIONS } from "@/lib/audit-log";

const { GET, POST } = createSubresourceRoutes({
  delegate: () => prisma.medication as never,
  createSchema: medicationSchema,
  patchSchema: medicationSchema.partial(),
  serialize: serializeMedication,
  buildCreateData: (userId, familyMemberId, data) => ({
    userId,
    familyMemberId,
    name: data.name,
    dosage: data.dosage ?? null,
    frequency: data.frequency ?? null,
    instructions: data.instructions ?? null,
    startDate: parseDateField(data.startDate as string | null | undefined),
    endDate: parseDateField(data.endDate as string | null | undefined),
    refillDate: parseDateField(data.refillDate as string | null | undefined),
    status: data.status,
    prescribedBy: data.prescribedBy ?? null,
    notes: data.notes ?? null,
    reminderEnabled: data.reminderEnabled ?? false,
    reminderTimes: data.reminderTimes ?? undefined,
  }),
  buildUpdateData: () => ({}),
  auditAdded: AUDIT_ACTIONS.FAMILY_MEDICATION_ADDED,
  auditUpdated: AUDIT_ACTIONS.FAMILY_MEDICATION_UPDATED,
  auditDeleted: AUDIT_ACTIONS.FAMILY_MEDICATION_DELETED,
  entityType: "medication",
});

export { GET, POST };
