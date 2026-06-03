import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/family-auth";
import { forbidden, notFound, serverError, validationError } from "@/lib/api-response";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const { token } = await params;

    const invite = await prisma.caregiverInvite.findUnique({ where: { token } });
    if (!invite) return notFound("Invite not found");
    if (invite.status !== "pending") return validationError("Invite is no longer valid");
    if (invite.expiresAt < new Date()) {
      await prisma.caregiverInvite.update({ where: { id: invite.id }, data: { status: "expired" } });
      return validationError("Invite has expired");
    }

    if (invite.invitedEmail.toLowerCase() !== auth.payload.email.toLowerCase()) {
      return forbidden("This invite was sent to a different email address");
    }

    const existing = await prisma.caregiverAccess.findUnique({
      where: {
        ownerUserId_caregiverUserId: {
          ownerUserId: invite.ownerUserId,
          caregiverUserId: auth.payload.userId,
        },
      },
    });

    if (!existing) {
      await prisma.caregiverAccess.create({
        data: {
          ownerUserId: invite.ownerUserId,
          caregiverUserId: auth.payload.userId,
          role: invite.role,
          canViewReports: invite.canViewReports,
          canViewFamily: invite.canViewFamily,
          canAddNotes: invite.canAddNotes,
          canManageReminders: invite.canManageReminders,
        },
      });
    }

    await prisma.caregiverInvite.update({
      where: { id: invite.id },
      data: { status: "accepted", acceptedAt: new Date() },
    });

    await auditUserAction(req, auth.payload.userId, auth.payload.email, AUDIT_ACTIONS.CAREGIVER_INVITE_ACCEPTED, {
      entityType: "caregiver_invite",
      entityId: invite.id,
      metadata: { ownerUserId: invite.ownerUserId },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Caregiver invite accept error:", err);
    return serverError();
  }
}
