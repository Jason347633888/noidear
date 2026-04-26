# Release Baseline Reconstruction Design

## 1. Goal And Boundary

This spec defines a heavy baseline reconstruction pass for `/Users/jiashenglin/Desktop/好玩的项目/noidear`.

The goal is to rebuild a **trustworthy repository baseline** so that current code, tests, reports, docs, and working-tree state describe the same reality.

This spec is not for new business features. It is for:

- re-establishing trustworthy verification results
- correcting stale or false readiness/e2e/convergence reports
- closing residual implementation drift that distorts baseline judgment
- classifying workspace assets and document assets
- separating current authority from historical assets

This spec includes:

- high-signal verification reruns
- report correction
- contract/convergence residual cleanup that affects baseline judgment
- workspace asset classification
- doc/spec/plan/report keep/archive/delete rules
- final baseline status decision

This spec does not include:

- implementing `/tasks` full create/submit flow
- adding new product features
- large unrelated refactors
- production go-live design

### Hard Rule

Anything that distorts the answer to “what is the current state of the repo?” is in scope.

---

## 2. Reconstruction Scope

Baseline reconstruction covers five object groups.

### 2.1 Code Objects

- `client/`
- `server/`
- `packages/`
- `tests/`
- `scripts/`

### 2.2 Verification Objects

- client build/typecheck/test
- server build/test
- targeted contract and convergence checks
- existing Playwright/E2E result claims

### 2.3 Report Objects

- readiness reports
- E2E matrix reports
- contract consistency reports
- convergence registers
- sign-off artifacts

### 2.4 Documentation Objects

- primary project docs
- specs
- plans
- reports
- structure/design reference docs

### 2.5 Workspace Objects

- modified tracked files
- deleted tracked files
- untracked files
- backup files
- temp tests
- generated files and local caches

### Hard Rule

If an object does not affect current baseline judgment, it is out of scope.

---

## 3. Authority Order

When facts conflict, use this authority order:

1. current code in repo
2. current verification output
3. current active specs/contracts
4. current reports
5. historical docs/plans/reports

### Interpretation

- If a report says “pass” but current verification fails, the report is wrong.
- If a doc says a route exists but router does not define it, the doc is wrong.
- If a historical plan says something was completed but current code disproves it, the plan is historical, not authoritative.

### Hard Rule

Reports and docs do not define reality. Current code and current verification do.

---

## 4. Verification Baseline Reconstruction

### 4.1 Required High-Signal Checks

At minimum, rerun and record:

- `cd client && npm run build:check`
- `cd client && npm run test`
- `cd server && npm run build`
- targeted convergence/contract checks if needed
- comparison of current E2E claims vs actual evidence already produced

### 4.2 Verification Objective

The objective is not “run everything possible”. The objective is to produce a trustworthy answer for:

- what currently passes
- what currently fails
- what is intentionally skipped
- what is known-skip because of missing functionality
- which reports are stale

### 4.3 Verification Recording

Every baseline claim must record:

- command run
- date/time
- exit code
- summary result
- whether result matches existing report claims

### Hard Rule

No verification claim may remain in a current report without executable evidence.

---

## 5. Residual Drift Cleanup

This section addresses code-level drift that distorts baseline judgment.

### 5.1 In-Scope Residual Drift

- obsolete exports still exposed in current adapters
- convergence tests that disagree with shipped surfaces
- duplicate authority surfaces still present in code
- docs/tests describing functionality that does not exist
- report language that treats missing functionality as completed

### 5.2 Known Current Examples

Examples already known at baseline-entry time:

- `client/src/api/batch.ts` still exports `traceApi`
- convergence test expects `traceApi` to be removed
- `/tasks` frontend route surface is incomplete
- `server/src/modules/task/task.controller.ts` only exposes read operations
- `docs/PROJECT_STRUCTURE.md` still lists missing task pages

### 5.3 Cleanup Rule

- If drift changes baseline interpretation, fix or reclassify it now.
- If drift is a real feature gap, do not hide it; classify it as a gap.
- If drift creates two active authorities, collapse to one or mark one historical.

### Hard Rule

Baseline reconstruction may classify feature gaps, but it may not disguise them.

---

## 6. Test Baseline Reconstruction

### 6.1 Test Status Vocabulary

The reconstruction pass uses these statuses:

- `PASS`
- `FAIL`
- `SKIP`
- `KNOWN_SKIP`
- `STALE_REPORT`
- `TEMP_OR_ORPHAN`

### 6.2 Test Meaning Audit

For major test files, verify not only status but meaning:

- Does the test name match what it actually validates?
- Is it a real component/integration test or just a module mock?
- Does it represent current product surface or a removed surface?

### 6.3 Special Attention Cases

- task-flow scenarios in `client/e2e/scenario1-*.spec.ts` through related files
- temporary tests such as `client/e2e/temp-test.spec.ts`
- convergence/contract tests
- tests labeled integration that do not mount real components

### Hard Rule

A test may not continue to represent a current capability if it only validates a mock shell of that capability.

---

## 7. Report System Reconstruction

### 7.1 Reports To Re-evaluate

At minimum:

- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-25-internal-go-live-readiness-report.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-25-full-business-e2e-matrix.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-25-contract-consistency-report.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-25-contract-cleanup-convergence-register.md`
- related sign-off artifacts

### 7.2 Report Outcome Labels

Each report must end baseline reconstruction in one of four states:

- `current`
- `superseded`
- `historical`
- `invalid`

### 7.3 Report Correction Rules

- A current report must match current repo reality.
- A stale but useful report should be marked historical or superseded.
- A report with materially false release claims must not remain current.

### Hard Rule

Only reports that match current repo reality may remain on the current authority path.

---

## 8. Document Asset Rules

### 8.1 Three Possible Outcomes

Every doc/spec/plan/report falls into exactly one bucket:

1. keep as current authority
2. archive as historical asset
3. delete

### 8.2 Keep As Current Authority

Requirements:

- still matches current code and verification
- still used for active development or release judgment
- not replaced by a newer authoritative doc

### 8.3 Archive As Historical Asset

Use this when a doc still has decision/audit value but should not remain on the current judgment path.

### 8.4 Delete

Delete when the file is clearly:

- a backup artifact
- a temp artifact
- a duplicate draft
- an orphan with no ongoing value

### Hard Rule

Document assets default to conservative archive. Backup/temp/error artifacts default to aggressive deletion.

---

## 9. Workspace Asset Classification

### 9.1 Required Categories

Every non-clean working-tree item must be classified as one of:

- keep and commit
- keep but do not commit yet
- archive
- delete
- restore

### 9.2 Typical Objects

- `*.bak-*`
- temp test files
- generated declaration files
- auth cache files
- root-level orphan utilities
- untracked specs/plans/reports
- tracked deletions of older docs

### 9.3 Output Requirement

The reconstruction pass must produce an explicit workspace classification register.

### Hard Rule

At the end of reconstruction, every remaining diff must have an explanation.

---

## 10. Current Path vs Historical Path

### 10.1 Current Path

Current path should contain only:

- active specs
- active plans
- active reports
- active project docs

### 10.2 Historical Path

Historical materials may be preserved, but must no longer behave like current authority.

### 10.3 Historical Handling Options

- move to explicit archive location
- or keep in place with explicit `historical` / `superseded` marking if relocation is too disruptive

### Hard Rule

Historical materials may remain in the repo, but they may not remain ambiguous.

---

## 11. `/tasks` Gap Handling In This Reconstruction

### 11.1 Current Fact Pattern

Current repo reality:

- `/tasks` exists
- `/tasks/create` is missing from router
- `/tasks/:id` page surface is missing from frontend route map
- task controller only exposes read endpoints
- docs/API/tests still describe a fuller task flow

### 11.2 Handling Rule

This reconstruction does **not** implement `/tasks` create/submit flow.

It only does three things:

1. states the gap accurately
2. removes false claims that the capability is already present
3. records the gap for the next dedicated subproject

### Hard Rule

Baseline reconstruction may define the gap precisely, but it may not silently expand into task-flow feature work.

---

## 12. Final Baseline Decision

At the end of the pass, assign one repository baseline outcome:

- `baseline_recovered`
- `baseline_partially_recovered`
- `baseline_not_recovered`

### 12.1 Minimum Bar For `baseline_recovered`

All of the following are true:

- high-signal verification rerun completed and recorded
- current major reports reflect current reality
- baseline-distorting residual drift resolved or explicitly classified
- workspace assets classified
- docs/specs/plans/reports on the current path are clearly separated from historical assets

### 12.2 `baseline_partially_recovered`

Use when baseline truth is improved but at least one major current-path distortion remains unresolved.

### 12.3 `baseline_not_recovered`

Use when current reports/docs/workspace still cannot be trusted as a release or development baseline.

### Hard Rule

This subproject is not done until it produces an explicit baseline outcome.

---

## 13. Deliverables

Minimum required outputs:

1. this spec
2. a corresponding implementation plan
3. a baseline reconstruction report
4. a workspace asset classification register
5. a document asset classification register
6. corrected current reports or replacement reports
7. an explicit `/tasks` feature-gap record

---

## 14. Execution Rules

Implementation must follow this order:

1. rerun high-signal verification
2. classify real pass/fail/skip/known-skip
3. fix or classify baseline-distorting residuals
4. correct or replace reports
5. classify workspace and document assets
6. assign final baseline outcome

Not allowed:

- deleting files first and searching for evidence later
- updating reports before rerunning verification
- mixing `/tasks` feature implementation into this pass
- leaving historical/current status ambiguous

### Hard Rule

Success is not “the repo looks cleaner”. Success is “the repo becomes trustworthy again.”

---

## Appendix A: High-Signal Verification Matrix

Suggested columns:

- command
- target
- exit code
- result
- evidence file
- current/historical relevance

## Appendix B: Report Classification Register

Suggested columns:

- file
- current state
- target state
- action
- rationale

## Appendix C: Workspace Asset Register

Suggested columns:

- file
- type
- current git state
- classification
- action

## Appendix D: Document Asset Register

Suggested columns:

- file
- authority status
- target status
- action

## Appendix E: Known Feature Gap Register

Suggested columns:

- gap
- current impact
- report impact
- in-scope now?
- next subproject

