import type { ParsedLabValue } from "@/lib/lab-value-parser";
import {
  calculateMarkerDeduction,
  getScoreGroup,
  GROUP_CAPS,
  maxSeverity,
  shouldScoreLabValue,
  type AbnormalSeverity,
  type MarkerDeduction,
  type ScoreGroup,
} from "@/lib/health-score-rules";

export type HealthScoreFactor = {
  canonicalName: string;
  displayName: string;
  category: string;
  group?: ScoreGroup;
  value: number | string;
  unit: string | null;
  referenceRange: string | null;
  status: string;
  severity: AbnormalSeverity;
  deduction: number;
  deductionApplied?: number;
  reason: string;
  combined?: boolean;
};

export type HealthScoreResult = {
  score: number;
  factors: HealthScoreFactor[];
  scoreSource: "structured_lab_values" | "ai_fallback";
};

const LIVER_ENZYMES = new Set(["sgot", "sgpt"]);

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function scoreWhenAllNormal(parsedCount: number): number {
  if (parsedCount >= 5) return 100;
  if (parsedCount >= 3) return 98;
  if (parsedCount >= 1) return 96;
  return 95;
}

function applyGroupCaps(markers: MarkerDeduction[]): {
  factors: HealthScoreFactor[];
  totalDeduction: number;
} {
  const byGroup = new Map<ScoreGroup, MarkerDeduction[]>();
  for (const m of markers) {
    const list = byGroup.get(m.group) || [];
    list.push(m);
    byGroup.set(m.group, list);
  }

  const factors: HealthScoreFactor[] = [];
  let totalDeduction = 0;

  for (const [group, groupMarkers] of byGroup) {
    const groupSeverity = groupMarkers.reduce(
      (max, m) => maxSeverity(max, m.severity),
      "mild" as AbnormalSeverity
    );
    const rawSum = groupMarkers.reduce((s, m) => s + m.rawDeduction, 0);
    const cap = GROUP_CAPS[group]?.[groupSeverity] ?? rawSum;
    const appliedTotal = Math.min(rawSum, cap);
    totalDeduction += appliedTotal;

    const scale = rawSum > 0 ? appliedTotal / rawSum : 1;

    if (group === "liver" && groupMarkers.filter((m) => LIVER_ENZYMES.has(m.canonicalName)).length >= 2) {
      const liverSubset = groupMarkers.filter((m) => LIVER_ENZYMES.has(m.canonicalName));
      const liverRaw = liverSubset.reduce((s, m) => s + m.rawDeduction, 0);
      const liverApplied = Math.min(liverRaw * scale, cap);
      const liverSeverity = liverSubset.reduce(
        (max, m) => maxSeverity(max, m.severity),
        "mild" as AbnormalSeverity
      );

      factors.push({
        canonicalName: "liver_enzymes",
        displayName: "Liver enzymes elevated",
        category: "liver",
        group: "liver",
        value: liverSubset.map((m) => `${m.displayName}: ${m.value}`).join("; "),
        unit: null,
        referenceRange: null,
        status: "high",
        severity: liverSeverity,
        deduction: Math.round(liverApplied),
        deductionApplied: Math.round(liverApplied),
        reason:
          "Multiple liver enzymes (e.g. AST/SGOT and ALT/SGPT) are above reference ranges.",
        combined: true,
      });

      for (const m of groupMarkers) {
        if (!LIVER_ENZYMES.has(m.canonicalName)) {
          const applied = Math.round(m.rawDeduction * scale);
          factors.push({
            canonicalName: m.canonicalName,
            displayName: m.displayName,
            category: m.category,
            group: m.group,
            value: m.value,
            unit: m.unit,
            referenceRange: m.referenceRange,
            status: m.status,
            severity: m.severity,
            deduction: m.rawDeduction,
            deductionApplied: applied,
            reason: m.reason,
          });
        } else {
          factors.push({
            canonicalName: m.canonicalName,
            displayName: m.displayName,
            category: m.category,
            group: m.group,
            value: m.value,
            unit: m.unit,
            referenceRange: m.referenceRange,
            status: m.status,
            severity: m.severity,
            deduction: m.rawDeduction,
            deductionApplied: Math.round(m.rawDeduction * scale),
            reason: m.reason,
            combined: true,
          });
        }
      }
      continue;
    }

    for (const m of groupMarkers) {
      const applied = Math.round(m.rawDeduction * scale);
      factors.push({
        canonicalName: m.canonicalName,
        displayName: m.displayName,
        category: m.category,
        group: m.group,
        value: m.value,
        unit: m.unit,
        referenceRange: m.referenceRange,
        status: m.status,
        severity: m.severity,
        deduction: m.rawDeduction,
        deductionApplied: applied,
        reason: m.reason,
      });
    }
  }

  factors.sort((a, b) => (b.deductionApplied ?? b.deduction) - (a.deductionApplied ?? a.deduction));
  return { factors, totalDeduction };
}

export function computeHealthScoreFromLabValues(
  values: ParsedLabValue[],
  aiFallbackScore?: number
): HealthScoreResult {
  const scorable = values.filter(shouldScoreLabValue);
  const meaningfulParsed = values.filter(
    (v) => v.confidence >= 0.5 && v.status !== "unknown"
  );

  if (scorable.length === 0) {
    const fallback =
      typeof aiFallbackScore === "number" && Number.isFinite(aiFallbackScore)
        ? clampScore(aiFallbackScore)
        : null;

    return {
      score: fallback ?? 95,
      factors: [],
      scoreSource: "ai_fallback",
    };
  }

  const markers: MarkerDeduction[] = [];
  for (const v of scorable) {
    const m = calculateMarkerDeduction(v);
    if (m) markers.push(m);
  }

  if (markers.length === 0) {
    return {
      score: scoreWhenAllNormal(meaningfulParsed.length),
      factors: [],
      scoreSource: "structured_lab_values",
    };
  }

  const { factors, totalDeduction } = applyGroupCaps(markers);
  const score = clampScore(100 - totalDeduction);

  if (markers.length > 0 && score >= 100) {
    return {
      score: 94,
      factors,
      scoreSource: "structured_lab_values",
    };
  }

  return {
    score,
    factors,
    scoreSource: "structured_lab_values",
  };
}

/** @deprecated Use computeHealthScoreFromLabValues */
export function computeHealthScoreFromLabs(values: ParsedLabValue[]): HealthScoreResult {
  return computeHealthScoreFromLabValues(values);
}
