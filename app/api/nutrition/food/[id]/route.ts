import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/family-auth";
import { ok, notFound, serverError } from "@/lib/api-response";
import { getFoodWithNutrients } from "@/lib/nutrition/food-service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const food = await getFoodWithNutrients(id);
    if (!food) return notFound("Food not found");
    return ok({ food });
  } catch (err) {
    console.error("Nutrition food detail error:", err);
    return serverError();
  }
}
