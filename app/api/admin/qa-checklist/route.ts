import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";
import {
  ok,
  unauthorized,
  forbidden,
  validationError,
  serverError,
} from "@/lib/api-response";
import { listQaChecklist } from "@/lib/qa-checklist";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return unauthorized();
    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") {
      return forbidden("Admin access required");
    }
    const items = await listQaChecklist();
    return ok({ items });
  } catch (err) {
    console.error("QA checklist GET error:", err);
    return serverError();
  }
}

const patchSchema = z.object({
  key: z.string(),
  status: z.enum(["pending", "pass", "fail"]),
  notes: z.string().max(500).optional(),
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
    const item = await prisma.qaChecklistItem.update({
      where: { key: parsed.data.key },
      data: {
        status: parsed.data.status,
        notes: parsed.data.notes,
        updatedById: payload.userId,
      },
    });
    return ok({ item });
  } catch (err) {
    console.error("QA checklist PATCH error:", err);
    return serverError();
  }
}
