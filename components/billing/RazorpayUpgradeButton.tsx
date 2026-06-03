"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api-client";
import { loadRazorpayScript } from "@/lib/billing/razorpay-checkout";

type RazorpayHandlerResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayCheckoutInstance = {
  open: () => void;
  on: (event: string, handler: (response?: RazorpayFailedResponse) => void) => void;
};

type RazorpayFailedResponse = {
  error?: {
    description?: string;
    reason?: string;
    code?: string;
  };
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayCheckoutInstance;
  }
}

type Props = {
  plan: "pro" | "family";
  label?: string;
  /** Parent-controlled disable (current plan, not configured, etc.) */
  disabled?: boolean;
  disabledReason?: string;
  userName?: string;
  userEmail?: string;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
};

function isErrorStatus(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("failed") ||
    lower.includes("cancelled") ||
    lower.includes("could not") ||
    lower.includes("not supported") ||
    lower.includes("error") ||
    lower.includes("invalid")
  );
}

function verifyErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    const lower = err.message.toLowerCase();
    if (
      lower.includes("signature") ||
      lower.includes("verify") ||
      lower.includes("verification")
    ) {
      return "Payment verification failed.";
    }
    return err.message;
  }
  return "Payment verification failed.";
}

export function RazorpayUpgradeButton({
  plan,
  label = "Upgrade with Razorpay",
  disabled = false,
  disabledReason,
  userName,
  userEmail,
  onSuccess,
  onError,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const finish = useCallback(
    (message: string, isError: boolean) => {
      setStatus(message);
      setLoading(false);
      if (isError) onError?.(message);
    },
    [onError]
  );

  const startCheckout = useCallback(async () => {
    if (disabled || loading) return;

    setLoading(true);
    setStatus("Creating payment order…");
    onError?.("");

    try {
      const order = await api.createRazorpayOrder(plan);

      const scriptOk = await loadRazorpayScript();
      if (!scriptOk || !window.Razorpay) {
        finish(
          "Could not load Razorpay Checkout. Please check CSP/network settings.",
          true
        );
        return;
      }

      setStatus("Opening Razorpay…");

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Vaidya GPT",
        description: `${plan === "pro" ? "Pro" : "Family"} plan`,
        order_id: order.orderId,
        prefill: {
          name: order.prefill?.name || userName || "",
          email: order.prefill?.email || userEmail || "",
          contact: order.prefill?.contact || "",
        },
        theme: { color: "#0d9488" },
        handler: async (response: RazorpayHandlerResponse) => {
          setStatus("Verifying payment…");
          setLoading(true);
          try {
            const verified = await api.verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setStatus(verified.message);
            setLoading(false);
            onSuccess?.(verified.message);
          } catch (e) {
            finish(verifyErrorMessage(e), true);
          }
        },
        modal: {
          ondismiss: () => {
            finish("Payment was cancelled.", true);
          },
        },
      });

      rzp.on("payment.failed", (response) => {
        const detail =
          response?.error?.description ||
          response?.error?.reason ||
          "Payment failed. Please try again.";
        finish(detail, true);
      });

      try {
        rzp.open();
      } catch {
        finish("Could not open Razorpay checkout. Please try again.", true);
      }
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === "BILLING_PROFILE_INCOMPLETE") {
        finish(
          "Please add your phone number before payment. Razorpay requires a valid contact number.",
          true
        );
        router.push("/settings/profile?next=/billing&reason=billing");
        return;
      }
      const msg =
        err instanceof Error
          ? err.message.includes("RAZORPAY") || err.message.includes("configured")
            ? err.message
            : err.message || "Could not start Razorpay checkout."
          : "Could not start Razorpay checkout.";
      finish(msg, true);
    }
  }, [plan, disabled, loading, userName, userEmail, onSuccess, finish, router]);

  const showDevReason =
    process.env.NODE_ENV === "development" && disabled && disabledReason;

  return (
    <div className="space-y-1">
      <Button
        type="button"
        loading={loading}
        disabled={disabled || loading}
        data-disabled-reason={disabledReason || undefined}
        onClick={() => startCheckout()}
      >
        {loading ? "Opening Razorpay…" : label}
      </Button>
      {disabled && disabledReason && (
        <p className="text-xs text-gray-500">{disabledReason}</p>
      )}
      {showDevReason && (
        <p className="text-xs text-gray-400">Disabled reason: {disabledReason}</p>
      )}
      {status && !disabled && (
        <p
          className={`text-xs ${
            isErrorStatus(status) ? "text-red-600" : "text-gray-600"
          }`}
        >
          {status}
        </p>
      )}
    </div>
  );
}
