-- AlterTable EmailLog
ALTER TABLE "EmailLog" ADD COLUMN IF NOT EXISTS "fromEmail" TEXT;
ALTER TABLE "EmailLog" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "EmailLog" ADD COLUMN IF NOT EXISTS "templateKey" TEXT;
ALTER TABLE "EmailLog" ADD COLUMN IF NOT EXISTS "providerMessageId" TEXT;
ALTER TABLE "EmailLog" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "EmailLog_templateKey_idx" ON "EmailLog"("templateKey");
CREATE INDEX IF NOT EXISTS "EmailLog_category_idx" ON "EmailLog"("category");
CREATE INDEX IF NOT EXISTS "EmailLog_createdAt_idx" ON "EmailLog"("createdAt");

-- CreateTable EmailPreference
CREATE TABLE IF NOT EXISTS "EmailPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "transactionalEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lifecycleEnabled" BOOLEAN NOT NULL DEFAULT true,
    "marketingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "newsletterEnabled" BOOLEAN NOT NULL DEFAULT false,
    "productUpdatesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "reminderEmailsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reportEmailsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "billingEmailsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "unsubscribedAt" TIMESTAMP(3),
    "unsubscribeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EmailPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EmailPreference_userId_key" ON "EmailPreference"("userId");

-- CreateTable EmailCampaign
CREATE TABLE IF NOT EXISTS "EmailCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "previewText" TEXT,
    "templateKey" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "segment" JSONB,
    "contentJson" JSONB,
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EmailCampaign_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EmailCampaign_status_idx" ON "EmailCampaign"("status");
CREATE INDEX IF NOT EXISTS "EmailCampaign_category_idx" ON "EmailCampaign"("category");
CREATE INDEX IF NOT EXISTS "EmailCampaign_scheduledAt_idx" ON "EmailCampaign"("scheduledAt");

-- CreateTable EmailCampaignRecipient
CREATE TABLE IF NOT EXISTS "EmailCampaignRecipient" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EmailCampaignRecipient_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EmailCampaignRecipient_campaignId_idx" ON "EmailCampaignRecipient"("campaignId");
CREATE INDEX IF NOT EXISTS "EmailCampaignRecipient_userId_idx" ON "EmailCampaignRecipient"("userId");
CREATE INDEX IF NOT EXISTS "EmailCampaignRecipient_email_idx" ON "EmailCampaignRecipient"("email");
CREATE INDEX IF NOT EXISTS "EmailCampaignRecipient_status_idx" ON "EmailCampaignRecipient"("status");

-- CreateTable EmailUnsubscribeToken
CREATE TABLE IF NOT EXISTS "EmailUnsubscribeToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "category" TEXT,
    "expiresAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailUnsubscribeToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EmailUnsubscribeToken_tokenHash_key" ON "EmailUnsubscribeToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "EmailUnsubscribeToken_email_idx" ON "EmailUnsubscribeToken"("email");
CREATE INDEX IF NOT EXISTS "EmailUnsubscribeToken_userId_idx" ON "EmailUnsubscribeToken"("userId");

-- CreateTable EmailAutomationEvent
CREATE TABLE IF NOT EXISTS "EmailAutomationEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailAutomationEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EmailAutomationEvent_userId_idx" ON "EmailAutomationEvent"("userId");
CREATE INDEX IF NOT EXISTS "EmailAutomationEvent_eventType_idx" ON "EmailAutomationEvent"("eventType");
CREATE INDEX IF NOT EXISTS "EmailAutomationEvent_processed_idx" ON "EmailAutomationEvent"("processed");
CREATE INDEX IF NOT EXISTS "EmailAutomationEvent_createdAt_idx" ON "EmailAutomationEvent"("createdAt");

-- AddForeignKey
DO $$ BEGIN
 ALTER TABLE "EmailPreference" ADD CONSTRAINT "EmailPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "EmailCampaignRecipient" ADD CONSTRAINT "EmailCampaignRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "EmailCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "EmailCampaignRecipient" ADD CONSTRAINT "EmailCampaignRecipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "EmailAutomationEvent" ADD CONSTRAINT "EmailAutomationEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
