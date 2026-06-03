import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/family-auth";
import { ok } from "@/lib/api-response";

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const result = await prisma.appNotification.updateMany({
    where: { userId: auth.payload.userId, isRead: false },
    data: { isRead: true },
  });

  return ok({ updated: result.count });
}
