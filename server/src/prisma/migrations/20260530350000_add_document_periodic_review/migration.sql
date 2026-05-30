-- Phase 15 Task 2: Add document_periodic_reviews table and notes column to document_versions
-- DocumentPeriodicReview stores the reviewer, dueAt, conclusion, opinion for third-level documents.
-- notes column on document_versions captures change rationale per version snapshot.

ALTER TABLE "document_versions"
  ADD COLUMN "notes" TEXT;

CREATE TABLE "document_periodic_reviews" (
  "id"          TEXT NOT NULL,
  "documentId"  TEXT NOT NULL,
  "dueAt"       TIMESTAMP(3) NOT NULL,
  "reviewerId"  TEXT NOT NULL,
  "status"      TEXT NOT NULL DEFAULT 'pending',
  "reviewedAt"  TIMESTAMP(3),
  "conclusion"  TEXT,
  "opinion"     TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,

  CONSTRAINT "document_periodic_reviews_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "document_periodic_reviews"
  ADD CONSTRAINT "document_periodic_reviews_documentId_fkey"
    FOREIGN KEY ("documentId")
    REFERENCES "documents"("id")
    ON DELETE CASCADE;

ALTER TABLE "document_periodic_reviews"
  ADD CONSTRAINT "document_periodic_reviews_reviewerId_fkey"
    FOREIGN KEY ("reviewerId")
    REFERENCES "users"("id")
    ON DELETE RESTRICT;

CREATE INDEX "document_periodic_reviews_documentId_idx"
  ON "document_periodic_reviews"("documentId");

CREATE INDEX "document_periodic_reviews_reviewerId_idx"
  ON "document_periodic_reviews"("reviewerId");

CREATE INDEX "document_periodic_reviews_status_idx"
  ON "document_periodic_reviews"("status");
