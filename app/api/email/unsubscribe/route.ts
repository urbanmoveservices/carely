import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail, serverError, validationError, rateLimited } from "@/lib/api-response";
import { applyUnsubscribe } from "@/lib/email/unsubscribe";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

const schema = z.object({
  token: z.string().min(16),
  scope: z.enum(["marketing", "lifecycle", "all_optional"]),
  reason: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const rl = checkRateLimit("email_unsub", getClientIp(req), RATE_LIMITS.EMAIL_UNSUBSCRIBE);
    if (!rl.allowed) return rateLimited();

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues[0]?.message || "Invalid request");
    }
    const result = await applyUnsubscribe({
      token: parsed.data.token,
      scope: parsed.data.scope,
      reason: parsed.data.reason,
    });
    if (!result.ok) return fail("Invalid or expired unsubscribe link.", 400);
    return ok({ success: true, email: result.email });
  } catch (err) {
    console.error("Unsubscribe error:", err);
    return serverError();
  }
}
