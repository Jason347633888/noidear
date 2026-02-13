-- P0 Critical Bug Fix: Add Foreign Key Constraints and Fix Data Types
-- Migration created: 2026-02-06
-- This migration:
-- 1. Changes fileSize from BigInt to Int (safe: max size is 2.5MB < 2GB limit)
-- 2. Changes version from Float to Decimal(3,1) (fixes precision issues)
-- 3. Makes Approval.documentId optional (for task approvals)
-- 4. Adds all foreign key constraints with proper onDelete actions

BEGIN;

-- Step 1: Alter column types (safe conversions confirmed by data check)
ALTER TABLE "documents"
  ALTER COLUMN "fileSize" SET DATA TYPE INTEGER,
  ALTER COLUMN "version" SET DATA TYPE DECIMAL(3,1);

ALTER TABLE "document_versions"
  ALTER COLUMN "fileSize" SET DATA TYPE INTEGER,
  ALTER COLUMN "version" SET DATA TYPE DECIMAL(3,1);

ALTER TABLE "templates"
  ALTER COLUMN "version" SET DATA TYPE DECIMAL(3,1);

-- Step 2: Make Approval.documentId optional (for task approvals)
ALTER TABLE "approvals"
  ALTER COLUMN "documentId" DROP NOT NULL;

-- Step 3: Add foreign key constraints

-- User → Department (SetNull: if department deleted, user.departmentId = null)
ALTER TABLE "users"
  ADD CONSTRAINT "users_departmentId_fkey"
  FOREIGN KEY ("departmentId")
  REFERENCES "departments"("id")
  ON DELETE SET NULL;

-- User → User (superior, SetNull: if superior deleted, user.superiorId = null)
ALTER TABLE "users"
  ADD CONSTRAINT "users_superiorId_fkey"
  FOREIGN KEY ("superiorId")
  REFERENCES "users"("id")
  ON DELETE SET NULL;

-- Department → Department (parent, SetNull)
ALTER TABLE "departments"
  ADD CONSTRAINT "departments_parentId_fkey"
  FOREIGN KEY ("parentId")
  REFERENCES "departments"("id")
  ON DELETE SET NULL;

-- NumberRule → Department (Restrict: cannot delete department with number rules)
ALTER TABLE "number_rules"
  ADD CONSTRAINT "number_rules_departmentId_fkey"
  FOREIGN KEY ("departmentId")
  REFERENCES "departments"("id")
  ON DELETE RESTRICT;

-- Document → User (creator, Restrict: cannot delete user who created documents)
ALTER TABLE "documents"
  ADD CONSTRAINT "documents_creatorId_fkey"
  FOREIGN KEY ("creatorId")
  REFERENCES "users"("id")
  ON DELETE RESTRICT;

-- Document → User (approver, SetNull: if approver deleted, document.approverId = null)
ALTER TABLE "documents"
  ADD CONSTRAINT "documents_approverId_fkey"
  FOREIGN KEY ("approverId")
  REFERENCES "users"("id")
  ON DELETE SET NULL;

-- DocumentVersion → Document (Cascade: if document deleted, versions deleted)
ALTER TABLE "document_versions"
  ADD CONSTRAINT "document_versions_documentId_fkey"
  FOREIGN KEY ("documentId")
  REFERENCES "documents"("id")
  ON DELETE CASCADE;

-- DocumentVersion → User (creator, Restrict)
ALTER TABLE "document_versions"
  ADD CONSTRAINT "document_versions_creatorId_fkey"
  FOREIGN KEY ("creatorId")
  REFERENCES "users"("id")
  ON DELETE RESTRICT;

-- Template → User (creator, Restrict)
ALTER TABLE "templates"
  ADD CONSTRAINT "templates_creatorId_fkey"
  FOREIGN KEY ("creatorId")
  REFERENCES "users"("id")
  ON DELETE RESTRICT;

-- Task → Template (Restrict: cannot delete template with tasks)
ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_templateId_fkey"
  FOREIGN KEY ("templateId")
  REFERENCES "templates"("id")
  ON DELETE RESTRICT;

-- Task → Department (Restrict)
ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_departmentId_fkey"
  FOREIGN KEY ("departmentId")
  REFERENCES "departments"("id")
  ON DELETE RESTRICT;

-- Task → User (creator, Restrict)
ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_creatorId_fkey"
  FOREIGN KEY ("creatorId")
  REFERENCES "users"("id")
  ON DELETE RESTRICT;

-- TaskRecord → Task (Cascade: if task deleted, records deleted)
ALTER TABLE "task_records"
  ADD CONSTRAINT "task_records_taskId_fkey"
  FOREIGN KEY ("taskId")
  REFERENCES "tasks"("id")
  ON DELETE CASCADE;

-- TaskRecord → Template (Restrict)
ALTER TABLE "task_records"
  ADD CONSTRAINT "task_records_templateId_fkey"
  FOREIGN KEY ("templateId")
  REFERENCES "templates"("id")
  ON DELETE RESTRICT;

-- TaskRecord → User (submitter, SetNull)
ALTER TABLE "task_records"
  ADD CONSTRAINT "task_records_submitterId_fkey"
  FOREIGN KEY ("submitterId")
  REFERENCES "users"("id")
  ON DELETE SET NULL;

-- TaskRecord → User (approver, SetNull)
ALTER TABLE "task_records"
  ADD CONSTRAINT "task_records_approverId_fkey"
  FOREIGN KEY ("approverId")
  REFERENCES "users"("id")
  ON DELETE SET NULL;

-- Approval → Document (Cascade, optional)
ALTER TABLE "approvals"
  ADD CONSTRAINT "approvals_documentId_fkey"
  FOREIGN KEY ("documentId")
  REFERENCES "documents"("id")
  ON DELETE CASCADE;

-- Approval → TaskRecord (Cascade, optional)
ALTER TABLE "approvals"
  ADD CONSTRAINT "approvals_recordId_fkey"
  FOREIGN KEY ("recordId")
  REFERENCES "task_records"("id")
  ON DELETE CASCADE;

-- Approval → User (approver, Restrict)
ALTER TABLE "approvals"
  ADD CONSTRAINT "approvals_approverId_fkey"
  FOREIGN KEY ("approverId")
  REFERENCES "users"("id")
  ON DELETE RESTRICT;

-- OperationLog → User (Cascade: if user deleted, logs deleted)
ALTER TABLE "operation_logs"
  ADD CONSTRAINT "operation_logs_userId_fkey"
  FOREIGN KEY ("userId")
  REFERENCES "users"("id")
  ON DELETE CASCADE;

-- Notification → User (Cascade: if user deleted, notifications deleted)
ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_userId_fkey"
  FOREIGN KEY ("userId")
  REFERENCES "users"("id")
  ON DELETE CASCADE;

-- Step 4: Add CHECK constraint for Approval (documentId and recordId are mutually exclusive)
ALTER TABLE "approvals"
  ADD CONSTRAINT "check_approval_target"
  CHECK (
    ("documentId" IS NOT NULL AND "recordId" IS NULL) OR
    ("documentId" IS NULL AND "recordId" IS NOT NULL)
  );

COMMIT;
