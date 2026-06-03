import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/family-auth";
import { serverError, validationError, fail } from "@/lib/api-response";
import { planAllowsCaregiverSharing } from "@/lib/plans";
import { generateSecureToken, maskToken } from "@/lib/secure-token";
import { getBaseUrlFromRequest } from "@/lib/url";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";

const createSchema = z.object({
  invitedEmail: z.string().email(),
  invitedName: z.string().max(200).optional(),
  role: z.enum(["viewer", "caregiver"]).default("viewer"),
  canViewReports: z.boolean().default(true),
  canViewFamily: z.boolean().default(true),
  canAddNotes: z.boolean().default(false),
  canManageReminders: z.boolean().default(false),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const invites = await prisma.caregiverInvite.findMany({
      where: { ownerUserId: auth.payload.userId },
      orderBy: { createdAt: "desc" },
    });

    const access = await prisma.caregiverAccess.findMany({
      where: { ownerUserId: auth.payload.userId },
      include: {
        caregiver: { select: { id: true, name: true, email: true } },
      },
    });

    const base = getBaseUrlFromRequest(req);
    return NextResponse.json({
      invites: invites.map((i) => ({
        id: i.id,
        invitedEmail: i.invitedEmail,
        invitedName: i.invitedName,
        role: i.role,
        status: i.status,
        inviteUrl: i.status === "pending" ? `${base}/invite/${i.token}` : null,
        tokenMasked: maskToken(i.token),
        expiresAt: i.expiresAt.toISOString(),
        acceptedAt: i.acceptedAt?.toISOString() ?? null,
        canViewReports: i.canViewReports,
        canViewFamily: i.canViewFamily,
        canAddNotes: i.canAddNotes,
        canManageReminders: i.canManageReminders,
        createdAt: i.createdAt.toISOString(),
      })),
      caregivers: access.map((a) => ({
        id: a.id,
        caregiver: a.caregiver,
        role: a.role,
        canViewReports: a.canViewReports,
        canViewFamily: a.canViewFamily,
        canAddNotes: a.canAddNotes,
        canManageReminders: a.canManageReminders,
        createdAt: a.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("Caregiver invites list error:", err);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error.issues[0]?.message || "Invalid input");

    if (parsed.data.invitedEmail.toLowerCase() === auth.payload.email.toLowerCase()) {
      return validationError("You cannot invite yourself");
    }

    const owner = await prisma.user.findUnique({
      where: { id: auth.payload.userId },
      select: { currentPlan: true },
    });
    if (!owner || !planAllowsCaregiverSharing(owner.currentPlan)) {
      return fail(
        "Caregiver sharing is available on the Family plan.",
        403,
        "CAREGIVER_PLAN_REQUIRED"
      );
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    const token = generateSecureToken();

    const invite = await prisma.caregiverInvite.create({
      data: {
        ownerUserId: auth.payload.userId,
        invitedEmail: parsed.data.invitedEmail.toLowerCase(),
        invitedName: parsed.data.invitedName ?? null,
        token,
        role: parsed.data.role,
        canViewReports: parsed.data.canViewReports,
        canViewFamily: parsed.data.canViewFamily,
        canAddNotes: parsed.data.canAddNotes,
        canManageReminders: parsed.data.canManageReminders,
        expiresAt,
      },
    });

    await auditUserAction(req, auth.payload.userId, auth.payload.email, AUDIT_ACTIONS.CAREGIVER_INVITE_CREATED, {
      entityType: "caregiver_invite",
      entityId: invite.id,
      metadata: { role: parsed.data.role },
    });

    return NextResponse.json({
      id: invite.id,
      inviteUrl: `${getBaseUrlFromRequest(req)}/invite/${token}`,
      expiresAt: invite.expiresAt.toISOString(),
    });
  } catch (err) {
    console.error("Caregiver invite create error:", err);
    return serverError();
  }
}
