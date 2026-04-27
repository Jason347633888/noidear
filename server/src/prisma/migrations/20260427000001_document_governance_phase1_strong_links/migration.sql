-- Phase 1: tighten document-governance weak links without deleting legacy fields.

ALTER TABLE "documents"
  ADD COLUMN IF NOT EXISTS "ownerDepartmentId" TEXT,
  ADD COLUMN IF NOT EXISTS "ownerUserId" TEXT;

UPDATE "record_form_landing_entries" r
SET "targetTemplateId" = NULL
WHERE r."targetTemplateId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "record_templates" t
    WHERE t."id" = r."targetTemplateId"
      AND t."deletedAt" IS NULL
  );

UPDATE "document_training_needs" n
SET "linkedTrainingProjectId" = NULL,
    "status" = CASE WHEN n."status" = 'linked' THEN 'accepted' ELSE n."status" END
WHERE n."linkedTrainingProjectId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "training_projects" p
    WHERE p."id" = n."linkedTrainingProjectId"
  );

CREATE INDEX IF NOT EXISTS "documents_ownerDepartmentId_idx"
  ON "documents"("ownerDepartmentId");

CREATE INDEX IF NOT EXISTS "documents_ownerUserId_idx"
  ON "documents"("ownerUserId");

CREATE INDEX IF NOT EXISTS "record_form_landing_entries_targetTemplateId_idx"
  ON "record_form_landing_entries"("targetTemplateId");

CREATE INDEX IF NOT EXISTS "document_training_needs_linkedTrainingProjectId_idx"
  ON "document_training_needs"("linkedTrainingProjectId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'documents_ownerDepartmentId_fkey'
      AND conrelid = 'documents'::regclass
  ) THEN
    ALTER TABLE "documents"
      ADD CONSTRAINT "documents_ownerDepartmentId_fkey"
      FOREIGN KEY ("ownerDepartmentId") REFERENCES "departments"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'documents_ownerUserId_fkey'
      AND conrelid = 'documents'::regclass
  ) THEN
    ALTER TABLE "documents"
      ADD CONSTRAINT "documents_ownerUserId_fkey"
      FOREIGN KEY ("ownerUserId") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'record_form_landing_entries_targetTemplateId_fkey'
      AND conrelid = 'record_form_landing_entries'::regclass
  ) THEN
    ALTER TABLE "record_form_landing_entries"
      ADD CONSTRAINT "record_form_landing_entries_targetTemplateId_fkey"
      FOREIGN KEY ("targetTemplateId") REFERENCES "record_templates"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'document_training_needs_linkedTrainingProjectId_fkey'
      AND conrelid = 'document_training_needs'::regclass
  ) THEN
    ALTER TABLE "document_training_needs"
      ADD CONSTRAINT "document_training_needs_linkedTrainingProjectId_fkey"
      FOREIGN KEY ("linkedTrainingProjectId") REFERENCES "training_projects"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;
