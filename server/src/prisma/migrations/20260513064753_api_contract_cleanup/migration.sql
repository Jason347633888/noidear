-- API Contract Gap Cleanup migration
-- Drops deleted business models (workflow / monitoring / internal-audit / management-review /
-- change-approval / asset-loan / document-issuance / number-rule / old approval / process step approval /
-- document-control governance tables) and adds DocumentNumberCounter for internal default numbering.
-- 项目当前无历史业务数据，因此只做 schema 迁移，不做数据搬迁。

BEGIN;

-- DocumentReadConfirmation
DROP TABLE IF EXISTS "document_read_confirmations" CASCADE;
-- DocumentReadRequirement
DROP TABLE IF EXISTS "document_read_requirements" CASCADE;
-- DocumentTrainingNeed
DROP TABLE IF EXISTS "document_training_needs" CASCADE;
-- DocumentImpactItem
DROP TABLE IF EXISTS "document_impact_items" CASCADE;
-- DocumentImpactReview
DROP TABLE IF EXISTS "document_impact_reviews" CASCADE;
-- DocumentCoverageReview
DROP TABLE IF EXISTS "document_coverage_reviews" CASCADE;
-- DocumentRecommendation
DROP TABLE IF EXISTS "document_recommendations" CASCADE;
-- DocumentViewLog
DROP TABLE IF EXISTS "document_view_logs" CASCADE;
-- FulltextIndex
DROP TABLE IF EXISTS "fulltext_indexes" CASCADE;
-- DocumentIssuance
DROP TABLE IF EXISTS "DocumentIssuance" CASCADE;
DROP TABLE IF EXISTS "document_issuances" CASCADE;

-- AssetLoanRecord
DROP TABLE IF EXISTS "AssetLoanRecord" CASCADE;
DROP TABLE IF EXISTS "asset_loan_records" CASCADE;

-- ChangeApproval
DROP TABLE IF EXISTS "ChangeApproval" CASCADE;
DROP TABLE IF EXISTS "change_approvals" CASCADE;

-- ProcessStepApproval
DROP TABLE IF EXISTS "process_step_approvals" CASCADE;

-- DelegationLog (FK to workflow_tasks)
DROP TABLE IF EXISTS "delegation_logs" CASCADE;

-- WorkflowTask
DROP TABLE IF EXISTS "workflow_tasks" CASCADE;
-- WorkflowInstance
DROP TABLE IF EXISTS "workflow_instances" CASCADE;
-- WorkflowTemplate
DROP TABLE IF EXISTS "workflow_templates" CASCADE;

-- Monitoring / Alert
DROP TABLE IF EXISTS "alert_history" CASCADE;
DROP TABLE IF EXISTS "alert_rules" CASCADE;
DROP TABLE IF EXISTS "system_metrics" CASCADE;

-- Internal Audit
DROP TABLE IF EXISTS "audit_findings" CASCADE;
DROP TABLE IF EXISTS "audit_reports" CASCADE;
DROP TABLE IF EXISTS "audit_plans" CASCADE;

-- Management Review
DROP TABLE IF EXISTS "management_review_actions" CASCADE;
DROP TABLE IF EXISTS "management_review_inputs" CASCADE;
DROP TABLE IF EXISTS "management_reviews" CASCADE;

-- Old Approval
DROP TABLE IF EXISTS "approvals" CASCADE;

-- Document control number-rule (replaced by DocumentNumberCounter)
DROP TABLE IF EXISTS "number_rules" CASCADE;

-- Drop legacy FK columns on retained models
ALTER TABLE "records" DROP COLUMN IF EXISTS "workflowId";
ALTER TABLE "maintenance_records" DROP COLUMN IF EXISTS "workflowId";

-- DocumentNumberCounter: internal sequence storage for default document numbering
CREATE TABLE IF NOT EXISTS "document_number_counters" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "departmentId" TEXT NOT NULL,
    "sourceFolder" TEXT NOT NULL DEFAULT '',
    "categoryCode" TEXT NOT NULL DEFAULT '',
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "document_number_counters_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "doc_num_counter_uniq"
    ON "document_number_counters"("scope", "level", "departmentId", "sourceFolder", "categoryCode");

ALTER TABLE "document_number_counters"
    ADD CONSTRAINT "document_number_counters_departmentId_fkey"
    FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
