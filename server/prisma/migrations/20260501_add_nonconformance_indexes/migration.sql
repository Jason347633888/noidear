-- Migration: 20260501_add_nonconformance_indexes
-- Adds company/status and source lookup indexes to NonConformance for query performance

CREATE INDEX IF NOT EXISTS "NonConformance_company_id_status_idx" ON "NonConformance"("company_id", "status");
CREATE INDEX IF NOT EXISTS "NonConformance_company_id_source_type_source_id_idx" ON "NonConformance"("company_id", "source_type", "source_id");
