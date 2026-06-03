import {
  resolveCanonicalTestName,
  displayNameForCanonical,
  type LabCategory,
} from "@/lib/lab-test-aliases";
import { parseReferenceRange } from "@/lib/lab-reference-parser";
import { calculateLabStatus } from "@/lib/lab-status-calculator";

export const LAB_PARSER_VERSION = "2.0.0";

export type ParsedLabValue = {
  testName: string;
  canonicalName: string;
  category: string;
  value: number | string;
  numericValue?: number;
  unit: string | null;
  referenceRange: string | null;
  referenceMin?: number;
  referenceMax?: number;
  status: "high" | "low" | "normal" | "unknown";
  sourcePage?: number;
  confidence: number;
  sourceText?: string;
};

const PAGE_MARKER = /^---\s*Page\s+(\d+)/i;
const NUMERIC_VALUE = /^([\d.]+)$/;
const UNIT_PATTERN =
  /^(mg\/dL|mg\/dl|g\/dL|g\/dl|mmol\/L|µIU\/mL|uIU\/mL|mIU\/L|IU\/L|%|pg\/mL|ng\/mL|fL|pg|cells\/cumm|million\/cumm|\/cumm|U\/L|units\/L|mm\/hr|mEq\/L|µg\/dL|ug\/dL)$/i;

const FLAG_SUFFIX = /\s*(?:H|L|HIGH|LOW|↑|↓|\*+)\s*$/i;

function parseNumericFromValue(raw: string): { numeric?: number; text: string } {
  const cleaned = raw.replace(FLAG_SUFFIX, "").trim();
  const m = cleaned.match(/^([\d.]+)/);
  if (!m) return { text: cleaned };
  const numeric = parseFloat(m[1]);
  if (!Number.isFinite(numeric)) return { text: cleaned };
  return { numeric, text: cleaned };
}

function splitColumns(line: string): string[] {
  if (line.includes("|")) {
    return line.split("|").map((c) => c.trim()).filter(Boolean);
  }
  if (line.includes("\t")) {
    return line.split("\t").map((c) => c.trim()).filter(Boolean);
  }
  const parts = line.split(/\s{2,}/).map((c) => c.trim()).filter(Boolean);
  if (parts.length >= 3) return parts;
  return line.split(/\s+/).filter(Boolean);
}

function tryParseTableRow(
  line: string,
  sourcePage?: number
): ParsedLabValue | null {
  const cols = splitColumns(line);
  if (cols.length < 2) return null;

  const headerLike =
    /^(test|analyse|analysis|parameter|investigation|result|current value|units|reference|normal range|biological reference)/i;
  if (cols.some((c) => headerLike.test(c))) return null;

  let testName = "";
  let valueStr = "";
  let unit: string | null = null;
  let refStr = "";

  if (cols.length >= 4) {
    testName = cols[0];
    valueStr = cols[1];
    const col2 = cols[2];
    const col3 = cols.slice(3).join(" ");
    if (UNIT_PATTERN.test(col2) || /^[a-z%/]+$/i.test(col2)) {
      unit = col2;
      refStr = col3;
    } else if (NUMERIC_VALUE.test(col2)) {
      valueStr = `${cols[1]} ${cols[2]}`.trim();
      unit = cols[3] && !/[\d.<-]/.test(cols[3][0]) ? cols[3] : null;
      refStr = cols.slice(unit ? 4 : 3).join(" ");
    } else {
      refStr = cols.slice(2).join(" ");
    }
  } else if (cols.length === 3) {
    testName = cols[0];
    valueStr = cols[1];
    refStr = cols[2];
    const vm = cols[1].match(/^([\d.]+)\s*(.+)$/);
    if (vm) {
      valueStr = vm[1];
      const rest = vm[2].trim();
      if (UNIT_PATTERN.test(rest)) unit = rest;
      else refStr = rest + " " + refStr;
    }
  } else {
    return null;
  }

  return buildParsedValue(testName, valueStr, unit, refStr, line, sourcePage);
}

function tryParseInlineLine(
  line: string,
  sourcePage?: number
): ParsedLabValue | null {
  const trimmed = line.replace(FLAG_SUFFIX, "").trim();
  if (trimmed.length < 8 || trimmed.length > 220) return null;
  if (!/[\d.]/.test(trimmed)) return null;

  const resolved = resolveCanonicalTestName(trimmed);
  if (!resolved) return null;

  const afterName = trimmed.slice(
    trimmed.toLowerCase().indexOf(resolved.matchedAlias) + resolved.matchedAlias.length
  ).trim();

  const match = afterName.match(
    /^[\s:|-]*([\d.]+)\s*([a-zA-Z%/µ][\w/.µ-]*)?\s*(.*)$/i
  );
  if (!match) return null;

  const valueStr = match[1];
  let unit: string | null = match[2]?.trim() || null;
  let refStr = (match[3] || "").trim();
  if (unit && !UNIT_PATTERN.test(unit) && /[\d.<-]/.test(unit)) {
    refStr = `${unit} ${refStr}`.trim();
    unit = null;
  }

  return buildParsedValue(
    resolved.matchedAlias,
    valueStr,
    unit,
    refStr,
    line,
    sourcePage,
    resolved.canonicalName,
    resolved.category
  );
}

function buildParsedValue(
  testName: string,
  valueStr: string,
  unit: string | null,
  refStr: string,
  sourceLine: string,
  sourcePage?: number,
  forcedCanonical?: string,
  forcedCategory?: LabCategory
): ParsedLabValue | null {
  const resolved = forcedCanonical
    ? {
        canonicalName: forcedCanonical,
        category: forcedCategory!,
        matchedAlias: testName,
      }
    : resolveCanonicalTestName(testName);

  if (!resolved) return null;

  const { numeric, text } = parseNumericFromValue(valueStr);
  if (numeric == null && !text) return null;

  const ref = parseReferenceRange(refStr || null);
  const status = calculateLabStatus(numeric, ref);

  let confidence = 0.75;
  if (ref?.referenceMin != null || ref?.referenceMax != null) confidence += 0.1;
  if (unit) confidence += 0.05;
  if (status !== "unknown") confidence += 0.05;
  confidence = Math.min(0.98, confidence);

  return {
    testName: testName.trim() || displayNameForCanonical(resolved.canonicalName),
    canonicalName: resolved.canonicalName,
    category: resolved.category,
    value: numeric ?? text,
    numericValue: numeric,
    unit,
    referenceRange: ref?.referenceRange ?? (refStr || null),
    referenceMin: ref?.referenceMin,
    referenceMax: ref?.referenceMax,
    status,
    sourcePage,
    confidence,
    sourceText: sourceLine.slice(0, 500),
  };
}

function dedupeValues(values: ParsedLabValue[]): ParsedLabValue[] {
  const byKey = new Map<string, ParsedLabValue>();
  for (const v of values) {
    const key = v.canonicalName;
    const existing = byKey.get(key);
    if (!existing || v.confidence > existing.confidence) {
      byKey.set(key, v);
    }
  }
  return [...byKey.values()];
}

export function parseLabValuesFromText(extractedText: string): ParsedLabValue[] {
  if (!extractedText?.trim()) return [];

  const results: ParsedLabValue[] = [];
  let currentPage: number | undefined;

  const lines = extractedText.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const pageM = line.match(PAGE_MARKER);
    if (pageM) {
      currentPage = parseInt(pageM[1], 10);
      continue;
    }

    const tableRow = tryParseTableRow(line, currentPage);
    if (tableRow) {
      results.push(tableRow);
      continue;
    }

    const inline = tryParseInlineLine(line, currentPage);
    if (inline) results.push(inline);
  }

  return dedupeValues(results);
}

export function formatStructuredValuesForPrompt(values: ParsedLabValue[]): string {
  const abnormal = values.filter((v) => v.status === "high" || v.status === "low");
  const normal = values.filter((v) => v.status === "normal").slice(0, 12);

  const lines: string[] = [];
  if (abnormal.length) {
    lines.push("ABNORMAL / OUT-OF-RANGE:");
    for (const v of abnormal) {
      lines.push(formatOneLine(v));
    }
  }
  if (normal.length) {
    lines.push("NORMAL (key markers):");
    for (const v of normal) {
      lines.push(formatOneLine(v));
    }
  }
  const other = values.filter(
    (v) => v.status === "unknown" && !abnormal.includes(v) && !normal.includes(v)
  );
  if (other.length) {
    lines.push("OTHER PARSED VALUES (status unknown — still use exact value):");
    for (const v of other.slice(0, 20)) {
      lines.push(formatOneLine(v));
    }
  }
  return lines.join("\n");
}

function formatOneLine(v: ParsedLabValue): string {
  const val =
    v.numericValue != null
      ? String(v.numericValue)
      : String(v.value);
  const ref = v.referenceRange ? `, ref ${v.referenceRange}` : "";
  const unit = v.unit ? ` ${v.unit}` : "";
  const st = v.status !== "unknown" ? `, ${v.status}` : "";
  return `* ${v.testName}: ${val}${unit}${ref}${st}`;
}
