import { AppError } from "@/lib/app-error";
import { BRAND } from "@/lib/brand";
import {
  assertOpenAiConfigured,
  assertExtractedTextReady,
} from "@/lib/summary-error-messages";
import { getAiLanguageInstruction } from "@/lib/i18n/ai-language";
import type { AiHealthContextBundle } from "@/lib/report-context-service";
import type { ParsedLabValue } from "@/lib/lab-value-parser";
import { buildCompactReportContext } from "@/lib/ai/compact-report-context";
import { getModelForFeature, getMaxOutputTokens } from "@/lib/ai/model-router";
import { logAiUsage } from "@/lib/ai/token-usage";

export interface KeyFinding {
  title: string;
  value: string;
  status: "normal" | "low" | "high" | "critical" | "unknown";
  explanation: string;
}

export interface AbnormalValue {
  name: string;
  value: string;
  normalRange: string;
  severity: "low" | "moderate" | "high" | "critical" | "unknown";
  meaning: string;
}

export interface RiskFlag {
  level: "info" | "warning" | "critical";
  message: string;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  normalMin?: number;
  normalMax?: number;
  unit?: string;
}

export interface ContextualInsight {
  title: string;
  message: string;
  relatedContext?: string[];
  level: "info" | "warning" | "critical";
}

export interface MedicalSummaryResult {
  summary: string;
  keyFindings: KeyFinding[];
  abnormalValues: AbnormalValue[];
  foodRecommendations: string[];
  exerciseRecommendations: string[];
  lifestyleAdvice: string[];
  riskFlags: RiskFlag[];
  chartData: ChartDataPoint[];
  contextualInsights?: ContextualInsight[];
  healthScore?: number;
}

interface GenerateParams {
  documentId: string;
  userId: string;
  reportId?: string | null;
  extractedText: string;
  originalFilename: string;
  uploadMode?: string | null;
  pageCount?: number | null;
  language?: string | null;
  healthContext: AiHealthContextBundle;
  structuredLabValues?: ParsedLabValue[];
}

export type SummaryDebugMeta = {
  debugContextStats?: {
    contextType: string;
    estimatedInputTokens: number;
    rawTextCharsSent: number;
    structuredValuesSent: number;
    cacheHit: boolean;
  };
};

const CONTEXT_RULES = `
You are a clinical medical report analyst. Provide full diagnostic interpretation and treatment guidance based on the extracted report text and user health context.

Rules:
- Use ONLY lab values and findings explicitly present in the extracted report text. Do NOT invent numbers, tests, or results.
- Integrate questionnaire and family profile context to refine differential diagnosis and prescriptions.
- State likely diagnoses and clinical impressions clearly (e.g. prediabetes, hypothyroidism, anemia, dyslipidemia) when supported by the report values and context.
- Provide specific medication recommendations where appropriate: drug class or generic name, typical dose ranges, duration, and monitoring—aligned with Indian clinical practice when context suggests India.
- Include OTC supplements or lifestyle prescriptions when relevant.
- In contextualInsights, give explicit diagnosis-linked and prescription-linked advice (not vague "see a doctor" only).
- In abnormalValues.meaning and keyFindings.explanation, include clinical interpretation and suggested next steps including meds when warranted.
- In lifestyleAdvice, include medication and treatment plan items prefixed clearly (e.g. "Medication: ...", "Treatment: ...").
- Note contraindications, allergies, current medicines, and pregnancy status from context before recommending drugs.
- For emergencies or critical values, state urgency and immediate action in riskFlags.
- Still recommend physician confirmation for starting or changing prescriptions, but do not withhold diagnostic or prescription content.
- Preserve all numbers and units exactly from the report text.

STRUCTURED LAB VALUES (when provided in the user message):
- Treat the STRUCTURED REPORT VALUES block as the source of truth for all numeric results.
- Never output "Unknown" for a test that appears in structured values.
- Use specific marker names (e.g. "TSH Ultrasensitive", "LDL Cholesterol Direct") — never broad labels like "Thyroid Function" or "Cholesterol Levels" when specific markers are listed.
- Separate uploaded report findings ("Uploaded report shows…") from user questionnaire context ("User-provided context mentions…").
- Do not invent symptoms or history not in the extracted report text.
- Do not let user context replace or hide abnormal values from the uploaded report.
- healthScore in JSON will be overwritten server-side — still return a reasonable estimate.

COMPREHENSIVE ACTION PLANS (mandatory — avoid vague one-line tips):

foodRecommendations: Return exactly 5–7 strings only. Each must be practical and specific to THIS report's abnormal values:
- Use Indian diet examples: roti, rice, dal, sabzi, curd, paneer, eggs, fish, pulses, sprouts — avoid kale/quinoa unless user prefers western diet.
- Link foods to labs (e.g. high LDL → dal, vegetables, oats/dalia, less fried snacks).
- Include portion/hydration tips where relevant.
- End with general diet education disclaimer — not a medical diet prescription.

exerciseRecommendations: Return exactly 5–7 strings only:
- Consider activity level, age, symptoms (breathlessness/fatigue), and report risks.
- Adapt to location/weather context when provided (hot → morning/evening walks; rain → indoor yoga; pollution → indoor activity).
- Do not suggest unsafe high-intensity exercise if breathlessness/fatigue symptoms present.
- No invented weather — use only provided weather block.

lifestyleAdvice: Return exactly 5–7 strings only — do not repeat Food/Exercise points:
- Multiple lines starting with "Medication:" (drug/class, typical dose, when to take, duration, lab monitoring).
- Multiple lines starting with "Treatment:" (follow-up tests, specialist, procedures, non-drug care).
- Sleep: target hours, schedule, hygiene habits tied to stress or metabolic health.
- Stress, smoking, alcohol, sugar intake from questionnaire — specific changes.
- Home tracking: BP log, sugar log, weight, symptom diary as relevant.
- Work and daily routine adjustments.
- One line reminding to confirm all prescriptions with their doctor before starting.
Do NOT give only generic advice like "eat healthy" or "exercise regularly" without specifics.
`;

const SYSTEM_PROMPT_BASE = `You are an expert clinical physician assistant for ${BRAND.name}. Analyze medical reports comprehensively: explain results, give likely diagnoses, differential diagnoses, and prescribe evidence-based medications and treatments when indicated.

${CONTEXT_RULES}

Return exactly this JSON structure:
{
  "summary": "Clinical summary with likely diagnosis/differential and treatment overview",
  "keyFindings": [{ "title": "...", "value": "...", "status": "normal|low|high|critical|unknown", "explanation": "Clinical interpretation including diagnosis implications" }],
  "abnormalValues": [{ "name": "...", "value": "...", "normalRange": "...", "severity": "low|moderate|high|critical|unknown", "meaning": "Clinical significance, likely diagnosis link, and treatment/medication suggestions" }],
  "foodRecommendations": ["Diet changes tied to diagnosis and labs"],
  "exerciseRecommendations": ["Activity plan tied to condition"],
  "lifestyleAdvice": ["Include Medication: and Treatment: lines with specific drugs, doses, and monitoring"],
  "riskFlags": [{ "level": "info|warning|critical", "message": "..." }],
  "chartData": [{ "label": "...", "value": 0, "normalMin": 0, "normalMax": 0, "unit": "..." }],
  "contextualInsights": [{ "title": "Diagnosis or treatment focus", "message": "Full diagnostic/prescription guidance linking report + context", "relatedContext": ["sugarIntake"], "level": "info|warning|critical" }],
  "healthScore": 0
}

healthScore is 0-100 based on clinical severity of findings in the report. Return ONLY valid JSON.`;

function buildSystemPrompt(language?: string | null): string {
  return `${SYSTEM_PROMPT_BASE}\n\n${getAiLanguageInstruction(language)}`;
}

async function callOpenAI(
  params: GenerateParams
): Promise<{ result: MedicalSummaryResult; model: string; usage?: { input: number; output: number } }> {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const structuredLabValues = params.structuredLabValues ?? [];
  const compact = await buildCompactReportContext({
    userId: params.userId,
    extractedText: params.extractedText,
    healthContext: params.healthContext,
    structuredLabValues,
  });

  const model = getModelForFeature("summary");
  const maxTokens = getMaxOutputTokens("summary");

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: buildSystemPrompt(params.language) },
      {
        role: "user",
        content: [
          "Provide full clinical diagnosis and prescription recommendations supported by structured lab values and context.",
          "foodRecommendations, exerciseRecommendations, and lifestyleAdvice: exactly 5–7 items each — high quality, Indian-diet aware, no duplicates.",
          "Use structured lab values as source of truth. Do not invent lab values or weather.",
          "Return JSON only.",
          "",
          `Filename: ${params.originalFilename}`,
          params.uploadMode === "multi_image"
            ? [
                "",
                "Multi-image upload. Page markers may be present.",
                `Total pages: ${params.pageCount ?? "unknown"}.`,
              ].join("\n")
            : "",
          "",
          compact.promptText,
        ].join("\n"),
      },
    ],
    temperature: 0.3,
    max_tokens: maxTokens,
    response_format: { type: "json_object" },
  });

  await logAiUsage({
    userId: params.userId,
    feature: "summary",
    model,
    inputTokens: response.usage?.prompt_tokens,
    outputTokens: response.usage?.completion_tokens,
    source: "openai",
    reportId: params.reportId,
    documentId: params.documentId,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new AppError(
      "AI summary could not be generated from this report. Please try again.",
      "AI_GENERATION_FAILED",
      502
    );
  }

  const cleaned = content
    .replace(/```json\s*/g, "")
    .replace(/```\s*/g, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    return {
      result: normalizeSummary(parsed),
      model,
      usage: {
        input: response.usage?.prompt_tokens ?? 0,
        output: response.usage?.completion_tokens ?? 0,
      },
    };
  } catch {
    throw new AppError(
      "AI summary could not be generated from this report. Please try again.",
      "AI_GENERATION_FAILED",
      502
    );
  }
}

function normalizeSummary(raw: any): MedicalSummaryResult {
  const contextualInsights = Array.isArray(raw.contextualInsights)
    ? raw.contextualInsights
        .filter((x: any) => x && typeof x.message === "string")
        .map((x: any) => ({
          title: typeof x.title === "string" ? x.title : "Insight",
          message: x.message,
          relatedContext: Array.isArray(x.relatedContext)
            ? x.relatedContext.filter((s: unknown) => typeof s === "string")
            : undefined,
          level: ["info", "warning", "critical"].includes(x.level)
            ? x.level
            : "info",
        }))
    : [];

  return {
    summary: typeof raw.summary === "string" ? raw.summary : "Summary not available.",
    keyFindings: Array.isArray(raw.keyFindings) ? raw.keyFindings : [],
    abnormalValues: Array.isArray(raw.abnormalValues) ? raw.abnormalValues : [],
    foodRecommendations: Array.isArray(raw.foodRecommendations) ? raw.foodRecommendations : [],
    exerciseRecommendations: Array.isArray(raw.exerciseRecommendations) ? raw.exerciseRecommendations : [],
    lifestyleAdvice: Array.isArray(raw.lifestyleAdvice) ? raw.lifestyleAdvice : [],
    riskFlags: Array.isArray(raw.riskFlags) ? raw.riskFlags : [],
    chartData: Array.isArray(raw.chartData) ? raw.chartData : [],
    contextualInsights,
    healthScore:
      typeof raw.healthScore === "number"
        ? Math.min(100, Math.max(0, Math.round(raw.healthScore)))
        : undefined,
  };
}

export async function generateMedicalSummary(
  params: GenerateParams
): Promise<{ result: MedicalSummaryResult; model: string; durationMs: number } & SummaryDebugMeta> {
  const start = Date.now();

  assertOpenAiConfigured();
  assertExtractedTextReady(params.extractedText);

  try {
    const { result, model } = await callOpenAI(params);
    const compact = await buildCompactReportContext({
      userId: params.userId,
      extractedText: params.extractedText,
      healthContext: params.healthContext,
      structuredLabValues: params.structuredLabValues ?? [],
    });
    const debugMeta: SummaryDebugMeta = {};
    if (process.env.AI_DEBUG_CONTEXT === "true" && process.env.NODE_ENV !== "production") {
      const { buildDebugContextStats } = await import("@/lib/ai/compact-report-context");
      debugMeta.debugContextStats = buildDebugContextStats(compact);
    }
    return {
      result,
      model,
      durationMs: Date.now() - start,
      ...debugMeta,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(
      "AI summary could not be generated from this report. Please try again.",
      "AI_GENERATION_FAILED",
      502
    );
  }
}
