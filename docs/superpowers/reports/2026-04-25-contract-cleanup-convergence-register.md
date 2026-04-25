# Contract Cleanup Convergence Register

**Date:** 2026-04-25
**Authority Spec:** `docs/superpowers/specs/2026-04-25-contract-cleanup-and-system-convergence-design.md`
**Frozen Type Contract:** `packages/types/traceability.ts`

This register is the live execution record for all keep, bridge, deprecate, and delete decisions in the traceability system convergence. The spec defines the rules; this register records the actual object-by-object decisions.

---

## Outcome Vocabulary

| Term | Meaning |
| --- | --- |
| **Authority** | The one authoritative implementation. Only one per layer. |
| **Bridge** | Exists only as a redirect or deprecation wrapper. No primary business logic. |
| **Frozen Local Function** | A valid local responsibility that is NOT a duplicate of traceability. Keep as-is. |
| **Delete Candidate** | Has no remaining bridge responsibility and passes the deletion preflight. Safe to remove. |
| **Authority Conflict** | Claims to be primary when the authority already exists. Must be resolved. |

---

## Route Layer

| Object | Current Role | Outcome | Notes |
|--------|-------------|---------|-------|
| `GET /traceability` (router name: `TraceabilityQuery`) | Primary traceability query entry route | Keep As Primary | Authoritative entry point. All future work lands here. |
| `GET /batch-trace` (router name: `BatchTrace`) | Batch list route, exposed in primary menu | Mark Deprecated | Menu still lists it. Must be removed from navigation before Phase 3 deletion. |
| `GET /batch-trace/query` (router name: `TraceQuery`) | Batch-level trace query route, in primary menu | Mark Deprecated | Overlaps directly with `/traceability`. Menu entry must be cut. |
| `GET /batch-trace/report` (router name: `TraceReport`) | Batch-level trace report route, in primary menu | Mark Deprecated | Overlaps with traceability export/snapshot path. Menu entry must be cut. |
| `GET /batch-trace/:id` (router name: `BatchDetail`) | Batch detail route | Keep As Bridge | Batch production management, not pure traceability query. Preserve if batch CRUD has no replacement. |
| `GET /warehouse/traceability` (router name: `Traceability`) | Warehouse-level traceability entry | Mark Deprecated | Functional overlap with `/traceability`. No longer primary; redirect candidate. |

---

## Page Layer

| Object | Current Role | Outcome | Notes |
|--------|-------------|---------|-------|
| `client/src/views/traceability/TraceabilityQuery.vue` | Primary traceability query page | Keep As Primary | Authoritative page. Houses ObjectTraceQueryPanel, ScenarioWorkbenchPanel, TraceLedgerView, TraceGraphView, TraceRiskPanel. |
| `client/src/views/traceability/components/ObjectTraceQueryPanel.vue` | Sub-panel: object-centered query | Keep As Primary | Part of the authoritative query surface. |
| `client/src/views/traceability/components/ScenarioWorkbenchPanel.vue` | Sub-panel: scenario workbench | Keep As Primary | Part of the authoritative query surface. |
| `client/src/views/traceability/components/TraceLedgerView.vue` | Sub-panel: ledger view | Keep As Primary | Part of the authoritative result surface. |
| `client/src/views/traceability/components/TraceGraphView.vue` | Sub-panel: graph view | Keep As Primary | Part of the authoritative result surface. |
| `client/src/views/traceability/components/TraceRiskPanel.vue` | Sub-panel: risk display | Keep As Primary | Part of the authoritative result surface. |
| `client/src/views/batch-trace/TraceQuery.vue` | Batch-level trace query page | Bridge | Replaced with redirect page pointing to `/traceability`. No unique local function remains. |
| `client/src/views/batch-trace/TraceReport.vue` | Batch-level trace report page | Delete Candidate | Bridge redirect only; no unique local function. Safe to remove once `/traceability` covers all report flows. |
| `client/src/views/batch-trace/TraceVisualization.vue` | Batch trace visualization page | Delete | Router comment already notes it was removed as duplicate. File still on disk. |
| `client/src/views/batch-trace/BatchList.vue` | Batch list management page | Keep As Bridge | Batch CRUD management. Observe whether a non-trace batch management path replaces this. |
| `client/src/views/batch-trace/BatchDetail.vue` | Batch detail page | Keep As Bridge | Batch production detail. May have non-trace local role. |
| `client/src/views/warehouse/Traceability.vue` | Warehouse-level traceability page | Bridge | Replaced with redirect page pointing to `/traceability`. Warehouse-scoped trace overlap eliminated. |

---

## Adapter Layer

| Object | Current Role | Outcome | Notes |
|--------|-------------|---------|-------|
| `client/src/api/traceability.ts` (`traceabilityApi`) | Client adapter for the frozen contract (`/traceability/*`) | Keep As Primary | Uses frozen contract types from `packages/types/traceability.ts`. New pages must import from here. |
| `client/src/api/batch.ts` — trace methods (`traceApi.forward`, `traceApi.backward`, `traceApi.getTrace`, `traceApi.exportTrace`) | Client adapter for `/batch-trace/trace/*` endpoints | Mark Deprecated | Uses local `TraceResult` type with different field names. Must not be consumed by new pages. |
| `client/src/api/batch.ts` — batch management methods (`productionBatchApi`, `materialUsageApi`) | Client adapter for batch production CRUD | Keep As Bridge | Batch CRUD operations not yet covered by the traceability module. Preserve pending batch management decision. |
| `client/src/api/warehouse.ts` — `traceabilityApi.trace()` | Client adapter for `/warehouse/traceability/:batchId` | Delete | Single thin `GET` wrapper with `any` response type. No typed contract, no active consumer confirmed. Pre-deletion: audit all imports of warehouse.traceabilityApi to confirm zero active consumers. |

---

## Type Layer

| Object | Current Role | Outcome | Notes |
|--------|-------------|---------|-------|
| `packages/types/traceability.ts` | Frozen shared contract: all canonical type definitions | Keep As Primary | Single source of truth. `TraceQueryRequest`, `TraceQueryResult`, `TraceRisk`, `TraceNode`, `TraceEdge`, `sourceQueryRef`, etc. |
| `packages/types/index.ts` (re-exports `traceability.ts`) | Package-level re-export | Keep As Primary | Required for `@noidear/types` import path. |
| `client/src/types/traceability.ts` | Client-local type mirror | Keep As Bridge | Currently a pure re-export from `@noidear/types`. No local drift detected. Allowed to remain as thin pass-through. |
| `client/src/api/batch.ts` — local `TraceResult` interface | Local batch trace type with non-contract field shape | Mark Deprecated | Uses diverged field names (`risks` not `risk.items`, `canInitiateAction` not `canInitiateLinkage`). Must not spread to new code. |
| `server/src/modules/traceability/dto/query-traceability.dto.ts` | Server DTO aligned to frozen contract | Keep As Primary | Aligned to frozen contract. |
| `server/src/modules/traceability/dto/query-material-balance.dto.ts` | Server DTO for balance queries | Keep As Primary | Aligned to frozen contract. |
| `server/src/modules/traceability/dto/create-traceability-linkage.dto.ts` | Server DTO for linkage actions | Keep As Primary | Uses `sourceQueryRef`. Aligned. |
| `server/src/modules/traceability/dto/create-traceability-export.dto.ts` | Server DTO for export creation | Keep As Primary | Uses `sourceQueryRef`. Aligned. |
| `server/src/modules/traceability/dto/create-traceability-snapshot.dto.ts` | Server DTO for snapshot creation | Keep As Primary | Uses `sourceQueryRef`. Aligned. |
| `server/src/modules/traceability/dto/query-traceability-snapshot.dto.ts` | Server DTO for snapshot query | Keep As Primary | Aligned to frozen contract. |
| `server/src/modules/batch-trace/dto/production-batch.dto.ts` | Server DTO for production batch CRUD | Keep As Bridge | Batch CRUD, not a traceability query payload. Preserve pending batch management decision. |
| `server/src/modules/batch-trace/dto/material-usage.dto.ts` | Server DTO for material usage records | Keep As Bridge | Batch CRUD support. Same reasoning as above. |

---

## Controller Layer

| Object | Current Role | Outcome | Notes |
|--------|-------------|---------|-------|
| `server/src/modules/traceability/traceability.controller.ts` (`@Controller('traceability')`) | Primary controller: query, balance, actions, export, snapshots | Keep As Primary | Authoritative traceability entry. All routes aligned to frozen contract. |
| `server/src/modules/traceability/traceability.service.ts` | Orchestrating service for the primary controller | Keep As Primary | Delegates to query, balance, linkage, export, snapshot services. |
| `server/src/modules/traceability/traceability-query.service.ts` | Query chain assembly | Keep As Primary | Primary implementation of trace query semantics. |
| `server/src/modules/traceability/traceability-balance.service.ts` | Material balance analysis | Keep As Primary | Authoritative balance path. |
| `server/src/modules/traceability/traceability-linkage.service.ts` | Governance action linkage | Keep As Primary | Handles `sourceQueryRef`-based linkage. |
| `server/src/modules/traceability/traceability-export.service.ts` | Export task creation | Keep As Primary | Export bound to `sourceQueryRef`. |
| `server/src/modules/traceability/traceability-contract.mapper.ts` | Contract field mapper | Keep As Primary | Translates internal models to frozen contract shape. |
| `server/src/modules/batch-trace/controllers/trace.controller.ts` (`@Controller('batch-trace/trace')`, POST forward/backward) | Legacy batch-level trace controller | Mark Deprecated | Thin wrapper that calls the same `TraceabilityService` (batch-trace module's copy). POST semantics differ from the authoritative GET-with-body pattern. Must not grow. |
| `server/src/modules/batch-trace/controllers/trace-export.controller.ts` (`@Controller('batch-trace/trace')`, PDF export) | Batch-level PDF export controller | Mark Deprecated | Generates PDF from the batch trace service, not from the frozen export contract. Overlaps with `traceability/export`. |
| `server/src/modules/batch-trace/controllers/production-batch.controller.ts` | Production batch CRUD controller | Keep As Bridge | Batch production management. Not a traceability query surface. |
| `server/src/modules/batch-trace/controllers/material-batch.controller.ts` | Material batch CRUD controller | Keep As Bridge | Batch CRUD. Not a traceability query surface. |
| `server/src/modules/batch-trace/controllers/material-usage.controller.ts` | Material usage CRUD controller | Keep As Bridge | Batch CRUD. Not a traceability query surface. |
| `server/src/modules/batch-trace/controllers/batch-material-usage.controller.ts` | Batch-material usage CRUD controller | Keep As Bridge | Batch CRUD. Not a traceability query surface. |
| `server/src/modules/warehouse/traceability.controller.ts` (`@Controller('warehouse/traceability')`) | Warehouse-level trace controller (GET forward/backward) | Mark Deprecated | Delegates to the batch-trace `TraceabilityService`. Duplicate trace chain path. GET semantics diverge from contract. Delegates to batch-trace/services/traceability.service — both are deprecated together; decouple before deletion. |

---

## Test Layer

| Object | Current Role | Outcome | Notes |
|--------|-------------|---------|-------|
| `client/e2e/traceability-query.spec.ts` | E2E tests for `/traceability` route and UI | Keep As Primary | Tests the authoritative page. Baseline tests. Must grow as the page grows. |
| `client/src/views/traceability/__tests__/TraceabilityQuery.spec.ts` | Unit/component tests for `TraceabilityQuery.vue` | Keep As Primary | Component-level tests for the authoritative page. |
| `client/src/api/__tests__/traceability.spec.ts` | API adapter tests for `client/src/api/traceability.ts` | Keep As Primary | Contract adapter tests. Must stay aligned to frozen types. |
| `client/src/api/__tests__/traceability-contract.spec.ts` | Contract shape tests for traceability types | Keep As Primary | Validates field names against the frozen contract. Critical guard against drift. |
| `client/src/api/__tests__/traceability-convergence.spec.ts` | Adapter convergence tests | Keep As Primary | Verifies sourceQueryRef in linkage and export calls; verifies traceApi removed from batch module surface. |
| `client/e2e/batch-trace-flow.spec.ts` | E2E tests for batch trace flow (batch list, TraceQuery, TraceReport, BatchDetail) | Mark Deprecated | Tests deprecated primary flows. Must not receive new scenarios. Migrate batch CRUD portion only after replacement E2E coverage is confirmed. E2E-TEST-CHECKLIST.md row 44 still marks this as 新功能 — update checklist to reflect deprecation. |
| `server/src/modules/traceability/traceability-query.service.spec.ts` | Unit tests for the query service | Keep As Primary | Primary backend test baseline. |
| `server/src/modules/traceability/traceability-balance.service.spec.ts` | Unit tests for the balance service | Keep As Primary | Primary backend test baseline. |
| `server/src/modules/traceability/traceability-linkage.service.spec.ts` | Unit tests for the linkage service | Keep As Primary | Primary backend test baseline. |
| `server/src/modules/traceability/traceability-export.service.spec.ts` | Unit tests for the export service | Keep As Primary | Primary backend test baseline. |
| `server/src/modules/traceability/traceability-contract.mapper.spec.ts` | Unit tests for contract field mapping | Keep As Primary | Validates that internal-to-contract mapping is correct. |
| `server/test/traceability-contract.mapper.spec.ts` | Duplicate unit tests for contract field mapping | Keep As Bridge | Duplicate of server/src/modules/traceability/traceability-contract.mapper.spec.ts — consolidate or delete. |
| `server/src/modules/batch-trace/services/trace.service.spec.ts` | Unit tests for batch-trace `TraceService` | Mark Deprecated | Tests a deprecated trace chain. Do not add new scenarios. |
| `server/src/modules/batch-trace/services/trace-export.service.spec.ts` | Unit tests for batch-trace PDF export service | Mark Deprecated | Tests a deprecated export path. |
| `server/src/modules/batch-trace/services/production-batch.service.spec.ts` | Unit tests for production batch CRUD | Keep As Bridge | Batch CRUD. Separate from traceability query. |
| `server/src/modules/batch-trace/services/material-batch.service.spec.ts` | Unit tests for material batch CRUD | Keep As Bridge | Batch CRUD. |
| `server/src/modules/batch-trace/services/material-usage.service.spec.ts` | Unit tests for material usage CRUD | Keep As Bridge | Batch CRUD. |
| `server/src/modules/batch-trace/services/batch-material-usage.service.spec.ts` | Unit tests for batch-material usage CRUD | Keep As Bridge | Batch CRUD. |
| `server/src/modules/batch-trace/services/batch-number-generator.service.spec.ts` | Unit tests for batch number generation | Keep As Bridge | Utility service. Batch CRUD support. |
| `docs/superpowers/reports/E2E-TEST-CHECKLIST.md` (row 17: 批次追溯) | Test status tracking for batch-trace-flow | Mark Deprecated | Row tracks a deprecated E2E path. Must be updated to point to authoritative flow once migration completes. |

### Deletion Candidates
- None identified. All legacy test files have been removed or replaced. Bridge tests (batch-trace traceability.service.spec.ts) are marked as bridge.

---

## Docs Layer

| Object | Current Role | Outcome | Notes |
|--------|-------------|---------|-------|
| `docs/superpowers/specs/2026-04-24-traceability-query-layer-design.md` | Authoritative traceability query layer design | Keep As Primary | Frozen upstream authority. Do not modify. |
| `docs/superpowers/specs/2026-04-24-traceability-query-api-contract-design.md` | Frozen API contract spec | Keep As Primary | Single source of contract truth for field names and response shapes. |
| `docs/superpowers/specs/2026-04-25-contract-cleanup-and-system-convergence-design.md` | Convergence rules spec | Keep As Primary | Rules document. This register is its execution companion. |
| `docs/superpowers/plans/2026-04-24-traceability-query-layer-implementation.md` | Implementation plan for the traceability query layer | Keep As Primary | Active implementation guide. References authoritative paths. |
| `docs/superpowers/reports/E2E-TEST-CHECKLIST.md` | E2E test tracking checklist | Keep As Bridge | Still useful overall, but row 17 (批次追溯) points to deprecated flow. Must update row once migration completes. |
| `docs/superpowers/specs/2026-04-24-model-landing-layer-design.md` | Model landing layer design | Keep As Primary | Upstream authority consumed by traceability query layer. |
| Any doc sections still describing `/batch-trace/query` or `/warehouse/traceability` as primary entry points | Legacy primary-path documentation | Mark Deprecated | Identify and remove or annotate as superseded once the authoritative paths are confirmed stable. |

---

## Deletion Preflight Checklist

Before deleting any object marked "Delete" or "Mark Deprecated", confirm all of the following:

- [ ] No route reference
- [ ] No menu reference
- [ ] No import or code reference
- [ ] No unit/integration/e2e reference
- [ ] No docs entry as primary path
- [ ] No remaining bridge responsibility

### Current Deletion Candidates

> **Closed in reconstruction (2026-04-25):** `traceApi` duplicate removed from `client/src/api/batch.ts`; 353/353 client unit tests now pass. `traceability-convergence.spec.ts` assertion confirmed green. See `2026-04-25-release-baseline-reconstruction-report.md` for full evidence.

| Object | Status | Preflight Status |
| --- | --- | --- |
| `client/src/api/warehouse.ts traceabilityApi.trace()` | Deleted | ✅ Removed in Task 4 |
| `client/src/api/batch.ts traceApi` | Deleted | ✅ Removed in reconstruction (2026-04-25) — `traceability-convergence.spec.ts` now passes |
| `client/src/api/batch.ts TraceResult/TraceNode` | Deleted | ✅ Removed in reconstruction (2026-04-25) |
| `client/src/views/batch-trace/TraceQuery.vue` (complex version) | Replaced with bridge | ✅ Replaced in Task 4 |
| `client/src/views/batch-trace/TraceReport.vue` (complex version) | Replaced with bridge | ✅ Replaced in Task 4 |
| `client/src/views/warehouse/Traceability.vue` (complex version) | Replaced with bridge | ✅ Replaced in Task 4 |
