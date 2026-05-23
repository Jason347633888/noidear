-- Spec: roles.code 仅允许 admin/leader/user
--
-- Preflight: Raise an error if any custom role codes exist that would violate the constraint.
-- This ensures the migration fails loudly (instead of silently dropping data) and prompts
-- the operator to manually reassign users before running the migration.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "roles" WHERE code NOT IN ('admin', 'leader', 'user')) THEN
    RAISE EXCEPTION 'Migration blocked: custom role codes exist. Reassign all users to admin/leader/user roles before running this migration. Run: SELECT id, code, name FROM roles WHERE code NOT IN (''admin'',''leader'',''user'');';
  END IF;
END $$;

ALTER TABLE "roles"
  ADD CONSTRAINT "roles_code_enum_chk"
  CHECK (code IN ('admin', 'leader', 'user'));
