-- AlterTable: add company_id to maintenance_records so the NC source validator
-- can assert tenant ownership before accepting a maintenance_record reference.
-- Default '1' keeps existing rows valid; application layer always writes the
-- correct value going forward.
ALTER TABLE "maintenance_records" ADD COLUMN "company_id" TEXT NOT NULL DEFAULT '1';

-- CreateIndex
CREATE INDEX "maintenance_records_company_id_idx" ON "maintenance_records"("company_id");
