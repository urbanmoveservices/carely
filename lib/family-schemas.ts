import { z } from "zod";
import type { FamilyMemberInput } from "@/types";

export const RELATIONS = [
  "self",
  "father",
  "mother",
  "spouse",
  "son",
  "daughter",
  "brother",
  "sister",
  "grandfather",
  "grandmother",
  "uncle",
  "aunt",
  "cousin",
  "friend",
  "other",
] as const;

export const GENDERS = ["male", "female", "other", "prefer_not_to_say"] as const;
export const BLOOD_GROUPS = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
  "unknown",
] as const;

const RELATION_LABELS: Record<string, (typeof RELATIONS)[number]> = {
  self: "self",
  father: "father",
  mother: "mother",
  spouse: "spouse",
  son: "son",
  daughter: "daughter",
  brother: "brother",
  sister: "sister",
  grandfather: "grandfather",
  grandmother: "grandmother",
  uncle: "uncle",
  aunt: "aunt",
  cousin: "cousin",
  friend: "friend",
  other: "other",
};

const emptyToNull = (v: unknown) =>
  v === "" || v === undefined ? null : v;

const optionalNullableString = (max: number) =>
  z.preprocess(
    emptyToNull,
    z.string().max(max).nullable()
  );

const optionalNullableNumber = () =>
  z.preprocess((v) => {
    if (v === "" || v === undefined || v === null) return null;
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  }, z.number().positive().nullable());

export function normalizeRelation(
  relation: string
): (typeof RELATIONS)[number] {
  const raw = String(relation || "other").trim().toLowerCase();
  const underscored = raw.replace(/\s+/g, "_");
  if (RELATION_LABELS[underscored]) return RELATION_LABELS[underscored];
  if ((RELATIONS as readonly string[]).includes(raw)) {
    return raw as (typeof RELATIONS)[number];
  }
  return "other";
}

/** Client payload: no undefined fields; safe defaults for onboarding/minimal forms */
export function normalizeFamilyPayload(
  input: Partial<FamilyMemberInput>
): FamilyMemberInput {
  const toPositiveNumber = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const payload: FamilyMemberInput = {
    fullName: String(input.fullName || "").trim(),
    relation: normalizeRelation(input.relation || "other"),
    dateOfBirth: input.dateOfBirth ?? null,
    gender: input.gender ?? null,
    bloodGroup: input.bloodGroup || "unknown",
    phone: input.phone ?? null,
    email: input.email ?? null,
    notes: input.notes ?? null,
    heightCm: toPositiveNumber(input.heightCm),
    weightKg: toPositiveNumber(input.weightKg),
  };

  if (input.profilePhotoUrl !== undefined) {
    payload.profilePhotoUrl = input.profilePhotoUrl ?? null;
  }

  return payload;
}

export const familyMemberSchema = z.object({
  fullName: z.preprocess(
    (v) => String(v ?? "").trim(),
    z.string().min(2, "Full name must be at least 2 characters").max(120)
  ),
  relation: z.preprocess(
    (v) => normalizeRelation(String(v ?? "")),
    z.enum(RELATIONS)
  ),
  dateOfBirth: z.preprocess(emptyToNull, z.string().nullable().optional()),
  gender: z.preprocess(
    emptyToNull,
    z.enum(GENDERS).nullable().optional()
  ),
  bloodGroup: z.preprocess((v) => {
    const n = emptyToNull(v);
    if (n === null) return "unknown";
    return n;
  }, z.enum(BLOOD_GROUPS)),
  phone: optionalNullableString(20).optional(),
  email: z
    .preprocess(
      emptyToNull,
      z.union([z.string().email(), z.null()])
    )
    .optional(),
  profilePhotoUrl: z
    .preprocess(
      emptyToNull,
      z.union([z.string().url(), z.null()])
    )
    .optional(),
  notes: optionalNullableString(1000).optional(),
  heightCm: optionalNullableNumber().optional(),
  weightKg: optionalNullableNumber().optional(),
});

export const familyMemberPatchSchema = familyMemberSchema.partial();

export function formatFamilyMemberValidationError(
  issues: z.ZodIssue[]
): string {
  const issue = issues[0];
  const field = issue?.path?.[0];

  if (field === "fullName") {
    return "Full name must be at least 2 characters.";
  }
  if (field === "relation") {
    return 'Relation must be a valid value such as "self", "mother", or "spouse".';
  }
  if (field === "dateOfBirth") {
    return "Please enter a valid date of birth or leave it blank.";
  }
  if (field === "email") {
    return "Please enter a valid email address or leave it blank.";
  }
  if (field === "heightCm" || field === "weightKg") {
    return "Height and weight must be positive numbers.";
  }
  if (field === "gender") {
    return "Please select a valid gender or leave it blank.";
  }
  if (field === "bloodGroup") {
    return "Please select a valid blood group or leave it as unknown.";
  }

  return "Please enter a valid name and relation.";
}

export function isValidDateOfBirthString(
  value: string | null | undefined
): boolean {
  if (!value) return true;
  const d = new Date(value);
  return !isNaN(d.getTime());
}

export const conditionSchema = z.object({
  name: z.string().min(2).max(200),
  status: z.enum(["active", "resolved", "monitoring"]).default("active"),
  diagnosedOn: z.preprocess(emptyToNull, z.string().nullable().optional()),
  severity: z
    .enum(["mild", "moderate", "severe", "unknown"])
    .optional()
    .nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const conditionPatchSchema = conditionSchema.partial();

export const allergySchema = z.object({
  name: z.string().min(2).max(200),
  reaction: z.string().max(500).optional().nullable(),
  severity: z
    .enum(["mild", "moderate", "severe", "critical"])
    .optional()
    .nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const allergyPatchSchema = allergySchema.partial();

export const medicationSchema = z.object({
  name: z.string().min(2).max(200),
  dosage: z.string().max(200).optional().nullable(),
  frequency: z.string().max(200).optional().nullable(),
  instructions: z.string().max(500).optional().nullable(),
  startDate: z.preprocess(emptyToNull, z.string().nullable().optional()),
  endDate: z.preprocess(emptyToNull, z.string().nullable().optional()),
  refillDate: z.preprocess(emptyToNull, z.string().nullable().optional()),
  status: z.enum(["active", "stopped", "completed"]).default("active"),
  prescribedBy: z.string().max(200).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  reminderEnabled: z.boolean().optional().default(false),
  reminderTimes: z.array(z.string()).optional().nullable(),
});

export const doseLogSchema = z.object({
  scheduledAt: z.string(),
  status: z.enum(["pending", "taken", "missed", "skipped"]).optional(),
  notes: z.string().max(500).optional().nullable(),
});

export const doseLogPatchSchema = z.object({
  status: z.enum(["taken", "missed", "skipped"]),
  notes: z.string().max(500).optional().nullable(),
});

export const medicationPatchSchema = medicationSchema.partial();

export const vitalSchema = z.object({
  type: z.string().min(1).max(50),
  label: z.string().min(1).max(200),
  value: z.number().optional().nullable(),
  valueText: z.string().max(200).optional().nullable(),
  unit: z.string().max(50).optional().nullable(),
  measuredAt: z.preprocess(emptyToNull, z.string().nullable().optional()),
  notes: z.string().max(1000).optional().nullable(),
});

export const vitalPatchSchema = vitalSchema.partial();

export const appointmentSchema = z.object({
  title: z.string().min(2).max(200),
  doctorName: z.string().max(200).optional().nullable(),
  hospitalName: z.string().max(200).optional().nullable(),
  appointmentAt: z.string().min(1),
  status: z.enum(["upcoming", "completed", "cancelled"]).default("upcoming"),
  notes: z.string().max(1000).optional().nullable(),
});

export const appointmentPatchSchema = appointmentSchema.partial();

export const emergencyContactSchema = z.object({
  name: z.string().min(2).max(120),
  relation: z.string().max(50).optional().nullable(),
  phone: z.string().min(5).max(20),
  email: z
    .preprocess(
      emptyToNull,
      z.union([z.string().email(), z.null()])
    )
    .optional(),
  notes: z.string().max(1000).optional().nullable(),
});

export const emergencyContactPatchSchema = emergencyContactSchema.partial();

export function parseDateField(v: string | null | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}
