-- TASK-9: Remove FinishedGoodsBatch as a core model.
-- The finished_goods_batches table is PRESERVED for historical audit trail.
-- Only FK constraints are removed so Prisma's schema (which no longer has the model) is consistent.
--
-- Note: The finished_goods_batch_id column on records was already cleaned up in a prior migration.
-- This migration performs a no-op data migration guard + drops the FK if it still exists.

-- Drop the FK constraint from records.finished_goods_batch_id if it exists
-- (column may have already been removed in a prior task)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'records_finished_goods_batch_id_fkey'
      AND table_name = 'records'
  ) THEN
    ALTER TABLE "records" DROP CONSTRAINT "records_finished_goods_batch_id_fkey";
  END IF;
END $$;
