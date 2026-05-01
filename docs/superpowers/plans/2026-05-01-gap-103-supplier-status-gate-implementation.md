# GAP-103 Supplier Status Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Do not use `brainstorming`, `writing-plans`, or subagent dispatch while executing. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent disabled or eliminated suppliers from entering new warehouse inbound, manual material-batch creation, and production requisition completion flows.

**Architecture:** Add one warehouse-local `SupplierAccessService` as the single gate for supplier usability checks. Inject it into `InboundService`, `BatchService`, and `RequisitionService`, then cover each blocked path with focused unit tests.

**Tech Stack:** NestJS, Prisma, Jest, TypeScript, npm workspaces.

---

## Superpower 与 grill-me 校准记录

- 已按 `brainstorming` 形成 spec：`docs/superpowers/specs/2026-05-01-gap-103-supplier-status-gate-design.md`。
- 已按 `grill-with-docs` 对照 `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 校准：供应商是主数据；来料、批次、领料是业务记录；门禁必须复用 `Supplier`，不能在下游复制状态字段。
- 执行 agent 只允许使用 `superpowers:executing-plans`。
- 本 plan 不要求执行 agent 重新设计业务边界；如果代码事实与本 plan 冲突，停止并回报主 agent。

## Worktree 隔离要求

执行 agent 必须在独立 worktree 或 Multica 隔离工作目录中执行，禁止直接修改主 checkout：

`/Users/jiashenglin/Desktop/好玩的项目/noidear`

开始前必须运行：

```bash
git worktree list --porcelain
pwd
git branch --show-current
git status --short --branch
```

如果 `pwd` 是主 checkout，停止并回报。推荐分支：

```bash
git fetch origin master
git worktree add /Users/jiashenglin/Desktop/好玩的项目/noidear-gap-103-supplier-status-gate -b codex/gap-103-supplier-status-gate origin/master
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-gap-103-supplier-status-gate
```

## 停止条件

- 如果发现 `Supplier.status` / `supplier_status` 已被其他 PR 重构，停止。
- 如果发现仓储模块已有等价供应商准入 helper，停止并报告复用方案，不要再造第二套。
- 如果测试需要引入 schema/migration 才能通过，停止；本 GAP 不允许 schema/migration。
- 如果实现需要改变 `suspended` 或 `pending` 的业务含义，停止；本 GAP 只阻断 `disabled` 和 `eliminated`。

## Task 1: Add SupplierAccessService tests first

**Files:**
- Create: `server/src/modules/warehouse/services/supplier-access.service.spec.ts`
- Create later in Task 2: `server/src/modules/warehouse/services/supplier-access.service.ts`

- [ ] **Step 1: Create the failing spec file**

Create `server/src/modules/warehouse/services/supplier-access.service.spec.ts` with:

```ts
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../prisma/prisma.service';
import { SupplierAccessService } from './supplier-access.service';

describe('SupplierAccessService', () => {
  let service: SupplierAccessService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupplierAccessService,
        {
          provide: PrismaService,
          useValue: {
            supplier: {
              findUnique: jest.fn(),
            },
            materialBatch: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get(SupplierAccessService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('assertSupplierUsable', () => {
    it('passes approved active suppliers', async () => {
      jest.spyOn(prisma.supplier, 'findUnique').mockResolvedValue({
        id: 'supplier-1',
        name: '合格供应商',
        status: 'active',
        supplier_status: 'approved',
        deletedAt: null,
      } as any);

      await expect(service.assertSupplierUsable('supplier-1', '创建来料单')).resolves.toBeUndefined();
    });

    it('rejects disabled suppliers', async () => {
      jest.spyOn(prisma.supplier, 'findUnique').mockResolvedValue({
        id: 'supplier-1',
        name: '停用供应商',
        status: 'disabled',
        supplier_status: 'approved',
        deletedAt: null,
      } as any);

      await expect(service.assertSupplierUsable('supplier-1', '创建来料单')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects eliminated suppliers', async () => {
      jest.spyOn(prisma.supplier, 'findUnique').mockResolvedValue({
        id: 'supplier-1',
        name: '淘汰供应商',
        status: 'active',
        supplier_status: 'eliminated',
        deletedAt: null,
      } as any);

      await expect(service.assertSupplierUsable('supplier-1', '创建来料单')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('does not reject suspended suppliers in GAP-103', async () => {
      jest.spyOn(prisma.supplier, 'findUnique').mockResolvedValue({
        id: 'supplier-1',
        name: '暂停供应商',
        status: 'active',
        supplier_status: 'suspended',
        deletedAt: null,
      } as any);

      await expect(service.assertSupplierUsable('supplier-1', '创建来料单')).resolves.toBeUndefined();
    });

    it('rejects missing suppliers', async () => {
      jest.spyOn(prisma.supplier, 'findUnique').mockResolvedValue(null);

      await expect(service.assertSupplierUsable('missing', '创建来料单')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('assertBatchSupplierUsable', () => {
    it('passes batches without supplier for legacy data', async () => {
      jest.spyOn(prisma.materialBatch, 'findUnique').mockResolvedValue({
        id: 'batch-1',
        deletedAt: null,
        supplierId: null,
        supplier: null,
      } as any);

      await expect(service.assertBatchSupplierUsable('batch-1', '完成领料')).resolves.toBeUndefined();
    });

    it('rejects batches from eliminated suppliers', async () => {
      jest.spyOn(prisma.materialBatch, 'findUnique').mockResolvedValue({
        id: 'batch-1',
        deletedAt: null,
        supplierId: 'supplier-1',
        supplier: {
          id: 'supplier-1',
          name: '淘汰供应商',
          status: 'active',
          supplier_status: 'eliminated',
          deletedAt: null,
        },
      } as any);

      await expect(service.assertBatchSupplierUsable('batch-1', '完成领料')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
```

- [ ] **Step 2: Run the focused test to confirm it fails**

Run:

```bash
npm test --workspace server -- --runTestsByPath src/modules/warehouse/services/supplier-access.service.spec.ts
```

Expected: fail because `./supplier-access.service` does not exist.

## Task 2: Implement SupplierAccessService

**Files:**
- Create: `server/src/modules/warehouse/services/supplier-access.service.ts`

- [ ] **Step 1: Create the service**

Create `server/src/modules/warehouse/services/supplier-access.service.ts`:

```ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

type SupplierLike = {
  id: string;
  name?: string | null;
  status?: string | null;
  supplier_status?: string | null;
  deletedAt?: Date | null;
};

@Injectable()
export class SupplierAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertSupplierUsable(supplierId: string, actionLabel: string): Promise<void> {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: supplierId },
      select: {
        id: true,
        name: true,
        status: true,
        supplier_status: true,
        deletedAt: true,
      },
    });

    this.assertUsableSupplier(supplier, actionLabel);
  }

  async assertBatchSupplierUsable(batchId: string, actionLabel: string): Promise<void> {
    const batch = await this.prisma.materialBatch.findUnique({
      where: { id: batchId },
      select: {
        id: true,
        deletedAt: true,
        supplierId: true,
        supplier: {
          select: {
            id: true,
            name: true,
            status: true,
            supplier_status: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!batch || batch.deletedAt) {
      throw new NotFoundException(`物料批次不存在：${batchId}`);
    }

    if (!batch.supplierId) {
      return;
    }

    this.assertUsableSupplier(batch.supplier, actionLabel);
  }

  private assertUsableSupplier(supplier: SupplierLike | null, actionLabel: string): void {
    if (!supplier || supplier.deletedAt) {
      throw new NotFoundException('供应商不存在');
    }

    const displayName = supplier.name || supplier.id;

    if (supplier.status === 'disabled') {
      throw new BadRequestException(`供应商 ${displayName} 已停用，不能${actionLabel}`);
    }

    if (supplier.supplier_status === 'eliminated') {
      throw new BadRequestException(`供应商 ${displayName} 已淘汰，不能${actionLabel}`);
    }
  }
}
```

- [ ] **Step 2: Run the focused helper test**

Run:

```bash
npm test --workspace server -- --runTestsByPath src/modules/warehouse/services/supplier-access.service.spec.ts
```

Expected: pass.

## Task 3: Register SupplierAccessService in WarehouseModule

**Files:**
- Modify: `server/src/modules/warehouse/warehouse.module.ts`

- [ ] **Step 1: Add import**

Add:

```ts
import { SupplierAccessService } from './services/supplier-access.service';
```

- [ ] **Step 2: Add provider and export**

Update the module metadata so `SupplierAccessService` is included in both `providers` and `exports`.

The resulting lists may stay one-line if that is the existing style, but they must include:

```ts
SupplierAccessService
```

- [ ] **Step 3: Run TypeScript check through the server tests used below**

No separate command yet; Task 4-6 tests will compile this module path.

## Task 4: Gate inbound creation

**Files:**
- Modify: `server/src/modules/warehouse/inbound.service.ts`
- Modify: `server/src/modules/warehouse/inbound.service.spec.ts`

- [ ] **Step 1: Inject SupplierAccessService**

In `server/src/modules/warehouse/inbound.service.ts`, add:

```ts
import { SupplierAccessService } from './services/supplier-access.service';
```

Extend the constructor:

```ts
constructor(
  private readonly prisma: PrismaService,
  private readonly batchNumberGenerator: BatchNumberGeneratorService,
  @Optional() private readonly approvalEngine: ApprovalEngineService,
  private readonly inventoryMovementLedger: InventoryMovementLedgerService,
  private readonly supplierAccess: SupplierAccessService,
) {}
```

- [ ] **Step 2: Check supplier before creating the inbound order**

At the start of `create()` after destructuring `supplierId`:

```ts
await this.supplierAccess.assertSupplierUsable(supplierId, '创建来料单');
```

- [ ] **Step 3: Update inbound service test providers**

In `server/src/modules/warehouse/inbound.service.spec.ts`, import:

```ts
import { SupplierAccessService } from './services/supplier-access.service';
```

Add a variable:

```ts
let supplierAccess: SupplierAccessService;
```

Add provider:

```ts
{
  provide: SupplierAccessService,
  useValue: {
    assertSupplierUsable: jest.fn(),
  },
}
```

After module compile:

```ts
supplierAccess = module.get<SupplierAccessService>(SupplierAccessService);
```

- [ ] **Step 4: Add blocked inbound test**

Inside `describe('create')`, add:

```ts
it('should reject inbound creation when supplier is not usable', async () => {
  const createDto = {
    supplierId: 'supplier-001',
    items: [
      {
        materialId: 'material-001',
        quantity: 100,
        supplierBatchNo: 'SUP-BATCH-001',
        productionDate: new Date('2026-01-01'),
        expiryDate: new Date('2026-07-01'),
      },
    ],
    remark: '测试入库',
  };

  jest
    .spyOn(supplierAccess, 'assertSupplierUsable')
    .mockRejectedValue(new BadRequestException('供应商已淘汰'));

  await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
  expect(prisma.$transaction).not.toHaveBeenCalled();
});
```

- [ ] **Step 5: Assert usable supplier is checked in the successful test**

In the existing successful create test, after `const result = await service.create(createDto);`, add:

```ts
expect(supplierAccess.assertSupplierUsable).toHaveBeenCalledWith('supplier-001', '创建来料单');
```

- [ ] **Step 6: Run inbound tests**

Run:

```bash
npm test --workspace server -- --runTestsByPath src/modules/warehouse/inbound.service.spec.ts
```

Expected: pass.

## Task 5: Gate manual material batch creation

**Files:**
- Modify: `server/src/modules/warehouse/batch.service.ts`
- Modify: `server/src/modules/warehouse/batch.service.spec.ts`

- [ ] **Step 1: Inject SupplierAccessService**

In `server/src/modules/warehouse/batch.service.ts`, add:

```ts
import { SupplierAccessService } from './services/supplier-access.service';
```

Change constructor:

```ts
constructor(
  private readonly prisma: PrismaService,
  private readonly supplierAccess: SupplierAccessService,
) {}
```

- [ ] **Step 2: Check supplierId when present**

At the start of `create()`:

```ts
if (createBatchDto.supplierId) {
  await this.supplierAccess.assertSupplierUsable(createBatchDto.supplierId, '创建物料批次');
}
```

- [ ] **Step 3: Update batch service test providers**

In `server/src/modules/warehouse/batch.service.spec.ts`, import:

```ts
import { SupplierAccessService } from './services/supplier-access.service';
```

Add:

```ts
let supplierAccess: SupplierAccessService;
```

Add provider:

```ts
{
  provide: SupplierAccessService,
  useValue: {
    assertSupplierUsable: jest.fn(),
  },
}
```

After module compile:

```ts
supplierAccess = module.get<SupplierAccessService>(SupplierAccessService);
```

- [ ] **Step 4: Add blocked batch creation test**

Inside `describe('create')`, add:

```ts
it('should reject batch creation when supplier is not usable', async () => {
  const createDto = {
    batchNumber: 'BATCH-20260215-001',
    materialId: 'material-001',
    productionDate: new Date('2026-01-01'),
    expiryDate: new Date('2026-07-01'),
    quantity: 100,
    supplierId: 'supplier-001',
    supplierBatchNo: 'SUP-001',
  };

  jest
    .spyOn(supplierAccess, 'assertSupplierUsable')
    .mockRejectedValue(new BadRequestException('供应商已淘汰'));

  await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
  expect(prisma.materialBatch.create).not.toHaveBeenCalled();
});
```

- [ ] **Step 5: Assert successful create checks supplier**

In the existing successful create test, add:

```ts
expect(supplierAccess.assertSupplierUsable).toHaveBeenCalledWith('supplier-001', '创建物料批次');
```

- [ ] **Step 6: Run batch tests**

Run:

```bash
npm test --workspace server -- --runTestsByPath src/modules/warehouse/batch.service.spec.ts
```

Expected: pass.

## Task 6: Gate requisition completion by batch supplier

**Files:**
- Modify: `server/src/modules/warehouse/requisition.service.ts`
- Modify: `server/src/modules/warehouse/requisition.service.spec.ts`

- [ ] **Step 1: Inject SupplierAccessService**

In `server/src/modules/warehouse/requisition.service.ts`, add:

```ts
import { SupplierAccessService } from './services/supplier-access.service';
```

Change constructor:

```ts
constructor(
  private readonly prisma: PrismaService,
  @Optional() private readonly approvalEngine: ApprovalEngineService,
  private readonly inventoryMovementLedger: InventoryMovementLedgerService,
  private readonly supplierAccess: SupplierAccessService,
) {}
```

- [ ] **Step 2: Check each requisition item before decrementing inventory**

Inside `complete()`, in the `for (const item of requisition.items)` loop, before `tx.materialBatch.update(...)`, add:

```ts
await this.supplierAccess.assertBatchSupplierUsable(item.batchId, '完成领料');
```

- [ ] **Step 3: Update requisition service test providers**

In `server/src/modules/warehouse/requisition.service.spec.ts`, import:

```ts
import { SupplierAccessService } from './services/supplier-access.service';
```

Add:

```ts
let supplierAccess: SupplierAccessService;
```

Add provider:

```ts
{
  provide: SupplierAccessService,
  useValue: {
    assertBatchSupplierUsable: jest.fn(),
  },
}
```

After module compile:

```ts
supplierAccess = module.get<SupplierAccessService>(SupplierAccessService);
```

- [ ] **Step 4: Add blocked requisition completion test**

Inside `describe('complete')`, add:

```ts
it('should reject requisition completion when batch supplier is not usable', async () => {
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
  jest
    .spyOn(supplierAccess, 'assertBatchSupplierUsable')
    .mockRejectedValue(new BadRequestException('供应商已淘汰'));

  const txClient = {
    materialBatch: { update: jest.fn() },
    stagingAreaStock: { upsert: jest.fn(), findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
    stockRecord: { create: jest.fn() },
    materialRequisition: { update: jest.fn() },
    materialRequisitionItem: { findMany: jest.fn().mockResolvedValue(mockRequisition.items) },
  };

  jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
    return callback(txClient);
  });

  await expect(service.complete('req-001', 'user-001')).rejects.toThrow(BadRequestException);
  expect(txClient.materialBatch.update).not.toHaveBeenCalled();
});
```

- [ ] **Step 5: Assert successful complete checks the batch supplier**

In the existing successful complete test, add:

```ts
expect(supplierAccess.assertBatchSupplierUsable).toHaveBeenCalledWith('batch-001', '完成领料');
```

- [ ] **Step 6: Run requisition tests**

Run:

```bash
npm test --workspace server -- --runTestsByPath src/modules/warehouse/requisition.service.spec.ts
```

Expected: pass.

## Task 7: Run combined verification

**Files:**
- Verify only.

- [ ] **Step 1: Run all affected warehouse tests**

Run:

```bash
npm test --workspace server -- --runTestsByPath \
  src/modules/warehouse/services/supplier-access.service.spec.ts \
  src/modules/warehouse/inbound.service.spec.ts \
  src/modules/warehouse/batch.service.spec.ts \
  src/modules/warehouse/requisition.service.spec.ts
```

Expected: all tests pass.

- [ ] **Step 2: Run TypeScript build for server**

Run:

```bash
npm run build:server
```

Expected: build completes without TypeScript errors.

- [ ] **Step 3: Check formatting-sensitive diff**

Run:

```bash
git diff --check
```

Expected: no output.

## Task 8: Commit and PR

**Files:**
- Commit only implementation and tests listed above.

- [ ] **Step 1: Review changed files**

Run:

```bash
git status --short
git diff --stat
```

Expected changed files:

```text
server/src/modules/warehouse/warehouse.module.ts
server/src/modules/warehouse/services/supplier-access.service.ts
server/src/modules/warehouse/services/supplier-access.service.spec.ts
server/src/modules/warehouse/inbound.service.ts
server/src/modules/warehouse/inbound.service.spec.ts
server/src/modules/warehouse/batch.service.ts
server/src/modules/warehouse/batch.service.spec.ts
server/src/modules/warehouse/requisition.service.ts
server/src/modules/warehouse/requisition.service.spec.ts
```

- [ ] **Step 2: Commit**

Run:

```bash
git add server/src/modules/warehouse/warehouse.module.ts \
  server/src/modules/warehouse/services/supplier-access.service.ts \
  server/src/modules/warehouse/services/supplier-access.service.spec.ts \
  server/src/modules/warehouse/inbound.service.ts \
  server/src/modules/warehouse/inbound.service.spec.ts \
  server/src/modules/warehouse/batch.service.ts \
  server/src/modules/warehouse/batch.service.spec.ts \
  server/src/modules/warehouse/requisition.service.ts \
  server/src/modules/warehouse/requisition.service.spec.ts
git commit -m "fix(GAP-103): gate warehouse flows by supplier status"
```

- [ ] **Step 3: Push and open PR**

Run:

```bash
git push -u origin codex/gap-103-supplier-status-gate
gh pr create \
  --title "fix(GAP-103): gate warehouse flows by supplier status" \
  --body "Implements GAP-103 by adding a warehouse supplier access gate and applying it to inbound creation, manual material batch creation, and requisition completion. Execution followed docs/superpowers/plans/2026-05-01-gap-103-supplier-status-gate-implementation.md using superpowers:executing-plans."
```

Expected: PR URL is printed.

