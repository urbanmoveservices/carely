import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/family-auth";
import { ok, validationError, serverError } from "@/lib/api-response";
import { compareFoods } from "@/lib/nutrition/food-service";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const foodsParam = new URL(req.url).searchParams.get("foods")?.trim();
    if (!foodsParam) return validationError("Query param foods is required (comma-separated)");

    const names = foodsParam.split(",").map((s) => s.trim()).filter(Boolean);
    if (names.length < 2) return validationError("Provide at least two foods to compare");

    const result = await compareFoods(names.slice(0, 6));
    return ok(result);
  } catch (err) {
    console.error("Nutrition compare error:", err);
    return serverError();
  }
}
