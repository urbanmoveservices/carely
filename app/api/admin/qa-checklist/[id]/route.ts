import { NextRequest } from "next/server";
import { z } from "zod";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";
import {
  ok,
  unauthorized,
  forbidden,
  validationError,
  notFound,
  serverError,
} from "@/lib/api-response";
import prisma from "@/lib/prisma";

const patchSchema = z.object({
  status: z.enum(["pending", "pass", "fail"]).optional(),
  notes: z.string().max(2000).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return unauthorized();
    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") {
      return forbidden("Admin access required");
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0]?.message || "Invalid input");
    }

    const existing = await prisma.qaChecklistItem.findUnique({ where: { id } });
    if (!existing) return notFound("Checklist item not found");

    const item = await prisma.qaChecklistItem.update({
      where: { id },
      data: {
        ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
        ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
        updatedById: payload.userId,
      },
    });

    return ok({ item });
  } catch (err) {
    console.error("QA checklist PATCH [id] error:", err);
    return serverError();
  }
}
