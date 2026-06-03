import { NextRequest } from "next/server";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";
import { ok, unauthorized, forbidden, serverError } from "@/lib/api-response";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return unauthorized();
    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") {
      return forbidden("Admin access required");
    }
    const status = req.nextUrl.searchParams.get("status");
    const jobs = await prisma.backgroundJob.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return ok({ jobs });
  } catch (err) {
    console.error("Admin jobs error:", err);
    return serverError();
  }
}
