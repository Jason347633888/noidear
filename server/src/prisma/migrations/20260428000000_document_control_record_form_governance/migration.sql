ALTER TABLE "number_rules"
  ADD COLUMN IF NOT EXISTS "scope" TEXT NOT NULL DEFAULT 'document',
  ADD COLUMN IF NOT EXISTS "source_folder" TEXT,
  ADD COLUMN IF NOT EXISTS "prefix" TEXT,
  ADD COLUMN IF NOT EXISTS "category_code" TEXT,
  ADD COLUMN IF NOT EXISTS "format" TEXT,
  ADD COLUMN IF NOT EXISTS "sequence_padding" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS "separator" TEXT NOT NULL DEFAULT '-',
  ADD COLUMN IF NOT EXISTS "reset_policy" TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "locked_after_use" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "used_count" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "pending_numbers"
  ADD COLUMN IF NOT EXISTS "scope" TEXT NOT NULL DEFAULT 'document',
  ADD COLUMN IF NOT EXISTS "source_folder" TEXT;

ALTER TABLE "documents"
  ADD COLUMN IF NOT EXISTS "version_no" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "revision_of_id" TEXT,
  ADD COLUMN IF NOT EXISTS "revision_status" TEXT NOT NULL DEFAULT 'current';

ALTER TABLE "record_templates"
  ADD COLUMN IF NOT EXISTS "template_family_id" TEXT,
  ADD COLUMN IF NOT EXISTS "base_code" TEXT,
  ADD COLUMN IF NOT EXISTS "version_status" TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS "supersedes_id" TEXT,
  ADD COLUMN IF NOT EXISTS "effective_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "retired_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "approved_by" TEXT,
  ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMP(3);

UPDATE "record_templates"
SET "base_code" = regexp_replace("code", '-v[0-9]+$', ''),
    "template_family_id" = COALESCE("template_family_id", regexp_replace("code", '-v[0-9]+$', ''))
WHERE "base_code" IS NULL OR "template_family_id" IS NULL;

ALTER TABLE "record_form_landing_entries"
  ADD COLUMN IF NOT EXISTS "landing_status" TEXT NOT NULL DEFAULT 'unimplemented',
  ADD COLUMN IF NOT EXISTS "confirmation_status" TEXT NOT NULL DEFAULT 'unconfirmed',
  ADD COLUMN IF NOT EXISTS "confidence" TEXT,
  ADD COLUMN IF NOT EXISTS "confirmed_by" TEXT,
  ADD COLUMN IF NOT EXISTS "confirmed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "field_coverage_status" TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS "field_coverage_summary" JSONB,
  ADD COLUMN IF NOT EXISTS "primary_route" TEXT,
  ADD COLUMN IF NOT EXISTS "source_form_version" TEXT;

CREATE INDEX IF NOT EXISTS "number_rules_scope_idx" ON "number_rules"("scope");
CREATE INDEX IF NOT EXISTS "number_rules_source_folder_idx" ON "number_rules"("source_folder");
CREATE INDEX IF NOT EXISTS "number_rules_is_active_idx" ON "number_rules"("is_active");
CREATE INDEX IF NOT EXISTS "record_templates_base_code_idx" ON "record_templates"("base_code");
CREATE INDEX IF NOT EXISTS "record_templates_template_family_id_idx" ON "record_templates"("template_family_id");
CREATE INDEX IF NOT EXISTS "record_templates_version_status_idx" ON "record_templates"("version_status");
CREATE INDEX IF NOT EXISTS "record_form_landing_entries_landing_status_idx" ON "record_form_landing_entries"("landing_status");
CREATE INDEX IF NOT EXISTS "record_form_landing_entries_confirmation_status_idx" ON "record_form_landing_entries"("confirmation_status");
CREATE INDEX IF NOT EXISTS "record_form_landing_entries_field_coverage_status_idx" ON "record_form_landing_entries"("field_coverage_status");
