-- Link ShiftInstance to ShiftType while preserving shift_type as a legacy display snapshot.
-- This migration only auto-maps the two legacy values that the current DTO allowed.

ALTER TABLE "shift_instances" ADD COLUMN "shift_type_id" TEXT;

INSERT INTO "shift_types" ("id", "code", "name", "start_time", "end_time", "crosses_day", "active", "created_at", "updated_at")
SELECT 'shift-type-day', 'DAY', '白班', '08:00', '20:00', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "shift_types" WHERE "code" = 'DAY' OR "name" = '白班'
);

INSERT INTO "shift_types" ("id", "code", "name", "start_time", "end_time", "crosses_day", "active", "created_at", "updated_at")
SELECT 'shift-type-night', 'NIGHT', '夜班', '20:00', '08:00', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "shift_types" WHERE "code" = 'NIGHT' OR "name" = '夜班'
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "shift_instances"
    WHERE "shift_type" NOT IN ('白班', '夜班')
  ) THEN
    RAISE EXCEPTION 'Cannot backfill shift_instances.shift_type_id: unknown legacy shift_type exists';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      SELECT "name"
      FROM "shift_types"
      WHERE "name" IN ('白班', '夜班')
      GROUP BY "name"
      HAVING COUNT(*) > 1
    ) duplicated
  ) THEN
    RAISE EXCEPTION 'Cannot backfill shift_instances.shift_type_id: duplicate ShiftType names for legacy values';
  END IF;
END $$;

UPDATE "shift_instances" si
SET "shift_type_id" = st."id"
FROM "shift_types" st
WHERE si."shift_type" = st."name"
  AND si."shift_type_id" IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "shift_instances" WHERE "shift_type_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot require shift_instances.shift_type_id: unmapped legacy rows remain';
  END IF;
END $$;

ALTER TABLE "shift_instances" ALTER COLUMN "shift_type_id" SET NOT NULL;

CREATE UNIQUE INDEX "shift_instances_company_id_shift_type_id_shift_date_key"
  ON "shift_instances"("company_id", "shift_type_id", "shift_date");

CREATE INDEX "shift_instances_shift_type_id_idx"
  ON "shift_instances"("shift_type_id");

ALTER TABLE "shift_instances"
  ADD CONSTRAINT "shift_instances_shift_type_id_fkey"
  FOREIGN KEY ("shift_type_id") REFERENCES "shift_types"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
