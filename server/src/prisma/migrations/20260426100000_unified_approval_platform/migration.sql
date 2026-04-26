-- CreateTable approval_definitions
CREATE TABLE "approval_definitions" (
    "id" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "triggerKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "steps" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable approval_instances
CREATE TABLE "approval_instances" (
    "id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "definitionVersion" INTEGER NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "resourceStep" TEXT,
    "triggerKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "currentStepKey" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "approval_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable approval_tasks
CREATE TABLE "approval_tasks" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "stepKey" TEXT NOT NULL,
    "stepName" TEXT NOT NULL,
    "approvalMode" TEXT NOT NULL,
    "assignmentType" TEXT NOT NULL,
    "assigneeUserId" TEXT,
    "assigneeRoleCode" TEXT,
    "assigneeDepartmentId" TEXT,
    "assigneePermissionCode" TEXT,
    "claimMode" TEXT NOT NULL DEFAULT 'DIRECT',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "claimedById" TEXT,
    "actedById" TEXT,
    "comment" TEXT,
    "actedAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable approval_actions
CREATE TABLE "approval_actions" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "taskId" TEXT,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "comment" TEXT,
    "snapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_actions_pkey" PRIMARY KEY ("id")
);

-- AddColumn approvalInstanceId to business models
ALTER TABLE "documents" ADD COLUMN "approvalInstanceId" TEXT;
ALTER TABLE "deviation_reports" ADD COLUMN "approvalInstanceId" TEXT;
ALTER TABLE "records" ADD COLUMN "approvalInstanceId" TEXT;
ALTER TABLE "material_requisitions" ADD COLUMN "approvalInstanceId" TEXT;
ALTER TABLE "material_inbounds" ADD COLUMN "approvalInstanceId" TEXT;
ALTER TABLE "material_returns" ADD COLUMN "approvalInstanceId" TEXT;
ALTER TABLE "material_scraps" ADD COLUMN "approvalInstanceId" TEXT;
ALTER TABLE "maintenance_records" ADD COLUMN "approvalInstanceId" TEXT;
ALTER TABLE "training_plans" ADD COLUMN "approvalInstanceId" TEXT;
ALTER TABLE "audit_findings" ADD COLUMN "approvalInstanceId" TEXT;
ALTER TABLE "process_step_data" ADD COLUMN "approvalInstanceId" TEXT;
ALTER TABLE "task_records" ADD COLUMN "approvalInstanceId" TEXT;

-- AlterTable CorrectiveAction (no @@map, uses default table name)
ALTER TABLE "CorrectiveAction" ADD COLUMN "approvalInstanceId" TEXT;

-- AlterTable ChangeApproval (no @@map, uses default table name)
ALTER TABLE "ChangeApproval" ADD COLUMN "approvalInstanceId" TEXT;

-- CreateUniqueIndex
CREATE UNIQUE INDEX "approval_definitions_module_resourceType_triggerKey_version_key" ON "approval_definitions"("module", "resourceType", "triggerKey", "version");

-- CreateIndex
CREATE INDEX "approval_definitions_resourceType_triggerKey_status_idx" ON "approval_definitions"("resourceType", "triggerKey", "status");
CREATE INDEX "approval_instances_resourceType_resourceId_idx" ON "approval_instances"("resourceType", "resourceId");
CREATE INDEX "approval_instances_resourceType_resourceId_resourceStep_idx" ON "approval_instances"("resourceType", "resourceId", "resourceStep");
CREATE INDEX "approval_instances_status_idx" ON "approval_instances"("status");
CREATE INDEX "approval_tasks_instanceId_stepKey_idx" ON "approval_tasks"("instanceId", "stepKey");
CREATE INDEX "approval_tasks_status_idx" ON "approval_tasks"("status");
CREATE INDEX "approval_tasks_assigneeUserId_status_idx" ON "approval_tasks"("assigneeUserId", "status");
CREATE INDEX "approval_tasks_assigneeRoleCode_status_idx" ON "approval_tasks"("assigneeRoleCode", "status");
CREATE INDEX "approval_tasks_assigneeDepartmentId_status_idx" ON "approval_tasks"("assigneeDepartmentId", "status");
CREATE INDEX "approval_tasks_assigneePermissionCode_status_idx" ON "approval_tasks"("assigneePermissionCode", "status");
CREATE INDEX "approval_actions_instanceId_idx" ON "approval_actions"("instanceId");
CREATE INDEX "approval_actions_taskId_idx" ON "approval_actions"("taskId");
CREATE INDEX "approval_actions_actorId_idx" ON "approval_actions"("actorId");
CREATE INDEX "documents_approvalInstanceId_idx" ON "documents"("approvalInstanceId");
CREATE INDEX "deviation_reports_approvalInstanceId_idx" ON "deviation_reports"("approvalInstanceId");
CREATE INDEX "records_approvalInstanceId_idx" ON "records"("approvalInstanceId");
CREATE INDEX "material_requisitions_approvalInstanceId_idx" ON "material_requisitions"("approvalInstanceId");
CREATE INDEX "material_inbounds_approvalInstanceId_idx" ON "material_inbounds"("approvalInstanceId");
CREATE INDEX "material_returns_approvalInstanceId_idx" ON "material_returns"("approvalInstanceId");
CREATE INDEX "material_scraps_approvalInstanceId_idx" ON "material_scraps"("approvalInstanceId");
CREATE INDEX "maintenance_records_approvalInstanceId_idx" ON "maintenance_records"("approvalInstanceId");
CREATE INDEX "training_plans_approvalInstanceId_idx" ON "training_plans"("approvalInstanceId");
CREATE INDEX "audit_findings_approvalInstanceId_idx" ON "audit_findings"("approvalInstanceId");
CREATE INDEX "process_step_data_approvalInstanceId_idx" ON "process_step_data"("approvalInstanceId");
CREATE INDEX "task_records_approvalInstanceId_idx" ON "task_records"("approvalInstanceId");

-- AddForeignKey
ALTER TABLE "approval_instances" ADD CONSTRAINT "approval_instances_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "approval_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "approval_instances" ADD CONSTRAINT "approval_instances_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "approval_tasks" ADD CONSTRAINT "approval_tasks_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "approval_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "approval_tasks" ADD CONSTRAINT "approval_tasks_assigneeUserId_fkey" FOREIGN KEY ("assigneeUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "approval_tasks" ADD CONSTRAINT "approval_tasks_claimedById_fkey" FOREIGN KEY ("claimedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "approval_tasks" ADD CONSTRAINT "approval_tasks_actedById_fkey" FOREIGN KEY ("actedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "approval_actions" ADD CONSTRAINT "approval_actions_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "approval_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "approval_actions" ADD CONSTRAINT "approval_actions_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "approval_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "approval_actions" ADD CONSTRAINT "approval_actions_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
