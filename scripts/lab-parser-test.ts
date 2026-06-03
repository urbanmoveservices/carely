import { readFile } from "fs/promises";
import path from "path";
import { parseLabValuesFromText } from "../lib/lab-value-parser";

async function main() {
  const fixture = path.join(
    process.cwd(),
    "test-fixtures/download-digital-report-text.txt"
  );
  const text = await readFile(fixture, "utf8");
  const values = parseLabValuesFromText(text);
  const byName = Object.fromEntries(values.map((v) => [v.canonicalName, v]));

  const checks: Array<[string, unknown]> = [
    ["tsh", 11.4],
    ["ldl", 113],
    ["bilirubin_direct", 0.3],
    ["pcv", 38.6],
    ["fasting_glucose", 88.7],
    ["hba1c", 5.0],
  ];

  let failed = 0;
  for (const [key, expected] of checks) {
    const v = byName[key];
    if (!v || v.numericValue !== expected) {
      console.error("FAIL", key, v?.numericValue, "expected", expected);
      failed++;
    } else {
      console.log("OK", key, v.numericValue, v.status);
    }
  }

  const summary = JSON.stringify(values, null, 2);
  if (values.length < 5) {
    console.error("Too few values parsed", values.length);
    failed++;
  }

  const blob = summary.toLowerCase();
  if (blob.includes("thyroid function") && blob.includes("unknown")) {
    console.error("Should not have generic thyroid unknown in parser output");
    failed++;
  }

  console.log(`Parsed ${values.length} values`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
