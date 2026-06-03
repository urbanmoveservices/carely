/** Normalize food/nutrient names for search and matching */

export function normalizeFoodName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function slugNutrientCode(name: string): string {
  const base = normalizeFoodName(name).replace(/\s+/g, "_");
  return base.slice(0, 80) || "unknown";
}

/** Token overlap score 0–1 for fuzzy ranking */
export function tokenOverlapScore(query: string, target: string): number {
  const qTokens = new Set(normalizeFoodName(query).split(" ").filter(Boolean));
  const tTokens = normalizeFoodName(target).split(" ").filter(Boolean);
  if (!qTokens.size || !tTokens.length) return 0;
  let hits = 0;
  for (const t of tTokens) {
    if ([...qTokens].some((q) => t.includes(q) || q.includes(t))) hits++;
  }
  return hits / Math.max(qTokens.size, tTokens.length);
}
