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

    const members = await prisma.familyMember.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        user: { select: { id: true, name: true, email: true } },
        _count: { select: { documents: true, conditions: true, medications: true } },
      },
    });

    return ok(
      members.map((m) => ({
        id: m.id,
        fullName: m.fullName,
        relation: m.relation,
        createdAt: m.createdAt.toISOString(),
        owner: m.user,
        documentCount: m._count.documents,
        conditionCount: m._count.conditions,
        medicationCount: m._count.medications,
      }))
    );
  } catch (err) {
    console.error("Admin family members list error:", err);
    return serverError();
  }
}
