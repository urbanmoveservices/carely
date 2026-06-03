import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";
import { hashPassword, verifyPassword } from "@/lib/password";
import { ok, unauthorized, validationError, fail, serverError } from "@/lib/api-response";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { rateLimited } from "@/lib/api-response";

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return unauthorized();

    const payload = verifyToken(token);
    if (!payload) return unauthorized("Invalid token");

    const rl = checkRateLimit("change-password", payload.userId, RATE_LIMITS.LOGIN);
    if (!rl.allowed) return rateLimited();

    const body = await req.json();
    const parsed = passwordSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0].message);
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) return unauthorized("User not found");

    const valid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
    if (!valid) {
      return fail("Current password is incorrect", 400);
    }

    const newHash = await hashPassword(parsed.data.newPassword);
    await prisma.user.update({
      where: { id: payload.userId },
      data: { passwordHash: newHash },
    });

    await auditUserAction(req, payload.userId, payload.email, AUDIT_ACTIONS.PASSWORD_CHANGED);

    return ok({ message: "Password changed successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    return serverError();
  }
}
