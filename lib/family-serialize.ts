import type { FamilyMember } from "@prisma/client";

type MemberWithCounts = FamilyMember & {
  _count?: {
    documents?: number;
    conditions?: number;
    allergies?: number;
    medications?: number;
    vitals?: number;
    appointments?: number;
    emergencyContacts?: number;
  };
};

export function serializeFamilyMember(m: MemberWithCounts) {
  return {
    id: m.id,
    fullName: m.fullName,
    relation: m.relation,
    dateOfBirth: m.dateOfBirth?.toISOString().split("T")[0] || null,
    gender: m.gender,
    bloodGroup: m.bloodGroup,
    phone: m.phone,
    email: m.email,
    profilePhotoUrl: m.profilePhotoUrl,
    notes: m.notes,
    heightCm: m.heightCm,
    weightKg: m.weightKg,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
    documentCount: m._count?.documents ?? 0,
    conditionCount: m._count?.conditions ?? 0,
    allergyCount: m._count?.allergies ?? 0,
    medicationCount: m._count?.medications ?? 0,
    vitalCount: m._count?.vitals ?? 0,
    appointmentCount: m._count?.appointments ?? 0,
    emergencyContactCount: m._count?.emergencyContacts ?? 0,
    lastReportAt: m.lastReportAt?.toISOString() || null,
    lastAiSummaryAt: m.lastAiSummaryAt?.toISOString() || null,
    lastRiskLevel: m.lastRiskLevel ?? null,
    healthScoreLatest: m.healthScoreLatest ?? null,
  };
}

export function familyMemberIncludeCounts() {
  return {
    _count: {
      select: {
        documents: true,
        conditions: true,
        allergies: true,
        medications: true,
        vitals: true,
        appointments: true,
        emergencyContacts: true,
      },
    },
  } as const;
}

function iso(d: Date | null | undefined) {
  return d ? d.toISOString() : null;
}

function isoDate(d: Date | null | undefined) {
  return d ? d.toISOString().split("T")[0] : null;
}

export function serializeCondition(c: Record<string, unknown>) {
  return {
    id: c.id,
    name: c.name,
    status: c.status,
    diagnosedOn: isoDate(c.diagnosedOn as Date | null),
    severity: c.severity,
    notes: c.notes,
    createdAt: iso(c.createdAt as Date),
    updatedAt: iso(c.updatedAt as Date),
  };
}

export function serializeAllergy(a: Record<string, unknown>) {
  return {
    id: a.id,
    name: a.name,
    reaction: a.reaction,
    severity: a.severity,
    notes: a.notes,
    createdAt: iso(a.createdAt as Date),
    updatedAt: iso(a.updatedAt as Date),
  };
}

export function serializeMedication(m: Record<string, unknown>) {
  return {
    id: m.id,
    name: m.name,
    dosage: m.dosage,
    frequency: m.frequency,
    instructions: m.instructions,
    startDate: isoDate(m.startDate as Date | null),
    endDate: isoDate(m.endDate as Date | null),
    refillDate: isoDate(m.refillDate as Date | null),
    status: m.status,
    prescribedBy: m.prescribedBy,
    notes: m.notes,
    reminderEnabled: m.reminderEnabled ?? false,
    reminderTimes: m.reminderTimes ?? null,
    missedDoseCount: m.missedDoseCount ?? 0,
    lastTakenAt: iso(m.lastTakenAt as Date | null),
    createdAt: iso(m.createdAt as Date),
    updatedAt: iso(m.updatedAt as Date),
  };
}

export function serializeDoseLog(d: Record<string, unknown>) {
  return {
    id: d.id,
    medicationId: d.medicationId,
    familyMemberId: d.familyMemberId,
    scheduledAt: iso(d.scheduledAt as Date),
    status: d.status,
    takenAt: iso(d.takenAt as Date | null),
    notes: d.notes,
    createdAt: iso(d.createdAt as Date),
    updatedAt: iso(d.updatedAt as Date),
  };
}

export function serializeVital(v: Record<string, unknown>) {
  return {
    id: v.id,
    type: v.type,
    label: v.label,
    value: v.value,
    valueText: v.valueText,
    unit: v.unit,
    measuredAt: iso(v.measuredAt as Date),
    notes: v.notes,
    createdAt: iso(v.createdAt as Date),
    updatedAt: iso(v.updatedAt as Date),
  };
}

export function serializeAppointment(a: Record<string, unknown>) {
  return {
    id: a.id,
    title: a.title,
    doctorName: a.doctorName,
    hospitalName: a.hospitalName,
    appointmentAt: iso(a.appointmentAt as Date),
    status: a.status,
    notes: a.notes,
    createdAt: iso(a.createdAt as Date),
    updatedAt: iso(a.updatedAt as Date),
  };
}

export function serializeEmergencyContact(c: Record<string, unknown>) {
  return {
    id: c.id,
    name: c.name,
    relation: c.relation,
    phone: c.phone,
    email: c.email,
    notes: c.notes,
    createdAt: iso(c.createdAt as Date),
    updatedAt: iso(c.updatedAt as Date),
  };
}
