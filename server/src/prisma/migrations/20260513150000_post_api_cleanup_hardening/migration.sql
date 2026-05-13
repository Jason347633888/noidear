-- Post API cleanup hardening: remove TodoType.audit_rectification.
-- The project has no historical business data; we still archive any leftover
-- audit_rectification todos before dropping the enum value so audit evidence is
-- preserved on existing development/staging databases.

CREATE TABLE IF NOT EXISTS "todo_tasks_audit_rectification_backup" AS
SELECT *
FROM "todo_tasks"
WHERE "type" = 'audit_rectification';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "todo_tasks"
    WHERE "type" = 'audit_rectification'
      AND "status" = 'pending'
  ) THEN
    RAISE EXCEPTION 'Pending audit_rectification todo_tasks exist; archive or confirm deletion before removing TodoType.audit_rectification';
  END IF;
END $$;

DELETE FROM "todo_tasks" WHERE "type" = 'audit_rectification';

ALTER TYPE "TodoType" RENAME TO "TodoType_old";
CREATE TYPE "TodoType" AS ENUM (
  'training_organize',
  'training_attend',
  'approval',
  'approval_task',
  'equipment_maintain',
  'inventory',
  'change_request',
  'document_renewal',
  'change_execution_failed'
);
ALTER TABLE "todo_tasks"
  ALTER COLUMN "type" TYPE "TodoType"
  USING ("type"::text::"TodoType");
DROP TYPE "TodoType_old";
