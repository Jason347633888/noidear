-- Link every document issuance ledger row to the controlled Document fact source.
-- Historical rows are matched only by exact document_code against Document.doc_code or Document.number.
-- The migration intentionally fails when a row cannot be matched uniquely.
--
-- Safety: all preflight checks run BEFORE any DDL so that a failed preflight
-- leaves the schema unchanged and the migration is safe to re-run.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "DocumentIssuance" di
    WHERE di."document_code" IS NULL OR btrim(di."document_code") = ''
  ) THEN
    RAISE EXCEPTION 'Cannot backfill DocumentIssuance.document_id: legacy rows without document_code exist';
  END IF;

  IF EXISTS (
    WITH candidates AS (
      SELECT di."id" AS issuance_id, d."id" AS document_id
      FROM "DocumentIssuance" di
      JOIN "documents" d
        ON d."deletedAt" IS NULL
       AND (d."doc_code" = di."document_code" OR d."number" = di."document_code")
    )
    SELECT 1
    FROM candidates
    GROUP BY issuance_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot backfill DocumentIssuance.document_id: document_code matches multiple Documents';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "DocumentIssuance" di
    WHERE NOT EXISTS (
      SELECT 1 FROM "documents" d
      WHERE d."deletedAt" IS NULL
        AND (d."doc_code" = di."document_code" OR d."number" = di."document_code")
    )
  ) THEN
    RAISE EXCEPTION 'Cannot require DocumentIssuance.document_id: unmatched legacy rows exist';
  END IF;
END $$;

ALTER TABLE "DocumentIssuance"
  ADD COLUMN "document_id" TEXT;

UPDATE "DocumentIssuance" di
SET "document_id" = matched."document_id"
FROM (
  SELECT di_inner."id" AS issuance_id, MAX(d."id") AS document_id
  FROM "DocumentIssuance" di_inner
  JOIN "documents" d
    ON d."deletedAt" IS NULL
   AND (d."doc_code" = di_inner."document_code" OR d."number" = di_inner."document_code")
  GROUP BY di_inner."id"
) matched
WHERE di."id" = matched."issuance_id";

ALTER TABLE "DocumentIssuance" ALTER COLUMN "document_id" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "DocumentIssuance_document_id_idx"
  ON "DocumentIssuance"("document_id");

ALTER TABLE "DocumentIssuance"
  ADD CONSTRAINT "DocumentIssuance_document_id_fkey"
  FOREIGN KEY ("document_id") REFERENCES "documents"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
