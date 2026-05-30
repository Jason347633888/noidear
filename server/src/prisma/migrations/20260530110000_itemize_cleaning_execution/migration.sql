-- AlterTable: add new columns to cleaning_records
ALTER TABLE "cleaning_records" ADD COLUMN "area_point_id" TEXT,
                               ADD COLUMN "equipment_id" TEXT,
                               ADD COLUMN "cleaning_plan_id" TEXT,
                               ADD COLUMN "status" TEXT NOT NULL DEFAULT 'draft';

-- AlterTable: remove old simple columns (kept as nullables if data exists)
-- cleaning_method, disinfectant, concentration are replaced by CleaningRecordItem
-- They are removed only if they exist (no-op if already removed by db push)
ALTER TABLE "cleaning_records" DROP COLUMN IF EXISTS "cleaning_method",
                               DROP COLUMN IF EXISTS "disinfectant",
                               DROP COLUMN IF EXISTS "concentration";

-- CreateTable: CleaningRecordItem
CREATE TABLE "cleaning_record_items" (
    "id" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "plan_item_id" TEXT,
    "target_name" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "method_snapshot" TEXT,
    "requires_disinfection" BOOLEAN NOT NULL DEFAULT false,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "actual_concentration" DECIMAL(14,4),
    "sanitizer_check_id" TEXT,
    "result" TEXT NOT NULL DEFAULT 'pending',
    "remark" TEXT,
    "evidence_file_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cleaning_record_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cleaning_records_company_id_area_point_id_cleaning_date_idx" ON "cleaning_records"("company_id", "area_point_id", "cleaning_date");

CREATE INDEX "cleaning_record_items_record_id_idx" ON "cleaning_record_items"("record_id");

CREATE INDEX "cleaning_record_items_sanitizer_check_id_idx" ON "cleaning_record_items"("sanitizer_check_id");

-- AddForeignKey
ALTER TABLE "cleaning_records" ADD CONSTRAINT "cleaning_records_area_point_id_fkey"
    FOREIGN KEY ("area_point_id") REFERENCES "workshop_areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "cleaning_records" ADD CONSTRAINT "cleaning_records_cleaning_plan_id_fkey"
    FOREIGN KEY ("cleaning_plan_id") REFERENCES "cleaning_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "cleaning_record_items" ADD CONSTRAINT "cleaning_record_items_record_id_fkey"
    FOREIGN KEY ("record_id") REFERENCES "cleaning_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cleaning_record_items" ADD CONSTRAINT "cleaning_record_items_plan_item_id_fkey"
    FOREIGN KEY ("plan_item_id") REFERENCES "cleaning_plan_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
