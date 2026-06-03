import { createHash } from "crypto";
import type {
  AbnormalValue,
  ChartDataPoint,
  KeyFinding,
  MedicalSummaryResult,
  RiskFlag,
} from "@/lib/ai-summary";
import { applyMockReportTranslation } from "@/lib/i18n/mock-report-translations";

export function hashExtractedText(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim().slice(0, 50000);
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

type ParsedValue = {
  key: string;
  title: string;
  value: number;
  unit: string;
  display: string;
  normalMin: number;
  normalMax: number;
};

type MarkerDef = {
  key: string;
  title: string;
  unit: string;
  normalMin: number;
  normalMax: number;
  patterns: RegExp[];
};

const MARKERS: MarkerDef[] = [
  {
    key: "hemoglobin",
    title: "Hemoglobin",
    unit: "g/dL",
    normalMin: 12,
    normalMax: 17,
    patterns: [
      /hemoglobin(?:\s*\(hb\))?\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
      /\bhb\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(?:g\/dl|gm\/dl)?/i,
    ],
  },
  {
    key: "fasting_blood_sugar",
    title: "Fasting Blood Sugar",
    unit: "mg/dL",
    normalMin: 70,
    normalMax: 100,
    patterns: [
      /fasting\s*(?:blood\s*)?(?:sugar|glucose)\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
      /fbs\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
    ],
  },
  {
    key: "random_blood_sugar",
    title: "Random Blood Sugar",
    unit: "mg/dL",
    normalMin: 70,
    normalMax: 140,
    patterns: [
      /random\s*(?:blood\s*)?(?:sugar|glucose)\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
      /rbs\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
    ],
  },
  {
    key: "blood_glucose",
    title: "Blood Glucose",
    unit: "mg/dL",
    normalMin: 70,
    normalMax: 140,
    patterns: [
      /(?:blood\s*)?glucose\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
      /blood\s*sugar\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
    ],
  },
  {
    key: "hba1c",
    title: "HbA1c",
    unit: "%",
    normalMin: 4,
    normalMax: 5.7,
    patterns: [/hba1c\s*[:\-]?\s*(\d+(?:\.\d+)?)/i],
  },
  {
    key: "total_cholesterol",
    title: "Total Cholesterol",
    unit: "mg/dL",
    normalMin: 125,
    normalMax: 200,
    patterns: [
      /total\s*cholesterol\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
      /cholesterol\s*\(total\)\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
      /(?<!hdl|ldl|vldl)\bcholesterol\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
    ],
  },
  {
    key: "ldl",
    title: "LDL Cholesterol",
    unit: "mg/dL",
    normalMin: 0,
    normalMax: 100,
    patterns: [/ldl\s*(?:cholesterol)?\s*[:\-]?\s*(\d+(?:\.\d+)?)/i],
  },
  {
    key: "hdl",
    title: "HDL Cholesterol",
    unit: "mg/dL",
    normalMin: 40,
    normalMax: 60,
    patterns: [/hdl\s*(?:cholesterol)?\s*[:\-]?\s*(\d+(?:\.\d+)?)/i],
  },
  {
    key: "triglycerides",
    title: "Triglycerides",
    unit: "mg/dL",
    normalMin: 0,
    normalMax: 150,
    patterns: [/triglycerides?\s*[:\-]?\s*(\d+(?:\.\d+)?)/i],
  },
  {
    key: "tsh",
    title: "TSH",
    unit: "mIU/L",
    normalMin: 0.4,
    normalMax: 4.0,
    patterns: [/tsh\s*[:\-]?\s*(\d+(?:\.\d+)?)/i],
  },
  {
    key: "vitamin_d",
    title: "Vitamin D",
    unit: "ng/mL",
    normalMin: 30,
    normalMax: 100,
    patterns: [
      /vitamin\s*d\s*(?:\(25[\-\s]?oh\))?\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
      /25[\-\s]?oh\s*vitamin\s*d\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
    ],
  },
  {
    key: "vitamin_b12",
    title: "Vitamin B12",
    unit: "pg/mL",
    normalMin: 200,
    normalMax: 900,
    patterns: [/vitamin\s*b[\-\s]?12\s*[:\-]?\s*(\d+(?:\.\d+)?)/i],
  },
  {
    key: "creatinine",
    title: "Creatinine",
    unit: "mg/dL",
    normalMin: 0.6,
    normalMax: 1.2,
    patterns: [/creatinine\s*[:\-]?\s*(\d+(?:\.\d+)?)/i],
  },
  {
    key: "urea",
    title: "Urea",
    unit: "mg/dL",
    normalMin: 15,
    normalMax: 40,
    patterns: [
      /(?:blood\s*)?urea\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
      /bun\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
    ],
  },
  {
    key: "sgpt",
    title: "SGPT (ALT)",
    unit: "U/L",
    normalMin: 7,
    normalMax: 56,
    patterns: [
      /sgpt\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
      /\balt\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
    ],
  },
  {
    key: "sgot",
    title: "SGOT (AST)",
    unit: "U/L",
    normalMin: 8,
    normalMax: 40,
    patterns: [
      /sgot\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
      /\bast\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
    ],
  },
  {
    key: "platelets",
    title: "Platelets",
    unit: "lakhs/µL",
    normalMin: 1.5,
    normalMax: 4.5,
    patterns: [
      /platelet(?:\s*count)?\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
    ],
  },
  {
    key: "wbc",
    title: "WBC",
    unit: "×10³/µL",
    normalMin: 4,
    normalMax: 11,
    patterns: [
      /wbc\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
      /white\s*blood\s*cell(?:\s*count)?\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
    ],
  },
  {
    key: "rbc",
    title: "RBC",
    unit: "million/µL",
    normalMin: 4.2,
    normalMax: 6.1,
    patterns: [
      /rbc\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
      /red\s*blood\s*cell(?:\s*count)?\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
    ],
  },
];

function firstMatch(text: string, patterns: RegExp[]): number | null {
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) {
      const n = parseFloat(m[1]);
      if (!Number.isNaN(n)) return n;
    }
  }
  return null;
}

function parseMarkers(text: string): ParsedValue[] {
  const found = new Map<string, ParsedValue>();

  for (const def of MARKERS) {
    if (found.has(def.key)) continue;
    const value = firstMatch(text, def.patterns);
    if (value === null) continue;
    const display =
      def.unit === "%"
        ? `${value} ${def.unit}`
        : `${value} ${def.unit}`;
    found.set(def.key, {
      key: def.key,
      title: def.title,
      value,
      unit: def.unit,
      display,
      normalMin: def.normalMin,
      normalMax: def.normalMax,
    });
  }

  const bpMatch = text.match(
    /(?:blood\s*pressure|bp)\s*[:\-]?\s*(\d{2,3})\s*\/\s*(\d{2,3})/i
  );
  if (bpMatch) {
    const sys = parseInt(bpMatch[1], 10);
    const dia = parseInt(bpMatch[2], 10);
    if (!Number.isNaN(sys) && !Number.isNaN(dia)) {
      found.set("blood_pressure", {
        key: "blood_pressure",
        title: "Blood Pressure",
        value: sys,
        unit: "mmHg",
        display: `${sys}/${dia} mmHg`,
        normalMin: 90,
        normalMax: 120,
      });
    }
  }

  return Array.from(found.values());
}

function statusFor(
  value: number,
  min: number,
  max: number,
  lowIsBad = true,
  highIsBad = true
): KeyFinding["status"] {
  if (value < min) return lowIsBad ? "low" : "normal";
  if (value > max) return highIsBad ? "high" : "normal";
  return "normal";
}

function severityFor(status: KeyFinding["status"]): AbnormalValue["severity"] {
  if (status === "critical") return "critical";
  if (status === "high") return "moderate";
  if (status === "low") return "moderate";
  return "low";
}

function buildFromParsed(
  parsed: ParsedValue[],
  originalFilename: string,
  textLength: number
): MedicalSummaryResult {
  const keyFindings: KeyFinding[] = parsed.map((p) => {
    const isHdl = p.key === "hdl";
    const status = statusFor(
      p.value,
      p.normalMin,
      p.normalMax,
      !isHdl,
      isHdl
    );
    const rangeStr = `${p.normalMin}–${p.normalMax} ${p.unit}`;
    let explanation = `Value is ${p.display}, within typical range (${rangeStr}).`;
    if (status === "high") {
      explanation = `${p.title} is above the typical range (${rangeStr}). Discuss with your doctor.`;
    } else if (status === "low") {
      explanation = `${p.title} is below the typical range (${rangeStr}). Discuss with your doctor.`;
    }
    return {
      title: p.title,
      value: p.display,
      status,
      explanation,
    };
  });

  const abnormalValues: AbnormalValue[] = keyFindings
    .filter((f) => f.status !== "normal")
    .map((f) => {
      const p = parsed.find((x) => x.title === f.title)!;
      return {
        name: f.title,
        value: f.value,
        normalRange: `${p.normalMin}–${p.normalMax} ${p.unit}`,
        severity: severityFor(f.status),
        meaning: f.explanation,
      };
    });

  const chartData: ChartDataPoint[] = parsed
    .filter((p) => p.key !== "blood_pressure")
    .map((p) => ({
      label: p.title,
      value: p.value,
      normalMin: p.normalMin,
      normalMax: p.normalMax,
      unit: p.unit,
    }));

  let healthScore = 88;
  for (const f of keyFindings) {
    if (f.status === "high" || f.status === "low") healthScore -= 8;
    if (f.status === "critical") healthScore -= 12;
  }
  healthScore = Math.max(42, Math.min(96, healthScore));

  const names = parsed.map((p) => p.title).join(", ");
  const summary = `This summary was generated from "${originalFilename}" (${textLength.toLocaleString()} characters of extracted text). Detected markers include: ${names}. Values were interpreted for AI-assisted diagnosis and treatment guidance. Please review with a qualified healthcare professional.`;

  const riskFlags: RiskFlag[] = [];
  if (abnormalValues.length > 0) {
    for (const a of abnormalValues.slice(0, 4)) {
      riskFlags.push({
        level: a.severity === "critical" ? "critical" : "warning",
        message: `${a.name} (${a.value}) may need follow-up with your doctor.`,
      });
    }
  } else {
    riskFlags.push({
      level: "info",
      message:
        "Detected values appear within typical ranges. Continue routine checkups as advised by your doctor.",
    });
  }

  return {
    summary,
    keyFindings,
    abnormalValues,
    foodRecommendations: [
      "Eat balanced meals with vegetables, whole grains, and adequate protein.",
      "Limit highly processed foods and sugary drinks.",
      "Stay hydrated and avoid excessive salt if blood pressure is a concern.",
    ],
    exerciseRecommendations: [
      "Aim for regular moderate activity if your doctor approves.",
      "Include walking or light cardio several days per week.",
    ],
    lifestyleAdvice: [
      "Keep a copy of this report for your next medical visit.",
      "Follow up on any abnormal values with your healthcare provider.",
      "Maintain consistent sleep and stress management habits.",
    ],
    riskFlags,
    chartData,
    healthScore,
  };
}

function buildGenericFallback(
  originalFilename: string,
  textLength: number
): MedicalSummaryResult {
  return {
    summary: `Medical text was extracted from "${originalFilename}" (${textLength.toLocaleString()} characters), but specific numeric lab values could not be reliably detected automatically. Please review the full report with your doctor for diagnosis and treatment planning.`,
    keyFindings: [
      {
        title: "Document processed",
        value: originalFilename,
        status: "unknown",
        explanation:
          "Text was extracted from your upload. Structured lab values were not found with automatic parsing.",
      },
      {
        title: "Extraction length",
        value: `${textLength} characters`,
        status: "unknown",
        explanation:
          "A longer report usually contains more detail for your doctor to review.",
      },
    ],
    abnormalValues: [],
    foodRecommendations: [
      "Follow a balanced diet recommended by your healthcare provider.",
      "Limit processed foods and maintain regular meal times.",
    ],
    exerciseRecommendations: [
      "Stay active as advised by your doctor for your health condition.",
    ],
    lifestyleAdvice: [
      "Share this report with your doctor for professional interpretation.",
      "Keep copies of lab reports for trend comparison over time.",
    ],
    riskFlags: [
      {
        level: "info",
        message:
          "Automatic parsing could not identify specific lab numbers. Doctor consultation is recommended for accurate interpretation.",
      },
    ],
    chartData: [],
    healthScore: 70,
  };
}

export function generateMockMedicalSummaryFromText(
  extractedText: string,
  originalFilename: string,
  language?: string | null
): MedicalSummaryResult {
  const text = extractedText.replace(/\s+/g, " ").trim();
  const parsed = parseMarkers(text);
  const base =
    parsed.length > 0
      ? buildFromParsed(parsed, originalFilename, text.length)
      : buildGenericFallback(originalFilename, text.length);

  const code = language || "en";
  if (code === "en") return base;
  return applyMockReportTranslation(base, code);
}
