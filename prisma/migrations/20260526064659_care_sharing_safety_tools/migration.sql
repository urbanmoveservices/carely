-- AlterTable
ALTER TABLE "Medication" ADD COLUMN     "instructions" TEXT,
ADD COLUMN     "lastTakenAt" TIMESTAMP(3),
ADD COLUMN     "missedDoseCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "refillDate" TIMESTAMP(3),
ADD COLUMN     "reminderEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reminderTimes" JSONB;

-- CreateTable
CREATE TABLE "MedicationDoseLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "familyMemberId" TEXT NOT NULL,
    "medicationId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "takenAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicationDoseLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorShareLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "recipientName" TEXT,
    "recipientEmail" TEXT,
    "note" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "lastAccessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorShareLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorQuestionSet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "familyMemberId" TEXT,
    "questions" JSONB NOT NULL,
    "summary" TEXT,
    "aiModelUsed" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorQuestionSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabTestReference" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aliases" JSONB,
    "category" TEXT NOT NULL,
    "unit" TEXT,
    "normalMin" DOUBLE PRECISION,
    "normalMax" DOUBLE PRECISION,
    "normalText" TEXT,
    "explanation" TEXT NOT NULL,
    "highMeaning" TEXT,
    "lowMeaning" TEXT,
    "disclaimer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabTestReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SymptomJournalEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "familyMemberId" TEXT,
    "title" TEXT NOT NULL,
    "symptoms" JSONB NOT NULL,
    "severity" INTEGER,
    "mood" TEXT,
    "temperature" DOUBLE PRECISION,
    "notes" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SymptomJournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaregiverInvite" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "invitedEmail" TEXT NOT NULL,
    "invitedName" TEXT,
    "token" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "canViewReports" BOOLEAN NOT NULL DEFAULT true,
    "canViewFamily" BOOLEAN NOT NULL DEFAULT true,
    "canAddNotes" BOOLEAN NOT NULL DEFAULT false,
    "canManageReminders" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaregiverInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaregiverAccess" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "caregiverUserId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "canViewReports" BOOLEAN NOT NULL DEFAULT true,
    "canViewFamily" BOOLEAN NOT NULL DEFAULT true,
    "canAddNotes" BOOLEAN NOT NULL DEFAULT false,
    "canManageReminders" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaregiverAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyHealthCard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "familyMemberId" TEXT,
    "publicToken" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "includeAllergies" BOOLEAN NOT NULL DEFAULT true,
    "includeMedications" BOOLEAN NOT NULL DEFAULT true,
    "includeConditions" BOOLEAN NOT NULL DEFAULT true,
    "includeEmergencyContacts" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmergencyHealthCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seniorMode" BOOLEAN NOT NULL DEFAULT false,
    "language" TEXT NOT NULL DEFAULT 'en',
    "fontScale" TEXT NOT NULL DEFAULT 'normal',
    "highContrast" BOOLEAN NOT NULL DEFAULT false,
    "reduceMotion" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MedicationDoseLog_userId_idx" ON "MedicationDoseLog"("userId");

-- CreateIndex
CREATE INDEX "MedicationDoseLog_familyMemberId_idx" ON "MedicationDoseLog"("familyMemberId");

-- CreateIndex
CREATE INDEX "MedicationDoseLog_medicationId_idx" ON "MedicationDoseLog"("medicationId");

-- CreateIndex
CREATE INDEX "MedicationDoseLog_scheduledAt_idx" ON "MedicationDoseLog"("scheduledAt");

-- CreateIndex
CREATE INDEX "MedicationDoseLog_status_idx" ON "MedicationDoseLog"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorShareLink_token_key" ON "DoctorShareLink"("token");

-- CreateIndex
CREATE INDEX "DoctorShareLink_userId_idx" ON "DoctorShareLink"("userId");

-- CreateIndex
CREATE INDEX "DoctorShareLink_reportId_idx" ON "DoctorShareLink"("reportId");

-- CreateIndex
CREATE INDEX "DoctorShareLink_token_idx" ON "DoctorShareLink"("token");

-- CreateIndex
CREATE INDEX "DoctorShareLink_expiresAt_idx" ON "DoctorShareLink"("expiresAt");

-- CreateIndex
CREATE INDEX "DoctorQuestionSet_userId_idx" ON "DoctorQuestionSet"("userId");

-- CreateIndex
CREATE INDEX "DoctorQuestionSet_reportId_idx" ON "DoctorQuestionSet"("reportId");

-- CreateIndex
CREATE INDEX "DoctorQuestionSet_familyMemberId_idx" ON "DoctorQuestionSet"("familyMemberId");

-- CreateIndex
CREATE INDEX "LabTestReference_name_idx" ON "LabTestReference"("name");

-- CreateIndex
CREATE INDEX "LabTestReference_category_idx" ON "LabTestReference"("category");

-- CreateIndex
CREATE INDEX "SymptomJournalEntry_userId_idx" ON "SymptomJournalEntry"("userId");

-- CreateIndex
CREATE INDEX "SymptomJournalEntry_familyMemberId_idx" ON "SymptomJournalEntry"("familyMemberId");

-- CreateIndex
CREATE INDEX "SymptomJournalEntry_occurredAt_idx" ON "SymptomJournalEntry"("occurredAt");

-- CreateIndex
CREATE INDEX "SymptomJournalEntry_severity_idx" ON "SymptomJournalEntry"("severity");

-- CreateIndex
CREATE UNIQUE INDEX "CaregiverInvite_token_key" ON "CaregiverInvite"("token");

-- CreateIndex
CREATE INDEX "CaregiverInvite_ownerUserId_idx" ON "CaregiverInvite"("ownerUserId");

-- CreateIndex
CREATE INDEX "CaregiverInvite_invitedEmail_idx" ON "CaregiverInvite"("invitedEmail");

-- CreateIndex
CREATE INDEX "CaregiverInvite_token_idx" ON "CaregiverInvite"("token");

-- CreateIndex
CREATE INDEX "CaregiverInvite_status_idx" ON "CaregiverInvite"("status");

-- CreateIndex
CREATE INDEX "CaregiverAccess_ownerUserId_idx" ON "CaregiverAccess"("ownerUserId");

-- CreateIndex
CREATE INDEX "CaregiverAccess_caregiverUserId_idx" ON "CaregiverAccess"("caregiverUserId");

-- CreateIndex
CREATE UNIQUE INDEX "CaregiverAccess_ownerUserId_caregiverUserId_key" ON "CaregiverAccess"("ownerUserId", "caregiverUserId");

-- CreateIndex
CREATE UNIQUE INDEX "EmergencyHealthCard_familyMemberId_key" ON "EmergencyHealthCard"("familyMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "EmergencyHealthCard_publicToken_key" ON "EmergencyHealthCard"("publicToken");

-- CreateIndex
CREATE INDEX "EmergencyHealthCard_userId_idx" ON "EmergencyHealthCard"("userId");

-- CreateIndex
CREATE INDEX "EmergencyHealthCard_familyMemberId_idx" ON "EmergencyHealthCard"("familyMemberId");

-- CreateIndex
CREATE INDEX "EmergencyHealthCard_publicToken_idx" ON "EmergencyHealthCard"("publicToken");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");

-- AddForeignKey
ALTER TABLE "MedicationDoseLog" ADD CONSTRAINT "MedicationDoseLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationDoseLog" ADD CONSTRAINT "MedicationDoseLog_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "FamilyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationDoseLog" ADD CONSTRAINT "MedicationDoseLog_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorShareLink" ADD CONSTRAINT "DoctorShareLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorShareLink" ADD CONSTRAINT "DoctorShareLink_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorQuestionSet" ADD CONSTRAINT "DoctorQuestionSet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorQuestionSet" ADD CONSTRAINT "DoctorQuestionSet_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SymptomJournalEntry" ADD CONSTRAINT "SymptomJournalEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SymptomJournalEntry" ADD CONSTRAINT "SymptomJournalEntry_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "FamilyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaregiverInvite" ADD CONSTRAINT "CaregiverInvite_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaregiverAccess" ADD CONSTRAINT "CaregiverAccess_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaregiverAccess" ADD CONSTRAINT "CaregiverAccess_caregiverUserId_fkey" FOREIGN KEY ("caregiverUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyHealthCard" ADD CONSTRAINT "EmergencyHealthCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyHealthCard" ADD CONSTRAINT "EmergencyHealthCard_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "FamilyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
