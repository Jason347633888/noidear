ALTER TABLE "document_references"
ADD COLUMN "wikilinkTarget" TEXT;

UPDATE "document_references"
SET "wikilinkTarget" = substring("sectionId" from 10)
WHERE "relationType" = 'WIKILINK'
  AND "wikilinkTarget" IS NULL
  AND "sectionId" LIKE 'wikilink:%';

CREATE INDEX "document_references_wikilinkTarget_idx"
ON "document_references"("wikilinkTarget");
