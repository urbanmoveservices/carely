-- ManualLabValue: parser metadata columns (added to schema without migration)
ALTER TABLE "ManualLabValue" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "ManualLabValue" ADD COLUMN IF NOT EXISTS "referenceRange" TEXT;
ALTER TABLE "ManualLabValue" ADD COLUMN IF NOT EXISTS "confidence" DOUBLE PRECISION;
ALTER TABLE "ManualLabValue" ADD COLUMN IF NOT EXISTS "sourceText" TEXT;
ALTER TABLE "ManualLabValue" ADD COLUMN IF NOT EXISTS "sourcePage" INTEGER;

-- HealthRisk: dedupe key for post-report risk cards
ALTER TABLE "HealthRisk" ADD COLUMN IF NOT EXISTS "canonicalRiskKey" TEXT;

CREATE INDEX IF NOT EXISTS "HealthRisk_canonicalRiskKey_idx" ON "HealthRisk"("canonicalRiskKey");

CREATE UNIQUE INDEX IF NOT EXISTS "HealthRisk_userId_reportId_canonicalRiskKey_key"
  ON "HealthRisk"("userId", "reportId", "canonicalRiskKey");

-- Report: AI summary intelligence columns (added to schema without migration)
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "scoreFactors" JSONB;
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "valueParserVersion" TEXT;
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "summaryValidationStatus" TEXT;
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "repairedAt" TIMESTAMP(3);
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "usesStructuredValues" BOOLEAN NOT NULL DEFAULT false;
