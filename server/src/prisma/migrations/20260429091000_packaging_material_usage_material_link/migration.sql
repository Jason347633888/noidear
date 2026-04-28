ALTER TABLE "PackagingMaterialUsage"
  ADD COLUMN "material_id" TEXT;

CREATE INDEX "PackagingMaterialUsage_material_id_idx" ON "PackagingMaterialUsage"("material_id");

ALTER TABLE "PackagingMaterialUsage"
  ADD CONSTRAINT "PackagingMaterialUsage_material_id_fkey"
  FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE SET NULL ON UPDATE CASCADE;
