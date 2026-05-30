-- CreateTable
CREATE TABLE "cleaning_plan_templates" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "area_type" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "effective_from" TIMESTAMP(3),
    "items" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cleaning_plan_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cleaning_plans" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "area_point_id" TEXT NOT NULL,
    "template_id" TEXT,
    "version" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "trigger_condition" TEXT,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_to" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "approvalInstanceId" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cleaning_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cleaning_plan_items" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "target_name" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "method" TEXT,
    "requires_disinfection" BOOLEAN NOT NULL DEFAULT false,
    "disinfectant" TEXT,
    "target_concentration" DECIMAL(14,4),
    "normal_range" TEXT,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT true,
    "requires_verification" BOOLEAN NOT NULL DEFAULT false,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cleaning_plan_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cleaning_plan_templates_company_id_name_version_key" ON "cleaning_plan_templates"("company_id", "name", "version");

-- CreateIndex
CREATE INDEX "cleaning_plan_templates_company_id_area_type_status_idx" ON "cleaning_plan_templates"("company_id", "area_type", "status");

-- CreateIndex
CREATE INDEX "cleaning_plans_company_id_area_point_id_status_idx" ON "cleaning_plans"("company_id", "area_point_id", "status");

-- CreateIndex
CREATE INDEX "cleaning_plan_items_plan_id_idx" ON "cleaning_plan_items"("plan_id");

-- AddForeignKey
ALTER TABLE "cleaning_plans" ADD CONSTRAINT "cleaning_plans_area_point_id_fkey" FOREIGN KEY ("area_point_id") REFERENCES "workshop_areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cleaning_plans" ADD CONSTRAINT "cleaning_plans_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "cleaning_plan_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cleaning_plan_items" ADD CONSTRAINT "cleaning_plan_items_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "cleaning_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
