-- Phase 13 Task 3: Restructure retained_sample_inspections
-- Drop old table and recreate with new schema aligned to RetainedSampleInspection model.

DROP TABLE IF EXISTS "retained_sample_inspections";

CREATE TABLE "retained_sample_inspections" (
    "id" TEXT NOT NULL,
    "retained_sample_id" TEXT NOT NULL,
    "inspection_type" TEXT NOT NULL,
    "inspection_record_id" TEXT NOT NULL,
    "processed_disposition" TEXT,
    "processed_at" TIMESTAMP(3),
    "processed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retained_sample_inspections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "retained_sample_inspections_retained_sample_id_idx" ON "retained_sample_inspections"("retained_sample_id");

-- CreateIndex
CREATE INDEX "retained_sample_inspections_inspection_record_id_idx" ON "retained_sample_inspections"("inspection_record_id");

-- AddForeignKey
ALTER TABLE "retained_sample_inspections"
    ADD CONSTRAINT "retained_sample_inspections_retained_sample_id_fkey"
    FOREIGN KEY ("retained_sample_id") REFERENCES "retained_samples"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
