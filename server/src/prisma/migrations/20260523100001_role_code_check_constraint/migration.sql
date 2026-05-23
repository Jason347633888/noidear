-- Spec: roles.code 仅允许 admin/leader/user
--
-- Preflight: remove any custom roles not in the allowed set before adding the enum check.
-- This system no longer supports custom role codes; only 'admin', 'leader', and 'user' are valid.
-- If your environment has roles with other codes, they will be deleted here.
-- This statement is a no-op if no such rows exist.
DELETE FROM "roles" WHERE code NOT IN ('admin', 'leader', 'user');

ALTER TABLE "roles"
  ADD CONSTRAINT "roles_code_enum_chk"
  CHECK (code IN ('admin', 'leader', 'user'));
