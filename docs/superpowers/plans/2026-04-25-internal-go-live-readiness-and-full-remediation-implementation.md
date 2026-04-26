# Internal Go-Live Readiness And Full Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Drive `noidear` to internal formal trial-operation readiness by remediating all known in-scope issues, proving full-business validation, producing the complete release evidence package, and collecting formal sign-off.

**Architecture:** Treat release readiness as a gated evidence pipeline instead of a loose checklist. First define the release-scope matrix and acceptance artifacts, then remediate blockers layer by layer across frontend, backend, contract, permissions, convergence, and observability. Only after all gates are green do we assemble the final evidence package, complete sign-off, and declare the system ready for internal formal trial operation.

**Tech Stack:** TypeScript, Vue 3, Vue Router, Vitest, NestJS, Jest, shared `packages/types`, existing `traceability`, `batch-trace`, `warehouse`, `record`, `workflow`, `product`, `recipe`, `process`, `permission`, `monitoring`, and reporting modules

---

## Scope Check

This plan is for the system-wide internal formal trial-operation gate. It is not a feature implementation plan. It assumes the traceability, contract, convergence, and hard-cutover specs already exist and focuses on remediation, validation, evidence, and release sign-off.

## File Structure

### New files

- `docs/superpowers/reports/2026-04-25-internal-go-live-readiness-report.md`
  - Top-level release-readiness report with gate status and final recommendation.
- `docs/superpowers/reports/2026-04-25-full-business-e2e-matrix.md`
  - System-wide E2E coverage and execution status matrix.
- `docs/superpowers/reports/2026-04-25-contract-consistency-report.md`
  - Explicit evidence that shared types, adapters, DTOs, responses, and tests are aligned.
- `docs/superpowers/reports/2026-04-25-monitoring-and-rollback-readiness.md`
  - Monitoring, logs, stop-run, rollback, and operational readiness checklist.
- `docs/superpowers/reports/2026-04-25-internal-go-live-signoff.md`
  - Technical, test, business, and system-owner sign-off record.

### Modified files

- `docs/AGENT_GUIDE.md`
  - Document internal go-live gate authority and required evidence path.
- `client/src/router/index.ts`
  - Adjust any release-blocking route or navigation issues discovered during validation.
- `client/src/views/Layout.vue`
  - Adjust any release-blocking primary navigation defects.
- `client/src/api/traceability.ts`
  - Fix any contract issues discovered during readiness validation.
- `client/src/types/traceability.ts`
  - Fix any client-local contract drift.
- `packages/types/traceability.ts`
  - Only if readiness validation proves a true contract bug rather than a consumer bug.
- `server/src/modules/traceability/traceability.controller.ts`
  - Fix release-blocking server issues in the primary traceability surface if found.
- `server/src/modules/traceability/traceability.service.ts`
  - Fix release-blocking traceability orchestration issues if found.
- `server/src/modules/batch-trace/controllers/trace.controller.ts`
  - Only if a remaining authority conflict is discovered.
- `server/src/modules/warehouse/traceability.controller.ts`
  - Only if a remaining authority conflict is discovered.
- `client/src/views/traceability/TraceabilityQuery.vue`
  - Fix primary traceability UI issues found in full-business validation.
- `client/src/views/traceability/components/TraceGraphView.vue`
  - Fix graph correctness or contract-consumption defects found in validation.
- `client/src/views/traceability/components/TraceRiskPanel.vue`
  - Fix risk rendering or permission-action defects found in validation.
- `client/src/views/warehouse/*.vue`
  - Fix release-blocking warehouse issues found in business-scope validation.
- `client/src/views/batch-trace/*.vue`
  - Fix release-blocking batch/business issues or finalize local-only behavior.
- `client/src/views/customer-complaint/*.vue`
  - Fix release-blocking complaint issues if found.
- `client/src/views/deviation/*.vue`
  - Fix release-blocking deviation issues if found.
- `server/src/modules/**/**/*.spec.ts`
  - Update and tighten tests where readiness validation shows missing coverage.
- `client/src/**/__tests__/*.spec.ts`
  - Update and tighten tests where readiness validation shows missing coverage.

### Existing files to read before editing

- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/2026-04-25-internal-go-live-readiness-and-full-remediation-design.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/2026-04-25-convergence-hard-cutover-and-validation-design.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/2026-04-24-traceability-query-layer-design.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/2026-04-24-traceability-query-api-contract-design.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-25-contract-cleanup-convergence-register.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/router/index.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/views/Layout.vue`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/packages/types/traceability.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/types/traceability.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/api/traceability.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/traceability/traceability.controller.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/traceability/traceability.service.ts`

---

### Task 1: Build The Release-Scope And Evidence Skeleton

**Files:**
- Create: `docs/superpowers/reports/2026-04-25-internal-go-live-readiness-report.md`
- Create: `docs/superpowers/reports/2026-04-25-full-business-e2e-matrix.md`
- Create: `docs/superpowers/reports/2026-04-25-contract-consistency-report.md`
- Create: `docs/superpowers/reports/2026-04-25-monitoring-and-rollback-readiness.md`
- Create: `docs/superpowers/reports/2026-04-25-internal-go-live-signoff.md`

- [ ] **Step 1: Create the top-level readiness report shell**

```md
# Internal Go-Live Readiness Report

## Release Scope
- business domains:
- primary routes/pages:
- backend modules:

## Gate Status
- frontend gate:
- backend gate:
- contract gate:
- permission gate:
- data/state gate:
- convergence gate:
- docs gate:
- observability gate:

## Final Recommendation
- go / no-go:
- blockers:
- evidence links:
```

- [ ] **Step 2: Create the full-business E2E matrix shell**

```md
# Full Business E2E Matrix

| Business Domain | Primary Flow | Critical Branch | Permission Flow | Export/Result Flow | Test File | Status |
| --- | --- | --- | --- | --- | --- | --- |
```

- [ ] **Step 3: Create the contract consistency, monitoring/rollback, and sign-off shells**

```md
# Contract Consistency Report

## Shared Type Authority
## Client Adapter Alignment
## Server DTO Alignment
## Response Shape Alignment
## Test Fixture Alignment
```

```md
# Monitoring And Rollback Readiness

## Monitoring Signals
## Error Logs
## Stop-Run Triggers
## Rollback Triggers
## Rollback Owners
```

```md
# Internal Go-Live Sign-Off

| Role | Owner | Status | Notes |
| --- | --- | --- | --- |
| Technical Validation |  | Pending |  |
| Test Validation |  | Pending |  |
| Business Validation |  | Pending |  |
| System Owner |  | Pending |  |
```

- [ ] **Step 4: Verify all report files exist**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear && ls docs/superpowers/reports/2026-04-25-*internal-go-live* docs/superpowers/reports/2026-04-25-*e2e-matrix* docs/superpowers/reports/2026-04-25-*contract-consistency* docs/superpowers/reports/2026-04-25-*monitoring-and-rollback* docs/superpowers/reports/2026-04-25-*signoff*
```

Expected: all five files are present.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/reports/2026-04-25-internal-go-live-readiness-report.md docs/superpowers/reports/2026-04-25-full-business-e2e-matrix.md docs/superpowers/reports/2026-04-25-contract-consistency-report.md docs/superpowers/reports/2026-04-25-monitoring-and-rollback-readiness.md docs/superpowers/reports/2026-04-25-internal-go-live-signoff.md
git commit -m "docs: add internal go-live readiness evidence skeleton"
```

### Task 2: Define And Prove Full-Business E2E Coverage

**Files:**
- Modify: `docs/superpowers/reports/2026-04-25-full-business-e2e-matrix.md`
- Modify: `client/src/**/__tests__/*.spec.ts`
- Modify: `e2e/*.spec.ts`

- [ ] **Step 1: Write the failing E2E matrix assertion as a report requirement**

```md
## Coverage Rule

Every business domain in release scope must list:
- primary flow
- critical branch
- permission flow
- export/result flow where applicable
- current execution status
```

- [ ] **Step 2: Inventory the current E2E and major client-flow coverage**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear && rg --files e2e client/src | rg 'spec\.ts$|test\.ts$|__tests__'
```

Expected: a concrete list of current executable flow tests to map into the matrix.

- [ ] **Step 3: Populate the matrix with all in-scope business domains**

At minimum include rows for:

```md
| Traceability | /traceability query | graph / ledger toggle | permission-limited result view | export / snapshot | e2e/... | Pending |
| Batch / Warehouse | batch list/detail and warehouse operations | material balance | restricted warehouse action | result/export path | e2e/... | Pending |
| Complaint / Deviation / CAPA | complaint create/view, deviation flow, CAPA flow | branch transitions | role-limited action | export/result path if applicable | e2e/... | Pending |
```

- [ ] **Step 4: Run the mapped E2E suites and update status**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client && npm test
cd /Users/jiashenglin/Desktop/好玩的项目/noidear && npm run test:e2e
```

Expected: all in-scope release flows pass; any failure becomes a remediation blocker, not a deferred note.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/reports/2026-04-25-full-business-e2e-matrix.md client/src e2e
git commit -m "test: finalize full-business e2e release matrix"
```

### Task 3: Clear The Frontend Release Gate

**Files:**
- Modify: `client/src/router/index.ts`
- Modify: `client/src/views/Layout.vue`
- Modify: `client/src/views/traceability/TraceabilityQuery.vue`
- Modify: `client/src/views/traceability/components/*.vue`
- Modify: `client/src/views/**/**/*.vue`
- Modify: `client/src/api/**/*.ts`
- Modify: `docs/superpowers/reports/2026-04-25-internal-go-live-readiness-report.md`

- [ ] **Step 1: Record the frontend gate checklist in the readiness report**

```md
## Frontend Gate
- [ ] build passes
- [ ] typecheck passes
- [ ] unit/integration/e2e pass
- [ ] primary navigation works
- [ ] primary pages render
- [ ] core interactions complete
- [ ] no known blocker UI issue remains
- [ ] no contract drift remains
- [ ] no legacy primary path remains
```

- [ ] **Step 2: Run the frontend validation commands and capture failures**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client && npm run build:check && npm test
```

Expected: if anything fails, it becomes an immediate remediation target under this task.

- [ ] **Step 3: Fix frontend blockers until the gate is clean**

Use minimal targeted fixes in the affected routes, pages, adapters, and components. Do not introduce new behavior; only resolve release blockers.

Example contract-safe usage:

```ts
const riskItems = computed(() => props.result?.risk.items ?? []);
const graphNodes = computed(() => props.result?.graph.nodes ?? []);
const canInitiateLinkage = computed(() => props.result?.permission.canInitiateLinkage ?? false);
```

- [ ] **Step 4: Re-run frontend validation and mark the report**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client && npm run build:check && npm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src docs/superpowers/reports/2026-04-25-internal-go-live-readiness-report.md
git commit -m "fix: clear frontend release gate blockers"
```

### Task 4: Clear The Backend Release Gate

**Files:**
- Modify: `server/src/modules/**/*.ts`
- Modify: `server/src/modules/**/*.spec.ts`
- Modify: `docs/superpowers/reports/2026-04-25-internal-go-live-readiness-report.md`

- [ ] **Step 1: Record the backend gate checklist in the readiness report**

```md
## Backend Gate
- [ ] build passes
- [ ] unit/integration/e2e pass
- [ ] primary endpoint families are available
- [ ] DTO and shared contract alignment is verified
- [ ] query/balance/linkage/export/snapshot are correct
- [ ] no known result or state defect remains in core modules
```

- [ ] **Step 2: Run backend validation commands and capture failures**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npm test && npm run build
```

Expected: if anything fails, it becomes an immediate remediation blocker under this task.

- [ ] **Step 3: Fix backend release blockers until the gate is clean**

Apply minimal targeted fixes only to clear build, test, DTO, response, state, and endpoint correctness blockers.

Example DTO alignment:

```ts
export class CreateTraceabilityLinkageDto {
  actionType!: string;
  sourceQueryRef!: string;
  sourceNodeIds!: string[];
  sourceRiskIds?: string[];
}
```

- [ ] **Step 4: Re-run backend validation and mark the report**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npm test && npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src docs/superpowers/reports/2026-04-25-internal-go-live-readiness-report.md
git commit -m "fix: clear backend release gate blockers"
```

### Task 5: Prove Contract Consistency And Permission Correctness

**Files:**
- Modify: `docs/superpowers/reports/2026-04-25-contract-consistency-report.md`
- Modify: `packages/types/traceability.ts`
- Modify: `client/src/types/traceability.ts`
- Modify: `client/src/api/traceability.ts`
- Modify: `server/src/modules/traceability/dto/*.ts`
- Modify: `server/src/modules/traceability/*.ts`
- Modify: `client/src/api/__tests__/traceability-contract.spec.ts`
- Modify: `server/src/modules/traceability/traceability-contract.mapper.spec.ts`

- [ ] **Step 1: Record the contract consistency sections**

```md
## Shared Type Authority
## Client Adapter Alignment
## Server DTO Alignment
## Response Shape Alignment
## Test Fixture Alignment
## Permission Enforcement Evidence
```

- [ ] **Step 2: Run focused contract-drift searches**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear && rg -n "sourceQueryHash|canInitiateAction|result\.risks|risk:\s*\{|graph\.(id|type|source|target|relation)" client/src server/src packages/types
```

Expected: either no matches in primary paths or a short list of explicit blockers to fix now.

- [ ] **Step 3: Fix all contract and permission blockers**

Examples:

```ts
export type { TraceQueryRequest, TraceQueryResult } from '@noidear/types';
```

```ts
const canUseAsOfPlayback = computed(() => props.result?.permission.canUseAsOfPlayback ?? false);
```

- [ ] **Step 4: Run focused contract tests**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client && npm test -- traceability-contract.spec.ts
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npm test -- traceability-contract.mapper.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/types/traceability.ts client/src/types/traceability.ts client/src/api/traceability.ts server/src/modules/traceability client/src/api/__tests__/traceability-contract.spec.ts server/src/modules/traceability/traceability-contract.mapper.spec.ts docs/superpowers/reports/2026-04-25-contract-consistency-report.md
git commit -m "fix: clear contract and permission release blockers"
```

### Task 6: Prove Convergence, Monitoring, And Rollback Readiness

**Files:**
- Modify: `docs/superpowers/reports/2026-04-25-monitoring-and-rollback-readiness.md`
- Modify: `docs/superpowers/reports/2026-04-25-contract-cleanup-convergence-register.md`
- Modify: `docs/superpowers/reports/2026-04-25-internal-go-live-readiness-report.md`
- Modify: `docs/AGENT_GUIDE.md`

- [ ] **Step 1: Record convergence, monitoring, and rollback sections**

```md
## Convergence Gate
- [ ] one primary traceability route remains
- [ ] one primary page remains
- [ ] one primary adapter remains
- [ ] legacy authorities are removed or frozen as bridges/local-only functions

## Monitoring Signals
## Stop-Run Triggers
## Rollback Triggers
## Owners
```

- [ ] **Step 2: Run convergence evidence searches**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear && rg -n "path: 'traceability'|path: 'batch-trace/query'|path: 'warehouse/traceability'" client/src/router/index.ts && rg -n "/batch-trace/query|/warehouse/traceability|TraceabilityLegacyRedirect|WarehouseTraceabilityLegacyRedirect" client/src docs
```

Expected: clear evidence of one primary route and explicit classification of legacy surfaces.

- [ ] **Step 3: Update AGENT_GUIDE with the internal go-live gate rule**

```md
## Internal Go-Live Gate

Internal formal trial operation requires zero known issues in release scope, one primary traceability authority, complete release evidence, and explicit sign-off. Monitoring and rollback readiness protect trial operation but do not substitute for remediation.
```

- [ ] **Step 4: Verify monitoring and rollback readiness entries are complete**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear && rg -n "## Monitoring Signals|## Stop-Run Triggers|## Rollback Triggers|## Owners" docs/superpowers/reports/2026-04-25-monitoring-and-rollback-readiness.md
```

Expected: all readiness sections are present and populated.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/reports/2026-04-25-monitoring-and-rollback-readiness.md docs/superpowers/reports/2026-04-25-contract-cleanup-convergence-register.md docs/superpowers/reports/2026-04-25-internal-go-live-readiness-report.md docs/AGENT_GUIDE.md
git commit -m "docs: finalize convergence and rollback readiness evidence"
```

### Task 7: Assemble Final Evidence And Complete Sign-Off

**Files:**
- Modify: `docs/superpowers/reports/2026-04-25-internal-go-live-readiness-report.md`
- Modify: `docs/superpowers/reports/2026-04-25-internal-go-live-signoff.md`

- [ ] **Step 1: Mark every gate in the readiness report with a final status**

```md
## Gate Status
- frontend gate: PASS
- backend gate: PASS
- contract gate: PASS
- permission gate: PASS
- data/state gate: PASS
- convergence gate: PASS
- docs gate: PASS
- observability gate: PASS
```

- [ ] **Step 2: Link the evidence artifacts in the final recommendation section**

```md
## Final Recommendation
- go / no-go: GO
- blockers: none
- evidence links:
  - full-business e2e matrix
  - contract consistency report
  - monitoring and rollback readiness
  - convergence register
  - sign-off sheet
```

- [ ] **Step 3: Update the sign-off sheet with explicit approval state**

```md
| Role | Owner | Status | Notes |
| --- | --- | --- | --- |
| Technical Validation | <name> | Approved | All gates green |
| Test Validation | <name> | Approved | Full-business E2E complete |
| Business Validation | <name> | Approved | Trial-operation flows accepted |
| System Owner | <name> | Approved | Release authorized |
```

- [ ] **Step 4: Run final full validation commands**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client && npm run build:check && npm test
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npm test && npm run build
cd /Users/jiashenglin/Desktop/好玩的项目/noidear && npm run test:e2e
```

Expected: all release-scope verification passes with no known in-scope defects remaining.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/reports/2026-04-25-internal-go-live-readiness-report.md docs/superpowers/reports/2026-04-25-internal-go-live-signoff.md
git commit -m "docs: finalize internal go-live evidence and sign-off"
```

## Self-Review

### Spec coverage

This plan covers:

- release-scope definition and evidence skeleton
- full-business E2E matrix
- frontend gate
- backend gate
- contract and permission gate
- convergence, monitoring, and rollback gate
- final sign-off and release packet

### Placeholder scan

The plan avoids placeholder language in execution steps. Each task includes explicit files, commands, and expected outcomes.

### Type consistency

The plan consistently uses the frozen traceability vocabulary and the internal formal trial-operation terminology throughout.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-25-internal-go-live-readiness-and-full-remediation-implementation.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
