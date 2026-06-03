import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/family-auth";
import { ok, serverError, validationError } from "@/lib/api-response";
import {
  applyProfileCompletionFlags,
  buildProfileUpdateData,
  serializeUserProfile,
} from "@/lib/profile";
import { profilePatchSchema } from "@/lib/validators/profile";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const user = await prisma.user.findUnique({
      where: { id: auth.payload.userId },
      include: { preference: { select: { language: true } } },
    });
    if (!user) return auth.error;

    return ok(
      serializeUserProfile(user, user.preference?.language ?? user.preferredLanguage)
    );
  } catch (err) {
    console.error("[profile_get]", err);
    return serverError();
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const body = await req.json();
    const parsed = profilePatchSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0]?.message || "Invalid profile data");
    }

    const data = buildProfileUpdateData(parsed.data as Record<string, unknown>);

    let user = await prisma.user.update({
      where: { id: auth.payload.userId },
      data,
      include: { preference: { select: { language: true } } },
    });

    if (parsed.data.preferredLanguage) {
      await prisma.userPreference.upsert({
        where: { userId: auth.payload.userId },
        create: {
          userId: auth.payload.userId,
          language: parsed.data.preferredLanguage,
        },
        update: { language: parsed.data.preferredLanguage },
      });
    }

    await applyProfileCompletionFlags(auth.payload.userId, user);
    user = await prisma.user.findUniqueOrThrow({
      where: { id: auth.payload.userId },
      include: { preference: { select: { language: true } } },
    });

    await auditUserAction(req, auth.payload.userId, auth.payload.email, AUDIT_ACTIONS.PROFILE_UPDATED, {
      metadata: { section: "hospital_profile" },
    });

    return ok(
      serializeUserProfile(user, user.preference?.language ?? user.preferredLanguage)
    );
  } catch (err) {
    console.error("[profile_patch]", err);
    return serverError();
  }
}
