-- AddCheckConstraintToApprovals
-- Ensure that documentId and recordId are mutually exclusive

ALTER TABLE "approvals"
ADD CONSTRAINT "check_approval_target"
CHECK (
  ("documentId" IS NOT NULL AND "recordId" IS NULL) OR
  ("documentId" IS NULL AND "recordId" IS NOT NULL)
);
