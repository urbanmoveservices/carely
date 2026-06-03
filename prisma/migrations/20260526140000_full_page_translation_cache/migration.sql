-- AlterTable
ALTER TABLE "UserPreference" ADD COLUMN IF NOT EXISTS "allowCloudTranslation" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE IF NOT EXISTS "TranslationCache" (
    "id" TEXT NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "sourceLanguage" TEXT NOT NULL DEFAULT 'en',
    "targetLanguage" TEXT NOT NULL,
    "sourceText" TEXT NOT NULL,
    "translatedText" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TranslationCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TranslationCache_sourceHash_targetLanguage_key" ON "TranslationCache"("sourceHash", "targetLanguage");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TranslationCache_targetLanguage_idx" ON "TranslationCache"("targetLanguage");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TranslationCache_sourceHash_idx" ON "TranslationCache"("sourceHash");
