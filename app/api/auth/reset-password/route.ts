import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { consumeAuthToken } from "@/lib/auth-tokens";
import { ok, validationError, fail, serverError } from "@/lib/api-response";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0]?.message || "Invalid input");
    }

    const result = await consumeAuthToken(
      parsed.data.token,
      "password_reset"
    );
    if (!result.ok) {
      return fail(result.error, 400, "INVALID_TOKEN");
    }

    const user = await prisma.user.findUnique({
      where: { id: result.userId },
    });
    if (!user) return fail("User not found", 404);

    const passwordHash = await hashPassword(parsed.data.password);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    await auditUserAction(
      req,
      user.id,
      user.email,
      AUDIT_ACTIONS.PASSWORD_RESET_COMPLETED,
      { metadata: { tokenType: "password_reset" } }
    );

    return ok({ success: true, message: "Password updated successfully." });
  } catch (err) {
    console.error("Reset password error:", err);
    return serverError();
  }
}
