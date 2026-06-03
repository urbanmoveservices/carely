import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/family-auth";
import { ok } from "@/lib/api-response";

function hasPaymentTransactionDelegate(): boolean {
  const delegate = (
    prisma as {
      paymentTransaction?: { findMany?: unknown };
    }
  ).paymentTransaction;
  return typeof delegate?.findMany === "function";
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  if (!hasPaymentTransactionDelegate()) {
    console.warn(
      "[billing_payments] paymentTransaction delegate missing — run npx prisma generate and restart dev server"
    );
    return ok({
      payments: [],
      warning:
        "Payment history unavailable until Prisma client is regenerated.",
      code: "PAYMENT_SCHEMA_NOT_READY",
    });
  }

  try {
    const transactions = await prisma.paymentTransaction.findMany({
      where: { userId: auth.payload.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        paymentOrder: {
          select: { plan: true, receipt: true, status: true },
        },
      },
    });

    return ok({
      payments: transactions.map((t) => ({
        id: t.id,
        plan: t.paymentOrder.plan,
        amountPaise: t.amountPaise,
        currency: t.currency,
        status: t.status,
        method: t.method,
        verified: t.verified,
        providerPaymentId: t.providerPaymentId,
        createdAt: t.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("[billing_payments]", err);
    return ok({
      payments: [],
      warning: "Payment history could not be loaded.",
      code: "PAYMENT_HISTORY_ERROR",
    });
  }
}
