import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/family-auth";
import { ok, serverError } from "@/lib/api-response";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const logs = await prisma.accessLog.findMany({
      where: { userId: auth.payload.userId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        action: true,
        resourceType: true,
        resourceId: true,
        ipAddress: true,
        createdAt: true,
      },
    });

    const deletions = await prisma.accountDeletionRequest.findMany({
      where: { userId: auth.payload.userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const exports = await prisma.dataExportRequest.findMany({
      where: { userId: auth.payload.userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, status: true, createdAt: true, completedAt: true },
    });

    return ok({ logs, deletions, exports });
  } catch (err) {
    console.error("Access logs error:", err);
    return serverError();
  }
}
