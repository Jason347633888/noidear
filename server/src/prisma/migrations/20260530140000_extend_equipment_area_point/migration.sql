-- Task 11-T2: Extend equipment with area_point_id linkage
-- Applied via db push; this migration file records the intent for history.

ALTER TABLE "equipment" ADD COLUMN IF NOT EXISTS "area_point_id" TEXT;

ALTER TABLE "equipment"
  ADD CONSTRAINT "equipment_area_point_id_fkey"
  FOREIGN KEY ("area_point_id") REFERENCES "workshop_areas"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "equipment_area_point_id_idx" ON "equipment"("area_point_id");
