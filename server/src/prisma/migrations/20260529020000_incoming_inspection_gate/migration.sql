-- DropForeignKey
ALTER TABLE "incoming_inspections" DROP CONSTRAINT "incoming_inspections_material_batch_id_fkey";

-- AlterTable
ALTER TABLE "incoming_inspections" ADD COLUMN     "is_final" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "material_inbound_item_id" TEXT;
-- int -> text needs an explicit USING clause in Postgres
ALTER TABLE "incoming_inspections" ALTER COLUMN "company_id" SET DATA TYPE TEXT USING "company_id"::text;
ALTER TABLE "incoming_inspections" ALTER COLUMN "material_batch_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "material_inbound_items" ADD COLUMN     "disposition" TEXT;

-- CreateIndex
CREATE INDEX "incoming_inspections_company_id_material_inbound_item_id_idx" ON "incoming_inspections"("company_id", "material_inbound_item_id");

-- CreateIndex
CREATE INDEX "incoming_inspections_company_id_material_batch_id_idx" ON "incoming_inspections"("company_id", "material_batch_id");

-- AddForeignKey
ALTER TABLE "incoming_inspections" ADD CONSTRAINT "incoming_inspections_material_batch_id_fkey" FOREIGN KEY ("material_batch_id") REFERENCES "material_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incoming_inspections" ADD CONSTRAINT "incoming_inspections_material_inbound_item_id_fkey" FOREIGN KEY ("material_inbound_item_id") REFERENCES "material_inbound_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

