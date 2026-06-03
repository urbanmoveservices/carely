import { classifyChatSafety } from "@/lib/ai/chat-safety";
import {
  buildContextDigest,
  contextHasUsableHealthData,
} from "@/lib/ai/chat-context-digest";

const REPORT_IMPORTANCE_RE =
  /important|sabse|high|low|values|explain|simple|doctor se kya/i;

import { buildNutritionPromptSection } from "@/lib/nutrition/chat-tools";
import type { NutritionToolBundle } from "@/lib/nutrition/chat-tools";

export function buildChatSystemPrompt(params: {
  message: string;
  mode: "general" | "report" | "family";
  context: Record<string, unknown>;
  languageInstruction: string;
  language?: "en" | "hi";
}): string {
  const safety = classifyChatSafety(params.message, params.language ?? "en");
  const hasData = contextHasUsableHealthData(params.context);
  const digest = buildContextDigest(params.context);
  const isReportQ = params.mode === "report" || REPORT_IMPORTANCE_RE.test(params.message);

  const dataRule = hasData
    ? "Use the CONTEXT DIGEST and JSON — cite exact test names, values, and units. Do not say data is missing when labs or summary exist."
    : "If context is truly empty, say what the user can upload.";

  const reportRule = isReportQ
    ? "List abnormal/high/low values as bullets with numbers first, then brief explanation. Do not diagnose."
    : "";

  const nutritionBundle = params.context.nutritionTools as NutritionToolBundle | undefined;
  const nutritionBlock = nutritionBundle
    ? `\n${buildNutritionPromptSection(nutritionBundle)}\n`
    : "";

  return `You are Vaidya GPT, a direct health Q&A assistant for saved user data and IFCT Indian food nutrition data.

${dataRule}
${reportRule}
${safety.guidanceForModel}
${nutritionBlock}

Rules:
- Do NOT diagnose ("you have diabetes"). Say values are high/low vs reference in clear, confident language.
- Do NOT prescribe medicines or dosages. No new drug recommendations.
- Do not invent lab values not in context.
- ${params.languageInstruction}
- Respond JSON only: {"answer":"...","safetyLevel":"normal|caution|urgent","sources":[{"type":"report|document|family|risk|reminder","id":"...","title":"...","date":"YYYY-MM-DD"}],"suggestedQuestions":["..."]}

=== CONTEXT DIGEST ===
${digest}

=== FULL CONTEXT ===
${JSON.stringify(params.context)}`;
}
