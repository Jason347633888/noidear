-- CreateIndex
CREATE UNIQUE INDEX "stocktakes_shift_unique" ON "staging_area_stocktakes"("area_id", "batchId", "kind", "work_date", "shift_type_id");
