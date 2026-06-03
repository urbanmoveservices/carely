import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/family-auth";
import { ok, validationError, serverError } from "@/lib/api-response";
import { suggestDiet } from "@/lib/nutrition/diet-suggest";

const schema = z.object({
  condition: z.string().optional(),
  goal: z.string().optional(),
  age: z.number().optional(),
  gender: z.string().optional(),
  reportValues: z.record(z.string(), z.number()).optional(),
  preferences: z.array(z.string()).optional(),
  avoid: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error.message);

    const result = await suggestDiet(parsed.data);
    return ok(result);
  } catch (err) {
    console.error("Diet suggest error:", err);
    return serverError();
  }
}
