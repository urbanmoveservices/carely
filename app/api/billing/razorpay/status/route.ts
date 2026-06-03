import {
  getRazorpayPublicKeyId,
  isRazorpayConfigured,
  isRazorpayEnabled,
} from "@/lib/billing/razorpay";
import { absoluteUrl } from "@/lib/app-url";
import { ok, serverError } from "@/lib/api-response";

export async function GET() {
  try {
    const enabled = isRazorpayEnabled();
    const configured = isRazorpayConfigured();
    const keyId = getRazorpayPublicKeyId();
    const currency = process.env.RAZORPAY_CURRENCY?.trim() || "INR";

    return ok({
      enabled,
      configured,
      keyIdPresent: Boolean(keyId),
      currency,
      webhookUrl: absoluteUrl("/api/billing/razorpay/webhook"),
      message: configured
        ? undefined
        : enabled
          ? "Razorpay keys are incomplete. Set RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, and NEXT_PUBLIC_RAZORPAY_KEY_ID."
          : "Razorpay payments are not configured.",
    });
  } catch (err) {
    console.error("[razorpay_status]", err);
    return serverError();
  }
}
