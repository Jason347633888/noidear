-- Phase 14 Task 4: Add locked_snapshot_id to product_recalls
-- Stores the immutable TraceabilitySnapshot that locks the recall scope.
-- Live data changes after this snapshot is created do NOT alter the recall scope.

ALTER TABLE "product_recalls"
  ADD COLUMN "locked_snapshot_id" TEXT;

ALTER TABLE "product_recalls"
  ADD CONSTRAINT "product_recalls_locked_snapshot_id_fkey"
    FOREIGN KEY ("locked_snapshot_id")
    REFERENCES "traceability_snapshots"("id")
    ON DELETE SET NULL;

CREATE INDEX "product_recalls_locked_snapshot_id_idx"
  ON "product_recalls"("locked_snapshot_id");
