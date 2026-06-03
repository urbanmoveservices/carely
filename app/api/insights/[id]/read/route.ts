import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/family-auth";
import { notFound, serverError } from "@/lib/api-response";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const { id } = await params;

    const insight = await prisma.healthInsight.findFirst({
      where: { id, userId: auth.payload.userId },
    });
    if (!insight) return notFound();

    await prisma.healthInsight.update({
      where: { id },
      data: { isRead: true },
    });

    await auditUserAction(
      req,
      auth.payload.userId,
      auth.payload.email,
      AUDIT_ACTIONS.INSIGHT_MARKED_READ,
      { entityType: "health_insight", entityId: id }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Insight read error:", err);
    return serverError();
  }
}
