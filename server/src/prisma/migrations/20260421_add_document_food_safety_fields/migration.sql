-- AlterTable: Add food safety metadata fields to Document model (Task 11)
ALTER TABLE "documents" ADD COLUMN "doc_code" TEXT;
ALTER TABLE "documents" ADD COLUMN "doc_level" TEXT;
ALTER TABLE "documents" ADD COLUMN "fill_frequency" TEXT;
ALTER TABLE "documents" ADD COLUMN "retention_years" INTEGER;
ALTER TABLE "documents" ADD COLUMN "reviewer" TEXT;
ALTER TABLE "documents" ADD COLUMN "effective_date" TIMESTAMP(3);
ALTER TABLE "documents" ADD COLUMN "content_md" TEXT;
