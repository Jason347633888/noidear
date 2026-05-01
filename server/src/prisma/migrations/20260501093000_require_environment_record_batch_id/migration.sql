-- Require every EnvironmentRecord in the quality release chain to link to a ProductionBatch.
-- This migration intentionally fails if legacy data cannot satisfy the constraint.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "EnvironmentRecord" WHERE "production_batch_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot require EnvironmentRecord.production_batch_id: legacy rows with NULL production_batch_id exist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "EnvironmentRecord" er
    LEFT JOIN "production_batches" pb ON pb."id" = er."production_batch_id"
    WHERE pb."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot add EnvironmentRecord.production_batch_id FK: orphan production_batch_id rows exist';
  END IF;
END $$;

ALTER TABLE "EnvironmentRecord" DROP CONSTRAINT IF EXISTS "EnvironmentRecord_production_batch_id_fkey";
ALTER TABLE "EnvironmentRecord" ALTER COLUMN "production_batch_id" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "EnvironmentRecord_production_batch_id_idx"
  ON "EnvironmentRecord"("production_batch_id");

ALTER TABLE "EnvironmentRecord"
  ADD CONSTRAINT "EnvironmentRecord_production_batch_id_fkey"
  FOREIGN KEY ("production_batch_id") REFERENCES "production_batches"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
