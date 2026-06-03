"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { ChipField, OptionGroup } from "@/components/reports/ChipField";
import { useTranslation } from "@/lib/i18n/use-translation";
import type {
  ReportContextInput,
  ReportContextSuggestedDefaults,
} from "@/types";

function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

const emptyForm = (): ReportContextInput => ({
  knownConditions: [],
  allergies: [],
  currentMedicines: [],
  familyHistory: [],
  symptoms: [],
  supplements: [],
});

export function ReportContextForm({
  initial,
  suggested,
  onBack,
  onGenerate,
  onSkip,
  loading,
  progressLabel,
  error,
}: {
  initial?: ReportContextInput | null;
  suggested?: ReportContextSuggestedDefaults | null;
  onBack: () => void;
  onGenerate: (data: ReportContextInput, consent: boolean) => void;
  onSkip: (consent: boolean) => void;
  loading?: boolean;
  progressLabel?: string;
  error?: string;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<ReportContextInput>(() => ({
    ...emptyForm(),
    heightCm: suggested?.height_cm ?? undefined,
    weightKg: suggested?.weight_kg ?? undefined,
    knownConditions: suggested?.known_conditions?.length
      ? [...suggested.known_conditions]
      : [],
    allergies: suggested?.allergies?.length ? [...suggested.allergies] : [],
    currentMedicines: suggested?.current_medicines?.length
      ? [...suggested.current_medicines]
      : [],
    ...initial,
  }));
  const [consent, setConsent] = useState(false);

  const bmi = useMemo(() => {
    const h = form.heightCm;
    const w = form.weightKg;
    if (!h || !w || h <= 0) return null;
    const m = h / 100;
    const v = w / (m * m);
    return Math.round(v * 10) / 10;
  }, [form.heightCm, form.weightKg]);

  const patch = (partial: Partial<ReportContextInput>) =>
    setForm((f) => ({ ...f, ...partial }));

  return (
    <div className="space-y-6">
      {error && <Alert variant="error">{error}</Alert>}
      {progressLabel && (
        <p className="text-sm text-brand-700 bg-brand-50 border border-brand-100 rounded-lg px-3 py-2">
          {progressLabel}
        </p>
      )}

      <Alert variant="info">
        {t("reportContext.privacyNote")}
      </Alert>

      <section className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">{t("reportContext.sectionLifestyle")}</h2>
        <OptionGroup
          label={t("reportContext.smoking")}
          value={form.smokingStatus}
          onChange={(v) => patch({ smokingStatus: v as ReportContextInput["smokingStatus"] })}
          options={[
            { value: "never", label: t("reportContext.never") },
            { value: "former", label: t("reportContext.former") },
            { value: "occasional", label: t("reportContext.occasional") },
            { value: "daily", label: t("reportContext.daily") },
            { value: "prefer_not_to_say", label: t("reportContext.preferNotSay") },
          ]}
        />
        <OptionGroup
          label={t("reportContext.alcohol")}
          value={form.alcoholUse}
          onChange={(v) => patch({ alcoholUse: v as ReportContextInput["alcoholUse"] })}
          options={[
            { value: "never", label: t("reportContext.never") },
            { value: "occasional", label: t("reportContext.occasional") },
            { value: "weekly", label: t("reportContext.weekly") },
            { value: "daily", label: t("reportContext.daily") },
            { value: "prefer_not_to_say", label: t("reportContext.preferNotSay") },
          ]}
        />
        <OptionGroup
          label={t("reportContext.activity")}
          value={form.physicalActivity}
          onChange={(v) =>
            patch({ physicalActivity: v as ReportContextInput["physicalActivity"] })
          }
          options={[
            { value: "sedentary", label: t("reportContext.sedentary") },
            { value: "light", label: t("reportContext.light") },
            { value: "moderate", label: t("reportContext.moderate") },
            { value: "active", label: t("reportContext.active") },
            { value: "athlete", label: t("reportContext.athlete") },
          ]}
        />
        <OptionGroup
          label={t("reportContext.sugar")}
          value={form.sugarIntake}
          onChange={(v) => patch({ sugarIntake: v as ReportContextInput["sugarIntake"] })}
          options={[
            { value: "low", label: t("reportContext.low") },
            { value: "moderate", label: t("reportContext.moderate") },
            { value: "high", label: t("reportContext.high") },
            { value: "very_high", label: t("reportContext.veryHigh") },
            { value: "unknown", label: t("reportContext.notSure") },
          ]}
        />
        <OptionGroup
          label={t("reportContext.food")}
          value={form.foodPreference}
          onChange={(v) =>
            patch({ foodPreference: v as ReportContextInput["foodPreference"] })
          }
          options={[
            { value: "vegetarian", label: t("reportContext.vegetarian") },
            { value: "non_vegetarian", label: t("reportContext.nonVegetarian") },
            { value: "vegan", label: t("reportContext.vegan") },
            { value: "eggetarian", label: t("reportContext.eggetarian") },
            { value: "mixed", label: t("reportContext.mixed") },
            { value: "other", label: t("reportContext.other") },
          ]}
        />
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">{t("reportContext.sectionMedical")}</h2>
        <ChipField
          label={t("reportContext.conditions")}
          values={form.knownConditions ?? []}
          onChange={(v) => patch({ knownConditions: v })}
          suggestions={[
            "Diabetes",
            "High BP",
            "Thyroid",
            "Asthma",
            "Heart disease",
            "Kidney disease",
            "Liver disease",
            "PCOS",
            "Anemia",
            "Cholesterol",
          ]}
        />
        <ChipField
          label={t("reportContext.allergies")}
          values={form.allergies ?? []}
          onChange={(v) => patch({ allergies: v })}
        />
        <ChipField
          label={t("reportContext.medicines")}
          values={form.currentMedicines ?? []}
          onChange={(v) => patch({ currentMedicines: v })}
        />
        <ChipField
          label={t("reportContext.familyHistory")}
          values={form.familyHistory ?? []}
          onChange={(v) => patch({ familyHistory: v })}
          suggestions={[
            "Diabetes",
            "High BP",
            "Heart disease",
            "Thyroid",
            "Cancer",
            "Stroke",
          ]}
        />
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">{t("reportContext.sectionCurrent")}</h2>
        <ChipField
          label={t("reportContext.symptoms")}
          values={form.symptoms ?? []}
          onChange={(v) => patch({ symptoms: v })}
          suggestions={[
            "Fatigue",
            "Fever",
            "Weight loss",
            "Weight gain",
            "Headache",
            "Dizziness",
            "Chest pain",
            "Breathlessness",
            "Excess thirst",
            "Frequent urination",
            "Body pain",
          ]}
        />
        <OptionGroup
          label={t("reportContext.sleep")}
          value={form.sleepQuality}
          onChange={(v) => patch({ sleepQuality: v as ReportContextInput["sleepQuality"] })}
          options={[
            { value: "poor", label: t("reportContext.poor") },
            { value: "average", label: t("reportContext.average") },
            { value: "good", label: t("reportContext.good") },
          ]}
        />
        <OptionGroup
          label={t("reportContext.stress")}
          value={form.stressLevel}
          onChange={(v) => patch({ stressLevel: v as ReportContextInput["stressLevel"] })}
          options={[
            { value: "low", label: t("reportContext.low") },
            { value: "moderate", label: t("reportContext.moderate") },
            { value: "high", label: t("reportContext.high") },
          ]}
        />
        <OptionGroup
          label={t("reportContext.water")}
          value={form.waterIntake}
          onChange={(v) => patch({ waterIntake: v })}
          options={[
            { value: "low", label: t("reportContext.low") },
            { value: "moderate", label: t("reportContext.moderate") },
            { value: "high", label: t("reportContext.high") },
          ]}
        />
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">{t("reportContext.sectionTest")}</h2>
        <OptionGroup
          label={t("reportContext.fasting")}
          value={form.fastingStatus}
          onChange={(v) => patch({ fastingStatus: v as ReportContextInput["fastingStatus"] })}
          options={[
            { value: "fasting", label: t("reportContext.fastingYes") },
            { value: "non_fasting", label: t("reportContext.fastingNo") },
            { value: "unknown", label: t("reportContext.notSure") },
          ]}
        />
        <OptionGroup
          label={t("reportContext.fever")}
          value={
            form.recentFeverOrInfection === true
              ? "yes"
              : form.recentFeverOrInfection === false
              ? "no"
              : undefined
          }
          onChange={(v) =>
            patch({ recentFeverOrInfection: v === "yes" ? true : v === "no" ? false : null })
          }
          options={[
            { value: "yes", label: t("reportContext.yes") },
            { value: "no", label: t("reportContext.no") },
          ]}
        />
        <ChipField
          label={t("reportContext.supplements")}
          values={form.supplements ?? []}
          onChange={(v) => patch({ supplements: v })}
          suggestions={[
            "Vitamin D",
            "B12",
            "Iron",
            "Protein",
            "Steroids",
            "Other",
          ]}
        />
        <OptionGroup
          label={t("reportContext.pregnancy")}
          value={form.pregnancyStatus}
          onChange={(v) =>
            patch({ pregnancyStatus: v as ReportContextInput["pregnancyStatus"] })
          }
          options={[
            { value: "not_applicable", label: t("reportContext.notApplicable") },
            { value: "no", label: t("reportContext.no") },
            { value: "yes", label: t("reportContext.yes") },
            { value: "unknown", label: t("reportContext.notSure") },
            { value: "prefer_not_to_say", label: t("reportContext.preferNotSay") },
          ]}
        />
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">{t("reportContext.sectionBody")}</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-medium text-gray-800">
              {t("reportContext.height")}
            </span>
            <input
              type="number"
              min={30}
              max={250}
              value={form.heightCm ?? ""}
              onChange={(e) =>
                patch({
                  heightCm: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-800">
              {t("reportContext.weight")}
            </span>
            <input
              type="number"
              min={1}
              max={300}
              value={form.weightKg ?? ""}
              onChange={(e) =>
                patch({
                  weightKg: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            />
          </label>
        </div>
        {bmi != null && (
          <p className="text-xs text-gray-500">
            {t("reportContext.bmi")}: {bmi} ({bmiCategory(bmi)}). {t("reportContext.bmiDisclaimer")}
          </p>
        )}
        <label className="block">
          <span className="text-sm font-medium text-gray-800">
            {t("reportContext.doctorDiagnosis")}
          </span>
          <textarea
            value={form.doctorDiagnosis ?? ""}
            onChange={(e) => patch({ doctorDiagnosis: e.target.value })}
            rows={2}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-800">{t("reportContext.notes")}</span>
          <textarea
            value={form.notes ?? ""}
            onChange={(e) => patch({ notes: e.target.value })}
            rows={3}
            maxLength={1000}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
        </label>
      </section>

      <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 cursor-pointer">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-600"
        />
        <span className="text-sm text-gray-700">{t("reportContext.consent")}</span>
      </label>

      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-between pt-2">
        <Button variant="outline" type="button" onClick={onBack} disabled={loading}>
          {t("common.back")}
        </Button>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="ghost"
            type="button"
            disabled={loading || !consent}
            onClick={() => onSkip(consent)}
          >
            {t("reportContext.skipGenerate")}
          </Button>
          <Button
            type="button"
            loading={loading}
            disabled={!consent}
            onClick={() => onGenerate(form, consent)}
            className="min-h-[48px]"
          >
            {loading ? t("reportContext.generating") : t("reportContext.generate")}
          </Button>
        </div>
      </div>
    </div>
  );
}
