export type AiFeature =
  | "summary"
  | "chat"
  | "translation"
  | "compression"
  | "ocr"
  | "doctor_questions"
  | "diet";

const DEFAULT_MODEL = "gpt-4o-mini";

export function getModelForFeature(feature: AiFeature): string {
  const map: Record<AiFeature, string | undefined> = {
    summary: process.env.OPENAI_MODEL_SUMMARY,
    chat: process.env.OPENAI_MODEL_CHAT,
    translation: process.env.OPENAI_MODEL_TRANSLATION,
    compression: process.env.OPENAI_MODEL_COMPRESSION,
    ocr: process.env.OPENAI_MODEL_OCR,
    doctor_questions: process.env.OPENAI_MODEL_SUMMARY,
    diet: process.env.OPENAI_MODEL_CHAT,
  };
  return (
    map[feature]?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    DEFAULT_MODEL
  );
}

export function getMaxOutputTokens(feature: AiFeature): number {
  const envMap: Record<AiFeature, string | undefined> = {
    summary: process.env.AI_MAX_OUTPUT_TOKENS_SUMMARY,
    chat: process.env.AI_MAX_OUTPUT_TOKENS_CHAT,
    translation: process.env.AI_MAX_OUTPUT_TOKENS_TRANSLATION,
    compression: process.env.AI_MAX_OUTPUT_TOKENS_CHAT,
    ocr: process.env.AI_MAX_OUTPUT_TOKENS_CHAT,
    doctor_questions: process.env.AI_MAX_OUTPUT_TOKENS_DOCTOR_QUESTIONS,
    diet: process.env.AI_MAX_OUTPUT_TOKENS_DIET,
  };
  const defaults: Record<AiFeature, number> = {
    summary: 1600,
    chat: 700,
    translation: 1000,
    compression: 500,
    ocr: 2000,
    doctor_questions: 900,
    diet: 900,
  };
  const raw = envMap[feature];
  const n = raw ? parseInt(raw, 10) : defaults[feature];
  return Number.isFinite(n) && n > 0 ? n : defaults[feature];
}

export function isCompactContextOnly(): boolean {
  return process.env.AI_COMPACT_CONTEXT_ONLY !== "false";
}

export function isAiDebugContext(): boolean {
  return (
    process.env.AI_DEBUG_CONTEXT === "true" &&
    process.env.NODE_ENV !== "production"
  );
}

export function rawTextMaxChars(): number {
  const n = parseInt(process.env.AI_RAW_TEXT_MAX_CHARS || "12000", 10);
  return Number.isFinite(n) ? n : 12000;
}

export function snippetMaxChars(): number {
  const n = parseInt(process.env.AI_SNIPPET_MAX_CHARS || "3000", 10);
  return Number.isFinite(n) ? n : 3000;
}
