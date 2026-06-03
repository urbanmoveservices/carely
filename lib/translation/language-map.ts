import { getLanguageByCode } from "@/lib/i18n/languages";

/** Languages written right-to-left in the UI */
export const RTL_LANGUAGE_CODES = new Set(["ur", "sd", "ks"]);

export function isRtlLanguage(code: string): boolean {
  return RTL_LANGUAGE_CODES.has(code);
}

/** Human-readable language name for OpenAI prompts */
export function getLanguageName(code: string): string {
  const meta = getLanguageByCode(code);
  if (meta) return meta.name;
  const fallback: Record<string, string> = {
    mni: "Manipuri/Meitei",
    sat: "Santali",
    brx: "Bodo",
    mai: "Maithili",
    kok: "Konkani",
    doi: "Dogri",
  };
  return fallback[code] ?? code;
}

export const SUPPORTED_TRANSLATION_LANGUAGE_CODES = [
  "en",
  "hi",
  "bn",
  "te",
  "mr",
  "ta",
  "ur",
  "gu",
  "kn",
  "or",
  "ml",
  "pa",
  "as",
  "mai",
  "sa",
  "kok",
  "mni",
  "ne",
  "sd",
  "doi",
  "brx",
  "ks",
  "sat",
] as const;
