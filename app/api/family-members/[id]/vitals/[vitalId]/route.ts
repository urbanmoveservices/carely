import prisma from "@/lib/prisma";
import { vitalPatchSchema, parseDateField } from "@/lib/family-schemas";
import { createSubresourceItemRoutes } from "@/lib/family-subresource";
import { serializeVital } from "@/lib/family-serialize";
import { AUDIT_ACTIONS } from "@/lib/audit-log";

const { PATCH, DELETE } = createSubresourceItemRoutes({
  delegate: () => prisma.vitalRecord as never,
  idParam: "vitalId",
  patchSchema: vitalPatchSchema,
  serialize: serializeVital,
  buildUpdateData: (data) => {
    const u: Record<string, unknown> = {};
    if (data.type !== undefined) u.type = data.type;
    if (data.label !== undefined) u.label = data.label;
    if (data.value !== undefined) u.value = data.value;
    if (data.valueText !== undefined) u.valueText = data.valueText;
    if (data.unit !== undefined) u.unit = data.unit;
    if (data.measuredAt !== undefined)
      u.measuredAt =
        parseDateField(data.measuredAt as string | null | undefined) || new Date();
    if (data.notes !== undefined) u.notes = data.notes;
    return u;
  },
  auditUpdated: AUDIT_ACTIONS.FAMILY_VITAL_UPDATED,
  auditDeleted: AUDIT_ACTIONS.FAMILY_VITAL_DELETED,
  entityType: "vital_record",
});

export { PATCH, DELETE };
