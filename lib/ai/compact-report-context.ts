import type { AiHealthContextBundle } from "@/lib/report-context-service";
import {
  formatStructuredValuesForPrompt,
  type ParsedLabValue,
} from "@/lib/lab-value-parser";
import { selectRelevantSnippets } from "@/lib/ai/relevant-snippet-selector";
import {
  hashInput,
  estimateTokens,
} from "@/lib/ai/token-usage";
import {
  isCompactContextOnly,
  rawTextMaxChars,
  isAiDebugContext,
} from "@/lib/ai/model-router";
import { buildIndianDietContextBlock } from "@/lib/diet/indian-diet-context";
import {
  loadUserLocationContext,
  formatLocationForPrompt,
  type LocationContext,
} from "@/lib/location/location-context";
import {
  loadWeatherContext,
  formatWeatherForPrompt,
  type WeatherContext,
} from "@/lib/weather/weather-context";
import { computeHealthScoreFromLabValues } from "@/lib/health-score";

export type CompactReportContext = {
  structuredBlock: string;
  abnormalBlock: string;
  normalBlock: string;
  userContextBlock: string;
  locationBlock: string;
  weatherBlock: string;
  indianDietBlock: string;
  scoreFactorsBlock: string;
  rawTextFallback: string;
  usedRawText: boolean;
  structuredCount: number;
  contextHash: string;
  promptText: string;
  estimatedInputTokens: number;
};

export type DebugContextStats = {
  contextType: "compact" | "compact+snippet" | "full_text_fallback";
  estimatedInputTokens: number;
  rawTextCharsSent: number;
  structuredValuesSent: number;
  cacheHit: boolean;
};

function compactUserContext(healthContext: AiHealthContextBundle): string {
  const q = healthContext.questionnaire || {};
  const pick = (k: string) => (q as Record<string, unknown>)[k];
  const lines: string[] = ["USER CONTEXT (questionnaire — not from uploaded report):"];
  if (healthContext.skipped) {
    lines.push("User skipped detailed questionnaire.");
  }
  const fields = [
    ["foodPreference", pick("foodPreference")],
    ["physicalActivity", pick("physicalActivity")],
    ["sugarIntake", pick("sugarIntake")],
    ["smokingStatus", pick("smokingStatus")],
    ["alcoholUse", pick("alcoholUse")],
    ["knownConditions", pick("knownConditions")],
    ["allergies", pick("allergies")],
    ["symptoms", pick("symptoms")],
    ["sleepQuality", pick("sleepQuality")],
    ["stressLevel", pick("stressLevel")],
    ["waterIntake", pick("waterIntake")],
    ["heightCm", pick("heightCm")],
    ["weightKg", pick("weightKg")],
    ["dietNotes", pick("dietNotes")],
    ["notes", pick("notes")],
  ];
  for (const [label, val] of fields) {
    if (val == null || val === "" || (Array.isArray(val) && !val.length)) continue;
    lines.push(`${label}: ${Array.isArray(val) ? val.join(", ") : String(val)}`);
  }
  if (healthContext.familyProfile) {
    lines.push(`Family profile: ${JSON.stringify(healthContext.familyProfile)}`);
  }
  return lines.join("\n");
}

function splitStructuredBlocks(structured: ParsedLabValue[]): {
  abnormal: string;
  normal: string;
  full: string;
} {
  const abnormal = structured.filter((v) => v.status === "high" || v.status === "low");
  const normal = structured.filter((v) => v.status === "normal").slice(0, 12);
  const abnormalBlock = abnormal.length
    ? "ABNORMAL VALUES:\n" + formatStructuredValuesForPrompt(abnormal)
    : "ABNORMAL VALUES: none parsed as out-of-range.";
  const normalBlock = normal.length
    ? "IMPORTANT NORMAL VALUES:\n" + formatStructuredValuesForPrompt(normal)
    : "";
  return {
    abnormal: abnormalBlock,
    normal: normalBlock,
    full: formatStructuredValuesForPrompt(structured),
  };
}

function shouldUseRawTextFallback(structured: ParsedLabValue[]): boolean {
  return structured.length < 3;
}

function buildRawFallback(
  extractedText: string,
  structured: ParsedLabValue[],
  forceFull: boolean
): { text: string; used: boolean } {
  if (!extractedText?.trim()) return { text: "", used: false };
  const compactOnly = isCompactContextOnly() && !forceFull;
  if (compactOnly && !shouldUseRawTextFallback(structured)) {
    const keywords = structured.map((v) => v.testName).filter(Boolean);
    const snippet = selectRelevantSnippets(extractedText, keywords);
    if (snippet) {
      return { text: `RELEVANT REPORT SNIPPET (fallback only):\n${snippet}`, used: true };
    }
    return { text: "", used: false };
  }
  const cap = rawTextMaxChars();
  return {
    text: `EXTRACTED REPORT TEXT (fallback — structured values are source of truth):\n${extractedText.slice(0, cap)}`,
    used: true,
  };
}

export async function buildCompactReportContext(params: {
  userId: string;
  extractedText: string;
  healthContext: AiHealthContextBundle;
  structuredLabValues: ParsedLabValue[];
  reportSummary?: string | null;
  healthRisks?: Array<{ title: string; level: string; message: string }>;
  forceRawText?: boolean;
  location?: LocationContext | null;
  weather?: WeatherContext | null;
}): Promise<CompactReportContext> {
  const structured = params.structuredLabValues;
  const { abnormal, normal, full } = splitStructuredBlocks(structured);
  const location =
    params.location ?? (await loadUserLocationContext(params.userId));
  const weather =
    params.weather ??
    (await loadWeatherContext({ city: location?.city, state: location?.state }));

  const { factors } = computeHealthScoreFromLabValues(structured);
  const scoreFactorsBlock = factors.length
    ? `SCORE FACTORS:\n${factors.map((f) => `- ${f.displayName}: ${f.reason} (deduction ${f.deduction})`).join("\n")}`
    : "";

  const risksBlock =
    params.healthRisks?.length
      ? `HEALTH RISKS:\n${params.healthRisks.map((r) => `- [${r.level}] ${r.title}: ${r.message}`).join("\n")}`
      : "";

  const summaryBlock = params.reportSummary?.trim()
    ? `REPORT SUMMARY (existing):\n${params.reportSummary.slice(0, 2000)}`
    : "";

  const raw = buildRawFallback(
    params.extractedText,
    structured,
    Boolean(params.forceRawText)
  );

  const blocks = [
    "=== STRUCTURED LAB VALUES (SOURCE OF TRUTH) ===",
    full,
    abnormal,
    normal,
    scoreFactorsBlock,
    risksBlock,
    summaryBlock,
    compactUserContext(params.healthContext),
    formatLocationForPrompt(location),
    formatWeatherForPrompt(weather),
    buildIndianDietContextBlock({
      structured,
      healthContext: params.healthContext,
      location,
    }),
    "",
    "OUTPUT LIMITS: foodRecommendations 5–7 items; exerciseRecommendations 5–7; lifestyleAdvice 5–7. Indian diet examples. No invented weather.",
    raw.text,
  ].filter(Boolean);

  const promptText = blocks.join("\n\n");
  const contextHash = hashInput([
    full,
    compactUserContext(params.healthContext),
    location?.regionHint,
    weather?.temperatureCategory,
    params.reportSummary?.slice(0, 500),
  ]);

  return {
    structuredBlock: full,
    abnormalBlock: abnormal,
    normalBlock: normal,
    userContextBlock: compactUserContext(params.healthContext),
    locationBlock: formatLocationForPrompt(location),
    weatherBlock: formatWeatherForPrompt(weather),
    indianDietBlock: buildIndianDietContextBlock({
      structured,
      healthContext: params.healthContext,
      location,
    }),
    scoreFactorsBlock,
    rawTextFallback: raw.text,
    usedRawText: raw.used,
    structuredCount: structured.length,
    contextHash,
    promptText,
    estimatedInputTokens: estimateTokens(promptText),
  };
}

export function buildDebugContextStats(
  ctx: CompactReportContext,
  cacheHit = false
): DebugContextStats {
  let contextType: DebugContextStats["contextType"] = "compact";
  if (ctx.usedRawText && ctx.rawTextFallback.includes("EXTRACTED REPORT TEXT")) {
    contextType = "full_text_fallback";
  } else if (ctx.usedRawText) {
    contextType = "compact+snippet";
  }
  return {
    contextType,
    estimatedInputTokens: ctx.estimatedInputTokens,
    rawTextCharsSent: ctx.rawTextFallback.length,
    structuredValuesSent: ctx.structuredCount,
    cacheHit,
  };
}

export function shouldAttachDebugStats(isAdmin?: boolean): boolean {
  return isAiDebugContext() || Boolean(isAdmin && process.env.NODE_ENV !== "production");
}
