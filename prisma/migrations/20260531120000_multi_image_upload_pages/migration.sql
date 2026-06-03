-- AlterTable
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "uploadMode" TEXT NOT NULL DEFAULT 'single';
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "pageCount" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "combinedTextLength" INTEGER;

-- CreateTable
CREATE TABLE IF NOT EXISTS "DocumentPage" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "isEncrypted" BOOLEAN NOT NULL DEFAULT false,
    "encryptionIv" TEXT,
    "encryptionTag" TEXT,
    "extractedText" TEXT,
    "ocrStatus" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentPage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DocumentPage_documentId_pageNumber_key" ON "DocumentPage"("documentId", "pageNumber");
CREATE INDEX IF NOT EXISTS "DocumentPage_documentId_idx" ON "DocumentPage"("documentId");
CREATE INDEX IF NOT EXISTS "DocumentPage_userId_idx" ON "DocumentPage"("userId");
CREATE INDEX IF NOT EXISTS "DocumentPage_pageNumber_idx" ON "DocumentPage"("pageNumber");
CREATE INDEX IF NOT EXISTS "DocumentPage_ocrStatus_idx" ON "DocumentPage"("ocrStatus");
CREATE INDEX IF NOT EXISTS "Document_idx_uploadMode" ON "Document"("uploadMode");

DO $$ BEGIN
  ALTER TABLE "DocumentPage" ADD CONSTRAINT "DocumentPage_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "DocumentPage" ADD CONSTRAINT "DocumentPage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
