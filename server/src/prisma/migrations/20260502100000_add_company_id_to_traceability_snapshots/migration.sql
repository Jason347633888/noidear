-- AlterTable: add company_id to traceability_snapshots for tenant isolation
-- Nullable to preserve existing rows without a known company context.
ALTER TABLE "traceability_snapshots" ADD COLUMN "company_id" TEXT;

-- CreateIndex
CREATE INDEX "traceability_snapshots_company_id_idx" ON "traceability_snapshots"("company_id");
