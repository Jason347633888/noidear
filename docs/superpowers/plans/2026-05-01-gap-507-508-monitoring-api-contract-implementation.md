# GAP-507/508 Monitoring API Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to execute this plan task-by-task. Do not redesign monitoring, alert routing, or alert deduplication. If current code disagrees with this plan, stop and report the mismatch to the main agent.

**Goal:** Align the frontend monitoring API adapter with the existing backend monitoring controller contract so metrics query and alert history pages can load data.

**GAPs:** `GAP-507`, `GAP-508`

**Spec:** Not required. This is a small frontend API adapter fix with no schema or historical-data migration.

**Business boundary:** Monitoring data and alert history are operational support data. The backend `MonitoringController` is the current contract owner for `/monitoring/metrics/query` and `/monitoring/alerts/history/query`; this plan only fixes the frontend adapter to call those contracts correctly.

**Non-goals:**

- Do not change backend monitoring routes.
- Do not remove the standalone `/alerts/*` controller.
- Do not resolve `GAP-511` alert-route deduplication.
- Do not redesign `AlertService`, alert status semantics, or monitoring chart UI.
- Do not add schema fields or migrations.

---

## File Map

- Modify: `client/src/api/monitoring.ts`
- Search-only unless needed: frontend monitoring pages that consume `queryMetrics` or `queryAlertHistory`
- Add/update focused frontend tests only if an existing monitoring API test pattern exists.

---

## Task 1: Fix Metrics Query Method

**Files:**

- `client/src/api/monitoring.ts`

- [ ] Change `queryMetrics(params)` from `request.get('/monitoring/metrics/query', { params })` to `request.post('/monitoring/metrics/query', params)`.
- [ ] Preserve the `QueryMetricsParams` type.
- [ ] Preserve the response type `SystemMetric[]`.
- [ ] Do not change `getAvailableMetrics`, `recordMetric`, or other metric endpoints.

**Acceptance:**

- Frontend `queryMetrics` matches backend `@Post('metrics/query')`.
- Static search no longer finds `request.get<SystemMetric[]>('/monitoring/metrics/query'`.

---

## Task 2: Fix Alert History Query Path And Method

**Files:**

- `client/src/api/monitoring.ts`

- [ ] Change `queryAlertHistory(params)` from `GET /monitoring/alerts/history` with query params to `POST /monitoring/alerts/history/query` with request body.
- [ ] Preserve the `QueryAlertHistoryParams` type.
- [ ] Preserve the response type `{ items: AlertHistory[]; total: number }` unless TypeScript shows the backend actually returns a different documented shape.
- [ ] Do not change `acknowledgeAlert`, `resolveAlert`, alert rule CRUD, or standalone alert routes.

**Acceptance:**

- Frontend `queryAlertHistory` matches backend `@Post('alerts/history/query')`.
- Static search no longer finds `request.get<{ items: AlertHistory[]; total: number }>('/monitoring/alerts/history'`.

---

## Task 3: Verify Call Sites

**Files:**

- Any frontend file importing `queryMetrics` or `queryAlertHistory`.

- [ ] Search all client call sites for `queryMetrics(`.
- [ ] Search all client call sites for `queryAlertHistory(`.
- [ ] Confirm callers pass a plain params object compatible with POST body.
- [ ] If callers depend on GET query-string semantics, stop and report to the main agent instead of redesigning UI state.

**Acceptance:**

- Existing call sites continue to compile without changing route strings outside `client/src/api/monitoring.ts`.

---

## Task 4: Verification

- [ ] Run:

```bash
rg -n "monitoring/metrics/query|monitoring/alerts/history" client/src/api/monitoring.ts
npm run build:client
node tools/check-module-usage-docs.mjs
git diff --check
```

**Final report must include:**

- executing-plans skill confirmation.
- Exact files modified.
- Whether any monitoring page call sites required changes.
- Test/build command results.
- Confirmation that `GAP-511` alert-route deduplication was not changed.
