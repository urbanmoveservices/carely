import prisma from "@/lib/prisma";
import { conditionSchema } from "@/lib/family-schemas";
import { createSubresourceRoutes } from "@/lib/family-subresource";
import { parseDateField } from "@/lib/family-schemas";
import { serializeCondition } from "@/lib/family-serialize";
import { AUDIT_ACTIONS } from "@/lib/audit-log";

const { GET, POST } = createSubresourceRoutes({
  delegate: () => prisma.healthCondition as never,
  createSchema: conditionSchema,
  patchSchema: conditionSchema.partial(),
  serialize: serializeCondition,
  buildCreateData: (userId, familyMemberId, data) => ({
    userId,
    familyMemberId,
    name: data.name,
    status: data.status,
    diagnosedOn: parseDateField(data.diagnosedOn as string | null | undefined),
    severity: data.severity ?? null,
    notes: data.notes ?? null,
  }),
  buildUpdateData: () => ({}),
  auditAdded: AUDIT_ACTIONS.FAMILY_CONDITION_ADDED,
  auditUpdated: AUDIT_ACTIONS.FAMILY_CONDITION_UPDATED,
  auditDeleted: AUDIT_ACTIONS.FAMILY_CONDITION_DELETED,
  entityType: "health_condition",
});

export { GET, POST };
