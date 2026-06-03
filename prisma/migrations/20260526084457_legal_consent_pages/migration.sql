-- AlterTable
ALTER TABLE "User" ADD COLUMN     "medicalConsentAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "privacyAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3);
