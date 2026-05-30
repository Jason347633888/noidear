# Plan 10 Quality Cleaning Baseline Evidence

## Git

- HEAD: 1ed99b516514774c63d3b156a74a06f745365567
- Dirty files:
  ```
  M AGENTS.md
   M CLAUDE.md
  ```

## Prisma

- prisma generate: PASS
- prisma validate: PASS

## Forbidden Runtime Objects

- PointMonitorRecord: not found
- CleaningPoint: not found
- TemperaturePoint: not found
- PestPoint: not found
- RecordTemplate / ModelLanding: not found in runtime code
  - Note: `RecordTemplate` appears only in a retired migration SQL comment
    (`20260524090000_retire_dynamic_form_platform/migration.sql`) and a
    spec file (`record-template.spec.ts`) — no live module or controller
    references it. `ModelLanding` has zero occurrences across the codebase.
  - `ApprovalTaskRecord` in `approval-instance.controller.ts` is a local
    TypeScript interface (line 11), not a Prisma model or DB table — safe.
  - `TaskRecord` references in `client/e2e/` and the approved migration SQL
    comment are historical/test artefacts, not active runtime objects.

## Table Counts

| table | row_count |
| --- | ---: |
| inspection_standards | 0 |
| inspection_items | 0 |
| inspection_records | 0 |
| inspection_record_items | 0 |
| environment_records | 0 |
| cleaning_records | 0 |

## Notes

- `environment_records` and `cleaning_records` are defined in the Prisma schema
  but have no dedicated migration SQL yet (Phase 10 tables — migrations to be
  added in subsequent tasks). The Prisma client confirms the tables exist in DB
  with 0 rows, consistent with an empty dev dataset.
- Migration database is up to date (77 migrations applied, no pending).
- No forbidden model names (`PointMonitorRecord`, `CleaningPoint`,
  `TemperaturePoint`, `PestPoint`) appear anywhere in the codebase.
