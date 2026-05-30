-- Phase 13 Task 6: Add production batch release gate
-- Adds released_by_id FK on production_batches (keeps existing released_by Int? untouched)

ALTER TABLE "production_batches" ADD COLUMN IF NOT EXISTS "released_by_id" TEXT;

ALTER TABLE "production_batches"
  ADD CONSTRAINT "production_batches_released_by_id_fkey"
  FOREIGN KEY ("released_by_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "production_batches_released_by_id_idx" ON "production_batches"("released_by_id");
