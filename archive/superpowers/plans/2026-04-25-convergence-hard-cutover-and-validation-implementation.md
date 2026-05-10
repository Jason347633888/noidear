# Convergence Hard Cutover And Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Validate and complete the hard cutover to a single primary traceability surface, while separating valid local business functions from duplicate legacy traceability surfaces.

**Architecture:** First establish a validation report and authoritative inventory, then verify and tighten route/page/adapter/type/server ownership. After that, classify survivors into bridge, frozen local function, or delete candidate, and only then remove or freeze the remaining legacy surfaces.

**Tech Stack:** TypeScript, Vue 3, Vue Router, Vitest, NestJS, Jest, shared `packages/types`, existing `traceability`, `batch-trace`, `warehouse`, `customer-complaint`, `deviation`, and `corrective-action` modules

---

## Scope Check

This plan is for the post-implementation hard-cutover phase. It assumes the earlier traceability plans have already been executed. It focuses on validation, tightening, and cleanup of competing surfaces, not on redesigning traceability.

## File Structure

### New files

- `docs/superpowers/reports/2026-04-25-convergence-hard-cutover-validation.md`
  - Validation report proving whether only one primary traceability surface remains.
- `docs/superpowers/reports/2026-04-25-convergence-delete-candidate-register.md`
  - Explicit register of objects that are safe to remove once the gate is satisfied.

### Modified files

- `docs/superpowers/reports/2026-04-25-contract-cleanup-convergence-register.md`
  - Update outcomes to bridge, frozen local function, delete candidate, or authority conflict.
- `client/src/router/index.ts`
  - Tighten or remove remaining legacy primary traceability routes.
- `client/src/views/Layout.vue`
  - Ensure menus expose only the primary traceability route.
- `client/src/api/traceability.ts`
  - Keep as sole primary traceability adapter.
- `client/src/api/batch.ts`
  - Remove or freeze duplicate trace-query semantics.
- `client/src/api/warehouse.ts`
  - Remove or freeze duplicate global traceability semantics.
- `client/src/views/batch-trace/TraceQuery.vue`
  - Convert to bridge/deprecated/local-only state if still present.
- `client/src/views/batch-trace/TraceReport.vue`
  - Convert to bridge/deprecated/local-only state if still present.
- `client/src/views/warehouse/Traceability.vue`
  - Convert to bridge/deprecated/local-only state if still present.
- `client/src/views/traceability/TraceabilityQuery.vue`
  - Confirm primary-surface behavior and remove legacy assumptions.
- `client/src/views/traceability/components/TraceGraphView.vue`
  - Confirm frozen graph contract only.
- `client/src/views/traceability/components/TraceRiskPanel.vue`
  - Confirm frozen risk contract only.
- `client/src/types/traceability.ts`
  - Confirm no drift from shared types.
- `packages/types/traceability.ts`
  - Remains authoritative; update only if validation uncovers drift bugs.
- `server/src/modules/traceability/traceability.controller.ts`
  - Confirm it remains the primary endpoint family.
- `server/src/modules/batch-trace/controllers/trace.controller.ts`
  - Restrict, bridge, or delete duplicate authority.
- `server/src/modules/warehouse/traceability.controller.ts`
  - Restrict, bridge, or delete duplicate authority.
- `docs/AGENT_GUIDE.md`
  - Document the primary traceability surface rule and deletion gate.

### Existing files to read before editing

- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/2026-04-24-traceability-query-layer-design.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/2026-04-24-traceability-query-api-contract-design.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/2026-04-25-contract-cleanup-and-system-convergence-design.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/2026-04-25-convergence-hard-cutover-and-validation-design.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/router/index.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/views/Layout.vue`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/api/traceability.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/api/batch.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/api/warehouse.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/traceability/traceability.controller.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/batch-trace/controllers/trace.controller.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/warehouse/traceability.controller.ts`

---

### Task 1: Build The Hard-Cutover Validation Report

**Files:**
- Create: `docs/superpowers/reports/2026-04-25-convergence-hard-cutover-validation.md`
- Modify: `docs/superpowers/reports/2026-04-25-contract-cleanup-convergence-register.md`

- [ ] **Step 1: Create the validation report skeleton**

```md
# Convergence Hard Cutover Validation

## Primary Surface
- route:
- page:
- adapter:
- shared types:
- server endpoints:

## Legacy Surface Findings
- batch-trace:
- warehouse trace:
- export/snapshot duplicates:
- type drift:

## Validation Evidence
- route evidence:
- adapter evidence:
- grep evidence:
- test evidence:
- doc evidence:
```

- [ ] **Step 2: Run first-pass evidence collection commands**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear && rg -n "path: 'traceability'|path: 'batch-trace/query'|path: 'warehouse/traceability'" client/src/router/index.ts && rg -n "sourceQueryHash|canInitiateAction|result\.risks|/batch-trace/query|/warehouse/traceability" client/src server/src docs
```

Expected: a concrete evidence set showing whether legacy vocabulary and routes still exist.

- [ ] **Step 3: Update the convergence register with these four buckets**

```md
## Outcome Vocabulary
- Bridge
- Frozen Local Function
- Delete Candidate
- Authority Conflict
```

- [ ] **Step 4: Verify the report and register were created and updated**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear && rg -n "# Convergence Hard Cutover Validation|## Primary Surface|## Validation Evidence" docs/superpowers/reports/2026-04-25-convergence-hard-cutover-validation.md && rg -n "Bridge|Frozen Local Function|Delete Candidate|Authority Conflict" docs/superpowers/reports/2026-04-25-contract-cleanup-convergence-register.md
```

Expected: both files contain the expected sections and vocabulary.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/reports/2026-04-25-convergence-hard-cutover-validation.md docs/superpowers/reports/2026-04-25-contract-cleanup-convergence-register.md
git commit -m "docs: add hard-cutover validation report"
```

### Task 2: Verify And Tighten The Single Primary Route And Menu Path

**Files:**
- Modify: `client/src/router/index.ts`
- Modify: `client/src/views/Layout.vue`
- Test: `client/src/router/__tests__/traceability-convergence.spec.ts`

- [ ] **Step 1: Write the failing route/menu test**

```ts
import router from '@/router';

describe('single primary traceability route', () => {
  it('keeps /traceability as the only primary menu-visible traceability route', () => {
    const resolved = router.resolve('/traceability');
    expect(resolved.name).toBe('TraceabilityQuery');
  });
});
```

- [ ] **Step 2: Run the router test to capture current behavior**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client && npm test -- traceability-convergence.spec.ts
```

Expected: FAIL if route/menu state is still ambiguous or if the test file does not exist yet.

- [ ] **Step 3: Ensure legacy routes are redirect-only, hidden, or removed from primary menus**

Use route patterns like:

```ts
{
  path: 'batch-trace/query',
  name: 'TraceabilityLegacyRedirect',
  redirect: '/traceability',
  meta: { title: '批次追溯查询（已弃用）' },
}
```

and remove legacy primary menu links from `client/src/views/Layout.vue`.

- [ ] **Step 4: Re-run the route/menu test**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client && npm test -- traceability-convergence.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/router/index.ts client/src/views/Layout.vue client/src/router/__tests__/traceability-convergence.spec.ts
git commit -m "feat: enforce single primary traceability route"
```

### Task 3: Verify Primary Adapter Authority And Freeze Legacy Vocabulary

**Files:**
- Modify: `client/src/api/traceability.ts`
- Modify: `client/src/api/batch.ts`
- Modify: `client/src/api/warehouse.ts`
- Modify: `client/src/types/traceability.ts`
- Test: `client/src/api/__tests__/traceability-contract.spec.ts`
- Test: `client/src/api/__tests__/traceability-convergence.spec.ts`

- [ ] **Step 1: Write a failing adapter-authority test**

```ts
import { traceabilityApi } from '@/api/traceability';

it('keeps the primary adapter on frozen contract names only', async () => {
  await traceabilityApi.createLinkage({
    actionType: 'recallAssessment',
    sourceQueryRef: 'query-1',
    sourceNodeIds: ['node-1'],
    sourceRiskIds: ['risk-1'],
  });

  expect(request.post).toHaveBeenCalledWith('/traceability/actions', expect.objectContaining({
    sourceQueryRef: 'query-1',
  }));
});
```

- [ ] **Step 2: Run adapter tests to capture current drift**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client && npm test -- traceability-contract.spec.ts traceability-convergence.spec.ts
```

Expected: FAIL if any legacy vocabulary still leaks through the primary adapter path.

- [ ] **Step 3: Reduce legacy adapters to non-primary local roles only**

Keep in `client/src/api/batch.ts` and `client/src/api/warehouse.ts` only methods that serve true local business responsibilities. Remove or deprecate methods that duplicate:

- `/traceability/query`
- `/traceability/query/graph`
- `/traceability/balance`
- `/traceability/export`
- `/traceability/snapshots`

- [ ] **Step 4: Reduce client-local type drift**

Use authority-safe re-exports such as:

```ts
export type {
  TraceQueryRequest,
  TraceQueryResult,
  BalanceQueryRequest,
  BalanceQueryResult,
  LinkageCreateRequest,
  ExportCreateRequest,
  SnapshotCreateRequest,
  TraceActionResult,
  TraceExportResult,
  TraceSnapshotResult,
} from '@noidear/types';
```

- [ ] **Step 5: Re-run adapter tests and client typecheck**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client && npm test -- traceability-contract.spec.ts traceability-convergence.spec.ts && npm run build:check
```

Expected: contract-related tests pass; any remaining type debt is now outside the primary-trace convergence scope and should be explicitly noted.

- [ ] **Step 6: Commit**

```bash
git add client/src/api/traceability.ts client/src/api/batch.ts client/src/api/warehouse.ts client/src/types/traceability.ts client/src/api/__tests__/traceability-contract.spec.ts client/src/api/__tests__/traceability-convergence.spec.ts
git commit -m "refactor: enforce primary traceability adapter authority"
```

### Task 4: Reclassify Legacy Pages As Bridge Or Local-Only

**Files:**
- Modify: `client/src/views/batch-trace/TraceQuery.vue`
- Modify: `client/src/views/batch-trace/TraceReport.vue`
- Modify: `client/src/views/warehouse/Traceability.vue`
- Modify: `docs/superpowers/reports/2026-04-25-contract-cleanup-convergence-register.md`

- [ ] **Step 1: Write the failing expectation for legacy pages**

```ts
it('does not allow legacy pages to present themselves as primary traceability UIs', () => {
  expect(true).toBe(false);
});
```

Use this as a temporary failing reminder until each page is explicitly marked as bridge, deprecated, or local-only.

- [ ] **Step 2: Run the legacy-page tests or mounts**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client && npm test -- TraceabilityQuery.spec.ts
```

Expected: the temporary failing reminder fails until the pages are reclassified.

- [ ] **Step 3: Convert legacy pages to explicit bridge or local-only states**

Example bridge view:

```vue
<template>
  <el-result icon="info" title="入口已收敛" sub-title="请使用新的追溯查询入口。">
    <template #extra>
      <el-button type="primary" @click="$router.push('/traceability')">前往追溯查询</el-button>
    </template>
  </el-result>
</template>
```

- [ ] **Step 4: Record each page outcome in the convergence register**

```md
| client/src/views/batch-trace/TraceQuery.vue | Page | Bridge | Redirect-only to /traceability |
| client/src/views/batch-trace/TraceReport.vue | Page | Delete Candidate | No longer primary report authority |
| client/src/views/warehouse/Traceability.vue | Page | Frozen Local Function | Only if restricted to warehouse-local semantics |
```

- [ ] **Step 5: Commit**

```bash
git add client/src/views/batch-trace/TraceQuery.vue client/src/views/batch-trace/TraceReport.vue client/src/views/warehouse/Traceability.vue docs/superpowers/reports/2026-04-25-contract-cleanup-convergence-register.md
git commit -m "refactor: reclassify legacy traceability pages"
```

### Task 5: Verify Server Authority And Collapse Parallel Endpoint Semantics

**Files:**
- Modify: `server/src/modules/traceability/traceability.controller.ts`
- Modify: `server/src/modules/batch-trace/controllers/trace.controller.ts`
- Modify: `server/src/modules/warehouse/traceability.controller.ts`
- Test: `server/src/modules/traceability/traceability-query.service.spec.ts`
- Test: `server/src/modules/batch-trace/services/trace.service.spec.ts`
- Test: `server/src/modules/warehouse/material-balance.service.spec.ts`

- [ ] **Step 1: Write a failing server-authority reminder test**

```ts
describe('traceability server authority', () => {
  it('keeps the traceability module as the only primary endpoint family', () => {
    expect(true).toBe(false);
  });
});
```

- [ ] **Step 2: Run the targeted server tests to capture current overlap**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npm test -- traceability-query.service.spec.ts trace.service.spec.ts material-balance.service.spec.ts
```

Expected: the reminder test fails until explicit bridge or restriction behavior exists.

- [ ] **Step 3: Restrict legacy server endpoints to bridge or local-only behavior**

Examples:

- `batch-trace` trace endpoints forward into the authoritative traceability service or are marked deprecated
- `warehouse/traceability` endpoints are reduced to warehouse-local semantics only or bridged to the traceability module
- no legacy endpoint may continue to assemble a parallel primary trace payload

- [ ] **Step 4: Replace the reminder test with explicit assertions**

Examples:

```ts
expect(response.meta.authority).toBe('traceability');
expect(response.meta.deprecated).toBe(true);
```

or route/module absence assertions if the legacy endpoint was removed.

- [ ] **Step 5: Run targeted server tests and build**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npm test -- traceability-query.service.spec.ts trace.service.spec.ts material-balance.service.spec.ts && npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/modules/traceability/traceability.controller.ts server/src/modules/batch-trace/controllers/trace.controller.ts server/src/modules/warehouse/traceability.controller.ts server/src/modules/traceability/traceability-query.service.spec.ts server/src/modules/batch-trace/services/trace.service.spec.ts server/src/modules/warehouse/material-balance.service.spec.ts
git commit -m "refactor: enforce traceability server authority"
```

### Task 6: Build The Delete-Candidate Register And Run The Deletion Gate

**Files:**
- Create: `docs/superpowers/reports/2026-04-25-convergence-delete-candidate-register.md`
- Modify: `docs/superpowers/reports/2026-04-25-convergence-hard-cutover-validation.md`
- Modify: `docs/AGENT_GUIDE.md`

- [ ] **Step 1: Create the delete-candidate register**

```md
# Convergence Delete Candidate Register

| Object | Layer | Why Candidate | Route Ref | Import Ref | Test Ref | Docs Ref | Bridge Role | Outcome |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
```

- [ ] **Step 2: Run the deletion-gate searches**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear && rg -n "/batch-trace/query|/warehouse/traceability|sourceQueryHash|canInitiateAction|result\.risks" client/src server/src docs && rg -n "TraceQuery|TraceabilityLegacyRedirect|WarehouseTraceabilityLegacyRedirect" client/src/router/index.ts
```

Expected: either no remaining primary-authority conflicts or only documented bridge hits.

- [ ] **Step 3: Record candidates and blockers in the delete register**

```md
| client/src/views/batch-trace/TraceReport.vue | Page | Old report authority replaced | no | no | no | no | no | delete-ready |
```

- [ ] **Step 4: Update `docs/AGENT_GUIDE.md` with the hard-cutover rule**

```md
## Hard Cutover Rule

When the traceability primary surface has been established, legacy traceability pages, routes, adapters, and payload vocabularies may remain only as short-lived bridges or local-only functions. They may not continue to act as alternate primary traceability authorities.
```

- [ ] **Step 5: Run final validation commands**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client && npm test -- traceability-contract.spec.ts traceability-convergence.spec.ts TraceabilityQuery.spec.ts && npm run build:check
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npm test -- traceability-query.service.spec.ts trace.service.spec.ts material-balance.service.spec.ts && npm run build
```

Expected: the primary-surface validations pass, and any remaining non-convergence failures are explicitly documented in the report and register.

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/reports/2026-04-25-convergence-delete-candidate-register.md docs/superpowers/reports/2026-04-25-convergence-hard-cutover-validation.md docs/AGENT_GUIDE.md
git commit -m "docs: finalize hard cutover validation and delete gate"
```

## Self-Review

### Spec coverage

This plan covers:

- primary-surface validation
- route/menu cutover
- adapter and naming authority validation
- page reclassification
- server authority enforcement
- delete-candidate gating
- final validation report and guide update

### Placeholder scan

The plan avoids open-ended placeholders. Each task includes exact file paths, concrete commands, and expected outcomes.

### Type consistency

The plan consistently uses the frozen vocabulary:

- `sourceQueryRef`
- `risk.items`
- `canInitiateLinkage`
- primary `/traceability` route
- shared `packages/types/traceability.ts` authority

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-25-convergence-hard-cutover-and-validation-implementation.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
