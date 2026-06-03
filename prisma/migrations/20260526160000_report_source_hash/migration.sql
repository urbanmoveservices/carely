-- AlterTable
ALTER TABLE "Report" ADD COLUMN "sourceTextHash" TEXT;
ALTER TABLE "Report" ADD COLUMN "mockGenerated" BOOLEAN NOT NULL DEFAULT false;
