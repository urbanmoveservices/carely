import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";
import { getCurrentMonthKey, getPlanLimits, normalizePlanKey } from "@/lib/plans";
import { ok, unauthorized, forbidden, serverError, rateLimited } from "@/lib/api-response";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return unauthorized();
    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") {
      return forbidden("Admin access required");
    }

    const rl = checkRateLimit("admin-api", payload.userId, RATE_LIMITS.ADMIN_API);
    if (!rl.allowed) return rateLimited();

    const monthKey = getCurrentMonthKey();
    const users = await prisma.user.findMany({
      where: { role: "user" },
      select: {
        id: true,
        email: true,
        name: true,
        currentPlan: true,
        usageCounters: {
          where: { monthKey },
          take: 1,
        },
        _count: { select: { familyMembers: true } },
      },
    });

    const usersByPlan = { free: 0, pro: 0, family: 0 };
    let uploadsThisMonth = 0;
    let aiSummariesThisMonth = 0;
    const nearLimitUsers: {
      id: string;
      email: string;
      name: string;
      plan: string;
      reason: string;
    }[] = [];

    for (const u of users) {
      const plan = normalizePlanKey(u.currentPlan);
      usersByPlan[plan]++;
      const counter = u.usageCounters[0];
      const uploadsUsed = counter?.uploadsUsed ?? 0;
      const aiUsed = counter?.aiSummariesUsed ?? 0;
      uploadsThisMonth += uploadsUsed;
      aiSummariesThisMonth += aiUsed;

      const limits = getPlanLimits(plan);
      if (uploadsUsed >= limits.uploadsPerMonth * 0.8) {
        nearLimitUsers.push({
          id: u.id,
          email: u.email,
          name: u.name,
          plan,
          reason: "uploads",
        });
      } else if (aiUsed >= limits.aiSummariesPerMonth * 0.8) {
        nearLimitUsers.push({
          id: u.id,
          email: u.email,
          name: u.name,
          plan,
          reason: "ai_summaries",
        });
      }
    }

    return ok({
      usersByPlan,
      uploadsThisMonth,
      aiSummariesThisMonth,
      monthKey,
      nearLimitUsers: nearLimitUsers.slice(0, 20),
    });
  } catch (err) {
    console.error("Admin billing stats error:", err);
    return serverError();
  }
}
