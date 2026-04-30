-- Product process change adapter: plan + execution audit + source links on master data.

-- Source-link columns on existing master tables.
ALTER TABLE "recipes"
  ADD COLUMN IF NOT EXISTS "changeEventId" TEXT;

ALTER TABLE "process_steps"
  ADD COLUMN IF NOT EXISTS "changeEventId" TEXT;

CREATE INDEX IF NOT EXISTS "recipes_changeEventId_idx" ON "recipes"("changeEventId");
CREATE INDEX IF NOT EXISTS "process_steps_changeEventId_idx" ON "process_steps"("changeEventId");

-- product_process_change_plans
CREATE TABLE IF NOT EXISTS "product_process_change_plans" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "changeEventId" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "scopes" JSONB NOT NULL,
  "baseRecipeId" TEXT,
  "baseRecipeVersion" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "payloadJson" JSONB NOT NULL,
  "validationResult" JSONB,
  "executionError" TEXT,
  "lockedAt" TIMESTAMP(3),
  "executedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "product_process_change_plans_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "product_process_change_plans_changeEventId_key"
  ON "product_process_change_plans"("changeEventId");
CREATE INDEX IF NOT EXISTS "product_process_change_plans_product_id_status_idx"
  ON "product_process_change_plans"("product_id", "status");

-- change_event_executions
CREATE TABLE IF NOT EXISTS "change_event_executions" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "changeEventId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "executedAt" TIMESTAMP(3),
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "change_event_executions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "change_event_executions_changeEventId_key"
  ON "change_event_executions"("changeEventId");

-- change_event_execution_artifacts
CREATE TABLE IF NOT EXISTS "change_event_execution_artifacts" (
  "id" TEXT NOT NULL,
  "executionId" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "beforeSnapshot" JSONB,
  "afterSnapshot" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "change_event_execution_artifacts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "change_event_execution_artifacts_resourceType_resourceId_idx"
  ON "change_event_execution_artifacts"("resourceType", "resourceId");

-- Foreign keys
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_process_change_plans_changeEventId_fkey') THEN
    ALTER TABLE "product_process_change_plans"
      ADD CONSTRAINT "product_process_change_plans_changeEventId_fkey"
      FOREIGN KEY ("changeEventId") REFERENCES "ChangeEvent"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_process_change_plans_product_id_fkey') THEN
    ALTER TABLE "product_process_change_plans"
      ADD CONSTRAINT "product_process_change_plans_product_id_fkey"
      FOREIGN KEY ("product_id") REFERENCES "products"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'change_event_executions_changeEventId_fkey') THEN
    ALTER TABLE "change_event_executions"
      ADD CONSTRAINT "change_event_executions_changeEventId_fkey"
      FOREIGN KEY ("changeEventId") REFERENCES "ChangeEvent"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'change_event_execution_artifacts_executionId_fkey') THEN
    ALTER TABLE "change_event_execution_artifacts"
      ADD CONSTRAINT "change_event_execution_artifacts_executionId_fkey"
      FOREIGN KEY ("executionId") REFERENCES "change_event_executions"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;
