-- Migration: Retire Dynamic Form Platform
-- Removes: RecordTemplate, Record, RecordChangeLog, RecordTaskAssignment,
--           RecordTaskInstance, Task, TaskRecord, ChangeEventFormTask,
--           RecordFormLandingEntry
-- Also removes reverse-relation columns from: ProductRecallEvidence, DeviationReport

-- Step 1: Drop tables that depend on Record first (FK constraints)
DROP TABLE IF EXISTS "record_change_logs" CASCADE;
DROP TABLE IF EXISTS "change_event_form_tasks" CASCADE;
DROP TABLE IF EXISTS "record_task_instances" CASCADE;
DROP TABLE IF EXISTS "task_records" CASCADE;
DROP TABLE IF EXISTS "record_form_landing_entries" CASCADE;

-- Step 2: Drop tables that depend on RecordTemplate
DROP TABLE IF EXISTS "records" CASCADE;
DROP TABLE IF EXISTS "record_task_assignments" CASCADE;
DROP TABLE IF EXISTS "tasks" CASCADE;

-- Step 3: Drop RecordTemplate itself
DROP TABLE IF EXISTS "record_templates" CASCADE;

-- Step 4: Remove dynamic-form FK columns from ProductRecallEvidence
ALTER TABLE "product_recall_evidence" DROP COLUMN IF EXISTS "record_id";

-- Step 5: Remove dynamic-form FK columns from DeviationReport
ALTER TABLE "deviation_reports" DROP COLUMN IF EXISTS "record_id";
ALTER TABLE "deviation_reports" DROP COLUMN IF EXISTS "template_id";
