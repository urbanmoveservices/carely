import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { ok, validationError, serverError } from "@/lib/api-response";
import { createAuthToken } from "@/lib/auth-tokens";
import { getBaseUrlFromRequest } from "@/lib/url";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";
import { sendEmail } from "@/lib/email/send-email";
import { createAccessLog, accessFromRequest, ACCESS_ACTIONS } from "@/lib/access-log";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0]?.message || "Invalid email");
    }

    const email = parsed.data.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    let resetUrl: string | undefined;
    if (user) {
      const token = await createAuthToken(user.id, "password_reset", 30);
      const base = getBaseUrlFromRequest(req);
      resetUrl = `${base}/reset-password/${token}`;
      await auditUserAction(
        req,
        user.id,
        user.email,
        AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED,
        { metadata: { tokenType: "password_reset" } }
      );
      await createAccessLog({
        ...accessFromRequest(req, user.id),
        action: ACCESS_ACTIONS.PASSWORD_RESET,
      });
      await sendEmail({
        to: user.email,
        type: "password_reset",
        data: { link: resetUrl!, name: user.name || "there" },
        userId: user.id,
      });
    }

    const isDev =
      process.env.NODE_ENV !== "production" ||
      process.env.MOCK_AI_MODE === "true";

    return ok({
      message:
        "If an account exists, a reset link has been generated.",
      ...(isDev && resetUrl ? { resetUrl } : {}),
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    return serverError();
  }
}
