-- AddDocumentArchiveObsoleteFields
-- Add fields for document archiving and obsoleting functionality

ALTER TABLE "documents"
ADD COLUMN IF NOT EXISTS "archiveReason" TEXT,
ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "archivedBy" TEXT,
ADD COLUMN IF NOT EXISTS "obsoleteReason" TEXT,
ADD COLUMN IF NOT EXISTS "obsoletedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "obsoletedBy" TEXT;
