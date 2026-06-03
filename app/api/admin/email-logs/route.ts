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

    const logs = await prisma.emailLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        to: true,
        subject: true,
        type: true,
        status: true,
        createdAt: true,
        sentAt: true,
        error: true,
      },
    });
    return ok({ logs });
  } catch (err) {
    console.error("Email logs error:", err);
    return serverError();
  }
}
