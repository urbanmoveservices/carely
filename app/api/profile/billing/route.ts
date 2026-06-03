import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/family-auth";
import { ok, serverError, validationError } from "@/lib/api-response";
import {
  applyProfileCompletionFlags,
  serializeUserProfile,
} from "@/lib/profile";
import { billingProfilePatchSchema } from "@/lib/validators/profile";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const body = await req.json();
    const parsed = billingProfilePatchSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0]?.message || "Invalid billing profile");
    }

    let user = await prisma.user.update({
      where: { id: auth.payload.userId },
      data: {
        name: parsed.data.fullName,
        phoneNumber: parsed.data.phoneNumber,
      },
      include: { preference: { select: { language: true } } },
    });

    const flags = await applyProfileCompletionFlags(auth.payload.userId, user);

    await auditUserAction(req, auth.payload.userId, auth.payload.email, AUDIT_ACTIONS.PROFILE_UPDATED, {
      metadata: { section: "billing_profile" },
    });

    return ok({
      ...serializeUserProfile(user, user.preference?.language),
      billingProfileCompleted: flags.billingProfileCompleted,
    });
  } catch (err) {
    console.error("[profile_billing_patch]", err);
    return serverError();
  }
}
