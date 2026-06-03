import {
  getRazorpayCheckoutKeyId,
  getRazorpayKeyAlignment,
  isRazorpayConfigured,
  isRazorpayEnabled,
} from "@/lib/billing/razorpay";
import { absoluteUrl } from "@/lib/app-url";
import { ok, serverError } from "@/lib/api-response";

export async function GET() {
  try {
    const enabled = isRazorpayEnabled();
    const alignment = getRazorpayKeyAlignment();
    const configured = isRazorpayConfigured();
    const keyId = getRazorpayCheckoutKeyId();
    const currency = process.env.RAZORPAY_CURRENCY?.trim() || "INR";

    return ok({
      enabled,
      configured,
      keyIdPresent: Boolean(keyId),
      mode: alignment.mode,
      keyPrefix: keyId ? keyId.slice(0, 12) : null,
      currency,
      webhookUrl: absoluteUrl("/api/billing/razorpay/webhook"),
      message: configured
        ? undefined
        : enabled
          ? alignment.message ||
            "Razorpay keys are incomplete. Set RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, and NEXT_PUBLIC_RAZORPAY_KEY_ID (all must match)."
          : "Razorpay payments are not configured.",
    });
  } catch (err) {
    console.error("[razorpay_status]", err);
    return serverError();
  }
}
