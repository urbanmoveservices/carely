import prisma from "@/lib/prisma";
import { emergencyContactSchema } from "@/lib/family-schemas";
import { createSubresourceRoutes } from "@/lib/family-subresource";
import { serializeEmergencyContact } from "@/lib/family-serialize";
import { AUDIT_ACTIONS } from "@/lib/audit-log";

const { GET, POST } = createSubresourceRoutes({
  delegate: () => prisma.emergencyContact as never,
  createSchema: emergencyContactSchema,
  patchSchema: emergencyContactSchema.partial(),
  serialize: serializeEmergencyContact,
  buildCreateData: (userId, familyMemberId, data) => ({
    userId,
    familyMemberId,
    name: data.name,
    relation: data.relation ?? null,
    phone: data.phone,
    email: data.email && data.email !== "" ? data.email : null,
    notes: data.notes ?? null,
  }),
  buildUpdateData: () => ({}),
  auditAdded: AUDIT_ACTIONS.FAMILY_EMERGENCY_CONTACT_ADDED,
  auditUpdated: AUDIT_ACTIONS.FAMILY_EMERGENCY_CONTACT_UPDATED,
  auditDeleted: AUDIT_ACTIONS.FAMILY_EMERGENCY_CONTACT_DELETED,
  entityType: "emergency_contact",
});

export { GET, POST };
