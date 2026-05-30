-- AddForeignKey
ALTER TABLE "material_allergen_profiles" ADD CONSTRAINT "material_allergen_profiles_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_allergen_profiles" ADD CONSTRAINT "material_allergen_profiles_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
