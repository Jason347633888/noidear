-- Restore BatchMixingAggregation as a true many-to-many bridge.
-- Keep productionBatchId + mixingExecutionId unique, but allow the same
-- mixing execution to be linked to multiple product batches.

DROP INDEX IF EXISTS "agg_exec_unique";

CREATE INDEX IF NOT EXISTS "batch_mixing_aggregations_mixingExecutionId_idx"
  ON "batch_mixing_aggregations" ("mixingExecutionId");
