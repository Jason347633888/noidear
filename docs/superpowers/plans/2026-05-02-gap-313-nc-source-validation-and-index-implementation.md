# GAP-313 NonConformance Source Validation And Index Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Do not use brainstorming, writing-plans, or redesign the nonconformance/CAPA model during execution. If current code disagrees with this plan, stop and report the mismatch to the main agent.

**Goal:** Prevent new `NonConformance` records from pointing at nonexistent `source_id` values, while preserving the tenant-scoped source lookup index.

**Architecture:** Keep the existing polymorphic `source_type + source_id` contract and add application-layer source existence checks before writes. Cover both manual API creation through `NonConformanceService` and automatic NC creation in `WorkflowTriggersService`. Treat the existing `@@index([company_id, source_type, source_id])` as the required index; do not add a duplicate unscoped index.

**Tech Stack:** NestJS, Prisma, class-validator, Jest, npm workspaces.

---

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** 主 agent 已按 `brainstorming -> grill-with-docs -> writing-plans` 为 GAP-313 生成 spec 和本 implementation plan。
- **grill-with-docs 校准结论：** 已确认 `NonConformance` 是不合格事实源，来源必须回到 `MaterialBatch`、`ProductionBatch` 或 `Product`；不得新增平行批次字段，不得重构为多个 nullable FK，不得自动修复历史 orphan 来源。
- **执行限制：** Multica 执行 agent 只能使用 `superpowers:executing-plans` 执行本计划；不得自行扩展范围、补写新 spec、重排 GAP 或改动未列入文件。
- **执行隔离：** 执行本计划前必须从最新 `origin/master` 创建独立 worktree，或使用 Multica 隔离工作目录；不得在主 checkout `/Users/jiashenglin/Desktop/好玩的项目/noidear` 直接修改、提交或 push。如发现当前目录是主 checkout，必须停止并回报主 agent。
- **停止条件：** 如果执行 agent 发现本计划与当前代码、`AGENTS.md`、`docs/AGENT_GUIDE.md`、`docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 或 spec 冲突，必须停止并回报主 agent，不得猜测实现。
- **历史数据停止条件：** 本 GAP 不回填历史 `NonConformance.source_id`。如果发现历史 orphan 或用户要求修复历史数据，停止并回报需要另开数据修复任务。
- **命令约束：** 本计划只使用当前仓库 npm/Jest/build 命令；不得新增 pnpm 命令。

## File Map

All commands below assume the execution agent is at the root of its isolated `noidear` worktree or Multica checkout.

- Modify: `server/src/modules/non-conformance/dto/create-nc.dto.ts`
- Modify: `server/src/modules/non-conformance/non-conformance.service.ts`
- Modify: `server/src/modules/non-conformance/non-conformance.service.spec.ts`
- Add: `server/src/modules/workflow-triggers/workflow-triggers.service.spec.ts`
- Modify: `server/src/modules/workflow-triggers/workflow-triggers.service.ts`
- Verify only: `server/src/prisma/schema.prisma`
- Do not modify: `client/src/views/non-conformance/NonConformanceList.vue`
- Do not modify: `client/src/api/non-conformance.ts`
- Do not modify: `server/src/modules/corrective-action/`
- Do not modify: `server/src/modules/rework-record/`
- Do not modify: `server/src/modules/traceability/`

## Task 1: Add focused service coverage for source validation

**Files:**
- Modify: `server/src/modules/non-conformance/non-conformance.service.spec.ts`

- [ ] **Step 1: Extend the Prisma mock**

In `server/src/modules/non-conformance/non-conformance.service.spec.ts`, replace:

```ts
  const prisma = {
    nonConformance: {
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
```

with:

```ts
  const prisma = {
    nonConformance: {
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    materialBatch: {
      findUnique: jest.fn(),
    },
    productionBatch: {
      findUnique: jest.fn(),
    },
    product: {
      findFirst: jest.fn(),
    },
  };
```

- [ ] **Step 2: Update the existing create test to validate a production batch source**

Replace the body of `it('scopes numbering and writes by company', async () => { ... })` with:

```ts
    prisma.productionBatch.findUnique.mockResolvedValue({ id: 'b1' });
    prisma.nonConformance.count.mockResolvedValue(3);
    prisma.nonConformance.create.mockResolvedValue({ id: 'nc1' });

    await service.create({ source_type: 'production_batch', source_id: 'b1', description: '偏差' }, 'u1', '2');

    expect(prisma.productionBatch.findUnique).toHaveBeenCalledWith({
      where: { id: 'b1' },
      select: { id: true },
    });
    expect(prisma.nonConformance.count).toHaveBeenCalledWith({ where: { company_id: '2' } });
    expect(prisma.nonConformance.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ company_id: '2', nc_no: expect.stringMatching(/-0004$/) }) }),
    );
```

- [ ] **Step 3: Add rejection tests for missing and invalid sources**

Append these tests before the dispose test:

```ts
  it('rejects unsupported source_type before creating a record', async () => {
    await expect(
      service.create({ source_type: 'unknown', source_id: 'x1', description: '偏差' } as any, 'u1', '2'),
    ).rejects.toThrow('不支持的不合格来源类型');

    expect(prisma.nonConformance.create).not.toHaveBeenCalled();
  });

  it('rejects blank source_id before creating a record', async () => {
    await expect(
      service.create({ source_type: 'production_batch', source_id: ' ', description: '偏差' }, 'u1', '2'),
    ).rejects.toThrow('不合格来源不能为空');

    expect(prisma.productionBatch.findUnique).not.toHaveBeenCalled();
    expect(prisma.nonConformance.create).not.toHaveBeenCalled();
  });

  it('rejects a missing production batch source', async () => {
    prisma.productionBatch.findUnique.mockResolvedValue(null);

    await expect(
      service.create({ source_type: 'production_batch', source_id: 'missing-batch', description: '偏差' }, 'u1', '2'),
    ).rejects.toThrow('生产批次来源不存在');

    expect(prisma.productionBatch.findUnique).toHaveBeenCalledWith({
      where: { id: 'missing-batch' },
      select: { id: true },
    });
    expect(prisma.nonConformance.create).not.toHaveBeenCalled();
  });

  it('rejects a missing material batch source', async () => {
    prisma.materialBatch.findUnique.mockResolvedValue(null);

    await expect(
      service.create({ source_type: 'material_batch', source_id: 'missing-material-batch', description: '偏差' }, 'u1', '2'),
    ).rejects.toThrow('物料批次来源不存在');

    expect(prisma.materialBatch.findUnique).toHaveBeenCalledWith({
      where: { id: 'missing-material-batch' },
      select: { id: true },
    });
    expect(prisma.nonConformance.create).not.toHaveBeenCalled();
  });

  it('rejects a product source outside the current company', async () => {
    prisma.product.findFirst.mockResolvedValue(null);

    await expect(
      service.create({ source_type: 'product', source_id: 'product-1', description: '偏差' }, 'u1', '2'),
    ).rejects.toThrow('产品来源不存在');

    expect(prisma.product.findFirst).toHaveBeenCalledWith({
      where: { id: 'product-1', company_id: '2', deleted_at: null },
      select: { id: true },
    });
    expect(prisma.nonConformance.create).not.toHaveBeenCalled();
  });

  it('allows a valid material batch source', async () => {
    prisma.materialBatch.findUnique.mockResolvedValue({ id: 'mb1' });
    prisma.nonConformance.count.mockResolvedValue(0);
    prisma.nonConformance.create.mockResolvedValue({ id: 'nc-material' });

    await service.create({ source_type: 'material_batch', source_id: 'mb1', description: '来料不合格' }, 'u1', '2');

    expect(prisma.materialBatch.findUnique).toHaveBeenCalledWith({
      where: { id: 'mb1' },
      select: { id: true },
    });
    expect(prisma.nonConformance.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source_type: 'material_batch',
          source_id: 'mb1',
          company_id: '2',
        }),
      }),
    );
  });
```

- [ ] **Step 4: Run the focused test and verify it fails before implementation**

```bash
(cd server && npm test -- non-conformance.service.spec.ts --runInBand)
```

Expected: FAIL because `NonConformanceService.create()` has not yet checked source existence and currently does not throw these `BadRequestException` messages.

## Task 2: Implement DTO and service validation

**Files:**
- Modify: `server/src/modules/non-conformance/dto/create-nc.dto.ts`
- Modify: `server/src/modules/non-conformance/non-conformance.service.ts`

- [ ] **Step 1: Tighten the create DTO**

Replace the entire contents of `server/src/modules/non-conformance/dto/create-nc.dto.ts` with:

```ts
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export const NC_SOURCE_TYPES = ['material_batch', 'production_batch', 'product'] as const;
export type NcSourceType = (typeof NC_SOURCE_TYPES)[number];

export class CreateNcDto {
  @IsIn(NC_SOURCE_TYPES)
  source_type: NcSourceType;

  @IsString()
  @IsNotEmpty()
  source_id: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  nc_type?: string;

  @IsOptional()
  @IsNumber()
  qty?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  disposition?: string;
}

export class DisposeNcDto {
  @IsString()
  disposition: string; // 'rework'|'destroy'|'concession'|'return'
}
```

- [ ] **Step 2: Update service imports**

In `server/src/modules/non-conformance/non-conformance.service.ts`, replace:

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
```

with:

```ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
```

Replace:

```ts
import { CreateNcDto, DisposeNcDto } from './dto/create-nc.dto';
```

with:

```ts
import { CreateNcDto, DisposeNcDto, NcSourceType } from './dto/create-nc.dto';
```

- [ ] **Step 3: Add source validation before numbering and create**

Inside `NonConformanceService`, replace the current `create()` method with:

```ts
  async create(dto: CreateNcDto, userId: string, companyId: string) {
    await this.validateSourceExists(dto.source_type, dto.source_id, companyId);

    const count = await this.prisma.nonConformance.count({ where: { company_id: companyId } });
    const nc_no = `NC-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    return this.prisma.nonConformance.create({
      data: {
        ...dto,
        source_id: dto.source_id.trim(),
        company_id: companyId,
        nc_no,
        discovered_by: userId,
        discovered_at: new Date(),
      },
    });
  }
```

- [ ] **Step 4: Add the private validator**

Still inside `NonConformanceService`, directly after `create()` and before `findAll()`, add:

```ts
  private async validateSourceExists(sourceType: NcSourceType, sourceId: string, companyId: string) {
    const trimmedSourceId = sourceId?.trim();
    if (!trimmedSourceId) {
      throw new BadRequestException('不合格来源不能为空');
    }

    if (sourceType === 'material_batch') {
      const materialBatch = await this.prisma.materialBatch.findUnique({
        where: { id: trimmedSourceId },
        select: { id: true },
      });
      if (!materialBatch) {
        throw new BadRequestException('物料批次来源不存在');
      }
      return;
    }

    if (sourceType === 'production_batch') {
      const productionBatch = await this.prisma.productionBatch.findUnique({
        where: { id: trimmedSourceId },
        select: { id: true },
      });
      if (!productionBatch) {
        throw new BadRequestException('生产批次来源不存在');
      }
      return;
    }

    if (sourceType === 'product') {
      const product = await this.prisma.product.findFirst({
        where: { id: trimmedSourceId, company_id: companyId, deleted_at: null },
        select: { id: true },
      });
      if (!product) {
        throw new BadRequestException('产品来源不存在');
      }
      return;
    }

    throw new BadRequestException('不支持的不合格来源类型');
  }
```

- [ ] **Step 5: Run the focused test**

```bash
(cd server && npm test -- non-conformance.service.spec.ts --runInBand)
```

Expected: PASS for `non-conformance.service.spec.ts`.

## Task 3: Cover and guard the automatic incoming-inspection path

**Files:**
- Add: `server/src/modules/workflow-triggers/workflow-triggers.service.spec.ts`
- Modify: `server/src/modules/workflow-triggers/workflow-triggers.service.ts`

- [ ] **Step 1: Add focused tests for `WorkflowTriggersService`**

Create `server/src/modules/workflow-triggers/workflow-triggers.service.spec.ts` with:

```ts
import { WorkflowTriggersService } from './workflow-triggers.service';

describe('WorkflowTriggersService', () => {
  const prisma = {
    materialBatch: {
      findUnique: jest.fn(),
    },
    nonConformance: {
      count: jest.fn(),
      create: jest.fn(),
    },
    changeComplianceRecord: {
      create: jest.fn(),
    },
  };

  let service: WorkflowTriggersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WorkflowTriggersService(prisma as any);
  });

  it('does not create a NonConformance for passing incoming inspections', async () => {
    await service.handleInspectionFail({
      id: 'inspection-1',
      overall_result: 'pass',
      material_batch_id: 'mb1',
      company_id: '2',
    });

    expect(prisma.materialBatch.findUnique).not.toHaveBeenCalled();
    expect(prisma.nonConformance.create).not.toHaveBeenCalled();
  });

  it('does not create a NonConformance when the material batch source is missing', async () => {
    prisma.materialBatch.findUnique.mockResolvedValue(null);

    await service.handleInspectionFail({
      id: 'inspection-2',
      overall_result: 'fail',
      material_batch_id: 'missing-mb',
      company_id: '2',
    });

    expect(prisma.materialBatch.findUnique).toHaveBeenCalledWith({
      where: { id: 'missing-mb' },
      select: { id: true },
    });
    expect(prisma.nonConformance.create).not.toHaveBeenCalled();
  });

  it('creates a NonConformance when a failed incoming inspection references an existing material batch', async () => {
    prisma.materialBatch.findUnique.mockResolvedValue({ id: 'mb1' });
    prisma.nonConformance.count.mockResolvedValue(2);
    prisma.nonConformance.create.mockResolvedValue({ id: 'nc-auto-1' });

    await service.handleInspectionFail({
      id: 'inspection-3',
      overall_result: 'fail',
      material_batch_id: 'mb1',
      company_id: '2',
    });

    expect(prisma.nonConformance.count).toHaveBeenCalledWith({ where: { company_id: '2' } });
    expect(prisma.nonConformance.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        company_id: '2',
        nc_no: expect.stringMatching(/^NC-AUTO-\d{4}-0003$/),
        source_type: 'material_batch',
        source_id: 'mb1',
        status: 'open',
        description: expect.stringContaining('inspection-3'),
        discovered_at: expect.any(Date),
      }),
    });
  });
});
```

- [ ] **Step 2: Run the workflow trigger test and verify it fails before implementation**

```bash
(cd server && npm test -- workflow-triggers.service.spec.ts --runInBand)
```

Expected: FAIL because `WorkflowTriggersService.handleInspectionFail()` currently creates `NonConformance` without checking `materialBatch.findUnique`.

- [ ] **Step 3: Validate the material batch source before automatic NC creation**

In `server/src/modules/workflow-triggers/workflow-triggers.service.ts`, inside `handleInspectionFail()` and directly after `if (payload.overall_result !== 'fail') return;`, add this block:

```ts
    const materialBatch = await this.prisma.materialBatch.findUnique({
      where: { id: payload.material_batch_id },
      select: { id: true },
    });

    if (!materialBatch) {
      this.logger.error(
        `[WorkflowTrigger] 来料检验不合格未创建不合格品处置单：物料批次不存在 ${payload.material_batch_id}`,
      );
      return;
    }
```

- [ ] **Step 4: Run the workflow trigger focused test**

```bash
(cd server && npm test -- workflow-triggers.service.spec.ts --runInBand)
```

Expected: PASS for `workflow-triggers.service.spec.ts`.

## Task 4: Verify the source lookup index

**Files:**
- Verify only: `server/src/prisma/schema.prisma`

- [ ] **Step 1: Confirm the required index exists**

Run:

```bash
rg -n '@@index\\(\\[company_id, source_type, source_id\\]\\)' server/src/prisma/schema.prisma
```

Expected: one match inside `model NonConformance`.

- [ ] **Step 2: If the index is missing, stop and inspect rebase state**

The current planning baseline already contains:

```prisma
  @@index([company_id, source_type, source_id])
```

If the command in Step 1 returns no match, first inspect `model NonConformance`. If the model lacks this tenant-scoped index, add exactly the line above below `@@index([company_id, status])`. Do not add `@@index([source_type, source_id])`; unscoped source lookup is not the authority path for a multi-company SaaS.

- [ ] **Step 3: Validate Prisma schema**

```bash
(cd server && npx prisma validate --schema src/prisma/schema.prisma)
```

Expected: PASS and output includes `The schema at src/prisma/schema.prisma is valid`.

## Task 5: Final verification

**Files:**
- No additional file edits.

- [ ] **Step 1: Run focused NonConformance service tests**

```bash
(cd server && npm test -- non-conformance.service.spec.ts --runInBand)
```

Expected: PASS.

- [ ] **Step 2: Run focused workflow trigger tests**

```bash
(cd server && npm test -- workflow-triggers.service.spec.ts --runInBand)
```

Expected: PASS.

- [ ] **Step 3: Validate Prisma schema**

```bash
(cd server && npx prisma validate --schema src/prisma/schema.prisma)
```

Expected: PASS.

- [ ] **Step 4: Build the server**

```bash
npm run build:server
```

Expected: PASS.

- [ ] **Step 5: Review the diff scope**

```bash
git diff -- server/src/modules/non-conformance/dto/create-nc.dto.ts server/src/modules/non-conformance/non-conformance.service.ts server/src/modules/non-conformance/non-conformance.service.spec.ts server/src/modules/workflow-triggers/workflow-triggers.service.ts server/src/modules/workflow-triggers/workflow-triggers.service.spec.ts server/src/prisma/schema.prisma
```

Expected: diff only contains source validation, focused tests, workflow trigger source guard, and no unrelated refactor.

## Execution Notes

- `ProductionBatch` and `MaterialBatch` do not currently carry `company_id` in Prisma schema. Do not invent tenant filters for those two models in this GAP.
- `Product` does carry `company_id`, so product source validation must scope by `{ id, company_id, deleted_at: null }`.
- Do not change frontend source selectors in this PR. Backend validation is the required authority.
- Do not alter NC numbering in this PR; count-based numbering is GAP-314.
- Do not create or modify migration files unless the required `@@index([company_id, source_type, source_id])` is missing after rebase and schema validation requires a migration.
