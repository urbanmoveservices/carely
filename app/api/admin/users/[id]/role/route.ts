import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";
import { ok, unauthorized, forbidden, fail, serverError, rateLimited } from "@/lib/api-response";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { auditAdminAction, AUDIT_ACTIONS } from "@/lib/audit-log";

const roleSchema = z.object({
  role: z.enum(["user", "admin"]),
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

    const rl = checkRateLimit("admin-api", payload.userId, RATE_LIMITS.ADMIN_API);
    if (!rl.allowed) return rateLimited();

    const { id } = await params;

    if (id === payload.userId) {
      return fail("Cannot change your own role", 400);
    }

    const body = await req.json();
    const parsed = roleSchema.safeParse(body);
    if (!parsed.success) {
      return fail("Invalid role. Must be 'user' or 'admin'", 400);
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return fail("User not found", 404);

    const user = await prisma.user.update({
      where: { id },
      data: { role: parsed.data.role },
    });

    await auditAdminAction(req, payload.userId, payload.email, AUDIT_ACTIONS.ADMIN_CHANGED_USER_ROLE, {
      entityType: "user",
      entityId: id,
      metadata: { targetEmail: target.email, oldRole: target.role, newRole: parsed.data.role },
    });

    return ok({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    console.error("Admin role change error:", err);
    return serverError();
  }
}
