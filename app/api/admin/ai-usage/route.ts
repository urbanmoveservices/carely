import { NextRequest } from "next/server";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";
import { ok, unauthorized, forbidden, serverError } from "@/lib/api-response";
import { getAiUsageStats } from "@/lib/admin/ai-usage-stats";

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return unauthorized();
    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") {
      return forbidden("Admin access required");
    }
    const stats = await getAiUsageStats();
    return ok(stats);
  } catch (err) {
    console.error("AI usage stats error:", err);
    return serverError();
  }
}
