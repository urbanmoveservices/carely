-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "billingProvider" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "billingCustomerId" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "PaymentOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'razorpay',
    "providerOrderId" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'created',
    "receipt" TEXT,
    "notes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "paymentOrderId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'razorpay',
    "providerOrderId" TEXT NOT NULL,
    "providerPaymentId" TEXT NOT NULL,
    "providerSignature" TEXT,
    "amountPaise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'captured',
    "method" TEXT,
    "email" TEXT,
    "contact" TEXT,
    "rawPayload" JSONB,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "BillingWebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'razorpay',
    "eventId" TEXT,
    "eventType" TEXT NOT NULL,
    "signature" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "payload" JSONB NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "BillingWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentOrder_providerOrderId_key" ON "PaymentOrder"("providerOrderId");
CREATE INDEX IF NOT EXISTS "PaymentOrder_userId_idx" ON "PaymentOrder"("userId");
CREATE INDEX IF NOT EXISTS "PaymentOrder_status_idx" ON "PaymentOrder"("status");
CREATE INDEX IF NOT EXISTS "PaymentOrder_plan_idx" ON "PaymentOrder"("plan");

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentTransaction_providerPaymentId_key" ON "PaymentTransaction"("providerPaymentId");
CREATE INDEX IF NOT EXISTS "PaymentTransaction_userId_idx" ON "PaymentTransaction"("userId");
CREATE INDEX IF NOT EXISTS "PaymentTransaction_paymentOrderId_idx" ON "PaymentTransaction"("paymentOrderId");
CREATE INDEX IF NOT EXISTS "PaymentTransaction_providerOrderId_idx" ON "PaymentTransaction"("providerOrderId");

CREATE UNIQUE INDEX IF NOT EXISTS "BillingWebhookEvent_eventId_key" ON "BillingWebhookEvent"("eventId");
CREATE INDEX IF NOT EXISTS "BillingWebhookEvent_eventType_idx" ON "BillingWebhookEvent"("eventType");
CREATE INDEX IF NOT EXISTS "BillingWebhookEvent_processed_idx" ON "BillingWebhookEvent"("processed");

-- AddForeignKey
DO $$ BEGIN
 ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_paymentOrderId_fkey" FOREIGN KEY ("paymentOrderId") REFERENCES "PaymentOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
