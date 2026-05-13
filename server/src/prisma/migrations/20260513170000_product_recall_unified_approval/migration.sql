-- Product recall unified approval: persist the approval instance id on the recall row.
-- The project has no historical product recall business data, so backfill is unnecessary.

ALTER TABLE "product_recalls"
  ADD COLUMN IF NOT EXISTS "approvalInstanceId" TEXT;

CREATE INDEX IF NOT EXISTS "product_recalls_approvalInstanceId_idx"
  ON "product_recalls" ("approvalInstanceId");
