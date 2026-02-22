-- DropForeignKey
ALTER TABLE "task_records" DROP CONSTRAINT "task_records_taskId_fkey";

-- DropForeignKey
ALTER TABLE "task_records" DROP CONSTRAINT "task_records_templateId_fkey";

-- DropForeignKey
ALTER TABLE "task_records" DROP CONSTRAINT "task_records_submitterId_fkey";

-- DropForeignKey
ALTER TABLE "task_records" DROP CONSTRAINT "task_records_approverId_fkey";

-- DropForeignKey
ALTER TABLE "approvals" DROP CONSTRAINT "approvals_documentId_fkey";

-- DropForeignKey
ALTER TABLE "approvals" DROP CONSTRAINT "approvals_recordId_fkey";

-- DropForeignKey
ALTER TABLE "approvals" DROP CONSTRAINT "approvals_approverId_fkey";

-- DropForeignKey
ALTER TABLE "operation_logs" DROP CONSTRAINT "operation_logs_userId_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_userId_fkey";

-- DropForeignKey
ALTER TABLE "deviation_reports" DROP CONSTRAINT "deviation_reports_recordId_fkey";

-- DropForeignKey
ALTER TABLE "deviation_reports" DROP CONSTRAINT "deviation_reports_creatorId_fkey";

-- DropForeignKey
ALTER TABLE "user_permissions" DROP CONSTRAINT "user_permissions_userId_fkey";

-- DropForeignKey
ALTER TABLE "user_permissions" DROP CONSTRAINT "user_permissions_permissionId_fkey";

-- DropIndex
DROP INDEX "permissions_code_key";

-- DropIndex
DROP INDEX "permissions_code_idx";

-- DropIndex
DROP INDEX "permissions_category_idx";

-- DropIndex
DROP INDEX "permissions_scope_idx";

-- DropIndex
DROP INDEX "permissions_status_idx";

-- AlterTable
ALTER TABLE "approvals" ADD COLUMN     "approvalType" TEXT NOT NULL DEFAULT 'single';

-- AlterTable
ALTER TABLE "permissions" DROP COLUMN "category",
DROP COLUMN "code",
DROP COLUMN "name",
DROP COLUMN "scope",
DROP COLUMN "status",
ADD COLUMN     "action" TEXT NOT NULL,
ADD COLUMN     "resource" TEXT NOT NULL;

-- DropTable
DROP TABLE "user_permissions";

-- CreateIndex
CREATE UNIQUE INDEX "permissions_resource_action_key" ON "permissions"("resource" ASC, "action" ASC);

-- CreateIndex
CREATE INDEX "permissions_resource_idx" ON "permissions"("resource" ASC);

