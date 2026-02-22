-- Migration: 20260222_add_new_fields
-- Adds new fields to record_templates, records, documents
-- Creates role_fine_grained_permissions and department_permissions tables

-- AlterTable: record_templates
ALTER TABLE "record_templates" ADD COLUMN IF NOT EXISTS "approvalRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "record_templates" ADD COLUMN IF NOT EXISTS "workflowConfig" JSONB;

-- AlterTable: records
ALTER TABLE "records" ADD COLUMN IF NOT EXISTS "workflowId" TEXT;
ALTER TABLE "records" ADD COLUMN IF NOT EXISTS "signatureTimestamp" TIMESTAMP(3);
ALTER TABLE "records" ADD COLUMN IF NOT EXISTS "offlineFilled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "records" ADD COLUMN IF NOT EXISTS "autoArchiveStatus" TEXT NOT NULL DEFAULT 'active';

-- AlterTable: documents
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "content" JSONB;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "departmentId" TEXT;

-- CreateTable: role_fine_grained_permissions
CREATE TABLE IF NOT EXISTS "role_fine_grained_permissions" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL DEFAULT true,
    "grantedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_fine_grained_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: department_permissions
CREATE TABLE IF NOT EXISTS "department_permissions" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "department_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: role_fine_grained_permissions
CREATE UNIQUE INDEX IF NOT EXISTS "role_fine_grained_permissions_roleId_resource_action_key"
    ON "role_fine_grained_permissions"("roleId", "resource", "action");

CREATE INDEX IF NOT EXISTS "role_fine_grained_permissions_roleId_idx"
    ON "role_fine_grained_permissions"("roleId");

-- CreateIndex: department_permissions
CREATE UNIQUE INDEX IF NOT EXISTS "department_permissions_departmentId_resource_action_key"
    ON "department_permissions"("departmentId", "resource", "action");

CREATE INDEX IF NOT EXISTS "department_permissions_departmentId_idx"
    ON "department_permissions"("departmentId");

-- CreateIndex: records workflow
CREATE INDEX IF NOT EXISTS "records_workflowId_idx" ON "records"("workflowId");

-- AddForeignKey: role_fine_grained_permissions -> roles
ALTER TABLE "role_fine_grained_permissions"
    ADD CONSTRAINT "role_fine_grained_permissions_roleId_fkey"
    FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: department_permissions -> departments
ALTER TABLE "department_permissions"
    ADD CONSTRAINT "department_permissions_departmentId_fkey"
    FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: records -> workflow_instances
ALTER TABLE "records"
    ADD CONSTRAINT "records_workflowId_fkey"
    FOREIGN KEY ("workflowId") REFERENCES "workflow_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: documents -> departments
ALTER TABLE "documents"
    ADD CONSTRAINT "documents_departmentId_fkey"
    FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
