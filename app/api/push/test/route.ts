import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/family-auth";
import { ok, serverError } from "@/lib/api-response";
import { sendPushToUser } from "@/lib/push/send-push";
import { isPushConfigured } from "@/lib/env";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const result = await sendPushToUser(auth.payload.userId, {
      title: "Vaidya GPT test",
      body: "Push notifications are working.",
      url: "/dashboard",
    });

    return ok({
      ...result,
      configured: isPushConfigured(),
    });
  } catch (err) {
    console.error("Push test error:", err);
    return serverError();
  }
}
