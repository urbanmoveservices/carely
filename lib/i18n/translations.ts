import { en } from "./en";
import { hi } from "./hi";
import {
  DEFAULT_LANGUAGE,
  isSupportedLanguage,
  type SupportedLanguageCode,
} from "./languages";
import { regionalOverlays } from "./regional";
import { getCoreOverlay } from "./core-all";

const cache = new Map<string, Record<string, string>>();

export function getDictionary(lang: string): Record<string, string> {
  const code = isSupportedLanguage(lang) ? lang : DEFAULT_LANGUAGE;
  if (cache.has(code)) return cache.get(code)!;

  const dict: Record<string, string> = { ...en };
  if (code === "hi") {
    Object.assign(dict, hi);
  } else {
    const core = getCoreOverlay(code);
    if (core) Object.assign(dict, core);
    else if (regionalOverlays[code]) Object.assign(dict, regionalOverlays[code]);
  }
  cache.set(code, dict);
  return dict;
}

/** Server-safe translate with English fallback */
export function translate(
  lang: string,
  key: string,
  fallback?: string
): string {
  const dict = getDictionary(lang);
  return dict[key] ?? en[key] ?? fallback ?? key;
}

export function translateWithParams(
  lang: string,
  key: string,
  params?: Record<string, string | number>,
  fallback?: string
): string {
  let text = translate(lang, key, fallback);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return text;
}

export function getPdfLabels(lang: string) {
  return {
    disclaimer: translate(lang, "pdf.disclaimer"),
    summary: translate(lang, "pdf.summary"),
    keyFindings: translate(lang, "pdf.keyFindings"),
    abnormalValues: translate(lang, "pdf.abnormalValues"),
    food: translate(lang, "pdf.food"),
    exercise: translate(lang, "pdf.exercise"),
    lifestyle: translate(lang, "pdf.lifestyle"),
    riskFlags: translate(lang, "pdf.riskFlags"),
    healthScore: translate(lang, "pdf.healthScore"),
    aiSummary: translate(lang, "pdf.summary"),
    healthMetrics: translate(lang, "pdf.healthMetrics", "Health Metrics"),
  };
}
