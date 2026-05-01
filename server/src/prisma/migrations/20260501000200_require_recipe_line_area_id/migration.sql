-- Require every recipe line to link to a WorkshopArea.
-- This migration intentionally fails if legacy data cannot satisfy the constraint.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "recipe_lines" WHERE "area_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot require recipe_lines.area_id: legacy rows with NULL area_id exist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "recipe_lines" rl
    LEFT JOIN "workshop_areas" wa ON wa."id" = rl."area_id"
    WHERE wa."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot add recipe_lines.area_id FK: orphan area_id rows exist';
  END IF;
END $$;

ALTER TABLE "recipe_lines" DROP CONSTRAINT IF EXISTS "recipe_lines_area_id_fkey";
ALTER TABLE "recipe_lines" ALTER COLUMN "area_id" SET NOT NULL;

ALTER TABLE "recipe_lines"
  ADD CONSTRAINT "recipe_lines_area_id_fkey"
  FOREIGN KEY ("area_id") REFERENCES "workshop_areas"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
