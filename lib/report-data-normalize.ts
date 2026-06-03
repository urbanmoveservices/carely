import type {
  AbnormalValue,
  ChartDataPoint,
  ContextualInsight,
  KeyFinding,
  RiskFlag,
} from "@/types";

export function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function safeString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (value == null) return fallback;
  return String(value);
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => safeString(item).trim())
    .filter((s) => s.length > 0);
}

function normalizeSeverity(value: unknown): AbnormalValue["severity"] {
  if (
    value === "low" ||
    value === "moderate" ||
    value === "high" ||
    value === "critical"
  ) {
    return value;
  }
  return "unknown";
}

export function normalizeAbnormalValues(raw: unknown): AbnormalValue[] {
  return asArray<Partial<AbnormalValue>>(raw)
    .map((item) => ({
      name: typeof item?.name === "string" ? item.name : "",
      value: typeof item?.value === "string" ? item.value : String(item?.value ?? ""),
      normalRange: typeof item?.normalRange === "string" ? item.normalRange : "",
      severity: normalizeSeverity(item?.severity),
      meaning: typeof item?.meaning === "string" ? item.meaning : "",
    }))
    .filter((item) => item.name.trim().length > 0);
}

export function normalizeKeyFindings(raw: unknown): KeyFinding[] {
  return asArray<Partial<KeyFinding>>(raw)
    .map((item) => ({
      title: typeof item?.title === "string" ? item.title : "",
      value: typeof item?.value === "string" ? item.value : String(item?.value ?? ""),
      status:
        item?.status === "normal" ||
        item?.status === "low" ||
        item?.status === "high" ||
        item?.status === "critical" ||
        item?.status === "unknown"
          ? item.status
          : "unknown",
      explanation: typeof item?.explanation === "string" ? item.explanation : "",
    }))
    .filter((item) => item.title.trim().length > 0);
}

function inferRiskLevelFromText(text: string): RiskFlag["level"] {
  const lower = text.toLowerCase();
  if (
    lower.includes("critical") ||
    lower.includes("urgent") ||
    lower.includes("emergency") ||
    lower.includes("immediate")
  ) {
    return "critical";
  }
  if (lower.includes("warning") || lower.includes("high") || lower.includes("elevated")) {
    return "warning";
  }
  return "info";
}

export function normalizeRiskFlags(raw: unknown): RiskFlag[] {
  if (!Array.isArray(raw)) return [];

  return raw.map((flag) => {
    if (typeof flag === "string") {
      const message = flag.trim() || "Report contains a flag that may need attention.";
      return { level: inferRiskLevelFromText(message), message };
    }
    if (flag && typeof flag === "object") {
      const obj = flag as Partial<RiskFlag> & { severity?: string };
      const message =
        typeof obj.message === "string" && obj.message.trim()
          ? obj.message.trim()
          : "Report contains a flag that may need attention based on uploaded data.";
      const level =
        obj.level === "critical" || obj.level === "warning" || obj.level === "info"
          ? obj.level
          : inferRiskLevelFromText(
              `${obj.level ?? ""} ${obj.severity ?? ""} ${message}`
            );
      return { level, message };
    }
    return {
      level: "info" as const,
      message: "Report contains a flag that may need attention based on uploaded data.",
    };
  });
}

export function normalizeContextualInsights(raw: unknown): ContextualInsight[] {
  return asArray<Partial<ContextualInsight>>(raw)
    .map((item) => ({
      title: typeof item?.title === "string" ? item.title : "Insight",
      message: typeof item?.message === "string" ? item.message : "",
      relatedContext: Array.isArray(item?.relatedContext)
        ? item.relatedContext.filter((s): s is string => typeof s === "string")
        : undefined,
      level:
        item?.level === "critical" ||
        item?.level === "warning" ||
        item?.level === "info"
          ? item.level
          : "info",
    }))
    .filter((item) => item.message.trim().length > 0);
}

export type NormalizedReportPdfContent = {
  summary: string;
  keyFindings: KeyFinding[];
  abnormalValues: AbnormalValue[];
  foodRecommendations: string[];
  exerciseRecommendations: string[];
  lifestyleAdvice: string[];
  riskFlags: RiskFlag[];
  chartData: ChartDataPoint[];
  contextualInsights: ContextualInsight[];
  healthScore: number | null;
  aiModelUsed: string;
  processingTimeMs: number | null;
};

export function normalizeReportForPdf(report: {
  summary?: unknown;
  keyFindings?: unknown;
  abnormalValues?: unknown;
  foodRecommendations?: unknown;
  exerciseRecommendations?: unknown;
  lifestyleAdvice?: unknown;
  riskFlags?: unknown;
  chartData?: unknown;
  contextualInsights?: unknown;
  healthScore?: unknown;
  aiModelUsed?: unknown;
  processingTimeMs?: unknown;
}): NormalizedReportPdfContent {
  return {
    summary: safeString(report.summary, "Summary not available."),
    keyFindings: normalizeKeyFindings(report.keyFindings),
    abnormalValues: normalizeAbnormalValues(report.abnormalValues),
    foodRecommendations: safeStringArray(report.foodRecommendations),
    exerciseRecommendations: safeStringArray(report.exerciseRecommendations),
    lifestyleAdvice: safeStringArray(report.lifestyleAdvice),
    riskFlags: normalizeRiskFlags(report.riskFlags),
    chartData: normalizeChartData(report.chartData),
    contextualInsights: normalizeContextualInsights(report.contextualInsights),
    healthScore:
      typeof report.healthScore === "number" && !Number.isNaN(report.healthScore)
        ? Math.min(100, Math.max(0, Math.round(report.healthScore)))
        : null,
    aiModelUsed: safeString(report.aiModelUsed, "OpenAI") || "OpenAI",
    processingTimeMs:
      typeof report.processingTimeMs === "number" && !Number.isNaN(report.processingTimeMs)
        ? report.processingTimeMs
        : null,
  };
}

export function normalizeChartData(raw: unknown): ChartDataPoint[] {
  return asArray<Partial<ChartDataPoint>>(raw)
    .map((c) => ({
      label: typeof c?.label === "string" ? c.label : "",
      value: typeof c?.value === "number" ? c.value : parseFloat(String(c?.value ?? "NaN")),
      normalMin: typeof c?.normalMin === "number" ? c.normalMin : undefined,
      normalMax: typeof c?.normalMax === "number" ? c.normalMax : undefined,
      unit: typeof c?.unit === "string" ? c.unit : undefined,
    }))
    .filter((c) => c.label && !Number.isNaN(c.value));
}

export function textBlob(parts: string[]): string {
  return parts.join(" ").toLowerCase();
}

export function matchesCategory(text: string, keywords: string[]): boolean {
  const t = text.toLowerCase();
  return keywords.some((k) => t.includes(k));
}

export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  sugar: ["glucose", "fasting blood sugar", "blood sugar", "random blood sugar", "hba1c", "sugar", "diabetes"],
  cholesterol: ["cholesterol", "ldl", "hdl", "triglycerides", "lipid", "vldl"],
  bp: ["blood pressure", "systolic", "diastolic", " bp"],
  liver: ["sgpt", "alt", "sgot", "ast", "bilirubin", "liver"],
  kidney: ["creatinine", "urea", "uric acid", "egfr", "kidney"],
  thyroid: ["tsh", "t3", "t4", "thyroid"],
  vitamin: ["vitamin d", "vitamin b12", "iron", "ferritin", "folate"],
  cbc: ["hemoglobin", " hb", "wbc", "rbc", "platelet", "neutrophil", "lymphocyte", "eosinophil", "anemia"],
  infection: ["fever", "infection", "crp", "esr"],
  lifestyle: ["smoking", "alcohol", "sedentary", "stress", "sleep", "sugar intake"],
};

export function detectCategory(label: string): string {
  const t = label.toLowerCase();
  for (const [cat, keys] of Object.entries(CATEGORY_KEYWORDS)) {
    if (cat === "lifestyle") continue;
    if (matchesCategory(t, keys)) return cat;
  }
  return "general";
}

export function severityToLevel(
  severity: string,
  flagLevel?: string
): "info" | "warning" | "critical" {
  if (flagLevel === "critical" || severity === "critical") return "critical";
  if (severity === "high" || severity === "moderate" || flagLevel === "warning")
    return "warning";
  return "info";
}

export function safeRiskMessage(category: string, markerLabel?: string): string {
  const base =
    "Based on your uploaded report data, this marker may need attention and could support diagnosis or treatment planning. Discuss with your doctor as needed.";
  if (markerLabel) {
    return `${markerLabel} in your report may need review. ${base}`;
  }
  const titles: Record<string, string> = {
    sugar: "Blood sugar related values in your report may need attention.",
    cholesterol: "Cholesterol or lipid related values may need attention.",
    bp: "Blood pressure related values may need attention.",
    liver: "Liver related markers may need attention.",
    kidney: "Kidney related markers may need attention.",
    thyroid: "Thyroid related markers may need attention.",
    vitamin: "Vitamin or mineral related markers may need attention.",
    cbc: "Blood count related markers may need attention.",
    lifestyle: "Lifestyle factors combined with your report may be worth discussing with a doctor.",
    general: "Some findings in your report may need medical review.",
  };
  return `${titles[category] || titles.general} ${base}`;
}

export const DEFAULT_SUGGESTED_ACTIONS = [
  "Discuss this value with your doctor",
  "Keep a copy of this report for your next visit",
  "Track related markers over time in Vaidya GPT",
];
