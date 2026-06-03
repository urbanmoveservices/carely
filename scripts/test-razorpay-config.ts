/**
 * Quick Razorpay connectivity check (run on server).
 * Usage: npx tsx scripts/test-razorpay-config.ts
 */
import { isRazorpayConfigured } from "../lib/billing/razorpay";

async function main() {
  console.log("\nRazorpay config check\n");

  console.log("RAZORPAY_ENABLED:", process.env.RAZORPAY_ENABLED);
  console.log("RAZORPAY_KEY_ID set:", Boolean(process.env.RAZORPAY_KEY_ID?.trim()));
  console.log("RAZORPAY_KEY_SECRET set:", Boolean(process.env.RAZORPAY_KEY_SECRET?.trim()));
  console.log(
    "NEXT_PUBLIC_RAZORPAY_KEY_ID set:",
    Boolean(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim())
  );
  console.log("Configured:", isRazorpayConfigured());

  if (!isRazorpayConfigured()) {
    console.error("\nFAIL — set RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, NEXT_PUBLIC_RAZORPAY_KEY_ID in .env");
    process.exit(1);
  }

  const keyId = process.env.RAZORPAY_KEY_ID!.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET!.trim();
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: 100,
      currency: "INR",
      receipt: `test-${Date.now()}`.slice(0, 40),
    }),
  });

  const data = (await res.json()) as { id?: string; error?: { description?: string } };
  if (res.ok && data.id) {
    console.log("\nPASS — test order created:", data.id);
    process.exit(0);
  }

  console.error("\nFAIL — Razorpay API error:", res.status, data.error?.description || data);
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
