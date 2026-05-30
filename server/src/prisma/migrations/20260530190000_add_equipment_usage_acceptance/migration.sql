-- CreateTable: equipment_acceptance_records
CREATE TABLE "equipment_acceptance_records" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "accepted_at" TIMESTAMP(3) NOT NULL,
    "accepted_by" TEXT,
    "result" TEXT NOT NULL,
    "checklist_snapshot" JSONB,
    "evidence_file_id" TEXT,
    "approvalInstanceId" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_acceptance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable: equipment_usage_records
CREATE TABLE "equipment_usage_records" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "equipmentId" TEXT,
    "measuringEquipmentId" TEXT,
    "used_from" TIMESTAMP(3) NOT NULL,
    "used_to" TIMESTAMP(3),
    "purpose" TEXT NOT NULL,
    "sample_reference" TEXT,
    "operatorId" TEXT,
    "equipment_status_after" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_usage_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "equipment_acceptance_records_company_id_equipmentId_accepted_at_idx"
    ON "equipment_acceptance_records"("company_id", "equipmentId", "accepted_at");

-- CreateIndex
CREATE INDEX "equipment_usage_records_company_id_equipmentId_used_from_idx"
    ON "equipment_usage_records"("company_id", "equipmentId", "used_from");

-- CreateIndex
CREATE INDEX "equipment_usage_records_company_id_measuringEquipmentId_used_from_idx"
    ON "equipment_usage_records"("company_id", "measuringEquipmentId", "used_from");

-- AddForeignKey
ALTER TABLE "equipment_acceptance_records"
    ADD CONSTRAINT "equipment_acceptance_records_equipmentId_fkey"
    FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_usage_records"
    ADD CONSTRAINT "equipment_usage_records_equipmentId_fkey"
    FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
