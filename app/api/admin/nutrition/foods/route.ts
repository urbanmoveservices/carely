import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";
import { unauthorized, forbidden, ok, serverError } from "@/lib/api-response";
import { searchFoods } from "@/lib/nutrition/search";

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

    const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
    if (q) {
      const hits = await searchFoods(q, 30);
      const foods = await prisma.food.findMany({
        where: { id: { in: hits.map((h) => h.id) } },
        include: { aliases: true, _count: { select: { nutrients: true } } },
      });
      return ok({ items: foods, hits });
    }

    const items = await prisma.food.findMany({
      orderBy: { name: "asc" },
      take: 50,
      include: { _count: { select: { nutrients: true, aliases: true } } },
    });
    return ok({ items });
  } catch (err) {
    console.error("Admin nutrition foods error:", err);
    return serverError();
  }
}
