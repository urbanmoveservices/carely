import type { ParsedLabValue } from "@/lib/lab-value-parser";
import type { AiHealthContextBundle } from "@/lib/report-context-service";
import type { LocationContext } from "@/lib/location/location-context";

export const INDIAN_DIET_DISCLAIMER =
  "General diet education from report values — not a medical diet prescription; confirm with your doctor or dietitian.";

export function buildIndianDietContextBlock(params: {
  structured: ParsedLabValue[];
  healthContext: AiHealthContextBundle;
  location?: LocationContext | null;
}): string {
  const q = params.healthContext.questionnaire || {};
  const pref =
    (q as { foodPreference?: string }).foodPreference ||
    params.healthContext.familyProfile?.foodPreference ||
    "unknown";
  const canonical = new Set(params.structured.map((v) => v.canonicalName));
  const lines: string[] = [
    "INDIAN DIET CONTEXT:",
    `Food preference: ${pref}. Prefer roti, rice, dal, sabzi, curd, paneer, eggs, fish, pulses, sprouts — not kale/quinoa unless user prefers western diet.`,
    INDIAN_DIET_DISCLAIMER,
  ];

  if (params.location?.state) {
    lines.push(`Regional hint: ${params.location.state}, India — use familiar local foods where possible.`);
  }

  if (canonical.has("ldl") || canonical.has("total_cholesterol") || canonical.has("triglycerides")) {
    lines.push(
      "Lipids high: favour dal/pulses, vegetables, oats/dalia, less fried snacks, bakery, trans-fat; home-cooked meals."
    );
  }
  if (canonical.has("fasting_glucose") || canonical.has("hba1c") || canonical.has("pp_glucose")) {
    lines.push(
      "Sugar markers: limit sweets/sugary drinks; balance rice/roti with dal, curd, vegetables; portion control."
    );
  }
  if (canonical.has("hemoglobin") || canonical.has("pcv") || canonical.has("serum_iron")) {
    lines.push(
      "Iron/PCV: leafy greens, dals, chana, beans; vitamin C with meals (lemon/amla); doctor for iron/B12 if needed."
    );
  }
  if (canonical.has("tsh")) {
    lines.push("Thyroid: adequate protein, iodised salt as per doctor; avoid self mega-doses of supplements.");
  }
  if (canonical.has("vitamin_d")) {
    lines.push("Vitamin D: diet alone often insufficient; discuss supplement and safe sun exposure with doctor.");
  }

  return lines.join("\n");
}

export function isWesternFoodExample(text: string): boolean {
  return /\b(kale|quinoa|avocado toast|bagel|bran flakes)\b/i.test(text);
}

export function toIndianFoodAlternative(text: string): string {
  if (/\bkale\b/i.test(text)) return text.replace(/\bkale\b/gi, "palak (spinach) or methi");
  if (/\bquinoa\b/i.test(text)) return text.replace(/\bquinoa\b/gi, "dalia, brown rice, or millets");
  return text;
}
