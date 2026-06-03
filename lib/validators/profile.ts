import { z } from "zod";
import { isValidIndianPhone, normalizeIndianPhone } from "@/lib/phone";

const stripHtml = (s: string) => s.replace(/<[^>]*>/g, "").trim();

const safeText = (max: number) =>
  z
    .string()
    .max(max)
    .transform(stripHtml)
    .optional()
    .nullable();

export const GENDER_VALUES = [
  "male",
  "female",
  "other",
  "prefer_not_to_say",
] as const;

export const BLOOD_GROUP_VALUES = [
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

export const MARITAL_STATUS_VALUES = [
  "single",
  "married",
  "divorced",
  "widowed",
  "prefer_not_to_say",
] as const;

const phoneSchema = z
  .string()
  .min(1, "Phone number is required")
  .refine((v) => isValidIndianPhone(v), "Enter a valid Indian mobile number (+91 or 10 digits)")
  .transform((v) => normalizeIndianPhone(v)!);

const optionalPhoneSchema = z
  .string()
  .optional()
  .nullable()
  .superRefine((v, ctx) => {
    if (!v?.trim()) return;
    if (!isValidIndianPhone(v)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid Indian mobile number (+91 or 10 digits)",
      });
    }
  })
  .transform((v) => {
    if (!v?.trim()) return null;
    return normalizeIndianPhone(v)!;
  });

const dateOfBirthSchema = z
  .string()
  .optional()
  .nullable()
  .transform((v) => {
    if (!v?.trim()) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  })
  .refine((d) => d === null || d <= new Date(), "Date of birth cannot be in the future")
  .refine((d) => {
    if (!d) return true;
    const age = (Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    return age >= 0 && age <= 120;
  }, "Age must be between 0 and 120");

export const profilePatchSchema = z.object({
  fullName: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100)
    .transform(stripHtml)
    .optional(),
  phoneNumber: optionalPhoneSchema,
  gender: z.enum(GENDER_VALUES).optional().nullable(),
  dateOfBirth: dateOfBirthSchema,
  bloodGroup: z.enum(BLOOD_GROUP_VALUES).optional().nullable(),
  heightCm: z.coerce.number().min(30).max(250).optional().nullable(),
  weightKg: z.coerce.number().min(1).max(300).optional().nullable(),
  maritalStatus: z.enum(MARITAL_STATUS_VALUES).optional().nullable(),
  occupation: safeText(120),
  addressLine1: safeText(200),
  addressLine2: safeText(200),
  city: safeText(80),
  state: safeText(80),
  pincode: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v?.trim() ? v.trim() : null))
    .refine((v) => v === null || /^\d{6}$/.test(v), "Pincode must be 6 digits"),
  country: safeText(80),
  emergencyContactName: safeText(100),
  emergencyContactRelation: safeText(60),
  emergencyContactPhone: optionalPhoneSchema,
  preferredLanguage: z.string().min(2).max(10).optional().nullable(),
  knownConditionsSummary: safeText(2000),
  allergiesSummary: safeText(2000),
  currentMedicationsSummary: safeText(2000),
});

export const billingProfilePatchSchema = z.object({
  fullName: z
    .string()
    .min(2, "Full name is required")
    .max(100)
    .transform(stripHtml),
  phoneNumber: phoneSchema,
});

export type ProfilePatchInput = z.infer<typeof profilePatchSchema>;
export type BillingProfilePatchInput = z.infer<typeof billingProfilePatchSchema>;
