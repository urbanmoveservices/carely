import { NextRequest } from "next/server";
import { z } from "zod";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";
import {
  ok,
  unauthorized,
  forbidden,
  validationError,
  serverError,
} from "@/lib/api-response";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return unauthorized();
    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") {
      return forbidden("Admin access required");
    }
    const resolved = req.nextUrl.searchParams.get("resolved");
    const where =
      resolved === "true"
        ? { isResolved: true }
        : resolved === "false"
          ? { isResolved: false }
          : {};
    const logs = await prisma.errorLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return ok({ logs });
  } catch (err) {
    console.error("Error logs GET error:", err);
    return serverError();
  }
}

const patchSchema = z.object({
  id: z.string(),
  isResolved: z.boolean(),
});

export async function PATCH(req: NextRequest) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return unauthorized();
    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") {
      return forbidden("Admin access required");
    }
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0]?.message || "Invalid input");
    }
    const log = await prisma.errorLog.update({
      where: { id: parsed.data.id },
      data: { isResolved: parsed.data.isResolved },
    });
    return ok({ log });
  } catch (err) {
    console.error("Error logs PATCH error:", err);
    return serverError();
  }
}
