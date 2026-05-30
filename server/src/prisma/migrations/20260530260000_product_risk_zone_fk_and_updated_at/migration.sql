-- AlterTable: add updated_at column to product_risk_zones
ALTER TABLE "product_risk_zones" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AddForeignKey
ALTER TABLE "product_risk_zones" ADD CONSTRAINT "product_risk_zones_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
