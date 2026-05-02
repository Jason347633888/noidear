-- Add scheduled team binding to shift instances.
-- Historical shift instances remain unbound because the responsible team cannot be inferred safely.

ALTER TABLE "team_shift_schedules"
  ADD COLUMN "leader_id" TEXT;

ALTER TABLE "shift_instances"
  ADD COLUMN "team_id" TEXT,
  ADD COLUMN "leader_id" TEXT,
  ADD COLUMN "team_override_reason" TEXT;

CREATE INDEX IF NOT EXISTS "shift_instances_team_id_idx"
  ON "shift_instances"("team_id");

ALTER TABLE "shift_instances"
  ADD CONSTRAINT "shift_instances_team_id_fkey"
  FOREIGN KEY ("team_id") REFERENCES "teams"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
