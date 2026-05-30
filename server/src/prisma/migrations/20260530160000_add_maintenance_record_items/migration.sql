-- CreateTable
CREATE TABLE "maintenance_record_items" (
    "id" TEXT NOT NULL,
    "maintenanceRecordId" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "method_snapshot" TEXT,
    "result" TEXT NOT NULL,
    "measured_value" TEXT,
    "remark" TEXT,
    "evidence_file_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_record_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "maintenance_record_items_maintenanceRecordId_idx" ON "maintenance_record_items"("maintenanceRecordId");

-- AddForeignKey
ALTER TABLE "maintenance_record_items" ADD CONSTRAINT "maintenance_record_items_maintenanceRecordId_fkey" FOREIGN KEY ("maintenanceRecordId") REFERENCES "maintenance_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
