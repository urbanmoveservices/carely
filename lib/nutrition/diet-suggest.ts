import prisma from "@/lib/prisma";
import { NUTRITION_DISCLAIMER, IFCT_SOURCE_ATTRIBUTION } from "@/lib/nutrition/config";
import { foodsByNutrient } from "@/lib/nutrition/food-service";
import { resolveFoodByName } from "@/lib/nutrition/search";
import type { DietCondition } from "@/lib/nutrition/diet-rules";

export type DietSuggestInput = {
  condition?: string;
  goal?: string;
  age?: number;
  gender?: string;
  reportValues?: Record<string, number>;
  preferences?: string[];
  avoid?: string[];
};

function normalizeCondition(c?: string): DietCondition {
  const s = (c ?? "general").toLowerCase().replace(/\s+/g, "_");
  if (s.includes("diabet")) return "diabetes";
  if (s.includes("hypertens") || s.includes("bp")) return "hypertension";
  if (s.includes("kidney") || s.includes("ckd")) return "kidney_disease";
  if (s.includes("anemia")) return "anemia";
  if (s.includes("liver")) return "fatty_liver";
  if (s.includes("cholesterol") || s.includes("lipid")) return "cholesterol";
  if (s.includes("weight")) return "weight_loss";
  return "general";
}

export async function suggestDiet(input: DietSuggestInput) {
  const condition = normalizeCondition(input.condition ?? input.goal);
  const rules = await prisma.dietRule.findMany({
    where: { conditionName: condition },
    include: { nutrient: true },
  });

  const safeFoods: Array<{ name: string; reason: string }> = [];
  const limitFoods: Array<{ name: string; reason: string }> = [];

  for (const rule of rules) {
    const code = rule.nutrientCode ?? rule.nutrient?.code;
    if (!code) continue;

    if (rule.ruleType === "prefer_high" || rule.ruleType === "prefer_low") {
      const mode = rule.ruleType === "prefer_high" ? "high" : "low";
      const top = await foodsByNutrient({
        nutrient: code,
        mode: mode === "high" ? "high" : "low",
        limit: 8,
        condition,
      });
      for (const item of top.items.slice(0, 5)) {
        safeFoods.push({
          name: item.food.name,
          reason: rule.description,
        });
      }
    }
    if (rule.ruleType === "limit" || rule.ruleType === "avoid") {
      const high = await foodsByNutrient({ nutrient: code, mode: "high", limit: 5, condition });
      for (const item of high.items.slice(0, 3)) {
        limitFoods.push({
          name: item.food.name,
          reason: rule.description,
        });
      }
    }
  }

  if (condition === "diabetes") {
    const dal = await resolveFoodByName("moong dal");
    const rice = await resolveFoodByName("rice");
    if (dal?.food) {
      safeFoods.push({
        name: dal.food.name,
        reason: "Pulses often provide protein and fiber compared to refined grains alone.",
      });
    }
    if (rice?.food) {
      limitFoods.push({
        name: rice.food.name,
        reason: "Large portions of white rice may raise post-meal glucose — portion control matters.",
      });
    }
  }

  const avoidSet = new Set((input.avoid ?? []).map((a) => a.toLowerCase()));
  const filteredSafe = safeFoods.filter((f) => ![...avoidSet].some((a) => f.name.toLowerCase().includes(a)));
  const sampleMeals = [
    {
      name: "Breakfast",
      example: "Vegetable upma or moong dal chilla with salad",
    },
    {
      name: "Lunch",
      example: "Brown rice or millet + dal + seasonal sabzi",
    },
    {
      name: "Dinner",
      example: "Roti + palak dal + cucumber salad",
    },
  ];

  const clinicianNote =
    condition === "kidney_disease"
      ? "Kidney diets are highly individual. Please consult your doctor or renal dietitian before major changes."
      : "Use these ideas as general nutrition support, not a prescription.";

  return {
    condition,
    goal: input.goal ?? null,
    reportValues: input.reportValues ?? {},
    preferences: input.preferences ?? [],
    avoid: input.avoid ?? [],
    rulesApplied: rules.map((r) => ({
      ruleType: r.ruleType,
      nutrientCode: r.nutrientCode,
      description: r.description,
      severity: r.severity,
    })),
    safeFoods: dedupeByName(filteredSafe).slice(0, 15),
    foodsToLimit: dedupeByName(limitFoods).slice(0, 10),
    sampleMeals,
    clinicianNote,
    sourceAttribution: IFCT_SOURCE_ATTRIBUTION,
    disclaimer: NUTRITION_DISCLAIMER,
  };
}

function dedupeByName<T extends { name: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((i) => {
    const k = i.name.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
