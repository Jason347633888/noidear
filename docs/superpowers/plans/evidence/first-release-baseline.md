# First Release Baseline Evidence

> Captured at the start of executing `09-implementation-plan-01-首发闭环切片.md`
> Branch: `feat/first-release-closed-loop` (off `master` @ c291e7b7)

## Git

- HEAD: `c291e7b7969355f4b250c235e876c75f23b68d7f`
- Dirty files at branch creation: `AGENTS.md`, `CLAUDE.md` (gitnexus auto-edits), `packages/.DS_Store`, `tmp/` (untracked). None block the plan.

## Prisma

- `npx prisma generate --schema src/prisma/schema.prisma`: ✅ Generated Prisma Client v5.22.0
- `npx prisma validate --schema src/prisma/schema.prisma`: ✅ schema is valid (env loaded from `server/.env`)

## Environment

- DB: `noidear-postgres` docker container (`postgres:15-alpine`), `localhost:5432`.
- `server/.env` created from `.env.example` with real local creds (`noidear` / `document_system`). `.env` files added to `.gitignore`.
- DB already migrated: `public` schema has **118 tables**.

## Table Counts

All 8 destructive-cleanup target tables are **empty**, so destructive schema changes lose **no business data**. A full dev-DB reset is therefore unnecessary; schema migrations can be applied directly.

| table | row_count | action |
| --- | ---: | --- |
| material_batches | 0 | empty — no reset needed before destructive cleanup |
| incoming_inspections | 0 | empty — no reset needed before destructive cleanup |
| material_inbounds | 0 | empty — no reset needed before destructive cleanup |
| material_inbound_items | 0 | empty — no reset needed before destructive cleanup |
| inventory_movements | 0 | empty — no reset needed before destructive cleanup |
| production_batches | 0 | empty — no reset needed before destructive cleanup |
| batch_material_usages | 0 | empty — no reset needed before destructive cleanup |
| traceability_snapshots | 0 | empty — no reset needed before destructive cleanup |

## Old-Code Scan (runtime footprint, excluding node_modules/dist/docs/.claude noise)

Scan command: `rg "RecordTemplate|ModelLanding|supplier_lot_no|material_batch_id" server client`
(606 raw matches across 122 files, but the vast majority are in `docs/`, `.claude/`, migration SQL, and code comments — not runtime source.)

| pattern | runtime source matches | assigned to | notes |
| --- | --- | --- | --- |
| `supplier_lot_no` | `server/src/prisma/schema.prisma` only | **Task 5** | delete field; canonical is `supplierBatchNo` |
| `material_batch_id` | `schema.prisma`, `incoming-inspection.service.ts`, `incoming-inspection/dto/create-inspection.dto.ts`, `client incoming-inspection view + api`, `workflow-triggers.service.ts` | **Task 4** | demote to post-release back-link; not a creation input |
| `@@unique([productionBatchId, materialBatchId])` | `server/src/prisma/schema.prisma` (1) | **Task 7** | delete; replaced by `executionLineId`-aware index |
| `RecordTemplate` | migration SQL (allowed) + `seed-e2e.ts` (a **comment** only) + 1 spec | — | already retired (PR #218); only allowed residuals remain |
| `ModelLanding` | **none in `server/src` or `client/src`** | — | already removed; no runtime dependency |

### Residual-match risk flagged for Task 11

Task 11's final scan greps `RecordTemplate|ModelLanding|...` over all of `server client` and expects "no runtime old dependency remains". The remaining `RecordTemplate` hits are migration SQL, a code comment in `seed-e2e.ts`, and a test — all **allowed residuals**. `workflow-triggers.service.ts` still references `material_batch_id`; if Task 4 does not touch it, Task 11 must classify it as either in-scope cleanup or an explicitly documented out-of-scope residual.
