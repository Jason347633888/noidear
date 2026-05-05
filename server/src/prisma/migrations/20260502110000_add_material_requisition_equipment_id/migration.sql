-- Link maintenance material requisitions to the Equipment ledger.
-- Existing rows remain nullable because no trusted historical equipment mapping exists.

ALTER TABLE "material_requisitions"
  ADD COLUMN "equipmentId" TEXT;

CREATE INDEX IF NOT EXISTS "material_requisitions_equipmentId_idx"
  ON "material_requisitions"("equipmentId");

ALTER TABLE "material_requisitions"
  ADD CONSTRAINT "material_requisitions_equipmentId_fkey"
  FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
