import { z } from "zod";

const emptyToNull = (v: unknown) => {
  if (v === "" || v === undefined) return null;
  return v;
};

const stringArray = z
  .array(z.string().trim().max(100))
  .max(30)
  .optional()
  .nullable()
  .transform((arr) => {
    if (!arr) return null;
    const cleaned = arr
      .map((s) => s.replace(/<[^>]*>/g, "").trim())
      .filter(Boolean);
    return cleaned.length ? cleaned : null;
  });

const enumOrNull = (values: readonly [string, ...string[]]) =>
  z.preprocess(
    emptyToNull,
    z.enum(values).nullable().optional()
  );

export const reportContextInputSchema = z.object({
  smokingStatus: enumOrNull([
    "never",
    "former",
    "occasional",
    "daily",
    "prefer_not_to_say",
  ]),
  tobaccoUse: enumOrNull(["none", "chewing", "smoking", "both", "prefer_not_to_say"]),
  alcoholUse: enumOrNull([
    "never",
    "occasional",
    "weekly",
    "daily",
    "prefer_not_to_say",
  ]),
  physicalActivity: enumOrNull([
    "sedentary",
    "light",
    "moderate",
    "active",
    "athlete",
  ]),
  sugarIntake: enumOrNull(["low", "moderate", "high", "very_high", "unknown"]),
  foodPreference: enumOrNull([
    "vegetarian",
    "non_vegetarian",
    "vegan",
    "eggetarian",
    "mixed",
    "other",
  ]),
  dietNotes: z.preprocess(
    emptyToNull,
    z.string().trim().max(500).nullable().optional()
  ),
  knownConditions: stringArray,
  allergies: stringArray,
  currentMedicines: stringArray,
  familyHistory: stringArray,
  symptoms: stringArray,
  sleepQuality: enumOrNull(["poor", "average", "good"]),
  stressLevel: enumOrNull(["low", "moderate", "high"]),
  waterIntake: enumOrNull(["low", "moderate", "high"]),
  heightCm: z
    .number()
    .min(30)
    .max(250)
    .nullable()
    .optional(),
  weightKg: z
    .number()
    .min(1)
    .max(300)
    .nullable()
    .optional(),
  fastingStatus: enumOrNull(["fasting", "non_fasting", "unknown"]),
  recentFeverOrInfection: z.boolean().nullable().optional(),
  supplements: stringArray,
  pregnancyStatus: enumOrNull([
    "not_applicable",
    "no",
    "yes",
    "unknown",
    "prefer_not_to_say",
  ]),
  doctorDiagnosis: z.preprocess(
    emptyToNull,
    z.string().trim().max(500).nullable().optional()
  ),
  notes: z.preprocess(
    emptyToNull,
    z.string().trim().max(1000).nullable().optional()
  ),
  consentAcknowledged: z.boolean().optional(),
  skipContext: z.boolean().optional(),
});

export type ReportContextInputParsed = z.infer<typeof reportContextInputSchema>;

export const generateSummaryWithContextSchema = z.object({
  context: reportContextInputSchema.optional(),
  skipContext: z.boolean().optional(),
  consentAcknowledged: z.boolean().optional(),
});
