-- Add tenant scope to persisted traceability snapshots.
-- Nullable keeps existing snapshots readable; new snapshots write company_id at creation time.
ALTER TABLE "traceability_snapshots" ADD COLUMN "company_id" TEXT;

CREATE INDEX "traceability_snapshots_company_id_idx" ON "traceability_snapshots"("company_id");
