import type { ParsedLabValue } from "@/lib/lab-value-parser";
import { displayNameForCanonical } from "@/lib/lab-test-aliases";

const LIVER_ENZYMES = new Set(["sgot", "sgpt", "alp", "ggt"]);

export function shouldCreateRiskForLab(v: ParsedLabValue): boolean {
  if (v.status !== "high" && v.status !== "low") return false;
  if (v.confidence < 0.5) return false;

  if (v.canonicalName === "egfr" && v.numericValue != null) {
    if (v.numericValue >= 90 && v.status !== "low") return false;
    if (v.status === "high") return false;
  }

  return true;
}

export function canonicalRiskKeyForLab(v: ParsedLabValue): string {
  const status = v.status === "high" ? "high" : v.status === "low" ? "low" : "abnormal";

  if (v.canonicalName === "sgot") return `liver_ast_${status}`;
  if (v.canonicalName === "sgpt") return `liver_alt_${status}`;
  if (v.canonicalName === "egfr") return v.status === "low" ? "kidney_egfr_low" : `kidney_egfr_${status}`;
  if (v.canonicalName === "creatinine") return `kidney_creatinine_${status}`;
  if (v.canonicalName === "hba1c") return `glucose_hba1c_${status}`;
  if (v.canonicalName === "fasting_glucose") return `glucose_fasting_${status}`;
  if (v.canonicalName === "pp_glucose") return `glucose_pp_${status}`;
  if (v.canonicalName === "random_glucose") return `glucose_random_${status}`;
  if (v.canonicalName === "tsh") return `thyroid_tsh_${status}`;
  if (v.canonicalName === "ft3") return `thyroid_ft3_${status}`;
  if (v.canonicalName === "ft4") return `thyroid_ft4_${status}`;
  if (v.canonicalName === "ldl") return `lipid_ldl_${status}`;
  if (v.canonicalName === "triglycerides") return `lipid_triglycerides_${status}`;
  if (v.canonicalName === "hdl") return `lipid_hdl_${status}`;
  if (v.canonicalName === "total_cholesterol") return `lipid_total_cholesterol_${status}`;
  if (v.canonicalName === "hemoglobin") return `cbc_hemoglobin_${status}`;
  if (v.canonicalName === "pcv") return `cbc_pcv_${status}`;
  if (v.canonicalName === "platelet_count") return `cbc_platelets_${status}`;
  if (v.canonicalName === "wbc_count") return `cbc_wbc_${status}`;
  if (v.canonicalName === "vitamin_d") return `vitamin_d_${status}`;
  if (v.canonicalName === "vitamin_b12") return `vitamin_b12_${status}`;

  const cat = detectCategoryFromCanonical(v.canonicalName);
  return `${cat}_${v.canonicalName}_${status}`;
}

export function liverEnzymesElevatedKey(): string {
  return "liver_enzymes_elevated";
}

export function isLiverEnzymeMarker(canonicalName: string): boolean {
  return LIVER_ENZYMES.has(canonicalName);
}

export function riskTitleForLab(v: ParsedLabValue): string {
  const name = v.testName || displayNameForCanonical(v.canonicalName);
  if (v.status === "high") {
    if (v.canonicalName === "tsh") return "TSH high — thyroid follow-up suggested";
    if (v.canonicalName === "ldl") return "LDL cholesterol elevated";
    if (v.canonicalName === "sgot") return "AST/SGOT elevated";
    if (v.canonicalName === "sgpt") return "ALT/SGPT elevated";
    if (v.canonicalName === "hba1c") return "HbA1c above target range";
    if (v.canonicalName === "fasting_glucose") return "Fasting glucose elevated";
    return `${name} high`;
  }
  if (v.status === "low") {
    if (v.canonicalName === "pcv") return "PCV slightly low";
    if (v.canonicalName === "hemoglobin") return "Hemoglobin below reference";
    if (v.canonicalName === "egfr") return "eGFR below reference range";
    if (v.canonicalName === "vitamin_d") return "Vitamin D below recommended range";
    return `${name} low`;
  }
  return `${name} — review suggested`;
}

export function riskMessageForLab(v: ParsedLabValue): string {
  const val = v.numericValue != null ? String(v.numericValue) : String(v.value);
  const unit = v.unit ? ` ${v.unit}` : "";
  const ref = v.referenceRange ? ` (reference ${v.referenceRange})` : "";
  return `Uploaded report shows ${v.testName || displayNameForCanonical(v.canonicalName)}: ${val}${unit}${ref}. Based on uploaded report data—not a final diagnosis.`;
}

export function riskLevelFromLab(v: ParsedLabValue): "info" | "warning" | "critical" {
  const n = v.numericValue;
  if (v.canonicalName === "tsh" && n != null && n > 10) return "warning";
  if (v.canonicalName === "egfr" && n != null && n < 30) return "critical";
  if (v.canonicalName === "hba1c" && n != null && n >= 6.5) return "warning";
  if (v.canonicalName === "fasting_glucose" && n != null && n >= 126) return "warning";
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
  if (["vitamin_d", "vitamin_b12", "folate"].includes(canonicalName)) {
    return "vitamins";
  }
  return "general";
}
