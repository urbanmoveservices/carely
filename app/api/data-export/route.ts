import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/family-auth";
import { ok, serverError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { enqueueJob, JOB_TYPES } from "@/lib/jobs/queue";
import { createAccessLog, accessFromRequest, ACCESS_ACTIONS } from "@/lib/access-log";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const exportReq = await prisma.dataExportRequest.create({
      data: { userId: auth.payload.userId, status: "queued" },
    });

    await enqueueJob({
      type: JOB_TYPES.DATA_EXPORT,
      userId: auth.payload.userId,
      payload: { exportId: exportReq.id, userId: auth.payload.userId },
      priority: 3,
    });

    const meta = accessFromRequest(req, auth.payload.userId);
    await createAccessLog({
      ...meta,
      action: ACCESS_ACTIONS.DATA_EXPORT_REQUESTED,
      resourceType: "data_export",
      resourceId: exportReq.id,
    });

    return ok({ export: exportReq });
  } catch (err) {
    console.error("Data export POST error:", err);
    return serverError();
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const exports = await prisma.dataExportRequest.findMany({
      where: { userId: auth.payload.userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        status: true,
        format: true,
        createdAt: true,
        completedAt: true,
        expiresAt: true,
        error: true,
      },
    });
    return ok({ exports });
  } catch (err) {
    console.error("Data export GET error:", err);
    return serverError();
  }
}
