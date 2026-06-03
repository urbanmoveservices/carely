import prisma from "@/lib/prisma";
import { medicationPatchSchema, parseDateField } from "@/lib/family-schemas";
import { createSubresourceItemRoutes } from "@/lib/family-subresource";
import { serializeMedication } from "@/lib/family-serialize";
import { AUDIT_ACTIONS } from "@/lib/audit-log";

const { PATCH, DELETE } = createSubresourceItemRoutes({
  delegate: () => prisma.medication as never,
  idParam: "medicationId",
  patchSchema: medicationPatchSchema,
  serialize: serializeMedication,
  buildUpdateData: (data) => {
    const u: Record<string, unknown> = {};
    if (data.name !== undefined) u.name = data.name;
    if (data.dosage !== undefined) u.dosage = data.dosage;
    if (data.frequency !== undefined) u.frequency = data.frequency;
    if (data.instructions !== undefined) u.instructions = data.instructions;
    if (data.refillDate !== undefined)
      u.refillDate = parseDateField(data.refillDate as string | null | undefined);
    if (data.reminderEnabled !== undefined) u.reminderEnabled = data.reminderEnabled;
    if (data.reminderTimes !== undefined) u.reminderTimes = data.reminderTimes;
    if (data.startDate !== undefined)
      u.startDate = parseDateField(data.startDate as string | null | undefined);
    if (data.endDate !== undefined)
      u.endDate = parseDateField(data.endDate as string | null | undefined);
    if (data.status !== undefined) u.status = data.status;
    if (data.prescribedBy !== undefined) u.prescribedBy = data.prescribedBy;
    if (data.notes !== undefined) u.notes = data.notes;
    return u;
  },
  auditUpdated: AUDIT_ACTIONS.FAMILY_MEDICATION_UPDATED,
  auditDeleted: AUDIT_ACTIONS.FAMILY_MEDICATION_DELETED,
  entityType: "medication",
});

export { PATCH, DELETE };
