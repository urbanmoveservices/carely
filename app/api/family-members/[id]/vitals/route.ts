import prisma from "@/lib/prisma";
import { vitalSchema, parseDateField } from "@/lib/family-schemas";
import { createSubresourceRoutes } from "@/lib/family-subresource";
import { serializeVital } from "@/lib/family-serialize";
import { AUDIT_ACTIONS } from "@/lib/audit-log";

const { GET, POST } = createSubresourceRoutes({
  delegate: () => prisma.vitalRecord as never,
  createSchema: vitalSchema,
  patchSchema: vitalSchema.partial(),
  serialize: serializeVital,
  buildCreateData: (userId, familyMemberId, data) => ({
    userId,
    familyMemberId,
    type: data.type,
    label: data.label,
    value: data.value ?? null,
    valueText: data.valueText ?? null,
    unit: data.unit ?? null,
    measuredAt:
      parseDateField(data.measuredAt as string | null | undefined) || new Date(),
    notes: data.notes ?? null,
  }),
  buildUpdateData: () => ({}),
  auditAdded: AUDIT_ACTIONS.FAMILY_VITAL_ADDED,
  auditUpdated: AUDIT_ACTIONS.FAMILY_VITAL_UPDATED,
  auditDeleted: AUDIT_ACTIONS.FAMILY_VITAL_DELETED,
  entityType: "vital_record",
});

export { GET, POST };
