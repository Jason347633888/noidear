# Release Baseline Reconstruction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild a trustworthy current baseline for `/Users/jiashenglin/Desktop/好玩的项目/noidear` by re-verifying code state, correcting baseline-distorting drift, classifying workspace/doc assets, and replacing stale current-path reports.

**Architecture:** This plan treats baseline reconstruction as a bounded repo-state recovery project, not a feature build. Work proceeds in a strict order: verify reality, reconcile residual drift, rebuild current-path reports, classify assets, and then assign a final baseline outcome. `/tasks` feature completion is explicitly documented as a gap, not implemented here.

**Tech Stack:** Vue 3 + Vite + Vitest + Playwright, NestJS + Jest, git, ripgrep, Markdown reports under `docs/superpowers/`.

---

## File Structure

### Primary files to create

- Create: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-25-release-baseline-reconstruction-report.md`
- Create: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-25-workspace-asset-register.md`
- Create: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-25-document-asset-register.md`
- Create: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-25-known-feature-gap-register.md`

### Primary files to modify

- Modify: `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/api/batch.ts`
- Modify: `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/api/__tests__/traceability-convergence.spec.ts`
- Modify: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/PROJECT_STRUCTURE.md`
- Modify: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-25-internal-go-live-readiness-report.md`
- Modify: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-25-full-business-e2e-matrix.md`
- Modify: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-25-contract-cleanup-convergence-register.md`

### Likely files to classify or remove

- Review/remove/archive: `/Users/jiashenglin/Desktop/好玩的项目/noidear/AGENTS.md.bak-2026-04-24`
- Review/remove/archive: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/AGENT_GUIDE.md.bak-2026-04-24`
- Review/remove/archive: `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/e2e/temp-test.spec.ts`
- Review/classify: deleted tracked docs under `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/plans/` and `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/`
- Review/classify: untracked spec/plan/report files already present in `git status`

---

### Task 1: Capture Current High-Signal Verification Reality

**Files:**
- Create: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-25-release-baseline-reconstruction-report.md`
- Modify: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-25-internal-go-live-readiness-report.md`

- [ ] **Step 1: Run the verification commands and capture exact outputs**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client && npm run build:check
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client && npm run test
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npm run build
```

Expected:
- `build:check` exits `0`
- `client test` currently exposes any remaining real failures
- `server build` exits `0`

- [ ] **Step 2: Write the raw verification summary into the new reconstruction report**

Use this exact report skeleton:

```md
# Release Baseline Reconstruction Report

## Verification Snapshot
- client build:check: PASS/FAIL (exit code)
- client test: PASS/FAIL (exit code)
- server build: PASS/FAIL (exit code)

## Verified Facts
- [fact 1]
- [fact 2]
- [fact 3]

## Mismatches Against Current Reports
- [report path] says [claim], but current verification shows [reality]
```

- [ ] **Step 3: Record command evidence inline, not paraphrase-only**

Add a compact evidence section like:

```md
## Evidence
- `client build:check` run on 2026-04-25: exit 0
- `client test` run on 2026-04-25: exit 1, failing file `client/src/api/__tests__/traceability-convergence.spec.ts`
- `server build` run on 2026-04-25: exit 0
```

- [ ] **Step 4: Update readiness report facts that are already disproven**

At minimum, replace stale statements about:
- current typecheck status
- current client unit/integration status
- current todo module existence

- [ ] **Step 5: Verify the report now matches the rerun results**

Run:

```bash
rg -n "typecheck passes|353/353|/api/v1/todos don't exist|todo module was removed" \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-25-internal-go-live-readiness-report.md
```

Expected:
- no stale phrases remain unchanged

- [ ] **Step 6: Commit**

```bash
git add \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-25-release-baseline-reconstruction-report.md \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-25-internal-go-live-readiness-report.md
git commit -m "docs: record current baseline verification reality"
```

---

### Task 2: Close Baseline-Distorting Traceability Drift

**Files:**
- Modify: `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/api/batch.ts`
- Modify: `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/api/__tests__/traceability-convergence.spec.ts`
- Test: `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/api/__tests__/traceability-convergence.spec.ts`

- [ ] **Step 1: Write or confirm the failing convergence expectation**

The key expectation should remain:

```ts
it('does not expose traceApi (removed duplicate trace query surface)', async () => {
  const batchModule = await import('@/api/batch');
  expect('traceApi' in batchModule).toBe(false);
});
```

- [ ] **Step 2: Run the focused failing test to capture the baseline failure**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client && \
  npx vitest run src/api/__tests__/traceability-convergence.spec.ts
```

Expected:
- FAIL because `traceApi` is still exported from `client/src/api/batch.ts`

- [ ] **Step 3: Remove the duplicate trace query export from `client/src/api/batch.ts`**

Delete the legacy trace section:

```ts
export interface TraceNode {
  id: string;
  name: string;
  type: string;
  batchNumber?: string;
  quantity?: number;
  date?: string;
  children?: TraceNode[];
}

export interface TraceResult {
  batchNumber: string;
  productName: string;
  forwardTrace: TraceNode[];
  backwardTrace: TraceNode[];
}

export const traceApi = {
  fullTrace(batchId: string) {
    return request.get<TraceResult>(`/batch-trace/production-batches/${batchId}/trace`);
  },
};
```

- [ ] **Step 4: Re-run the focused test and confirm it passes**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client && \
  npx vitest run src/api/__tests__/traceability-convergence.spec.ts
```

Expected:
- PASS

- [ ] **Step 5: Re-run the full client test suite to confirm no new regression**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client && npm run test
```

Expected:
- current suite state is improved and traceability convergence no longer fails

- [ ] **Step 6: Commit**

```bash
git add \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/api/batch.ts \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/api/__tests__/traceability-convergence.spec.ts
git commit -m "fix: remove duplicate batch trace adapter surface"
```

---

### Task 3: Reclassify `/tasks` As A Real Feature Gap In Current Docs

**Files:**
- Modify: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/PROJECT_STRUCTURE.md`
- Create: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-25-known-feature-gap-register.md`
- Review: `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/router/index.ts`
- Review: `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/task/task.controller.ts`

- [ ] **Step 1: Confirm current `/tasks` reality from code, not docs**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear && \
  rg -n "path: 'tasks'|TaskCreate.vue|TaskDetail.vue|@Controller\('tasks'\)" \
  client/src/router/index.ts client/src/views/tasks server/src/modules/task docs/PROJECT_STRUCTURE.md
```

Expected:
- router shows `/tasks`
- docs still mention missing `TaskCreate.vue` and `TaskDetail.vue`
- server task controller is read-only

- [ ] **Step 2: Add an explicit feature-gap record**

Create this report skeleton:

```md
# Known Feature Gap Register

## `/tasks` Create/Submit Flow
- Current route reality: `/tasks` only
- Missing route: `/tasks/create`
- Missing page surface: task create/detail pages
- Missing backend write surface: create/submit/draft/cancel/approve task flow in `server/src/modules/task/`
- Impact: scenario E2E files cannot fully run
- Out of scope for baseline reconstruction: yes
- Next subproject: task-flow-completion
```

- [ ] **Step 3: Correct `docs/PROJECT_STRUCTURE.md` so it no longer states missing task pages as current fact**

Replace the current task lines with wording like:

```md
| `tasks/TaskList.vue` | `/tasks` | 当前任务列表入口 |
| `tasks/TaskCreate.vue` | `/tasks/create` | 规划中，当前未实现 |
| `tasks/TaskDetail.vue` | `/tasks/:id` | 规划中，当前未实现 |
```

- [ ] **Step 4: Verify the doc no longer falsely asserts those pages exist**

Run:

```bash
rg -n "新建/派发任务|任务详情与填报" /Users/jiashenglin/Desktop/好玩的项目/noidear/docs/PROJECT_STRUCTURE.md
```

Expected:
- wording explicitly indicates planned/missing, not current implementation

- [ ] **Step 5: Commit**

```bash
git add \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/docs/PROJECT_STRUCTURE.md \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-25-known-feature-gap-register.md
git commit -m "docs: classify tasks create submit flow as feature gap"
```

---

### Task 4: Rebuild The Current-Path E2E And Readiness Reports

**Files:**
- Modify: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-25-full-business-e2e-matrix.md`
- Modify: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-25-internal-go-live-readiness-report.md`
- Modify: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-25-contract-cleanup-convergence-register.md`

- [ ] **Step 1: Compare report claims against current rerun results and current code**

Use focused searches:

```bash
rg -n "353/353|~40 pre-existing vue-tsc|todo module was removed|GO|blockers: none" \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-25-internal-go-live-readiness-report.md
```

```bash
rg -n "KNOWN_SKIP|did not run|/tasks/create|tasks submit 404" \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-25-full-business-e2e-matrix.md
```

- [ ] **Step 2: Replace overstated release claims with current-truth phrasing**

At minimum fix these classes of statements:

```md
- do not say "blockers: none remaining in release scope" if current baseline still has active contradictions
- do not say "go / no-go: GO" unless the reconstructed baseline truly supports that claim
- do not say todo module was removed if `server/src/modules/todo/` is present
- do not say client unit/integration is fully green if `npm run test` still fails
```

- [ ] **Step 3: Mark stale report sections explicitly when they are preserved for history**

Use a banner like:

```md
> Status: historical snapshot from earlier run; replaced in current baseline reconstruction by `2026-04-25-release-baseline-reconstruction-report.md`.
```

- [ ] **Step 4: Reconcile convergence register language with the actual remaining drift state**

The convergence register must stop claiming closure if duplicate authority or stale surfaces still existed at the time of verification.

- [ ] **Step 5: Verify all current-path reports agree on the same current state**

Run:

```bash
rg -n "todo module was removed|353/353|go / no-go: GO|blockers: none" \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-25-*.md
```

Expected:
- no stale contradictory claims remain in current reports

- [ ] **Step 6: Commit**

```bash
git add \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-25-full-business-e2e-matrix.md \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-25-internal-go-live-readiness-report.md \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-25-contract-cleanup-convergence-register.md
git commit -m "docs: rebuild current-path baseline reports"
```

---

### Task 5: Classify Workspace Assets And Document Assets

**Files:**
- Create: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-25-workspace-asset-register.md`
- Create: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-25-document-asset-register.md`
- Review/remove/archive: backup/temp/orphan files from current `git status`

- [ ] **Step 1: Capture raw workspace state**

Run:

```bash
git -C /Users/jiashenglin/Desktop/好玩的项目/noidear status --short
```

Expected:
- full list of modified, deleted, and untracked files to classify

- [ ] **Step 2: Build the workspace asset register**

Use this template:

```md
# Workspace Asset Register

| File | Git State | Category | Action | Reason |
| --- | --- | --- | --- | --- |
| client/e2e/temp-test.spec.ts | ?? | temp/orphan | delete | not part of production test matrix |
| AGENTS.md.bak-2026-04-24 | ?? | backup artifact | delete or archive | backup file not current authority |
```

- [ ] **Step 3: Build the document asset register**

Use this template:

```md
# Document Asset Register

| File | Current Status | Target Status | Action | Reason |
| --- | --- | --- | --- | --- |
| docs/superpowers/specs/... | current/historical/invalid | current/historical/invalid | keep/archive/delete | rationale |
```

- [ ] **Step 4: Apply the low-risk cleanup actions**

Delete or archive only files that are clearly in one of these categories:

```text
- *.bak backup artifacts
- temp/orphan local tests
- root-level orphan debug utilities with no baseline value
```

Do **not** delete historical specs/plans until they are classified in the register.

- [ ] **Step 5: Re-run `git status --short` and make sure every remaining item is explained by a register row**

Run:

```bash
git -C /Users/jiashenglin/Desktop/好玩的项目/noidear status --short
```

Expected:
- every remaining diff maps to a keep/archive/restore decision in the registers

- [ ] **Step 6: Commit**

```bash
git add \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-25-workspace-asset-register.md \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-25-document-asset-register.md
git commit -m "docs: classify baseline workspace and document assets"
```

---

### Task 6: Reclassify Historical Specs/Plans On The Current Path

**Files:**
- Modify or move: historical docs under `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/plans/`
- Modify or move: stale current-path docs under `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/`
- Update: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-25-document-asset-register.md`

- [ ] **Step 1: Identify docs that are currently ambiguous rather than clearly current or historical**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear && \
  git status --short | rg "docs/"
```

Expected:
- candidate list of deleted/untracked/modified docs needing classification

- [ ] **Step 2: Mark or relocate historical-but-valuable artifacts**

Use one of two allowed actions:

```text
- keep in place with a clear historical/superseded banner
- move to an archive location if the current path is being polluted
```

- [ ] **Step 3: Remove clearly valueless doc artifacts**

Examples:

```text
- backup files
- duplicate scratch docs
- temp docs that are not cited and not current authority
```

- [ ] **Step 4: Verify current-path docs now represent only current authority**

Run:

```bash
find /Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers -maxdepth 2 -type f | sort
```

Expected:
- current path is understandable
- historical assets are clearly marked or moved

- [ ] **Step 5: Commit**

```bash
git add /Users/jiashenglin/Desktop/好玩的项目/noidear/docs
git commit -m "docs: separate current and historical baseline artifacts"
```

---

### Task 7: Assign Final Baseline Outcome

**Files:**
- Modify: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-25-release-baseline-reconstruction-report.md`
- Cross-check: all updated reports and registers from Tasks 1-6

- [ ] **Step 1: Review the reconstruction report against the spec outcome definitions**

Use this exact outcome block:

```md
## Final Baseline Outcome
- Outcome: baseline_recovered | baseline_partially_recovered | baseline_not_recovered
- Reason:
  - [reason 1]
  - [reason 2]
  - [reason 3]
```

- [ ] **Step 2: Populate the final outcome using the real post-cleanup state**

Rules:

```text
- baseline_recovered: only if current reports, verification, and asset classification all align
- baseline_partially_recovered: if truth is improved but at least one major distortion remains
- baseline_not_recovered: if current-path artifacts still cannot be trusted
```

- [ ] **Step 3: Add explicit next-subproject handoff for `/tasks`**

Use wording like:

```md
## Next Subproject
- Name: Task Flow Completion
- Why next: `/tasks` create/detail/submit remains a real feature gap after baseline truth is restored
```

- [ ] **Step 4: Do a final repo-state verification pass**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client && npm run build:check
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client && npm run test
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npm run build
cd /Users/jiashenglin/Desktop/好玩的项目/noidear && git status --short
```

Expected:
- final status is recorded honestly in the reconstruction report
- remaining diffs, if any, are classified and intentional

- [ ] **Step 5: Commit**

```bash
git add \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-25-release-baseline-reconstruction-report.md
git commit -m "docs: assign final reconstructed baseline outcome"
```

---

## Self-Review

### Spec Coverage

This plan covers:
- high-signal verification reruns
- residual drift cleanup for current baseline interpretation
- `/tasks` gap classification without feature implementation
- current-path report correction
- workspace/document asset classification
- final baseline outcome assignment

### Placeholder Scan

Checked for unresolved placeholders, deferred-language markers, and shortcut references.
None remain in the plan body.

### Type / Naming Consistency

Key names used consistently:
- `baseline_recovered`
- `baseline_partially_recovered`
- `baseline_not_recovered`
- `known feature gap`
- `workspace asset register`
- `document asset register`

