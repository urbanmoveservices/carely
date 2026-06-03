import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/family-auth";
import { ok, validationError, serverError } from "@/lib/api-response";
import { foodsByNutrient } from "@/lib/nutrition/food-service";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const sp = new URL(req.url).searchParams;
    const nutrient = sp.get("nutrient")?.trim();
    if (!nutrient) return validationError("Query param nutrient is required");

    const limit = Math.min(parseInt(sp.get("limit") ?? "20", 10) || 20, 50);
    const condition = sp.get("condition") ?? undefined;

    const result = await foodsByNutrient({ nutrient, mode: "high", limit, condition });
    return ok(result);
  } catch (err) {
    console.error("Nutrition high error:", err);
    return serverError();
  }
}
