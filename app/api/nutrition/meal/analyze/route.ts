import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/family-auth";
import { ok, validationError, serverError } from "@/lib/api-response";
import { analyzeMeal } from "@/lib/nutrition/meal-analyze";

const schema = z.object({
  items: z
    .array(
      z.object({
        foodName: z.string().min(1),
        quantityGram: z.number().positive(),
        state: z.enum(["raw", "cooked"]).optional(),
      })
    )
    .min(1)
    .max(30),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error.message);

    const result = await analyzeMeal(parsed.data.items);
    return ok(result);
  } catch (err) {
    console.error("Meal analyze error:", err);
    return serverError();
  }
}
