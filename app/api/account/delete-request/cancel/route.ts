import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/family-auth";
import { ok, notFound, serverError } from "@/lib/api-response";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const pending = await prisma.accountDeletionRequest.findFirst({
      where: { userId: auth.payload.userId, status: "pending" },
      orderBy: { createdAt: "desc" },
    });
    if (!pending) return notFound("No pending deletion request");

    const updated = await prisma.accountDeletionRequest.update({
      where: { id: pending.id },
      data: { status: "cancelled" },
    });

    await prisma.user.update({
      where: { id: auth.payload.userId },
      data: { isActive: true },
    });

    return ok({ request: updated });
  } catch (err) {
    console.error("Delete cancel error:", err);
    return serverError();
  }
}
