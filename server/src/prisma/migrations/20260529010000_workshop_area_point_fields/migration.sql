-- AlterTable: add type with temporary default to backfill existing rows, then drop default
ALTER TABLE "workshop_areas" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'workshop';
ALTER TABLE "workshop_areas" ALTER COLUMN "type" DROP DEFAULT;

-- AlterTable: add parentId (nullable, no default needed)
ALTER TABLE "workshop_areas" ADD COLUMN "parentId" TEXT;

-- CreateIndex
CREATE INDEX "workshop_areas_company_id_type_idx" ON "workshop_areas"("company_id", "type");

