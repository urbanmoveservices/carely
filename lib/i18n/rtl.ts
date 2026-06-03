import type { SupportedLanguageCode } from "./languages";

const RTL_CODES = new Set<SupportedLanguageCode>(["ur", "sd", "ks"]);

export function isRtlLanguage(code: string): boolean {
  return RTL_CODES.has(code as SupportedLanguageCode);
}
