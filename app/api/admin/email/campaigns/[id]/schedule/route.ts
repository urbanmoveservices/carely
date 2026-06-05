import { NextRequest } from "next/server";
import { z } from "zod";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";
import { ok, unauthorized, forbidden, serverError, validationError, notFound } from "@/lib/api-response";
import prisma from "@/lib/prisma";

const schema = z.object({
  scheduledAt: z.string().datetime().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return unauthorized();
    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") return forbidden("Admin access required");

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) return validationError("Invalid schedule time");

    const campaign = await prisma.emailCampaign.findUnique({ where: { id } });
    if (!campaign) return notFound("Campaign not found");

    const scheduledAt = parsed.data.scheduledAt
      ? new Date(parsed.data.scheduledAt)
      : new Date();

    const updated = await prisma.emailCampaign.update({
      where: { id },
      data: { status: "scheduled", scheduledAt },
    });
    return ok({ campaign: updated });
  } catch (err) {
    console.error("Campaign schedule:", err);
    return serverError();
  }
}
