import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";
import { ok, unauthorized, forbidden, fail, notFound, serverError } from "@/lib/api-response";
import { auditAdminAction, AUDIT_ACTIONS } from "@/lib/audit-log";

const statusSchema = z.object({
  isActive: z.boolean(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return unauthorized();

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") return forbidden("Admin access required");

    const { id } = await params;

    if (id === payload.userId) {
      return fail("Cannot change your own account status", 400);
    }

    const body = await req.json();
    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) {
      return fail("Invalid request. 'isActive' must be a boolean.", 400);
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return notFound("User not found");

    const user = await prisma.user.update({
      where: { id },
      data: { isActive: parsed.data.isActive },
    });

    await auditAdminAction(req, payload.userId, payload.email, AUDIT_ACTIONS.ADMIN_UPDATED_USER_STATUS, {
      entityType: "user",
      entityId: id,
      metadata: { targetEmail: target.email, isActive: parsed.data.isActive },
    });

    return ok({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    });
  } catch (err) {
    console.error("Admin status change error:", err);
    return serverError();
  }
}
