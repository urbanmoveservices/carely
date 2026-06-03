import prisma from "@/lib/prisma";
import { hasLabTrendRecordDelegate, warnMissingDelegate } from "@/lib/prisma-delegate-guards";
import {
  detectCategory,
  normalizeAbnormalValues,
  normalizeChartData,
  normalizeKeyFindings,
} from "@/lib/report-data-normalize";

const MARKER_ALIASES: Record<string, string> = {
  "fasting blood sugar": "fasting_blood_sugar",
  "blood sugar": "blood_sugar",
  "random blood sugar": "random_blood_sugar",
  glucose: "blood_glucose",
  "total cholesterol": "total_cholesterol",
  ldl: "ldl",
  hdl: "hdl",
  triglycerides: "triglycerides",
  "vitamin d": "vitamin_d",
  "vitamin b12": "vitamin_b12",
  hemoglobin: "hemoglobin",
  hb: "hemoglobin",
  tsh: "tsh",
  creatinine: "creatinine",
  sgpt: "alt",
  alt: "alt",
  sgot: "ast",
  ast: "ast",
};

function markerKeyFromLabel(label: string): string {
  const t = label.toLowerCase().trim();
  for (const [alias, key] of Object.entries(MARKER_ALIASES)) {
    if (t.includes(alias)) return key;
  }
  return t.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "unknown";
}

function parseNumericValue(value: string): { num: number | null; unit: string | null } {
  const m = value.match(/([\d.]+)\s*([a-zA-Z%/]+)?/);
  if (!m) return { num: null, unit: null };
  const num = parseFloat(m[1]);
  return { num: Number.isNaN(num) ? null : num, unit: m[2] || null };
}

export async function extractAndSaveLabTrends(params: {
  userId: string;
  documentId: string;
  reportId: string;
  familyMemberId?: string | null;
  report: {
    abnormalValues: unknown;
    keyFindings: unknown;
    chartData: unknown;
  };
  document: { createdAt: Date };
}) {
  if (!hasLabTrendRecordDelegate()) {
    warnMissingDelegate("labTrendRecord");
    return [];
  }

  await prisma.labTrendRecord.deleteMany({
    where: { reportId: params.reportId, userId: params.userId },
  });

  const measuredAt = params.document.createdAt;
  const rows: Array<{
    markerName: string;
    markerKey: string;
    value: number | null;
    unit: string | null;
    normalMin: number | null;
    normalMax: number | null;
    status: string | null;
  }> = [];

  const seen = new Set<string>();

  const push = (entry: (typeof rows)[0]) => {
    if (seen.has(entry.markerKey)) return;
    seen.add(entry.markerKey);
    rows.push(entry);
  };

  for (const c of normalizeChartData(params.report.chartData)) {
    push({
      markerName: c.label,
      markerKey: markerKeyFromLabel(c.label),
      value: c.value,
      unit: c.unit ?? null,
      normalMin: c.normalMin ?? null,
      normalMax: c.normalMax ?? null,
      status:
        c.normalMax != null && c.value > c.normalMax
          ? "high"
          : c.normalMin != null && c.value < c.normalMin
          ? "low"
          : "normal",
    });
  }

  for (const a of normalizeAbnormalValues(params.report.abnormalValues)) {
    const { num, unit } = parseNumericValue(a.value);
    push({
      markerName: a.name,
      markerKey: markerKeyFromLabel(a.name),
      value: num,
      unit,
      normalMin: null,
      normalMax: null,
      status:
        a.severity === "high" || a.severity === "critical"
          ? "high"
          : a.severity === "low"
          ? "low"
          : "unknown",
    });
  }

  for (const f of normalizeKeyFindings(params.report.keyFindings)) {
    const { num, unit } = parseNumericValue(f.value);
    if (num === null) continue;
    push({
      markerName: f.title,
      markerKey: markerKeyFromLabel(f.title),
      value: num,
      unit,
      normalMin: null,
      normalMax: null,
      status: f.status === "normal" ? "normal" : f.status,
    });
  }

  const created = [];
  for (const r of rows) {
    const row = await prisma.labTrendRecord.create({
      data: {
        userId: params.userId,
        familyMemberId: params.familyMemberId ?? null,
        documentId: params.documentId,
        reportId: params.reportId,
        markerName: r.markerName,
        markerKey: r.markerKey,
        value: r.value,
        unit: r.unit,
        normalMin: r.normalMin,
        normalMax: r.normalMax,
        status: r.status,
        measuredAt,
        source: "report",
      },
    });
    created.push(row);
  }

  return created;
}
