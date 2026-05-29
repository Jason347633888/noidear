# Closeout

## Status: COMPLETE

- **Merged:** `feat/simple-role-module-access` → `master` (local merge, 2026-05-24)
- **Merge commit:** `0115af27` (merge) + `56cc0b33` (fix coverage.spec)
- **Tests:** 1262 passed, 0 failed (189 suites)
- **Worktree cleaned up:** `.worktrees/feat-simple-role-module-access` removed
- **Feature branch deleted:** `feat/simple-role-module-access` (was `0a5c6d7c`)

## Accepted Residuals

None — all 26 Reviewer rounds resolved.

## Design Trade-offs Recorded

| Decision | Rationale |
|---|---|
| `ModuleAccessConfig` missing row = module enabled | Avoids "disable everything on fresh install" footgun |
| `OwnershipScope` injected via `@Ownership()` decorator, not middleware | Keeps scope inside controller layer; no request context leak |
| `buildOwnershipWhere` returns `null` for admin | Admin bypass is explicit, not a special where clause |
| `visibleProductionBatchIds` validated before `$transaction` | Early-exit prevents partial inventory writes |
| `MODULE_REGISTRY_STRICT=true` as docker-compose default | Catches empty-path controllers at startup in deployed envs |
| `coverage.spec.ts` mocks `PrismaService` | Prevents `app.init()` → `$connect()` in unit-test environments without `DATABASE_URL` |

## Post-Merge Fix

`coverage.spec.ts` (added on master via earlier sync) failed in unit-test
environment because it calls `app.init()` which triggers `PrismaService.onModuleInit()
→ $connect()` without a live `DATABASE_URL`. Fixed by adding
`.overrideProvider(PrismaService).useValue(...)` to the test module builder.
