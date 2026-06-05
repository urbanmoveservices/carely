import { NextRequest, NextResponse } from "next/server";
import { applyUnsubscribe } from "@/lib/email/unsubscribe";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const rl = checkRateLimit("email_unsub_1click", getClientIp(req), RATE_LIMITS.EMAIL_UNSUBSCRIBE);
  if (!rl.allowed) {
    return NextResponse.json({ success: false }, { status: 429 });
  }

  const token =
    req.nextUrl.searchParams.get("token") ||
    (await req.json().catch(() => ({}))).token;
  if (!token || typeof token !== "string") {
    return NextResponse.json({ success: false }, { status: 400 });
  }
  const result = await applyUnsubscribe({
    token,
    scope: "marketing",
  });
  return NextResponse.json({ success: result.ok });
}
