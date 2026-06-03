import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/family-auth";
import { ok, serverError } from "@/lib/api-response";
import { listNutrientDefinitions } from "@/lib/nutrition/food-service";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const result = await listNutrientDefinitions();
    return ok(result);
  } catch (err) {
    console.error("Nutrition nutrients list error:", err);
    return serverError();
  }
}
