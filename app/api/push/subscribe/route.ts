import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/family-auth";
import { ok, validationError, serverError } from "@/lib/api-response";
import prisma from "@/lib/prisma";

const schema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string(), auth: z.string() }),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0]?.message || "Invalid input");
    }

    const ua = req.headers.get("user-agent") || undefined;
    const existing = await prisma.pushSubscription.findFirst({
      where: { userId: auth.payload.userId, endpoint: parsed.data.endpoint },
    });

    if (existing) {
      await prisma.pushSubscription.update({
        where: { id: existing.id },
        data: {
          p256dh: parsed.data.keys.p256dh,
          auth: parsed.data.keys.auth,
          isActive: true,
          userAgent: ua,
        },
      });
    } else {
      await prisma.pushSubscription.create({
        data: {
          userId: auth.payload.userId,
          endpoint: parsed.data.endpoint,
          p256dh: parsed.data.keys.p256dh,
          auth: parsed.data.keys.auth,
          userAgent: ua,
        },
      });
    }

    return ok({ subscribed: true });
  } catch (err) {
    console.error("Push subscribe error:", err);
    return serverError();
  }
}
