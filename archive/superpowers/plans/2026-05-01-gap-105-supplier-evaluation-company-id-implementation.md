# GAP-105 SupplierEvaluation Company ID Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to execute this plan task-by-task. Do not redesign supplier evaluation or supplier status logic. If current code disagrees with this plan, stop and report the mismatch to the main agent.

**Goal:** Remove the hardcoded `company_id: '1'` from supplier evaluations and make supplier evaluation create/list/read operations use the authenticated user's `companyId`.

**GAP:** `GAP-105`

**Spec:** Not required. This is a small tenant-isolation fix with no schema or historical-data migration.

**Business boundary:** `SupplierEvaluation` is a tenant-owned supplier governance record. It must not create or list records across companies. Supplier status updates must only update suppliers owned by the same company when the supplier model supports `company_id`.

**Non-goals:**

- Do not redesign supplier qualification, supplier documents, incoming inspection, or supplier status workflow.
- Do not add schema fields.
- Do not alter existing evaluation score formulas except as needed to preserve current behavior.
- Do not migrate existing historical rows.

---

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** 主 agent 已按项目文档和 superpowers 写计划要求完成上下文核对、范围收敛和 implementation plan 编写。
- **grill-me 校准结论：** 主 agent 已按 grill-me 方式质询本计划的必要性、事实源边界、schema/历史数据影响、可并行性和验收方式；能通过代码和文档确认的问题已直接核对，未发现需要用户额外确认的阻塞问题。
- **执行限制：** Multica 执行 agent 只能使用 `superpowers:executing-plans` 执行本计划；不得自行扩展范围、补写新 spec、重排 GAP 或改动未列入文件。
- **执行隔离：** 执行本计划前必须从最新 `origin/master` 创建独立 worktree，或使用 Multica 隔离工作目录；不得在主 checkout `/Users/jiashenglin/Desktop/好玩的项目/noidear` 直接修改、提交或 push。如发现当前目录是主 checkout，必须停止并回报主 agent。
- **停止条件：** 如果执行 agent 发现本计划与当前代码、AGENTS.md、docs/AGENT_GUIDE.md 或 docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md 冲突，必须停止并回报主 agent，不得猜测实现。

## File Map

- Modify: `server/src/modules/supplier-evaluation/supplier-evaluation.controller.ts`
- Modify: `server/src/modules/supplier-evaluation/supplier-evaluation.service.ts`
- Modify or add focused tests near `server/src/modules/supplier-evaluation/` if existing test patterns exist.

---

## Task 1: Pass Company ID From Controller

**Files:**

- `server/src/modules/supplier-evaluation/supplier-evaluation.controller.ts`

- [ ] Import `Request` from `@nestjs/common` if not already present.
- [ ] In `create`, accept `@Request() req` and pass `req.user.companyId` into the service.
- [ ] In `findAll`, accept `@Request() req` and pass `req.user.companyId` into the service.
- [ ] In `findBySupplier`, accept `@Request() req` and pass `req.user.companyId` into the service.
- [ ] Preserve the existing `@UseGuards(JwtAuthGuard)` controller-level guard.
- [ ] Do not change public route paths.

**Acceptance:**

- Controller no longer calls service methods without tenant context.

---

## Task 2: Scope SupplierEvaluation Service

**Files:**

- `server/src/modules/supplier-evaluation/supplier-evaluation.service.ts`

- [ ] Change `create(dto)` to `create(dto, companyId)`.
- [ ] Replace `company_id: '1'` with `company_id: companyId`.
- [ ] Before updating the supplier status, verify the supplier belongs to `companyId` if the `Supplier` model has `company_id`.
- [ ] Ensure `findAll(companyId)` filters `supplierEvaluation.findMany` by `company_id: companyId`.
- [ ] Ensure `findBySupplier(supplierId, companyId)` filters by both `supplier_id` and `company_id`.
- [ ] Keep existing ordering and included supplier fields.

**Acceptance:**

- Static search in `server/src/modules/supplier-evaluation` no longer finds `company_id: '1'`.
- Company A cannot list or create evaluation records under Company B.

---

## Task 3: Tests And Verification

- [ ] Run focused tests if supplier evaluation specs exist.
- [ ] If no focused specs exist, add a small unit test for service create/findAll/findBySupplier company scoping.
- [ ] Run:

```bash
npm run build:server
# 历史 Multica GAP 校验脚本已退役；当前不再运行此校验
git diff --check
```

**Final report must include:**

- executing-plans skill confirmation.
- Exact files modified.
- Test commands and results.
- Whether supplier ownership check was implemented or skipped because the model lacks `company_id`.
