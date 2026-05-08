-- Migration: drop users.role column, make roleId required with RESTRICT on delete
-- This migration is data-safe: it ensures system roles exist before backfilling,
-- maps legacy users.role values to roles.code, and handles unknown/NULL legacy roles.

-- Step 1: Ensure system role rows exist (idempotent - safe to run on any deployment)
INSERT INTO roles (id, code, name, "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'admin', '系统管理员', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE code = 'admin');

INSERT INTO roles (id, code, name, "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'leader', '部门负责人', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE code = 'leader');

INSERT INTO roles (id, code, name, "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'user', '普通用户', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE code = 'user');

-- Step 2: Backfill roleId for users with NULL roleId using legacy role column value
-- Maps admin→admin, leader→leader, user→user
UPDATE users u
SET "roleId" = r.id
FROM roles r
WHERE u."roleId" IS NULL
  AND u.role IS NOT NULL
  AND r.code = u.role;

-- Step 3: For users with unknown or NULL legacy role, default to 'user'
UPDATE users u
SET "roleId" = (SELECT id FROM roles WHERE code = 'user' LIMIT 1)
WHERE u."roleId" IS NULL;

-- Step 4: Drop old role column
ALTER TABLE users DROP COLUMN IF EXISTS role;

-- Step 5: Make roleId NOT NULL
ALTER TABLE users ALTER COLUMN "roleId" SET NOT NULL;

-- Step 6: Drop old SetNull FK constraint and recreate as RESTRICT
ALTER TABLE users DROP CONSTRAINT IF EXISTS "users_roleId_fkey";
ALTER TABLE users ADD CONSTRAINT "users_roleId_fkey"
  FOREIGN KEY ("roleId") REFERENCES roles(id) ON DELETE RESTRICT ON UPDATE CASCADE;
