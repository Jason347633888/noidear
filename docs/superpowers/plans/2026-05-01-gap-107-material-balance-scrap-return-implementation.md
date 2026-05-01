# GAP-107 Material Balance Scrap Return Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Execution must happen in an 独立 worktree or Multica 隔离工作目录, never in the main checkout.

**Goal:** Make material balance calculations include warehouse returns and scraps.

**Architecture:** Keep `StockRecord` as the current compatibility read source. Extend `MaterialBalanceService.checkBalance()` to classify `return` as inbound and `scrap` as outbound, while preserving existing response fields.

**Tech Stack:** NestJS, Prisma, Jest.

---

## Superpower 与 grill-me 校准记录

- 已按 `brainstorming` 形成 spec：`docs/superpowers/specs/2026-05-01-gap-107-material-balance-scrap-return-design.md`。
- 已按 `grill-with-docs` 对齐主数据文档：长期库存流水事实源是 `InventoryMovement`，但当前 GAP 只修兼容读取公式。
- 已按 `grill-me` 通过代码核对：退料服务写 `recordType: 'return'`，报废服务写 `recordType: 'scrap'`，物料平衡未读取这两类。
- 执行 agent 只允许使用 `superpowers:executing-plans`，不得把读取口径整体迁移到 `InventoryMovement`。
- 执行前必须确认 `pwd` 不是 `/Users/jiashenglin/Desktop/好玩的项目/noidear`，必须在独立 worktree 或 Multica 隔离工作目录。

## Files

- Create: `server/src/modules/warehouse/material-balance.service.spec.ts`
- Modify: `server/src/modules/warehouse/material-balance.service.ts`

## Task 1: Add material balance test

- [ ] **Step 1: Create service spec**

Create `server/src/modules/warehouse/material-balance.service.spec.ts`:

```ts
import { MaterialBalanceService } from './material-balance.service';

describe('MaterialBalanceService', () => {
  const prisma = {
    stockRecord: { findMany: jest.fn() },
    batchMaterialUsage: { findMany: jest.fn() },
    materialBatch: { findMany: jest.fn() },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('includes return as inbound and scrap as outbound in balance calculation', async () => {
    const service = new MaterialBalanceService(prisma as any);
    prisma.stockRecord.findMany.mockResolvedValue([
      { recordType: 'in', quantity: 100 },
      { recordType: 'return', quantity: 10 },
      { recordType: 'out', quantity: 20 },
      { recordType: 'scrap', quantity: 5 },
    ]);
    prisma.batchMaterialUsage.findMany.mockResolvedValue([
      { quantity: 30 },
    ]);
    prisma.materialBatch.findMany.mockResolvedValue([
      { id: 'batch-1', quantity: 55 },
    ]);

    const result = await service.checkBalance('batch-1');

    expect(result.totalIn).toBe(110);
    expect(result.totalOut).toBe(25);
    expect(result.returnedToWarehouse).toBe(10);
    expect(result.scrapped).toBe(5);
    expect(result.usedInProduction).toBe(30);
    expect(result.calculated).toBe(55);
    expect(result.currentStock).toBe(55);
    expect(result.isBalanced).toBe(true);
  });
});
```

- [ ] **Step 2: Run test and confirm failure**

```bash
npm run test --workspace server -- material-balance.service --runInBand
```

Expected: FAIL because `returnedToWarehouse` and `scrapped` do not exist and totals ignore return/scrap.

## Task 2: Update formula

- [ ] **Step 1: Add numeric helper**

In `server/src/modules/warehouse/material-balance.service.ts`, add:

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

- [ ] **Step 2: Replace total calculations**

Replace the existing `totalIn`, `totalOut`, and `usedInProduction` calculations with:

```ts
    const received = stockRecords
      .filter((r) => r.recordType === 'in')
      .reduce((sum, r) => sum + this.toNumber(r.quantity), 0);

    const returnedToWarehouse = stockRecords
      .filter((r) => r.recordType === 'return')
      .reduce((sum, r) => sum + this.toNumber(r.quantity), 0);

    const issuedToProduction = stockRecords
      .filter((r) => r.recordType === 'out')
      .reduce((sum, r) => sum + this.toNumber(r.quantity), 0);

    const scrapped = stockRecords
      .filter((r) => r.recordType === 'scrap')
      .reduce((sum, r) => sum + this.toNumber(r.quantity), 0);

    const totalIn = received + returnedToWarehouse;
    const totalOut = issuedToProduction + scrapped;
    const usedInProduction = usages.reduce((sum, u) => sum + this.toNumber(u.quantity), 0);
```

- [ ] **Step 3: Preserve and extend response**

Update current stock conversion:

```ts
const currentStock = this.toNumber(batches[0]?.quantity ?? 0);
```

In the returned object, include the split fields:

```ts
      received,
      returnedToWarehouse,
      issuedToProduction,
      scrapped,
```

Do not remove existing fields.

- [ ] **Step 4: Run targeted test**

```bash
npm run test --workspace server -- material-balance.service --runInBand
```

Expected: PASS.

- [ ] **Step 5: Run warehouse related tests**

```bash
npm run test --workspace server -- material-balance.service requisition.service return.service scrap.service --runInBand
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/modules/warehouse/material-balance.service.ts server/src/modules/warehouse/material-balance.service.spec.ts
git commit -m "fix: include returns and scraps in material balance"
```
