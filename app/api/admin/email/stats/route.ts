import { NextRequest } from "next/server";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";
import { ok, unauthorized, forbidden, serverError } from "@/lib/api-response";
import { getEmailAdminStats } from "@/lib/admin/email-stats";

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return unauthorized();
    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") return forbidden("Admin access required");
    return ok(await getEmailAdminStats());
  } catch (err) {
    console.error("Admin email stats:", err);
    return serverError();
  }
}
