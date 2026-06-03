import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/family-auth";
import { forbidden, notFound, serverError } from "@/lib/api-response";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const { id } = await params;

    const invite = await prisma.caregiverInvite.findUnique({ where: { id } });
    if (!invite) return notFound();
    if (invite.ownerUserId !== auth.payload.userId) return forbidden();

    await prisma.caregiverInvite.update({
      where: { id },
      data: { status: "revoked" },
    });

    await auditUserAction(req, auth.payload.userId, auth.payload.email, AUDIT_ACTIONS.CAREGIVER_ACCESS_REVOKED, {
      entityType: "caregiver_invite",
      entityId: id,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Caregiver invite revoke error:", err);
    return serverError();
  }
}
