import prisma from "@/lib/prisma";
import { IFCT_SOURCE_ATTRIBUTION } from "@/lib/nutrition/config";
import { serializeFoodBase, serializeNutrientValue } from "@/lib/nutrition/serialize";
import { resolveFoodByName, searchFoods } from "@/lib/nutrition/search";
import { slugNutrientCode } from "@/lib/nutrition/normalize";

export async function getFoodWithNutrients(foodId: string) {
  const food = await prisma.food.findUnique({
    where: { id: foodId },
    include: {
      nutrients: {
        include: { nutrient: true },
        orderBy: { nutrient: { category: "asc" } },
      },
      aliases: true,
    },
  });
  if (!food) return null;

  return {
    ...serializeFoodBase(food),
    aliases: food.aliases.map((a) => ({
      alias: a.alias,
      language: a.language,
    })),
    nutrients: food.nutrients.map((fn) =>
      serializeNutrientValue({
        value: fn.value,
        unit: fn.unit,
        perAmount: fn.perAmount,
        perUnit: fn.perUnit,
        sourceTable: fn.sourceTable,
        nutrient: fn.nutrient,
      })
    ),
    sourceAttribution: IFCT_SOURCE_ATTRIBUTION,
  };
}

export async function compareFoods(names: string[]) {
  const resolved = await Promise.all(names.map((n) => resolveFoodByName(n.trim())));
  const foods = resolved.filter((r) => r?.food).map((r) => r!.food);

  if (!foods.length) {
    return { foods: [], comparison: [], sourceAttribution: IFCT_SOURCE_ATTRIBUTION };
  }

  const rows = await prisma.foodNutrient.findMany({
    where: { foodId: { in: foods.map((f) => f.id) } },
    include: { nutrient: true },
  });

  const byNutrient = new Map<
    string,
    { code: string; name: string; unit: string; values: Record<string, number | null> }
  >();

  for (const row of rows) {
    const key = row.nutrient.code;
    if (!byNutrient.has(key)) {
      byNutrient.set(key, {
        code: row.nutrient.code,
        name: row.nutrient.name,
        unit: row.unit,
        values: {},
      });
    }
    const food = foods.find((f) => f.id === row.foodId);
    if (food) {
      byNutrient.get(key)!.values[food.name] = row.value;
    }
  }

  return {
    foods: foods.map((f) => serializeFoodBase(f)),
    comparison: [...byNutrient.values()].slice(0, 200),
    per100gNote: "All values per 100 g edible portion unless noted.",
    sourceAttribution: IFCT_SOURCE_ATTRIBUTION,
  };
}

export async function foodsByNutrient(params: {
  nutrient: string;
  mode: "high" | "low";
  limit: number;
  condition?: string;
}) {
  const slug = slugNutrientCode(params.nutrient);
  const aliases: Record<string, string[]> = {
    protein: ["protein", "protcnt"],
    fat: ["total_fat", "fatce", "fat"],
    fiber: ["total_dietary_fiber", "fibtg", "fiber", "fibre"],
    iron: ["iron", "fe"],
    sodium: ["sodium", "na"],
    potassium: ["potassium", "k"],
    calcium: ["calcium", "ca"],
    energy: ["energy", "enerc"],
    carbohydrate: ["carbohydrate", "choavldf", "carb"],
  };
  const key = params.nutrient.toLowerCase().replace(/\s+/g, "_");
  const codes = aliases[key] ?? [slug, key];

  let nutrient = await prisma.nutrient.findFirst({
    where: {
      OR: [
        ...codes.map((c) => ({ code: c })),
        { normalizedName: slug },
        { name: { contains: params.nutrient, mode: "insensitive" } },
      ],
    },
  });

  if (!nutrient) {
    nutrient = await prisma.nutrient.findFirst({
      where: { code: { contains: slug, mode: "insensitive" } },
    });
  }
  if (!nutrient) return { items: [], nutrient: null };

  const rows = await prisma.foodNutrient.findMany({
    where: {
      nutrientId: nutrient.id,
      value: { not: null },
    },
    include: { food: true, nutrient: true },
    orderBy: { value: params.mode === "high" ? "desc" : "asc" },
    take: params.limit,
  });

  return {
    nutrient: {
      code: nutrient.code,
      name: nutrient.name,
      unit: nutrient.unit,
      category: nutrient.category,
    },
    mode: params.mode,
    condition: params.condition ?? null,
    items: rows.map((r) => ({
      food: serializeFoodBase(r.food),
      value: r.value,
      unit: r.unit,
      perAmount: r.perAmount,
      perUnit: r.perUnit,
      sourceTable: r.sourceTable,
    })),
    sourceAttribution: IFCT_SOURCE_ATTRIBUTION,
  };
}

export async function listNutrientDefinitions() {
  const nutrients = await prisma.nutrient.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  return {
    count: nutrients.length,
    nutrients,
    sourceAttribution: IFCT_SOURCE_ATTRIBUTION,
  };
}

export { searchFoods, resolveFoodByName };
