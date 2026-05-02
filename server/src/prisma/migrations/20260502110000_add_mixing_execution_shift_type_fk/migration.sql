-- Link MixingExecution.shift_type_id to ShiftType without guessing historical values.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "mixing_executions" me
    LEFT JOIN "shift_types" st ON st."id" = me."shift_type_id"
    WHERE me."shift_type_id" IS NOT NULL
      AND st."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot add MixingExecution.shift_type_id FK: orphan shift_type_id rows exist';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "mixing_executions_shift_type_id_idx"
  ON "mixing_executions"("shift_type_id");

ALTER TABLE "mixing_executions"
  ADD CONSTRAINT "mixing_executions_shift_type_id_fkey"
  FOREIGN KEY ("shift_type_id") REFERENCES "shift_types"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
