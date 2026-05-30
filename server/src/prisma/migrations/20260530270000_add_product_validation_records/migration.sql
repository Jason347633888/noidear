-- CreateTable
CREATE TABLE "product_validation_records" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "recipe_id" TEXT,
    "validation_type" TEXT NOT NULL,
    "inspection_record_id" TEXT,
    "change_event_id" TEXT,
    "conclusion" TEXT NOT NULL,
    "conclusion_by" TEXT,
    "concluded_at" TIMESTAMP(3),
    "evidence_file_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_validation_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_validation_records_company_id_product_id_validation__idx" ON "product_validation_records"("company_id", "product_id", "validation_type");
