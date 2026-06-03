import prisma from "@/lib/prisma";
import { conditionPatchSchema } from "@/lib/family-schemas";
import { parseDateField } from "@/lib/family-schemas";
import { createSubresourceItemRoutes } from "@/lib/family-subresource";
import { serializeCondition } from "@/lib/family-serialize";
import { AUDIT_ACTIONS } from "@/lib/audit-log";

const { PATCH, DELETE } = createSubresourceItemRoutes({
  delegate: () => prisma.healthCondition as never,
  idParam: "conditionId",
  patchSchema: conditionPatchSchema,
  serialize: serializeCondition,
  buildUpdateData: (data) => {
    const u: Record<string, unknown> = {};
    if (data.name !== undefined) u.name = data.name;
    if (data.status !== undefined) u.status = data.status;
    if (data.diagnosedOn !== undefined)
      u.diagnosedOn = parseDateField(data.diagnosedOn as string | null | undefined);
    if (data.severity !== undefined) u.severity = data.severity;
    if (data.notes !== undefined) u.notes = data.notes;
    return u;
  },
  auditUpdated: AUDIT_ACTIONS.FAMILY_CONDITION_UPDATED,
  auditDeleted: AUDIT_ACTIONS.FAMILY_CONDITION_DELETED,
  entityType: "health_condition",
});

export { PATCH, DELETE };
