import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";
import { ok, unauthorized, forbidden, serverError, rateLimited } from "@/lib/api-response";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { serializeReminder, reminderIncludeMember } from "@/lib/reminder-serialize";

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return unauthorized();

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") return forbidden("Admin access required");

    const rl = checkRateLimit("admin-api", payload.userId, RATE_LIMITS.ADMIN_API);
    if (!rl.allowed) return rateLimited();

    const reminders = await prisma.reminder.findMany({
      orderBy: { scheduledAt: "desc" },
      take: 200,
      include: {
        ...reminderIncludeMember,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return ok(
      reminders.map((r) => ({
        ...serializeReminder(r),
        user: r.user,
      }))
    );
  } catch (err) {
    console.error("Admin reminders list error:", err);
    return serverError();
  }
}
