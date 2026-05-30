-- AlterTable: add optional equipment_id column to metal_detection_logs
ALTER TABLE "metal_detection_logs" ADD COLUMN IF NOT EXISTS "equipment_id" TEXT;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'metal_detection_logs_equipment_id_fkey'
      AND table_name = 'metal_detection_logs'
  ) THEN
    ALTER TABLE "metal_detection_logs"
      ADD CONSTRAINT "metal_detection_logs_equipment_id_fkey"
      FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END;
$$;
