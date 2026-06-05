import { NextRequest } from "next/server";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";
import { ok, unauthorized, forbidden, serverError } from "@/lib/api-response";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return unauthorized();
    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") return forbidden("Admin access required");

    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "100", 10), 500);
    const logs = await prisma.emailLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return ok({ logs });
  } catch (err) {
    console.error("Admin email logs:", err);
    return serverError();
  }
}
