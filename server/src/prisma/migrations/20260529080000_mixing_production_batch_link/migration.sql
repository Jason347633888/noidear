-- AlterTable
ALTER TABLE "mixing_executions" ADD COLUMN     "productionBatchId" TEXT;

-- CreateIndex
CREATE INDEX "mixing_executions_productionBatchId_idx" ON "mixing_executions"("productionBatchId");

-- AddForeignKey
ALTER TABLE "mixing_executions" ADD CONSTRAINT "mixing_executions_productionBatchId_fkey" FOREIGN KEY ("productionBatchId") REFERENCES "production_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

