-- Require every ReworkRecord to link to a real current-company NonConformance.
-- This migration intentionally fails if legacy data cannot satisfy the constraint.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "ReworkRecord"
    WHERE "nc_id" IS NULL OR btrim("nc_id") = ''
  ) THEN
    RAISE EXCEPTION 'Cannot require ReworkRecord.nc_id: legacy rows with NULL or empty nc_id exist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "ReworkRecord" rw
    LEFT JOIN "NonConformance" nc ON nc."id" = rw."nc_id"
    WHERE nc."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot add ReworkRecord.nc_id FK: orphan nc_id rows exist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "ReworkRecord" rw
    JOIN "NonConformance" nc ON nc."id" = rw."nc_id"
    WHERE rw."company_id" <> nc."company_id"
  ) THEN
    RAISE EXCEPTION 'Cannot add ReworkRecord.nc_id FK: cross-company NC links exist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "ReworkRecord" rw
    JOIN "NonConformance" nc ON nc."id" = rw."nc_id"
    WHERE nc."source_type" = 'production_batch'
      AND rw."production_batch_id" <> nc."source_id"
  ) THEN
    RAISE EXCEPTION 'Cannot add ReworkRecord.nc_id FK: production batch does not match NC source_id';
  END IF;
END $$;

ALTER TABLE "ReworkRecord" DROP CONSTRAINT IF EXISTS "ReworkRecord_nc_id_fkey";
ALTER TABLE "ReworkRecord" ALTER COLUMN "nc_id" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "ReworkRecord_nc_id_idx"
  ON "ReworkRecord"("nc_id");

ALTER TABLE "ReworkRecord"
  ADD CONSTRAINT "ReworkRecord_nc_id_fkey"
  FOREIGN KEY ("nc_id") REFERENCES "NonConformance"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
