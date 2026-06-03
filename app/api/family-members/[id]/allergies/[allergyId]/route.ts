import prisma from "@/lib/prisma";
import { allergyPatchSchema } from "@/lib/family-schemas";
import { createSubresourceItemRoutes } from "@/lib/family-subresource";
import { serializeAllergy } from "@/lib/family-serialize";
import { AUDIT_ACTIONS } from "@/lib/audit-log";

const { PATCH, DELETE } = createSubresourceItemRoutes({
  delegate: () => prisma.allergy as never,
  idParam: "allergyId",
  patchSchema: allergyPatchSchema,
  serialize: serializeAllergy,
  buildUpdateData: (data) => {
    const u: Record<string, unknown> = {};
    if (data.name !== undefined) u.name = data.name;
    if (data.reaction !== undefined) u.reaction = data.reaction;
    if (data.severity !== undefined) u.severity = data.severity;
    if (data.notes !== undefined) u.notes = data.notes;
    return u;
  },
  auditUpdated: AUDIT_ACTIONS.FAMILY_ALLERGY_UPDATED,
  auditDeleted: AUDIT_ACTIONS.FAMILY_ALLERGY_DELETED,
  entityType: "allergy",
});

export { PATCH, DELETE };
