-- AddForeignKey: product_id on product_validation_records → products(id)
ALTER TABLE "product_validation_records" ADD CONSTRAINT "product_validation_records_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
