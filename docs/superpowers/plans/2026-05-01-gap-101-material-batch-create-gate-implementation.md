# GAP-101 Material Batch Create Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Do not use `brainstorming`, `writing-plans`, or subagent dispatch while executing. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Disable direct manual `MaterialBatch` creation through `POST /warehouse/batches` so new material lots can only be created by completing `MaterialInbound`.

**Architecture:** Keep `BatchService` as the read/update/FIFO service for material batches, but make its manual `create()` path return a stable 410 Gone response. Leave `InboundService.complete()` unchanged because it already writes `MaterialBatch`, `StockRecord(in)`, and `MaterialInboundItem.createdBatchId` in one transaction.

**Tech Stack:** NestJS, Prisma, Jest, TypeScript, Vue 3, npm workspaces, Playwright.

---

## Superpower 与 grill-me 校准记录

- 已按 `brainstorming` 形成 spec：`docs/superpowers/specs/2026-05-01-gap-101-material-batch-create-gate-design.md`。
- 已按 `grill-with-docs` 对照 `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 校准：`MaterialBatch` 是业务口径 `MaterialLot`，必须回到 `Supplier -> MaterialInbound -> MaterialInboundItem -> MaterialBatch` 来料事实源。
- 本 plan 不调用 `grill-me`；`grill-with-docs` 已覆盖主数据、批次、追溯和迁移边界。
- 执行 agent 只能使用 `superpowers:executing-plans`。
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
git worktree add /Users/jiashenglin/Desktop/好玩的项目/noidear-gap-101-material-batch-create-gate -b codex/gap-101-material-batch-create-gate origin/master
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-gap-101-material-batch-create-gate
```

## 停止条件

- 如果 `BatchService.create()` 已经返回 410 或已被删除，停止并回报当前代码状态，不要重复实现。
- 如果 `POST /warehouse/batches` 已经不存在，停止并回报当前代码状态。
- 如果 `client/src/api/warehouse.ts` 已经没有 `batchApi.create()`，继续处理后端，但不要重建该方法。
- 如果发现新的合法手工建批次业务需求或管理员豁免要求，停止；本 plan 的设计结论是废弃直接创建路径。
- 如果实现需要 schema、migration、历史数据清洗或业务数据补录，停止；本 GAP 不允许这些改动。
- 如果 GAP-103 已经修改了 `BatchService` 构造函数或测试 provider，按现状保留供应商准入代码，只废弃直接创建入口。

## Task 1: Update BatchService tests for deprecated manual create

**Files:**
- Modify: `server/src/modules/warehouse/batch.service.spec.ts`

- [ ] **Step 1: Change the import**

Modify the import near the top of `server/src/modules/warehouse/batch.service.spec.ts` from:

```ts
import { BadRequestException, NotFoundException } from '@nestjs/common';
```

to:

```ts
import { BadRequestException, GoneException, NotFoundException } from '@nestjs/common';
```

- [ ] **Step 2: Replace the successful create test**

Replace the existing `it('should create batch successfully', ...)` block inside `describe('create', ...)` with:

```ts
    it('rejects direct manual batch creation with GoneException', async () => {
      const createDto = {
        batchNumber: 'BATCH-20260215-001',
        materialId: 'material-001',
        productionDate: new Date('2026-01-01'),
        expiryDate: new Date('2026-07-01'),
        quantity: 100,
        supplierId: 'supplier-001',
        supplierBatchNo: 'SUP-001',
      };

      await expect(service.create(createDto)).rejects.toThrow(GoneException);
      expect(prisma.materialBatch.create).not.toHaveBeenCalled();
    });
```

- [ ] **Step 3: Replace the duplicate batch-number test**

Replace the existing `it('should throw BadRequestException if batch number exists', ...)` block with:

```ts
    it('does not attempt Prisma create even when batch number would duplicate', async () => {
      const createDto = {
        batchNumber: 'BATCH-20260215-001',
        materialId: 'material-001',
        productionDate: new Date(),
        expiryDate: new Date(),
        quantity: 100,
      };

      await expect(service.create(createDto as any)).rejects.toThrow(GoneException);
      expect(prisma.materialBatch.create).not.toHaveBeenCalled();
    });
```

- [ ] **Step 4: Run the focused test to confirm it fails**

Run:

```bash
npm test --workspace server -- --runTestsByPath src/modules/warehouse/batch.service.spec.ts
```

Expected: fail because `BatchService.create()` still calls `prisma.materialBatch.create()` and does not throw `GoneException`.

## Task 2: Disable BatchService.create

**Files:**
- Modify: `server/src/modules/warehouse/batch.service.ts`

- [ ] **Step 1: Change the Nest exception import**

Modify the import in `server/src/modules/warehouse/batch.service.ts` from:

```ts
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
```

to:

```ts
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  GoneException,
} from '@nestjs/common';
```

- [ ] **Step 2: Replace the manual create implementation**

Replace the full `create()` method with:

```ts
  async create(_createBatchDto: CreateBatchDto) {
    throw new GoneException(
      'Direct material batch creation is disabled. Complete a MaterialInbound to create MaterialBatch.',
    );
  }
```

Do not change `findAll`, `findOne`, `update`, `lock`, `getFIFO`, `lockExpiredBatchesCron`, `lockExpiredBatches`, `findExpiredBatches`, or `updateBatchesToExpired`.

- [ ] **Step 3: Run the focused test**

Run:

```bash
npm test --workspace server -- --runTestsByPath src/modules/warehouse/batch.service.spec.ts
```

Expected: pass. The create tests should assert `GoneException`, and the existing find/update/lock/FIFO tests should continue to pass.

## Task 3: Add controller coverage for POST /warehouse/batches

**Files:**
- Create: `server/src/modules/warehouse/batch.controller.spec.ts`

- [ ] **Step 1: Create the controller spec**

Create `server/src/modules/warehouse/batch.controller.spec.ts`:

```ts
import { GoneException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BatchController } from './batch.controller';
import { BatchService } from './batch.service';

describe('BatchController', () => {
  let controller: BatchController;
  let service: BatchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BatchController],
      providers: [
        {
          provide: BatchService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            getFIFO: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            lock: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(BatchController);
    service = module.get(BatchService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the BatchService GoneException for direct manual create', async () => {
    const dto = {
      batchNumber: 'BATCH-20260215-001',
      materialId: 'material-001',
      productionDate: new Date('2026-01-01'),
      expiryDate: new Date('2026-07-01'),
      quantity: 100,
    };

    jest
      .spyOn(service, 'create')
      .mockRejectedValue(
        new GoneException(
          'Direct material batch creation is disabled. Complete a MaterialInbound to create MaterialBatch.',
        ),
      );

    await expect(controller.create(dto)).rejects.toThrow(GoneException);
    expect(service.create).toHaveBeenCalledWith(dto);
  });
});
```

- [ ] **Step 2: Run the controller spec**

Run:

```bash
npm test --workspace server -- --runTestsByPath src/modules/warehouse/batch.controller.spec.ts
```

Expected: pass.

## Task 4: Preserve inbound completion as the only create source

**Files:**
- Modify: `server/src/modules/warehouse/inbound.service.spec.ts`
- Do not modify: `server/src/modules/warehouse/inbound.service.ts`

- [ ] **Step 1: Add an assertion to the existing complete-path test**

In `server/src/modules/warehouse/inbound.service.spec.ts`, find:

```ts
    it('should complete inbound and create batches', async () => {
```

After:

```ts
      expect(batchNumberGenerator.generateBatchNumber).toHaveBeenCalledWith('material');
      expect(prisma.$transaction).toHaveBeenCalled();
```

insert:

```ts
expect(tx.materialBatch.create).toHaveBeenCalledWith({
  data: {
    batchNumber: 'BATCH-20260215-001',
    materialId: 'material-001',
    supplierBatchNo: 'SUP-001',
    supplierId: 'supplier-001',
    productionDate: new Date('2026-01-01'),
    expiryDate: new Date('2026-07-01'),
    quantity: 100,
    status: 'normal',
  },
});
```

- [ ] **Step 2: Assert StockRecord and inbound item linkage remain in the same complete flow**

Immediately after the `tx.materialBatch.create` assertion, insert:

```ts
expect(tx.stockRecord.create).toHaveBeenCalledWith({
  data: {
    batchId: 'batch-001',
    recordType: 'in',
    quantity: 100,
    relatedId: 'inbound-001',
    relatedType: 'inbound',
    operatorId: 'user-001',
  },
});

expect(tx.materialInboundItem.update).toHaveBeenCalledWith({
  where: { id: 'item-001' },
  data: { createdBatchId: 'batch-001' },
});
```

- [ ] **Step 3: Run the inbound spec**

Run:

```bash
npm test --workspace server -- --runTestsByPath src/modules/warehouse/inbound.service.spec.ts
```

Expected: pass. The test must prove `InboundService.complete()` still creates `MaterialBatch`, writes `StockRecord(in)`, and updates `MaterialInboundItem.createdBatchId`.

## Task 5: Remove the frontend manual-create adapter

**Files:**
- Modify: `client/src/api/warehouse.ts`

- [ ] **Step 1: Remove `batchApi.create`**

In `client/src/api/warehouse.ts`, remove this method from `batchApi`:

```ts
  create(payload: Partial<MaterialBatch>) {
    return request.post<MaterialBatch>('/warehouse/batches', payload);
  },
```

Keep `getList`, `getById`, and `update`.

- [ ] **Step 2: Verify no frontend caller remains**

Run:

```bash
rg "batchApi\\.create" client/src
```

Expected: no output and exit code 1. If a caller exists, remove that UI entry point or stop if it represents a new business requirement.

- [ ] **Step 3: Run the existing BatchManagement unit test**

Run:

```bash
npm test --workspace client -- BatchManagement
```

Expected: pass. `BatchManagement.vue` should remain list/filter only.

## Task 6: Verification and commit

**Files:**
- Verify only; do not modify schema or migration files.

- [ ] **Step 1: Run warehouse backend tests**

Run:

```bash
npm test --workspace server -- --runTestsByPath \
  src/modules/warehouse/batch.service.spec.ts \
  src/modules/warehouse/batch.controller.spec.ts \
  src/modules/warehouse/inbound.service.spec.ts
```

Expected: pass.

- [ ] **Step 2: Run builds**

Run:

```bash
npm run build:server
npm run build:client
```

Expected: both commands exit 0.

- [ ] **Step 3: Run the GAP validation command**

Run from the repository root:

```bash
pnpm test:e2e -- --grep GAP-101
```

Expected: `GAP-101` E2E coverage passes with 0 failed tests. If the repository does not expose root `pnpm test:e2e`, run:

```bash
npm run test:e2e --workspace client -- --grep GAP-101
```

Expected: `GAP-101` E2E coverage passes with 0 failed tests.

- [ ] **Step 4: Confirm schema and migration were not changed**

Run:

```bash
git diff -- server/src/prisma/schema.prisma server/src/prisma/migrations
```

Expected: no output.

- [ ] **Step 5: Confirm final diff scope**

Run:

```bash
git status --short
```

Expected: changed files are limited to:

```text
M server/src/modules/warehouse/batch.service.ts
M server/src/modules/warehouse/batch.service.spec.ts
A server/src/modules/warehouse/batch.controller.spec.ts
M server/src/modules/warehouse/inbound.service.spec.ts
M client/src/api/warehouse.ts
```

If GAP-103 has already landed and changed constructor providers or tests, the final file list may additionally include the same warehouse test files, but must not include schema, migration, or unrelated modules.

- [ ] **Step 6: Commit**

Run:

```bash
git add \
  server/src/modules/warehouse/batch.service.ts \
  server/src/modules/warehouse/batch.service.spec.ts \
  server/src/modules/warehouse/batch.controller.spec.ts \
  server/src/modules/warehouse/inbound.service.spec.ts \
  client/src/api/warehouse.ts
git commit -m "fix: disable direct material batch creation"
```

Expected: commit succeeds. Do not stage generated reports, coverage, `.env`, `dist`, `playwright-report`, or `test-results`.
