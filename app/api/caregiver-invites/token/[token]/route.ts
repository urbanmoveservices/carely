import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { notFound, serverError } from "@/lib/api-response";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const invite = await prisma.caregiverInvite.findUnique({
      where: { token },
      include: {
        owner: { select: { name: true } },
      },
    });

    if (!invite) return notFound("Invite not found");

    return NextResponse.json({
      invitedEmail: invite.invitedEmail,
      invitedName: invite.invitedName,
      ownerName: invite.owner.name,
      role: invite.role,
      status: invite.status,
      expiresAt: invite.expiresAt.toISOString(),
      expired: invite.expiresAt < new Date() || invite.status !== "pending",
    });
  } catch (err) {
    console.error("Invite token lookup error:", err);
    return serverError();
  }
}
