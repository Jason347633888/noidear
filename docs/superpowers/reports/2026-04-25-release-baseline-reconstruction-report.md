# Release Baseline Reconstruction Report

**Date:** 2026-04-25  
**Status:** Complete

## Purpose

This report records the actual output of running the three key verification commands on 2026-04-25, to detect any stale or incorrect claims in existing reports generated earlier in the day.

## Verification Snapshot

- client build:check: PASS (exit code 0)
- client test: PARTIAL FAIL (exit code 0, but 1 test failing / 352 passing out of 353 total)
- server build: PASS (exit code 0)

## Evidence

### `client build:check` — exit 0

Command: `npm run build:check` (runs `vue-tsc && vite build`)

- `vue-tsc --noEmit`: exit 0, zero errors, zero output
- `vite build`: exit 0, 3317 modules transformed, build succeeded

**Finding:** The readiness report's claim that "vue-tsc reports ~40 TS errors across training/workflow/userlist views" is **stale**. As of this reconstruction run, `vue-tsc` exits with 0 errors. Either the errors were fixed in a subsequent commit, or the initial report was inaccurate.

### `client test` — exit 0, 1 failing test

Command: `npm run test` (Vitest)

Results: 1 failed | 352 passed (353 total test cases across 41 test files)

Failing test:
```
FAIL src/api/__tests__/traceability-convergence.spec.ts
  > legacy batch adapter surface
  > does not expose traceApi (removed duplicate trace query surface)
  AssertionError: expected true to be false
    at traceability-convergence.spec.ts:54
    expect('traceApi' in batchModule).toBe(false)  // got true
```

The test asserts that `traceApi` is NOT exported from `@/api/batch`, but it IS present. The test was written anticipating a cleanup that has not yet happened. Note: Vitest exits 0 even with a failing test in this configuration (no `--reporter` flag forcing non-zero on failure was active at test-runner level — exit code 0 was confirmed).

**Finding:** The readiness report claims "353/353 unit tests pass." This is **incorrect**. Current baseline is 352/353 passing, 1 failing.

### `server build` — exit 0

Command: `npm run build` (runs `nest build`)

Output: clean exit, no errors or warnings printed.

**Finding:** Server build claim in readiness report ("nest build clean, 0 errors") is **accurate**.

### `server/src/modules/todo/` directory

```
server/src/modules/todo/
  dto/
  todo.controller.ts
  todo.module.ts
  todo.service.spec.ts
  todo.service.ts
```

**Finding:** The readiness report states "todo module was removed" as justification for 3 failing backend tests. The todo module directory **still exists** with a full implementation including controller, service, module, and tests. The claim is incorrect. The actual reason those backend tests fail may be different (endpoint not wired into app.module, or tests test a different path).

## Verified Facts

1. `vue-tsc --noEmit` exits 0 with zero type errors (typecheck passes cleanly)
2. `vite build` exits 0, 3317 modules transformed
3. Vitest exits 0 but 1 test is currently failing: `traceability-convergence.spec.ts` asserts `traceApi` is NOT in `@/api/batch` but it IS present
4. `nest build` exits 0, server TypeScript compilation is clean
5. `server/src/modules/todo/` exists with `todo.controller.ts`, `todo.module.ts`, `todo.service.ts` — it was NOT removed

## Mismatches Against Current Reports

| Report | Stale Claim | Current Reality |
|--------|-------------|-----------------|
| `2026-04-25-internal-go-live-readiness-report.md` | "typecheck passes" checkbox unchecked, says ~40 vue-tsc errors remain | vue-tsc exits 0, zero errors — typecheck NOW PASSES |
| `2026-04-25-internal-go-live-readiness-report.md` | "353/353 unit tests pass" | 352/353 — 1 failing test in `traceability-convergence.spec.ts` |
| `2026-04-25-internal-go-live-readiness-report.md` | "todo module was removed" | `server/src/modules/todo/` exists with full implementation |
| `2026-04-25-internal-go-live-readiness-report.md` | Known deferred: "~40 pre-existing vue-tsc type errors (non-blocking, vite build passes)" | No longer accurate — vue-tsc passes cleanly |

## Impact on Go/No-Go

The corrected baseline does not change the overall GO recommendation, but the evidence statements must be accurate:

- The typecheck status is now **better** than reported (was: ~40 errors; is: 0 errors)
- The unit test count is now **worse** than reported (was: 353/353; is: 352/353, 1 failing)
- The "todo module removed" rationale for backend failures needs re-investigation (module exists)

---

## Final Baseline Outcome

**Outcome:** baseline_recovered

**Reason:**
- `client build:check` (vue-tsc): PASS — 0 type errors
- `client test` (Vitest): PASS — 353/353
- `server build` (NestJS): PASS — clean compilation
- Baseline-distorting traceability drift closed: `traceApi` duplicate removed from `@/api/batch`; `TraceVisualization.vue` now defines the type and call locally, eliminating the circular conflict between the convergence test and the component
- `/tasks` create/submit gap formally classified in `2026-04-25-known-feature-gap-register.md` (not a drift, a known planned gap)
- Workspace and document assets classified in workspace-asset-register and document-asset-register
- Historical specs/plans separated from current-path docs (16 files committed as deletions)
- Current-path reports updated to reflect reconstruction truth

**Remaining intentional items (not blocking):**
- `client/e2e/.auth/admin-token.json` — auth token, expected to drift between runs
- E2E spec files — modified with auth fixes (correct current state)
- Server module files — modified with todo module integration (correct current state)
- 2 E2E scenario1 tests — KNOWN_SKIP (feature gap, documented)
- 2 undated orphan reports — `form-validation-audit.md`, `E2E-TEST-CHECKLIST.md` (historical value, deferred rename)

## Next Subproject

**Name:** Task Flow Completion  
**Why next:** `/tasks` create/detail/submit remains a real feature gap after baseline truth is restored. Documented in `2026-04-25-known-feature-gap-register.md`.
