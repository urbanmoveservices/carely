import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";
import { ok, unauthorized, validationError, serverError } from "@/lib/api-response";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
});

export async function PATCH(req: NextRequest) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return unauthorized();

    const payload = verifyToken(token);
    if (!payload) return unauthorized("Invalid token");

    const body = await req.json();
    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0].message);
    }

    const user = await prisma.user.update({
      where: { id: payload.userId },
      data: { name: parsed.data.name },
    });

    await auditUserAction(req, payload.userId, payload.email, AUDIT_ACTIONS.PROFILE_UPDATED, {
      metadata: { newName: parsed.data.name },
    });

    return ok({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    console.error("Profile update error:", err);
    return serverError();
  }
}
