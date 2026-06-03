import { IFCT_SOURCE_ATTRIBUTION, IFCT_PER_100G_NOTE, NUTRITION_DISCLAIMER } from "@/lib/nutrition/config";

export type FoodNutrientRow = {
  value: number | null;
  unit: string;
  perAmount: number;
  perUnit: string;
  sourceTable: string | null;
  nutrient: {
    code: string;
    name: string;
    category: string;
    unit: string;
  };
};

export function serializeFoodBase(food: {
  id: string;
  ifctCode: string | null;
  name: string;
  group: string | null;
  scientificName: string | null;
  ediblePortion: number | null;
  source: string;
}) {
  return {
    id: food.id,
    ifctCode: food.ifctCode,
    name: food.name,
    group: food.group,
    scientificName: food.scientificName,
    ediblePortion: food.ediblePortion,
    source: food.source,
    sourceAttribution: IFCT_SOURCE_ATTRIBUTION,
    per100gNote: IFCT_PER_100G_NOTE,
    disclaimer: NUTRITION_DISCLAIMER,
  };
}

export function serializeNutrientValue(row: FoodNutrientRow) {
  return {
    code: row.nutrient.code,
    name: row.nutrient.name,
    category: row.nutrient.category,
    value: row.value,
    unit: row.unit,
    perAmount: row.perAmount,
    perUnit: row.perUnit,
    sourceTable: row.sourceTable,
  };
}
