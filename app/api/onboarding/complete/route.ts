import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/family-auth";
import { ok, serverError } from "@/lib/api-response";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";
import { serializeUser } from "@/lib/user-serialize";

const bodySchema = z
  .object({
    skipped: z.boolean().optional(),
  })
  .optional();

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    let skipped = false;
    try {
      const raw = await req.json();
      const parsed = bodySchema.safeParse(raw);
      if (parsed.success && parsed.data?.skipped === true) {
        skipped = true;
      }
    } catch {
      // empty body is fine
    }

    const user = await prisma.user.update({
      where: { id: auth.payload.userId },
      data: { onboardingCompleted: true },
    });

    await auditUserAction(
      req,
      auth.payload.userId,
      auth.payload.email,
      skipped
        ? AUDIT_ACTIONS.ONBOARDING_SKIPPED
        : AUDIT_ACTIONS.ONBOARDING_COMPLETED,
      { metadata: { skipped } }
    );

    return ok({
      success: true,
      onboardingCompleted: true,
      user: serializeUser(user),
    });
  } catch (err) {
    console.error("Onboarding complete error:", err);
    return serverError();
  }
}
