-- Add context to translation cache for OpenAI provider scoping
ALTER TABLE "TranslationCache" ADD COLUMN IF NOT EXISTS "context" TEXT NOT NULL DEFAULT 'general';

-- Drop old unique constraint if present
DROP INDEX IF EXISTS "TranslationCache_sourceHash_targetLanguage_key";

-- New composite unique index
CREATE UNIQUE INDEX IF NOT EXISTS "TranslationCache_sourceHash_targetLanguage_context_key"
  ON "TranslationCache"("sourceHash", "targetLanguage", "context");

CREATE INDEX IF NOT EXISTS "TranslationCache_context_idx" ON "TranslationCache"("context");

-- Default provider label
ALTER TABLE "TranslationCache" ALTER COLUMN "provider" SET DEFAULT 'openai';
