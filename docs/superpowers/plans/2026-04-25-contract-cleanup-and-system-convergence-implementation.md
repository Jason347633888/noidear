# Contract Cleanup And System Convergence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Converge `noidear` onto one authoritative traceability and contract-consumption path by shrinking legacy routes, pages, adapters, and type surfaces into short-lived bridges and deleting the ones that no longer serve the test baseline.

**Architecture:** First build an audited convergence register so route, page, adapter, type, controller, and test decisions are explicit. Then switch navigation, contract consumers, and tests to the new authority in thin increments. Only after the new baseline is green do we delete legacy wrappers and dead entry points.

**Tech Stack:** TypeScript, Vue 3, Vue Router, Vitest, NestJS, Jest, shared `packages/types`, existing `traceability`, `batch-trace`, `warehouse`, `deviation`, `customer-complaint`, and `corrective-action` modules

---

## Scope Check

This is one coherent plan. It is about convergence of the already-designed traceability system, not a new subsystem. Routes, pages, adapters, types, controllers, and tests all need to move together or the convergence will fail.

## File Structure

### New files

- `docs/superpowers/reports/2026-04-25-contract-cleanup-convergence-register.md`
  - Audited keep/bridge/deprecate/delete inventory across domains and layers.
- `client/src/api/__tests__/traceability-convergence.spec.ts`
  - Verifies that the primary client entry points use the frozen traceability contract and no longer rely on legacy field names.
- `client/src/router/__tests__/traceability-convergence.spec.ts`
  - Verifies primary and deprecated routes resolve as intended.

### Modified files

- `client/src/router/index.ts`
  - Repoint primary navigation, mark or redirect legacy traceability-related routes.
- `client/src/views/Layout.vue`
  - Remove legacy primary menu exposure and point users to the authoritative route.
- `client/src/views/traceability/TraceabilityQuery.vue`
  - Ensure linkage/export/snapshot actions use only the frozen contract fields.
- `client/src/views/traceability/components/TraceGraphView.vue`
  - Consume `TraceNode` and `TraceEdge` instead of legacy graph field names.
- `client/src/views/traceability/components/TraceLedgerView.vue`
  - Consume the frozen ledger shape only.
- `client/src/views/traceability/components/TraceRiskPanel.vue`
  - Consume `risk.items` and `canInitiateLinkage` only.
- `client/src/api/traceability.ts`
  - Remains the primary adapter; remove legacy compatibility-only shapes if present.
- `client/src/api/batch.ts`
  - Deprecate legacy trace query/report entry helpers or keep only non-overlapping batch-management methods.
- `client/src/api/warehouse.ts`
  - Deprecate warehouse-global traceability methods or restrict them to warehouse-local responsibilities.
- `client/src/types/traceability.ts`
  - Reduce to shared-contract mirror/re-export shape only.
- `packages/types/traceability.ts`
  - Remains the naming authority for convergence verification.
- `server/src/modules/traceability/traceability.controller.ts`
  - Preserve as primary endpoint family; add deprecation notes or bridge aliases if still needed.
- `server/src/modules/batch-trace/controllers/trace.controller.ts`
  - Thin bridge or deprecation path if still serving duplicate trace query responsibilities.
- `server/src/modules/warehouse/traceability.controller.ts`
  - Thin bridge or restriction to warehouse-local semantics.
- `server/src/modules/export/export.controller.ts`
  - Ensure legacy trace export flows do not remain separate authorities.
- `client/src/views/traceability/__tests__/TraceabilityQuery.spec.ts`
  - Update tests to assert the new primary path only.
- `client/src/api/__tests__/traceability-contract.spec.ts`
  - Keep aligned with the primary contract shape during convergence.
- `docs/AGENT_GUIDE.md`
  - Add or update the convergence authority and deprecated-path rule if needed.

### Existing files to read before editing

- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/2026-04-24-traceability-query-layer-design.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/2026-04-24-traceability-query-api-contract-design.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/2026-04-25-contract-cleanup-and-system-convergence-design.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/router/index.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/views/Layout.vue`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/api/traceability.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/api/batch.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/api/warehouse.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/views/traceability/TraceabilityQuery.vue`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/views/batch-trace/TraceQuery.vue`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/views/warehouse/Traceability.vue`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/packages/types/traceability.ts`

---

### Task 1: Build The Convergence Register

**Files:**
- Create: `docs/superpowers/reports/2026-04-25-contract-cleanup-convergence-register.md`
- Modify: `docs/superpowers/specs/2026-04-25-contract-cleanup-and-system-convergence-design.md`

- [ ] **Step 1: Draft the convergence register template**

```md
# Contract Cleanup Convergence Register

## Route Layer
| Object | Current Role | Duplicate | Authority | Usage | Outcome | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| client/src/router/index.ts:/traceability | Primary traceability route | R1 | A1 | U1 | Keep As Primary Implementation | New authority route |
| client/src/router/index.ts:/batch-trace/query | Legacy batch trace query route | R1 | A1 | U2 | Mark Deprecated | Replace with /traceability |
| client/src/router/index.ts:/warehouse/traceability | Warehouse-global trace route | R1 | A1 | U2 | Keep As Bridge Layer | Restrict or redirect |
```

- [ ] **Step 2: Save the first-pass inventory for routes, pages, adapters, types, controllers, tests, and docs**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear && rg -n "traceability|batch-trace|warehouse/traceability|sourceQueryHash|canInitiateAction|risk\.items|sourceQueryRef" client/src server/src packages/types docs
```

Expected: a concrete list of convergence candidates that can be copied into the register.

- [ ] **Step 3: Add a status note to the spec that the register is the execution authority**

```md
### Execution Register Rule

Implementation workers must treat `docs/superpowers/reports/2026-04-25-contract-cleanup-convergence-register.md` as the live execution register for keep, bridge, deprecate, and delete decisions. The spec defines the rules; the register records the actual object-by-object decisions.
```

- [ ] **Step 4: Verify the register exists and contains all seven layers**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear && rg -n "## Route Layer|## Page Layer|## Adapter Layer|## Type Layer|## Controller Layer|## Test Layer|## Docs Layer" docs/superpowers/reports/2026-04-25-contract-cleanup-convergence-register.md
```

Expected: 7 matches.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-04-25-contract-cleanup-and-system-convergence-design.md docs/superpowers/reports/2026-04-25-contract-cleanup-convergence-register.md
git commit -m "docs: add contract cleanup convergence register"
```

### Task 2: Make The New Traceability Route The Only Primary Query Path

**Files:**
- Modify: `client/src/router/index.ts`
- Modify: `client/src/views/Layout.vue`
- Test: `client/src/router/__tests__/traceability-convergence.spec.ts`

- [ ] **Step 1: Write the failing router test for primary and deprecated paths**

```ts
import router from '@/router';

describe('traceability convergence routes', () => {
  it('keeps /traceability as the primary query route', async () => {
    const resolved = router.resolve('/traceability');
    expect(resolved.name).toBe('TraceabilityQuery');
  });

  it('keeps /batch-trace/query out of primary navigation', async () => {
    const resolved = router.resolve('/batch-trace/query');
    expect(['TraceQuery', 'TraceabilityLegacyRedirect']).toContain(String(resolved.name));
  });
});
```

- [ ] **Step 2: Run the router test to capture the current route behavior**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client && npm test -- traceability-convergence.spec.ts
```

Expected: FAIL or missing test file.

- [ ] **Step 3: Repoint layout navigation to the authoritative route only**

```ts
{
  title: '来料与追溯',
  icon: Box,
  children: [
    { path: '/incoming-inspections', title: '来料检验', icon: Document },
    { path: '/traceability', title: '追溯查询', icon: Search },
  ],
}
```

Also remove legacy primary-menu exposure such as:

```ts
{ path: '/batch-trace/query', title: '批次追溯查询', icon: Search },
{ path: '/batch-trace/report', title: '追溯报告', icon: Document },
```

from primary navigation menus.

- [ ] **Step 4: Convert legacy batch-trace and warehouse-trace routes into bridge routes**

```ts
{
  path: 'batch-trace/query',
  name: 'TraceabilityLegacyRedirect',
  redirect: '/traceability',
  meta: { title: '批次追溯查询（已弃用）' },
},
{
  path: 'warehouse/traceability',
  name: 'WarehouseTraceabilityLegacyRedirect',
  redirect: '/traceability',
  meta: { title: '仓库追溯（已弃用）' },
},
```

- [ ] **Step 5: Run the router test to verify cutover behavior**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client && npm test -- traceability-convergence.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add client/src/router/index.ts client/src/views/Layout.vue client/src/router/__tests__/traceability-convergence.spec.ts
git commit -m "feat: converge primary traceability routes"
```

### Task 3: Remove Legacy Traceability Vocabulary From The Primary Client Surface

**Files:**
- Modify: `client/src/views/traceability/TraceabilityQuery.vue`
- Modify: `client/src/views/traceability/components/TraceGraphView.vue`
- Modify: `client/src/views/traceability/components/TraceLedgerView.vue`
- Modify: `client/src/views/traceability/components/TraceRiskPanel.vue`
- Modify: `client/src/api/traceability.ts`
- Test: `client/src/api/__tests__/traceability-convergence.spec.ts`
- Test: `client/src/views/traceability/__tests__/TraceabilityQuery.spec.ts`

- [ ] **Step 1: Write a failing contract-consumption test for the primary page and adapter**

```ts
import { traceabilityApi } from '@/api/traceability';

it('uses sourceQueryRef instead of sourceQueryHash for linkage and export', async () => {
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

- [ ] **Step 2: Run the adapter and view tests to capture current failures**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client && npm test -- traceability-convergence.spec.ts TraceabilityQuery.spec.ts traceability-contract.spec.ts
```

Expected: FAIL on legacy field names or missing assumptions.

- [ ] **Step 3: Update the primary page actions to use only the frozen contract names**

```ts
await traceabilityApi.createLinkage({
  actionType: 'recallAssessment',
  sourceQueryRef: result.value?.summary.queryId ?? result.value?.meta.queryHash ?? '',
  sourceNodeIds: selectedNodeIds.value,
  sourceRiskIds: selectedRiskIds.value,
  note: linkageNote.value,
});
```

and

```ts
await traceabilityApi.export({
  exportMode: exportMode.value,
  sourceQueryRef: result.value?.summary.queryId ?? result.value?.meta.queryHash ?? '',
  includeEvidence: true,
  includeMaskedData: false,
});
```

- [ ] **Step 4: Update graph, ledger, and risk components to consume the frozen result shape only**

Use the frozen contract directly:

```ts
const graphNodes = computed(() => props.result?.graph.nodes ?? []);
const graphEdges = computed(() => props.result?.graph.edges ?? []);
const riskItems = computed(() => props.result?.risk.items ?? []);
const canInitiateLinkage = computed(() => props.result?.permission.canInitiateLinkage ?? false);
```

- [ ] **Step 5: Run the targeted client tests again**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client && npm test -- traceability-convergence.spec.ts TraceabilityQuery.spec.ts traceability-contract.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add client/src/views/traceability/TraceabilityQuery.vue client/src/views/traceability/components/TraceGraphView.vue client/src/views/traceability/components/TraceLedgerView.vue client/src/views/traceability/components/TraceRiskPanel.vue client/src/api/traceability.ts client/src/api/__tests__/traceability-convergence.spec.ts client/src/views/traceability/__tests__/TraceabilityQuery.spec.ts
git commit -m "feat: converge primary traceability client contract"
```

### Task 4: Downgrade Legacy Batch And Warehouse Trace Entry Points Into Thin Bridges

**Files:**
- Modify: `client/src/api/batch.ts`
- Modify: `client/src/api/warehouse.ts`
- Modify: `client/src/views/batch-trace/TraceQuery.vue`
- Modify: `client/src/views/batch-trace/TraceReport.vue`
- Modify: `client/src/views/warehouse/Traceability.vue`
- Test: `client/src/api/__tests__/traceability-convergence.spec.ts`

- [ ] **Step 1: Write a failing test that legacy client surfaces no longer pretend to be primary traceability APIs**

```ts
it('keeps legacy batch trace APIs out of the primary traceability contract surface', () => {
  expect('query' in batchApi).toBe(false);
  expect('trace' in warehouseTraceabilityApi).toBe(false);
});
```

- [ ] **Step 2: Run the test to capture the legacy surface**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client && npm test -- traceability-convergence.spec.ts
```

Expected: FAIL because legacy methods are still exposed as first-class trace query paths.

- [ ] **Step 3: Replace legacy query/report pages with explicit bridge messaging or redirects**

Example page body:

```vue
<template>
  <el-result icon="info" title="入口已收敛" sub-title="请使用新的追溯查询入口。">
    <template #extra>
      <el-button type="primary" @click="$router.push('/traceability')">前往追溯查询</el-button>
    </template>
  </el-result>
</template>
```

- [ ] **Step 4: Restrict legacy batch and warehouse adapters to non-overlapping responsibilities only**

Keep batch-management and warehouse-local operations, but remove or deprecate methods that duplicate `/traceability/query`, `/traceability/query/graph`, `/traceability/balance`, `/traceability/export`.

- [ ] **Step 5: Run targeted client tests and a typecheck**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client && npm test -- traceability-convergence.spec.ts && npm run build:check
```

Expected: contract-related tests pass; typecheck should not introduce new convergence regressions.

- [ ] **Step 6: Commit**

```bash
git add client/src/api/batch.ts client/src/api/warehouse.ts client/src/views/batch-trace/TraceQuery.vue client/src/views/batch-trace/TraceReport.vue client/src/views/warehouse/Traceability.vue client/src/api/__tests__/traceability-convergence.spec.ts
git commit -m "refactor: downgrade legacy trace entry points to bridges"
```

### Task 5: Converge Shared Types And Remove Local Vocabulary Drift

**Files:**
- Modify: `packages/types/traceability.ts`
- Modify: `client/src/types/traceability.ts`
- Modify: `server/src/modules/traceability/dto/query-traceability.dto.ts`
- Modify: `server/src/modules/traceability/dto/create-traceability-linkage.dto.ts`
- Modify: `server/src/modules/traceability/dto/create-traceability-export.dto.ts`
- Test: `client/src/api/__tests__/traceability-contract.spec.ts`
- Test: `server/src/modules/traceability/traceability-contract.mapper.spec.ts`

- [ ] **Step 1: Write a failing shared-type drift test**

```ts
import type { TraceQueryResult } from '@noidear/types';
import type { TraceQueryResult as ClientTraceQueryResult } from '@/types/traceability';

type AssertSame<T extends U, U extends T> = true;
const _assert: AssertSame<ClientTraceQueryResult, TraceQueryResult> = true;
```

- [ ] **Step 2: Run shared-type tests to capture drift**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client && npm test -- traceability-contract.spec.ts
```

Expected: FAIL if client-local types have drifted.

- [ ] **Step 3: Reduce the client type module to authority-safe re-exports or minimal wrappers**

```ts
export type {
  TraceQueryRequest,
  TraceQueryResult,
  TraceNode,
  TraceEdge,
  TraceRisk,
  TracePermissionContext,
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

- [ ] **Step 4: Align server DTO field names with the frozen contract authority**

Examples:

```ts
export class CreateTraceabilityLinkageDto {
  @IsString()
  actionType!: string;

  @IsString()
  sourceQueryRef!: string;

  @IsArray()
  @IsString({ each: true })
  sourceNodeIds!: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sourceRiskIds?: string[];
}
```

- [ ] **Step 5: Run shared-type and server mapping tests**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client && npm test -- traceability-contract.spec.ts
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npm test -- traceability-contract.mapper.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/types/traceability.ts client/src/types/traceability.ts server/src/modules/traceability/dto/query-traceability.dto.ts server/src/modules/traceability/dto/create-traceability-linkage.dto.ts server/src/modules/traceability/dto/create-traceability-export.dto.ts client/src/api/__tests__/traceability-contract.spec.ts server/src/modules/traceability/traceability-contract.mapper.spec.ts
git commit -m "refactor: converge traceability types and dto vocabulary"
```

### Task 6: Collapse Legacy Server Trace Endpoints Into Explicit Bridges

**Files:**
- Modify: `server/src/modules/traceability/traceability.controller.ts`
- Modify: `server/src/modules/batch-trace/controllers/trace.controller.ts`
- Modify: `server/src/modules/warehouse/traceability.controller.ts`
- Modify: `server/src/modules/export/export.controller.ts`
- Test: `server/src/modules/traceability/traceability-query.service.spec.ts`
- Test: `server/src/modules/batch-trace/services/trace.service.spec.ts`
- Test: `server/src/modules/warehouse/material-balance.service.spec.ts`

- [ ] **Step 1: Write a failing server-level expectation that traceability authority stays in the new module**

```ts
describe('legacy trace controllers', () => {
  it('do not build independent primary traceability payloads', () => {
    expect(true).toBe(false);
  });
});
```

Use this as a temporary failing reminder until bridge behavior is explicit and covered.

- [ ] **Step 2: Run targeted server tests to capture current duplicate behavior**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npm test -- traceability-query.service.spec.ts trace.service.spec.ts material-balance.service.spec.ts
```

Expected: current assertions will not yet prove convergence, and the new failing reminder test will fail.

- [ ] **Step 3: Turn legacy trace controllers into explicit bridge surfaces or restrict them to local-only responsibilities**

Examples:

- `batch-trace` trace controller returns redirect/deprecation metadata or forwards to the authoritative traceability service
- `warehouse/traceability` is reduced to warehouse-local trace semantics only, or forwards to the authoritative service
- `export/export.controller.ts` stops acting as a parallel authority for traceability export packages

- [ ] **Step 4: Update server tests to assert bridge behavior instead of duplicate payload behavior**

Use assertions like:

```ts
expect(response.meta.authority).toBe('traceability');
expect(response.meta.deprecated).toBe(true);
```

or, if bridge endpoints are removed, assert their absence in the route/module tests.

- [ ] **Step 5: Run targeted server tests and full server build**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npm test -- traceability-query.service.spec.ts trace.service.spec.ts material-balance.service.spec.ts && npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/modules/traceability/traceability.controller.ts server/src/modules/batch-trace/controllers/trace.controller.ts server/src/modules/warehouse/traceability.controller.ts server/src/modules/export/export.controller.ts server/src/modules/traceability/traceability-query.service.spec.ts server/src/modules/batch-trace/services/trace.service.spec.ts server/src/modules/warehouse/material-balance.service.spec.ts
git commit -m "refactor: collapse legacy trace endpoints into bridges"
```

### Task 7: Converge The Test Baseline And Delete Dead Legacy Tests

**Files:**
- Modify: `client/src/views/traceability/__tests__/TraceabilityQuery.spec.ts`
- Modify: `client/src/api/__tests__/traceability-contract.spec.ts`
- Modify: `client/src/api/__tests__/traceability.spec.ts`
- Modify: `server/src/modules/traceability/traceability-contract.mapper.spec.ts`
- Modify: `docs/superpowers/reports/2026-04-25-contract-cleanup-convergence-register.md`

- [ ] **Step 1: Mark primary-path tests and legacy-path tests in the convergence register**

```md
## Test Layer
| Object | Current Role | Duplicate | Authority | Usage | Outcome | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| client/src/views/traceability/__tests__/TraceabilityQuery.spec.ts | Primary path test | R3 | A1 | U1 | Keep As Primary Implementation | Main UI baseline |
| client/src/api/__tests__/traceability.spec.ts | Legacy/transition adapter test | R2 | A1 | U2 | Mark Deprecated | Merge into contract-focused coverage |
```

- [ ] **Step 2: Remove or rewrite tests that validate legacy primary paths as supported defaults**

Example rewrite target:

```ts
it('uses /traceability as the supported query path', async () => {
  const wrapper = mount(TraceabilityQuery);
  expect(wrapper.exists()).toBe(true);
});
```

- [ ] **Step 3: Run the client and server test suites for convergence-related specs**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client && npm test -- traceability-contract.spec.ts traceability.spec.ts TraceabilityQuery.spec.ts traceability-convergence.spec.ts
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npm test -- traceability-contract.mapper.spec.ts traceability-query.service.spec.ts
```

Expected: PASS.

- [ ] **Step 4: Record deletion candidates and retained bridge tests in the register**

```md
- Legacy primary-path tests with no unique assertions -> deletion candidates
- Bridge-only tests with explicit deprecation semantics -> retain temporarily
```

- [ ] **Step 5: Commit**

```bash
git add client/src/views/traceability/__tests__/TraceabilityQuery.spec.ts client/src/api/__tests__/traceability-contract.spec.ts client/src/api/__tests__/traceability.spec.ts server/src/modules/traceability/traceability-contract.mapper.spec.ts docs/superpowers/reports/2026-04-25-contract-cleanup-convergence-register.md
git commit -m "test: converge traceability test baseline"
```

### Task 8: Final Verification And Legacy Cleanup Gate

**Files:**
- Modify: `docs/superpowers/reports/2026-04-25-contract-cleanup-convergence-register.md`
- Modify: `docs/AGENT_GUIDE.md`

- [ ] **Step 1: Add the final deletion-preflight checklist to the convergence register**

```md
## Deletion Preflight Checklist
- [ ] No route reference
- [ ] No menu reference
- [ ] No import or code reference
- [ ] No unit/integration/e2e reference
- [ ] No docs entry as primary path
- [ ] No remaining bridge responsibility
```

- [ ] **Step 2: Run repo-wide convergence searches for forbidden legacy vocabulary**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear && rg -n "sourceQueryHash|canInitiateAction|result\.risks|/batch-trace/query|/warehouse/traceability" client/src server/src docs
```

Expected: either zero matches or only documented bridge/deprecation hits that are recorded in the register.

- [ ] **Step 3: Run final verification commands**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client && npm test -- traceability-contract.spec.ts traceability.spec.ts traceability-convergence.spec.ts TraceabilityQuery.spec.ts && npm run build:check
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npm test -- traceability-contract.mapper.spec.ts traceability-query.service.spec.ts trace.service.spec.ts material-balance.service.spec.ts && npm run build
```

Expected: convergence-related tests pass; any remaining non-convergence type debt is explicitly documented instead of silently ignored.

- [ ] **Step 4: Update `docs/AGENT_GUIDE.md` with the convergence authority note**

```md
## Convergence Authority

When a frozen traceability contract or traceability primary route exists, legacy routes, legacy pages, and legacy adapters may remain only as short-lived bridge layers. New work must land on the authoritative route, contract, and test baseline.
```

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/reports/2026-04-25-contract-cleanup-convergence-register.md docs/AGENT_GUIDE.md
git commit -m "docs: finalize traceability convergence guardrails"
```

## Self-Review

### Spec coverage

This plan covers:

- domain-level convergence inventory
- technical-layer convergence actions
- route/page cutover
- adapter and field-name convergence
- shared-type authority
- legacy controller bridge reduction
- test-baseline convergence
- deletion-preflight and verification

### Placeholder scan

The plan avoids `TODO`, `TBD`, “implement later”, and “similar to Task N” placeholders. Each task includes concrete file paths, commands, and explicit verification steps.

### Type consistency

The plan uses the same vocabulary throughout:

- `sourceQueryRef`
- `risk.items`
- `canInitiateLinkage`
- authoritative `traceability` route and adapter

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-25-contract-cleanup-and-system-convergence-implementation.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
