import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/family-auth";
import { ok, serverError, validationError, rateLimited } from "@/lib/api-response";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import {
  getOrCreateEmailPreference,
  serializeEmailPreference,
  updateEmailPreference,
} from "@/lib/email/preferences";

const patchSchema = z.object({
  lifecycleEnabled: z.boolean().optional(),
  marketingEnabled: z.boolean().optional(),
  newsletterEnabled: z.boolean().optional(),
  productUpdatesEnabled: z.boolean().optional(),
  reminderEmailsEnabled: z.boolean().optional(),
  reportEmailsEnabled: z.boolean().optional(),
  billingEmailsEnabled: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const pref = await getOrCreateEmailPreference(auth.payload.userId);
    return ok({ preferences: serializeEmailPreference(pref) });
  } catch (err) {
    console.error("Email preferences GET:", err);
    return serverError();
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const rl = checkRateLimit(
      "email_prefs",
      auth.payload.userId,
      RATE_LIMITS.EMAIL_PREFERENCES
    );
    if (!rl.allowed) return rateLimited();

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0]?.message || "Invalid preferences");
    }
    const updated = await updateEmailPreference(auth.payload.userId, parsed.data);
    return ok({ preferences: serializeEmailPreference(updated) });
  } catch (err) {
    console.error("Email preferences PATCH:", err);
    return serverError();
  }
}
