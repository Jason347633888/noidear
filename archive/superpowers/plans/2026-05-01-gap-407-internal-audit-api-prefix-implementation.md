# GAP-407 Internal Audit API Prefix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to execute this plan task-by-task. Do not redesign internal audit modules or backend routes. If current code disagrees with this plan, stop and report the mismatch to the main agent.

**Goal:** Remove duplicate `/api/v1` prefixes from internal audit frontend API calls.

**Architecture:** Keep Axios `baseURL` as the single API prefix source. Internal audit API adapters must use `/audit/...` relative paths only.

**Tech Stack:** Vue 3, Axios request wrapper, TypeScript.

---

## Superpower 与 grill-me 校准记录

- **brainstorming：** 已核对 `client/src/api/request.ts` 有统一 `baseURL: '/api/v1'`，内审 API 文件重复写 `/api/v1/audit/...`。
- **grill-me：** 不需要业务追问；后端 controller route 已为 `audit/...`，前端 adapter 应去重。
- **writing-plans：** 本计划只改前端 API path 字符串和静态校验。
- **执行限制：** Multica 执行 agent 只能使用 `superpowers:executing-plans` 执行本计划；不得自行扩展内审功能。
- **执行隔离：** 执行本计划前必须从最新 `origin/master` 创建独立 worktree，或使用 Multica 隔离工作目录；不得在主 checkout `/Users/jiashenglin/Desktop/好玩的项目/noidear` 直接修改、提交或 push。如发现当前目录是主 checkout，必须停止并回报主 agent。

## Files

- Modify: `client/src/api/internal-audit/plan.ts`
- Modify: `client/src/api/internal-audit/finding.ts`
- Modify: `client/src/api/internal-audit/report.ts`

## Task 1: Remove Duplicate Prefix

- [ ] **Step 1: Confirm duplicated paths**

Run:

```bash
rg -n "/api/v1/audit" client/src/api/internal-audit
```

Expected: matches in `plan.ts`, `finding.ts`, and `report.ts`.

- [ ] **Step 2: Update `plan.ts` paths**

Replace every `/api/v1/audit` prefix in `client/src/api/internal-audit/plan.ts` with `/audit`.

Examples:

```ts
return request.post<AuditPlan>('/audit/plans', data);
return request.get<AuditPlan>(`/audit/plans/${id}`);
return request.post<AuditPlan>(`/audit/plans/${id}/start`);
return request.get('/audit/plans/statistics');
```

- [ ] **Step 3: Update `finding.ts` paths**

Replace every `/api/v1/audit` prefix in `client/src/api/internal-audit/finding.ts` with `/audit`.

Examples:

```ts
return request.post<AuditFinding>('/audit/findings', data);
return request.post(`/audit/plans/${planId}/submit`);
return request.get<{ items: AuditFinding[]; total: number }>('/audit/findings/my-rectifications', { params });
return request.post<AuditFinding>(`/audit/findings/${id}/verify`, data);
```

- [ ] **Step 4: Update `report.ts` paths**

Replace every `/api/v1/audit` prefix in `client/src/api/internal-audit/report.ts` with `/audit`.

Examples:

```ts
return request.post<AuditReport>(`/audit/plans/${planId}/complete`);
return request.get<{ items: AuditReport[]; total: number }>('/audit/reports', { params });
return request.get<AuditReport>(`/audit/reports/${id}`);
```

- [ ] **Step 5: Verify no duplicate prefix remains**

Run:

```bash
rg -n "/api/v1/audit" client/src/api/internal-audit
```

Expected: no output.

- [ ] **Step 6: Type-check client**

Run:

```bash
npm --prefix client run type-check
```

Expected: PASS. If the project does not define `type-check`, run `npm --prefix client run build` and report the command used.

- [ ] **Step 7: Commit**

```bash
git add client/src/api/internal-audit/plan.ts client/src/api/internal-audit/finding.ts client/src/api/internal-audit/report.ts
git commit -m "fix: remove duplicate internal audit api prefix"
```

## Completion

- Push branch.
- Open PR.
- Include `rg` and client verification output in PR description.
