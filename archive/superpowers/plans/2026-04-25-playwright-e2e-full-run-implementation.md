# Playwright E2E Full Run Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run the full Playwright E2E suite against the live Docker stack, fix all code-class failures, and update the E2E matrix + readiness report.

**Architecture:** Sequentially: health-check servers → full run → categorize failures → fix code-class → re-run → update reports.

**Tech Stack:** Playwright 1.x, Docker (postgres/redis/minio already running), NestJS 10, Vite 5

---

## Prerequisites

These must be true before running any step:
1. Docker services running: `docker ps | grep -E "postgres|redis|minio"`
2. Server running: `cd server && npm run start:dev` (port 3000)
3. Client running: `cd client && npm run dev` (port 5173)
4. Auth token cached: `client/e2e/.auth/admin-token.json` present (or global-setup will create it)

---

## Task 1: Start services and verify health

- [ ] **Step 1: Verify Docker services**

```bash
docker ps --format "{{.Names}}\t{{.Status}}" | grep -E "postgres|redis|minio"
```

Expected: all three showing `Up`.

- [ ] **Step 2: Check if server is already running**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/v1/health
```

Expected: `200`. If `000` (connection refused), start the server in a background terminal:
```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npm run start:dev
```

Wait 15 seconds and retry health check.

- [ ] **Step 3: Check if client dev server is already running**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173
```

Expected: `200`. If `000`, start the client:
```bash
npm run dev
```

Wait 5 seconds and retry.

- [ ] **Step 4: Validate auth token cache**

```bash
cat client/e2e/.auth/admin-token.json | python3 -m json.tool | grep -E "token|exp"
```

If token is expired (check `exp` field vs current Unix timestamp) or missing, force a fresh login by deleting the cache file — global-setup will recreate it:
```bash
rm -f client/e2e/.auth/admin-token.json
```

---

## Task 2: Full E2E run and failure categorization

- [ ] **Step 1: Run full suite**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client
npx playwright test --reporter=list 2>&1 | tee /tmp/e2e-run-$(date +%Y%m%d-%H%M%S).log
```

Let it run to completion. Do not interrupt. Record the log path.

- [ ] **Step 2: Extract failing tests**

```bash
grep -E "^\s*(✘|FAILED|×)" /tmp/e2e-run-*.log | head -40
```

Or use Playwright's built-in:
```bash
npx playwright test --reporter=json 2>/dev/null | python3 -c "
import json,sys
data=json.load(sys.stdin)
for s in data.get('suites',[]):
  for t in s.get('tests',[]):
    for r in t.get('results',[]):
      if r.get('status')=='failed':
        print(t.get('title'), '|', r.get('error',{}).get('message','')[:80])
" 2>/dev/null | head -40
```

- [ ] **Step 3: Categorize failures**

For each failure, classify:

| Category | Signals |
|----------|---------|
| **环境类** | `ECONNREFUSED`, `net::ERR_CONNECTION_REFUSED`, timeout >30s, 5xx |
| **认证类** | 401, 403, redirect to `/login`, `Unauthorized` |
| **数据类** | 404 on data that should exist, `expect(text).toContain` fails on empty content |
| **代码类** | Element not found, `locator.click` on wrong selector, API contract mismatch |

Write a summary:
```
环境类: N
认证类: N
数据类: N
代码类: N
```

- [ ] **Step 4: Apply abort rule**

If (环境类 + 认证类 + 数据类) > 30% of total tests **and** code-class < 30%:
- Stop. Fix environment/auth/data issues first.
- Output the categorization report.
- Do not proceed to Task 3.

Otherwise: proceed.

---

## Task 3: Fix code-class failures

For each code-class failure, apply the appropriate fix. Common patterns:

- [ ] **Step 1: Fix selector mismatches**

If a test fails with `locator.click: element not found` or similar:
```bash
npx playwright test <spec-file> --reporter=list --headed 2>&1 | tail -20
```

Read the failing spec file to understand what selector it expects. Compare with actual rendered HTML by checking the component. Update selector if component changed (prefer `data-testid` attributes; if not present, use text-based selectors).

- [ ] **Step 2: Fix API contract mismatches**

If a test expects a field that no longer exists or has been renamed:
1. Read the failing test assertion
2. Check the current backend API response format
3. Update the test to match actual API (do not change API to match test — test must reflect truth)

- [ ] **Step 3: Fix missing `data-testid` attributes**

If tests reference `data-testid` that doesn't exist in the component, add them:
```vue
<el-button data-testid="submit-btn" @click="handleSubmit">提交</el-button>
```

- [ ] **Step 4: Fix training todo-integration test** (known failure)

The file `client/e2e/training-todo-integration.spec.ts` tests the `/api/v1/todos` endpoint. This endpoint is new (implemented in Plan A). Before Plan A is deployed, this test will fail with 404.

If Plan A has been merged: verify the test passes against the new endpoint.
If Plan A has not been merged: skip this test file for now and note it in the report:
```bash
npx playwright test --ignore-glob "**/training-todo-integration.spec.ts" 2>&1 | tail -10
```

- [ ] **Step 5: Re-run failing specs individually after each fix**

```bash
npx playwright test e2e/<fixed-file>.spec.ts --reporter=list
```

Expected: PASS for the fixed file.

---

## Task 4: Full re-run and report update

- [ ] **Step 1: Full suite re-run**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client
npx playwright test --reporter=list 2>&1 | tee /tmp/e2e-final-$(date +%Y%m%d-%H%M%S).log
```

- [ ] **Step 2: Collect pass/fail per spec**

```bash
grep -E "(PASSED|FAILED|passed|failed)" /tmp/e2e-final-*.log | tail -5
```

Note total passed / total failed.

- [ ] **Step 3: Update E2E matrix report**

Read `docs/superpowers/reports/2026-04-25-full-business-e2e-matrix.md`.

For each spec file that was `NOT_RUN`, update to `PASS` or `FAIL` based on results.

Format:
```markdown
| training-todo-integration | training/todo | `PASS` | 2026-04-25 |
```

- [ ] **Step 4: Update go-live readiness report**

Read `docs/superpowers/reports/2026-04-25-internal-go-live-readiness-report.md`.

Find the E2E gate entry and update:
```markdown
| E2E 全量运行 | ✅ PASS | N passed / M total, 2026-04-25 |
```

If any tests failed, note them:
```markdown
| E2E 全量运行 | ⚠️ PARTIAL | N passed / M total; M-N failures: [list] |
```

- [ ] **Step 5: Commit all fixes and report updates**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git add client/e2e/ client/src/ \
  docs/superpowers/reports/2026-04-25-full-business-e2e-matrix.md \
  docs/superpowers/reports/2026-04-25-internal-go-live-readiness-report.md
git commit -m "fix: 修复E2E代码类失败，全量补跑并更新测试矩阵"
```

