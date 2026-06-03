import { readFile } from "fs/promises";
import path from "path";
import { parseLabValuesFromText } from "../lib/lab-value-parser";
import { repairReportSummary } from "../lib/ai/report-summary-repair";

const BANNED = [
  "thyroid function: unknown",
  "cholesterol levels: unknown",
  "value: unknown",
  "normal: unknown",
];

async function main() {
  const fixture = path.join(
    process.cwd(),
    "test-fixtures/download-digital-report-text.txt"
  );
  const text = await readFile(fixture, "utf8");
  const structured = parseLabValuesFromText(text);

  const badSummary = {
    summary: "Thyroid Function: Unknown. Cholesterol Levels: Unknown. Value: Unknown. Normal: Unknown.",
    keyFindings: [
      { title: "Thyroid Function", value: "Unknown", status: "unknown" as const, explanation: "" },
      { title: "Cholesterol Levels", value: "Unknown", status: "unknown" as const, explanation: "" },
    ],
    abnormalValues: [
      {
        name: "Thyroid Function",
        value: "Unknown",
        normalRange: "Unknown",
        severity: "unknown" as const,
        meaning: "",
      },
    ],
    foodRecommendations: ["Avoid sugar due to Cholesterol Levels: Unknown"],
    exerciseRecommendations: [],
    lifestyleAdvice: ["Medication: levothyroxine example", "Thyroid Function: Unknown note"],
    riskFlags: [{ level: "warning" as const, message: "Cholesterol Levels: Unknown" }],
    chartData: [],
  };

  const repaired = repairReportSummary(badSummary, structured);
  const blob = JSON.stringify(repaired).toLowerCase();

  let failed = 0;
  for (const phrase of BANNED) {
    if (blob.includes(phrase)) {
      console.error("FAIL still contains:", phrase);
      failed++;
    } else {
      console.log("OK removed:", phrase);
    }
  }

  const mustInclude = [
    ["tsh", "11.4"],
    ["ldl", "113"],
    ["bilirubin", "0.3"],
    ["pcv", "38.6"],
  ] as const;

  for (const [label, num] of mustInclude) {
    if (!blob.includes(num)) {
      console.error("FAIL missing value:", label, num);
      failed++;
    } else {
      console.log("OK includes", label, num);
    }
  }

  if (!repaired.keyFindings.some((k) => k.title.toLowerCase().includes("tsh"))) {
    console.error("FAIL missing TSH keyFinding");
    failed++;
  }

  if (
    repaired.lifestyleAdvice?.some((l) =>
      l.toLowerCase().includes("thyroid function: unknown")
    )
  ) {
    console.error("FAIL lifestyleAdvice still has generic unknown");
    failed++;
  } else {
    console.log("OK lifestyleAdvice kept medication line");
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
