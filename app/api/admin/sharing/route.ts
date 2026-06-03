import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";
import { maskToken } from "@/lib/secure-token";
import { unauthorized, forbidden, serverError } from "@/lib/api-response";

async function requireAdmin(req: NextRequest) {
  const token = getTokenFromHeader(req.headers.get("authorization"));
  if (!token) return { error: unauthorized() };
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") return { error: forbidden("Admin access required") };
  return { payload };
}

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if ("error" in admin) return admin.error;

    const [invites, access, shareLinks, emergencyCards] = await Promise.all([
      prisma.caregiverInvite.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { owner: { select: { name: true, email: true } } },
      }),
      prisma.caregiverAccess.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          owner: { select: { name: true, email: true } },
          caregiver: { select: { name: true, email: true } },
        },
      }),
      prisma.doctorShareLink.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          report: { select: { id: true } },
        },
      }),
      prisma.emergencyHealthCard.count({ where: { isEnabled: true } }),
    ]);

    return NextResponse.json({
      invites: invites.map((i) => ({
        id: i.id,
        owner: i.owner,
        invitedEmail: i.invitedEmail,
        status: i.status,
        tokenMasked: maskToken(i.token),
        expiresAt: i.expiresAt.toISOString(),
      })),
      access: access.map((a) => ({
        id: a.id,
        owner: a.owner,
        caregiver: a.caregiver,
        role: a.role,
        createdAt: a.createdAt.toISOString(),
      })),
      shareLinks: shareLinks.map((s) => ({
        id: s.id,
        reportId: s.reportId,
        tokenMasked: maskToken(s.token),
        expiresAt: s.expiresAt.toISOString(),
        revokedAt: s.revokedAt?.toISOString() ?? null,
        accessCount: s.accessCount,
      })),
      enabledEmergencyCards: emergencyCards,
    });
  } catch (err) {
    console.error("Admin sharing overview error:", err);
    return serverError();
  }
}
