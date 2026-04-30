-- Add new TodoType enum value for product process change execution failures.
-- NOTE: Postgres forbids using a newly-added enum value within the same transaction
-- that adds it. Keep this migration single-statement; do not consume the new value
-- in any UPDATE/INSERT in this file.

-- AlterEnum
ALTER TYPE "TodoType" ADD VALUE 'change_execution_failed';
