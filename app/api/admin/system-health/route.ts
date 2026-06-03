import { NextRequest } from "next/server";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";
import { ok, unauthorized, forbidden, serverError } from "@/lib/api-response";
import { getSystemHealth } from "@/lib/system-health";

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return unauthorized();
    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") {
      return forbidden("Admin access required");
    }
    const health = await getSystemHealth();
    return ok(health);
  } catch (err) {
    console.error("System health error:", err);
    return serverError();
  }
}
