import prisma from "@/lib/prisma";
import { appointmentSchema, parseDateField } from "@/lib/family-schemas";
import { createSubresourceRoutes } from "@/lib/family-subresource";
import { serializeAppointment } from "@/lib/family-serialize";
import { AUDIT_ACTIONS } from "@/lib/audit-log";
import { validationError } from "@/lib/api-response";

const { GET, POST: basePost } = createSubresourceRoutes({
  delegate: () => prisma.appointment as never,
  createSchema: appointmentSchema,
  patchSchema: appointmentSchema.partial(),
  serialize: serializeAppointment,
  buildCreateData: (userId, familyMemberId, data) => {
    const at = parseDateField(data.appointmentAt);
    if (!at) throw new Error("Invalid appointment date");
    return {
      userId,
      familyMemberId,
      title: data.title,
      doctorName: data.doctorName ?? null,
      hospitalName: data.hospitalName ?? null,
      appointmentAt: at,
      status: data.status,
      notes: data.notes ?? null,
    };
  },
  buildUpdateData: () => ({}),
  auditAdded: AUDIT_ACTIONS.FAMILY_APPOINTMENT_ADDED,
  auditUpdated: AUDIT_ACTIONS.FAMILY_APPOINTMENT_UPDATED,
  auditDeleted: AUDIT_ACTIONS.FAMILY_APPOINTMENT_DELETED,
  entityType: "appointment",
});

async function POST(
  req: Parameters<typeof basePost>[0],
  ctx: Parameters<typeof basePost>[1]
) {
  try {
    return await basePost(req, ctx);
  } catch (err) {
    if (err instanceof Error && err.message.includes("appointment date")) {
      return validationError("Valid appointment date is required");
    }
    throw err;
  }
}

export { GET, POST };
