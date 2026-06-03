import prisma from "@/lib/prisma";
import { allergySchema } from "@/lib/family-schemas";
import { createSubresourceRoutes } from "@/lib/family-subresource";
import { serializeAllergy } from "@/lib/family-serialize";
import { AUDIT_ACTIONS } from "@/lib/audit-log";

const { GET, POST } = createSubresourceRoutes({
  delegate: () => prisma.allergy as never,
  createSchema: allergySchema,
  patchSchema: allergySchema.partial(),
  serialize: serializeAllergy,
  buildCreateData: (userId, familyMemberId, data) => ({
    userId,
    familyMemberId,
    name: data.name,
    reaction: data.reaction ?? null,
    severity: data.severity ?? null,
    notes: data.notes ?? null,
  }),
  buildUpdateData: () => ({}),
  auditAdded: AUDIT_ACTIONS.FAMILY_ALLERGY_ADDED,
  auditUpdated: AUDIT_ACTIONS.FAMILY_ALLERGY_UPDATED,
  auditDeleted: AUDIT_ACTIONS.FAMILY_ALLERGY_DELETED,
  entityType: "allergy",
});

export { GET, POST };
