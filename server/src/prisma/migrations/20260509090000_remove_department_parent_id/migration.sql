-- Migration: Remove Department.parentId (single-level department enforcement)
-- This removes the tree hierarchy from departments, making them flat.

-- Drop the self-referential foreign key constraint first
ALTER TABLE "departments" DROP CONSTRAINT IF EXISTS "departments_parentId_fkey";

-- Drop the parentId column
ALTER TABLE "departments" DROP COLUMN IF EXISTS "parentId";
