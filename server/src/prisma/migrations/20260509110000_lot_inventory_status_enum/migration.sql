-- Migration: Add LotInventoryStatus enum and upgrade lot_status column
-- MaterialBatch.lotStatus (DB: lot_status) is the inventory flow status,
-- independent from MaterialBatch.status (BatchStatus - QC quality/lock status).

-- Create enum type
CREATE TYPE "LotInventoryStatus" AS ENUM ('in_stock', 'consumed', 'nonconforming', 'quarantined', 'disposed');

-- Alter column type (existing values are all valid enum members)
ALTER TABLE "material_batches" ALTER COLUMN "lot_status" TYPE "LotInventoryStatus" USING "lot_status"::"LotInventoryStatus";
