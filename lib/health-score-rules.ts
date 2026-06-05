import type { ParsedLabValue } from "@/lib/lab-value-parser";
import { displayNameForCanonical } from "@/lib/lab-test-aliases";

export type AbnormalSeverity = "mild" | "moderate" | "major" | "critical";

export type ScoreGroup =
  | "liver"
  | "kidney"
  | "glucose"
  | "thyroid"
  | "lipid"
  | "cbc_anemia"
  | "cbc_other"
  | "vitamins"
  | "iron"
  | "inflammation"
  | "electrolytes"
  | "other";

export type MarkerDeduction = {
  canonicalName: string;
  displayName: string;
  category: string;
  group: ScoreGroup;
  value: number | string;
  unit: string | null;
  referenceRange: string | null;
  status: string;
  severity: AbnormalSeverity;
  rawDeduction: number;
  reason: string;
};

const MIN_CONFIDENCE = 0.5;

const DEDUCTION_BANDS: Record<AbnormalSeverity, { min: number; max: number }> = {
  mild: { min: 4, max: 8 },
  moderate: { min: 8, max: 15 },
  major: { min: 18, max: 30 },
  critical: { min: 30, max: 45 },
};

export const GROUP_CAPS: Record<
  ScoreGroup,
  Partial<Record<AbnormalSeverity, number>>
> = {
  liver: { mild: 15, moderate: 25, major: 40, critical: 50 },
  kidney: { mild: 12, moderate: 22, major: 35, critical: 45 },
  glucose: { mild: 12, moderate: 20, major: 35, critical: 45 },
  thyroid: { mild: 15, moderate: 25, major: 35, critical: 45 },
  lipid: { mild: 12, moderate: 20, major: 30, critical: 40 },
  cbc_anemia: { mild: 12, moderate: 20, major: 30, critical: 40 },
  cbc_other: { mild: 10, moderate: 18, major: 28, critical: 38 },
  vitamins: { mild: 10, moderate: 18, major: 25, critical: 35 },
  iron: { mild: 10, moderate: 16, major: 24, critical: 32 },
  inflammation: { mild: 8, moderate: 14, major: 22, critical: 30 },
  electrolytes: { mild: 8, moderate: 14, major: 20, critical: 28 },
  other: { mild: 10, moderate: 16, major: 24, critical: 32 },
};

const LIVER_ENZYMES = new Set(["sgot", "sgpt", "alp", "ggt", "bilirubin_total", "bilirubin_direct"]);
const CBC_ANEMIA_MARKERS = new Set(["hemoglobin", "pcv", "rbc_count", "mcv", "mch", "mchc"]);
const THYROID_MARKERS = new Set(["tsh", "ft3", "ft4", "total_t3", "total_t4", "anti_tpo"]);

export function getScoreGroup(v: ParsedLabValue): ScoreGroup {
  const c = v.canonicalName;
  if (LIVER_ENZYMES.has(c) || v.category === "liver") return "liver";
  if (["creatinine", "urea", "uric_acid", "egfr"].includes(c) || v.category === "kidney") {
    return "kidney";
  }
  if (
    ["fasting_glucose", "hba1c", "pp_glucose", "random_glucose"].includes(c) ||
    v.category === "sugar"
  ) {
    return "glucose";
  }
  if (THYROID_MARKERS.has(c) || v.category === "thyroid") return "thyroid";
  if (
    ["ldl", "hdl", "triglycerides", "total_cholesterol", "vldl", "non_hdl_cholesterol"].includes(c) ||
    v.category === "lipid"
  ) {
    return "lipid";
  }
  if (CBC_ANEMIA_MARKERS.has(c)) return "cbc_anemia";
  if (["wbc_count", "platelet_count", "rdw"].includes(c) || v.category === "cbc") return "cbc_other";
  if (["vitamin_d", "vitamin_b12", "folate"].includes(c) || v.category === "vitamins") {
    return "vitamins";
  }
  if (["serum_iron", "ferritin", "tibc", "transferrin_saturation"].includes(c) || v.category === "iron") {
    return "iron";
  }
  if (["crp", "hs_crp", "esr"].includes(c) || v.category === "inflammation") {
    return "inflammation";
  }
  if (["sodium", "potassium", "chloride", "calcium", "phosphorus"].includes(c)) {
    return "electrolytes";
  }
  return "other";
}

export function shouldScoreLabValue(v: ParsedLabValue): boolean {
  if (v.confidence < MIN_CONFIDENCE) return false;
  if (v.status !== "high" && v.status !== "low") return false;

  if (v.canonicalName === "egfr" && v.numericValue != null) {
    if (v.status === "high") return false;
    if (v.status === "low" && v.numericValue >= 90) return false;
  }

  return true;
}

function deductionForSeverity(severity: AbnormalSeverity, position = 0.5): number {
  const band = DEDUCTION_BANDS[severity];
  const span = band.max - band.min;
  return Math.round(band.min + span * Math.min(1, Math.max(0, position)));
}

function ratioHigh(value: number, upper: number): number {
  if (upper <= 0) return 2;
  return value / upper;
}

function ratioLow(value: number, lower: number): number {
  if (lower <= 0) return 0.5;
  return value / lower;
}

export function severityFromRatio(ratio: number, direction: "high" | "low"): AbnormalSeverity {
  if (direction === "high") {
    if (ratio <= 1.1) return "mild";
    if (ratio <= 1.5) return "moderate";
    if (ratio <= 2.5) return "major";
    return "critical";
  }
  if (ratio >= 0.9) return "mild";
  if (ratio >= 0.7) return "moderate";
  if (ratio >= 0.5) return "major";
  return "critical";
}

export function calculateAbnormalSeverity(v: ParsedLabValue): AbnormalSeverity | null {
  if (!shouldScoreLabValue(v)) return null;

  const n = v.numericValue;
  const min = v.referenceMin;
  const max = v.referenceMax;

  if (v.canonicalName === "egfr" && n != null && v.status === "low") {
    if (n < 15) return "critical";
    if (n < 30) return "major";
    if (n < 60) return "moderate";
    return "mild";
  }

  if (v.canonicalName === "tsh" && n != null && v.status === "high") {
    if (n > 10) return "major";
    if (n > 4.2 || (max != null && n > max)) return "moderate";
    return "mild";
  }

  if (v.canonicalName === "tsh" && n != null && v.status === "low") {
    if (n < 0.1) return "major";
    return "moderate";
  }

  if (v.canonicalName === "hba1c" && n != null && v.status === "high") {
    if (n >= 6.5) return "major";
    if (n >= 5.7) return "moderate";
    return "mild";
  }

  if (v.canonicalName === "fasting_glucose" && n != null && v.status === "high") {
    if (n >= 126) return "major";
    if (n >= 100) return "moderate";
    return "mild";
  }

  if (v.canonicalName === "ldl" && n != null && v.status === "high") {
    if (n >= 190) return "critical";
    if (n >= 160) return "major";
    if (n >= 130) return "moderate";
    if (n >= 100) return "mild";
    return "mild";
  }

  if (v.canonicalName === "triglycerides" && n != null && v.status === "high") {
    if (n >= 500) return "critical";
    if (n >= 200) return "moderate";
    if (n >= 150) return "mild";
    return "mild";
  }

  if (v.canonicalName === "vitamin_d" && n != null && v.status === "low") {
    if (n < 10) return "major";
    if (n < 20) return "moderate";
    if (n < 30) return "mild";
    return "mild";
  }

  if (v.canonicalName === "hemoglobin" && n != null && v.status === "low") {
    if (n < 8) return "critical";
    if (n < 10) return "major";
    if (n < 12) return "moderate";
    return "mild";
  }

  if (v.canonicalName === "creatinine" && n != null && v.status === "high" && max != null) {
    return severityFromRatio(ratioHigh(n, max), "high");
  }

  if (n != null && v.status === "high" && max != null && max > 0) {
    return severityFromRatio(ratioHigh(n, max), "high");
  }

  if (n != null && v.status === "low" && min != null && min > 0) {
    return severityFromRatio(ratioLow(n, min), "low");
  }

  if (v.status === "high" || v.status === "low") return "mild";
  return null;
}

function markerSpecificDeduction(v: ParsedLabValue, severity: AbnormalSeverity): number {
  const n = v.numericValue;

  if (v.canonicalName === "egfr" && n != null && v.status === "low") {
    if (n < 15) return 40;
    if (n < 30) return 25;
    if (n < 60) return 15;
    return 6;
  }

  if (v.canonicalName === "sgot" && n != null && v.status === "high" && v.referenceMax != null) {
    const ratio = ratioHigh(n, v.referenceMax);
    if (ratio > 3) return 22;
    if (ratio > 1.5) return 12;
    return 5;
  }

  if (v.canonicalName === "sgpt" && n != null && v.status === "high" && v.referenceMax != null) {
    const ratio = ratioHigh(n, v.referenceMax);
    if (ratio > 3) return 22;
    if (ratio > 1.5) return 14;
    return 7;
  }

  if (v.canonicalName === "tsh" && n != null && v.status === "high") {
    if (n > 10) return 24;
    if (n > 4.2) return 14;
    return 8;
  }

  if (v.canonicalName === "ldl" && n != null && v.status === "high") {
    if (n >= 190) return 28;
    if (n >= 160) return 18;
    if (n >= 130) return 10;
    if (n >= 100) return 6;
    return 5;
  }

  if (v.canonicalName === "hba1c" && n != null && v.status === "high") {
    if (n >= 6.5) return 24;
    if (n >= 5.7) return 12;
    return 6;
  }

  if (v.canonicalName === "fasting_glucose" && n != null && v.status === "high") {
    if (n >= 126) return 20;
    if (n >= 100) return 10;
    return 5;
  }

  if (v.canonicalName === "vitamin_d" && n != null && v.status === "low") {
    if (n < 10) return 18;
    if (n < 20) return 10;
    if (n < 30) return 5;
    return 4;
  }

  if (v.canonicalName === "hemoglobin" && n != null && v.status === "low") {
    if (n < 8) return 32;
    if (n < 10) return 18;
    if (n < 12) return 10;
    return 5;
  }

  if (v.canonicalName === "pcv" && n != null && v.status === "low") {
    if (n < 30) return 12;
    if (n < 35) return 6;
    return 4;
  }

  if (v.canonicalName === "hdl" && v.status === "low") {
    return severity === "major" ? 12 : severity === "moderate" ? 8 : 5;
  }

  if (v.canonicalName === "triglycerides" && n != null && v.status === "high") {
    if (n >= 500) return 30;
    if (n >= 200) return 12;
    if (n >= 150) return 6;
    return 5;
  }

  if (v.canonicalName === "vitamin_b12" && v.status === "low") {
    return severity === "major" ? 14 : severity === "moderate" ? 9 : 6;
  }

  if (v.canonicalName === "ferritin" && v.status === "low") {
    return severity === "major" ? 14 : severity === "moderate" ? 9 : 6;
  }

  const position =
    severity === "critical"
      ? 0.9
      : severity === "major"
        ? 0.7
        : severity === "moderate"
          ? 0.5
          : 0.35;
  return deductionForSeverity(severity, position);
}

function reasonForMarker(v: ParsedLabValue, severity: AbnormalSeverity): string {
  const name = v.testName || displayNameForCanonical(v.canonicalName);
  const val = v.numericValue != null ? String(v.numericValue) : String(v.value);
  const unit = v.unit ? ` ${v.unit}` : "";
  const ref = v.referenceRange ? ` (reference ${v.referenceRange})` : "";

  if (v.canonicalName === "egfr" && v.status === "low") {
    return `Kidney filtration (eGFR) is below the usual range at ${val}${unit}${ref}.`;
  }
  if (v.canonicalName === "tsh" && v.status === "high") {
    return `TSH is above the reference range at ${val}${unit}${ref} — thyroid follow-up may be helpful.`;
  }
  if (v.canonicalName === "ldl" && v.status === "high") {
    return `LDL cholesterol is elevated at ${val}${unit}${ref}.`;
  }
  if (v.canonicalName === "hba1c" && v.status === "high") {
    return `HbA1c is above the usual target at ${val}${unit}${ref}.`;
  }
  if (v.canonicalName === "vitamin_d" && v.status === "low") {
    return `Vitamin D is below the recommended range at ${val}${unit}${ref}.`;
  }
  if ((v.canonicalName === "sgot" || v.canonicalName === "sgpt") && v.status === "high") {
    return `${name} is above the reference range at ${val}${unit}${ref}.`;
  }

  return `${name} is ${v.status} at ${val}${unit}${ref} (${severity} deviation).`;
}

export function calculateMarkerDeduction(v: ParsedLabValue): MarkerDeduction | null {
  const severity = calculateAbnormalSeverity(v);
  if (!severity) return null;

  const rawDeduction = markerSpecificDeduction(v, severity);

  return {
    canonicalName: v.canonicalName,
    displayName: v.testName || displayNameForCanonical(v.canonicalName),
    category: v.category,
    group: getScoreGroup(v),
    value: v.numericValue ?? v.value,
    unit: v.unit,
    referenceRange: v.referenceRange,
    status: v.status,
    severity,
    rawDeduction,
    reason: reasonForMarker(v, severity),
  };
}

export function maxSeverity(a: AbnormalSeverity, b: AbnormalSeverity): AbnormalSeverity {
  const order: AbnormalSeverity[] = ["mild", "moderate", "major", "critical"];
  return order.indexOf(a) >= order.indexOf(b) ? a : b;
}
