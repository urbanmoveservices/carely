import { fail } from "@/lib/api-response";

export async function POST() {
  return fail(
    "Mock billing has been removed. Use Razorpay checkout.",
    410,
    "MOCK_BILLING_REMOVED"
  );
}
