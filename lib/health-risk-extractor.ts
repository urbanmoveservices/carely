import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  CATEGORY_KEYWORDS,
  DEFAULT_SUGGESTED_ACTIONS,
  detectCategory,
  matchesCategory,
  normalizeAbnormalValues,
  normalizeChartData,
  normalizeKeyFindings,
  normalizeRiskFlags,
  safeRiskMessage,
  severityToLevel,
  textBlob,
} from "@/lib/report-data-normalize";
import { hasHealthRiskDelegate, warnMissingDelegate } from "@/lib/prisma-delegate-guards";
import type { ParsedLabValue } from "@/lib/lab-value-parser";
import { GENERIC_CATEGORY_LABELS, categoryHasStructuredMarker } from "@/lib/lab-test-aliases";
import {
  canonicalRiskKeyForLab,
  riskTitleForLab,
  riskMessageForLab,
  riskLevelFromLab,
  detectCategoryFromCanonical,
  shouldCreateRiskForLab,
  liverEnzymesElevatedKey,
  isLiverEnzymeMarker,
} from "@/lib/health-risk-from-labs";

type ReportLike = {
  id: string;
  abnormalValues: unknown;
  keyFindings: unknown;
  riskFlags: unknown;
  chartData: unknown;
  contextualInsights?: unknown;
};

function dedupeKey(category: string, title: string) {
  return `${category}::${title.toLowerCase()}`;
}

function isBlockedGenericTitle(title: string, structuredCanonical: Set<string>): boolean {
  const t = title.toLowerCase();
  if (/\bunknown\b/i.test(t)) return structuredCanonical.size > 0;
  if (GENERIC_CATEGORY_LABELS.some((g) => t.includes(g))) {
    return categoryHasStructuredMarker(t, structuredCanonical);
  }
  if (t.includes("thyroid function") || t.includes("cholesterol levels")) {
    return categoryHasStructuredMarker(t, structuredCanonical);
  }
  if (t.endsWith(" finding") || t.endsWith(" may need attention")) {
    return categoryHasStructuredMarker(t.replace(/ (finding|may need attention)$/i, ""), structuredCanonical);
  }
  return false;
}

function buildLifestyleRisks(
  context: Record<string, unknown> | null | undefined,
  hasSugarMarker: boolean,
  hasLiverMarker: boolean,
  hasCardioMarker: boolean
): Array<{
  category: string;
  canonicalRiskKey?: string;
  title: string;
  level: "info" | "warning" | "critical";
  message: string;
  evidence: unknown;
  suggestedActions: unknown;
}> {
  const cards: Array<{
    category: string;
    canonicalRiskKey?: string;
    title: string;
    level: "info" | "warning" | "critical";
    message: string;
    evidence: unknown;
    suggestedActions: unknown;
  }> = [];
  if (!context) return cards;

  const q = (context.questionnaire || context) as Record<string, unknown>;
  const smoking = String(q.smokingStatus || "");
  const alcohol = String(q.alcoholUse || "");
  const activity = String(q.physicalActivity || "");
  const sugarIntake = String(q.sugarIntake || "");

  if ((smoking === "daily" || smoking === "occasional") && hasCardioMarker) {
    cards.push({
      category: "lifestyle",
      canonicalRiskKey: "tobacco_cardiovascular_context",
      title: "Tobacco use and cardiovascular markers",
      level: "warning",
      message:
        "You reported tobacco use and your report includes cardiovascular-related markers. Based on uploaded report data, consider discussing smoking cessation support with your doctor. Not a diagnosis.",
      evidence: [{ source: "context", label: "smokingStatus", value: smoking }],
      suggestedActions: DEFAULT_SUGGESTED_ACTIONS,
    });
  }

  if ((alcohol === "weekly" || alcohol === "daily") && hasLiverMarker) {
    cards.push({
      category: "lifestyle",
      title: "Alcohol use and liver markers",
      level: "warning",
      message:
        "You reported alcohol use and liver-related markers appear in your report. Consider discussing this with your doctor. Not a diagnosis.",
      evidence: [{ source: "context", label: "alcoholUse", value: alcohol }],
      suggestedActions: DEFAULT_SUGGESTED_ACTIONS,
    });
  }

  if (
    (sugarIntake === "high" || sugarIntake === "very_high") &&
    matchesCategory("sugar", CATEGORY_KEYWORDS.sugar)
  ) {
    cards.push({
      category: "lifestyle",
      title: "Sugar intake and glucose markers",
      level: "warning",
      message:
        "Higher reported sugar intake together with glucose-related values in your report may be worth discussing with a doctor. Not a diagnosis.",
      evidence: [{ source: "context", label: "sugarIntake", value: sugarIntake }],
      suggestedActions: [
        "Discuss diet and sugar intake with your doctor",
        ...DEFAULT_SUGGESTED_ACTIONS,
      ],
    });
  }

  if (activity === "sedentary") {
    cards.push({
      category: "lifestyle",
      title: "Low activity level",
      level: "info",
      message:
        "You reported sedentary activity. Pairing gradual activity with your lab trends may help—discuss a safe plan with your doctor.",
      evidence: [{ source: "context", label: "physicalActivity", value: activity }],
      suggestedActions: ["Discuss activity goals with your doctor"],
    });
  }

  return cards;
}

export async function extractAndSaveHealthRisks(params: {
  userId: string;
  documentId: string;
  reportId: string;
  familyMemberId?: string | null;
  report: ReportLike;
  context?: Record<string, unknown> | null;
  structuredLabValues?: ParsedLabValue[];
}) {
  if (!hasHealthRiskDelegate()) {
    warnMissingDelegate("healthRisk");
    return [];
  }

  await prisma.healthRisk.deleteMany({
    where: { reportId: params.reportId, userId: params.userId },
  });

  const abnormal = normalizeAbnormalValues(params.report.abnormalValues);
  const findings = normalizeKeyFindings(params.report.keyFindings);
  const flags = normalizeRiskFlags(params.report.riskFlags);
  const charts = normalizeChartData(params.report.chartData);

  const draft: Array<{
    category: string;
    canonicalRiskKey?: string;
    title: string;
    level: "info" | "warning" | "critical";
    message: string;
    evidence: Prisma.InputJsonValue;
    suggestedActions: Prisma.InputJsonValue;
    source: string;
  }> = [];

  const structuredCanonical = new Set(
    (params.structuredLabValues || []).map((v) => v.canonicalName)
  );
  const seen = new Set<string>();
  const seenRiskKeys = new Set<string>();

  const addCard = (card: (typeof draft)[0]) => {
    if (card.canonicalRiskKey) {
      if (seenRiskKeys.has(card.canonicalRiskKey)) return;
      seenRiskKeys.add(card.canonicalRiskKey);
    }
    const key = dedupeKey(card.category, card.title);
    if (seen.has(key)) return;
    seen.add(key);
    draft.push(card);
  };

  const structuredLabs = params.structuredLabValues || [];
  const abnormalLabs = structuredLabs.filter(shouldCreateRiskForLab);
  const elevatedLiverEnzymes = abnormalLabs.filter(
    (v) => isLiverEnzymeMarker(v.canonicalName) && v.status === "high"
  );

  if (elevatedLiverEnzymes.length >= 2) {
    const names = elevatedLiverEnzymes
      .map((v) => v.testName || v.canonicalName)
      .join(", ");
    addCard({
      category: "liver",
      canonicalRiskKey: liverEnzymesElevatedKey(),
      title: "Liver enzymes elevated",
      level: "warning",
      message: `Uploaded report shows elevated liver enzymes (${names}). Based on uploaded report data—not a final diagnosis.`,
      evidence: elevatedLiverEnzymes.map((v) => ({
        label: v.testName,
        value: v.numericValue ?? v.value,
        unit: v.unit,
        normalRange: v.referenceRange,
        status: v.status,
        source: "structuredLabValues",
      })) as Prisma.InputJsonValue,
      suggestedActions: DEFAULT_SUGGESTED_ACTIONS as Prisma.InputJsonValue,
      source: "report",
    });
  }

  for (const v of abnormalLabs) {
    if (elevatedLiverEnzymes.length >= 2 && isLiverEnzymeMarker(v.canonicalName)) {
      continue;
    }
    const canonicalRiskKey = canonicalRiskKeyForLab(v);
    addCard({
      category: detectCategoryFromCanonical(v.canonicalName),
      canonicalRiskKey,
      title: riskTitleForLab(v),
      level: riskLevelFromLab(v),
      message: riskMessageForLab(v),
      evidence: [
        {
          label: v.testName,
          value: v.numericValue ?? v.value,
          unit: v.unit,
          normalRange: v.referenceRange,
          status: v.status,
          source: "structuredLabValues",
        },
      ] as Prisma.InputJsonValue,
      suggestedActions: DEFAULT_SUGGESTED_ACTIONS as Prisma.InputJsonValue,
      source: "report",
    });
  }

  for (const a of abnormal) {
    if (isBlockedGenericTitle(a.name, structuredCanonical)) continue;
    const cat = detectCategory(`${a.name} ${a.value}`);
    const level = severityToLevel(a.severity);
    addCard({
      category: cat,
      title: `${a.name} may need attention`,
      level,
      message: safeRiskMessage(cat, a.name),
      evidence: [
        {
          label: a.name,
          value: a.value,
          normalRange: a.normalRange,
          source: "abnormalValues",
        },
      ] as Prisma.InputJsonValue,
      suggestedActions: DEFAULT_SUGGESTED_ACTIONS as Prisma.InputJsonValue,
      source: "report",
    });
  }

  for (const f of findings) {
    if (f.status === "normal") continue;
    if (isBlockedGenericTitle(f.title, structuredCanonical)) continue;
    const cat = detectCategory(`${f.title} ${f.value}`);
    addCard({
      category: cat,
      title: `${f.title} finding`,
      level: severityToLevel(f.status),
      message: safeRiskMessage(cat, f.title),
      evidence: [
        { label: f.title, value: f.value, source: "keyFindings", status: f.status },
      ] as Prisma.InputJsonValue,
      suggestedActions: DEFAULT_SUGGESTED_ACTIONS as Prisma.InputJsonValue,
      source: "report",
    });
  }

  for (const flag of flags) {
    if (flag.level === "info") continue;
    addCard({
      category: "general",
      title: "Report alert",
      level: flag.level === "critical" ? "critical" : "warning",
      message:
        flag.message.length > 200
          ? `${flag.message.slice(0, 200)}… Based on uploaded report data—not a final diagnosis.`
          : `${flag.message} Based on uploaded report data—not a final diagnosis.`,
      evidence: [{ source: "riskFlags" }] as Prisma.InputJsonValue,
      suggestedActions: DEFAULT_SUGGESTED_ACTIONS as Prisma.InputJsonValue,
      source: "report",
    });
  }

  for (const c of charts) {
    if (!c.normalMin && !c.normalMax) continue;
    let status = "unknown";
    if (c.normalMax != null && c.value > c.normalMax) status = "high";
    if (c.normalMin != null && c.value < c.normalMin) status = "low";
    if (status === "unknown") continue;
    const cat = detectCategory(c.label);
    addCard({
      category: cat,
      title: `${c.label} trend`,
      level: status === "high" ? "warning" : "info",
      message: safeRiskMessage(cat, c.label),
      evidence: [
        {
          label: c.label,
          value: `${c.value}${c.unit ? ` ${c.unit}` : ""}`,
          source: "chartData",
        },
      ] as Prisma.InputJsonValue,
      suggestedActions: DEFAULT_SUGGESTED_ACTIONS as Prisma.InputJsonValue,
      source: "report",
    });
  }

  const blob = textBlob([
    ...abnormal.map((a) => `${a.name} ${a.value}`),
    ...findings.map((f) => `${f.title} ${f.value}`),
  ]);
  const hasSugarMarker = matchesCategory(blob, CATEGORY_KEYWORDS.sugar);
  const hasLiverMarker = matchesCategory(blob, CATEGORY_KEYWORDS.liver);
  const hasCardioMarker =
    matchesCategory(blob, CATEGORY_KEYWORDS.cholesterol) ||
    matchesCategory(blob, CATEGORY_KEYWORDS.bp);

  for (const lc of buildLifestyleRisks(
    params.context,
    hasSugarMarker,
    hasLiverMarker,
    hasCardioMarker
  )) {
    addCard({
      ...lc,
      source: "report",
      evidence: lc.evidence as Prisma.InputJsonValue,
      suggestedActions: lc.suggestedActions as Prisma.InputJsonValue,
      canonicalRiskKey: lc.canonicalRiskKey,
    });
  }

  const created = [];
  for (const card of draft) {
    const base = {
      userId: params.userId,
      familyMemberId: params.familyMemberId ?? null,
      documentId: params.documentId,
      reportId: params.reportId,
      category: card.category,
      canonicalRiskKey: card.canonicalRiskKey ?? null,
      title: card.title,
      level: card.level,
      message: card.message,
      evidence: card.evidence,
      suggestedActions: card.suggestedActions,
      source: card.source,
      status: "active",
    };

    let row;
    if (card.canonicalRiskKey) {
      row = await prisma.healthRisk.upsert({
        where: {
          userId_reportId_canonicalRiskKey: {
            userId: params.userId,
            reportId: params.reportId,
            canonicalRiskKey: card.canonicalRiskKey,
          },
        },
        create: base,
        update: {
          title: base.title,
          level: base.level,
          message: base.message,
          evidence: base.evidence,
          suggestedActions: base.suggestedActions,
          category: base.category,
          status: "active",
          detectedAt: new Date(),
        },
      });
    } else {
      row = await prisma.healthRisk.create({ data: base });
    }
    created.push(row);
  }

  return created;
}
