import type { ParsedLabValue } from "@/lib/lab-value-parser";

export type HealthScoreFactor = {
  canonicalName: string;
  value: number | string;
  unit: string | null;
  status: string;
  severity: "mild" | "moderate" | "major";
  deduction: number;
  reason: string;
};

export type HealthScoreResult = {
  score: number;
  factors: HealthScoreFactor[];
};

function severityForMarker(v: ParsedLabValue): HealthScoreFactor | null {
  if (v.status !== "high" && v.status !== "low") return null;
  const n = v.numericValue;
  if (n == null) {
    return {
      canonicalName: v.canonicalName,
      value: v.value,
      unit: v.unit,
      status: v.status,
      severity: "mild",
      deduction: 5,
      reason: `${v.testName} is ${v.status}`,
    };
  }

  let severity: HealthScoreFactor["severity"] = "mild";
  let deduction = 5;
  let reason = `${v.testName} is ${v.status}`;

  if (v.canonicalName === "tsh" && v.status === "high") {
    if (n > 10) {
      severity = "major";
      deduction = 18;
      reason = "TSH markedly elevated — thyroid follow-up suggested";
    } else if (n > 4.2) {
      severity = "moderate";
      deduction = 12;
      reason = "TSH above reference range";
    }
  } else if (v.canonicalName === "ldl" && v.status === "high") {
    if (n >= 160) {
      severity = "major";
      deduction = 15;
    } else if (n >= 130) {
      severity = "moderate";
      deduction = 10;
      reason = "LDL cholesterol elevated";
    } else {
      severity = "mild";
      deduction = 6;
      reason = "LDL cholesterol mildly above range";
    }
  } else if (v.canonicalName === "bilirubin_direct" && v.status === "high") {
    severity = n > 1 ? "moderate" : "mild";
    deduction = severity === "moderate" ? 10 : 5;
    reason = "Direct bilirubin above reference";
  } else if (v.canonicalName === "pcv" && v.status === "low") {
    severity = n < 35 ? "moderate" : "mild";
    deduction = severity === "moderate" ? 10 : 5;
    reason = "Packed cell volume below reference";
  } else if (v.canonicalName === "hba1c" && v.status === "high") {
    severity = n >= 6.5 ? "major" : n >= 5.7 ? "moderate" : "mild";
    deduction = severity === "major" ? 16 : severity === "moderate" ? 10 : 5;
    reason = "HbA1c above target range";
  } else if (v.canonicalName === "fasting_glucose" && v.status === "high") {
    severity = n >= 126 ? "major" : n >= 100 ? "moderate" : "mild";
    deduction = severity === "major" ? 14 : severity === "moderate" ? 8 : 4;
    reason = "Fasting glucose elevated";
  } else if (v.canonicalName === "creatinine" && v.status === "high") {
    severity = "moderate";
    deduction = 12;
    reason = "Creatinine above reference";
  } else if (v.canonicalName === "hemoglobin" && v.status === "low") {
    severity = n < 10 ? "major" : n < 12 ? "moderate" : "mild";
    deduction = severity === "major" ? 16 : severity === "moderate" ? 10 : 5;
    reason = "Hemoglobin below reference";
  } else {
    deduction = v.status === "high" ? 6 : 5;
  }

  return {
    canonicalName: v.canonicalName,
    value: n,
    unit: v.unit,
    status: v.status,
    severity,
    deduction,
    reason,
  };
}

export function computeHealthScoreFromLabs(
  values: ParsedLabValue[]
): HealthScoreResult {
  const factors: HealthScoreFactor[] = [];
  for (const v of values) {
    const f = severityForMarker(v);
    if (f) factors.push(f);
  }

  factors.sort((a, b) => b.deduction - a.deduction);
  const totalDeduction = factors.reduce((s, f) => s + f.deduction, 0);
  const score = Math.max(0, Math.min(100, 100 - totalDeduction));

  return { score, factors };
}
