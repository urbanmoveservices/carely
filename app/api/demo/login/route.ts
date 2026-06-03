import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { signToken } from "@/lib/jwt";
import { DEMO_USER_EMAIL } from "@/lib/user-serialize";
import { serializeUser } from "@/lib/user-serialize";
import { ok, forbidden, serverError } from "@/lib/api-response";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";

function isDemoLoginEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.MOCK_AI_MODE === "true"
  );
}

export async function POST(req: NextRequest) {
  try {
    if (!isDemoLoginEnabled()) {
      return forbidden("Demo login is not available");
    }

    const user = await prisma.user.findUnique({
      where: { email: DEMO_USER_EMAIL },
    });

    if (!user || !user.isActive) {
      return forbidden(
        "Demo user not found. Run npm run demo:seed first."
      );
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    await auditUserAction(req, user.id, user.email, AUDIT_ACTIONS.DEMO_LOGIN);

    return ok({
      access_token: token,
      token_type: "bearer",
      user: serializeUser(user),
    });
  } catch (err) {
    console.error("Demo login error:", err);
    return serverError();
  }
}
