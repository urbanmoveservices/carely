/** @deprecated Use language-map.ts — kept for import compatibility */
export {
  SUPPORTED_TRANSLATION_LANGUAGE_CODES,
  getLanguageName,
  isRtlLanguage,
  RTL_LANGUAGE_CODES,
} from "./language-map";

import { SUPPORTED_TRANSLATION_LANGUAGE_CODES } from "./language-map";

export const SUPPORTED_PROVIDER_LANGUAGES = new Set(
  SUPPORTED_TRANSLATION_LANGUAGE_CODES
);
