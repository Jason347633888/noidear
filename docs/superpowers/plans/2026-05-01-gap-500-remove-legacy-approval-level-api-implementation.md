# GAP-500 Remove Legacy Approval Level API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to execute this plan task-by-task. Do not redesign unified approval. If current code disagrees with this plan, stop and report the mismatch to the main agent.

**Goal:** Remove the dead frontend calls to legacy level approval endpoints (`/approvals/level1/...` and `/approvals/level2/...`) and route callers through the existing unified approval API.

**GAP:** `GAP-500`

**Spec:** Not required. This is a small API cleanup with no schema or historical-data migration.

**Business boundary:** The project has moved to unified approval. Legacy "level1/level2 approval" frontend helpers point to routes that do not exist on the backend and must not remain as callable API surface.

**Non-goals:**

- Do not modify unified approval definitions.
- Do not change backend approval routes.
- Do not rewrite approval task UI.
- Do not remove backend approval models or migrations.

---

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** 主 agent 已按项目文档和 superpowers 写计划要求完成上下文核对、范围收敛和 implementation plan 编写。
- **grill-me 校准结论：** 主 agent 已按 grill-me 方式质询本计划的必要性、事实源边界、schema/历史数据影响、可并行性和验收方式；能通过代码和文档确认的问题已直接核对，未发现需要用户额外确认的阻塞问题。
- **执行限制：** Multica 执行 agent 只能使用 `superpowers:executing-plans` 执行本计划；不得自行扩展范围、补写新 spec、重排 GAP 或改动未列入文件。
- **停止条件：** 如果执行 agent 发现本计划与当前代码、AGENTS.md、docs/AGENT_GUIDE.md 或 docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md 冲突，必须停止并回报主 agent，不得猜测实现。

## File Map

- Modify: `client/src/api/approval.ts`
- Search-only unless necessary: frontend call sites that import `approveLevel1` or `approveLevel2`
- Modify tests only if existing approval API tests cover this file.

---

## Task 1: Remove Dead Legacy Helpers

**Files:**

- `client/src/api/approval.ts`

- [ ] Remove `approveLevel1`.
- [ ] Remove `approveLevel2`.
- [ ] Keep `approveUnified` and `rejectUnified`.
- [ ] Keep `CreateApprovalChainDto`, `ApproveDto`, and approval response types unless TypeScript shows they are unused and local style removes unused exports.
- [ ] Do not alter request paths for valid unified approval endpoints.

**Acceptance:**

- `client/src/api/approval.ts` contains no `/approvals/level1` or `/approvals/level2`.

---

## Task 2: Update Call Sites

**Files:**

- Any frontend file importing or calling `approveLevel1` / `approveLevel2`.

- [ ] Search the client for `approveLevel1`.
- [ ] Search the client for `approveLevel2`.
- [ ] If call sites exist, replace with `approveUnified(id, action, commentOrReason)`.
- [ ] If a call site depends on level-specific behavior, stop and report to main agent instead of inventing new behavior.
- [ ] Do not change unrelated approval UI state management.

**Acceptance:**

- Repository search returns no `approveLevel1`, no `approveLevel2`, no `/approvals/level1`, and no `/approvals/level2`.

---

## Task 3: Verification

- [ ] Run:

```bash
rg -n "approveLevel1|approveLevel2|/approvals/level1|/approvals/level2" client/src || true
npm run build:client
node tools/check-module-usage-docs.mjs
git diff --check
```

**Final report must include:**

- executing-plans skill confirmation.
- Exact files modified.
- Whether any call sites existed.
- Test/build command results.
