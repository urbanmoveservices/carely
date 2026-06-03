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

    const tickets = await prisma.supportTicket.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: {
        messages: { orderBy: { createdAt: "asc" }, take: 5 },
      },
    });
    return ok({ tickets });
  } catch (err) {
    console.error("Admin tickets error:", err);
    return serverError();
  }
}
