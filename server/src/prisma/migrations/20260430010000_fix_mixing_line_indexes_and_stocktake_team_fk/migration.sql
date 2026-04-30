-- CreateIndex
CREATE INDEX "mixing_execution_lines_executionId_idx" ON "mixing_execution_lines"("executionId");

-- CreateIndex
CREATE INDEX "mixing_execution_lines_stagingAreaStockId_idx" ON "mixing_execution_lines"("stagingAreaStockId");

-- AddForeignKey
ALTER TABLE "staging_area_stocktakes" ADD CONSTRAINT "staging_area_stocktakes_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
