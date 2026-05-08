-- Migration: drop User.role column, make roleId required with RESTRICT on delete

-- Step 1: backfill roleId for any users that still lack one (safety net before NOT NULL)
UPDATE "User" u
SET "roleId" = (SELECT id FROM "Role" WHERE code = 'user' LIMIT 1)
WHERE u."roleId" IS NULL;

-- Step 2: drop old role column
ALTER TABLE "User" DROP COLUMN IF EXISTS "role";

-- Step 3: make roleId NOT NULL
ALTER TABLE "User" ALTER COLUMN "roleId" SET NOT NULL;

-- Step 4: drop old SetNull FK constraint and recreate as RESTRICT
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_roleId_fkey";
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey"
  FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
