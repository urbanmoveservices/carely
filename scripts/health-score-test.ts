/**
 * Universal health score engine tests.
 * Usage: npm run test:health-score
 */
import type { ParsedLabValue } from "../lib/lab-value-parser";
import { computeHealthScoreFromLabValues } from "../lib/health-score";

function lab(partial: Partial<ParsedLabValue> & Pick<ParsedLabValue, "canonicalName" | "status">): ParsedLabValue {
  return {
    testName: partial.testName || partial.canonicalName,
    category: partial.category || "other",
    value: partial.value ?? partial.numericValue ?? 0,
    numericValue: partial.numericValue,
    unit: partial.unit ?? null,
    referenceRange: partial.referenceRange ?? null,
    referenceMin: partial.referenceMin,
    referenceMax: partial.referenceMax,
    status: partial.status,
    confidence: partial.confidence ?? 0.9,
    ...partial,
  };
}

type Case = {
  name: string;
  values: ParsedLabValue[];
  expect: (result: ReturnType<typeof computeHealthScoreFromLabValues>) => void;
};

const cases: Case[] = [
  {
    name: "All normal values → score 95–100",
    values: [
      lab({ canonicalName: "hemoglobin", category: "cbc", status: "normal", numericValue: 14, referenceMin: 12, referenceMax: 17, unit: "g/dL" }),
      lab({ canonicalName: "ldl", category: "lipid", status: "normal", numericValue: 95, referenceMax: 100, unit: "mg/dL" }),
      lab({ canonicalName: "tsh", category: "thyroid", status: "normal", numericValue: 2.5, referenceMin: 0.4, referenceMax: 4.2, unit: "mIU/L" }),
      lab({ canonicalName: "egfr", category: "kidney", status: "normal", numericValue: 95, referenceMin: 90, unit: "mL/min" }),
    ],
    expect: (r) => {
      if (r.score < 95 || r.score > 100) throw new Error(`expected 95-100 got ${r.score}`);
      if (r.factors.length > 0) throw new Error("expected no factors");
    },
  },
  {
    name: "Mild AST/ALT high → score 85–95",
    values: [
      lab({ canonicalName: "sgot", category: "liver", status: "high", numericValue: 45, referenceMax: 40, unit: "U/L", testName: "AST" }),
      lab({ canonicalName: "sgpt", category: "liver", status: "high", numericValue: 48, referenceMax: 41, unit: "U/L", testName: "ALT" }),
    ],
    expect: (r) => {
      if (r.score < 85 || r.score > 95) throw new Error(`expected 85-95 got ${r.score}`);
      if (r.factors.length < 1) throw new Error("expected factors");
    },
  },
  {
    name: "TSH > 10 → major deduction",
    values: [
      lab({ canonicalName: "tsh", category: "thyroid", status: "high", numericValue: 12, referenceMax: 4.2, unit: "mIU/L" }),
    ],
    expect: (r) => {
      if (r.score >= 80) throw new Error(`expected below 80 got ${r.score}`);
      if (!r.factors.some((f) => f.canonicalName === "tsh")) throw new Error("missing tsh factor");
    },
  },
  {
    name: "LDL 113 only → score 92–96",
    values: [
      lab({ canonicalName: "ldl", category: "lipid", status: "high", numericValue: 113, referenceMax: 100, unit: "mg/dL" }),
    ],
    expect: (r) => {
      if (r.score < 92 || r.score > 96) throw new Error(`expected 92-96 got ${r.score}`);
    },
  },
  {
    name: "HbA1c 6.5 → score below 85",
    values: [
      lab({ canonicalName: "hba1c", category: "sugar", status: "high", numericValue: 6.5, referenceMax: 5.7, unit: "%" }),
    ],
    expect: (r) => {
      if (r.score >= 85) throw new Error(`expected below 85 got ${r.score}`);
    },
  },
  {
    name: "Vitamin D 18 → score around 88–94",
    values: [
      lab({ canonicalName: "vitamin_d", category: "vitamins", status: "low", numericValue: 18, referenceMin: 30, unit: "ng/mL" }),
    ],
    expect: (r) => {
      if (r.score < 80 || r.score > 95) throw new Error(`expected ~88-94 got ${r.score}`);
    },
  },
  {
    name: "eGFR 121 → no deduction",
    values: [
      lab({ canonicalName: "egfr", category: "kidney", status: "normal", numericValue: 121, referenceMin: 90, unit: "mL/min" }),
    ],
    expect: (r) => {
      if (r.factors.length > 0) throw new Error("eGFR normal should not deduct");
      if (r.score < 95) throw new Error(`expected high score got ${r.score}`);
    },
  },
  {
    name: "PCV slightly low → small deduction",
    values: [
      lab({ canonicalName: "pcv", category: "cbc", status: "low", numericValue: 36, referenceMin: 37, referenceMax: 47, unit: "%" }),
    ],
    expect: (r) => {
      if (r.score > 98 || r.score < 90) throw new Error(`expected small deduction got ${r.score}`);
    },
  },
  {
    name: "Multiple mild abnormalities → below 100",
    values: [
      lab({ canonicalName: "ldl", category: "lipid", status: "high", numericValue: 115, referenceMax: 100, unit: "mg/dL" }),
      lab({ canonicalName: "vitamin_d", category: "vitamins", status: "low", numericValue: 22, referenceMin: 30, unit: "ng/mL" }),
      lab({ canonicalName: "sgpt", category: "liver", status: "high", numericValue: 44, referenceMax: 41, unit: "U/L" }),
    ],
    expect: (r) => {
      if (r.score >= 100) throw new Error(`expected below 100 got ${r.score}`);
      if (r.factors.length < 2) throw new Error("expected multiple factors");
    },
  },
  {
    name: "Critical abnormal → significantly reduced",
    values: [
      lab({ canonicalName: "egfr", category: "kidney", status: "low", numericValue: 12, referenceMin: 90, unit: "mL/min" }),
      lab({ canonicalName: "hemoglobin", category: "cbc", status: "low", numericValue: 7.5, referenceMin: 12, unit: "g/dL" }),
    ],
    expect: (r) => {
      if (r.score > 55) throw new Error(`expected significantly reduced got ${r.score}`);
    },
  },
];

let passed = 0;
let failed = 0;

for (const c of cases) {
  try {
    const result = computeHealthScoreFromLabValues(c.values);
    c.expect(result);
    console.log(`✓ ${c.name} → score ${result.score}`);
    passed++;
  } catch (err: any) {
    console.error(`✗ ${c.name}: ${err.message}`);
    failed++;
  }
}

console.log(JSON.stringify({ passed, failed, total: cases.length }, null, 2));
if (failed > 0) process.exit(1);
