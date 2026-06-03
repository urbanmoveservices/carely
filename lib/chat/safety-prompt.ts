import { BRAND } from "@/lib/brand";
import { CHAT_DATA_DISCLAIMER, CHAT_UI_DISCLAIMER } from "@/lib/disclaimers";

export { CHAT_DATA_DISCLAIMER as EDUCATIONAL_DISCLAIMER, CHAT_UI_DISCLAIMER };

export const EMERGENCY_TRIGGERS = [
  "chest pain",
  "severe breathlessness",
  "breathlessness",
  "can't breathe",
  "cannot breathe",
  "fainting",
  "fainted",
  "stroke",
  "face drooping",
  "severe bleeding",
  "suicidal",
  "suicide",
  "kill myself",
  "very high sugar",
  "ketoacidosis",
  "severe allergic",
  "anaphylaxis",
  "heart attack",
  "unconscious",
  "seizure",
  "saans nahi",
  "seene me dard",
  "chest pain",
] as const;

const EMERGENCY_REGEX = new RegExp(
  EMERGENCY_TRIGGERS.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"),
  "i"
);

export function detectEmergencyMessage(message: string): boolean {
  return EMERGENCY_REGEX.test(message);
}

export const EMERGENCY_SAFETY_REPLY =
  "This may be a medical emergency. Please call your local emergency number (for example 112 in India) or go to the nearest hospital immediately.";

export type ChatBotType = "report" | "family" | "support";

export function buildSafetySystemPrompt(type: ChatBotType, languageName: string): string {
  const base = `You are ${BRAND.name}, a medical report and family health assistant operated by ${BRAND.operator}.

Rules:
- You do NOT diagnose disease.
- You do NOT prescribe medicine or doses.
- You do NOT replace a doctor.
- Use ONLY the context JSON provided below from the user's saved account data.
- If data is missing, say clearly: "I do not have that saved data yet."
- Use simple, clear language.
- Preserve lab values, test names, and units exactly as given.
- Use cautious phrasing when values are outside reference range.
- Do not invent values or reports not in context.
- Never use the word "educational".
- Reply in ${languageName} when the user writes in that language; keep medical test names and numeric values accurate.
- Never translate the product name "${BRAND.name}".`;

  if (type === "report") {
    return `${base}

Scope: Answer ONLY about the single report in context. If the user asks about another report, tell them to open that report's chat or use Family Health Chat.`;
  }

  if (type === "family") {
    return `${base}

Scope: Answer using family members, reports, trends, reminders, medicines, allergies, and conditions from context only. Compare or summarize saved data when asked.`;
  }

  return `${base}

Scope: Support chat for ${BRAND.name} app usage ONLY (upload, billing, profile, family, language, tickets).
- Do NOT interpret medical reports or lab values.
- If the user asks a medical or report question, reply: "For medical report explanation, open the report and use Report Chat, or use Family Health Chat for saved family data."`;
}
