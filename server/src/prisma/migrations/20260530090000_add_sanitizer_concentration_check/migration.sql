-- CreateTable
CREATE TABLE "sanitizer_concentration_checks" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "area_point_id" TEXT NOT NULL,
    "disinfectant_type" TEXT NOT NULL,
    "target_concentration" DECIMAL(14,4),
    "actual_concentration" DECIMAL(14,4) NOT NULL,
    "unit" TEXT NOT NULL,
    "judgment" TEXT NOT NULL,
    "checked_at" TIMESTAMP(3) NOT NULL,
    "operator_id" TEXT,
    "verifier_id" TEXT,
    "notes" TEXT,
    "appeared_in_source_forms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source_form_version" TEXT,
    "source_form_field_group" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sanitizer_concentration_checks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sanitizer_concentration_checks_company_id_area_point_id_che_idx" ON "sanitizer_concentration_checks"("company_id", "area_point_id", "checked_at");

-- AddForeignKey
ALTER TABLE "sanitizer_concentration_checks" ADD CONSTRAINT "sanitizer_concentration_checks_area_point_id_fkey" FOREIGN KEY ("area_point_id") REFERENCES "workshop_areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
