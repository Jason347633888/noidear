# First Release Verification Evidence

> Branch `feat/first-release-closed-loop` (PR #219). Captured after the review-fix round.
> Scope: **first-release main-chain foundation** (NOT a fully closeable business loop — see Deferred).

## Old Dependency Scan (runtime source)

| command | result | allowed residuals |
| --- | --- | --- |
| `rg "supplier_lot_no\|RecordTemplate\|ModelLanding\|EggRoomBigForm\|DailyWorkshopForm\|QualityDailyForm\|PointMonitorRecord" server/src client/src` | clean | only a code comment in `seed-e2e.ts:852` (RecordTemplate); migration SQL |
| `rg "material_batch_id" server/src/modules/incoming-inspection client/src/api/incoming-inspection.ts client/src/views/incoming-inspection` | clean | only: creation-reject guard, null-on-create, response payload, idempotency backlink, query filter — no creation input |
| `rg "@@unique\(\[productionBatchId, materialBatchId\]\)" server/src/prisma/schema.prisma` | gone | replaced by `@@index([productionBatchId, materialBatchId, executionLineId])` |

## Verification Commands

| command | result |
| --- | --- |
| `npx prisma generate` | ✅ Generated Prisma Client v5.22.0 |
| `npx prisma validate` | ✅ schema valid |
| `npx prisma migrate status` | ✅ up to date (78 migrations incl. `20260529000000`–`20260529080000`) |
| `npm run test -w client` | ✅ 53 files / 248 tests pass |
| `npm run build:client` | ✅ built clean |
| `npm run build:server` | ✅ exit 0 (after deleting the pre-existing `record-task-instance` orphan) |
| `npx jest --runInBand --forceExit` (server) | ✅ **1161/1161 tests pass**; 4 suites fail to LOAD (pre-existing orphans, see below) |

Note: the unfiltered server suite needs `--forceExit` because some pre-existing tests leak open handles (async ops not closed), which otherwise prevents Jest from exiting. The tests themselves complete in ~13s.

## Pre-existing baseline failures (NOT caused by this PR — documented per plan §Task 11)

4 server test suites fail to RUN (load-time `Cannot find module` for sources deleted by earlier refactors, e.g. the dynamic-form-platform retirement). None are in this PR's diff:

- `task/task.service.department-filter.spec.ts` → missing `./task.service`
- `record/record.service.ownership.spec.ts` → missing `./record.service`
- `record-template/template-alias.controller.spec.ts` → missing source
- `document/document.controller.spec.ts` → load failure

(The pre-existing `record-task/record-task-instance.controller.ts` orphan that broke `build:server` WAS deleted in this PR — it was dead code registered in no module.)

## Main-chain proof (foundation)

- supplier/material → inbound: ✅ (existing inbound + Task 4)
- inbound → final inspection: ✅ inspection binds to `material_inbound_item_id`
- final inspection → material batch: ✅ gated `releaseFinalInspection` (concurrency-safe atomic claim), pass/conditional_pass only
- material batch → inventory movement: ✅ `InventoryMovement(receive)` authoritative + `StockRecord` projection
- production plan → tasks: ✅ `releasePlan` derives mixing/inspection/packaging tasks
- mixing execution → material usage: ✅ wired — `createExecution` (with validated `productionBatchId`: product/recipe/status checked) auto-generates `BatchMaterialUsage` per line in-transaction
- material usage → production batch: ✅ via `BatchMaterialUsage.productionBatchId` (+ `executionLineId` trace bridge); usages protected from public delete
- inspection item → nonconformance: ✅ `InspectionRecordItem` → `NonConformance.source_item_id`
- production batch → trace snapshot: ✅ `createTraceContextSnapshot` (production_batch-only root, bounded depth, frozen facts)
- trace snapshot → evidence export: ⚠️ **framework only** — formal `EvidenceExport` requires `ProductionBatch.status='completed'`, which needs finished-goods intake + batch-close (DEFERRED). Currently produces preview/incomplete snapshots; formal export is a follow-up.

## Deferred (out of this PR's scope — follow-up tasks)

- Finished-goods intake (`InventoryMovement(production_in)`) + batch-close → enables formal evidence `completed`.
- Evidence export binary PDF rendering (currently placeholder filePath; JSON `dataSnapshot` is authoritative).
- `InventoryMovement.company_id` multi-tenancy (single-tenant default `1`).
- The 4 pre-existing orphan test suites above (separate cleanup).
