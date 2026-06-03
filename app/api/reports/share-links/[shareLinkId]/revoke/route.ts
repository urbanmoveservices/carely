import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/family-auth";
import { forbidden, notFound, serverError } from "@/lib/api-response";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ shareLinkId: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const { shareLinkId } = await params;

    const link = await prisma.doctorShareLink.findUnique({ where: { id: shareLinkId } });
    if (!link) return notFound("Share link not found");
    if (link.userId !== auth.payload.userId) return forbidden();

    await prisma.doctorShareLink.update({
      where: { id: shareLinkId },
      data: { revokedAt: new Date() },
    });

    await auditUserAction(req, auth.payload.userId, auth.payload.email, AUDIT_ACTIONS.DOCTOR_SHARE_LINK_REVOKED, {
      entityType: "doctor_share_link",
      entityId: shareLinkId,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Share link revoke error:", err);
    return serverError();
  }
}
