import type { MedicalSummaryResult } from "@/lib/ai-summary";
import type { ParsedLabValue } from "@/lib/lab-value-parser";
import {
  GENERIC_CATEGORY_LABELS,
  categoryHasStructuredMarker,
  THYROID_CANONICAL,
  LIPID_CANONICAL,
} from "@/lib/lab-test-aliases";
import {
  RECOMMENDATION_MAX,
  RECOMMENDATION_MIN,
} from "@/lib/ai/recommendation-limits";
import { isWesternFoodExample } from "@/lib/diet/indian-diet-context";

export type SummaryValidationIssue = {
  code: string;
  message: string;
};

export type SummaryValidationResult = {
  valid: boolean;
  issues: SummaryValidationIssue[];
  hasUnknownFindings: boolean;
};

const UNKNOWN_PATTERNS = [
  /\bunknown\b/i,
  /value:\s*unknown/i,
  /normal:\s*unknown/i,
];

function textHasUnknown(s: string): boolean {
  return UNKNOWN_PATTERNS.some((p) => p.test(s));
}

function isGenericUnknownFinding(title: string, structured: Set<string>): boolean {
  const t = title.toLowerCase().trim();
  if (!textHasUnknown(t) && !GENERIC_CATEGORY_LABELS.some((g) => t.includes(g))) {
    return false;
  }
  if (categoryHasStructuredMarker(t, structured)) return true;
  if (
    (t.includes("thyroid") || t === "thyroid function") &&
    THYROID_CANONICAL.some((c) => structured.has(c))
  ) {
    return true;
  }
  if (
    (t.includes("cholesterol") || t.includes("lipid")) &&
    LIPID_CANONICAL.some((c) => structured.has(c))
  ) {
    return true;
  }
  return textHasUnknown(t) && structured.size > 0;
}

export function validateReportSummary(
  summary: MedicalSummaryResult,
  structured: ParsedLabValue[]
): SummaryValidationResult {
  const issues: SummaryValidationIssue[] = [];
  const canonical = new Set(structured.map((v) => v.canonicalName));
  const abnormal = structured.filter((v) => v.status === "high" || v.status === "low");

  if (abnormal.length > 0) {
    const mentioned = abnormal.filter((v) => {
      const blob = [
        summary.summary,
        ...summary.keyFindings.map((k) => `${k.title} ${k.value}`),
        ...summary.abnormalValues.map((a) => `${a.name} ${a.value}`),
      ].join(" ");
      const num = v.numericValue != null ? String(v.numericValue) : "";
      return (
        blob.toLowerCase().includes(v.canonicalName.replace(/_/g, " ")) ||
        blob.toLowerCase().includes(v.testName.toLowerCase()) ||
        (num && blob.includes(num))
      );
    });
    if (mentioned.length < Math.min(abnormal.length, 1)) {
      issues.push({
        code: "MISSING_ABNORMAL",
        message: "Summary does not mention parsed abnormal lab values",
      });
    }
  }

  for (const k of summary.keyFindings) {
    if (isGenericUnknownFinding(`${k.title} ${k.value}`, canonical)) {
      issues.push({
        code: "UNKNOWN_KEY_FINDING",
        message: `Invalid unknown/generic finding: ${k.title}`,
      });
    }
    if (
      textHasUnknown(String(k.value)) &&
      canonical.size > 0 &&
      !k.title.toLowerCase().includes("pending")
    ) {
      const hasSpecific = [...canonical].some(
        (c) =>
          k.title.toLowerCase().includes(c.replace(/_/g, " ")) ||
          categoryHasStructuredMarker(k.title, canonical)
      );
      if (!hasSpecific) {
        issues.push({
          code: "UNKNOWN_VALUE_KEY",
          message: `keyFinding has Unknown value: ${k.title}`,
        });
      }
    }
  }

  for (const a of summary.abnormalValues) {
    if (
      textHasUnknown(`${a.name} ${a.value} ${a.normalRange}`) &&
      abnormal.length > 0
    ) {
      issues.push({
        code: "UNKNOWN_ABNORMAL_VALUE",
        message: `abnormalValue has Unknown fields: ${a.name}`,
      });
    }
    if (isGenericUnknownFinding(a.name, canonical)) {
      issues.push({
        code: "GENERIC_ABNORMAL",
        message: `Generic unknown abnormal: ${a.name}`,
      });
    }
  }

  for (const r of summary.riskFlags) {
    if (isGenericUnknownFinding(r.message, canonical)) {
      issues.push({
        code: "UNKNOWN_RISK_FLAG",
        message: "riskFlag contains generic unknown marker text",
      });
    }
  }

  for (const [key, arr] of [
    ["foodRecommendations", summary.foodRecommendations],
    ["exerciseRecommendations", summary.exerciseRecommendations],
    ["lifestyleAdvice", summary.lifestyleAdvice],
  ] as const) {
    if (arr.length > RECOMMENDATION_MAX) {
      issues.push({
        code: "RECOMMENDATION_TOO_LONG",
        message: `${key} has ${arr.length} items (max ${RECOMMENDATION_MAX})`,
      });
    }
    const unique = new Set(arr.map((s) => s.trim().toLowerCase()));
    if (unique.size < arr.length) {
      issues.push({ code: "RECOMMENDATION_DUPLICATE", message: `${key} has duplicate items` });
    }
  }

  const foodBlob = summary.foodRecommendations.join(" ");
  if (
    foodBlob.length > 40 &&
    !/\b(dal|roti|rice|sabzi|curd|paneer|chana|palak|methi|dalia)\b/i.test(foodBlob) &&
    isWesternFoodExample(foodBlob)
  ) {
    issues.push({
      code: "FOOD_NOT_INDIAN_AWARE",
      message: "Food recommendations lack Indian diet examples",
    });
  }

  if (/\b(currently raining|pollution is high today|temperature is \d)/i.test(
    [...summary.exerciseRecommendations, ...summary.lifestyleAdvice].join(" ")
  )) {
    issues.push({
      code: "INVENTED_WEATHER",
      message: "Recommendations invent specific weather data",
    });
  }

  const hasUnknownFindings = issues.some((i) =>
    i.code.startsWith("UNKNOWN") || i.code.startsWith("GENERIC")
  );

  return {
    valid: issues.length === 0,
    issues,
    hasUnknownFindings,
  };
}

export function validateRecommendationCounts(
  summary: Pick<
    MedicalSummaryResult,
    "foodRecommendations" | "exerciseRecommendations" | "lifestyleAdvice"
  >
): boolean {
  return (
    summary.foodRecommendations.length >= RECOMMENDATION_MIN &&
    summary.foodRecommendations.length <= RECOMMENDATION_MAX &&
    summary.exerciseRecommendations.length >= RECOMMENDATION_MIN &&
    summary.exerciseRecommendations.length <= RECOMMENDATION_MAX &&
    summary.lifestyleAdvice.length >= RECOMMENDATION_MIN &&
    summary.lifestyleAdvice.length <= RECOMMENDATION_MAX
  );
}
