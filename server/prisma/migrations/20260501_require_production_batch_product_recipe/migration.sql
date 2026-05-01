-- Require every production batch to link to Product and Recipe.
-- This migration intentionally fails if legacy data cannot satisfy the constraint.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "production_batches" WHERE "productId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot require production_batches.productId: legacy rows with NULL productId exist';
  END IF;

  IF EXISTS (SELECT 1 FROM "production_batches" WHERE "recipeId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot require production_batches.recipeId: legacy rows with NULL recipeId exist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "production_batches" pb
    LEFT JOIN "products" p ON p."id" = pb."productId"
    WHERE p."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot add production_batches.productId FK: orphan productId rows exist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "production_batches" pb
    LEFT JOIN "recipes" r ON r."id" = pb."recipeId"
    WHERE r."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot add production_batches.recipeId FK: orphan recipeId rows exist';
  END IF;
END $$;

ALTER TABLE "production_batches" ALTER COLUMN "productId" SET NOT NULL;
ALTER TABLE "production_batches" ALTER COLUMN "recipeId" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "production_batches_productId_idx" ON "production_batches"("productId");
CREATE INDEX IF NOT EXISTS "production_batches_recipeId_idx" ON "production_batches"("recipeId");

ALTER TABLE "production_batches"
  ADD CONSTRAINT "production_batches_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "production_batches"
  ADD CONSTRAINT "production_batches_recipeId_fkey"
  FOREIGN KEY ("recipeId") REFERENCES "recipes"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
