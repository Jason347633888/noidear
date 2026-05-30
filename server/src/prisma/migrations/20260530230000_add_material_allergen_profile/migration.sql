-- CreateTable
CREATE TABLE "material_allergen_profiles" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "supplier_id" TEXT,
    "allergen_code" TEXT NOT NULL,
    "allergen_name" TEXT NOT NULL,
    "contains_allergen" BOOLEAN NOT NULL,
    "cross_contact_risk" TEXT,
    "evidence_file_id" TEXT,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_to" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_allergen_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "material_allergen_profiles_company_id_material_id_supplier_id_status_idx" ON "material_allergen_profiles"("company_id", "material_id", "supplier_id", "status");
