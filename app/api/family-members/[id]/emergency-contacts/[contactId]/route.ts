import prisma from "@/lib/prisma";
import { emergencyContactPatchSchema } from "@/lib/family-schemas";
import { createSubresourceItemRoutes } from "@/lib/family-subresource";
import { serializeEmergencyContact } from "@/lib/family-serialize";
import { AUDIT_ACTIONS } from "@/lib/audit-log";

const { PATCH, DELETE } = createSubresourceItemRoutes({
  delegate: () => prisma.emergencyContact as never,
  idParam: "contactId",
  patchSchema: emergencyContactPatchSchema,
  serialize: serializeEmergencyContact,
  buildUpdateData: (data) => {
    const u: Record<string, unknown> = {};
    if (data.name !== undefined) u.name = data.name;
    if (data.relation !== undefined) u.relation = data.relation;
    if (data.phone !== undefined) u.phone = data.phone;
    if (data.email !== undefined)
      u.email = data.email && data.email !== "" ? data.email : null;
    if (data.notes !== undefined) u.notes = data.notes;
    return u;
  },
  auditUpdated: AUDIT_ACTIONS.FAMILY_EMERGENCY_CONTACT_UPDATED,
  auditDeleted: AUDIT_ACTIONS.FAMILY_EMERGENCY_CONTACT_DELETED,
  entityType: "emergency_contact",
});

export { PATCH, DELETE };
