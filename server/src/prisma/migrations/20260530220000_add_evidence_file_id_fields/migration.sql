-- Task 9: Add evidence_file_id to equipment, calibration_record, maintenance_record
-- and evidence_file_id to metal_detection_logs
-- Applied via db push; this migration file records the intent for history.

ALTER TABLE "equipment" ADD COLUMN IF NOT EXISTS "evidence_file_id" TEXT;

ALTER TABLE "calibration_records" ADD COLUMN IF NOT EXISTS "evidence_file_id" TEXT;

ALTER TABLE "maintenance_records" ADD COLUMN IF NOT EXISTS "evidence_file_id" TEXT;

ALTER TABLE "metal_detection_logs" ADD COLUMN IF NOT EXISTS "evidence_file_id" TEXT;
