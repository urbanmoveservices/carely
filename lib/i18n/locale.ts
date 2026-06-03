import { DEFAULT_LANGUAGE, isSupportedLanguage } from "./languages";

/** BCP-47 locale for Intl formatting */
const LOCALE_MAP: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  bn: "bn-IN",
  te: "te-IN",
  mr: "mr-IN",
  ta: "ta-IN",
  ur: "ur-IN",
  gu: "gu-IN",
  kn: "kn-IN",
  or: "or-IN",
  ml: "ml-IN",
  pa: "pa-IN",
  as: "as-IN",
  mai: "mai-IN",
  sa: "sa-IN",
  kok: "kok-IN",
  mni: "mni-IN",
  ne: "ne-IN",
  sd: "sd-IN",
  doi: "doi-IN",
  brx: "brx-IN",
  ks: "ks-IN",
  sat: "sat-IN",
};

export function getLocaleForLanguage(code: string): string {
  if (isSupportedLanguage(code)) return LOCALE_MAP[code] || "en-IN";
  return LOCALE_MAP[DEFAULT_LANGUAGE];
}

export function formatDateForLanguage(
  date: string | Date,
  language: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const locale = getLocaleForLanguage(language);
  return new Date(date).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...options,
  });
}

export function formatDateTimeForLanguage(
  date: string | Date,
  language: string
): string {
  const locale = getLocaleForLanguage(language);
  return new Date(date).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
