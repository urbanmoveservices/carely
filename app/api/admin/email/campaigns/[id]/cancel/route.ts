import { NextRequest } from "next/server";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";
import { ok, unauthorized, forbidden, serverError, notFound } from "@/lib/api-response";
import prisma from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getTokenFromHeader(_req.headers.get("authorization"));
    if (!token) return unauthorized();
    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") return forbidden("Admin access required");

    const { id } = await params;
    const campaign = await prisma.emailCampaign.findUnique({ where: { id } });
    if (!campaign) return notFound("Campaign not found");

    const updated = await prisma.emailCampaign.update({
      where: { id },
      data: { status: "cancelled" },
    });
    return ok({ campaign: updated });
  } catch (err) {
    console.error("Campaign cancel:", err);
    return serverError();
  }
}
