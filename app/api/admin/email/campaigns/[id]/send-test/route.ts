import { NextRequest } from "next/server";
import { z } from "zod";
import { verifyToken, getTokenFromHeader } from "@/lib/jwt";
import { ok, unauthorized, forbidden, serverError, validationError, rateLimited } from "@/lib/api-response";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { sendCampaignTest } from "@/lib/email/campaign-service";
import { getSupportEmail } from "@/lib/company";

const schema = z.object({
  email: z.string().email().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return unauthorized();
    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") return forbidden("Admin access required");

    const rl = checkRateLimit(
      "email_campaign_test",
      payload.userId || payload.email,
      RATE_LIMITS.EMAIL_CAMPAIGN_TEST
    );
    if (!rl.allowed) return rateLimited();

    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) return validationError("Invalid email");
    const { id } = await params;
    const testEmail = parsed.data.email || getSupportEmail();
    const result = await sendCampaignTest(id, testEmail);
    return ok({ success: result.ok, logId: result.logId, sentTo: testEmail });
  } catch (err) {
    console.error("Campaign send-test:", err);
    return serverError();
  }
}
