# GAP-512 Permission Model Decision Doc Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to execute this plan task-by-task. This is a documentation-only plan. Do not change permission schema, guards, seeds, or runtime behavior. If current code disagrees with this plan, stop and report the mismatch to the main agent.

**Goal:** Document the project's current permission model so future agents and developers know which permission layer is the authority for each use case.

**GAP:** `GAP-512`

**Spec:** Not required. This is a documentation clarification with no schema, code, or historical-data migration.

**Business boundary:** Permissions are a support capability used by all modules. This plan documents existing models and controllers only; it does not choose a new permission architecture.

**Non-goals:**

- Do not change Prisma schema.
- Do not change guards, decorators, controller routes, or seed permissions.
- Do not migrate `User.role` or `User.roleId`.
- Do not implement permission audit log endpoints.
- Do not remove any permission model.

---

## File Map

- Add: `docs/superpowers/specs/2026-05-01-permission-model-decision-guide.md`
- Modify: `docs/module-usage/13-system-admin-ops.md` only if needed to link the new decision guide.
- Modify: `docs/module-usage/98-coverage-matrix.md` only if needed to reference the new decision guide.
- Do not modify server/client source files.

---

## Task 1: Inspect Current Permission Sources

**Files to inspect only:**

- `server/src/prisma/schema.prisma`
- `server/src/modules/permission/`
- `server/src/modules/fine-grained-permission/`
- `server/src/modules/user-permission/`
- `server/src/modules/department-permission/`
- `server/src/modules/permission-log/` if present
- `server/src/common/guards/`
- `server/src/common/decorators/`
- `docs/module-usage/13-system-admin-ops.md`

- [ ] Confirm the current purpose of `Role`, `Permission`, `RolePermission`.
- [ ] Confirm the current purpose of `FineGrainedPermission`, `RoleFineGrainedPermission`, `UserPermission`.
- [ ] Confirm the current purpose of `DepartmentPermission`.
- [ ] Confirm how guards/decorators consume these models.
- [ ] Record uncertainty as "需要后续验证" rather than inventing behavior.

**Acceptance:**

- The new document cites concrete source files for every documented layer.

---

## Task 2: Write The Decision Guide

**File:**

- `docs/superpowers/specs/2026-05-01-permission-model-decision-guide.md`

- [ ] Write in Chinese.
- [ ] Include a short "结论先行" section.
- [ ] Define the authority of each layer:
  - `Role + Permission`: coarse-grained feature/menu/route capability.
  - `FineGrainedPermission`: operation-level permission code and scope.
  - `UserPermission`: user exception grant/expiry.
  - `RoleFineGrainedPermission`: role-level fine-grained grant.
  - `DepartmentPermission`: department/resource data access boundary.
  - `PermissionLog`: permission-change audit fact source.
- [ ] Include a decision tree: "new feature should use which layer?"
- [ ] Include "禁止重复实现" rules.
- [ ] Include "known unresolved issues" for items that are not fixed by this plan, such as `User.role` string migration and permission audit endpoint confirmation.

**Acceptance:**

- A new agent can decide where to add a permission check without reading schema first.
- The guide states that runtime behavior is unchanged.

---

## Task 3: Link The Guide From Module Usage Docs

**Files:**

- `docs/module-usage/13-system-admin-ops.md`
- `docs/module-usage/98-coverage-matrix.md` if appropriate.

- [ ] Add a concise link to the new guide near the permission model sections.
- [ ] Do not rewrite the whole module usage document.
- [ ] Do not mark `GAP-512` as fixed unless this repository's existing convention explicitly updates GAP status during implementation.

**Acceptance:**

- Readers of the system admin module doc can find the permission decision guide.

---

## Task 4: Verification

- [ ] Run:

```bash
rg -n "permission-model-decision-guide|权限模型决策|Role \\+ Permission|FineGrainedPermission|DepartmentPermission" docs
node tools/check-module-usage-docs.mjs
git diff --check
```

**Final report must include:**

- executing-plans skill confirmation.
- Exact files modified.
- Confirmation that no source code/schema was changed.
- Verification command results.
- Any uncertain permission behavior left for follow-up.
