import prisma from "@/lib/prisma";
import { IFCT_PER_100G_NOTE, IFCT_SOURCE_ATTRIBUTION, NUTRITION_DISCLAIMER } from "@/lib/nutrition/config";
import { resolveFoodByName } from "@/lib/nutrition/search";

export type MealItemInput = {
  foodName: string;
  quantityGram: number;
  state?: "raw" | "cooked";
};

export async function analyzeMeal(items: MealItemInput[]) {
  const lineItems: Array<{
    foodName: string;
    resolvedName: string | null;
    quantityGram: number;
    state: string;
    conversionApplied: boolean;
    conversionNote: string | null;
    uncertainty: boolean;
    nutrients: Record<string, { name: string; value: number; unit: string }>;
  }> = [];

  const totals = new Map<string, { name: string; value: number; unit: string }>();

  for (const item of items) {
    const resolved = await resolveFoodByName(item.foodName);
    const state = item.state ?? "raw";
    let multiplier = item.quantityGram / 100;
    let conversionApplied = false;
    let conversionNote: string | null = null;
    let uncertainty = false;

    if (!resolved) {
      lineItems.push({
        foodName: item.foodName,
        resolvedName: null,
        quantityGram: item.quantityGram,
        state,
        conversionApplied: false,
        conversionNote: "Food not found in IFCT database.",
        uncertainty: true,
        nutrients: {},
      });
      continue;
    }

    const { food } = resolved;

    if (state === "cooked") {
      const rule = await prisma.foodConversionRule.findFirst({
        where: {
          OR: [
            { rawFoodId: food.id },
            { cookedName: { contains: item.foodName, mode: "insensitive" } },
          ],
        },
      });
      if (rule?.multiplier) {
        multiplier *= rule.multiplier;
        conversionApplied = true;
        conversionNote = rule.note ?? `Applied conversion: ${rule.cookedName}`;
      } else {
        uncertainty = true;
        conversionNote =
          "No cooked conversion rule in database; values scaled from raw per-100g IFCT data and may be approximate.";
      }
    }

    const nutrientRows = await prisma.foodNutrient.findMany({
      where: { foodId: food.id, value: { not: null } },
      include: { nutrient: true },
      take: 200,
    });

    const itemNutrients: Record<string, { name: string; value: number; unit: string }> = {};

    for (const row of nutrientRows) {
      if (row.value == null) continue;
      const scaled = row.value * multiplier;
      itemNutrients[row.nutrient.code] = {
        name: row.nutrient.name,
        value: Math.round(scaled * 100) / 100,
        unit: row.unit,
      };
      const prev = totals.get(row.nutrient.code);
      if (prev) {
        prev.value = Math.round((prev.value + scaled) * 100) / 100;
      } else {
        totals.set(row.nutrient.code, {
          name: row.nutrient.name,
          value: Math.round(scaled * 100) / 100,
          unit: row.unit,
        });
      }
    }

    lineItems.push({
      foodName: item.foodName,
      resolvedName: food.name,
      quantityGram: item.quantityGram,
      state,
      conversionApplied,
      conversionNote,
      uncertainty,
      nutrients: itemNutrients,
    });
  }

  return {
    items: lineItems,
    totals: Object.fromEntries(totals),
    per100gNote: IFCT_PER_100G_NOTE,
    sourceAttribution: IFCT_SOURCE_ATTRIBUTION,
    disclaimer: NUTRITION_DISCLAIMER,
  };
}
