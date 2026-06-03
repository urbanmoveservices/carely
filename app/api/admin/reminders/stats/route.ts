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

    const [totalReminders, pendingReminders, doneReminders, skippedReminders] =
      await Promise.all([
        prisma.reminder.count(),
        prisma.reminder.count({ where: { status: "pending" } }),
        prisma.reminder.count({ where: { status: "done" } }),
        prisma.reminder.count({ where: { status: "skipped" } }),
      ]);

    return ok({
      totalReminders,
      pendingReminders,
      doneReminders,
      skippedReminders,
    });
  } catch (err) {
    console.error("Admin reminder stats error:", err);
    return serverError();
  }
}
