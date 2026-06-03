-- AlterTable
ALTER TABLE "DoctorQuestionSet" ADD COLUMN IF NOT EXISTS "language" TEXT NOT NULL DEFAULT 'en';

-- Deduplicate doctor question sets before unique constraint (keep newest per report)
DELETE FROM "DoctorQuestionSet" a
USING "DoctorQuestionSet" b
WHERE a."reportId" = b."reportId"
  AND (a."language" = b."language" OR (a."language" = 'en' AND b."language" = 'en'))
  AND a."createdAt" < b."createdAt";

-- CreateTable
CREATE TABLE "ReportTranslation" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "keyFindings" JSONB NOT NULL,
    "abnormalValues" JSONB NOT NULL,
    "foodRecommendations" JSONB NOT NULL,
    "exerciseRecommendations" JSONB NOT NULL,
    "lifestyleAdvice" JSONB NOT NULL,
    "riskFlags" JSONB NOT NULL,
    "chartData" JSONB,
    "translatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aiModelUsed" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DoctorQuestionSet_reportId_language_key" ON "DoctorQuestionSet"("reportId", "language");

-- CreateIndex
CREATE INDEX "ReportTranslation_reportId_idx" ON "ReportTranslation"("reportId");

-- CreateIndex
CREATE INDEX "ReportTranslation_language_idx" ON "ReportTranslation"("language");

-- CreateIndex
CREATE UNIQUE INDEX "ReportTranslation_reportId_language_key" ON "ReportTranslation"("reportId", "language");

-- AddForeignKey
ALTER TABLE "ReportTranslation" ADD CONSTRAINT "ReportTranslation_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
