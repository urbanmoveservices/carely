import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {
  isRazorpayEnabled,
  processRazorpayWebhookPayload,
  verifyRazorpayWebhookSignature,
} from "@/lib/billing/razorpay";
import { fail, ok, serverError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  if (!isRazorpayEnabled()) {
    return fail("Razorpay disabled", 503, "RAZORPAY_DISABLED");
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return fail("Invalid webhook payload", 400, "INVALID_PAYLOAD");
  }

  const verified = verifyRazorpayWebhookSignature(rawBody, signature);
  const eventType = String(payload.event || "unknown");
  const eventId =
    payload.id != null ? String(payload.id) : `${eventType}-${Date.now()}`;

  let webhookRecordId: string | null = null;
  try {
    const existing = await prisma.billingWebhookEvent.findUnique({
      where: { eventId },
    });
    if (existing?.processed) {
      return ok({ received: true, duplicate: true });
    }

    const record = await prisma.billingWebhookEvent.create({
      data: {
        provider: "razorpay",
        eventId,
        eventType,
        signature: signature ?? null,
        verified,
        processed: false,
        payload: payload as object,
        error: verified ? null : "signature_invalid",
      },
    });
    webhookRecordId = record.id;
  } catch (err) {
    console.error("[razorpay_webhook] persist event:", err);
  }

  if (!verified) {
    return fail("Webhook signature invalid", 401, "WEBHOOK_SIGNATURE_INVALID");
  }

  try {
    const result = await processRazorpayWebhookPayload(
      payload as Parameters<typeof processRazorpayWebhookPayload>[0]
    );

    if (webhookRecordId) {
      await prisma.billingWebhookEvent.update({
        where: { id: webhookRecordId },
        data: {
          processed: result.processed,
          processedAt: new Date(),
          error: result.reason ?? null,
        },
      });
    }

    return ok({ received: true, ...result });
  } catch (err) {
    console.error("[razorpay_webhook] process:", err);
    if (webhookRecordId) {
      await prisma.billingWebhookEvent.update({
        where: { id: webhookRecordId },
        data: {
          error: err instanceof Error ? err.message : "process_failed",
        },
      });
    }
    return serverError("Webhook processing failed");
  }
}
