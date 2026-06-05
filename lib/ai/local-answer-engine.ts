import prisma from "@/lib/prisma";
import { searchFoodNutrition } from "@/lib/nutrition/chat-tools";
import { IFCT_SOURCE_ATTRIBUTION } from "@/lib/nutrition/config";
import { displayNameForCanonical } from "@/lib/lab-test-aliases";
import type { ParsedLabValue } from "@/lib/lab-value-parser";

export type LocalAnswerResult = {
  answer: string;
  confidence: "high" | "low";
  source: "ifct" | "lab_values" | "reminders" | "reports" | "none";
  feature: string;
};

const NUTRITION_LOOKUP_RE =
  /(?:^|\s)([\w\u0900-\u097F][\w\u0900-\u097F\s-]{1,40}?)\s+(?:me|में)\s+(?:kitna|कितना)\s+(?:protein|प्रोटीन|calorie|कैलोरी|fat|चर्बी|iron|आयरन)/i;

const LAB_VALUE_RE =
  /(?:mera|my)\s+([\w\s]+?)\s+(?:kitna|कितना|value|मान)\s*(?:hai|है)?/i;

const LAB_EXPLAIN_RE =
  /(?:samjhao|समझाओ|explain|matlab|मतलब|meaning)/i;

const REMINDER_RE =
  /pending\s+reminder|reminder.*pending|कौन\s*से\s*reminder|upcoming\s+reminder/i;

const REPORT_STATUS_RE =
  /(?:which|kaun\s*si|कौन\s*सी)\s+reports?\s+(?:pending|waiting|प्रतीक्षा)|reports?\s+waiting\s+for\s+summary/i;

function extractFoodName(message: string): string | null {
  const m = message.match(NUTRITION_LOOKUP_RE);
  if (!m) return null;
  return m[1].trim();
}

function extractLabMarker(message: string): string | null {
  const m = message.match(LAB_VALUE_RE);
  if (!m) return null;
  return m[1].trim();
}

function findLabInContext(
  marker: string,
  labs: Array<{ testName?: string; value?: string; valueText?: string; unit?: string; status?: string }>
): { testName: string; value: string; unit?: string; status?: string } | null {
  const q = marker.toLowerCase().replace(/\s+/g, " ");
  for (const l of labs) {
    const name = (l.testName || "").toLowerCase();
    if (name.includes(q) || q.includes(name)) {
      return {
        testName: l.testName || marker,
        value: l.valueText || l.value || "",
        unit: l.unit,
        status: l.status,
      };
    }
  }
  return null;
}

function findParsedLab(marker: string, structured: ParsedLabValue[]): ParsedLabValue | null {
  const q = marker.toLowerCase().replace(/\s+/g, " ");
  return (
    structured.find(
      (v) =>
        v.testName.toLowerCase().includes(q) ||
        v.canonicalName.replace(/_/g, " ").includes(q) ||
        q.includes(v.canonicalName.replace(/_/g, " "))
    ) ?? null
  );
}

export async function tryLocalAnswer(params: {
  userId: string;
  message: string;
  language: "en" | "hi";
  reportId?: string | null;
  context?: Record<string, unknown>;
}): Promise<LocalAnswerResult | null> {
  const msg = params.message.trim();
  const hi = params.language === "hi";

  if (LAB_EXPLAIN_RE.test(msg)) {
    return null;
  }

  const foodName = extractFoodName(msg);
  if (foodName) {
    const data = await searchFoodNutrition(foodName);
    if (data.found && data.macros?.length) {
      const protein = data.macros.find((n) => n.code === "protein");
      const energy = data.macros.find((n) => n.code === "energy");
      const line = protein
        ? `${data.match?.name}: protein ~${protein.value}${protein.unit} per 100g`
        : energy
          ? `${data.match?.name}: energy ~${energy.value}${energy.unit} per 100g`
          : `${data.match?.name}: see IFCT nutrients`;
      const answer = hi
        ? `${line}. (${IFCT_SOURCE_ATTRIBUTION})`
        : `${line}. (${IFCT_SOURCE_ATTRIBUTION})`;
      return { answer, confidence: "high", source: "ifct", feature: "nutrition_lookup" };
    }
  }

  const labMarker = extractLabMarker(msg);
  if (labMarker) {
    const report = params.context?.report as
      | { manualLabValues?: Array<{ testName?: string; value?: string; valueText?: string; unit?: string; status?: string }> }
      | undefined;
    const labs = report?.manualLabValues ?? [];
    const hit = findLabInContext(labMarker, labs);
    if (hit?.value) {
      const answer = hi
        ? `आपकी सहेजी रिपोर्ट में ${hit.testName}: ${hit.value}${hit.unit ? ` ${hit.unit}` : ""}${hit.status ? ` (${hit.status})` : ""}.`
        : `From your saved report: ${hit.testName} is ${hit.value}${hit.unit ? ` ${hit.unit}` : ""}${hit.status ? ` (${hit.status})` : ""}.`;
      return { answer, confidence: "high", source: "lab_values", feature: "lab_lookup" };
    }
    const structured = (params.context?.structuredLabValues as ParsedLabValue[] | undefined) ?? [];
    const parsed = findParsedLab(labMarker, structured);
    if (parsed) {
      const name = parsed.testName || displayNameForCanonical(parsed.canonicalName);
      const val =
        parsed.numericValue != null ? String(parsed.numericValue) : String(parsed.value);
      const answer = hi
        ? `आपकी रिपोर्ट में ${name}: ${val}${parsed.unit ? ` ${parsed.unit}` : ""} (${parsed.status}).`
        : `From your report: ${name} is ${val}${parsed.unit ? ` ${parsed.unit}` : ""} (${parsed.status}).`;
      return { answer, confidence: "high", source: "lab_values", feature: "lab_lookup" };
    }
  }

  if (REMINDER_RE.test(msg)) {
    const reminders = await prisma.reminder.findMany({
      where: { userId: params.userId, status: { in: ["pending", "active"] } },
      orderBy: { scheduledAt: "asc" },
      take: 10,
      select: { title: true, scheduledAt: true, status: true },
    });
    if (reminders.length) {
      const lines = reminders.map(
        (r) => `${r.title} — ${r.scheduledAt.toISOString().slice(0, 10)} (${r.status})`
      );
      const answer = hi
        ? `लंबित/सक्रिय रिमाइंडर:\n${lines.join("\n")}`
        : `Pending/active reminders:\n${lines.join("\n")}`;
      return { answer, confidence: "high", source: "reminders", feature: "reminder_lookup" };
    }
    const answer = hi ? "कोई लंबित रिमाइंडर नहीं मिला।" : "No pending reminders found.";
    return { answer, confidence: "high", source: "reminders", feature: "reminder_lookup" };
  }

  if (REPORT_STATUS_RE.test(msg)) {
    const pending = await prisma.document.findMany({
      where: {
        userId: params.userId,
        uploadStatus: "text_extracted",
        report: null,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, originalFilename: true, createdAt: true },
    });
    if (pending.length) {
      const lines = pending.map(
        (d) => `${d.originalFilename} — ${d.createdAt.toISOString().slice(0, 10)}`
      );
      const answer = hi
        ? `सारांश के लिए प्रतीक्षा में रिपोर्ट:\n${lines.join("\n")}`
        : `Reports waiting for summary:\n${lines.join("\n")}`;
      return { answer, confidence: "high", source: "reports", feature: "report_status" };
    }
    const answer = hi
      ? "कोई रिपोर्ट सारांश के लिए लंबित नहीं है।"
      : "No reports are waiting for a summary.";
    return { answer, confidence: "high", source: "reports", feature: "report_status" };
  }

  return null;
}
