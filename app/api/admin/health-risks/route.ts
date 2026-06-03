import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";
import { ok, unauthorized, forbidden, serverError, rateLimited } from "@/lib/api-response";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return unauthorized();

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") return forbidden("Admin access required");

    const rl = checkRateLimit("admin-api", payload.userId, RATE_LIMITS.ADMIN_API);
    if (!rl.allowed) return rateLimited();

    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "100", 10) || 100, 200);

    const rows = await prisma.healthRisk.findMany({
      orderBy: { detectedAt: "desc" },
      take: limit,
      include: {
        familyMember: { select: { id: true, fullName: true, relation: true } },
      },
    });

    const userIds = [...new Set(rows.map((r) => r.userId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return ok({
      items: rows.map((r) => ({
        id: r.id,
        user: userMap.get(r.userId) || { id: r.userId, name: "—", email: "—" },
        familyMember: r.familyMember,
        category: r.category,
        level: r.level,
        title: r.title,
        status: r.status,
        reportId: r.reportId,
        detectedAt: r.detectedAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("Admin health risks error:", err);
    return serverError();
  }
}
