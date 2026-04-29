ALTER TABLE "number_rules"
  ADD COLUMN IF NOT EXISTS "scope" TEXT NOT NULL DEFAULT 'document',
  ADD COLUMN IF NOT EXISTS "sourceFolder" TEXT,
  ADD COLUMN IF NOT EXISTS "prefix" TEXT,
  ADD COLUMN IF NOT EXISTS "categoryCode" TEXT,
  ADD COLUMN IF NOT EXISTS "format" TEXT,
  ADD COLUMN IF NOT EXISTS "sequencePadding" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS "separator" TEXT NOT NULL DEFAULT '-',
  ADD COLUMN IF NOT EXISTS "resetPolicy" TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "lockedAfterUse" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "usedCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "pending_numbers"
  ADD COLUMN IF NOT EXISTS "scope" TEXT NOT NULL DEFAULT 'document',
  ADD COLUMN IF NOT EXISTS "sourceFolder" TEXT;

ALTER TABLE "documents"
  ADD COLUMN IF NOT EXISTS "versionNo" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "revisionOfId" TEXT,
  ADD COLUMN IF NOT EXISTS "revisionStatus" TEXT NOT NULL DEFAULT 'current';

ALTER TABLE "record_templates"
  ADD COLUMN IF NOT EXISTS "templateFamilyId" TEXT,
  ADD COLUMN IF NOT EXISTS "baseCode" TEXT,
  ADD COLUMN IF NOT EXISTS "versionStatus" TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS "supersedesId" TEXT,
  ADD COLUMN IF NOT EXISTS "effectiveAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "retiredAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "approvedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);

UPDATE "record_templates"
SET "baseCode" = regexp_replace("code", '-v[0-9]+$', ''),
    "templateFamilyId" = COALESCE("templateFamilyId", regexp_replace("code", '-v[0-9]+$', ''))
WHERE "baseCode" IS NULL OR "templateFamilyId" IS NULL;

ALTER TABLE "record_form_landing_entries"
  ADD COLUMN IF NOT EXISTS "landingStatus" TEXT NOT NULL DEFAULT 'unimplemented',
  ADD COLUMN IF NOT EXISTS "confirmationStatus" TEXT NOT NULL DEFAULT 'unconfirmed',
  ADD COLUMN IF NOT EXISTS "confidence" TEXT,
  ADD COLUMN IF NOT EXISTS "confirmedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "confirmedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "fieldCoverageStatus" TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS "fieldCoverageSummary" JSONB,
  ADD COLUMN IF NOT EXISTS "primaryRoute" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceFormVersion" TEXT;

CREATE INDEX IF NOT EXISTS "number_rules_scope_idx" ON "number_rules"("scope");
CREATE INDEX IF NOT EXISTS "number_rules_sourceFolder_idx" ON "number_rules"("sourceFolder");
CREATE INDEX IF NOT EXISTS "number_rules_isActive_idx" ON "number_rules"("isActive");
CREATE INDEX IF NOT EXISTS "record_templates_baseCode_idx" ON "record_templates"("baseCode");
CREATE INDEX IF NOT EXISTS "record_templates_templateFamilyId_idx" ON "record_templates"("templateFamilyId");
CREATE INDEX IF NOT EXISTS "record_templates_versionStatus_idx" ON "record_templates"("versionStatus");
CREATE INDEX IF NOT EXISTS "record_form_landing_entries_landingStatus_idx" ON "record_form_landing_entries"("landingStatus");
CREATE INDEX IF NOT EXISTS "record_form_landing_entries_confirmationStatus_idx" ON "record_form_landing_entries"("confirmationStatus");
CREATE INDEX IF NOT EXISTS "record_form_landing_entries_fieldCoverageStatus_idx" ON "record_form_landing_entries"("fieldCoverageStatus");

CREATE INDEX IF NOT EXISTS "record_form_landing_entries_targetTemplateId_idx" ON "record_form_landing_entries"("targetTemplateId");

-- Drop old unique constraint on number_rules (if it exists)
DROP INDEX IF EXISTS "number_rules_level_departmentId_key";
-- Create new unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "number_rules_scope_level_departmentId_sourceFolder_key" ON "number_rules"("scope", "level", "departmentId", "sourceFolder");

-- Drop old unique constraint on pending_numbers (if it exists)
DROP INDEX IF EXISTS "pending_numbers_level_departmentId_number_key";
-- Create new unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "pending_numbers_scope_level_departmentId_sourceFolder_number_key" ON "pending_numbers"("scope", "level", "departmentId", "sourceFolder", "number");

ALTER TABLE "documents" ADD CONSTRAINT "documents_revisionOfId_fkey"
  FOREIGN KEY ("revisionOfId") REFERENCES "documents"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "record_templates" ADD CONSTRAINT "record_templates_supersedesId_fkey"
  FOREIGN KEY ("supersedesId") REFERENCES "record_templates"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "documents_revisionOfId_idx" ON "documents"("revisionOfId");
CREATE INDEX IF NOT EXISTS "documents_revisionStatus_idx" ON "documents"("revisionStatus");

-- Remove unique constraint on documents.number to allow revision drafts sharing same number
DROP INDEX IF EXISTS "documents_number_key";
CREATE INDEX IF NOT EXISTS "documents_number_idx" ON "documents"("number");

-- Remove unique constraint on record_templates.code to allow versioning
DROP INDEX IF EXISTS "record_templates_code_key";
-- Ensure templateFamilyId + version is unique within a template family
CREATE UNIQUE INDEX IF NOT EXISTS "record_templates_templateFamilyId_version_key" ON "record_templates"("templateFamilyId", "version");

-- Normalize NULL sourceFolder to empty string for reliable unique index behavior
UPDATE "number_rules" SET "sourceFolder" = '' WHERE "sourceFolder" IS NULL;
UPDATE "pending_numbers" SET "sourceFolder" = '' WHERE "sourceFolder" IS NULL;
ALTER TABLE "number_rules" ALTER COLUMN "sourceFolder" SET NOT NULL;
ALTER TABLE "number_rules" ALTER COLUMN "sourceFolder" SET DEFAULT '';
ALTER TABLE "pending_numbers" ALTER COLUMN "sourceFolder" SET NOT NULL;
ALTER TABLE "pending_numbers" ALTER COLUMN "sourceFolder" SET DEFAULT '';
