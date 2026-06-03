import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { signToken } from "@/lib/jwt";
import { ok, validationError, unauthorized, fail, forbidden, serverError, rateLimited } from "@/lib/api-response";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { auditAdminAction, AUDIT_ACTIONS } from "@/lib/audit-log";

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = checkRateLimit("admin-login", ip, RATE_LIMITS.ADMIN_LOGIN);
    if (!rl.allowed) return rateLimited();

    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(parsed.error.issues[0].message);
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return unauthorized("Invalid credentials");
    }

    if (!user.isActive) {
      return fail("Account is disabled. Please contact support.", 403);
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return unauthorized("Invalid credentials");
    }

    if (user.role !== "admin") {
      return forbidden("Admin access required");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    await auditAdminAction(req, user.id, user.email, AUDIT_ACTIONS.ADMIN_LOGIN);

    return ok({
      access_token: token,
      token_type: "bearer",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Admin login error:", err);
    return serverError();
  }
}
