import { analyzeMeal, type MealItemInput } from "@/lib/nutrition/meal-analyze";
import { suggestDiet, type DietSuggestInput } from "@/lib/nutrition/diet-suggest";
import { searchFoodsResponse, resolveFoodByName } from "@/lib/nutrition/search";
import { getFoodWithNutrients, foodsByNutrient } from "@/lib/nutrition/food-service";
import { IFCT_SOURCE_ATTRIBUTION, NUTRITION_DISCLAIMER } from "@/lib/nutrition/config";

const NUTRITION_INTENT =
  /\b(khana|khana|diet|nutrition|protein|calorie|carb|fat|fiber|iron|sodium|potassium|dal|rice|chawal|atta|moong|palak|doodh|milk|meal|breakfast|lunch|dinner|snack|ifct|food composition|glycemic|diabetes.*food|fatty liver.*food|iron rich)\b/i;

export function isNutritionQuestion(message: string): boolean {
  return NUTRITION_INTENT.test(message);
}

/** Tool: search_food_nutrition */
export async function searchFoodNutrition(foodName: string) {
  const search = await searchFoodsResponse(foodName, 5);
  if (!search.items.length) {
    return {
      found: false,
      foodName,
      message: `No IFCT match for "${foodName}". Try Hindi/English alias (e.g. chawal, moong, palak).`,
      sourceAttribution: IFCT_SOURCE_ATTRIBUTION,
    };
  }
  const top = search.items[0];
  const detail = await getFoodWithNutrients(top.id);
  const macros = detail?.nutrients.filter((n) =>
    ["energy", "protein", "carbohydrate", "total_fat", "total_dietary_fiber"].includes(n.code)
  );
  return {
    found: true,
    match: top,
    macros,
    nutrientsCount: detail?.nutrients.length ?? 0,
    per100gNote: detail?.per100gNote,
    sourceAttribution: IFCT_SOURCE_ATTRIBUTION,
    disclaimer: NUTRITION_DISCLAIMER,
    fullNutrientsAvailable: true,
    foodId: top.id,
  };
}

/** Tool: analyze_meal_nutrition */
export async function analyzeMealNutrition(items: MealItemInput[]) {
  return analyzeMeal(items);
}

/** Tool: find_foods_by_nutrient */
export async function findFoodsByNutrient(
  nutrient: string,
  mode: "high" | "low",
  condition?: string
) {
  return foodsByNutrient({ nutrient, mode, limit: 15, condition });
}

export type NutritionToolBundle = {
  usedTools: string[];
  searchResults?: Awaited<ReturnType<typeof searchFoodNutrition>>;
  mealAnalysis?: Awaited<ReturnType<typeof analyzeMealNutrition>>;
  nutrientRanking?: Awaited<ReturnType<typeof findFoodsByNutrient>>;
  dietSuggestion?: Awaited<ReturnType<typeof suggestDiet>>;
};

function extractMealItems(message: string): MealItemInput[] | null {
  const gramMatch = message.matchAll(
    /(\d+)\s*(?:g|gram|grams)\s*(?:of\s+)?([a-zA-Z\u0900-\u097F\s]+?)(?=\s*(?:and|,|\+|$))/gi
  );
  const items: MealItemInput[] = [];
  for (const m of gramMatch) {
    items.push({
      quantityGram: parseInt(m[1], 10),
      foodName: m[2].trim(),
      state: /cooked|pakaya|boiled/i.test(message) ? "cooked" : "raw",
    });
  }
  return items.length ? items : null;
}

export async function runNutritionToolsForMessage(
  message: string,
  reportValues?: Record<string, number>
): Promise<NutritionToolBundle | null> {
  if (!isNutritionQuestion(message)) return null;

  const bundle: NutritionToolBundle = { usedTools: [] };
  const lower = message.toLowerCase();

  if (/dinner|lunch|breakfast|meal|mera|calculate|nutrition calculate/i.test(message)) {
    const items = extractMealItems(message);
    if (items?.length) {
      bundle.mealAnalysis = await analyzeMealNutrition(items);
      bundle.usedTools.push("analyze_meal_nutrition");
    }
  }

  if (/iron|protein|fiber|sodium|potassium|calcium|fat|sugar|carb/i.test(message)) {
    const nutrientMatch = message.match(
      /\b(iron|protein|fiber|fibre|sodium|potassium|calcium|fat|sugar|carbohydrate|energy)\b/i
    );
    if (nutrientMatch) {
      const mode = /low|kam|limit|avoid|reduce/i.test(message) ? "low" : "high";
      let condition: string | undefined;
      if (/diabet/i.test(lower)) condition = "diabetes";
      if (/hypertens|bp|blood pressure/i.test(lower)) condition = "hypertension";
      if (/kidney|renal/i.test(lower)) condition = "kidney_disease";
      if (/anemia/i.test(lower)) condition = "anemia";
      if (/fatty liver/i.test(lower)) condition = "fatty_liver";
      if (/cholesterol/i.test(lower)) condition = "cholesterol";

      bundle.nutrientRanking = await findFoodsByNutrient(
        nutrientMatch[1],
        mode,
        condition
      );
      bundle.usedTools.push("find_foods_by_nutrient");
    }
  }

  if (/diabet|hypertens|kidney|anemia|fatty liver|cholesterol|weight loss|better.*dal/i.test(message)) {
    bundle.dietSuggestion = await suggestDiet({
      condition: lower.includes("diabet")
        ? "diabetes"
        : lower.includes("fatty liver")
          ? "fatty_liver"
          : undefined,
      reportValues,
      preferences: /vegetarian|veg\b/i.test(message) ? ["vegetarian"] : undefined,
    });
    bundle.usedTools.push("diet_suggest");
  }

  const foodPatterns = [
    /(?:me|in|of)\s+([a-zA-Z\u0900-\u097F]+(?:\s+[a-zA-Z\u0900-\u097F]+)?)\s+(?:me|mein)?\s*kitna\s+protein/i,
    /([a-zA-Z\u0900-\u097F]+(?:\s+dal)?)\s+me\s+kitna\s+protein/i,
    /(?:compare|vs)\s+([a-zA-Z\u0900-\u097F,\s]+)/i,
    /\b(chawal|rice|moong|dal|palak|atta|wheat|doodh|milk)\b/i,
  ];

  let foodQuery: string | null = null;
  for (const p of foodPatterns) {
    const m = message.match(p);
    if (m?.[1]) {
      foodQuery = m[1].replace(/,/g, " ").trim();
      break;
    }
  }
  if (!foodQuery) {
    const resolved = await resolveFoodByName(message.split(/\s+/).slice(0, 3).join(" "));
    if (resolved) foodQuery = resolved.food.name;
  }

  if (foodQuery && !bundle.searchResults) {
    bundle.searchResults = await searchFoodNutrition(foodQuery);
    bundle.usedTools.push("search_food_nutrition");
  }

  if (!bundle.usedTools.length) {
    bundle.searchResults = await searchFoodNutrition(message.slice(0, 40));
    bundle.usedTools.push("search_food_nutrition");
  }

  return bundle;
}

export function buildNutritionPromptSection(bundle: NutritionToolBundle): string {
  return `=== IFCT NUTRITION DATABASE (use these values; do not guess) ===
${JSON.stringify(bundle, null, 0).slice(0, 12000)}
Rules:
- Never invent nutrition numbers if IFCT data is present above.
- State values are per 100g raw/reference portion unless conversion was applied.
- If conversion uncertainty flag is true, say estimate is approximate.
- ${IFCT_SOURCE_ATTRIBUTION}
- ${NUTRITION_DISCLAIMER}
- Do not diagnose; give general diet information only.`;
}
