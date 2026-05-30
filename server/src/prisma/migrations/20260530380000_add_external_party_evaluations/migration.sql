-- Phase 15 Task 6: ExternalPartyEvaluation
-- Adds evaluation records for non-supplier external parties
-- (carriers, customers, waste collectors, etc.).
-- Supplier evaluations remain in the supplier_evaluations table.

CREATE TABLE "external_party_evaluations" (
    "id"                TEXT NOT NULL,
    "company_id"        TEXT NOT NULL,
    "external_party_id" TEXT NOT NULL,
    "evaluation_type"   TEXT NOT NULL,
    "evaluation_date"   DATE NOT NULL,
    "score"             DECIMAL(14, 4),
    "result"            TEXT NOT NULL,
    "risk_level"        TEXT,
    "evaluator_id"      TEXT,
    "evidence_file_id"  TEXT,
    "next_review_at"    TIMESTAMP(3),
    "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_party_evaluations_pkey" PRIMARY KEY ("id")
);

-- Composite index for efficient queries by company + party + date
CREATE INDEX "external_party_evaluations_company_id_external_party_id_evaluation_date_idx"
    ON "external_party_evaluations"("company_id", "external_party_id", "evaluation_date");

-- Foreign key to ExternalParty
ALTER TABLE "external_party_evaluations"
    ADD CONSTRAINT "external_party_evaluations_external_party_id_fkey"
    FOREIGN KEY ("external_party_id") REFERENCES "ExternalParty"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
