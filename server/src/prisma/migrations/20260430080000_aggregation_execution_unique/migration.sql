-- Enforce: a mixing execution can only be aggregated to a single product batch.
-- BatchMixingAggregation has no quantity-split column, so a 1-to-N link would
-- double-count the same set of material usages across batches.

-- Drop the standalone index — the UNIQUE constraint below subsumes it.
DROP INDEX IF EXISTS "batch_mixing_aggregations_mixingExecutionId_idx";

-- Create the unique constraint.
CREATE UNIQUE INDEX "agg_exec_unique" ON "batch_mixing_aggregations"("mixingExecutionId");
