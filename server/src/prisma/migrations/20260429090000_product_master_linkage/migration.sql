ALTER TABLE "products"
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'manual_admin';

CREATE INDEX "products_source_idx" ON "products"("source");

CREATE TABLE "workshop_areas" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "workshop_areas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workshop_areas_company_id_code_key" ON "workshop_areas"("company_id", "code");
CREATE UNIQUE INDEX "workshop_areas_company_id_name_key" ON "workshop_areas"("company_id", "name");
CREATE INDEX "workshop_areas_status_idx" ON "workshop_areas"("status");

ALTER TABLE "recipe_lines"
  ADD COLUMN "area_id" TEXT,
  ADD COLUMN "area_name_snapshot" TEXT;

CREATE UNIQUE INDEX "recipe_lines_recipe_id_material_id_key" ON "recipe_lines"("recipe_id", "material_id");
CREATE INDEX "recipe_lines_area_id_idx" ON "recipe_lines"("area_id");

ALTER TABLE "recipe_lines"
  ADD CONSTRAINT "recipe_lines_area_id_fkey"
  FOREIGN KEY ("area_id") REFERENCES "workshop_areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "batch_material_usages"
  ADD COLUMN "recipeLineId" TEXT,
  ADD COLUMN "area_id" TEXT,
  ADD COLUMN "areaNameSnapshot" TEXT;

CREATE INDEX "batch_material_usages_recipeLineId_idx" ON "batch_material_usages"("recipeLineId");
CREATE INDEX "batch_material_usages_area_id_idx" ON "batch_material_usages"("area_id");

ALTER TABLE "batch_material_usages"
  ADD CONSTRAINT "batch_material_usages_recipeLineId_fkey"
  FOREIGN KEY ("recipeLineId") REFERENCES "recipe_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "batch_material_usages"
  ADD CONSTRAINT "batch_material_usages_area_id_fkey"
  FOREIGN KEY ("area_id") REFERENCES "workshop_areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
