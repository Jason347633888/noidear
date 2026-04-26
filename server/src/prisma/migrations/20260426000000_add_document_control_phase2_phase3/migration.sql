-- Migration: add_document_control_phase2_phase3
-- Phase 2: Document Control Center — controlled file metadata + generalized references + landing index
-- Phase 3: Operations Center — read requirements, training needs, impact reviews, coverage reviews

-- ─── Phase 2: New columns on documents ────────────────────────────────────────

ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "document_type" TEXT;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "source_folder" TEXT;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "owner_department" TEXT;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "owner_user_id" TEXT;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "external_source" TEXT;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "external_expires_at" TIMESTAMP(3);
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "lineage_key" TEXT;

CREATE INDEX IF NOT EXISTS "documents_lineage_key_idx" ON "documents"("lineage_key");

-- ─── Phase 2: Generalize document_references ──────────────────────────────────

ALTER TABLE "document_references" ALTER COLUMN "targetDocId" DROP NOT NULL;
ALTER TABLE "document_references" ADD COLUMN IF NOT EXISTS "targetType" TEXT NOT NULL DEFAULT 'document';
ALTER TABLE "document_references" ADD COLUMN IF NOT EXISTS "targetId" TEXT;
ALTER TABLE "document_references" ADD COLUMN IF NOT EXISTS "targetRoute" TEXT;
ALTER TABLE "document_references" ADD COLUMN IF NOT EXISTS "targetLabel" TEXT;
ALTER TABLE "document_references" ADD COLUMN IF NOT EXISTS "relationType" TEXT NOT NULL DEFAULT 'RELATED_TO';

-- Recreate targetDocId FK with SET NULL (was CASCADE in prior schema)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'document_references_targetDocId_fkey'
      AND conrelid = 'document_references'::regclass
  ) THEN
    ALTER TABLE "document_references" DROP CONSTRAINT "document_references_targetDocId_fkey";
  END IF;
END$$;

ALTER TABLE "document_references"
  ADD CONSTRAINT "document_references_targetDocId_fkey"
  FOREIGN KEY ("targetDocId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop old unique constraint if it exists, create new generalized one
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'document_references_sourceDocId_targetDocId_sectionId_key'
      AND conrelid = 'document_references'::regclass
  ) THEN
    ALTER TABLE "document_references" DROP CONSTRAINT "document_references_sourceDocId_targetDocId_sectionId_key";
  END IF;
END$$;

CREATE UNIQUE INDEX IF NOT EXISTS "document_references_sourceDocId_targetType_targetId_targetRou_key"
  ON "document_references"("sourceDocId", "targetType", "targetId", "targetRoute", "sectionId");

CREATE INDEX IF NOT EXISTS "document_references_targetType_targetId_idx" ON "document_references"("targetType", "targetId");
CREATE INDEX IF NOT EXISTS "document_references_relationType_idx" ON "document_references"("relationType");

-- ─── Phase 2: Record form landing entries ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS "record_form_landing_entries" (
    "id" TEXT NOT NULL,
    "sourceCode" TEXT NOT NULL,
    "targetModule" TEXT,
    "targetModel" TEXT,
    "targetRoute" TEXT,
    "targetTemplateId" TEXT,
    "landingStrategy" TEXT,
    "relatedDocIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "record_form_landing_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "record_form_landing_entries_sourceCode_key" ON "record_form_landing_entries"("sourceCode");
CREATE INDEX IF NOT EXISTS "record_form_landing_entries_targetModule_idx" ON "record_form_landing_entries"("targetModule");
CREATE INDEX IF NOT EXISTS "record_form_landing_entries_targetModel_idx" ON "record_form_landing_entries"("targetModel");
CREATE INDEX IF NOT EXISTS "record_form_landing_entries_landingStrategy_idx" ON "record_form_landing_entries"("landingStrategy");

-- ─── Phase 3: Document read requirements ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS "document_read_requirements" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "scopeType" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,
    "requiredBy" TEXT NOT NULL,
    "requiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3),
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "document_read_requirements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "document_read_requirements_documentId_scopeType_scopeId_status_key"
  ON "document_read_requirements"("documentId", "scopeType", "scopeId", "status");
CREATE INDEX IF NOT EXISTS "document_read_requirements_documentId_idx" ON "document_read_requirements"("documentId");
CREATE INDEX IF NOT EXISTS "document_read_requirements_scopeType_scopeId_idx" ON "document_read_requirements"("scopeType", "scopeId");
CREATE INDEX IF NOT EXISTS "document_read_requirements_status_idx" ON "document_read_requirements"("status");

ALTER TABLE "document_read_requirements" ADD CONSTRAINT "document_read_requirements_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Phase 3: Document training needs ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "document_training_needs" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "targetDepartment" TEXT,
    "targetRole" TEXT,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'suggested',
    "linkedTrainingProjectId" TEXT,
    "dismissedReason" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "document_training_needs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "document_training_needs_documentId_idx" ON "document_training_needs"("documentId");
CREATE INDEX IF NOT EXISTS "document_training_needs_status_idx" ON "document_training_needs"("status");
CREATE INDEX IF NOT EXISTS "document_training_needs_targetDepartment_idx" ON "document_training_needs"("targetDepartment");

ALTER TABLE "document_training_needs" ADD CONSTRAINT "document_training_needs_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Phase 3: Document impact reviews ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "document_impact_reviews" (
    "id" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "summary" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "document_impact_reviews_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "document_impact_reviews_sourceType_sourceId_idx" ON "document_impact_reviews"("sourceType", "sourceId");
CREATE INDEX IF NOT EXISTS "document_impact_reviews_status_idx" ON "document_impact_reviews"("status");

-- ─── Phase 3: Document impact items ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "document_impact_items" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "targetRoute" TEXT,
    "targetLabel" TEXT NOT NULL,
    "relationType" TEXT,
    "impactLevel" TEXT NOT NULL DEFAULT 'medium',
    "suggestedAction" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "document_impact_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "document_impact_items_reviewId_idx" ON "document_impact_items"("reviewId");
CREATE INDEX IF NOT EXISTS "document_impact_items_targetType_targetId_idx" ON "document_impact_items"("targetType", "targetId");
CREATE INDEX IF NOT EXISTS "document_impact_items_status_idx" ON "document_impact_items"("status");

ALTER TABLE "document_impact_items" ADD CONSTRAINT "document_impact_items_reviewId_fkey"
  FOREIGN KEY ("reviewId") REFERENCES "document_impact_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Phase 3: Document coverage reviews ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS "document_coverage_reviews" (
    "id" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "documentId" TEXT NOT NULL,
    "coverageStatus" TEXT NOT NULL,
    "auditPlanId" TEXT,
    "findingId" TEXT,
    "correctiveActionId" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "document_coverage_reviews_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "document_coverage_reviews_documentId_idx" ON "document_coverage_reviews"("documentId");
CREATE INDEX IF NOT EXISTS "document_coverage_reviews_periodStart_periodEnd_idx" ON "document_coverage_reviews"("periodStart", "periodEnd");
CREATE INDEX IF NOT EXISTS "document_coverage_reviews_coverageStatus_idx" ON "document_coverage_reviews"("coverageStatus");

ALTER TABLE "document_coverage_reviews" ADD CONSTRAINT "document_coverage_reviews_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
