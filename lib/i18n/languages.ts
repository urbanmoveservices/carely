export const DEFAULT_LANGUAGE = "en";
export const LANGUAGE_STORAGE_KEY = "carely_language";

export type SupportedLanguageCode =
  | "en"
  | "hi"
  | "bn"
  | "te"
  | "mr"
  | "ta"
  | "ur"
  | "gu"
  | "kn"
  | "or"
  | "ml"
  | "pa"
  | "as"
  | "mai"
  | "sa"
  | "kok"
  | "mni"
  | "ne"
  | "sd"
  | "doi"
  | "brx"
  | "ks"
  | "sat";

export interface SupportedLanguage {
  code: SupportedLanguageCode;
  name: string;
  nativeName: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు" },
  { code: "mr", name: "Marathi", nativeName: "मराठी" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்" },
  { code: "ur", name: "Urdu", nativeName: "اردو" },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ" },
  { code: "or", name: "Odia", nativeName: "ଓଡ଼ିଆ" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം" },
  { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ" },
  { code: "as", name: "Assamese", nativeName: "অসমীয়া" },
  { code: "mai", name: "Maithili", nativeName: "मैथिली" },
  { code: "sa", name: "Sanskrit", nativeName: "संस्कृतम्" },
  { code: "kok", name: "Konkani", nativeName: "कोंकणी" },
  { code: "mni", name: "Manipuri (Meitei)", nativeName: "ꯃꯤꯇꯩꯂꯣꯟ" },
  { code: "ne", name: "Nepali", nativeName: "नेपाली" },
  { code: "sd", name: "Sindhi", nativeName: "سنڌي" },
  { code: "doi", name: "Dogri", nativeName: "डोगरी" },
  { code: "brx", name: "Bodo", nativeName: "बड़ो" },
  { code: "ks", name: "Kashmiri", nativeName: "کٲشُر" },
  { code: "sat", name: "Santali", nativeName: "ᱥᱟᱱᱛᱟᱲᱤ" },
];

const CODE_SET = new Set(SUPPORTED_LANGUAGES.map((l) => l.code));

export function getLanguageDisplayName(code: string): string {
  const found = SUPPORTED_LANGUAGES.find((l) => l.code === code);
  return found ? `${found.name} (${found.nativeName})` : code;
}

export function isSupportedLanguage(code: string): code is SupportedLanguageCode {
  return CODE_SET.has(code as SupportedLanguageCode);
}

export function getLanguageByCode(code: string): SupportedLanguage | undefined {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code);
}

export function detectBrowserLanguage(): SupportedLanguageCode {
  if (typeof navigator === "undefined") return DEFAULT_LANGUAGE;
  const lang = navigator.language?.split("-")[0]?.toLowerCase();
  if (lang && isSupportedLanguage(lang)) return lang;
  return DEFAULT_LANGUAGE;
}
