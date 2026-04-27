-- Phase 2: unified change mainline, form tasks, and record usage linkage.

ALTER TABLE "records"
  ADD COLUMN IF NOT EXISTS "usageType" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceType" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceId" TEXT,
  ADD COLUMN IF NOT EXISTS "changeEventId" TEXT;

ALTER TABLE "document_impact_reviews"
  ADD COLUMN IF NOT EXISTS "changeEventId" TEXT;

CREATE TABLE IF NOT EXISTS "change_event_relations" (
  "id" TEXT NOT NULL,
  "changeEventId" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT,
  "targetRoute" TEXT,
  "targetLabel" TEXT NOT NULL,
  "relationType" TEXT,
  "impactLevel" TEXT NOT NULL DEFAULT 'medium',
  "requiredAction" TEXT,
  "status" TEXT NOT NULL DEFAULT 'open',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "change_event_relations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "change_event_form_tasks" (
  "id" TEXT NOT NULL,
  "changeEventId" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "recordId" TEXT,
  "sourceFormCode" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "required" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "change_event_form_tasks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "records_usageType_idx" ON "records"("usageType");
CREATE INDEX IF NOT EXISTS "records_sourceType_sourceId_idx" ON "records"("sourceType", "sourceId");
CREATE INDEX IF NOT EXISTS "records_changeEventId_idx" ON "records"("changeEventId");
CREATE INDEX IF NOT EXISTS "document_impact_reviews_changeEventId_idx" ON "document_impact_reviews"("changeEventId");
CREATE INDEX IF NOT EXISTS "change_event_relations_changeEventId_idx" ON "change_event_relations"("changeEventId");
CREATE INDEX IF NOT EXISTS "change_event_relations_targetType_targetId_idx" ON "change_event_relations"("targetType", "targetId");
CREATE INDEX IF NOT EXISTS "change_event_relations_status_idx" ON "change_event_relations"("status");
CREATE INDEX IF NOT EXISTS "change_event_form_tasks_changeEventId_idx" ON "change_event_form_tasks"("changeEventId");
CREATE INDEX IF NOT EXISTS "change_event_form_tasks_templateId_idx" ON "change_event_form_tasks"("templateId");
CREATE INDEX IF NOT EXISTS "change_event_form_tasks_recordId_idx" ON "change_event_form_tasks"("recordId");
CREATE INDEX IF NOT EXISTS "change_event_form_tasks_status_idx" ON "change_event_form_tasks"("status");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'change_event_form_tasks_changeEventId_templateId_key') THEN
    ALTER TABLE "change_event_form_tasks"
      ADD CONSTRAINT "change_event_form_tasks_changeEventId_templateId_key"
      UNIQUE ("changeEventId", "templateId");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'records_changeEventId_fkey') THEN
    ALTER TABLE "records"
      ADD CONSTRAINT "records_changeEventId_fkey"
      FOREIGN KEY ("changeEventId") REFERENCES "ChangeEvent"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'document_impact_reviews_changeEventId_fkey') THEN
    ALTER TABLE "document_impact_reviews"
      ADD CONSTRAINT "document_impact_reviews_changeEventId_fkey"
      FOREIGN KEY ("changeEventId") REFERENCES "ChangeEvent"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'change_event_relations_changeEventId_fkey') THEN
    ALTER TABLE "change_event_relations"
      ADD CONSTRAINT "change_event_relations_changeEventId_fkey"
      FOREIGN KEY ("changeEventId") REFERENCES "ChangeEvent"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'change_event_form_tasks_changeEventId_fkey') THEN
    ALTER TABLE "change_event_form_tasks"
      ADD CONSTRAINT "change_event_form_tasks_changeEventId_fkey"
      FOREIGN KEY ("changeEventId") REFERENCES "ChangeEvent"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'change_event_form_tasks_templateId_fkey') THEN
    ALTER TABLE "change_event_form_tasks"
      ADD CONSTRAINT "change_event_form_tasks_templateId_fkey"
      FOREIGN KEY ("templateId") REFERENCES "record_templates"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'change_event_form_tasks_recordId_fkey') THEN
    ALTER TABLE "change_event_form_tasks"
      ADD CONSTRAINT "change_event_form_tasks_recordId_fkey"
      FOREIGN KEY ("recordId") REFERENCES "records"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;
