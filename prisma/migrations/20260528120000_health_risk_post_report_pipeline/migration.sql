-- AlterTable
ALTER TABLE "FamilyMember" ADD COLUMN "lastReportAt" TIMESTAMP(3),
ADD COLUMN "lastAiSummaryAt" TIMESTAMP(3),
ADD COLUMN "lastRiskLevel" TEXT,
ADD COLUMN "healthScoreLatest" INTEGER;

-- CreateTable
CREATE TABLE "HealthRisk" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "familyMemberId" TEXT,
    "documentId" TEXT,
    "reportId" TEXT,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "evidence" JSONB,
    "suggestedActions" JSONB,
    "source" TEXT NOT NULL DEFAULT 'report',
    "status" TEXT NOT NULL DEFAULT 'active',
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthRisk_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FamilyTimelineEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "familyMemberId" TEXT,
    "documentId" TEXT,
    "reportId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyTimelineEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LabTrendRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "familyMemberId" TEXT,
    "documentId" TEXT,
    "reportId" TEXT,
    "markerName" TEXT NOT NULL,
    "markerKey" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "unit" TEXT,
    "normalMin" DOUBLE PRECISION,
    "normalMax" DOUBLE PRECISION,
    "status" TEXT,
    "measuredAt" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'report',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabTrendRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReminderSuggestion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "familyMemberId" TEXT,
    "documentId" TEXT,
    "reportId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "suggestedDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReminderSuggestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AppNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "href" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HealthRisk_userId_idx" ON "HealthRisk"("userId");
CREATE INDEX "HealthRisk_familyMemberId_idx" ON "HealthRisk"("familyMemberId");
CREATE INDEX "HealthRisk_documentId_idx" ON "HealthRisk"("documentId");
CREATE INDEX "HealthRisk_reportId_idx" ON "HealthRisk"("reportId");
CREATE INDEX "HealthRisk_category_idx" ON "HealthRisk"("category");
CREATE INDEX "HealthRisk_level_idx" ON "HealthRisk"("level");
CREATE INDEX "HealthRisk_status_idx" ON "HealthRisk"("status");
CREATE INDEX "HealthRisk_detectedAt_idx" ON "HealthRisk"("detectedAt");

CREATE INDEX "FamilyTimelineEvent_userId_idx" ON "FamilyTimelineEvent"("userId");
CREATE INDEX "FamilyTimelineEvent_familyMemberId_idx" ON "FamilyTimelineEvent"("familyMemberId");
CREATE INDEX "FamilyTimelineEvent_documentId_idx" ON "FamilyTimelineEvent"("documentId");
CREATE INDEX "FamilyTimelineEvent_reportId_idx" ON "FamilyTimelineEvent"("reportId");
CREATE INDEX "FamilyTimelineEvent_type_idx" ON "FamilyTimelineEvent"("type");
CREATE INDEX "FamilyTimelineEvent_occurredAt_idx" ON "FamilyTimelineEvent"("occurredAt");

CREATE UNIQUE INDEX "LabTrendRecord_reportId_markerKey_key" ON "LabTrendRecord"("reportId", "markerKey");
CREATE INDEX "LabTrendRecord_userId_idx" ON "LabTrendRecord"("userId");
CREATE INDEX "LabTrendRecord_familyMemberId_idx" ON "LabTrendRecord"("familyMemberId");
CREATE INDEX "LabTrendRecord_markerKey_idx" ON "LabTrendRecord"("markerKey");
CREATE INDEX "LabTrendRecord_measuredAt_idx" ON "LabTrendRecord"("measuredAt");
CREATE INDEX "LabTrendRecord_reportId_idx" ON "LabTrendRecord"("reportId");

CREATE INDEX "ReminderSuggestion_userId_idx" ON "ReminderSuggestion"("userId");
CREATE INDEX "ReminderSuggestion_familyMemberId_idx" ON "ReminderSuggestion"("familyMemberId");
CREATE INDEX "ReminderSuggestion_reportId_idx" ON "ReminderSuggestion"("reportId");
CREATE INDEX "ReminderSuggestion_status_idx" ON "ReminderSuggestion"("status");

CREATE INDEX "AppNotification_userId_idx" ON "AppNotification"("userId");
CREATE INDEX "AppNotification_isRead_idx" ON "AppNotification"("isRead");
CREATE INDEX "AppNotification_type_idx" ON "AppNotification"("type");
CREATE INDEX "AppNotification_createdAt_idx" ON "AppNotification"("createdAt");

-- AddForeignKey
ALTER TABLE "HealthRisk" ADD CONSTRAINT "HealthRisk_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HealthRisk" ADD CONSTRAINT "HealthRisk_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "FamilyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HealthRisk" ADD CONSTRAINT "HealthRisk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HealthRisk" ADD CONSTRAINT "HealthRisk_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FamilyTimelineEvent" ADD CONSTRAINT "FamilyTimelineEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FamilyTimelineEvent" ADD CONSTRAINT "FamilyTimelineEvent_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "FamilyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FamilyTimelineEvent" ADD CONSTRAINT "FamilyTimelineEvent_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FamilyTimelineEvent" ADD CONSTRAINT "FamilyTimelineEvent_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LabTrendRecord" ADD CONSTRAINT "LabTrendRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LabTrendRecord" ADD CONSTRAINT "LabTrendRecord_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "FamilyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LabTrendRecord" ADD CONSTRAINT "LabTrendRecord_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LabTrendRecord" ADD CONSTRAINT "LabTrendRecord_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReminderSuggestion" ADD CONSTRAINT "ReminderSuggestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReminderSuggestion" ADD CONSTRAINT "ReminderSuggestion_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "FamilyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReminderSuggestion" ADD CONSTRAINT "ReminderSuggestion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReminderSuggestion" ADD CONSTRAINT "ReminderSuggestion_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AppNotification" ADD CONSTRAINT "AppNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
