import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/family-auth";
import { serverError, validationError } from "@/lib/api-response";
import { auditUserAction, AUDIT_ACTIONS } from "@/lib/audit-log";
import { isSupportedLanguage } from "@/lib/i18n/languages";

const patchSchema = z.object({
  seniorMode: z.boolean().optional(),
  language: z.string().max(10).optional(),
  fontScale: z.enum(["normal", "large", "extra_large"]).optional(),
  highContrast: z.boolean().optional(),
  reduceMotion: z.boolean().optional(),
  allowCloudTranslation: z.boolean().optional(),
});

const defaults = {
  seniorMode: false,
  language: "en",
  fontScale: "normal" as const,
  highContrast: false,
  reduceMotion: false,
  allowCloudTranslation: false,
};

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    let pref = await prisma.userPreference.findUnique({
      where: { userId: auth.payload.userId },
    });

    if (!pref) {
      pref = await prisma.userPreference.create({
        data: { userId: auth.payload.userId },
      });
    }

    return NextResponse.json({
      seniorMode: pref.seniorMode,
      language: pref.language,
      fontScale: pref.fontScale,
      highContrast: pref.highContrast,
      reduceMotion: pref.reduceMotion,
      allowCloudTranslation: pref.allowCloudTranslation,
    });
  } catch (err) {
    console.error("Preferences get error:", err);
    return serverError();
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error.issues[0]?.message || "Invalid input");

    if (
      parsed.data.language !== undefined &&
      !isSupportedLanguage(parsed.data.language)
    ) {
      return validationError("Unsupported language");
    }

    const pref = await prisma.userPreference.upsert({
      where: { userId: auth.payload.userId },
      create: { userId: auth.payload.userId, ...parsed.data },
      update: parsed.data,
    });

    await auditUserAction(req, auth.payload.userId, auth.payload.email, AUDIT_ACTIONS.USER_PREFERENCES_UPDATED, {
      metadata: {
        seniorMode: pref.seniorMode,
        fontScale: pref.fontScale,
        highContrast: pref.highContrast,
      },
    });

    return NextResponse.json({
      seniorMode: pref.seniorMode,
      language: pref.language,
      fontScale: pref.fontScale,
      highContrast: pref.highContrast,
      reduceMotion: pref.reduceMotion,
      allowCloudTranslation: pref.allowCloudTranslation,
    });
  } catch (err) {
    console.error("Preferences patch error:", err);
    return serverError();
  }
}
