import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";
import { unauthorized, forbidden, ok, validationError, serverError } from "@/lib/api-response";

async function requireAdmin(req: NextRequest) {
  const token = getTokenFromHeader(req.headers.get("authorization"));
  if (!token) return { error: unauthorized() };
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") return { error: forbidden("Admin access required") };
  return { payload };
}

const schema = z.object({
  rawFoodId: z.string(),
  cookedName: z.string().min(1),
  cookedFoodId: z.string().optional().nullable(),
  rawWeightGram: z.number().optional().nullable(),
  cookedWeightGram: z.number().optional().nullable(),
  multiplier: z.number().optional().nullable(),
  note: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if ("error" in admin) return admin.error;

    const items = await prisma.foodConversionRule.findMany({
      take: 100,
      include: { rawFood: { select: { id: true, name: true } } },
      orderBy: { updatedAt: "desc" },
    });
    return ok({ items });
  } catch (err) {
    console.error("Admin conversion rules list error:", err);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if ("error" in admin) return admin.error;

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error.message);

    const row = await prisma.foodConversionRule.create({ data: parsed.data });
    return ok({ rule: row });
  } catch (err) {
    console.error("Admin conversion rule create error:", err);
    return serverError();
  }
}
