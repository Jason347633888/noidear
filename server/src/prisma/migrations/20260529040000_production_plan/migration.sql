-- AlterTable
ALTER TABLE "production_batches" ADD COLUMN     "planItemId" TEXT;

-- CreateTable
CREATE TABLE "production_plans" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "planNo" TEXT NOT NULL,
    "planDate" TIMESTAMP(3) NOT NULL,
    "lineId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdById" TEXT,
    "releasedAt" TIMESTAMP(3),
    "releasedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_plan_items" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "recipeId" TEXT,
    "plannedQty" DECIMAL(14,4) NOT NULL,
    "unit" TEXT NOT NULL,
    "lineId" TEXT,
    "shiftId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_plan_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_tasks" (
    "id" TEXT NOT NULL,
    "planItemId" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "assigneeRole" TEXT,
    "assigneeUserId" TEXT,
    "dueAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "production_plans_company_id_status_idx" ON "production_plans"("company_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "production_plans_company_id_planNo_key" ON "production_plans"("company_id", "planNo");

-- CreateIndex
CREATE INDEX "production_plan_items_planId_idx" ON "production_plan_items"("planId");

-- CreateIndex
CREATE INDEX "production_plan_items_productId_idx" ON "production_plan_items"("productId");

-- CreateIndex
CREATE INDEX "production_tasks_status_dueAt_idx" ON "production_tasks"("status", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "production_tasks_planItemId_taskType_resourceType_resourceI_key" ON "production_tasks"("planItemId", "taskType", "resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "production_batches_planItemId_idx" ON "production_batches"("planItemId");

-- AddForeignKey
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_planItemId_fkey" FOREIGN KEY ("planItemId") REFERENCES "production_plan_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_plan_items" ADD CONSTRAINT "production_plan_items_planId_fkey" FOREIGN KEY ("planId") REFERENCES "production_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_tasks" ADD CONSTRAINT "production_tasks_planItemId_fkey" FOREIGN KEY ("planItemId") REFERENCES "production_plan_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

