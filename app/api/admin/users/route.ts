import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";
import { ok, unauthorized, forbidden, serverError, rateLimited } from "@/lib/api-response";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { getCurrentMonthKey } from "@/lib/plans";

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return unauthorized();

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") return forbidden("Admin access required");

    const rl = checkRateLimit("admin-api", payload.userId, RATE_LIMITS.ADMIN_API);
    if (!rl.allowed) return rateLimited();

    const monthKey = getCurrentMonthKey();
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { documents: true, reports: true } },
        usageCounters: { where: { monthKey }, take: 1 },
        preference: { select: { language: true } },
      },
    });

    return ok(
      users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        lastLoginAt: u.lastLoginAt?.toISOString() || null,
        createdAt: u.createdAt.toISOString(),
        documentCount: u._count.documents,
        reportCount: u._count.reports,
        currentPlan: u.currentPlan,
        emailVerified: u.emailVerified,
        onboardingCompleted: u.onboardingCompleted,
        uploadsUsed: u.usageCounters[0]?.uploadsUsed ?? 0,
        aiSummariesUsed: u.usageCounters[0]?.aiSummariesUsed ?? 0,
        language: u.preference?.language ?? "en",
      }))
    );
  } catch (err) {
    console.error("Admin users error:", err);
    return serverError();
  }
}
