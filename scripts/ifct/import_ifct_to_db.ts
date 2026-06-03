/**
 * Import cleaned IFCT JSON into PostgreSQL via Prisma.
 * Run: npm run ifct:import
 */

import fs from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { DEFAULT_DIET_RULE_SEEDS } from "../../lib/nutrition/diet-rules";

const prisma = new PrismaClient();
const ROOT = process.cwd();
const CLEAN_PATH = path.join(ROOT, "data", "ifct", "clean", "ifct_clean.json");
const SOURCE =
  "Source: Indian Food Composition Tables 2017, National Institute of Nutrition / ICMR.";

type CleanPayload = {
  foods: Array<{
    ifct_code: string;
    name: string;
    normalized_name: string;
    group?: string | null;
    scientific_name?: string | null;
    edible_portion?: number | null;
    description?: string | null;
    source?: string;
  }>;
  nutrients: Array<{
    code: string;
    name: string;
    category: string;
    unit: string;
    isMacro?: boolean;
    isVitamin?: boolean;
    isMineral?: boolean;
    isFattyAcid?: boolean;
    isAminoAcid?: boolean;
    isBioactive?: boolean;
  }>;
  food_nutrients: Array<{
    ifct_code: string;
    nutrient_code: string;
    value: number | null;
    unit: string;
    per_amount?: number;
    per_unit?: string;
    source_table?: string | null;
    source_page?: number | null;
    confidence?: number | null;
    notes?: string | null;
  }>;
  aliases: Array<{
    ifct_code: string;
    alias: string;
    language: string;
    normalized_alias: string;
  }>;
};

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  let raw: string;
  try {
    raw = await fs.readFile(CLEAN_PATH, "utf8");
  } catch {
    console.error(`Missing ${CLEAN_PATH}. Run: npm run ifct:extract && npm run ifct:clean`);
    process.exit(1);
  }

  const data = JSON.parse(raw) as CleanPayload;
  console.log(
    `Importing ${data.foods.length} foods, ${data.nutrients.length} nutrients, ${data.food_nutrients.length} values…`
  );

  const nutrientIdByCode = new Map<string, string>();
  for (const n of data.nutrients) {
    const row = await prisma.nutrient.upsert({
      where: { code: n.code },
      create: {
        code: n.code,
        name: n.name,
        normalizedName: normalizeName(n.name),
        category: n.category,
        unit: n.unit,
        isMacro: n.isMacro ?? false,
        isVitamin: n.isVitamin ?? false,
        isMineral: n.isMineral ?? false,
        isFattyAcid: n.isFattyAcid ?? false,
        isAminoAcid: n.isAminoAcid ?? false,
        isBioactive: n.isBioactive ?? false,
      },
      update: {
        name: n.name,
        category: n.category,
        unit: n.unit,
      },
    });
    nutrientIdByCode.set(n.code, row.id);
  }

  const foodIdByCode = new Map<string, string>();
  for (const f of data.foods) {
    const row = await prisma.food.upsert({
      where: { ifctCode: f.ifct_code },
      create: {
        ifctCode: f.ifct_code,
        name: f.name,
        normalizedName: f.normalized_name || normalizeName(f.name),
        group: f.group ?? null,
        scientificName: f.scientific_name ?? null,
        ediblePortion: f.edible_portion ?? null,
        description: f.description ?? null,
        source: f.source ?? SOURCE,
      },
      update: {
        name: f.name,
        normalizedName: f.normalized_name || normalizeName(f.name),
        group: f.group ?? null,
      },
    });
    foodIdByCode.set(f.ifct_code, row.id);
  }

  let imported = 0;
  let skipped = 0;
  const batchSize = 500;
  for (let i = 0; i < data.food_nutrients.length; i += batchSize) {
    const batch = data.food_nutrients.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (fn) => {
        const foodId = foodIdByCode.get(fn.ifct_code);
        const nutrientId = nutrientIdByCode.get(fn.nutrient_code);
        if (!foodId || !nutrientId || fn.value == null) {
          skipped++;
          return;
        }
        const sourceTable = fn.source_table ?? "unknown";
        try {
          await prisma.foodNutrient.upsert({
            where: {
              foodId_nutrientId_sourceTable: {
                foodId,
                nutrientId,
                sourceTable,
              },
            },
            create: {
              foodId,
              nutrientId,
              value: fn.value,
              unit: fn.unit,
              perAmount: fn.per_amount ?? 100,
              perUnit: fn.per_unit ?? "g",
              sourceTable,
              sourcePage: fn.source_page ?? null,
              confidence: fn.confidence ?? null,
              notes: fn.notes ?? null,
            },
            update: { value: fn.value, unit: fn.unit },
          });
          imported++;
        } catch {
          skipped++;
        }
      })
    );
    console.log(`  … ${Math.min(i + batchSize, data.food_nutrients.length)} / ${data.food_nutrients.length}`);
  }

  for (const a of data.aliases) {
    const foodId = foodIdByCode.get(a.ifct_code);
    if (!foodId) continue;
    const existing = await prisma.foodAlias.findFirst({
      where: { foodId, normalizedAlias: a.normalized_alias },
    });
    if (!existing) {
      await prisma.foodAlias.create({
        data: {
          foodId,
          alias: a.alias,
          language: a.language,
          normalizedAlias: a.normalized_alias,
        },
      });
    }
  }

  for (const rule of DEFAULT_DIET_RULE_SEEDS) {
    const nutrient = await prisma.nutrient.findUnique({ where: { code: rule.nutrientCode } });
    await prisma.dietRule.upsert({
      where: {
        id: `${rule.conditionName}_${rule.nutrientCode}_${rule.ruleType}`,
      },
      create: {
        id: `${rule.conditionName}_${rule.nutrientCode}_${rule.ruleType}`,
        conditionName: rule.conditionName,
        nutrientCode: rule.nutrientCode,
        nutrientId: nutrient?.id ?? null,
        ruleType: rule.ruleType,
        description: rule.description,
        severity: rule.severity,
      },
      update: { description: rule.description, severity: rule.severity },
    });
  }

  await prisma.ifctPipelineStatus.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      phase: "imported",
      foodsCount: await prisma.food.count(),
      nutrientsCount: await prisma.nutrient.count(),
      foodNutrientRows: await prisma.foodNutrient.count(),
      validationOk: true,
      lastRunAt: new Date(),
    },
    update: {
      phase: "imported",
      foodsCount: await prisma.food.count(),
      nutrientsCount: await prisma.nutrient.count(),
      foodNutrientRows: await prisma.foodNutrient.count(),
      lastRunAt: new Date(),
    },
  });

  console.log(`Done. Imported ${imported} food-nutrient rows, skipped ${skipped}.`);
  console.log(SOURCE);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
