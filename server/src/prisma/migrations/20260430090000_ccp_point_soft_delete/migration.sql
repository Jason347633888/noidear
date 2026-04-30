-- AlterTable
ALTER TABLE "ccp_points" ADD COLUMN "deleted_at" TIMESTAMP NULL;

-- CreateIndex
CREATE INDEX "ccp_points_company_id_deleted_at_idx" ON "ccp_points" ("company_id", "deleted_at");
