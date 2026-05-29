-- DropIndex
DROP INDEX "batch_material_usages_productionBatchId_materialBatchId_key";

-- AlterTable
ALTER TABLE "batch_material_usages" ADD COLUMN     "executionLineId" TEXT;

-- CreateIndex
CREATE INDEX "batch_material_usages_productionBatchId_materialBatchId_exe_idx" ON "batch_material_usages"("productionBatchId", "materialBatchId", "executionLineId");

-- AddForeignKey
ALTER TABLE "batch_material_usages" ADD CONSTRAINT "batch_material_usages_executionLineId_fkey" FOREIGN KEY ("executionLineId") REFERENCES "mixing_execution_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

