# Task 13 — Retained Sample & Release Decision Baseline Audit

**Date:** 2026-05-30  
**Git HEAD:** d4043230a8b05edf8973b35937fde146b6f01dc5  
**Branch:** worktree-feat+v1-full-closure

## Prisma Validation

```
Prisma schema loaded from server/src/prisma/schema.prisma
The schema at server/src/prisma/schema.prisma is valid 🚀
```

## Forbidden Model Scan

```
rg "model (RetainedSample|RetainedSampleInspection|ShelfLifeStudy|ReleaseDecision)" server/src/prisma/schema.prisma
(no output)
```

**Conclusion:** No `RetainedSample`, `RetainedSampleInspection`, `ShelfLifeStudy`, or `ReleaseDecision` Prisma models exist. Clean baseline confirmed.

## RecordTemplate / ModelLanding / Form Scan

```
rg "RecordTemplate|ModelLanding|SampleForm|ShelfLifeForm|ReleaseForm" server client packages
```

Matches found only in:
- `server/src/prisma/migrations/` — historical migration SQL (tables already dropped)
- `server/coverage/` — stale coverage report HTML/JSON artifacts (not active code)
- `server/src/modules/record-template/template-alias.controller.spec.ts` — legacy spec file referencing retired service (not a Prisma model)
- `server/src/prisma/seed-e2e.ts` — comment-only reference (`// DeviationReport 不再关联 Record/RecordTemplate`)

**Conclusion:** No active `RecordTemplate`, `ModelLanding`, `SampleForm`, `ShelfLifeForm`, or `ReleaseForm` Prisma models exist in current source code.

## Domain Models Confirmed Present in Schema

The following models exist in `server/src/prisma/schema.prisma` and are the foundation for Phase 13:

- `Sample` — maps to table `samples`
- `InspectionRecord` — maps to table `inspection_records`
- `InspectionRecordItem` — maps to table `inspection_record_items`
- `ProductionBatch` — maps to table `production_batches`
- `ApprovalInstance` — maps to table `approval_instances`

## Baseline Row Counts

| Table | Count |
|-------|-------|
| samples | 0 |
| inspection_records | 0 |
| production_batches | 0 |
| approval_instances | 0 |

All tables empty — clean baseline confirmed for Phase 13 implementation.
