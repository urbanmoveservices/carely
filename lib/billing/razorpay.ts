import crypto from "crypto";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { normalizePlanKey, type PlanKey } from "@/lib/plans";
import {
  getPaidPlanAmountPaise,
  getPaidPlanBilling,
  isPaidPlanKey,
  type PaidPlanKey,
} from "@/lib/billing/plan-billing";
import { getAppUrl } from "@/lib/app-url";

const RAZORPAY_API = "https://api.razorpay.com/v1";

export function isRazorpayEnabled(): boolean {
  return process.env.RAZORPAY_ENABLED === "true";
}

export type RazorpayKeyMode = "test" | "live" | "unknown";

export function getRazorpayKeyMode(keyId: string | null | undefined): RazorpayKeyMode {
  if (!keyId) return "unknown";
  if (keyId.startsWith("rzp_test_")) return "test";
  if (keyId.startsWith("rzp_live_")) return "live";
  return "unknown";
}

/** Key passed to Checkout — must match credentials used to create orders (runtime RAZORPAY_KEY_ID). */
export function getRazorpayCheckoutKeyId(): string | null {
  return process.env.RAZORPAY_KEY_ID?.trim() || null;
}

export function getRazorpayPublicKeyId(): string | null {
  return getRazorpayCheckoutKeyId();
}

export function getRazorpayKeyAlignment(): {
  ok: boolean;
  mode: RazorpayKeyMode;
  message?: string;
} {
  const serverKey = process.env.RAZORPAY_KEY_ID?.trim();
  const publicKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim();
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim();

  if (!serverKey || !secret) {
    return { ok: false, mode: "unknown", message: "Razorpay keys are incomplete." };
  }

  const serverMode = getRazorpayKeyMode(serverKey);

  if (publicKey && publicKey !== serverKey) {
    return {
      ok: false,
      mode: serverMode,
      message:
        "NEXT_PUBLIC_RAZORPAY_KEY_ID must equal RAZORPAY_KEY_ID. After changing keys, set both in .env and run npm run build, then pm2 restart.",
    };
  }

  if (publicKey && getRazorpayKeyMode(publicKey) !== serverMode) {
    return {
      ok: false,
      mode: serverMode,
      message: "Razorpay test/live mode mismatch between server and public keys.",
    };
  }

  return { ok: true, mode: serverMode };
}

export function isRazorpayConfigured(): boolean {
  if (!isRazorpayEnabled()) return false;
  const alignment = getRazorpayKeyAlignment();
  return alignment.ok && Boolean(getRazorpayCheckoutKeyId());
}

function getRazorpayCredentials(): { keyId: string; keySecret: string } {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials are not configured");
  }
  return { keyId, keySecret };
}

function basicAuthHeader(): string {
  const { keyId, keySecret } = getRazorpayCredentials();
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

export function getPlanExpiryDate(durationDays: number, from = new Date()): Date {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() + durationDays);
  return d;
}

export function verifyRazorpayPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!secret || !params.signature?.trim()) return false;
  const body = `${params.orderId}|${params.paymentId}`;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(params.signature.trim(), "utf8");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string | null
): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(signature, "utf8");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function safeAppUrlForNotes(): string | undefined {
  try {
    return getAppUrl();
  } catch {
    const url =
      process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      process.env.APP_URL?.trim() ||
      process.env.PUBLIC_APP_URL?.trim();
    return url || undefined;
  }
}

export async function createRazorpayOrder(params: {
  userId: string;
  plan: PaidPlanKey;
  email?: string;
}): Promise<{
  providerOrderId: string;
  amountPaise: number;
  currency: string;
  receipt: string;
  paymentOrderId: string;
  keyId: string;
  plan: PaidPlanKey;
}> {
  const billing = getPaidPlanBilling(params.plan);
  if (!billing) {
    throw new Error("Invalid paid plan");
  }

  if (billing.amountPaise < 100) {
    throw new Error("AMOUNT_TOO_LOW");
  }

  const receipt = `vaidya-${params.userId.slice(0, 8)}-${Date.now()}`;
  const currency = process.env.RAZORPAY_CURRENCY?.trim() || "INR";
  const appUrlNote = safeAppUrlForNotes();

  const res = await fetch(`${RAZORPAY_API}/orders`, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: billing.amountPaise,
      currency,
      receipt,
      notes: {
        userId: params.userId,
        plan: params.plan,
        ...(appUrlNote ? { appUrl: appUrlNote } : {}),
      },
    }),
  });

  const data = (await res.json()) as {
    id?: string;
    amount?: number;
    currency?: string;
    error?: { description?: string; code?: string };
  };

  if (res.status === 401) {
    throw new Error("RAZORPAY_AUTH_FAILED");
  }

  if (!res.ok || !data.id) {
    const detail =
      data.error?.description || data.error?.code || `HTTP ${res.status}`;
    throw new Error(`RAZORPAY_API:${detail}`);
  }

  if (data.amount !== billing.amountPaise) {
    throw new Error("Razorpay order amount mismatch");
  }

  const order = await prisma.paymentOrder.create({
    data: {
      userId: params.userId,
      plan: params.plan,
      provider: "razorpay",
      providerOrderId: data.id,
      amountPaise: billing.amountPaise,
      currency: data.currency || currency,
      status: "created",
      receipt,
      notes: { email: params.email ?? null },
    },
  });

  const checkoutKeyId = getRazorpayCheckoutKeyId();
  if (!checkoutKeyId) {
    throw new Error("RAZORPAY_KEY_ID missing");
  }

  const alignment = getRazorpayKeyAlignment();
  if (!alignment.ok) {
    throw new Error(`RAZORPAY_KEY_MISMATCH:${alignment.message || "Key mismatch"}`);
  }

  return {
    providerOrderId: data.id,
    amountPaise: billing.amountPaise,
    currency: order.currency,
    receipt,
    paymentOrderId: order.id,
    keyId: checkoutKeyId,
    plan: params.plan,
  };
}

export async function activatePaidPlan(params: {
  userId: string;
  plan: PaidPlanKey;
  provider: string;
  providerPaymentId?: string;
}): Promise<{ plan: PlanKey; expiresAt: Date | null }> {
  const billing = getPaidPlanBilling(params.plan);
  if (!billing) {
    throw new Error("Invalid plan for activation");
  }

  const now = new Date();
  const expiresAt = getPlanExpiryDate(billing.durationDays, now);

  await prisma.user.update({
    where: { id: params.userId },
    data: {
      currentPlan: params.plan,
      subscriptionStatus: "active",
      subscriptionStartedAt: now,
      subscriptionEndsAt: expiresAt,
      billingProvider: params.provider,
      billingCustomerId: params.providerPaymentId ?? undefined,
    },
  });

  return { plan: normalizePlanKey(params.plan), expiresAt };
}

async function markOrderPaid(params: {
  userId: string;
  paymentOrderId: string;
  providerOrderId: string;
  providerPaymentId: string;
  providerSignature?: string | null;
  amountPaise: number;
  currency: string;
  method?: string;
  email?: string;
  contact?: string;
  rawPayload?: Prisma.InputJsonValue;
  skipSignatureCheck?: boolean;
  signature?: string;
}): Promise<{ alreadyVerified: boolean; plan: PlanKey; expiresAt: string | null }> {
  const existingTx = await prisma.paymentTransaction.findUnique({
    where: { providerPaymentId: params.providerPaymentId },
    include: { paymentOrder: true },
  });

  if (existingTx?.verified && existingTx.userId === params.userId) {
    const user = await prisma.user.findUnique({ where: { id: params.userId } });
    return {
      alreadyVerified: true,
      plan: normalizePlanKey(user?.currentPlan),
      expiresAt: user?.subscriptionEndsAt?.toISOString() ?? null,
    };
  }

  const paymentOrder = await prisma.paymentOrder.findUnique({
    where: { id: params.paymentOrderId },
  });

  if (
    !paymentOrder ||
    paymentOrder.userId !== params.userId ||
    paymentOrder.providerOrderId !== params.providerOrderId
  ) {
    throw new Error("PAYMENT_ORDER_NOT_FOUND");
  }

  if (!isPaidPlanKey(paymentOrder.plan)) {
    throw new Error("INVALID_PLAN");
  }

  const expectedAmount = getPaidPlanAmountPaise(paymentOrder.plan);
  if (expectedAmount == null || paymentOrder.amountPaise !== expectedAmount) {
    throw new Error("PAYMENT_AMOUNT_MISMATCH");
  }

  if (paymentOrder.amountPaise !== params.amountPaise) {
    throw new Error("PAYMENT_AMOUNT_MISMATCH");
  }

  if (!params.skipSignatureCheck) {
    if (
      !params.signature ||
      !verifyRazorpayPaymentSignature({
        orderId: params.providerOrderId,
        paymentId: params.providerPaymentId,
        signature: params.signature,
      })
    ) {
      throw new Error("PAYMENT_SIGNATURE_INVALID");
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.paymentTransaction.upsert({
      where: { providerPaymentId: params.providerPaymentId },
      create: {
        userId: params.userId,
        paymentOrderId: paymentOrder.id,
        provider: "razorpay",
        providerOrderId: params.providerOrderId,
        providerPaymentId: params.providerPaymentId,
        providerSignature: params.providerSignature ?? params.signature ?? null,
        amountPaise: paymentOrder.amountPaise,
        currency: params.currency,
        status: "captured",
        method: params.method ?? null,
        email: params.email ?? null,
        contact: params.contact ?? null,
        rawPayload: params.rawPayload,
        verified: true,
      },
      update: {
        verified: true,
        providerSignature: params.providerSignature ?? params.signature ?? null,
        status: "captured",
        rawPayload: params.rawPayload,
      },
    });

    await tx.paymentOrder.update({
      where: { id: paymentOrder.id },
      data: { status: "paid" },
    });
  });

  const activated = await activatePaidPlan({
    userId: params.userId,
    plan: paymentOrder.plan,
    provider: "razorpay",
    providerPaymentId: params.providerPaymentId,
  });

  return {
    alreadyVerified: false,
    plan: activated.plan,
    expiresAt: activated.expiresAt?.toISOString() ?? null,
  };
}

export async function verifyAndActivatePayment(params: {
  userId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  method?: string;
  email?: string;
  contact?: string;
  rawPayload?: Record<string, unknown>;
}): Promise<{
  alreadyVerified: boolean;
  plan: PlanKey;
  expiresAt: string | null;
}> {
  const paymentOrder = await prisma.paymentOrder.findUnique({
    where: { providerOrderId: params.razorpayOrderId },
  });

  if (!paymentOrder || paymentOrder.userId !== params.userId) {
    throw new Error("PAYMENT_ORDER_NOT_FOUND");
  }

  return markOrderPaid({
    userId: params.userId,
    paymentOrderId: paymentOrder.id,
    providerOrderId: params.razorpayOrderId,
    providerPaymentId: params.razorpayPaymentId,
    signature: params.razorpaySignature,
    amountPaise: paymentOrder.amountPaise,
    currency: paymentOrder.currency,
    method: params.method,
    email: params.email,
    contact: params.contact,
    rawPayload: params.rawPayload as Prisma.InputJsonValue,
  });
}

export async function activateFromWebhookPayment(entity: {
  id: string;
  order_id: string;
  amount?: number;
  currency?: string;
  method?: string;
  email?: string;
  contact?: string;
  status?: string;
}): Promise<{ processed: boolean; reason?: string }> {
  if (entity.status && entity.status !== "captured") {
    return { processed: false, reason: "payment_not_captured" };
  }

  const paymentOrder = await prisma.paymentOrder.findUnique({
    where: { providerOrderId: entity.order_id },
  });
  if (!paymentOrder) {
    return { processed: false, reason: "order_not_found" };
  }

  const existing = await prisma.paymentTransaction.findUnique({
    where: { providerPaymentId: entity.id },
  });
  if (existing?.verified) {
    return { processed: true, reason: "already_verified" };
  }

  if (typeof entity.amount === "number" && entity.amount !== paymentOrder.amountPaise) {
    return { processed: false, reason: "amount_mismatch" };
  }

  await markOrderPaid({
    userId: paymentOrder.userId,
    paymentOrderId: paymentOrder.id,
    providerOrderId: entity.order_id,
    providerPaymentId: entity.id,
    amountPaise: paymentOrder.amountPaise,
    currency: paymentOrder.currency,
    method: entity.method,
    email: entity.email,
    contact: entity.contact,
    rawPayload: entity as Prisma.InputJsonValue,
    skipSignatureCheck: true,
  });

  return { processed: true };
}

export async function processRazorpayWebhookPayload(payload: {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        amount?: number;
        currency?: string;
        method?: string;
        email?: string;
        contact?: string;
        status?: string;
      };
    };
  };
}): Promise<{ processed: boolean; reason?: string }> {
  if (payload.event !== "payment.captured") {
    return { processed: false, reason: "event_ignored" };
  }

  const entity = payload.payload?.payment?.entity;
  const paymentId = entity?.id;
  const orderId = entity?.order_id;
  if (!paymentId || !orderId) {
    return { processed: false, reason: "missing_payment_entity" };
  }

  return activateFromWebhookPayment({
    id: paymentId,
    order_id: orderId,
    amount: entity.amount,
    currency: entity.currency,
    method: entity.method,
    email: entity.email,
    contact: entity.contact,
    status: entity.status,
  });
}
