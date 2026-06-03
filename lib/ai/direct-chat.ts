import { classifyChatSafety, type SafetyLevel } from "@/lib/ai/chat-safety";
import type { ChatSourceRef } from "@/lib/ai/chat-context-builder";
import { AiChatServiceError, isOpenAiTransientError } from "@/lib/ai/chat-errors-ai";
import { buildChatSystemPrompt } from "@/lib/ai/chat-prompt-builder";

export type DirectChatResult = {
  answer: string;
  safetyLevel: SafetyLevel;
  sources: ChatSourceRef[];
  suggestedQuestions: string[];
};

export function isOpenAiChatConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function getOpenAiChatModel(): string {
  return (
    process.env.OPENAI_CHAT_MODEL?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    "gpt-4o-mini"
  );
}

export class AiChatNotConfiguredError extends Error {
  code = "AI_CHAT_NOT_CONFIGURED";
  constructor() {
    super("AI chat is not configured.");
  }
}

function resolveLanguageInstruction(language: string, userMessage: string): string {
  if (language === "hinglish") {
    return "Reply in natural Hinglish (Hindi + English mix) matching the user's tone. Keep test names and numbers in English.";
  }
  if (language === "hi") {
    return "Reply in Hindi (Devanagari). Keep medical test names and numeric values accurate.";
  }
  if (language === "en") {
    return "Reply in English.";
  }
  if (language === "app") {
    return "Match the user's message language (Hindi, Hinglish, or English). Keep test names and values accurate.";
  }
  const hindiScript = /[\u0900-\u097F]/;
  const hinglishHints = /\b(kya|hai|meri|mujhe|batao|kaun|kiski|zyada|kam|doctor|report)\b/i;
  if (hindiScript.test(userMessage) || hinglishHints.test(userMessage)) {
    return "Reply in Hindi or Hinglish as the user wrote. Keep test names and values accurate.";
  }
  return "Reply in clear simple English unless the user wrote in Hindi/Hinglish.";
}

function defaultSuggestions(mode: string): string[] {
  if (mode === "report") {
    return [
      "Is report me sabse important kya hai?",
      "Kaunse values high/low hain?",
      "Doctor se kya poochna chahiye?",
      "Simple language me explain karo.",
    ];
  }
  if (mode === "family") {
    return [
      "Mummy ke reports me sugar trend kya hai?",
      "Kaunse reminders pending hain?",
      "Family me highest risk kiska hai?",
    ];
  }
  return [
    "Meri latest report me kya important hai?",
    "Kaunse reports AI summary ke liye pending hain?",
    "Mere active health risks batao.",
    "Upcoming reminders kya hain?",
  ];
}

function parseJsonResponse(raw: string, fallbackSources: ChatSourceRef[], mode: string): DirectChatResult {
  let parsed: {
    answer?: string;
    safetyLevel?: SafetyLevel;
    sources?: ChatSourceRef[];
    suggestedQuestions?: string[];
  } = {};

  try {
    const trimmed = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    parsed = JSON.parse(trimmed);
  } catch {
    return {
      answer: raw.trim() || "Mere paas is sawal ka jawab dene ke liye enough saved data nahi hai.",
      safetyLevel: "normal",
      sources: fallbackSources.slice(0, 5),
      suggestedQuestions: defaultSuggestions(mode),
    };
  }

  return {
    answer:
      parsed.answer?.trim() ||
      "Mere paas is sawal ka jawab dene ke liye enough saved data nahi hai.",
    safetyLevel: parsed.safetyLevel || "normal",
    sources: Array.isArray(parsed.sources) && parsed.sources.length
      ? parsed.sources.slice(0, 8)
      : fallbackSources.slice(0, 5),
    suggestedQuestions:
      Array.isArray(parsed.suggestedQuestions) && parsed.suggestedQuestions.length
        ? parsed.suggestedQuestions.slice(0, 6)
        : defaultSuggestions(mode),
  };
}

export async function answerUserHealthQuestion(params: {
  message: string;
  mode: "general" | "report" | "family";
  context: Record<string, unknown>;
  language: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<DirectChatResult> {
  if (!isOpenAiChatConfigured()) {
    throw new AiChatNotConfiguredError();
  }

  const safety = classifyChatSafety(params.message);
  const fallbackSources = (params.context.sources as ChatSourceRef[] | undefined) ?? [];
  const langInstr = resolveLanguageInstruction(params.language, params.message);

  const system = buildChatSystemPrompt({
    message: params.message,
    mode: params.mode,
    context: params.context,
    languageInstruction: langInstr,
  });

  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: system },
  ];

  for (const h of (params.history ?? []).slice(-10)) {
    messages.push({ role: h.role, content: h.content.slice(0, 2500) });
  }
  messages.push({ role: "user", content: params.message.slice(0, 2000) });

  let response;
  try {
    response = await client.chat.completions.create({
      model: getOpenAiChatModel(),
      temperature: 0.25,
      max_tokens: 1600,
      response_format: { type: "json_object" },
      messages,
    });
  } catch (err) {
    if (isOpenAiTransientError(err)) {
      throw new AiChatServiceError(
        "Vaidya GPT abhi busy hai. Kuch minute baad dobara try karein."
      );
    }
    throw new AiChatServiceError(
      "Jawab generate nahi ho paya. Dobara try karein ya baad me aayein."
    );
  }

  const raw = response.choices[0]?.message?.content?.trim() || "";
  const result = parseJsonResponse(raw, fallbackSources, params.mode);

  if (safety.isEmergency && result.safetyLevel !== "urgent") {
    result.safetyLevel = "urgent";
  } else if (safety.isDiagnosisRequest || safety.isPrescriptionRequest) {
    result.safetyLevel = result.safetyLevel === "urgent" ? "urgent" : "caution";
  }

  return result;
}
