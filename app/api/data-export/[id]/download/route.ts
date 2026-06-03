import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { requireAuth } from "@/lib/family-auth";
import { notFound, forbidden, serverError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { resolveExportFile } from "@/lib/data-export";

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
    if (row.status !== "completed") {
      return notFound("Export not ready");
    }
    if (row.expiresAt && row.expiresAt < new Date()) {
      return notFound("Export expired");
    }

    const filePath = resolveExportFile(id);
    const content = await readFile(filePath, "utf8");

    return new NextResponse(content, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="carely-export-${id}.json"`,
      },
    });
  } catch (err) {
    console.error("Data export download error:", err);
    return serverError();
  }
}
