import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/family-auth";
import { ok, validationError, serverError } from "@/lib/api-response";
import prisma from "@/lib/prisma";

const schema = z.object({ endpoint: z.string().url() });

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0]?.message || "Invalid input");
    }

    await prisma.pushSubscription.updateMany({
      where: {
        userId: auth.payload.userId,
        endpoint: parsed.data.endpoint,
      },
      data: { isActive: false },
    });

    return ok({ unsubscribed: true });
  } catch (err) {
    console.error("Push unsubscribe error:", err);
    return serverError();
  }
}
