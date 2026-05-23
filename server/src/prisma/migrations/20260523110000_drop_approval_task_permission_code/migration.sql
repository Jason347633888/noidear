-- Drop index on assigneePermissionCode
DROP INDEX IF EXISTS "approval_tasks_assigneePermissionCode_status_idx";

-- Drop column assigneePermissionCode from approval_tasks
ALTER TABLE "approval_tasks" DROP COLUMN IF EXISTS "assigneePermissionCode";
