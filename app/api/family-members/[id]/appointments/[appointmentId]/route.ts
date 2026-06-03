import prisma from "@/lib/prisma";
import { appointmentPatchSchema, parseDateField } from "@/lib/family-schemas";
import { createSubresourceItemRoutes } from "@/lib/family-subresource";
import { serializeAppointment } from "@/lib/family-serialize";
import { AUDIT_ACTIONS } from "@/lib/audit-log";

const { PATCH, DELETE } = createSubresourceItemRoutes({
  delegate: () => prisma.appointment as never,
  idParam: "appointmentId",
  patchSchema: appointmentPatchSchema,
  serialize: serializeAppointment,
  buildUpdateData: (data) => {
    const u: Record<string, unknown> = {};
    if (data.title !== undefined) u.title = data.title;
    if (data.doctorName !== undefined) u.doctorName = data.doctorName;
    if (data.hospitalName !== undefined) u.hospitalName = data.hospitalName;
    if (data.appointmentAt !== undefined) {
      const at = parseDateField(data.appointmentAt);
      if (at) u.appointmentAt = at;
    }
    if (data.status !== undefined) u.status = data.status;
    if (data.notes !== undefined) u.notes = data.notes;
    return u;
  },
  auditUpdated: AUDIT_ACTIONS.FAMILY_APPOINTMENT_UPDATED,
  auditDeleted: AUDIT_ACTIONS.FAMILY_APPOINTMENT_DELETED,
  entityType: "appointment",
});

export { PATCH, DELETE };
