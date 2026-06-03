import type { MedicalSummaryResult } from "@/lib/ai-summary";
import type { ParsedLabValue } from "@/lib/lab-value-parser";
import {
  GENERIC_CATEGORY_LABELS,
  categoryHasStructuredMarker,
  THYROID_CANONICAL,
  LIPID_CANONICAL,
} from "@/lib/lab-test-aliases";

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

  const hasUnknownFindings = issues.some((i) =>
    i.code.startsWith("UNKNOWN") || i.code.startsWith("GENERIC")
  );

  return {
    valid: issues.length === 0,
    issues,
    hasUnknownFindings,
  };
}
