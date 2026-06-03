import type { ManualLabValue } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  parseLabValuesFromText,
  LAB_PARSER_VERSION,
  type ParsedLabValue,
} from "@/lib/lab-value-parser";
import { displayNameForCanonical } from "@/lib/lab-test-aliases";

export function parsedToManualRow(
  v: ParsedLabValue,
  params: { userId: string; documentId: string; reportId?: string | null; familyMemberId?: string | null }
) {
  const valueNum =
    typeof v.numericValue === "number"
      ? v.numericValue
      : typeof v.value === "number"
        ? v.value
        : parseFloat(String(v.value));
  const num = Number.isFinite(valueNum) ? valueNum : null;

  return {
    userId: params.userId,
    documentId: params.documentId,
    reportId: params.reportId ?? null,
    familyMemberId: params.familyMemberId ?? null,
    testName: v.testName || displayNameForCanonical(v.canonicalName),
    markerKey: v.canonicalName,
    category: v.category,
    value: num,
    valueText: num != null ? String(num) : String(v.value),
    unit: v.unit,
    normalMin: v.referenceMin ?? null,
    normalMax: v.referenceMax ?? null,
    normalText: v.referenceRange,
    referenceRange: v.referenceRange,
    status: v.status,
    confidence: v.confidence,
    sourceText: v.sourceText?.slice(0, 2000) ?? null,
    sourcePage: v.sourcePage ?? null,
    source: "parsed",
  };
}

export async function parseAndSaveLabValues(params: {
  userId: string;
  documentId: string;
  reportId?: string | null;
  familyMemberId?: string | null;
  extractedText: string;
  replaceParsed?: boolean;
}): Promise<{ values: ParsedLabValue[]; saved: number }> {
  const parsed = parseLabValuesFromText(params.extractedText);
  if (parsed.length === 0) {
    return { values: [], saved: 0 };
  }

  if (params.replaceParsed !== false) {
    await prisma.manualLabValue.deleteMany({
      where: {
        documentId: params.documentId,
        userId: params.userId,
        source: "parsed",
      },
    });
  }

  const rows = parsed.map((v) =>
    parsedToManualRow(v, {
      userId: params.userId,
      documentId: params.documentId,
      reportId: params.reportId,
      familyMemberId: params.familyMemberId,
    })
  );

  await prisma.manualLabValue.createMany({ data: rows });
  return { values: parsed, saved: rows.length };
}

export async function loadStructuredLabValues(params: {
  userId: string;
  documentId: string;
  reportId?: string | null;
  extractedText?: string | null;
  reparseIfEmpty?: boolean;
}): Promise<ParsedLabValue[]> {
  const existing = await prisma.manualLabValue.findMany({
    where: {
      userId: params.userId,
      documentId: params.documentId,
    },
    orderBy: { createdAt: "asc" },
  });

  if (existing.length > 0) {
    return existing.map(manualRowToParsed);
  }

  if (params.reparseIfEmpty !== false && params.extractedText?.trim()) {
    const { values } = await parseAndSaveLabValues({
      userId: params.userId,
      documentId: params.documentId,
      reportId: params.reportId,
      extractedText: params.extractedText,
    });
    return values;
  }

  return [];
}

function manualRowToParsed(row: ManualLabValue): ParsedLabValue {
  const num = row.value ?? (row.valueText ? parseFloat(row.valueText) : undefined);
  return {
    testName: row.testName,
    canonicalName: row.markerKey,
    category: row.category || "other",
    value: num ?? row.valueText ?? "",
    numericValue: Number.isFinite(num as number) ? (num as number) : undefined,
    unit: row.unit,
    referenceRange: row.referenceRange || row.normalText,
    referenceMin: row.normalMin ?? undefined,
    referenceMax: row.normalMax ?? undefined,
    status: (row.status as ParsedLabValue["status"]) || "unknown",
    sourcePage: row.sourcePage ?? undefined,
    confidence: row.confidence ?? 0.7,
    sourceText: row.sourceText ?? undefined,
  };
}

export { LAB_PARSER_VERSION };
