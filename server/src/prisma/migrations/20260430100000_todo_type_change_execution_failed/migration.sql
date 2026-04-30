-- Add new TodoType enum value for product process change execution failures.

-- AlterEnum
ALTER TYPE "TodoType" ADD VALUE 'change_execution_failed';
