-- Require every PackagingMaterialUsage in the production traceability chain to link to a ProductionBatch.
-- This migration intentionally fails if legacy data cannot satisfy the constraint.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "PackagingMaterialUsage" WHERE "production_batch_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot require PackagingMaterialUsage.production_batch_id: legacy rows with NULL production_batch_id exist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "PackagingMaterialUsage" pmu
    LEFT JOIN "production_batches" pb ON pb."id" = pmu."production_batch_id"
    WHERE pb."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot add PackagingMaterialUsage.production_batch_id FK: orphan production_batch_id rows exist';
  END IF;
END $$;

ALTER TABLE "PackagingMaterialUsage" DROP CONSTRAINT IF EXISTS "PackagingMaterialUsage_production_batch_id_fkey";
ALTER TABLE "PackagingMaterialUsage" ALTER COLUMN "production_batch_id" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "PackagingMaterialUsage_production_batch_id_idx"
  ON "PackagingMaterialUsage"("production_batch_id");

ALTER TABLE "PackagingMaterialUsage"
  ADD CONSTRAINT "PackagingMaterialUsage_production_batch_id_fkey"
  FOREIGN KEY ("production_batch_id") REFERENCES "production_batches"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
