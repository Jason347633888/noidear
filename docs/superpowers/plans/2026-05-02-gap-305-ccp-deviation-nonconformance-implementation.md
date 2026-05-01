# GAP-305 CCP Deviation NonConformance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Do not use brainstorming, writing-plans, or redesign the quality release model during execution. If current code disagrees with this plan, stop and report the mismatch to the main agent.

**Goal:** Automatically create an open `NonConformance` whenever a newly submitted `CCPRecord` is outside its critical limit.

**Architecture:** Keep `CCPRecord` as the process-monitoring fact and `NonConformance` as the quality-exception fact. `CcpService.createRecord()` creates both records inside one Prisma transaction only when `is_within_cl=false`, and the generated NC points back to the affected `ProductionBatch` through the existing `source_type + source_id` contract.

**Tech Stack:** NestJS, Prisma, class-validator DTOs already in place, Jest unit tests.

---

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** 主 agent 已按 `brainstorming -> grill-with-docs -> writing-plans` 为 GAP-305 生成 spec 和本 implementation plan。
- **grill-with-docs 校准结论：** 已确认 CCP 偏差属于 `ProductionBatch -> CCPRecord -> NonConformance` 的质量异常闭环；不得新增平行不合格事实源，不得新增 `source_type='ccp_record'`，不得顺手实现完整批次放行状态机、CAPA 自动创建、ReworkRecord 自动创建或 GAP-303 的 missing CCP 产品过滤。
- **执行限制：** Multica 执行 agent 只能使用 `superpowers:executing-plans` 执行本计划；不得自行扩展范围、补写新 spec、重排 GAP 或改动未列入文件。
- **执行隔离：** 执行本计划前必须从最新 `origin/master` 创建独立 worktree，或使用 Multica 隔离工作目录；不得在主 checkout `/Users/jiashenglin/Desktop/好玩的项目/noidear` 直接修改、提交或 push。如发现当前目录是主 checkout，必须停止并回报主 agent。
- **停止条件：** 如果执行 agent 发现本计划与当前代码、`AGENTS.md`、`docs/AGENT_GUIDE.md`、`docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 或 spec 冲突，必须停止并回报主 agent，不得猜测实现。
- **历史数据停止条件：** 本 GAP 不回填历史 `CCPRecord.is_within_cl=false`。如果用户要求补历史数据，停止并回报需要另开数据修复任务。

## File Map

All commands below assume the execution agent is at the root of its isolated `noidear` worktree or Multica checkout.

- Modify: `server/src/modules/non-conformance/non-conformance.service.ts`
- Modify: `server/src/modules/non-conformance/non-conformance.service.spec.ts`
- Modify: `server/src/modules/ccp/ccp.module.ts`
- Modify: `server/src/modules/ccp/ccp.service.ts`
- Modify: `server/src/modules/ccp/ccp.service.spec.ts`
- Do not modify: `server/src/prisma/schema.prisma`
- Do not modify: `client/src/views/ccp/`
- Do not modify: `client/src/views/non-conformance/`
- Do not modify: `server/src/modules/corrective-action/`
- Do not modify: `server/src/modules/rework-record/`

## Task 1: Add a NonConformance helper for CCP deviations

**Files:**
- Modify: `server/src/modules/non-conformance/non-conformance.service.spec.ts`
- Modify: `server/src/modules/non-conformance/non-conformance.service.ts`

- [ ] **Step 1: Add focused tests for CCP-triggered NC creation**

Append these tests inside `describe('NonConformanceService', () => { ... })` in `server/src/modules/non-conformance/non-conformance.service.spec.ts`:

```ts
  it('creates an open NonConformance from a CCP deviation using production batch as source', async () => {
    const tx: any = {
      nonConformance: {
        count: jest.fn().mockResolvedValue(8),
        create: jest.fn().mockResolvedValue({ id: 'nc-ccp-1' }),
      },
    };

    await service.createFromCcpDeviation(
      {
        companyId: '2',
        userId: 'operator-1',
        ccpRecord: {
          id: 'ccp-record-1',
          production_batch_id: 'batch-1',
          ccp_point_id: 'ccp-point-1',
          measured_value: 93.5,
          measured_text: null,
          unit: 'C',
          deviation_action: '隔离待评审',
          ccp_point: { ccp_no: 'CCP-BAKE-01' },
        },
      },
      tx,
    );

    expect(tx.nonConformance.count).toHaveBeenCalledWith({ where: { company_id: '2' } });
    expect(tx.nonConformance.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        company_id: '2',
        nc_no: expect.stringMatching(/^NC-\d{4}-0009$/),
        source_type: 'production_batch',
        source_id: 'batch-1',
        nc_type: 'ccp_deviation',
        discovered_by: 'operator-1',
        discovered_at: expect.any(Date),
        description: expect.stringContaining('CCP-BAKE-01'),
      }),
    });
    expect(tx.nonConformance.create.mock.calls[0][0].data.description).toContain('93.5 C');
    expect(tx.nonConformance.create.mock.calls[0][0].data.description).toContain('隔离待评审');
    expect(tx.nonConformance.create.mock.calls[0][0].data.description).toContain('ccp-record-1');
  });

  it('builds a CCP deviation description from measured text when numeric value is absent', async () => {
    const tx: any = {
      nonConformance: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: 'nc-ccp-2' }),
      },
    };

    await service.createFromCcpDeviation(
      {
        companyId: '2',
        userId: 'operator-1',
        ccpRecord: {
          id: 'ccp-record-2',
          production_batch_id: 'batch-1',
          ccp_point_id: 'ccp-point-2',
          measured_value: null,
          measured_text: '金探测试片未通过',
          unit: null,
          deviation_action: null,
          ccp_point: null,
        },
      },
      tx,
    );

    const data = tx.nonConformance.create.mock.calls[0][0].data;
    expect(data.description).toContain('ccp-point-2');
    expect(data.description).toContain('金探测试片未通过');
    expect(data.description).toContain('未填写');
  });
```

- [ ] **Step 2: Run the focused test and verify it fails before implementation**

Run:

```bash
(cd server && npm test -- non-conformance.service.spec.ts --runInBand)
```

Expected: FAIL with `service.createFromCcpDeviation is not a function`.

- [ ] **Step 3: Add the helper input type and Prisma import**

At the top of `server/src/modules/non-conformance/non-conformance.service.ts`, replace:

```ts
import { PrismaService } from '../../prisma/prisma.service';
```

with:

```ts
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
```

Below the imports, add:

```ts
type CcpDeviationInput = {
  companyId: string;
  userId: string;
  ccpRecord: {
    id: string;
    production_batch_id: string;
    ccp_point_id: string;
    measured_value?: unknown;
    measured_text?: string | null;
    unit?: string | null;
    deviation_action?: string | null;
    ccp_point?: { ccp_no?: string | null } | null;
  };
};
```

- [ ] **Step 4: Add the CCP deviation helper method**

Inside `NonConformanceService`, after `create()` and before `findAll()`, add:

```ts
  async createFromCcpDeviation(input: CcpDeviationInput, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.prisma;
    const count = await db.nonConformance.count({ where: { company_id: input.companyId } });
    const nc_no = `NC-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    return db.nonConformance.create({
      data: {
        company_id: input.companyId,
        nc_no,
        source_type: 'production_batch',
        source_id: input.ccpRecord.production_batch_id,
        nc_type: 'ccp_deviation',
        description: this.buildCcpDeviationDescription(input.ccpRecord),
        discovered_by: input.userId,
        discovered_at: new Date(),
      },
    });
  }

  private buildCcpDeviationDescription(record: CcpDeviationInput['ccpRecord']) {
    const ccpNo = record.ccp_point?.ccp_no ?? record.ccp_point_id;
    const measured =
      record.measured_value != null
        ? `${record.measured_value}${record.unit ? ` ${record.unit}` : ''}`
        : record.measured_text ?? '未填写';
    const action = record.deviation_action ? `；偏差处置：${record.deviation_action}` : '；偏差处置：未填写';

    return `CCP偏差：${ccpNo} 超出临界限；实测：${measured}${action}；CCP记录ID：${record.id}`;
  }
```

- [ ] **Step 5: Run the NonConformance focused test**

Run:

```bash
(cd server && npm test -- non-conformance.service.spec.ts --runInBand)
```

Expected: PASS for `non-conformance.service.spec.ts`.

## Task 2: Wire CcpModule to NonConformanceModule

**Files:**
- Modify: `server/src/modules/ccp/ccp.module.ts`
- Modify: `server/src/modules/ccp/ccp.service.ts`
- Modify: `server/src/modules/ccp/ccp.service.spec.ts`

- [ ] **Step 1: Import `NonConformanceModule` in `CcpModule`**

Replace `server/src/modules/ccp/ccp.module.ts` with:

```ts
import { Module } from '@nestjs/common';
import { NonConformanceModule } from '../non-conformance/non-conformance.module';
import { CcpController } from './ccp.controller';
import { CcpService } from './ccp.service';

@Module({
  imports: [NonConformanceModule],
  controllers: [CcpController],
  providers: [CcpService],
  exports: [CcpService],
})
export class CcpModule {}
```

- [ ] **Step 2: Update `CcpService` constructor**

In `server/src/modules/ccp/ccp.service.ts`, add:

```ts
import { NonConformanceService } from '../non-conformance/non-conformance.service';
```

Replace:

```ts
  constructor(private prisma: PrismaService) {}
```

with:

```ts
  constructor(
    private prisma: PrismaService,
    private nonConformanceService: NonConformanceService,
  ) {}
```

- [ ] **Step 3: Update the CCP service spec setup**

In `server/src/modules/ccp/ccp.service.spec.ts`, replace the current `prisma` constant and service setup with:

```ts
  const prisma = {
    $transaction: jest.fn(),
    cCPRecord: { create: jest.fn(), findMany: jest.fn() },
    cCPPoint: { findMany: jest.fn() },
    productionBatch: { findUnique: jest.fn() },
  };
  const nonConformanceService = {
    createFromCcpDeviation: jest.fn(),
  };
  let service: CcpService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CcpService(prisma as any, nonConformanceService as any);
  });
```

- [ ] **Step 4: Update existing CCP record creation expectation**

In the existing `writes CCP records to the authenticated company` test, keep the same test intent and add an assertion that no NC is created:

```ts
    expect(nonConformanceService.createFromCcpDeviation).not.toHaveBeenCalled();
```

- [ ] **Step 5: Run the CCP focused test and verify constructor-related failures are resolved after implementation**

Run:

```bash
(cd server && npm test -- ccp.service.spec.ts --runInBand)
```

Expected: FAIL only because `CcpService.createRecord()` has not yet implemented the deviation transaction behavior.

## Task 3: Create NonConformance from failed CCP records in one transaction

**Files:**
- Modify: `server/src/modules/ccp/ccp.service.ts`
- Modify: `server/src/modules/ccp/ccp.service.spec.ts`

- [ ] **Step 1: Add the failing deviation test**

Append this test to `server/src/modules/ccp/ccp.service.spec.ts`:

```ts
  it('creates a NonConformance in the same transaction when a CCP record is outside the critical limit', async () => {
    const tx = {
      cCPRecord: {
        create: jest.fn().mockResolvedValue({
          id: 'ccp-record-1',
          company_id: '2',
          production_batch_id: 'batch-1',
          ccp_point_id: 'ccp-point-1',
          measured_value: 93.5,
          measured_text: null,
          unit: 'C',
          is_within_cl: false,
          deviation_action: '隔离待评审',
          operator_id: 'operator-1',
          ccp_point: { ccp_no: 'CCP-BAKE-01' },
        }),
      },
    };
    prisma.$transaction.mockImplementation(async (callback: any) => callback(tx));
    nonConformanceService.createFromCcpDeviation.mockResolvedValue({ id: 'nc-1' });

    const result = await service.createRecord(
      {
        production_batch_id: 'batch-1',
        ccp_point_id: 'ccp-point-1',
        measured_value: 93.5,
        unit: 'C',
        is_within_cl: false,
        deviation_action: '隔离待评审',
      },
      'operator-1',
      '2',
    );

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.cCPRecord.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        company_id: '2',
        production_batch_id: 'batch-1',
        ccp_point_id: 'ccp-point-1',
        is_within_cl: false,
        operator_id: 'operator-1',
        monitored_at: expect.any(Date),
      }),
      include: { ccp_point: true },
    });
    expect(nonConformanceService.createFromCcpDeviation).toHaveBeenCalledWith(
      {
        companyId: '2',
        userId: 'operator-1',
        ccpRecord: expect.objectContaining({
          id: 'ccp-record-1',
          production_batch_id: 'batch-1',
          ccp_point_id: 'ccp-point-1',
        }),
      },
      tx,
    );
    expect(result).toEqual(expect.objectContaining({ id: 'ccp-record-1' }));
  });
```

- [ ] **Step 2: Add the transaction failure propagation test**

Append this test to the same spec file:

```ts
  it('rejects the CCP record creation when automatic NonConformance creation fails', async () => {
    const tx = {
      cCPRecord: {
        create: jest.fn().mockResolvedValue({
          id: 'ccp-record-1',
          company_id: '2',
          production_batch_id: 'batch-1',
          ccp_point_id: 'ccp-point-1',
          is_within_cl: false,
          ccp_point: { ccp_no: 'CCP-BAKE-01' },
        }),
      },
    };
    prisma.$transaction.mockImplementation(async (callback: any) => callback(tx));
    nonConformanceService.createFromCcpDeviation.mockRejectedValue(new Error('NC create failed'));

    await expect(
      service.createRecord(
        { production_batch_id: 'batch-1', ccp_point_id: 'ccp-point-1', is_within_cl: false },
        'operator-1',
        '2',
      ),
    ).rejects.toThrow('NC create failed');
  });
```

- [ ] **Step 3: Run the CCP focused test and verify it fails before service implementation**

Run:

```bash
(cd server && npm test -- ccp.service.spec.ts --runInBand)
```

Expected: FAIL because `CcpService.createRecord()` does not call `$transaction` or `createFromCcpDeviation`.

- [ ] **Step 4: Implement the transaction in `createRecord()`**

In `server/src/modules/ccp/ccp.service.ts`, replace the body of `createRecord()` with:

```ts
    const createData = {
      company_id: companyId,
      production_batch_id: dto.production_batch_id,
      ccp_point_id: dto.ccp_point_id,
      measured_value: dto.measured_value,
      measured_text: dto.measured_text,
      unit: dto.unit,
      is_within_cl: dto.is_within_cl,
      deviation_action: dto.deviation_action,
      operator_id: operatorId,
      monitored_at: new Date(),
    };

    if (dto.is_within_cl) {
      return this.prisma.cCPRecord.create({
        data: createData,
        include: { ccp_point: true },
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const ccpRecord = await tx.cCPRecord.create({
        data: createData,
        include: { ccp_point: true },
      });

      await this.nonConformanceService.createFromCcpDeviation(
        {
          companyId,
          userId: operatorId,
          ccpRecord,
        },
        tx,
      );

      return ccpRecord;
    });
```

- [ ] **Step 5: Run the CCP focused test**

Run:

```bash
(cd server && npm test -- ccp.service.spec.ts --runInBand)
```

Expected: PASS for `ccp.service.spec.ts`.

## Task 4: Full focused verification

**Files:**
- No source edits unless a previous task failed.

- [ ] **Step 1: Run both focused service specs**

Run:

```bash
(cd server && npm test -- ccp.service.spec.ts non-conformance.service.spec.ts --runInBand)
```

Expected: PASS for both focused spec files.

- [ ] **Step 2: Build the server**

Run:

```bash
npm run build:server
```

Expected: PASS with no TypeScript compile errors.

- [ ] **Step 3: Run the GAP acceptance command if available**

Run:

```bash
pnpm test:e2e -- --grep GAP-305
```

Expected: PASS if the repository has this E2E command and GAP tag. If the package manager reports that the command or tag is absent, record the exact output in the PR and keep Step 1 plus Step 2 as the required verification evidence.

- [ ] **Step 4: Confirm no schema or frontend files changed**

Run:

```bash
git diff --name-only
```

Expected: the changed files are limited to:

```text
server/src/modules/non-conformance/non-conformance.service.ts
server/src/modules/non-conformance/non-conformance.service.spec.ts
server/src/modules/ccp/ccp.module.ts
server/src/modules/ccp/ccp.service.ts
server/src/modules/ccp/ccp.service.spec.ts
```

If `server/src/prisma/schema.prisma`, migrations, or frontend files appear, stop and remove or justify those changes with the main agent before committing.
