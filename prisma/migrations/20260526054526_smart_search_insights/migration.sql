-- CreateTable
CREATE TABLE "HealthInsight" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "familyMemberId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "metadata" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HealthInsight_userId_idx" ON "HealthInsight"("userId");

-- CreateIndex
CREATE INDEX "HealthInsight_familyMemberId_idx" ON "HealthInsight"("familyMemberId");

-- CreateIndex
CREATE INDEX "HealthInsight_type_idx" ON "HealthInsight"("type");

-- CreateIndex
CREATE INDEX "HealthInsight_severity_idx" ON "HealthInsight"("severity");

-- CreateIndex
CREATE INDEX "HealthInsight_isRead_idx" ON "HealthInsight"("isRead");

-- CreateIndex
CREATE INDEX "HealthInsight_createdAt_idx" ON "HealthInsight"("createdAt");

-- AddForeignKey
ALTER TABLE "HealthInsight" ADD CONSTRAINT "HealthInsight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthInsight" ADD CONSTRAINT "HealthInsight_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "FamilyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
