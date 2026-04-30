-- Remove `draft` from MixingExecutionStatus enum.
-- Postgres does not support DROP VALUE on an enum; rename + recreate + swap.

-- 1. Migrate any existing draft rows to confirmed (createExecution always
--    writes 'confirmed' now, so draft rows can only come from old default).
UPDATE "mixing_executions" SET "status" = 'confirmed' WHERE "status" = 'draft';

-- 2. Drop the column default so we can change the type without a USING clash.
ALTER TABLE "mixing_executions" ALTER COLUMN "status" DROP DEFAULT;

-- 3. Swap the enum.
ALTER TYPE "MixingExecutionStatus" RENAME TO "MixingExecutionStatus_old";
CREATE TYPE "MixingExecutionStatus" AS ENUM ('confirmed', 'voided');
ALTER TABLE "mixing_executions"
  ALTER COLUMN "status" TYPE "MixingExecutionStatus"
  USING "status"::text::"MixingExecutionStatus";
DROP TYPE "MixingExecutionStatus_old";

-- 4. Restore default at the new value.
ALTER TABLE "mixing_executions" ALTER COLUMN "status" SET DEFAULT 'confirmed';
