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

    const reports = await prisma.report.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        document: { select: { id: true, originalFilename: true } },
      },
    });

    return ok(
      reports.map((r) => ({
        id: r.id,
        summary: r.summary.length > 120 ? r.summary.slice(0, 120) + "..." : r.summary,
        createdAt: r.createdAt.toISOString(),
        user: r.user,
        document: r.document,
      }))
    );
  } catch (err) {
    console.error("Admin reports error:", err);
    return serverError();
  }
}
