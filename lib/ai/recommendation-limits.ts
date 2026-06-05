import type { ParsedLabValue } from "@/lib/lab-value-parser";
import { INDIAN_DIET_DISCLAIMER } from "@/lib/diet/indian-diet-context";
import { seasonalExerciseHints } from "@/lib/weather/weather-context";
import type { WeatherContext } from "@/lib/weather/weather-context";
import { toIndianFoodAlternative } from "@/lib/diet/indian-diet-context";

export const RECOMMENDATION_MIN = 5;
export const RECOMMENDATION_MAX = 7;

function normalizeLine(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export function dedupeRecommendationLines(lines: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    const key = normalizeLine(t);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

export function trimToMax(lines: string[], max = RECOMMENDATION_MAX): string[] {
  return dedupeRecommendationLines(lines).slice(0, max);
}

function deterministicFoodPoints(structured: ParsedLabValue[]): string[] {
  const canonical = new Set(structured.map((v) => v.canonicalName));
  const points: string[] = [];
  if (canonical.has("ldl") || canonical.has("total_cholesterol")) {
    points.push("Favour dal, sabzi, and whole grains; limit fried snacks and bakery items for lipid control.");
  }
  if (canonical.has("fasting_glucose") || canonical.has("hba1c")) {
    points.push("Balance rice/roti portions with dal, curd, and vegetables; avoid sugary drinks and mithai.");
  }
  if (canonical.has("hemoglobin") || canonical.has("pcv")) {
    points.push("Include palak, methi, dals, and chana; pair with lemon or amla for iron absorption.");
  }
  points.push("Prefer home-cooked Indian meals with adequate protein from dal, curd, paneer, or eggs as per preference.");
  points.push("Stay hydrated with water; limit packaged juices and sweetened lassi.");
  points.push(INDIAN_DIET_DISCLAIMER);
  return points;
}

function deterministicExercisePoints(
  structured: ParsedLabValue[],
  weather: WeatherContext | null
): string[] {
  const hasFatigueSymptom = false;
  const points: string[] = [
    "Start with 20–30 minute brisk walks on most days; increase gradually as tolerated.",
    "Add light strength (bodyweight squats, wall push-ups) 2 days per week if no chest pain or severe breathlessness.",
  ];
  if (!hasFatigueSymptom) {
    points.push("Include 5–10 minutes of stretching after walks to reduce stiffness.");
  } else {
    points.push("If breathlessness or fatigue is present, keep activity light and check with your doctor before intense exercise.");
  }
  for (const hint of seasonalExerciseHints(weather)) {
    points.push(hint);
  }
  points.push("Track steps or active minutes weekly to stay consistent.");
  return points;
}

function deterministicLifestylePoints(structured: ParsedLabValue[]): string[] {
  const abnormal = structured.filter((v) => v.status === "high" || v.status === "low");
  const points: string[] = [
    "Sleep 7–8 hours on a regular schedule; avoid heavy late-night meals.",
    "Drink adequate water through the day; limit excess tea/coffee with sugar.",
    "Follow up with your doctor to review uploaded lab values and adjust treatment if needed.",
    "Keep a simple log of symptoms, BP, or sugar readings if your doctor advised monitoring.",
  ];
  if (abnormal.length) {
    points.push(
      `Repeat or trend tests for abnormal markers (${abnormal.slice(0, 3).map((v) => v.testName).join(", ")}) as your doctor recommends.`
    );
  }
  points.push("Confirm all medicines and supplements with your doctor before starting or changing doses.");
  return points;
}

export function ensureRecommendationCounts(
  food: string[],
  exercise: string[],
  lifestyle: string[],
  structured: ParsedLabValue[],
  weather: WeatherContext | null = null
): {
  foodRecommendations: string[];
  exerciseRecommendations: string[];
  lifestyleAdvice: string[];
} {
  let foodRecs = trimToMax(
    food.map((l) => toIndianFoodAlternative(l)),
    RECOMMENDATION_MAX
  );
  let exerciseRecs = trimToMax(exercise, RECOMMENDATION_MAX);
  let lifestyleRecs = trimToMax(lifestyle, RECOMMENDATION_MAX);

  const fill = (arr: string[], pool: string[]) => {
    for (const p of pool) {
      if (arr.length >= RECOMMENDATION_MIN) break;
      if (!arr.some((x) => normalizeLine(x) === normalizeLine(p))) arr.push(p);
    }
    return arr;
  };

  foodRecs = fill(foodRecs, deterministicFoodPoints(structured));
  exerciseRecs = fill(exerciseRecs, deterministicExercisePoints(structured, weather));
  lifestyleRecs = fill(lifestyleRecs, deterministicLifestylePoints(structured));

  return {
    foodRecommendations: foodRecs.slice(0, RECOMMENDATION_MAX),
    exerciseRecommendations: exerciseRecs.slice(0, RECOMMENDATION_MAX),
    lifestyleAdvice: lifestyleRecs.slice(0, RECOMMENDATION_MAX),
  };
}
