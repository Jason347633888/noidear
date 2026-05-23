-- Drop FK-bearing tables first, then parent tables
DROP TABLE IF EXISTS "user_permissions" CASCADE;
DROP TABLE IF EXISTS "role_permissions" CASCADE;
DROP TABLE IF EXISTS "role_fine_grained_permissions" CASCADE;
DROP TABLE IF EXISTS "department_permissions" CASCADE;
DROP TABLE IF EXISTS "fine_grained_permissions" CASCADE;
DROP TABLE IF EXISTS "permissions" CASCADE;
