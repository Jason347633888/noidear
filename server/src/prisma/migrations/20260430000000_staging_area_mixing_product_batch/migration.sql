-- CreateEnum
CREATE TYPE "StagingStocktakeKind" AS ENUM ('shift_start', 'shift_end', 'handover');

-- CreateEnum
CREATE TYPE "StagingStocktakeStatus" AS ENUM ('draft', 'confirmed', 'exception', 'closed');

-- CreateEnum
CREATE TYPE "MixingExecutionStatus" AS ENUM ('draft', 'confirmed', 'voided');

-- CreateEnum
CREATE TYPE "BatchMixingAggregationStatus" AS ENUM ('draft', 'confirmed');

-- DropIndex
DROP INDEX "staging_area_stocks_batchId_location_key";

-- AlterTable
ALTER TABLE "production_batches" ADD COLUMN     "leader_id" TEXT,
ADD COLUMN     "packageMachine" TEXT,
ADD COLUMN     "packagedAt" TIMESTAMP(3),
ADD COLUMN     "packagingLine" TEXT,
ADD COLUMN     "shift_type_id" TEXT,
ADD COLUMN     "team_id" TEXT,
ADD COLUMN     "unit" TEXT,
ADD COLUMN     "warehousedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "staging_area_stocks" ADD COLUMN     "area_id" TEXT;

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "role" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "crosses_day" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_shift_schedules" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "shift_type_id" TEXT NOT NULL,
    "work_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_shift_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staging_area_stocktakes" (
    "id" TEXT NOT NULL,
    "area_id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "kind" "StagingStocktakeKind" NOT NULL,
    "status" "StagingStocktakeStatus" NOT NULL DEFAULT 'draft',
    "book_quantity" DOUBLE PRECISION NOT NULL,
    "actual_quantity" DOUBLE PRECISION NOT NULL,
    "difference" DOUBLE PRECISION NOT NULL,
    "work_date" DATE NOT NULL,
    "shift_type_id" TEXT NOT NULL,
    "team_id" TEXT,
    "operatorId" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staging_area_stocktakes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mixing_executions" (
    "id" TEXT NOT NULL,
    "executionNo" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "area_id" TEXT NOT NULL,
    "work_date" DATE NOT NULL,
    "shift_type_id" TEXT,
    "team_id" TEXT,
    "planned_weight" DOUBLE PRECISION,
    "actual_weight" DOUBLE PRECISION NOT NULL,
    "status" "MixingExecutionStatus" NOT NULL DEFAULT 'draft',
    "operatorId" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mixing_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mixing_execution_lines" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "recipeLineId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "materialBatchId" TEXT NOT NULL,
    "stagingAreaStockId" TEXT NOT NULL,
    "plannedQuantity" DOUBLE PRECISION,
    "actualQuantity" DOUBLE PRECISION NOT NULL,
    "fifoSuggested" BOOLEAN NOT NULL DEFAULT true,
    "manualOverride" BOOLEAN NOT NULL DEFAULT false,
    "overrideReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mixing_execution_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_mixing_aggregations" (
    "id" TEXT NOT NULL,
    "productionBatchId" TEXT NOT NULL,
    "mixingExecutionId" TEXT NOT NULL,
    "status" "BatchMixingAggregationStatus" NOT NULL DEFAULT 'draft',
    "confirmedBy" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batch_mixing_aggregations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "teams_code_key" ON "teams"("code");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_team_id_employee_id_key" ON "team_members"("team_id", "employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "shift_types_code_key" ON "shift_types"("code");

-- CreateIndex
CREATE INDEX "team_shift_schedules_work_date_idx" ON "team_shift_schedules"("work_date");

-- CreateIndex
CREATE UNIQUE INDEX "team_shift_schedules_team_id_shift_type_id_work_date_key" ON "team_shift_schedules"("team_id", "shift_type_id", "work_date");

-- CreateIndex
CREATE INDEX "staging_area_stocktakes_area_id_work_date_shift_type_id_idx" ON "staging_area_stocktakes"("area_id", "work_date", "shift_type_id");

-- CreateIndex
CREATE INDEX "staging_area_stocktakes_batchId_idx" ON "staging_area_stocktakes"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "mixing_executions_executionNo_key" ON "mixing_executions"("executionNo");

-- CreateIndex
CREATE INDEX "mixing_executions_work_date_area_id_idx" ON "mixing_executions"("work_date", "area_id");

-- CreateIndex
CREATE INDEX "mixing_executions_recipeId_idx" ON "mixing_executions"("recipeId");

-- CreateIndex
CREATE INDEX "mixing_execution_lines_materialBatchId_idx" ON "mixing_execution_lines"("materialBatchId");

-- CreateIndex
CREATE INDEX "mixing_execution_lines_recipeLineId_idx" ON "mixing_execution_lines"("recipeLineId");

-- CreateIndex
CREATE INDEX "batch_mixing_aggregations_mixingExecutionId_idx" ON "batch_mixing_aggregations"("mixingExecutionId");

-- CreateIndex
CREATE UNIQUE INDEX "batch_mixing_aggregations_productionBatchId_mixingExecution_key" ON "batch_mixing_aggregations"("productionBatchId", "mixingExecutionId");

-- CreateIndex
CREATE INDEX "staging_area_stocks_area_id_idx" ON "staging_area_stocks"("area_id");

-- CreateIndex
CREATE UNIQUE INDEX "staging_area_stocks_batchId_area_id_key" ON "staging_area_stocks"("batchId", "area_id");

-- AddForeignKey
ALTER TABLE "staging_area_stocks" ADD CONSTRAINT "staging_area_stocks_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "workshop_areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_shift_schedules" ADD CONSTRAINT "team_shift_schedules_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_shift_schedules" ADD CONSTRAINT "team_shift_schedules_shift_type_id_fkey" FOREIGN KEY ("shift_type_id") REFERENCES "shift_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staging_area_stocktakes" ADD CONSTRAINT "staging_area_stocktakes_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "workshop_areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staging_area_stocktakes" ADD CONSTRAINT "staging_area_stocktakes_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "material_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staging_area_stocktakes" ADD CONSTRAINT "staging_area_stocktakes_shift_type_id_fkey" FOREIGN KEY ("shift_type_id") REFERENCES "shift_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mixing_executions" ADD CONSTRAINT "mixing_executions_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mixing_executions" ADD CONSTRAINT "mixing_executions_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mixing_executions" ADD CONSTRAINT "mixing_executions_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "workshop_areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mixing_execution_lines" ADD CONSTRAINT "mixing_execution_lines_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "mixing_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mixing_execution_lines" ADD CONSTRAINT "mixing_execution_lines_recipeLineId_fkey" FOREIGN KEY ("recipeLineId") REFERENCES "recipe_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mixing_execution_lines" ADD CONSTRAINT "mixing_execution_lines_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mixing_execution_lines" ADD CONSTRAINT "mixing_execution_lines_materialBatchId_fkey" FOREIGN KEY ("materialBatchId") REFERENCES "material_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mixing_execution_lines" ADD CONSTRAINT "mixing_execution_lines_stagingAreaStockId_fkey" FOREIGN KEY ("stagingAreaStockId") REFERENCES "staging_area_stocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_mixing_aggregations" ADD CONSTRAINT "batch_mixing_aggregations_productionBatchId_fkey" FOREIGN KEY ("productionBatchId") REFERENCES "production_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_mixing_aggregations" ADD CONSTRAINT "batch_mixing_aggregations_mixingExecutionId_fkey" FOREIGN KEY ("mixingExecutionId") REFERENCES "mixing_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_shift_type_id_fkey" FOREIGN KEY ("shift_type_id") REFERENCES "shift_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
