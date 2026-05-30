-- CreateTable
CREATE TABLE "fragile_item_ledgers" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "material_type" TEXT NOT NULL,
    "area_point_id" TEXT NOT NULL,
    "location_desc" TEXT,
    "risk_level" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "risk_assessment_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fragile_item_ledgers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fragile_item_usage_returns" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "fragile_item_id" TEXT NOT NULL,
    "used_by" TEXT,
    "used_at" TIMESTAMP(3) NOT NULL,
    "returned_at" TIMESTAMP(3),
    "return_condition" TEXT,
    "result" TEXT NOT NULL,
    "evidence_file_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fragile_item_usage_returns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fragile_item_ledgers_company_id_code_key" ON "fragile_item_ledgers"("company_id", "code");

-- CreateIndex
CREATE INDEX "fragile_item_ledgers_company_id_area_point_id_status_idx" ON "fragile_item_ledgers"("company_id", "area_point_id", "status");

-- CreateIndex
CREATE INDEX "fragile_item_usage_returns_company_id_fragile_item_id_used_at_idx" ON "fragile_item_usage_returns"("company_id", "fragile_item_id", "used_at");

-- AddForeignKey
ALTER TABLE "fragile_item_ledgers" ADD CONSTRAINT "fragile_item_ledgers_area_point_id_fkey" FOREIGN KEY ("area_point_id") REFERENCES "workshop_areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fragile_item_usage_returns" ADD CONSTRAINT "fragile_item_usage_returns_fragile_item_id_fkey" FOREIGN KEY ("fragile_item_id") REFERENCES "fragile_item_ledgers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
