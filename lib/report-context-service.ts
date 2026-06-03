import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import type { ReportContextInputParsed } from "@/lib/report-context-schema";
import type { ReportContext, ReportContextInput } from "@/types";

export type ContextForAi = ReportContextInputParsed | ReportContextInput;

function jsonArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === "string");
}

export function serializeReportContext(row: {
  id: string;
  documentId: string;
  familyMemberId: string | null;
  smokingStatus: string | null;
  tobaccoUse: string | null;
  alcoholUse: string | null;
  physicalActivity: string | null;
  sugarIntake: string | null;
  foodPreference: string | null;
  dietNotes: string | null;
  knownConditions: unknown;
  allergies: unknown;
  currentMedicines: unknown;
  familyHistory: unknown;
  symptoms: unknown;
  sleepQuality: string | null;
  stressLevel: string | null;
  waterIntake: string | null;
  heightCm: number | null;
  weightKg: number | null;
  fastingStatus: string | null;
  recentFeverOrInfection: boolean | null;
  supplements: unknown;
  pregnancyStatus: string | null;
  doctorDiagnosis: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ReportContext {
  return {
    id: row.id,
    document_id: row.documentId,
    family_member_id: row.familyMemberId,
    smoking_status: row.smokingStatus,
    tobacco_use: row.tobaccoUse,
    alcohol_use: row.alcoholUse,
    physical_activity: row.physicalActivity,
    sugar_intake: row.sugarIntake,
    food_preference: row.foodPreference,
    diet_notes: row.dietNotes,
    known_conditions: jsonArray(row.knownConditions),
    allergies: jsonArray(row.allergies),
    current_medicines: jsonArray(row.currentMedicines),
    family_history: jsonArray(row.familyHistory),
    symptoms: jsonArray(row.symptoms),
    sleep_quality: row.sleepQuality,
    stress_level: row.stressLevel,
    water_intake: row.waterIntake,
    height_cm: row.heightCm,
    weight_kg: row.weightKg,
    fasting_status: row.fastingStatus,
    recent_fever_or_infection: row.recentFeverOrInfection,
    supplements: jsonArray(row.supplements),
    pregnancy_status: row.pregnancyStatus,
    doctor_diagnosis: row.doctorDiagnosis,
    notes: row.notes,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

export function countContextFields(input: ContextForAi): number {
  let n = 0;
  const scalarKeys = [
    "smokingStatus",
    "tobaccoUse",
    "alcoholUse",
    "physicalActivity",
    "sugarIntake",
    "foodPreference",
    "dietNotes",
    "sleepQuality",
    "stressLevel",
    "waterIntake",
    "fastingStatus",
    "pregnancyStatus",
    "doctorDiagnosis",
    "notes",
  ] as const;
  for (const k of scalarKeys) {
    if (input[k]) n++;
  }
  if (input.heightCm != null) n++;
  if (input.weightKg != null) n++;
  if (input.recentFeverOrInfection != null) n++;
  for (const k of [
    "knownConditions",
    "allergies",
    "currentMedicines",
    "familyHistory",
    "symptoms",
    "supplements",
  ] as const) {
    if (input[k]?.length) n++;
  }
  return n;
}

function toPrismaContextData(
  userId: string,
  documentId: string,
  familyMemberId: string | null,
  input: ReportContextInputParsed
): Prisma.ReportContextUncheckedCreateInput {
  return {
    userId,
    documentId,
    familyMemberId,
    smokingStatus: input.smokingStatus ?? null,
    tobaccoUse: input.tobaccoUse ?? null,
    alcoholUse: input.alcoholUse ?? null,
    physicalActivity: input.physicalActivity ?? null,
    sugarIntake: input.sugarIntake ?? null,
    foodPreference: input.foodPreference ?? null,
    dietNotes: input.dietNotes ?? null,
    knownConditions: (input.knownConditions ?? undefined) as Prisma.InputJsonValue,
    allergies: (input.allergies ?? undefined) as Prisma.InputJsonValue,
    currentMedicines: (input.currentMedicines ?? undefined) as Prisma.InputJsonValue,
    familyHistory: (input.familyHistory ?? undefined) as Prisma.InputJsonValue,
    symptoms: (input.symptoms ?? undefined) as Prisma.InputJsonValue,
    sleepQuality: input.sleepQuality ?? null,
    stressLevel: input.stressLevel ?? null,
    waterIntake: input.waterIntake ?? null,
    heightCm: input.heightCm ?? null,
    weightKg: input.weightKg ?? null,
    fastingStatus: input.fastingStatus ?? null,
    recentFeverOrInfection: input.recentFeverOrInfection ?? null,
    supplements: (input.supplements ?? undefined) as Prisma.InputJsonValue,
    pregnancyStatus: input.pregnancyStatus ?? null,
    doctorDiagnosis: input.doctorDiagnosis ?? null,
    notes: input.notes ?? null,
  };
}

export async function upsertReportContext(
  userId: string,
  documentId: string,
  familyMemberId: string | null,
  input: ReportContextInputParsed
) {
  const data = toPrismaContextData(userId, documentId, familyMemberId, input);
  const row = await prisma.reportContext.upsert({
    where: { documentId },
    create: data,
    update: data,
  });
  return serializeReportContext(row);
}

export async function getFamilySuggestedDefaults(familyMemberId: string | null) {
  if (!familyMemberId) return null;
  const member = await prisma.familyMember.findUnique({
    where: { id: familyMemberId },
    include: {
      conditions: { where: { status: "active" }, select: { name: true } },
      allergies: { select: { name: true } },
      medications: {
        where: { status: "active" },
        select: { name: true, dosage: true },
      },
    },
  });
  if (!member) return null;
  return {
    height_cm: member.heightCm,
    weight_kg: member.weightKg,
    known_conditions: member.conditions.map((c) => c.name),
    allergies: member.allergies.map((a) => a.name),
    current_medicines: member.medications.map((m) =>
      m.dosage ? `${m.name} ${m.dosage}` : m.name
    ),
    family_member: {
      id: member.id,
      full_name: member.fullName,
      relation: member.relation,
    },
  };
}

export type AiHealthContextBundle = {
  questionnaire: Record<string, unknown>;
  familyProfile: Record<string, unknown> | null;
  skipped: boolean;
};

export function buildAiHealthContextBundle(
  context: ContextForAi,
  familyDefaults: Awaited<ReturnType<typeof getFamilySuggestedDefaults>>,
  skipped: boolean
): AiHealthContextBundle {
  if (skipped) {
    return {
      skipped: true,
      questionnaire: { notes: "User skipped context questionnaire." },
      familyProfile: familyDefaults
        ? {
            heightCm: familyDefaults.height_cm,
            weightKg: familyDefaults.weight_kg,
            knownConditions: familyDefaults.known_conditions,
            allergies: familyDefaults.allergies,
            currentMedicines: familyDefaults.current_medicines,
          }
        : null,
    };
  }

  return {
    skipped: false,
    questionnaire: {
      smokingStatus: context.smokingStatus,
      tobaccoUse: context.tobaccoUse,
      alcoholUse: context.alcoholUse,
      physicalActivity: context.physicalActivity,
      sugarIntake: context.sugarIntake,
      foodPreference: context.foodPreference,
      dietNotes: context.dietNotes,
      knownConditions: context.knownConditions,
      allergies: context.allergies,
      currentMedicines: context.currentMedicines,
      familyHistory: context.familyHistory,
      symptoms: context.symptoms,
      sleepQuality: context.sleepQuality,
      stressLevel: context.stressLevel,
      waterIntake: context.waterIntake,
      heightCm: context.heightCm,
      weightKg: context.weightKg,
      fastingStatus: context.fastingStatus,
      recentFeverOrInfection: context.recentFeverOrInfection,
      supplements: context.supplements,
      pregnancyStatus: context.pregnancyStatus,
      doctorDiagnosis: context.doctorDiagnosis,
      notes: context.notes,
    },
    familyProfile: familyDefaults
      ? {
          memberName: familyDefaults.family_member?.full_name,
          relation: familyDefaults.family_member?.relation,
          heightCm: familyDefaults.height_cm,
          weightKg: familyDefaults.weight_kg,
          knownConditions: familyDefaults.known_conditions,
          allergies: familyDefaults.allergies,
          activeMedicines: familyDefaults.current_medicines,
        }
      : null,
  };
}

export function minimalSkippedContext(): ReportContextInputParsed {
  return {
    notes: "User skipped context questionnaire.",
  } as ReportContextInputParsed;
}

export function inputFromReportContext(ctx: ReportContext): ReportContextInput {
  return {
    smokingStatus: ctx.smoking_status as ReportContextInput["smokingStatus"],
    tobaccoUse: ctx.tobacco_use as ReportContextInput["tobaccoUse"],
    alcoholUse: ctx.alcohol_use as ReportContextInput["alcoholUse"],
    physicalActivity: ctx.physical_activity as ReportContextInput["physicalActivity"],
    sugarIntake: ctx.sugar_intake as ReportContextInput["sugarIntake"],
    foodPreference: ctx.food_preference as ReportContextInput["foodPreference"],
    dietNotes: ctx.diet_notes,
    knownConditions: ctx.known_conditions,
    allergies: ctx.allergies,
    currentMedicines: ctx.current_medicines,
    familyHistory: ctx.family_history,
    symptoms: ctx.symptoms,
    sleepQuality: ctx.sleep_quality as ReportContextInput["sleepQuality"],
    stressLevel: ctx.stress_level as ReportContextInput["stressLevel"],
    waterIntake: ctx.water_intake as ReportContextInput["waterIntake"],
    heightCm: ctx.height_cm ?? undefined,
    weightKg: ctx.weight_kg ?? undefined,
    fastingStatus: ctx.fasting_status as ReportContextInput["fastingStatus"],
    recentFeverOrInfection: ctx.recent_fever_or_infection ?? undefined,
    supplements: ctx.supplements,
    pregnancyStatus: ctx.pregnancy_status as ReportContextInput["pregnancyStatus"],
    doctorDiagnosis: ctx.doctor_diagnosis,
    notes: ctx.notes,
  };
}
