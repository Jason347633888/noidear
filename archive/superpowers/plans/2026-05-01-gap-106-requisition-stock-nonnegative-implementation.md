# GAP-106 Requisition Stock Nonnegative Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Execution must happen in an 独立 worktree or Multica 隔离工作目录, never in the main checkout.

**Goal:** Prevent material requisition completion from driving `MaterialBatch.quantity` below zero.

**Architecture:** Add a transaction-local stock check in `RequisitionService.complete()` immediately before the existing decrement. Keep the existing warehouse writes and GAP-102 `InventoryMovement` dual-write unchanged.

**Tech Stack:** NestJS, Prisma, Jest.

---

## Superpower 与 grill-me 校准记录

- 已按 `brainstorming` 形成 spec：`docs/superpowers/specs/2026-05-01-gap-106-requisition-stock-nonnegative-design.md`。
- 已按 `grill-with-docs` 对齐主数据文档：库存扣减必须回到 `MaterialLot(MaterialBatch)`，不新增平行库存事实源。
- 已按 `grill-me` 通过代码核对：`RequisitionService.complete()` 当前在事务内先 decrement，未校验负库存。
- 执行 agent 只允许使用 `superpowers:executing-plans`，不得重新设计库存事实源。
- 执行前必须确认 `pwd` 不是 `/Users/jiashenglin/Desktop/好玩的项目/noidear`，必须在独立 worktree 或 Multica 隔离工作目录。

## Files

- Modify: `server/src/modules/warehouse/requisition.service.ts`
- Modify: `server/src/modules/warehouse/requisition.service.spec.ts`

## Task 1: Add failing tests for insufficient stock

- [ ] **Step 1: Update Prisma mock**

In `server/src/modules/warehouse/requisition.service.spec.ts`, add `findUnique` to the mocked `materialBatch` object:

```ts
materialBatch: {
  findUnique: jest.fn(),
  update: jest.fn(),
},
```

- [ ] **Step 2: Add insufficient-stock test**

Inside `describe('complete', ...)`, add this test before the successful completion test:

```ts
it('should reject completion when requested quantity exceeds batch stock', async () => {
  const mockRequisition = {
    id: 'req-001',
    status: 'approved',
    items: [
      {
        batchId: 'batch-001',
        quantity: 50,
      },
    ],
  };

  jest.spyOn(prisma.materialRequisition, 'findUnique').mockResolvedValue(mockRequisition as any);

  const txClient = {
    materialBatch: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'batch-001',
        batchNumber: 'MB-001',
        quantity: 10,
      }),
      update: jest.fn(),
    },
    stagingAreaStock: { upsert: jest.fn(), findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
    stockRecord: { create: jest.fn() },
    materialRequisition: { update: jest.fn() },
    materialRequisitionItem: { findMany: jest.fn().mockResolvedValue(mockRequisition.items) },
  };

  jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => callback(txClient));

  await expect(service.complete('req-001', 'user-001')).rejects.toThrow(BadRequestException);
  expect(txClient.materialBatch.update).not.toHaveBeenCalled();
  expect(txClient.stockRecord.create).not.toHaveBeenCalled();
  expect(inventoryMovementLedger.recordMaterialBatchMovement).not.toHaveBeenCalled();
});
```

- [ ] **Step 3: Update existing success test tx mock**

In the existing `should complete requisition and update inventory` test, update `txClient.materialBatch` from:

```ts
materialBatch: { update: jest.fn() },
```

to:

```ts
materialBatch: {
  findUnique: jest.fn().mockResolvedValue({
    id: 'batch-001',
    batchNumber: 'MB-001',
    quantity: 100,
  }),
  update: jest.fn(),
},
```

- [ ] **Step 4: Run test and confirm failure**

```bash
npm run test --workspace server -- requisition.service --runInBand
```

Expected: FAIL because `complete()` does not check available stock yet.

## Task 2: Implement stock guard

- [ ] **Step 1: Add helper in `RequisitionService`**

Add this private method near `generateRequisitionNo()`:

```ts
private toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  if (value && typeof (value as { toNumber?: () => number }).toNumber === 'function') {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value);
}
```

- [ ] **Step 2: Check batch stock before decrement**

In `complete()`, before `await tx.materialBatch.update(...)`, insert:

```ts
const batch = await tx.materialBatch.findUnique({
  where: { id: item.batchId },
  select: { id: true, batchNumber: true, quantity: true },
});

if (!batch) {
  throw new BadRequestException(`物料批次不存在：${item.batchId}`);
}

const availableQty = this.toNumber(batch.quantity);
const requestedQty = this.toNumber(item.quantity);
if (availableQty < requestedQty) {
  throw new BadRequestException(`物料批次库存不足：${batch.batchNumber ?? item.batchId}`);
}
```

- [ ] **Step 3: Run targeted test**

```bash
npm run test --workspace server -- requisition.service --runInBand
```

Expected: PASS.

- [ ] **Step 4: Run whitespace check**

```bash
git diff --check
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/warehouse/requisition.service.ts server/src/modules/warehouse/requisition.service.spec.ts
git commit -m "fix: prevent negative material batch stock on requisition completion"
```
