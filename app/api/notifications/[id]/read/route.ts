import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/family-auth";
import { ok, notFound } from "@/lib/api-response";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const { id } = await params;

  const existing = await prisma.appNotification.findFirst({
    where: { id, userId: auth.payload.userId },
  });
  if (!existing) return notFound("Notification not found");

  const updated = await prisma.appNotification.update({
    where: { id },
    data: { isRead: true },
  });

  return ok({ id: updated.id, isRead: updated.isRead });
}
