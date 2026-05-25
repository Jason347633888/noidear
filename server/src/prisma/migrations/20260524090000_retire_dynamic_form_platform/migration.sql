-- Migration: Retire Dynamic Form Platform
-- Removes: RecordTemplate, Record, RecordChangeLog, RecordTaskAssignment,
--           RecordTaskInstance, Task, TaskRecord, ChangeEventFormTask,
--           RecordFormLandingEntry
-- Also removes reverse-relation columns from: ProductRecallEvidence, DeviationReport

-- Step 1: Clean up orphan approval data (actions → tasks → instances → definitions)
-- resourceType/module values used by the retired dynamic form platform
-- Note: approval_instances has NO "module" column — module lives on approval_definitions.
-- Use LEFT JOIN to capture instances by resourceType OR by their definition's module.

DELETE FROM "approval_actions"
  WHERE "instanceId" IN (
    SELECT i.id FROM "approval_instances" i
    LEFT JOIN "approval_definitions" d ON i."definitionId" = d.id
    WHERE i."resourceType" IN ('record', 'task_record', 'taskRecord')
       OR d."module" IN ('record', 'task')
  );

DELETE FROM "approval_tasks"
  WHERE "instanceId" IN (
    SELECT i.id FROM "approval_instances" i
    LEFT JOIN "approval_definitions" d ON i."definitionId" = d.id
    WHERE i."resourceType" IN ('record', 'task_record', 'taskRecord')
       OR d."module" IN ('record', 'task')
  );

DELETE FROM "approval_instances"
  WHERE id IN (
    SELECT i.id FROM "approval_instances" i
    LEFT JOIN "approval_definitions" d ON i."definitionId" = d.id
    WHERE i."resourceType" IN ('record', 'task_record', 'taskRecord')
       OR d."module" IN ('record', 'task')
  );

DELETE FROM "approval_definitions"
  WHERE "module" IN ('record', 'task');

-- Step 2: Drop tables that depend on Record first (FK constraints)
DROP TABLE IF EXISTS "record_change_logs" CASCADE;
DROP TABLE IF EXISTS "change_event_form_tasks" CASCADE;
DROP TABLE IF EXISTS "record_task_instances" CASCADE;
DROP TABLE IF EXISTS "task_records" CASCADE;
DROP TABLE IF EXISTS "record_form_landing_entries" CASCADE;

-- Step 3: Drop tables that depend on RecordTemplate
DROP TABLE IF EXISTS "records" CASCADE;
DROP TABLE IF EXISTS "record_task_assignments" CASCADE;
DROP TABLE IF EXISTS "tasks" CASCADE;

-- Step 4: Drop RecordTemplate itself
DROP TABLE IF EXISTS "record_templates" CASCADE;

-- Step 5: Remove dynamic-form FK columns from ProductRecallEvidence
-- Note: Prisma camelCase without @map → actual column name is "record_id" (snake_case via @map)
-- ProductRecallEvidence uses @map("product_recall_evidence") and fields use snake_case
ALTER TABLE "product_recall_evidence" DROP COLUMN IF EXISTS "record_id";

-- Step 6: Remove dynamic-form FK columns from DeviationReport
-- DeviationReport.recordId has no @map → actual PostgreSQL column is "recordId" (camelCase)
-- DeviationReport.templateId has no @map → actual PostgreSQL column is "templateId" (camelCase)
ALTER TABLE "deviation_reports" DROP COLUMN IF EXISTS "recordId";
ALTER TABLE "deviation_reports" DROP COLUMN IF EXISTS "templateId";
