-- CreateTable
CREATE TABLE "environmental_sampling_records" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "area_point_id" TEXT NOT NULL,
    "standard_id" TEXT,
    "sample_code" TEXT NOT NULL,
    "sample_method" TEXT NOT NULL,
    "exposure_time" INTEGER,
    "sampler_id" TEXT,
    "sampled_at" TIMESTAMP(3) NOT NULL,
    "follow_up_inspection_record_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "environmental_sampling_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "environmental_sampling_records_company_id_sample_code_key" ON "environmental_sampling_records"("company_id", "sample_code");

-- CreateIndex
CREATE INDEX "environmental_sampling_records_company_id_area_point_id_sam_idx" ON "environmental_sampling_records"("company_id", "area_point_id", "sampled_at");

-- AddForeignKey
ALTER TABLE "environmental_sampling_records" ADD CONSTRAINT "environmental_sampling_records_area_point_id_fkey" FOREIGN KEY ("area_point_id") REFERENCES "workshop_areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
