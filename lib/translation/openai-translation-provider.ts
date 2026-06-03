import { getLanguageName } from "./language-map";
import { shouldSkipTextTranslation } from "./should-translate";

export type TranslationContext = "ui" | "medical_report" | "legal" | "general";

export function getOpenAiTranslationModel(): string {
  return process.env.OPENAI_TRANSLATION_MODEL || "gpt-4o-mini";
}

export function isOpenAiTranslationConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function buildSystemPrompt(
  context: TranslationContext,
  targetLanguage: string,
  sourceLanguage: string
): string {
  const langName = getLanguageName(targetLanguage);
  const sourceName =
    sourceLanguage === "en" ? "English" : getLanguageName(sourceLanguage);

  const baseRules = `
Translate from ${sourceName} to ${langName}.
Preserve exactly: numbers, medical values, units (mg/dL, mmHg, ng/mL, %, g/dL, etc.), dates, IDs, URLs, emails, file names, tokens.
Do not add medical advice, diagnoses, or new clinical content.
Do not invent or omit information.
Return only the translated text with no preamble.`;

  switch (context) {
    case "ui":
      return `You translate UI labels and short interface text for a health app.${baseRules}
Use natural, concise ${langName} suitable for buttons and menus.`;
    case "legal":
      return `You translate legal and help documentation for patient convenience.${baseRules}
Use formal but clear ${langName}. This is not legal advice.`;
    case "medical_report":
      return `You translate patient-facing medical report explanations.${baseRules}
Keep standard medical test names; bilingual "English (Local)" is OK for test names.
Preserve enum-like status words in JSON when instructed.
Use simple, user-friendly ${langName}.`;
    default:
      return `You translate general app content.${baseRules}`;
  }
}

async function getOpenAIClient() {
  const { default: OpenAI } = await import("openai");
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const err = new Error("OpenAI translation is not configured.");
    (err as Error & { code: string }).code = "TRANSLATION_NOT_CONFIGURED";
    throw err;
  }
  return new OpenAI({ apiKey });
}

function parseJsonFromModel(raw: string): unknown {
  const cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
  return JSON.parse(cleaned);
}

export async function translateTextWithOpenAI(params: {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string;
  context?: TranslationContext;
}): Promise<string> {
  const {
    text,
    targetLanguage,
    sourceLanguage = "en",
    context = "general",
  } = params;

  if (targetLanguage === "en" || shouldSkipTextTranslation(text)) {
    return text;
  }

  const client = await getOpenAIClient();
  const model = getOpenAiTranslationModel();

  const response = await client.chat.completions.create({
    model,
    temperature: 0.2,
    max_tokens: Math.min(4000, Math.max(256, text.length * 2)),
    messages: [
      {
        role: "system",
        content: buildSystemPrompt(context, targetLanguage, sourceLanguage),
      },
      { role: "user", content: text },
    ],
  });

  const out = response.choices[0]?.message?.content?.trim();
  return out || text;
}

export async function translateBatchWithOpenAI(params: {
  texts: string[];
  targetLanguage: string;
  sourceLanguage?: string;
  context?: TranslationContext;
}): Promise<string[]> {
  const {
    texts,
    targetLanguage,
    sourceLanguage = "en",
    context = "general",
  } = params;

  if (targetLanguage === "en") return texts;

  const results = [...texts];
  const toTranslate: { index: number; text: string }[] = [];

  texts.forEach((text, index) => {
    if (shouldSkipTextTranslation(text)) {
      results[index] = text;
    } else {
      toTranslate.push({ index, text });
    }
  });

  if (toTranslate.length === 0) return results;

  if (toTranslate.length === 1) {
    const only = toTranslate[0];
    results[only.index] = await translateTextWithOpenAI({
      text: only.text,
      targetLanguage,
      sourceLanguage,
      context,
    });
    return results;
  }

  const client = await getOpenAIClient();
  const model = getOpenAiTranslationModel();
  const langName = getLanguageName(targetLanguage);

  const payload = toTranslate.map((x) => x.text);

  const response = await client.chat.completions.create({
    model,
    temperature: 0.2,
    max_tokens: 8000,
    messages: [
      {
        role: "system",
        content: `${buildSystemPrompt(context, targetLanguage, sourceLanguage)}
Return valid JSON only: a JSON array of translated strings in the SAME order and length as the input array.
Each output string corresponds to the input string at the same index.
Do not merge or split items.`,
      },
      {
        role: "user",
        content: `Translate these ${payload.length} strings to ${langName}:\n${JSON.stringify(payload)}`,
      },
    ],
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("Empty batch translation response");
  }

  const parsed = parseJsonFromModel(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("Batch translation response is not a JSON array");
  }

  toTranslate.forEach((item, j) => {
    const translated = parsed[j];
    results[item.index] =
      typeof translated === "string" ? translated : item.text;
  });

  return results;
}

export async function translateObjectWithOpenAI(params: {
  data: unknown;
  targetLanguage: string;
  sourceLanguage?: string;
  context?: TranslationContext;
}): Promise<unknown> {
  const {
    data,
    targetLanguage,
    sourceLanguage = "en",
    context = "general",
  } = params;

  if (targetLanguage === "en") return data;

  const client = await getOpenAIClient();
  const model = getOpenAiTranslationModel();
  const langName = getLanguageName(targetLanguage);

  const response = await client.chat.completions.create({
    model,
    temperature: 0.2,
    max_tokens: 8000,
    messages: [
      {
        role: "system",
        content: `${buildSystemPrompt(context, targetLanguage, sourceLanguage)}
Translate all user-facing string VALUES in the JSON object to ${langName}.
Preserve all keys and JSON structure exactly.
Do not translate: numbers, booleans, null, IDs, emails, URLs, file names, units-only strings, dates, tokens.
For keyFindings.status keep: normal, low, high, critical, unknown.
For riskFlags.level keep: info, warning, critical.
Return valid JSON only with the same shape as the input.`,
      },
      {
        role: "user",
        content: JSON.stringify(data),
      },
    ],
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("Empty object translation response");

  return parseJsonFromModel(raw);
}
