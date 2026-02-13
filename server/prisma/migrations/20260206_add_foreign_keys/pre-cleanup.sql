-- Pre-migration cleanup: Remove orphaned data
-- This ensures foreign key constraints can be applied successfully

BEGIN;

-- Delete orphaned NumberRules (department doesn't exist)
DELETE FROM number_rules
WHERE "departmentId" NOT IN (SELECT id FROM departments);

-- Clean orphaned document approver references
UPDATE documents
SET "approverId" = NULL
WHERE "approverId" IS NOT NULL
  AND "approverId" NOT IN (SELECT id FROM users);

-- Clean orphaned user department references
UPDATE users
SET "departmentId" = NULL
WHERE "departmentId" IS NOT NULL
  AND "departmentId" NOT IN (SELECT id FROM departments);

-- Clean orphaned user superior references
UPDATE users
SET "superiorId" = NULL
WHERE "superiorId" IS NOT NULL
  AND "superiorId" NOT IN (SELECT id FROM users);

COMMIT;
