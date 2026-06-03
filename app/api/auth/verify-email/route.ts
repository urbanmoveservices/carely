import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { consumeAuthToken } from "@/lib/auth-tokens";
import { ok, validationError, fail, serverError } from "@/lib/api-response";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";

const schema = z.object({
  token: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return validationError("Token is required");
    }

    const result = await consumeAuthToken(
      parsed.data.token,
      "email_verification"
    );
    if (!result.ok) {
      return fail(result.error, 400, "INVALID_TOKEN");
    }

    const user = await prisma.user.update({
      where: { id: result.userId },
      data: { emailVerified: true, emailVerifiedAt: new Date() },
    });

    await auditUserAction(
      req,
      user.id,
      user.email,
      AUDIT_ACTIONS.EMAIL_VERIFIED,
      { metadata: { tokenType: "email_verification" } }
    );

    return ok({ success: true, emailVerified: true });
  } catch (err) {
    console.error("Verify email error:", err);
    return serverError();
  }
}
