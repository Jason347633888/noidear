-- AlterTable: Add nutrition/label fields to Product
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "shelf_life_days" INTEGER;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "nutrition_energy" DECIMAL(10,2);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "nutrition_protein" DECIMAL(10,2);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "nutrition_fat" DECIMAL(10,2);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "nutrition_trans_fat" DECIMAL(10,2);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "nutrition_carb" DECIMAL(10,2);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "nutrition_sodium" DECIMAL(10,2);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "product_type" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "processing_method" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "standard_code" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "storage_method" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "consumption_method" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "label_allergens" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "consumer_notice" TEXT;

-- AlterTable: Add productId to ProcessInstance
ALTER TABLE "process_instances" ADD COLUMN IF NOT EXISTS "productId" TEXT;

-- AddForeignKey: ProcessInstance.productId -> products.id
ALTER TABLE "process_instances" ADD CONSTRAINT "process_instances_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: ProcessStepApproval
CREATE TABLE IF NOT EXISTS "process_step_approvals" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "approverId" TEXT,
    "department" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "comment" TEXT,
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "process_step_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "process_step_approvals_instanceId_stepNumber_role_key"
  ON "process_step_approvals"("instanceId", "stepNumber", "role");

CREATE INDEX IF NOT EXISTS "process_step_approvals_instanceId_stepNumber_idx"
  ON "process_step_approvals"("instanceId", "stepNumber");

CREATE INDEX IF NOT EXISTS "process_step_approvals_role_status_idx"
  ON "process_step_approvals"("role", "status");

CREATE INDEX IF NOT EXISTS "process_step_approvals_approverId_status_idx"
  ON "process_step_approvals"("approverId", "status");

-- AddForeignKey: ProcessStepApproval.instanceId -> process_instances.id
ALTER TABLE "process_step_approvals" ADD CONSTRAINT "process_step_approvals_instanceId_fkey"
  FOREIGN KEY ("instanceId") REFERENCES "process_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: ProcessStepApproval.approverId -> users.id
ALTER TABLE "process_step_approvals" ADD CONSTRAINT "process_step_approvals_approverId_fkey"
  FOREIGN KEY ("approverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex: ProcessInstance.productId
CREATE INDEX IF NOT EXISTS "process_instances_productId_idx" ON "process_instances"("productId");
