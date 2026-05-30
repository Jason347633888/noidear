-- AlterTable: make item_name nullable so NULL = optional item (pending_verification path)
-- and non-NULL = mandatory item (blocks submission on fail).
ALTER TABLE "maintenance_record_items" ALTER COLUMN "item_name" DROP NOT NULL;
