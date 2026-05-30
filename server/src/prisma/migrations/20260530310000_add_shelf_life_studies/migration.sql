-- CreateTable: shelf_life_studies
CREATE TABLE "shelf_life_studies" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "retained_sample_id" TEXT,
    "study_type" TEXT NOT NULL,
    "storage_conditions" JSONB NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "planned_ended_at" TIMESTAMP(3) NOT NULL,
    "actual_ended_at" TIMESTAMP(3),
    "final_conclusion" TEXT,
    "conclusion_by" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shelf_life_studies_pkey" PRIMARY KEY ("id")
);

-- CreateTable: shelf_life_study_points
CREATE TABLE "shelf_life_study_points" (
    "id" TEXT NOT NULL,
    "shelf_life_study_id" TEXT NOT NULL,
    "point_code" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "planned_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "skip_reason" TEXT,
    "inspection_record_id" TEXT,
    "completed_at" TIMESTAMP(3),
    "completed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shelf_life_study_points_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shelf_life_studies_company_id_product_id_status_idx" ON "shelf_life_studies"("company_id", "product_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "shelf_life_study_points_shelf_life_study_id_point_code_key" ON "shelf_life_study_points"("shelf_life_study_id", "point_code");

-- CreateIndex
CREATE INDEX "shelf_life_study_points_shelf_life_study_id_sequence_idx" ON "shelf_life_study_points"("shelf_life_study_id", "sequence");

-- CreateIndex
CREATE INDEX "shelf_life_study_points_status_planned_at_idx" ON "shelf_life_study_points"("status", "planned_at");

-- CreateIndex
CREATE INDEX "shelf_life_study_points_inspection_record_id_idx" ON "shelf_life_study_points"("inspection_record_id");

-- AddForeignKey: shelf_life_study_id on shelf_life_study_points → shelf_life_studies(id)
ALTER TABLE "shelf_life_study_points" ADD CONSTRAINT "shelf_life_study_points_shelf_life_study_id_fkey" FOREIGN KEY ("shelf_life_study_id") REFERENCES "shelf_life_studies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
