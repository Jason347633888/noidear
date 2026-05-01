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

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** 主 agent 已按项目文档和 superpowers 写计划要求完成上下文核对、范围收敛和 implementation plan 编写。
- **grill-me 校准结论：** 主 agent 已按 grill-me 方式质询本计划的必要性、事实源边界、schema/历史数据影响、可并行性和验收方式；能通过代码和文档确认的问题已直接核对，未发现需要用户额外确认的阻塞问题。
- **执行限制：** Multica 执行 agent 只能使用 `superpowers:executing-plans` 执行本计划；不得自行扩展范围、补写新 spec、重排 GAP 或改动未列入文件。
- **执行隔离：** 执行本计划前必须从最新 `origin/master` 创建独立 worktree，或使用 Multica 隔离工作目录；不得在主 checkout `/Users/jiashenglin/Desktop/好玩的项目/noidear` 直接修改、提交或 push。如发现当前目录是主 checkout，必须停止并回报主 agent。
- **停止条件：** 如果执行 agent 发现本计划与当前代码、AGENTS.md、docs/AGENT_GUIDE.md 或 docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md 冲突，必须停止并回报主 agent，不得猜测实现。

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
