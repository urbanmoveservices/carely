import { classifyChatSafety, type SafetyLevel } from "@/lib/ai/chat-safety";
import type { ChatSourceRef } from "@/lib/ai/chat-context-builder";
import { AiChatServiceError, isOpenAiTransientError } from "@/lib/ai/chat-errors-ai";
import { buildChatSystemPrompt } from "@/lib/ai/chat-prompt-builder";
import { getChatSuggestions } from "@/lib/chat/suggested-questions";

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

function resolveLanguageInstruction(language: string): string {
  if (language === "hi") {
    return "Reply entirely in Hindi (Devanagari). Keep medical test names and numeric values accurate. Do not mix English sentences.";
  }
  return "Reply entirely in English. Keep medical test names and numeric values accurate.";
}

function fallbackAnswer(language: string): string {
  return language === "hi"
    ? "इस सवाल के लिए मेरे पास पर्याप्त सहेजा हुआ डेटा नहीं है।"
    : "I do not have enough saved data to answer that question yet.";
}

function serviceBusyMessage(language: string): string {
  return language === "hi"
    ? "Vaidya GPT अभी व्यस्त है। कुछ मिनट बाद दोबारा कोशिश करें।"
    : "Vaidya GPT is busy right now. Please try again in a few minutes.";
}

function generationFailedMessage(language: string): string {
  return language === "hi"
    ? "जवाब तैयार नहीं हो सका। कृपया दोबारा कोशिश करें।"
    : "Could not prepare an answer. Please try again.";
}

function defaultSuggestions(
  mode: "general" | "report" | "family",
  language: string
): string[] {
  const t = (key: string) => {
    const en: Record<string, string> = {
      "chat.suggestReport1": "What's most important in this report?",
      "chat.suggestReport2": "Which values are high or low?",
      "chat.suggestReport3": "What should I ask my doctor?",
      "chat.suggestReport4": "Explain this in simple terms.",
      "chat.suggestReport5": "Do I need to see a doctor urgently?",
      "chat.suggestFamily1": "What is the sugar trend in my mother's reports?",
      "chat.suggestFamily2": "Who has low Vitamin D?",
      "chat.suggestFamily3": "Which reminders are pending?",
      "chat.suggestFamily4": "Who has the highest health risk in my family?",
      "chat.suggestFamily5": "Which reports need follow-up?",
      "chat.suggestGeneral1": "What's important in my latest report?",
      "chat.suggestGeneral2": "Which reports are waiting for a summary?",
      "chat.suggestGeneral3": "What are my active health risks?",
      "chat.suggestGeneral4": "What reminders are coming up?",
      "chat.suggestGeneral5": "Who in my family has the highest health risk?",
    };
    const hi: Record<string, string> = {
      "chat.suggestReport1": "इस रिपोर्ट में सबसे महत्वपूर्ण क्या है?",
      "chat.suggestReport2": "कौन से मान उच्च या निम्न हैं?",
      "chat.suggestReport3": "मुझे डॉक्टर से क्या पूछना चाहिए?",
      "chat.suggestReport4": "इसे सरल भाषा में समझाएं।",
      "chat.suggestReport5": "क्या मुझे तुरंत डॉक्टर को दिखाना चाहिए?",
      "chat.suggestFamily1": "मेरी माँ की रिपोर्ट में शुगर का रुझान क्या है?",
      "chat.suggestFamily2": "किसकी विटामिन D कम है?",
      "chat.suggestFamily3": "कौन से रिमाइंडर लंबित हैं?",
      "chat.suggestFamily4": "मेरे परिवार में सबसे अधिक स्वास्थ्य जोखिम किसका है?",
      "chat.suggestFamily5": "किन रिपोर्टों को फॉलो-अप की जरूरत है?",
      "chat.suggestGeneral1": "मेरी नवीनतम रिपोर्ट में क्या महत्वपूर्ण है?",
      "chat.suggestGeneral2": "कौन सी रिपोर्ट सारांश के लिए प्रतीक्षा में हैं?",
      "chat.suggestGeneral3": "मेरे सक्रिय स्वास्थ्य जोखिम क्या हैं?",
      "chat.suggestGeneral4": "आगामी रिमाइंडर क्या हैं?",
      "chat.suggestGeneral5": "मेरे परिवार में सबसे अधिक स्वास्थ्य जोखिम किसका है?",
    };
    const dict = language === "hi" ? hi : en;
    return dict[key] ?? en[key] ?? key;
  };
  return getChatSuggestions(mode, t);
}

function parseJsonResponse(
  raw: string,
  fallbackSources: ChatSourceRef[],
  mode: "general" | "report" | "family",
  language: string
): DirectChatResult {
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
      answer: raw.trim() || fallbackAnswer(language),
      safetyLevel: "normal",
      sources: fallbackSources.slice(0, 5),
      suggestedQuestions: defaultSuggestions(mode, language),
    };
  }

  return {
    answer: parsed.answer?.trim() || fallbackAnswer(language),
    safetyLevel: parsed.safetyLevel || "normal",
    sources:
      Array.isArray(parsed.sources) && parsed.sources.length
        ? parsed.sources.slice(0, 8)
        : fallbackSources.slice(0, 5),
    suggestedQuestions:
      Array.isArray(parsed.suggestedQuestions) && parsed.suggestedQuestions.length
        ? parsed.suggestedQuestions.slice(0, 6)
        : defaultSuggestions(mode, language),
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

  const lang = params.language === "hi" ? "hi" : "en";
  const safety = classifyChatSafety(params.message, lang);
  const fallbackSources = (params.context.sources as ChatSourceRef[] | undefined) ?? [];
  const langInstr = resolveLanguageInstruction(lang);

  const system = buildChatSystemPrompt({
    message: params.message,
    mode: params.mode,
    context: params.context,
    languageInstruction: langInstr,
    language: lang,
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
      throw new AiChatServiceError(serviceBusyMessage(lang));
    }
    throw new AiChatServiceError(generationFailedMessage(lang));
  }

  const raw = response.choices[0]?.message?.content?.trim() || "";
  const result = parseJsonResponse(raw, fallbackSources, params.mode, lang);

  if (safety.isEmergency && result.safetyLevel !== "urgent") {
    result.safetyLevel = "urgent";
  } else if (safety.isDiagnosisRequest || safety.isPrescriptionRequest) {
    result.safetyLevel = result.safetyLevel === "urgent" ? "urgent" : "caution";
  }

  return result;
}
