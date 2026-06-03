import type { MedicalSummaryResult, KeyFinding, AbnormalValue, ChartDataPoint } from "@/lib/ai-summary";
import type { ParsedLabValue } from "@/lib/lab-value-parser";
import {
  displayNameForCanonical,
  GENERIC_CATEGORY_LABELS,
  categoryHasStructuredMarker,
  THYROID_CANONICAL,
  LIPID_CANONICAL,
} from "@/lib/lab-test-aliases";
import { computeHealthScoreFromLabs } from "@/lib/health-score";

const STRUCTURED_NOTE =
  "Summary generated using structured lab values from your uploaded report.";

const GENERIC_UNKNOWN_TEXT_PATTERNS: RegExp[] = [
  /thyroid\s+function\s*:\s*unknown/gi,
  /cholesterol\s+levels\s*:\s*unknown/gi,
  /lipid\s+profile\s*:\s*unknown/gi,
  /liver\s+function\s*:\s*unknown/gi,
  /kidney\s+function\s*:\s*unknown/gi,
  /blood\s+sugar\s*:\s*unknown/gi,
  /value\s*:\s*unknown/gi,
  /normal\s*:\s*unknown/gi,
  /thyroid\s+function\s+finding/gi,
  /cholesterol\s+levels\s+finding/gi,
  /thyroid\s+function\s+may\s+need\s+attention/gi,
  /cholesterol\s+levels\s+may\s+need\s+attention/gi,
];

function hasThyroidStructured(canonical: Set<string>): boolean {
  return THYROID_CANONICAL.some((c) => canonical.has(c));
}

function hasLipidStructured(canonical: Set<string>): boolean {
  return LIPID_CANONICAL.some((c) => canonical.has(c));
}

/** Remove generic unknown lab phrases when structured markers exist. */
export function removeGenericUnknownLabText(
  text: string,
  structured: ParsedLabValue[]
): string {
  if (!text?.trim() || structured.length === 0) return text;

  const canonical = new Set(structured.map((v) => v.canonicalName));
  let out = text;

  for (const pattern of GENERIC_UNKNOWN_TEXT_PATTERNS) {
    out = out.replace(pattern, "");
  }

  if (hasThyroidStructured(canonical)) {
    out = out.replace(/thyroid\s+function[^.;\n]*unknown[^.;\n]*[.;]?/gi, "");
  }
  if (hasLipidStructured(canonical)) {
    out = out.replace(/cholesterol\s+levels[^.;\n]*unknown[^.;\n]*[.;]?/gi, "");
    out = out.replace(/lipid\s+profile[^.;\n]*unknown[^.;\n]*[.;]?/gi, "");
  }

  out = out
    .replace(/\s{2,}/g, " ")
    .replace(/([.;])\s*\1+/g, "$1")
    .replace(/^\s*[.;]\s*/g, "")
    .trim();

  return out;
}

function textLooksGenericUnknown(s: string, canonical: Set<string>): boolean {
  const t = s.toLowerCase();
  if (GENERIC_UNKNOWN_TEXT_PATTERNS.some((p) => {
    p.lastIndex = 0;
    return p.test(t);
  })) {
    return true;
  }
  if (/\bthyroid\s+function\b/i.test(t) && /\bunknown\b/i.test(t) && hasThyroidStructured(canonical)) {
    return true;
  }
  if (/\bcholesterol\s+levels\b/i.test(t) && /\bunknown\b/i.test(t) && hasLipidStructured(canonical)) {
    return true;
  }
  return false;
}

function isGenericOrUnknown(title: string, canonical: Set<string>): boolean {
  const t = title.toLowerCase();
  if (textLooksGenericUnknown(t, canonical)) return true;
  if (/\bunknown\b/i.test(t) && canonical.size > 0) {
    if (GENERIC_CATEGORY_LABELS.some((g) => t.includes(g))) return true;
    if (categoryHasStructuredMarker(t, canonical)) return true;
  }
  if (GENERIC_CATEGORY_LABELS.some((g) => t.includes(g))) {
    return categoryHasStructuredMarker(t, canonical);
  }
  return categoryHasStructuredMarker(t, canonical);
}

function formatValue(v: ParsedLabValue): string {
  const num = v.numericValue != null ? String(v.numericValue) : String(v.value);
  return v.unit ? `${num} ${v.unit}` : num;
}

function severityFromStatus(
  status: ParsedLabValue["status"]
): AbnormalValue["severity"] {
  if (status === "high") return "moderate";
  if (status === "low") return "low";
  return "unknown";
}

function statusToKeyStatus(
  status: ParsedLabValue["status"]
): KeyFinding["status"] {
  if (status === "high") return "high";
  if (status === "low") return "low";
  if (status === "normal") return "normal";
  return "unknown";
}

function explanationForParsed(v: ParsedLabValue): string {
  const title = v.testName || displayNameForCanonical(v.canonicalName);
  const ref = v.referenceRange ? ` ${v.referenceRange}` : "";
  switch (v.canonicalName) {
    case "tsh":
      return `Uploaded report shows TSH above the reference range${ref || " 0.27–4.20"}. Discuss thyroid follow-up with your doctor.`;
    case "ldl":
      return `Uploaded report shows LDL above the reference target${ref || " <100"}. Discuss lipid risk and lifestyle plan with your doctor.`;
    case "bilirubin_direct":
      return `Uploaded report shows direct bilirubin mildly above reference${ref || " <0.20"}.`;
    case "pcv":
      return `Uploaded report shows PCV slightly below the reference range${ref || " 40–50"}.`;
    default:
      return `Uploaded report shows ${title} ${formatValue(v)}${
        ref ? ` (reference${ref})` : ""
      }, which is ${v.status}. Confirm with your doctor.`;
  }
}

function buildFindingFromParsed(v: ParsedLabValue): KeyFinding {
  const title = v.testName || displayNameForCanonical(v.canonicalName);
  return {
    title,
    value: formatValue(v),
    status: statusToKeyStatus(v.status),
    explanation: explanationForParsed(v),
  };
}

function buildAbnormalFromParsed(v: ParsedLabValue): AbnormalValue {
  const name = v.testName || displayNameForCanonical(v.canonicalName);
  return {
    name,
    value: formatValue(v),
    normalRange: v.referenceRange || "See report",
    severity: severityFromStatus(v.status),
    meaning: explanationForParsed(v),
  };
}

function normalizeTitleKey(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function dedupeKeyFindings(findings: KeyFinding[]): KeyFinding[] {
  const byKey = new Map<string, KeyFinding>();
  for (const k of findings) {
    const key = normalizeTitleKey(k.title);
    const existing = byKey.get(key);
    if (!existing || (existing.status === "unknown" && k.status !== "unknown")) {
      byKey.set(key, k);
    }
  }
  return [...byKey.values()];
}

function dedupeAbnormalValues(values: AbnormalValue[]): AbnormalValue[] {
  const byKey = new Map<string, AbnormalValue>();
  for (const a of values) {
    const key = normalizeTitleKey(a.name);
    const existing = byKey.get(key);
    if (
      !existing ||
      (/\bunknown\b/i.test(existing.value) && !/\bunknown\b/i.test(a.value))
    ) {
      byKey.set(key, a);
    }
  }
  return [...byKey.values()];
}

function dedupeRiskFlags(
  flags: MedicalSummaryResult["riskFlags"]
): MedicalSummaryResult["riskFlags"] {
  const seen = new Set<string>();
  return flags.filter((r) => {
    const key = r.message.toLowerCase().slice(0, 80);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sanitizeRecommendationLines(
  lines: string[] | undefined,
  structured: ParsedLabValue[]
): string[] {
  if (!lines?.length) return lines ?? [];
  return lines
    .map((line) => removeGenericUnknownLabText(line, structured))
    .filter((line) => {
      if (!line.trim()) return false;
      return !textLooksGenericUnknown(line, new Set(structured.map((v) => v.canonicalName)));
    });
}

function buildStructuredSummaryAppendix(structured: ParsedLabValue[]): string {
  const abnormal = structured.filter((v) => v.status === "high" || v.status === "low");
  if (!abnormal.length) return "";
  const lines = abnormal.map(
    (v) =>
      `${v.testName || displayNameForCanonical(v.canonicalName)}: ${formatValue(v)} (${v.status}${
        v.referenceRange ? `, ref ${v.referenceRange}` : ""
      })`
  );
  return `Uploaded report shows: ${lines.join("; ")}.`;
}

export function repairReportSummary(
  summary: MedicalSummaryResult,
  structured: ParsedLabValue[]
): MedicalSummaryResult {
  const canonical = new Set(structured.map((v) => v.canonicalName));
  const abnormalStructured = structured.filter(
    (v) => v.status === "high" || v.status === "low"
  );

  let keyFindings = (summary.keyFindings || []).filter((k) => {
    const blob = `${k.title} ${k.value} ${k.explanation || ""}`;
    return !isGenericOrUnknown(blob, canonical);
  });

  let abnormalValues = (summary.abnormalValues || []).filter((a) => {
    const blob = `${a.name} ${a.value} ${a.normalRange} ${a.meaning || ""}`;
    if (isGenericOrUnknown(blob, canonical)) return false;
    if (structured.length > 0 && /\bunknown\b/i.test(a.value)) return false;
    if (structured.length > 0 && /\bunknown\b/i.test(a.normalRange)) return false;
    return true;
  });

  const existingAbnormalNames = new Set(
    abnormalValues.map((a) => normalizeTitleKey(a.name))
  );
  const existingFindingTitles = new Set(
    keyFindings.map((k) => normalizeTitleKey(k.title))
  );

  for (const v of abnormalStructured) {
    const nameKey = normalizeTitleKey(
      v.testName || displayNameForCanonical(v.canonicalName)
    );
    if (!existingAbnormalNames.has(nameKey)) {
      abnormalValues.push(buildAbnormalFromParsed(v));
      existingAbnormalNames.add(nameKey);
    }
    if (!existingFindingTitles.has(nameKey)) {
      keyFindings.push(buildFindingFromParsed(v));
      existingFindingTitles.add(nameKey);
    }
  }

  keyFindings = dedupeKeyFindings(keyFindings);
  abnormalValues = dedupeAbnormalValues(abnormalValues);

  const chartData: ChartDataPoint[] = [...(summary.chartData || [])].filter(
    (c) => !isGenericOrUnknown(c.label, canonical)
  );
  const chartLabels = new Set(chartData.map((c) => c.label.toLowerCase()));
  for (const v of structured) {
    if (v.numericValue == null) continue;
    const label = v.testName || displayNameForCanonical(v.canonicalName);
    if (chartLabels.has(label.toLowerCase())) continue;
    chartData.push({
      label,
      value: v.numericValue,
      normalMin: v.referenceMin,
      normalMax: v.referenceMax,
      unit: v.unit || undefined,
    });
    chartLabels.add(label.toLowerCase());
  }

  const { score, factors } = computeHealthScoreFromLabs(structured);

  let text = removeGenericUnknownLabText(summary.summary || "", structured);
  if (!text.includes(STRUCTURED_NOTE)) {
    text = `${STRUCTURED_NOTE}\n\n${text}`.trim();
  }
  const appendix = buildStructuredSummaryAppendix(structured);
  if (appendix && !text.toLowerCase().includes("uploaded report shows")) {
    text = `${text}\n\n${appendix}`.trim();
  }
  text = removeGenericUnknownLabText(text, structured);

  let riskFlags = (summary.riskFlags || []).filter(
    (r) => !isGenericOrUnknown(r.message, canonical)
  );
  riskFlags = dedupeRiskFlags(
    riskFlags.map((r) => ({
      ...r,
      message: removeGenericUnknownLabText(r.message, structured),
    }))
  );

  const contextualInsights = summary.contextualInsights
    ?.map((ins) => ({
      ...ins,
      title: removeGenericUnknownLabText(ins.title, structured),
      message: removeGenericUnknownLabText(ins.message, structured),
    }))
    .filter(
      (ins) =>
        ins.message.trim().length > 0 &&
        !textLooksGenericUnknown(`${ins.title} ${ins.message}`, canonical)
    );

  return {
    ...summary,
    summary: text,
    keyFindings,
    abnormalValues,
    chartData,
    riskFlags,
    healthScore: score,
    contextualInsights,
    foodRecommendations: sanitizeRecommendationLines(
      summary.foodRecommendations,
      structured
    ),
    exerciseRecommendations: sanitizeRecommendationLines(
      summary.exerciseRecommendations,
      structured
    ),
    lifestyleAdvice: sanitizeRecommendationLines(summary.lifestyleAdvice, structured),
    ...(factors.length ? { _scoreFactors: factors } : {}),
  } as MedicalSummaryResult & { _scoreFactors?: typeof factors };
}

export function buildDeterministicSummary(
  structured: ParsedLabValue[]
): MedicalSummaryResult {
  const abnormal = structured.filter((v) => v.status === "high" || v.status === "low");
  const normal = structured.filter((v) => v.status === "normal").slice(0, 8);

  const keyFindings = dedupeKeyFindings([...abnormal, ...normal].map(buildFindingFromParsed));
  const abnormalValues = dedupeAbnormalValues(abnormal.map(buildAbnormalFromParsed));
  const { score } = computeHealthScoreFromLabs(structured);

  const lines = abnormal.map(
    (v) =>
      `${v.testName}: ${formatValue(v)} (${v.status}${
        v.referenceRange ? `, ref ${v.referenceRange}` : ""
      })`
  );

  return {
    summary: `${STRUCTURED_NOTE}\n\n${buildStructuredSummaryAppendix(structured) || "Parsed report values reviewed."} User-provided questionnaire context is listed separately in contextual insights. Confirm all results and prescriptions with your doctor.`,
    keyFindings,
    abnormalValues,
    foodRecommendations: [],
    exerciseRecommendations: [],
    lifestyleAdvice: [
      "Treatment: Review uploaded lab values with your doctor before starting or changing any medication.",
    ],
    riskFlags: abnormal.map((v) => ({
      level: v.status === "high" ? ("warning" as const) : ("info" as const),
      message: `${v.testName} ${v.status} on uploaded report (${formatValue(v)}).`,
    })),
    chartData: structured
      .filter((v) => v.numericValue != null)
      .map((v) => ({
        label: v.testName,
        value: v.numericValue!,
        normalMin: v.referenceMin,
        normalMax: v.referenceMax,
        unit: v.unit || undefined,
      })),
    healthScore: score,
  };
}

export { STRUCTURED_NOTE };
