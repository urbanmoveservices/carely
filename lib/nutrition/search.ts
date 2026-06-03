import prisma from "@/lib/prisma";
import { normalizeFoodName, tokenOverlapScore } from "@/lib/nutrition/normalize";
import { serializeFoodBase } from "@/lib/nutrition/serialize";

export type FoodSearchHit = {
  id: string;
  name: string;
  ifctCode: string | null;
  group: string | null;
  matchScore: number;
  matchType: "exact" | "alias" | "partial" | "fuzzy";
};

export async function searchFoods(query: string, limit = 20): Promise<FoodSearchHit[]> {
  const q = query.trim();
  if (!q) return [];

  const normalized = normalizeFoodName(q);
  const hits = new Map<string, FoodSearchHit>();

  const exact = await prisma.food.findFirst({
    where: { normalizedName: normalized },
  });
  if (exact) {
    hits.set(exact.id, {
      id: exact.id,
      name: exact.name,
      ifctCode: exact.ifctCode,
      group: exact.group,
      matchScore: 100,
      matchType: "exact",
    });
  }

  const aliasExact = await prisma.foodAlias.findMany({
    where: { normalizedAlias: normalized },
    include: { food: true },
    take: limit,
  });
  for (const a of aliasExact) {
    if (!hits.has(a.foodId)) {
      hits.set(a.foodId, {
        id: a.food.id,
        name: a.food.name,
        ifctCode: a.food.ifctCode,
        group: a.food.group,
        matchScore: 95,
        matchType: "alias",
      });
    }
  }

  const partialFoods = await prisma.food.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { normalizedName: { contains: normalized, mode: "insensitive" } },
        { group: { contains: q, mode: "insensitive" } },
      ],
    },
    take: 50,
  });
  for (const f of partialFoods) {
    const existing = hits.get(f.id);
    const score = existing?.matchScore ?? 70;
    if (!existing || score < 70) {
      hits.set(f.id, {
        id: f.id,
        name: f.name,
        ifctCode: f.ifctCode,
        group: f.group,
        matchScore: Math.max(score, 70),
        matchType: "partial",
      });
    }
  }

  const partialAliases = await prisma.foodAlias.findMany({
    where: {
      OR: [
        { alias: { contains: q, mode: "insensitive" } },
        { normalizedAlias: { contains: normalized, mode: "insensitive" } },
      ],
    },
    include: { food: true },
    take: 40,
  });
  for (const a of partialAliases) {
    if (!hits.has(a.foodId)) {
      hits.set(a.foodId, {
        id: a.food.id,
        name: a.food.name,
        ifctCode: a.food.ifctCode,
        group: a.food.group,
        matchScore: 65,
        matchType: "alias",
      });
    }
  }

  if (hits.size < limit) {
    const candidates = await prisma.food.findMany({
      orderBy: { name: "asc" },
      take: 400,
      select: { id: true, name: true, ifctCode: true, group: true, normalizedName: true },
    });
    for (const f of candidates) {
      if (hits.has(f.id)) continue;
      const score = tokenOverlapScore(q, f.name) * 60;
      if (score >= 25) {
        hits.set(f.id, {
          id: f.id,
          name: f.name,
          ifctCode: f.ifctCode,
          group: f.group,
          matchScore: score,
          matchType: "fuzzy",
        });
      }
    }
  }

  return [...hits.values()]
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}

export async function resolveFoodByName(name: string) {
  const hits = await searchFoods(name, 1);
  if (!hits.length) return null;
  const food = await prisma.food.findUnique({ where: { id: hits[0].id } });
  return food ? { food, match: hits[0] } : null;
}

export async function searchFoodsResponse(query: string, limit = 20) {
  const items = await searchFoods(query, limit);
  const foods = await prisma.food.findMany({
    where: { id: { in: items.map((i) => i.id) } },
  });
  const byId = new Map(foods.map((f) => [f.id, f]));
  return {
    query,
    items: items.map((hit) => ({
      ...serializeFoodBase(byId.get(hit.id)!),
      matchScore: hit.matchScore,
      matchType: hit.matchType,
    })),
  };
}
