import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/family-auth";
import { ok, validationError, serverError } from "@/lib/api-response";

const schema = z.object({
  name: z.string().min(2).optional(),
  intent: z.enum(["self", "family"]).optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0]?.message || "Invalid input");
    }

    if (parsed.data.name) {
      await prisma.user.update({
        where: { id: auth.payload.userId },
        data: { name: parsed.data.name },
      });
    }

    return ok({ success: true, intent: parsed.data.intent ?? null });
  } catch (err) {
    console.error("Onboarding profile error:", err);
    return serverError();
  }
}
