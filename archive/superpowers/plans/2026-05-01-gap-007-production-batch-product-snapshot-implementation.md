# GAP-007 ProductionBatch 产品快照一致性 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Execution must happen in an 独立 worktree or Multica 隔离工作目录, never in the main checkout.

**Goal:** 锁定 `ProductionBatch.productName` 只能由系统从 `Product.name` 写入，防止手填产品名污染追溯快照。

**Architecture:** 不改 schema，不改接口字段；在 `ProductionBatchService` 单元测试中增加回归断言，并给 service 快照写入点加短注释。全局 ValidationPipe 已拒绝 DTO 外字段，因此本计划不新增运行时代码分支。

**Tech Stack:** NestJS, Prisma, Jest, class-validator。

---

## Superpower 与 grill-me 校准记录

- 已按 `brainstorming` 工作流形成 spec：`docs/superpowers/specs/2026-05-01-gap-007-production-batch-product-snapshot-design.md`。
- 已按 `grill-me` 要求核对代码事实：DTO 不包含 `productName`，service 已从 `Product.name` 写入快照。
- 本 plan 只允许执行 agent 使用 `superpowers:executing-plans`；不得重新 brainstorming、不得改 roadmap、不得改 manifest。
- 执行前必须确认 `pwd` 不是 `/Users/jiashenglin/Desktop/好玩的项目/noidear`，必须在独立 worktree 或 Multica 隔离工作目录。

## Files

- Modify: `server/src/modules/batch-trace/services/production-batch.service.ts`
- Modify: `server/src/modules/batch-trace/services/production-batch.service.spec.ts`

## Task 1: Add regression coverage for create snapshot source

- [ ] **Step 1: Add a hostile external productName to the create test input**

In `server/src/modules/batch-trace/services/production-batch.service.spec.ts`, update the existing `创建生产批次时根据产品和配方写入快照` test so the service is called through an `as any` object that tries to pass `productName`.

```ts
await service.create({
  productId: 'p1',
  recipeId: 'r1',
  plannedQuantity: 100,
  productionDate: new Date('2026-04-29T00:00:00.000Z'),
  productName: '前端伪造产品名',
} as any);
```

- [ ] **Step 2: Assert Prisma still receives Product.name**

In the same test, keep the existing assertion and ensure it expects:

```ts
productName: '老产品A',
```

Expected behavior: even if a caller passes an extra property at runtime, service output still uses `product.name`.

- [ ] **Step 3: Run the focused test**

Run:

```bash
npm --prefix server test -- production-batch.service --runInBand
```

Expected: PASS.

## Task 2: Add regression coverage for confirm snapshot source

- [ ] **Step 1: Add hostile productName to confirm dto**

In the `should confirm product batch successfully` test, call:

```ts
const result = await service.confirmProductBatch({
  ...validDto,
  productName: '包装端伪造产品名',
} as any);
```

- [ ] **Step 2: Assert persisted productName comes from Product.name**

Keep the `productionBatch.create` assertion and ensure it expects:

```ts
productName: '蛋糕',
```

- [ ] **Step 3: Run the focused test**

Run:

```bash
npm --prefix server test -- production-batch.service --runInBand
```

Expected: PASS.

## Task 3: Add minimal service comments

- [ ] **Step 1: Add one comment before `productName: product.name` in `create()`**

```ts
// GAP-007: productName is a historical snapshot from Product, never caller input.
productName: product.name,
```

- [ ] **Step 2: Add the same comment before `productName: product.name` in `confirmProductBatch()`**

```ts
// GAP-007: productName is a historical snapshot from Product, never caller input.
productName: product.name,
```

- [ ] **Step 3: Run formatting/check command**

Run:

```bash
git diff --check
```

Expected: no output.

## Task 4: Final verification and PR

- [ ] **Step 1: Run focused verification**

```bash
npm --prefix server test -- production-batch.service --runInBand
git diff --check
```

- [ ] **Step 2: Commit**

```bash
git add server/src/modules/batch-trace/services/production-batch.service.ts server/src/modules/batch-trace/services/production-batch.service.spec.ts
git commit -m "test: lock production batch product snapshot source"
```

- [ ] **Step 3: Push and open PR**

Use branch `codex/gap-007-production-batch-product-snapshot`. PR title must include `GAP-007`.
