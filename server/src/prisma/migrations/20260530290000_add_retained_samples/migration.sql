-- CreateTable: retained_samples
CREATE TABLE "retained_samples" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "sample_type" TEXT NOT NULL,
    "product_id" TEXT,
    "material_batch_id" TEXT,
    "production_batch_id" TEXT,
    "sample_code" TEXT NOT NULL,
    "sample_qty" DECIMAL(14,4) NOT NULL,
    "unit" TEXT NOT NULL,
    "retained_at" TIMESTAMP(3) NOT NULL,
    "retention_period" TEXT,
    "expires_at" TIMESTAMP(3),
    "storage_condition" TEXT,
    "storage_area_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'retained',
    "disposal_action" TEXT,
    "disposed_at" TIMESTAMP(3),
    "appeared_in_source_forms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source_form_version" TEXT,
    "source_form_field_group" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retained_samples_pkey" PRIMARY KEY ("id")
);

-- CreateTable: retained_sample_inspections
CREATE TABLE "retained_sample_inspections" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "sample_id" TEXT NOT NULL,
    "inspected_at" TIMESTAMP(3) NOT NULL,
    "inspector_id" TEXT,
    "result" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retained_sample_inspections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "retained_samples_company_id_sample_code_key" ON "retained_samples"("company_id", "sample_code");

-- CreateIndex
CREATE INDEX "retained_samples_company_id_sample_type_status_idx" ON "retained_samples"("company_id", "sample_type", "status");

-- CreateIndex
CREATE INDEX "retained_samples_company_id_production_batch_id_idx" ON "retained_samples"("company_id", "production_batch_id");

-- CreateIndex
CREATE INDEX "retained_sample_inspections_company_id_sample_id_idx" ON "retained_sample_inspections"("company_id", "sample_id");

-- AddForeignKey: sample_id on retained_sample_inspections → retained_samples(id)
ALTER TABLE "retained_sample_inspections" ADD CONSTRAINT "retained_sample_inspections_sample_id_fkey" FOREIGN KEY ("sample_id") REFERENCES "retained_samples"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
