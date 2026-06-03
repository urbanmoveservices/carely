import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, requireFamilyMember } from "@/lib/family-auth";
import { familyMemberPatchSchema, parseDateField } from "@/lib/family-schemas";
import {
  serializeFamilyMember,
  familyMemberIncludeCounts,
} from "@/lib/family-serialize";
import { validationError, serverError } from "@/lib/api-response";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";

function normalizePatch(data: {
  email?: string | null;
  profilePhotoUrl?: string | null;
}) {
  const u: Record<string, unknown> = {};
  if (data.email !== undefined)
    u.email = data.email && data.email !== "" ? data.email : null;
  if (data.profilePhotoUrl !== undefined)
    u.profilePhotoUrl =
      data.profilePhotoUrl && data.profilePhotoUrl !== ""
        ? data.profilePhotoUrl
        : null;
  return u;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const { id } = await params;
    const check = await requireFamilyMember(auth.payload.userId, id);
    if ("error" in check) return check.error;

    const member = await prisma.familyMember.findUnique({
      where: { id },
      include: {
        ...familyMemberIncludeCounts(),
        documents: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { report: { select: { id: true } } },
        },
        conditions: { orderBy: { createdAt: "desc" }, take: 20 },
        allergies: { orderBy: { createdAt: "desc" }, take: 20 },
        medications: { orderBy: { createdAt: "desc" }, take: 20 },
        vitals: { orderBy: { measuredAt: "desc" }, take: 10 },
        appointments: { orderBy: { appointmentAt: "asc" }, take: 20 },
        emergencyContacts: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!member) return check.error;

    const base = serializeFamilyMember(member);
    return NextResponse.json({
      ...base,
      documents: member.documents.map((d) => ({
        id: d.id,
        original_filename: d.originalFilename,
        file_type: d.fileType,
        file_size: d.fileSize,
        upload_status: d.uploadStatus,
        created_at: d.createdAt.toISOString(),
        report_id: d.report?.id || null,
      })),
      conditions: member.conditions.map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        severity: c.severity,
        diagnosedOn: c.diagnosedOn?.toISOString().split("T")[0] || null,
      })),
      allergies: member.allergies.map((a) => ({
        id: a.id,
        name: a.name,
        severity: a.severity,
        reaction: a.reaction,
      })),
      medications: member.medications.map((m) => ({
        id: m.id,
        name: m.name,
        dosage: m.dosage,
        status: m.status,
        startDate: m.startDate?.toISOString().split("T")[0] || null,
      })),
      vitals: member.vitals.map((v) => ({
        id: v.id,
        type: v.type,
        label: v.label,
        value: v.value,
        valueText: v.valueText,
        unit: v.unit,
        measuredAt: v.measuredAt.toISOString(),
      })),
      appointments: member.appointments.map((a) => ({
        id: a.id,
        title: a.title,
        doctorName: a.doctorName,
        hospitalName: a.hospitalName,
        appointmentAt: a.appointmentAt.toISOString(),
        status: a.status,
      })),
      emergencyContacts: member.emergencyContacts.map((c) => ({
        id: c.id,
        name: c.name,
        relation: c.relation,
        phone: c.phone,
        email: c.email,
      })),
    });
  } catch (err) {
    console.error("Family member detail error:", err);
    return serverError();
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const { id } = await params;
    const check = await requireFamilyMember(auth.payload.userId, id);
    if ("error" in check) return check.error;

    const body = await req.json();
    const parsed = familyMemberPatchSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0]?.message || "Invalid input");
    }

    const data: Record<string, unknown> = { ...normalizePatch(parsed.data) };
    const d = parsed.data;
    if (d.fullName !== undefined) data.fullName = d.fullName.trim();
    if (d.relation !== undefined) data.relation = d.relation;
    if (d.dateOfBirth !== undefined)
      data.dateOfBirth = parseDateField(d.dateOfBirth as string | null | undefined);
    if (d.gender !== undefined) data.gender = d.gender;
    if (d.bloodGroup !== undefined) data.bloodGroup = d.bloodGroup;
    if (d.phone !== undefined) data.phone = d.phone;
    if (d.notes !== undefined) data.notes = d.notes;
    if (d.heightCm !== undefined) data.heightCm = d.heightCm;
    if (d.weightKg !== undefined) data.weightKg = d.weightKg;

    const updated = await prisma.familyMember.update({
      where: { id },
      data,
      include: familyMemberIncludeCounts(),
    });

    await auditUserAction(
      req,
      auth.payload.userId,
      auth.payload.email,
      AUDIT_ACTIONS.FAMILY_MEMBER_UPDATED,
      {
        entityType: "family_member",
        entityId: id,
        metadata: { relation: updated.relation },
      }
    );

    return NextResponse.json(serializeFamilyMember(updated));
  } catch (err) {
    console.error("Family member update error:", err);
    return serverError();
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const { id } = await params;
    const check = await requireFamilyMember(auth.payload.userId, id);
    if ("error" in check) return check.error;

    await prisma.familyMember.delete({ where: { id } });

    await auditUserAction(
      req,
      auth.payload.userId,
      auth.payload.email,
      AUDIT_ACTIONS.FAMILY_MEMBER_DELETED,
      { entityType: "family_member", entityId: id }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Family member delete error:", err);
    return serverError();
  }
}
