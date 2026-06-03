import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { signToken } from "@/lib/jwt";
import { ok, validationError, unauthorized, fail, serverError, rateLimited } from "@/lib/api-response";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
  shouldBypassAuthRateLimit,
} from "@/lib/rate-limit";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";
import { createAccessLog, accessFromRequest, ACCESS_ACTIONS } from "@/lib/access-log";
import { serializeUser } from "@/lib/user-serialize";

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(parsed.error.issues[0].message);
    }

    const { email, password } = parsed.data;

    if (!shouldBypassAuthRateLimit(email)) {
      const ip = getClientIp(req);
      const rl = checkRateLimit("login", ip, RATE_LIMITS.LOGIN);
      if (!rl.allowed) return rateLimited();
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return unauthorized("Invalid email or password");
    }

    if (!user.isActive) {
      return fail("Account is disabled. Please contact support.", 403);
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return unauthorized("Invalid email or password");
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

    await auditUserAction(req, user.id, user.email, AUDIT_ACTIONS.USER_LOGIN);
    await createAccessLog({
      ...accessFromRequest(req, user.id),
      action: ACCESS_ACTIONS.LOGIN,
    });

    return ok({
      access_token: token,
      token_type: "bearer",
      user: serializeUser(user),
    });
  } catch (err) {
    console.error("Login error:", err);
    return serverError();
  }
}
