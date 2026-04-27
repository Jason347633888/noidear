-- Add business document links and document renewal todos

ALTER TYPE "TodoType" ADD VALUE IF NOT EXISTS 'document_renewal';

CREATE TABLE IF NOT EXISTS "business_document_links" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "businessType" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "documentKind" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "warningDays" INTEGER NOT NULL DEFAULT 30,
    "status" TEXT NOT NULL DEFAULT 'valid',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_document_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "business_document_links_businessType_businessId_documentKind_documentId_key"
  ON "business_document_links"("businessType", "businessId", "documentKind", "documentId");

CREATE INDEX IF NOT EXISTS "business_document_links_businessType_businessId_idx"
  ON "business_document_links"("businessType", "businessId");

CREATE INDEX IF NOT EXISTS "business_document_links_expiresAt_idx"
  ON "business_document_links"("expiresAt");

CREATE INDEX IF NOT EXISTS "business_document_links_status_idx"
  ON "business_document_links"("status");

CREATE UNIQUE INDEX IF NOT EXISTS "todo_tasks_userId_type_relatedId_key"
  ON "todo_tasks"("userId", "type", "relatedId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'business_document_links_documentId_fkey'
      AND conrelid = 'business_document_links'::regclass
  ) THEN
    ALTER TABLE "business_document_links"
      ADD CONSTRAINT "business_document_links_documentId_fkey"
      FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;
