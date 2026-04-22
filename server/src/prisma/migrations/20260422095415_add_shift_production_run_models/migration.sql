-- CreateTable: shift_instances
CREATE TABLE "shift_instances" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "shift_type" TEXT NOT NULL,
    "shift_date" DATE NOT NULL,
    "opened_by" TEXT NOT NULL,
    "closed_by" TEXT,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'open',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable: production_runs
CREATE TABLE "production_runs" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "shift_instance_id" TEXT NOT NULL,
    "production_line" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "recipe_id" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "actual_yield" DECIMAL(14,4),
    "yield_unit" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_runs_pkey" PRIMARY KEY ("id")
);

-- AlterTable: records — add shift/production run links + document_no + entity_links
ALTER TABLE "records"
    ADD COLUMN "shift_instance_id" TEXT,
    ADD COLUMN "production_run_id" TEXT,
    ADD COLUMN "document_no" TEXT,
    ADD COLUMN "entity_links" JSONB;

-- AlterTable: record_templates — add is_mandatory
ALTER TABLE "record_templates"
    ADD COLUMN "is_mandatory" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: production_batches — add production_run_id
ALTER TABLE "production_batches"
    ADD COLUMN "production_run_id" TEXT;

-- AlterTable: line_change_check_records — add production_run_id
ALTER TABLE "line_change_check_records"
    ADD COLUMN "production_run_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "shift_instances_company_id_shift_type_shift_date_key" ON "shift_instances"("company_id", "shift_type", "shift_date");
CREATE INDEX "shift_instances_company_id_shift_date_idx" ON "shift_instances"("company_id", "shift_date");
CREATE INDEX "production_runs_company_id_shift_instance_id_idx" ON "production_runs"("company_id", "shift_instance_id");
CREATE INDEX "production_runs_product_id_idx" ON "production_runs"("product_id");

-- AddForeignKey
ALTER TABLE "production_runs" ADD CONSTRAINT "production_runs_shift_instance_id_fkey"
    FOREIGN KEY ("shift_instance_id") REFERENCES "shift_instances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "production_runs" ADD CONSTRAINT "production_runs_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "production_runs" ADD CONSTRAINT "production_runs_recipe_id_fkey"
    FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "records" ADD CONSTRAINT "records_shift_instance_id_fkey"
    FOREIGN KEY ("shift_instance_id") REFERENCES "shift_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "records" ADD CONSTRAINT "records_production_run_id_fkey"
    FOREIGN KEY ("production_run_id") REFERENCES "production_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_production_run_id_fkey"
    FOREIGN KEY ("production_run_id") REFERENCES "production_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "line_change_check_records" ADD CONSTRAINT "line_change_check_records_production_run_id_fkey"
    FOREIGN KEY ("production_run_id") REFERENCES "production_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
