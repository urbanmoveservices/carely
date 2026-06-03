#!/bin/bash
# Apply schema columns that exist in prisma/schema.prisma but were missing from migrations.
# Safe to re-run (uses IF NOT EXISTS). Run on VPS from /var/www/carely:
#   bash scripts/hostinger/fix-schema-drift.sh

set -euo pipefail
cd "$(dirname "$0")/../.."

DB="${1:-vaidya_gpt}"

sudo -u postgres psql -d "$DB" <<'EOF'
ALTER TABLE "ManualLabValue" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "ManualLabValue" ADD COLUMN IF NOT EXISTS "referenceRange" TEXT;
ALTER TABLE "ManualLabValue" ADD COLUMN IF NOT EXISTS "confidence" DOUBLE PRECISION;
ALTER TABLE "ManualLabValue" ADD COLUMN IF NOT EXISTS "sourceText" TEXT;
ALTER TABLE "ManualLabValue" ADD COLUMN IF NOT EXISTS "sourcePage" INTEGER;

ALTER TABLE "HealthRisk" ADD COLUMN IF NOT EXISTS "canonicalRiskKey" TEXT;
CREATE INDEX IF NOT EXISTS "HealthRisk_canonicalRiskKey_idx" ON "HealthRisk"("canonicalRiskKey");
CREATE UNIQUE INDEX IF NOT EXISTS "HealthRisk_userId_reportId_canonicalRiskKey_key"
  ON "HealthRisk"("userId", "reportId", "canonicalRiskKey");

ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "scoreFactors" JSONB;
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "valueParserVersion" TEXT;
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "summaryValidationStatus" TEXT;
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "repairedAt" TIMESTAMP(3);
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "usesStructuredValues" BOOLEAN NOT NULL DEFAULT false;
EOF

echo "Schema drift fix applied on database: $DB"
