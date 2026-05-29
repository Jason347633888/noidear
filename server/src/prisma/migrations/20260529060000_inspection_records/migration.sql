-- DropIndex
DROP INDEX "NonConformance_company_id_source_type_source_id_idx";

-- AlterTable
ALTER TABLE "NonConformance" ADD COLUMN     "source_item_id" TEXT;

-- CreateTable
CREATE TABLE "inspection_records" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "standard_id" TEXT,
    "object_type" TEXT NOT NULL,
    "object_id" TEXT NOT NULL,
    "inspected_at" TIMESTAMP(3) NOT NULL,
    "inspector_id" TEXT,
    "overall_result" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "source_task_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspection_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_record_items" (
    "id" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "inspection_item_id" TEXT,
    "item_name" TEXT NOT NULL,
    "actual_value" TEXT,
    "unit" TEXT,
    "text_result" TEXT,
    "judgment" TEXT NOT NULL,
    "standard_snapshot" JSONB,
    "remark" TEXT,
    "evidence_file_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_record_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inspection_records_company_id_object_type_object_id_idx" ON "inspection_records"("company_id", "object_type", "object_id");

-- CreateIndex
CREATE INDEX "inspection_records_standard_id_idx" ON "inspection_records"("standard_id");

-- CreateIndex
CREATE INDEX "inspection_record_items_record_id_idx" ON "inspection_record_items"("record_id");

-- CreateIndex
CREATE INDEX "inspection_record_items_inspection_item_id_idx" ON "inspection_record_items"("inspection_item_id");

-- CreateIndex
CREATE INDEX "NonConformance_company_id_source_type_source_id_source_item_idx" ON "NonConformance"("company_id", "source_type", "source_id", "source_item_id");

-- AddForeignKey
ALTER TABLE "inspection_records" ADD CONSTRAINT "inspection_records_standard_id_fkey" FOREIGN KEY ("standard_id") REFERENCES "inspection_standards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_record_items" ADD CONSTRAINT "inspection_record_items_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "inspection_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_record_items" ADD CONSTRAINT "inspection_record_items_inspection_item_id_fkey" FOREIGN KEY ("inspection_item_id") REFERENCES "inspection_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

