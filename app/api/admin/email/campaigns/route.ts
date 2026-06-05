import { NextRequest } from "next/server";
import { z } from "zod";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";
import { ok, unauthorized, forbidden, serverError, validationError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { createCampaignDraft, type CampaignSegment } from "@/lib/email/campaign-service";

const createSchema = z.object({
  name: z.string().min(2),
  subject: z.string().min(2),
  previewText: z.string().optional(),
  templateKey: z.string().min(2),
  category: z.enum(["marketing", "lifecycle"]),
  segment: z.string(),
  contentJson: z.record(z.string(), z.string()).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return unauthorized();
    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") return forbidden("Admin access required");
    const campaigns = await prisma.emailCampaign.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { _count: { select: { recipients: true } } },
    });
    return ok({ campaigns });
  } catch (err) {
    console.error("Campaigns GET:", err);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return unauthorized();
    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") return forbidden("Admin access required");
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0]?.message || "Invalid campaign");
    }
    const campaign = await createCampaignDraft({
      ...parsed.data,
      templateKey: parsed.data.templateKey as import("@/lib/email/template-keys").EmailTemplateKey,
      segment: parsed.data.segment as CampaignSegment,
      createdById: payload.userId,
    });
    return ok({ campaign });
  } catch (err) {
    console.error("Campaigns POST:", err);
    return serverError();
  }
}
