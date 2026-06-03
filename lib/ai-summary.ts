import { AppError } from "@/lib/app-error";
import { BRAND } from "@/lib/brand";
import {
  assertOpenAiConfigured,
  assertExtractedTextReady,
} from "@/lib/summary-error-messages";
import { getAiLanguageInstruction } from "@/lib/i18n/ai-language";
import type { AiHealthContextBundle } from "@/lib/report-context-service";
import {
  formatStructuredValuesForPrompt,
  type ParsedLabValue,
} from "@/lib/lab-value-parser";

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
  extractedText: string;
  originalFilename: string;
  uploadMode?: string | null;
  pageCount?: number | null;
  language?: string | null;
  healthContext: AiHealthContextBundle;
  structuredLabValues?: ParsedLabValue[];
}

const MAX_TEXT_LENGTH = 16000;

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

foodRecommendations: Return 10–14 strings. Each string must be a full, actionable sentence (not a 5-word bullet). Cover all sections that apply to THIS report's abnormal values and diagnoses:
- Foods to eat more: name specific foods (e.g. leafy greens, dal, eggs, fatty fish, nuts, whole grains) with why they help their labs.
- Foods to limit or avoid: name items and link to sugar, lipids, sodium, uric acid, liver, kidney, etc. from the report.
- Meal timing and pattern: breakfast/lunch/dinner, spacing, fasting/non-fasting context, glycemic control if sugar markers abnormal.
- Nutrients to prioritize: iron, B12, folate, vitamin D, protein, fiber, omega-3, potassium — only those relevant to findings.
- Hydration and drinks: water intake, limit sugary drinks/alcohol if context or labs suggest it.
- Sample ideas: 2–3 concrete meal or snack examples for a typical day in India-friendly and universal options.
Every item must reference their actual report findings (e.g. low Hb → iron-rich foods; high LDL → soluble fiber and limit fried foods).

exerciseRecommendations: Return 8–12 strings with a practical weekly plan:
- Aerobic activity: type (brisk walk, cycling, swimming), minutes per session, days per week, target heart rate or perceived exertion.
- Strength, flexibility, and daily movement (steps, breaks from sitting) when appropriate.
- Precautions from context (BP, heart, joints, anemia-related fatigue, pregnancy, recent illness).
- 4–8 week progression (how to increase duration or intensity safely).
- Activities to postpone until a doctor approves, if any.
- How exercise supports their specific conditions (e.g. insulin sensitivity, lipids, mood, weight).

lifestyleAdvice: Return 12–18 strings — the most detailed section:
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
  extractedText: string,
  filename: string,
  healthContext: AiHealthContextBundle,
  language?: string | null,
  uploadMode?: string | null,
  pageCount?: number | null,
  structuredLabValues?: ParsedLabValue[]
): Promise<MedicalSummaryResult> {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const trimmedText = extractedText.slice(0, MAX_TEXT_LENGTH);
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const contextJson = JSON.stringify(healthContext, null, 2);

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: buildSystemPrompt(language) },
      {
        role: "user",
        content: [
          "Provide full clinical diagnosis and prescription recommendations supported by the report and context.",
          "foodRecommendations, exerciseRecommendations, and lifestyleAdvice must be comprehensive, specific, and personalized — not short generic bullets.",
          "Do not invent lab values not in the extracted text.",
          "Return JSON only.",
          "",
          `Filename: ${filename}`,
          uploadMode === "multi_image"
            ? [
                "",
                "This report was uploaded as multiple image pages. Page markers (--- Page N: ...) are included.",
                `Total pages: ${pageCount ?? "unknown"}. Use all pages together when interpreting the report.`,
              ].join("\n")
            : "",
          "",
          structuredLabValues?.length
            ? [
                "",
                "=== STRUCTURED REPORT VALUES (SOURCE OF TRUTH — use these exact numbers) ===",
                formatStructuredValuesForPrompt(structuredLabValues),
                "",
                "STRICT: Do not output Unknown for any category above. Use specific test names in keyFindings and abnormalValues.",
              ].join("\n")
            : "",
          "",
          "=== EXTRACTED MEDICAL REPORT TEXT ===",
          trimmedText,
          "",
          "=== USER HEALTH CONTEXT (questionnaire + family profile — not from uploaded report) ===",
          contextJson,
        ].join("\n"),
      },
    ],
    temperature: 0.3,
    max_tokens: 6000,
    response_format: { type: "json_object" },
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
    return normalizeSummary(parsed);
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
): Promise<{ result: MedicalSummaryResult; model: string; durationMs: number }> {
  const start = Date.now();

  assertOpenAiConfigured();
  assertExtractedTextReady(params.extractedText);

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  try {
    const result = await callOpenAI(
      params.extractedText,
      params.originalFilename,
      params.healthContext,
      params.language,
      params.uploadMode,
      params.pageCount,
      params.structuredLabValues
    );
    return {
      result,
      model,
      durationMs: Date.now() - start,
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
