-- Add a controlled area reference for EnvironmentRecord while preserving legacy location snapshots.
-- Existing rows keep location_id NULL; historical text mapping requires a separate data governance task.

ALTER TABLE "EnvironmentRecord"
  ADD COLUMN "location_id" TEXT;

CREATE INDEX "EnvironmentRecord_location_id_idx"
  ON "EnvironmentRecord"("location_id");

CREATE INDEX "EnvironmentRecord_company_id_location_id_measured_at_idx"
  ON "EnvironmentRecord"("company_id", "location_id", "measured_at");

ALTER TABLE "EnvironmentRecord"
  ADD CONSTRAINT "EnvironmentRecord_location_id_fkey"
  FOREIGN KEY ("location_id") REFERENCES "workshop_areas"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
