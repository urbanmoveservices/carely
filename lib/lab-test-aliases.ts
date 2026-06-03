/** Canonical lab markers and Indian lab report aliases. */

export type LabCategory =
  | "cbc"
  | "sugar"
  | "lipid"
  | "liver"
  | "kidney"
  | "thyroid"
  | "vitamins"
  | "iron"
  | "inflammation"
  | "other";

export type CanonicalMarker = {
  canonicalName: string;
  category: LabCategory;
  aliases: string[];
};

/** Broad category labels that must not appear when specific markers exist. */
export const GENERIC_CATEGORY_LABELS = [
  "thyroid function",
  "cholesterol levels",
  "lipid profile",
  "liver function",
  "kidney function",
  "blood sugar",
  "complete blood count",
  "cbc",
] as const;

export const CANONICAL_MARKERS: CanonicalMarker[] = [
  // CBC
  { canonicalName: "hemoglobin", category: "cbc", aliases: ["hemoglobin", "hb", "haemoglobin"] },
  { canonicalName: "rbc_count", category: "cbc", aliases: ["rbc count", "red blood cell", "rbc"] },
  { canonicalName: "wbc_count", category: "cbc", aliases: ["wbc count", "total leucocyte count", "total leukocyte count", "tlc", "wbc"] },
  { canonicalName: "platelet_count", category: "cbc", aliases: ["platelet count", "platelets"] },
  { canonicalName: "pcv", category: "cbc", aliases: ["pcv", "packed cell volume", "hematocrit", "haematocrit", "hct"] },
  { canonicalName: "mcv", category: "cbc", aliases: ["mcv", "mean corpuscular volume"] },
  { canonicalName: "mch", category: "cbc", aliases: ["mch", "mean corpuscular hemoglobin"] },
  { canonicalName: "mchc", category: "cbc", aliases: ["mchc"] },
  { canonicalName: "rdw", category: "cbc", aliases: ["rdw", "red cell distribution width"] },
  // Sugar
  { canonicalName: "fasting_glucose", category: "sugar", aliases: ["fasting glucose", "glucose fasting", "sugar fasting", "fbs", "fasting blood sugar", "glucose (fasting)"] },
  { canonicalName: "pp_glucose", category: "sugar", aliases: ["pp sugar", "post prandial glucose", "ppbs", "postprandial glucose"] },
  { canonicalName: "hba1c", category: "sugar", aliases: ["hba1c", "hb a1c", "glycated hemoglobin", "glycated haemoglobin", "a1c"] },
  { canonicalName: "random_glucose", category: "sugar", aliases: ["random blood sugar", "random glucose", "rbs"] },
  // Lipid
  { canonicalName: "total_cholesterol", category: "lipid", aliases: ["total cholesterol", "cholesterol total", "serum cholesterol"] },
  { canonicalName: "ldl", category: "lipid", aliases: ["ldl", "ldl direct", "ldl cholesterol direct", "ldl cholesterol", "ldl-c"] },
  { canonicalName: "hdl", category: "lipid", aliases: ["hdl", "hdl cholesterol", "hdl-c"] },
  { canonicalName: "triglycerides", category: "lipid", aliases: ["triglycerides", "triglyceride", "tg"] },
  { canonicalName: "vldl", category: "lipid", aliases: ["vldl", "vldl cholesterol"] },
  { canonicalName: "non_hdl_cholesterol", category: "lipid", aliases: ["non hdl cholesterol", "non-hdl"] },
  // Liver
  { canonicalName: "sgot", category: "liver", aliases: ["sgot", "ast", "aspartate aminotransferase"] },
  { canonicalName: "sgpt", category: "liver", aliases: ["sgpt", "alt", "alanine aminotransferase"] },
  { canonicalName: "alp", category: "liver", aliases: ["alp", "alkaline phosphatase"] },
  { canonicalName: "ggt", category: "liver", aliases: ["ggt", "gamma gt", "gamma glutamyl transferase"] },
  { canonicalName: "bilirubin_total", category: "liver", aliases: ["bilirubin total", "total bilirubin", "serum bilirubin total"] },
  { canonicalName: "bilirubin_direct", category: "liver", aliases: ["bilirubin direct", "direct bilirubin", "conjugated bilirubin"] },
  { canonicalName: "bilirubin_indirect", category: "liver", aliases: ["bilirubin indirect", "indirect bilirubin"] },
  { canonicalName: "albumin", category: "liver", aliases: ["albumin", "serum albumin"] },
  { canonicalName: "globulin", category: "liver", aliases: ["globulin", "serum globulin"] },
  { canonicalName: "total_protein", category: "liver", aliases: ["total protein", "serum total protein"] },
  // Kidney
  { canonicalName: "creatinine", category: "kidney", aliases: ["creatinine", "serum creatinine"] },
  { canonicalName: "urea", category: "kidney", aliases: ["urea", "blood urea", "bun"] },
  { canonicalName: "uric_acid", category: "kidney", aliases: ["uric acid", "serum uric acid"] },
  { canonicalName: "egfr", category: "kidney", aliases: ["egfr", "gfr", "estimated gfr"] },
  { canonicalName: "sodium", category: "kidney", aliases: ["sodium", "serum sodium", "na"] },
  { canonicalName: "potassium", category: "kidney", aliases: ["potassium", "serum potassium", "k"] },
  { canonicalName: "chloride", category: "kidney", aliases: ["chloride", "serum chloride", "cl"] },
  { canonicalName: "calcium", category: "kidney", aliases: ["calcium", "serum calcium"] },
  { canonicalName: "phosphorus", category: "kidney", aliases: ["phosphorus", "phosphate", "serum phosphorus"] },
  // Thyroid
  { canonicalName: "tsh", category: "thyroid", aliases: ["tsh", "tsh ultrasensitive", "thyroid stimulating hormone", "ultrasensitive tsh"] },
  { canonicalName: "ft3", category: "thyroid", aliases: ["free t3", "ft3", "triiodothyronine free"] },
  { canonicalName: "ft4", category: "thyroid", aliases: ["free t4", "ft4", "thyroxine free"] },
  { canonicalName: "total_t3", category: "thyroid", aliases: ["total t3", "t3 total"] },
  { canonicalName: "total_t4", category: "thyroid", aliases: ["total t4", "t4 total"] },
  { canonicalName: "anti_tpo", category: "thyroid", aliases: ["anti tpo", "anti-tpo", "thyroid peroxidase antibody"] },
  // Vitamins
  { canonicalName: "vitamin_d", category: "vitamins", aliases: ["vitamin d", "25-oh vitamin d", "25 hydroxy vitamin d", "vit d"] },
  { canonicalName: "vitamin_b12", category: "vitamins", aliases: ["vitamin b12", "b12", "cobalamin"] },
  { canonicalName: "folate", category: "vitamins", aliases: ["folate", "folic acid", "serum folate"] },
  // Iron
  { canonicalName: "serum_iron", category: "iron", aliases: ["serum iron", "iron serum"] },
  { canonicalName: "ferritin", category: "iron", aliases: ["ferritin", "serum ferritin"] },
  { canonicalName: "tibc", category: "iron", aliases: ["tibc", "total iron binding capacity"] },
  { canonicalName: "transferrin_saturation", category: "iron", aliases: ["transferrin saturation", "iron saturation"] },
  // Inflammation
  { canonicalName: "crp", category: "inflammation", aliases: ["crp", "c reactive protein"] },
  { canonicalName: "hs_crp", category: "inflammation", aliases: ["hs-crp", "hs crp", "high sensitivity crp"] },
  { canonicalName: "esr", category: "inflammation", aliases: ["esr", "erythrocyte sedimentation rate"] },
];

const aliasIndex = new Map<string, { canonicalName: string; category: LabCategory }>();

function normAlias(s: string) {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

for (const m of CANONICAL_MARKERS) {
  for (const a of m.aliases) {
    aliasIndex.set(normAlias(a), { canonicalName: m.canonicalName, category: m.category });
  }
  aliasIndex.set(normAlias(m.canonicalName.replace(/_/g, " ")), {
    canonicalName: m.canonicalName,
    category: m.category,
  });
}

function aliasMatchesName(name: string, alias: string): boolean {
  if (name === alias) return true;
  if (name.length < alias.length) return false;
  const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(^|\\s)${escaped}(\\s|$)`, "i");
  return re.test(name);
}

export function resolveCanonicalTestName(rawName: string): {
  canonicalName: string;
  category: LabCategory;
  matchedAlias: string;
} | null {
  const n = normAlias(rawName);
  if (!n) return null;

  const exact = aliasIndex.get(n);
  if (exact) return { ...exact, matchedAlias: n };

  let best: { canonicalName: string; category: LabCategory; matchedAlias: string } | null = null;
  for (const [alias, meta] of aliasIndex.entries()) {
    if (!aliasMatchesName(n, alias)) continue;
    if (!best || alias.length > best.matchedAlias.length) {
      best = { ...meta, matchedAlias: alias };
    }
  }
  return best;
}

export const THYROID_CANONICAL = ["tsh", "ft3", "ft4", "total_t3", "total_t4", "anti_tpo"];
export const LIPID_CANONICAL = [
  "ldl",
  "hdl",
  "triglycerides",
  "total_cholesterol",
  "non_hdl_cholesterol",
  "vldl",
];

export function categoryHasStructuredMarker(
  categoryLabel: string,
  structuredCanonical: Set<string>
): boolean {
  const lower = categoryLabel.toLowerCase();
  if (lower.includes("thyroid") && THYROID_CANONICAL.some((c) => structuredCanonical.has(c))) {
    return true;
  }
  if (
    (lower.includes("cholesterol") || lower.includes("lipid")) &&
    LIPID_CANONICAL.some((c) => structuredCanonical.has(c))
  ) {
    return true;
  }
  return false;
}

export function displayNameForCanonical(canonicalName: string): string {
  const m = CANONICAL_MARKERS.find((x) => x.canonicalName === canonicalName);
  if (!m) return canonicalName.replace(/_/g, " ");
  const primary = m.aliases[0];
  return primary
    .split(" ")
    .map((w) => (w.length <= 3 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}
