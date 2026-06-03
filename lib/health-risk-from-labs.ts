import type { ParsedLabValue } from "@/lib/lab-value-parser";
import { displayNameForCanonical } from "@/lib/lab-test-aliases";

export function canonicalRiskKeyForLab(v: ParsedLabValue): string {
  return `${v.category}_${v.canonicalName}_${v.status}`;
}

export function riskTitleForLab(v: ParsedLabValue): string {
  const name = v.testName || displayNameForCanonical(v.canonicalName);
  if (v.status === "high") {
    if (v.canonicalName === "tsh") return "TSH high — thyroid follow-up suggested";
    if (v.canonicalName === "ldl") return "LDL cholesterol mildly high";
    if (v.canonicalName === "bilirubin_direct") return "Direct bilirubin mildly high";
    return `${name} high`;
  }
  if (v.status === "low") {
    if (v.canonicalName === "pcv") return "PCV slightly low";
    return `${name} low`;
  }
  return `${name} — review suggested`;
}

export function riskMessageForLab(v: ParsedLabValue): string {
  const val =
    v.numericValue != null ? String(v.numericValue) : String(v.value);
  const unit = v.unit ? ` ${v.unit}` : "";
  const ref = v.referenceRange ? ` (reference ${v.referenceRange})` : "";
  return `Uploaded report shows ${v.testName || displayNameForCanonical(v.canonicalName)}: ${val}${unit}${ref}. Based on uploaded report data—not a final diagnosis.`;
}

export function riskLevelFromLab(v: ParsedLabValue): "info" | "warning" | "critical" {
  if (v.canonicalName === "tsh" && v.numericValue != null && v.numericValue > 10) {
    return "warning";
  }
  if (v.status === "high" || v.status === "low") return "warning";
  return "info";
}

export function detectCategoryFromCanonical(canonicalName: string): string {
  if (["tsh", "ft3", "ft4", "total_t3", "total_t4", "anti_tpo"].includes(canonicalName)) {
    return "thyroid";
  }
  if (
    ["ldl", "hdl", "triglycerides", "total_cholesterol", "non_hdl_cholesterol", "vldl"].includes(
      canonicalName
    )
  ) {
    return "cholesterol";
  }
  if (canonicalName.includes("bilirubin") || ["sgpt", "sgot", "alp", "ggt"].includes(canonicalName)) {
    return "liver";
  }
  if (["fasting_glucose", "hba1c", "pp_glucose", "random_glucose"].includes(canonicalName)) {
    return "sugar";
  }
  if (["pcv", "hemoglobin", "rbc_count", "wbc_count", "platelet_count"].includes(canonicalName)) {
    return "blood";
  }
  if (["creatinine", "urea", "uric_acid", "egfr"].includes(canonicalName)) {
    return "kidney";
  }
  return "general";
}
