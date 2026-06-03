import type { SupportedLanguageCode } from "./languages";
import { hi } from "./hi";
import { regionalOverlays } from "./regional";

/** Keys that should never fall back to English for Indian languages */
const CORE_UI_KEYS = [
  "nav.home",
  "nav.dashboard",
  "nav.upload",
  "nav.family",
  "nav.reminders",
  "nav.more",
  "nav.search",
  "nav.settings",
  "nav.insights",
  "nav.healthRisks",
  "nav.billing",
  "nav.help",
  "nav.logout",
  "nav.login",
  "nav.signup",
  "common.loading",
  "common.save",
  "common.cancel",
  "common.viewAll",
  "common.manage",
  "dashboard.monthlyUsage",
  "dashboard.uploads",
  "dashboard.aiSummaries",
  "dashboard.uploadReport",
  "dashboard.healthRisks",
  "dashboard.todayHealthTasks",
  "dashboard.familyHealth",
  "dashboard.recentUploads",
  "dashboard.viewSummary",
  "dashboard.pdf",
  "dashboard.text",
  "dashboard.greeting",
  "dashboard.subtitle",
  "report.backToDashboard",
  "report.title",
  "report.summary",
  "report.keyFindings",
  "report.abnormalValues",
  "report.healthMetrics",
  "report.food",
  "report.exercise",
  "report.lifestyle",
  "report.riskFlags",
  "report.downloadPdf",
  "report.healthScore",
  "report.translating",
  "report.translationWarning",
  "report.translationNote",
  "settings.language",
  "billing.free",
  "billing.pro",
  "billing.family",
  "billing.upgrade",
  "billing.currentPlan",
] as const;

/** Languages that share Hindi UI labels as best-effort (Devanagari family) */
const HINDI_UI_FALLBACK: SupportedLanguageCode[] = [
  "mr",
  "mai",
  "ne",
  "doi",
  "brx",
  "kok",
  "sa",
];

function pickHiCore(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of CORE_UI_KEYS) {
    if (hi[k]) out[k] = hi[k];
  }
  return out;
}

const HI_CORE = pickHiCore();

export function getCoreOverlay(
  code: SupportedLanguageCode
): Record<string, string> | undefined {
  if (code === "en" || code === "hi") return undefined;

  const regional = regionalOverlays[code] || {};
  const overlay: Record<string, string> = { ...regional };

  const commonToNav: [string, string][] = [
    ["common.home", "nav.home"],
    ["common.dashboard", "nav.dashboard"],
    ["common.upload", "nav.upload"],
    ["common.family", "nav.family"],
    ["common.reminders", "nav.reminders"],
    ["common.more", "nav.more"],
    ["common.search", "nav.search"],
    ["common.settings", "nav.settings"],
    ["common.insights", "nav.insights"],
    ["common.healthRisks", "nav.healthRisks"],
    ["common.billing", "nav.billing"],
    ["common.help", "nav.help"],
    ["common.logout", "nav.logout"],
    ["common.login", "nav.login"],
    ["common.signup", "nav.signup"],
  ];
  for (const [commonKey, navKey] of commonToNav) {
    if (regional[commonKey] && !overlay[navKey]) {
      overlay[navKey] = regional[commonKey];
    }
  }

  for (const k of CORE_UI_KEYS) {
    if (!overlay[k] && regional[k]) overlay[k] = regional[k];
  }

  if (HINDI_UI_FALLBACK.includes(code)) {
    for (const k of CORE_UI_KEYS) {
      if (!overlay[k] && HI_CORE[k]) overlay[k] = HI_CORE[k];
    }
  }

  return Object.keys(overlay).length > 0 ? overlay : undefined;
}
