-- AlterTable: add is_mandatory snapshot column to cleaning_record_items
ALTER TABLE "cleaning_record_items" ADD COLUMN "is_mandatory" BOOLEAN NOT NULL DEFAULT true;
