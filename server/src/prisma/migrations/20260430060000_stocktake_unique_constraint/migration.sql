-- CreateIndex
CREATE UNIQUE INDEX "staging_area_stocktakes_area_id_batchId_kind_work_date_shift_type_id_key" ON "staging_area_stocktakes"("area_id", "batchId", "kind", "work_date", "shift_type_id");
