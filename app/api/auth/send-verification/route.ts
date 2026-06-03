import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/family-auth";
import { createAuthToken, invalidateAuthTokens } from "@/lib/auth-tokens";
import { getBaseUrlFromRequest } from "@/lib/url";
import { ok, fail, serverError } from "@/lib/api-response";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";
import { sendEmail } from "@/lib/email/send-email";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const user = await prisma.user.findUnique({
      where: { id: auth.payload.userId },
    });
    if (!user) return fail("User not found", 404);
    if (user.emailVerified) {
      return ok({ message: "Email already verified.", alreadyVerified: true });
    }

    await invalidateAuthTokens(user.id, "email_verification");
    const token = await createAuthToken(user.id, "email_verification", 24 * 60);
    const base = getBaseUrlFromRequest(req);
    const verificationUrl = `${base}/verify-email/${token}`;

    await auditUserAction(
      req,
      user.id,
      user.email,
      AUDIT_ACTIONS.EMAIL_VERIFICATION_SENT,
      { metadata: { tokenType: "email_verification" } }
    );

    await sendEmail({
      to: user.email,
      type: "email_verification",
      data: { link: verificationUrl },
      userId: user.id,
    });

    const isDev =
      process.env.NODE_ENV !== "production" ||
      process.env.MOCK_AI_MODE === "true";

    return ok({
      message: "Verification link generated.",
      ...(isDev ? { verificationUrl } : {}),
    });
  } catch (err) {
    console.error("Send verification error:", err);
    return serverError();
  }
}
