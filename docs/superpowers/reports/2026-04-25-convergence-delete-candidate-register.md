# Convergence Delete Candidate Register

> Objects listed here have passed the deletion preflight and can be removed in a future cleanup commit. No object should be deleted without first passing all preflight checks.

## Deletion Preflight Checks

Before removing any object:
- [ ] No active route reference
- [ ] No active menu reference
- [ ] No active import or code reference
- [ ] No unit/integration/e2e reference
- [ ] No docs entry treating it as a primary path
- [ ] No remaining bridge responsibility

## Delete Candidates

| Object | Layer | Why Candidate | Route Ref | Import Ref | Test Ref | Bridge Role | Preflight Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `client/src/views/batch-trace/TraceReport.vue` | Page | Bridge-only page with no unique local function | ❌ none (route already redirects) | ❌ none | ❌ none | Redirect to /traceability | ✅ delete-ready |
| `server/src/modules/batch-trace/controllers/trace-export.controller.ts` | Controller | Duplicate trace-export authority; primary is traceability module | Check | Check | Check | If no consumers | Needs audit |
| `client/src/views/batch-trace/TraceQuery.vue` | Page | Bridge page; route already redirects | ❌ none | ❌ none | ❌ none | Redirect to /traceability | ⚠️ keep as bridge until route is removed |
| `client/src/views/warehouse/Traceability.vue` | Page | Bridge page; route already redirects | ❌ none | ❌ none | ❌ none | Redirect to /traceability | ⚠️ keep as bridge until route is removed |

## Frozen Local Functions (Not Delete Candidates)

| Object | Layer | Why Kept | Notes |
| --- | --- | --- | --- |
| `server/src/modules/batch-trace/controllers/trace.controller.ts` | Controller | Kept as deprecated bridge; returns meta.deprecated=true | Remove after grace period |
| `server/src/modules/warehouse/traceability.controller.ts` | Controller | Kept as deprecated bridge; returns meta.deprecated=true | Remove after grace period |
| `server/src/modules/batch-trace/services/traceability.service.ts` | Service | Local batch-trace service for bridge controllers | Remove with bridge controllers |
| `server/src/modules/traceability/traceability-query.service.ts` | Service | Specialist service kept for unit test coverage | Internal only; uses local types |
