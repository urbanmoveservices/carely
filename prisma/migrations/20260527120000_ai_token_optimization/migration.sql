-- AlterTable
ALTER TABLE "ChatThread" ADD COLUMN IF NOT EXISTS "summary" TEXT;
ALTER TABLE "ChatThread" ADD COLUMN IF NOT EXISTS "summaryUpdatedAt" TIMESTAMP(3);
ALTER TABLE "ChatThread" ADD COLUMN IF NOT EXISTS "messageCountAtSummary" INTEGER;

-- CreateTable
CREATE TABLE IF NOT EXISTS "AiContextCache" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentId" TEXT,
    "reportId" TEXT,
    "type" TEXT NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "contextJson" JSONB NOT NULL,
    "tokenEstimate" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiContextCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AiResponseCache" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "outputJson" JSONB NOT NULL,
    "model" TEXT,
    "tokensSaved" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiResponseCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AiUsageLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "feature" TEXT NOT NULL,
    "model" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "totalTokens" INTEGER,
    "cached" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'openai',
    "reportId" TEXT,
    "documentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AiContextCache_userId_type_sourceHash_key" ON "AiContextCache"("userId", "type", "sourceHash");
CREATE INDEX IF NOT EXISTS "AiContextCache_userId_idx" ON "AiContextCache"("userId");
CREATE INDEX IF NOT EXISTS "AiContextCache_documentId_idx" ON "AiContextCache"("documentId");
CREATE INDEX IF NOT EXISTS "AiContextCache_reportId_idx" ON "AiContextCache"("reportId");

CREATE UNIQUE INDEX IF NOT EXISTS "AiResponseCache_userId_type_inputHash_key" ON "AiResponseCache"("userId", "type", "inputHash");
CREATE INDEX IF NOT EXISTS "AiResponseCache_userId_idx" ON "AiResponseCache"("userId");
CREATE INDEX IF NOT EXISTS "AiResponseCache_type_idx" ON "AiResponseCache"("type");
CREATE INDEX IF NOT EXISTS "AiResponseCache_expiresAt_idx" ON "AiResponseCache"("expiresAt");

CREATE INDEX IF NOT EXISTS "AiUsageLog_userId_idx" ON "AiUsageLog"("userId");
CREATE INDEX IF NOT EXISTS "AiUsageLog_feature_idx" ON "AiUsageLog"("feature");
CREATE INDEX IF NOT EXISTS "AiUsageLog_createdAt_idx" ON "AiUsageLog"("createdAt");
CREATE INDEX IF NOT EXISTS "AiUsageLog_cached_idx" ON "AiUsageLog"("cached");

-- AddForeignKey
DO $$ BEGIN
 ALTER TABLE "AiContextCache" ADD CONSTRAINT "AiContextCache_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "AiResponseCache" ADD CONSTRAINT "AiResponseCache_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "AiUsageLog" ADD CONSTRAINT "AiUsageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
