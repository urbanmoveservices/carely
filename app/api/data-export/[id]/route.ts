import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/family-auth";
import { ok, notFound, forbidden, serverError } from "@/lib/api-response";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const { id } = await params;

    const row = await prisma.dataExportRequest.findUnique({ where: { id } });
    if (!row) return notFound("Export not found");
    if (row.userId !== auth.payload.userId) return forbidden();

    return ok({
      export: {
        id: row.id,
        status: row.status,
        format: row.format,
        createdAt: row.createdAt,
        completedAt: row.completedAt,
        expiresAt: row.expiresAt,
        error: row.error,
        ready: row.status === "completed",
      },
    });
  } catch (err) {
    console.error("Data export GET error:", err);
    return serverError();
  }
}
