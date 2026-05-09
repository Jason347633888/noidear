-- Migration: Add SupplierEvaluationStatus enum and upgrade supplier_status column
-- Supplier.evaluationStatus (DB: supplier_status) is the qualification evaluation status,
-- independent from Supplier.status (operational active/disabled status).

-- Create enum type
CREATE TYPE "SupplierEvaluationStatus" AS ENUM ('pending', 'approved', 'suspended', 'eliminated');

-- Alter column type (existing values are all valid enum members)
ALTER TABLE "suppliers" ALTER COLUMN "supplier_status" TYPE "SupplierEvaluationStatus" USING "supplier_status"::"SupplierEvaluationStatus";
