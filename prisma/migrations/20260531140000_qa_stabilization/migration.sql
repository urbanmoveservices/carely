-- QA checklist grouping + description
ALTER TABLE "QaChecklistItem" ADD COLUMN IF NOT EXISTS "group" TEXT NOT NULL DEFAULT 'general';
ALTER TABLE "QaChecklistItem" ADD COLUMN IF NOT EXISTS "description" TEXT;

CREATE INDEX IF NOT EXISTS "QaChecklistItem_group_idx" ON "QaChecklistItem"("group");
CREATE INDEX IF NOT EXISTS "QaChecklistItem_status_idx" ON "QaChecklistItem"("status");
