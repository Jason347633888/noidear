-- Soft-delete column for CCPPoint; subsequent tasks filter deleted_at IS NULL.

-- AlterTable
ALTER TABLE "ccp_points" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ccp_points_company_id_deleted_at_idx" ON "ccp_points" ("company_id", "deleted_at");
