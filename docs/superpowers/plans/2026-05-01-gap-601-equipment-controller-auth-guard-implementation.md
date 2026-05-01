# GAP-601 Equipment Controller Auth Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to execute this plan task-by-task. Do not redesign equipment maintenance. If current code disagrees with this plan, stop and report the mismatch to the main agent.

**Goal:** Add `JwtAuthGuard` to the equipment-management controllers that currently expose equipment, maintenance plan, maintenance record, fault, stats, and upload endpoints without authentication.

**GAP:** `GAP-601`

**Spec:** Not required. This is a small endpoint-protection fix with no schema or historical-data migration.

**Business boundary:** Equipment ledger, maintenance plans, maintenance records, fault records, and equipment upload endpoints are internal operational data. Anonymous access must be rejected consistently, matching the already protected measuring-equipment module.

**Non-goals:**

- Do not add role/permission-level authorization in this PR.
- Do not change endpoint paths or response DTOs.
- Do not redesign equipment ownership or tenant filtering.
- Do not touch measuring-equipment controllers except as a style reference.

---

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** 主 agent 已按项目文档和 superpowers 写计划要求完成上下文核对、范围收敛和 implementation plan 编写。
- **grill-me 校准结论：** 主 agent 已按 grill-me 方式质询本计划的必要性、事实源边界、schema/历史数据影响、可并行性和验收方式；能通过代码和文档确认的问题已直接核对，未发现需要用户额外确认的阻塞问题。
- **执行限制：** Multica 执行 agent 只能使用 `superpowers:executing-plans` 执行本计划；不得自行扩展范围、补写新 spec、重排 GAP 或改动未列入文件。
- **执行隔离：** 执行本计划前必须从最新 `origin/master` 创建独立 worktree，或使用 Multica 隔离工作目录；不得在主 checkout `/Users/jiashenglin/Desktop/好玩的项目/noidear` 直接修改、提交或 push。如发现当前目录是主 checkout，必须停止并回报主 agent。
- **停止条件：** 如果执行 agent 发现本计划与当前代码、AGENTS.md、docs/AGENT_GUIDE.md 或 docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md 冲突，必须停止并回报主 agent，不得猜测实现。

## File Map

- Modify: `server/src/modules/equipment/equipment.controller.ts`
- Modify: `server/src/modules/equipment/plan.controller.ts`
- Modify: `server/src/modules/equipment/record.controller.ts`
- Modify: `server/src/modules/equipment/fault.controller.ts`
- Modify: `server/src/modules/equipment/stats.controller.ts`
- Modify: `server/src/modules/equipment/upload.controller.ts`
- Modify or add focused controller tests if existing equipment tests cover auth guards.

---

## Task 1: Add JwtAuthGuard Imports And Decorators

**Files:**

- `server/src/modules/equipment/equipment.controller.ts`
- `server/src/modules/equipment/plan.controller.ts`
- `server/src/modules/equipment/record.controller.ts`
- `server/src/modules/equipment/fault.controller.ts`
- `server/src/modules/equipment/stats.controller.ts`
- `server/src/modules/equipment/upload.controller.ts`

- [ ] Import `UseGuards` from `@nestjs/common` in each controller that does not already import it.
- [ ] Import `JwtAuthGuard` from `../auth/jwt-auth.guard` or the correct relative path for each controller.
- [ ] Add `@UseGuards(JwtAuthGuard)` at the controller class level, directly above `export class ...`.
- [ ] Preserve all existing route decorators and method signatures.
- [ ] Do not add permissions or admin-only checks.

**Acceptance:**

- Every listed controller has class-level `@UseGuards(JwtAuthGuard)`.
- No endpoint path changes.

---

## Task 2: Tests And Verification

- [ ] If controller specs exist, add or update tests to assert `JwtAuthGuard` metadata on at least one representative controller.
- [ ] Run:

```bash
npm run build:server
node tools/check-module-usage-docs.mjs
git diff --check
```

- [ ] If local server is running and a tokenless curl check is cheap, verify:

```bash
curl -i http://localhost:3000/api/v1/equipment
```

Expected result without Authorization header: `401`.

**Final report must include:**

- executing-plans skill confirmation.
- Exact files modified.
- Test/build command results.
- Whether runtime curl verification was run or skipped.
