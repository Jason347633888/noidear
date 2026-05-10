# GAP-102 库存流水事实源统一 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Execution must happen in an 独立 worktree or Multica 隔离工作目录, never in the main checkout.

**Goal:** 为仓储核心动作建立 `InventoryMovement` 统一库存移动写入层，同时保留现有 `StockRecord` 兼容写入。

**Architecture:** 新增一个小型 `InventoryMovementLedgerService` 负责把仓储动作转换成 `inventoryMovement.create()`。入库、领料、退料、报废服务在原有 `stockRecord.create()` 后调用该服务双写；读取口径暂不改。

**Tech Stack:** NestJS, Prisma, Jest, Decimal-compatible numeric input。

---

## Superpower 与 grill-me 校准记录

- 已按 `brainstorming` 工作流形成 spec：`docs/superpowers/specs/2026-05-01-gap-102-inventory-movement-ledger-unification-design.md`。
- 已按 `grill-with-docs` 对齐主数据文档：长期统一到 `InventoryMovement`，但本 PR 不删除 `StockRecord`。
- 已按 `grill-me` 核对现有代码：仓库服务只写 `stockRecord`，`inventoryMovement` 当前没有业务 service 调用。
- 本 plan 只允许执行 agent 使用 `superpowers:executing-plans`；不得重新设计库存事实源。
- 执行前必须确认 `pwd` 不是 `/Users/jiashenglin/Desktop/好玩的项目/noidear`，必须在独立 worktree 或 Multica 隔离工作目录。

## Files

- Create: `server/src/modules/warehouse/services/inventory-movement-ledger.service.ts`
- Create: `server/src/modules/warehouse/services/inventory-movement-ledger.service.spec.ts`
- Modify: `server/src/modules/warehouse/warehouse.module.ts`
- Modify: `server/src/modules/warehouse/inbound.service.ts`
- Modify: `server/src/modules/warehouse/requisition.service.ts`
- Modify: `server/src/modules/warehouse/services/return.service.ts`
- Modify: `server/src/modules/warehouse/services/scrap.service.ts`
- Modify tests only where needed for dependency injection mocks.

## Task 1: Add the ledger service

- [ ] **Step 1: Create failing unit tests**

Create `server/src/modules/warehouse/services/inventory-movement-ledger.service.spec.ts`:

```ts
import { InventoryMovementLedgerService } from './inventory-movement-ledger.service';

describe('InventoryMovementLedgerService', () => {
  const prisma = {
    inventoryMovement: {
      create: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('writes a material batch receive movement', async () => {
    const service = new InventoryMovementLedgerService(prisma as any);

    await service.recordMaterialBatchMovement({
      companyId: 1,
      movementType: 'receive',
      batchId: 'batch-1',
      quantity: 12.5,
      unit: 'kg',
      refType: 'inbound',
      refId: 'inbound-1',
      operatorId: 'user-1',
      movedAt: new Date('2026-05-01T08:00:00.000Z'),
      notes: '入库',
    });

    expect(prisma.inventoryMovement.create).toHaveBeenCalledWith({
      data: {
        company_id: 1,
        movement_type: 'receive',
        object_type: 'material_batch',
        object_id: 'batch-1',
        qty: 12.5,
        unit: 'kg',
        ref_type: 'inbound',
        ref_id: 'inbound-1',
        operator_id: 'user-1',
        moved_at: new Date('2026-05-01T08:00:00.000Z'),
        notes: '入库',
      },
    });
  });
});
```

- [ ] **Step 2: Run the new test and confirm failure**

```bash
npm --prefix server test -- inventory-movement-ledger.service --runInBand
```

Expected: FAIL because service file does not exist.

- [ ] **Step 3: Implement service**

Create `server/src/modules/warehouse/services/inventory-movement-ledger.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export type InventoryMovementType =
  | 'receive'
  | 'issue_to_production'
  | 'return_to_warehouse'
  | 'scrap'
  | 'transfer'
  | 'adjustment';

interface RecordMaterialBatchMovementInput {
  companyId?: number;
  movementType: InventoryMovementType;
  batchId: string;
  quantity: number;
  unit?: string;
  refType?: string;
  refId?: string;
  operatorId?: string;
  movedAt?: Date;
  fromLocation?: string;
  toLocation?: string;
  notes?: string;
}

@Injectable()
export class InventoryMovementLedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async recordMaterialBatchMovement(input: RecordMaterialBatchMovementInput) {
    return this.prisma.inventoryMovement.create({
      data: {
        company_id: input.companyId ?? 1,
        movement_type: input.movementType,
        object_type: 'material_batch',
        object_id: input.batchId,
        from_location: input.fromLocation,
        to_location: input.toLocation,
        qty: input.quantity,
        unit: input.unit ?? 'kg',
        ref_type: input.refType,
        ref_id: input.refId,
        operator_id: input.operatorId,
        moved_at: input.movedAt ?? new Date(),
        notes: input.notes,
      },
    });
  }
}
```

- [ ] **Step 4: Run service test**

```bash
npm --prefix server test -- inventory-movement-ledger.service --runInBand
```

Expected: PASS.

## Task 2: Register the service

- [ ] **Step 1: Modify `server/src/modules/warehouse/warehouse.module.ts`**

Import and add provider/export:

```ts
import { InventoryMovementLedgerService } from './services/inventory-movement-ledger.service';
```

Add to `providers` and `exports` if the module already exports warehouse services:

```ts
InventoryMovementLedgerService,
```

- [ ] **Step 2: Run a TypeScript compile check**

```bash
npm --prefix server run build
```

Expected: no DI or compile error related to `InventoryMovementLedgerService`.

## Task 3: Dual-write inbound receive movements

- [ ] **Step 1: Inject ledger service into `inbound.service.ts`**

```ts
constructor(
  private readonly prisma: PrismaService,
  private readonly batchNumberGenerator: BatchNumberGeneratorService,
  private readonly inventoryMovementLedger: InventoryMovementLedgerService,
) {}
```

Add import:

```ts
import { InventoryMovementLedgerService } from './services/inventory-movement-ledger.service';
```

Adjust constructor signature to match the file’s existing constructor order; do not remove existing dependencies.

- [ ] **Step 2: After `tx.stockRecord.create`, add inventory movement write**

```ts
await this.inventoryMovementLedger.recordMaterialBatchMovement({
  movementType: 'receive',
  batchId: batch.id,
  quantity: item.quantity,
  unit: item.unit ?? 'kg',
  refType: 'inbound',
  refId: inbound.id,
  operatorId,
  movedAt: new Date(),
  notes: '来料入库',
});
```

If `item.unit` does not exist in the actual type, use `unit: 'kg'`.

- [ ] **Step 3: Update inbound service test provider mocks**

Where `MaterialInboundService` is instantiated, add:

```ts
{
  provide: InventoryMovementLedgerService,
  useValue: { recordMaterialBatchMovement: jest.fn() },
}
```

- [ ] **Step 4: Run inbound focused test**

```bash
npm --prefix server test -- inbound.service --runInBand
```

Expected: PASS.

## Task 4: Dual-write requisition issue movements

- [ ] **Step 1: Inject ledger service into `requisition.service.ts`**

Import from:

```ts
import { InventoryMovementLedgerService } from './services/inventory-movement-ledger.service';
```

Add constructor dependency without removing existing dependencies.

- [ ] **Step 2: After `tx.stockRecord.create`, record issue movement**

```ts
await this.inventoryMovementLedger.recordMaterialBatchMovement({
  movementType: 'issue_to_production',
  batchId: item.batchId,
  quantity: item.quantity,
  unit: 'kg',
  refType: 'requisition',
  refId: requisition.id,
  operatorId,
  movedAt: new Date(),
  toLocation: requisition.targetZone ?? undefined,
  notes: '生产领料',
});
```

- [ ] **Step 3: Update requisition tests with provider mock**

Add the same provider mock used in Task 3.

- [ ] **Step 4: Run requisition focused test**

```bash
npm --prefix server test -- requisition.service --runInBand
```

Expected: PASS.

## Task 5: Dual-write return and scrap movements

- [ ] **Step 1: Inject ledger service into `services/return.service.ts`**

After each successful `stockRecord.create` for return, call:

```ts
await this.inventoryMovementLedger.recordMaterialBatchMovement({
  movementType: 'return_to_warehouse',
  batchId: item.batchId,
  quantity: item.quantity,
  unit: 'kg',
  refType: 'return',
  refId: materialReturn.id,
  operatorId,
  movedAt: new Date(),
  notes: '退料回仓',
});
```

Use actual variable names from the service if they differ.

- [ ] **Step 2: Inject ledger service into `services/scrap.service.ts`**

After each successful `stockRecord.create` for scrap, call:

```ts
await this.inventoryMovementLedger.recordMaterialBatchMovement({
  movementType: 'scrap',
  batchId: item.batchId,
  quantity: item.quantity,
  unit: 'kg',
  refType: 'scrap',
  refId: scrap.id,
  operatorId,
  movedAt: new Date(),
  notes: '物料报废',
});
```

Use actual variable names from the service if they differ.

- [ ] **Step 3: Update return/scrap tests with provider mocks**

Add:

```ts
{
  provide: InventoryMovementLedgerService,
  useValue: { recordMaterialBatchMovement: jest.fn() },
}
```

- [ ] **Step 4: Run focused tests**

```bash
npm --prefix server test -- return.service --runInBand
npm --prefix server test -- scrap.service --runInBand
```

Expected: PASS.

## Task 6: Final verification and PR

- [ ] **Step 1: Run verification**

```bash
npm --prefix server test -- inventory-movement-ledger.service --runInBand
npm --prefix server test -- inbound.service --runInBand
npm --prefix server test -- requisition.service --runInBand
npm --prefix server test -- return.service --runInBand
npm --prefix server test -- scrap.service --runInBand
rg -n "prisma\\.inventoryMovement|inventoryMovement\\.create|InventoryMovementLedgerService" server/src/modules/warehouse
git diff --check
```

- [ ] **Step 2: Commit**

```bash
git add server/src/modules/warehouse
git commit -m "feat: dual-write warehouse movements to inventory ledger"
```

- [ ] **Step 3: Push and open PR**

Use branch `codex/gap-102-inventory-movement-ledger-unification`. PR title must include `GAP-102`.
