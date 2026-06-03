/**
 * Import IFCT from manual CSV (fallback when PDF extraction is insufficient).
 *
 * Long format: data/ifct/manual/ifct_foods.csv
 *   food_code, food_name, food_group, nutrient_name, value, unit, source_table
 *
 * Wide format: data/ifct/manual/ifct_foods_wide.csv
 *   food_code, food_name, energy_kcal, protein_g, ...
 *
 * Run: npm run ifct:import:csv
 */

import fs from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { DEFAULT_DIET_RULE_SEEDS } from "../../lib/nutrition/diet-rules";

const prisma = new PrismaClient();
const ROOT = process.cwd();
const MANUAL_DIR = path.join(ROOT, "data", "ifct", "manual");
const LONG_CSV = path.join(MANUAL_DIR, "ifct_foods.csv");
const WIDE_CSV = path.join(MANUAL_DIR, "ifct_foods_wide.csv");
const SOURCE =
  "Source: Indian Food Composition Tables 2017, National Institute of Nutrition / ICMR.";

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugCode(name: string): string {
  return normalizeName(name).replace(/\s+/g, "_").slice(0, 80) || "unknown";
}

async function parseCsvLines(filePath: string): Promise<string[][]> {
  const content = await fs.readFile(filePath, "utf8");
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  return lines.map((line) => {
    const parts: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQ = !inQ;
        continue;
      }
      if (ch === "," && !inQ) {
        parts.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    parts.push(cur.trim());
    return parts;
  });
}

async function importLongFormat(rows: string[][]) {
  const header = rows[0].map((h) => h.toLowerCase());
  const idx = (name: string) => header.indexOf(name);

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const code = r[idx("food_code")];
    const foodName = r[idx("food_name")];
    const nutrientName = r[idx("nutrient_name")];
    const value = parseFloat(r[idx("value")]);
    if (!code || !foodName || !nutrientName || Number.isNaN(value)) continue;

    const food = await prisma.food.upsert({
      where: { ifctCode: code },
      create: {
        ifctCode: code,
        name: foodName,
        normalizedName: normalizeName(foodName),
        group: r[idx("food_group")] || null,
        source: SOURCE,
      },
      update: { name: foodName, normalizedName: normalizeName(foodName) },
    });

    const ncode = slugCode(nutrientName);
    const nutrient = await prisma.nutrient.upsert({
      where: { code: ncode },
      create: {
        code: ncode,
        name: nutrientName,
        normalizedName: normalizeName(nutrientName),
        category: "manual",
        unit: r[idx("unit")] || "g",
      },
      update: { name: nutrientName },
    });

    const sourceTable = r[idx("source_table")] || "manual_csv";
    await prisma.foodNutrient.upsert({
      where: {
        foodId_nutrientId_sourceTable: {
          foodId: food.id,
          nutrientId: nutrient.id,
          sourceTable,
        },
      },
      create: {
        foodId: food.id,
        nutrientId: nutrient.id,
        value,
        unit: r[idx("unit")] || "g",
        sourceTable,
      },
      update: { value },
    });
  }
}

async function importWideFormat(rows: string[][]) {
  const header = rows[0].map((h) => h.toLowerCase());
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const code = r[0];
    const foodName = r[1];
    if (!code || !foodName) continue;

    const food = await prisma.food.upsert({
      where: { ifctCode: code },
      create: {
        ifctCode: code,
        name: foodName,
        normalizedName: normalizeName(foodName),
        source: SOURCE,
      },
      update: { name: foodName },
    });

    for (let c = 2; c < header.length; c++) {
      const col = header[c];
      const val = parseFloat(r[c]);
      if (!col || Number.isNaN(val)) continue;
      const ncode = slugCode(col);
      const nutrient = await prisma.nutrient.upsert({
        where: { code: ncode },
        create: {
          code: ncode,
          name: col.replace(/_/g, " "),
          normalizedName: normalizeName(col),
          category: "manual",
          unit: col.includes("kcal") ? "kcal" : col.endsWith("_mg") ? "mg" : "g",
        },
        update: {},
      });
      await prisma.foodNutrient.upsert({
        where: {
          foodId_nutrientId_sourceTable: {
            foodId: food.id,
            nutrientId: nutrient.id,
            sourceTable: "manual_csv_wide",
          },
        },
        create: {
          foodId: food.id,
          nutrientId: nutrient.id,
          value: val,
          unit: nutrient.unit,
          sourceTable: "manual_csv_wide",
        },
        update: { value: val },
      });
    }
  }
}

async function seedDietRules() {
  for (const rule of DEFAULT_DIET_RULE_SEEDS) {
    const nutrient = await prisma.nutrient.findUnique({ where: { code: rule.nutrientCode } });
    await prisma.dietRule.upsert({
      where: { id: `${rule.conditionName}_${rule.nutrientCode}_${rule.ruleType}` },
      create: {
        id: `${rule.conditionName}_${rule.nutrientCode}_${rule.ruleType}`,
        conditionName: rule.conditionName,
        nutrientCode: rule.nutrientCode,
        nutrientId: nutrient?.id ?? null,
        ruleType: rule.ruleType,
        description: rule.description,
        severity: rule.severity,
      },
      update: { description: rule.description },
    });
  }
}

async function main() {
  let imported = false;
  try {
    await fs.access(LONG_CSV);
    const rows = await parseCsvLines(LONG_CSV);
    await importLongFormat(rows);
    imported = true;
    console.log("Imported long-format CSV:", LONG_CSV);
  } catch {
    /* try wide */
  }

  if (!imported) {
    try {
      await fs.access(WIDE_CSV);
      const rows = await parseCsvLines(WIDE_CSV);
      await importWideFormat(rows);
      imported = true;
      console.log("Imported wide-format CSV:", WIDE_CSV);
    } catch {
      console.error(
        "No manual CSV found. Place ifct_foods.csv or ifct_foods_wide.csv in data/ifct/manual/"
      );
      process.exit(1);
    }
  }

  await seedDietRules();
  console.log("Foods:", await prisma.food.count());
  console.log(SOURCE);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
