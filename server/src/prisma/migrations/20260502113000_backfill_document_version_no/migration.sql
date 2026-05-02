-- GAP-400: preserve legacy Decimal documents.version while ensuring current display can rely on documents.versionNo.
-- Only backfill legacy major versions. Decimal 1.1/1.2 file-upload history remains V1 by design.

UPDATE "documents"
SET "versionNo" = GREATEST(1, FLOOR("version")::integer)
WHERE "versionNo" <= 1
  AND "version" >= 2.0;
