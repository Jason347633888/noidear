-- Spec: roles.code 仅允许 admin/leader/user
ALTER TABLE "roles"
  ADD CONSTRAINT "roles_code_enum_chk"
  CHECK (code IN ('admin', 'leader', 'user'));
