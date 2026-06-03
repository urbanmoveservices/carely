-- CreateTable
CREATE TABLE "ReportContext" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "familyMemberId" TEXT,
    "smokingStatus" TEXT,
    "tobaccoUse" TEXT,
    "alcoholUse" TEXT,
    "physicalActivity" TEXT,
    "sugarIntake" TEXT,
    "foodPreference" TEXT,
    "dietNotes" TEXT,
    "knownConditions" JSONB,
    "allergies" JSONB,
    "currentMedicines" JSONB,
    "familyHistory" JSONB,
    "symptoms" JSONB,
    "sleepQuality" TEXT,
    "stressLevel" TEXT,
    "waterIntake" TEXT,
    "heightCm" DOUBLE PRECISION,
    "weightKg" DOUBLE PRECISION,
    "fastingStatus" TEXT,
    "recentFeverOrInfection" BOOLEAN,
    "supplements" JSONB,
    "pregnancyStatus" TEXT,
    "doctorDiagnosis" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportContext_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Report" ADD COLUMN "contextualInsights" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "ReportContext_documentId_key" ON "ReportContext"("documentId");

-- CreateIndex
CREATE INDEX "ReportContext_userId_idx" ON "ReportContext"("userId");

-- CreateIndex
CREATE INDEX "ReportContext_documentId_idx" ON "ReportContext"("documentId");

-- CreateIndex
CREATE INDEX "ReportContext_familyMemberId_idx" ON "ReportContext"("familyMemberId");

-- AddForeignKey
ALTER TABLE "ReportContext" ADD CONSTRAINT "ReportContext_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportContext" ADD CONSTRAINT "ReportContext_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "FamilyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
