# GAP-314 Safe Sequence Number Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Do not use `subagent-driven-development` for this plan. Steps use checkbox (`- [ ]`) syntax for tracking. If current code disagrees with this plan, stop and report the mismatch to the main agent before editing.

**Goal:** Replace every NC/CAPA `count()+1` numbering path with a database-backed, company-scoped, year-scoped sequence generator.

**Architecture:** Add a minimal `BusinessNumberSequence` Prisma model that stores sequence cursors by `company_id + scope + period`. A new shared quality numbering service locks one sequence row in a transaction, increments it, and formats `NC-YYYY-0001` / `CAPA-YYYY-0001`; `NonConformanceService`, `WorkflowTriggersService`, and `CorrectiveActionService` call this service instead of counting rows. `NonConformanceService.createFromCcpDeviation()` must keep the existing CCP deviation automatic NC behavior and use the caller's Prisma transaction client.

**Tech Stack:** NestJS, Prisma, PostgreSQL row locking, Jest, npm workspaces.

---

## Execution Constraints

- Start from a clean branch based on latest `origin/master`.
- Use an isolated worktree or the Multica run checkout. 执行 agent 必须使用独立 worktree or Multica 隔离工作目录，禁止写主 checkout `/Users/jiashenglin/Desktop/好玩的项目/noidear`.
- Before editing, run:

```bash
git worktree list --porcelain
pwd
git branch --show-current
git status --short --branch
```

- If `pwd` is `/Users/jiashenglin/Desktop/好玩的项目/noidear`, stop and report.
- Do not implement GAP-313, GAP-315, GAP-316, GAP-317, or GAP-318.
- Do not change front-end pages or API DTOs.
- Do not delete or disable CCP deviation automatic NonConformance creation.
- Do not delete or disable incoming-inspection failure automatic NonConformance creation.
- Use npm commands only; do not add pnpm commands.

## Superpower 与 grill-me 校准记录

- **brainstorming:** 已选择新增最小业务序列表 `BusinessNumberSequence`，保持手工 NC 和 CAPA 的 `NC-YYYY-0001` / `CAPA-YYYY-0001` 格式，来料检验自动 NC 从旧 `NC-AUTO-YYYY-0001` 收敛到同一 `NC-YYYY-0001` 序列，替换所有服务层 `count()+1` 编号路径。
- **grill-with-docs:** 已对照 `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 与 历史 Multica GAP 模块文档 校准。新增表只是序列游标，不是新的不合格、CAPA、批次或追溯事实源；不触碰 `ProductionBatch / MaterialBatch / BatchMaterialUsage / InventoryMovement` 主链；历史数据不重排；已按 review blocker 覆盖 `createFromCcpDeviation()` 和 `WorkflowTriggersService.handleInspectionFail()`；该 PR 可独立执行。
- **writing-plans:** 本文件给执行 agent 使用；执行时只能用 `superpowers:executing-plans`。

## Files

- Modify: `server/src/prisma/schema.prisma`
- Create: `server/src/prisma/migrations/20260502000000_gap_314_business_number_sequences/migration.sql`
- Create: `server/src/modules/quality-number-sequence/quality-number-sequence.service.ts`
- Create: `server/src/modules/quality-number-sequence/quality-number-sequence.service.spec.ts`
- Create: `server/src/modules/quality-number-sequence/quality-number-sequence.module.ts`
- Modify: `server/src/modules/non-conformance/non-conformance.module.ts`
- Modify: `server/src/modules/non-conformance/non-conformance.service.ts`
- Modify: `server/src/modules/non-conformance/non-conformance.service.spec.ts`
- Modify: `server/src/modules/workflow-triggers/workflow-triggers.module.ts`
- Modify: `server/src/modules/workflow-triggers/workflow-triggers.service.ts`
- Create: `server/src/modules/workflow-triggers/workflow-triggers.service.spec.ts`
- Modify: `server/src/modules/corrective-action/corrective-action.module.ts`
- Modify: `server/src/modules/corrective-action/corrective-action.service.ts`
- Modify: `server/src/modules/corrective-action/corrective-action.service.spec.ts`

## Task 1: Add the sequence table

**Files:**
- Modify: `server/src/prisma/schema.prisma`
- Create: `server/src/prisma/migrations/20260502000000_gap_314_business_number_sequences/migration.sql`

- [ ] **Step 1: Add the Prisma model**

In `server/src/prisma/schema.prisma`, add this model near other system/governance support models:

```prisma
model BusinessNumberSequence {
  id            String   @id @default(cuid())
  company_id    String
  scope         String
  period        String
  current_value Int      @default(0)
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt

  @@unique([company_id, scope, period])
  @@index([scope, period])
  @@map("business_number_sequences")
}
```

- [ ] **Step 2: Create the migration SQL**

Create `server/src/prisma/migrations/20260502000000_gap_314_business_number_sequences/migration.sql` with:

```sql
CREATE TABLE "business_number_sequences" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "period" TEXT NOT NULL,
  "current_value" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "business_number_sequences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "business_number_sequences_company_id_scope_period_key"
  ON "business_number_sequences"("company_id", "scope", "period");

CREATE INDEX "business_number_sequences_scope_period_idx"
  ON "business_number_sequences"("scope", "period");
```

- [ ] **Step 3: Validate Prisma schema**

Run:

```bash
npx prisma validate --schema=server/src/prisma/schema.prisma
```

Expected: Prisma reports the schema is valid.

- [ ] **Step 4: Commit schema and migration**

Run:

```bash
git add server/src/prisma/schema.prisma server/src/prisma/migrations/20260502000000_gap_314_business_number_sequences/migration.sql
git commit -m "fix: add business number sequence table"
```

Expected: commit succeeds.

## Task 2: Create the shared sequence service

**Files:**
- Create: `server/src/modules/quality-number-sequence/quality-number-sequence.service.ts`
- Create: `server/src/modules/quality-number-sequence/quality-number-sequence.service.spec.ts`
- Create: `server/src/modules/quality-number-sequence/quality-number-sequence.module.ts`

- [ ] **Step 1: Write sequence service tests**

Create `server/src/modules/quality-number-sequence/quality-number-sequence.service.spec.ts`:

```ts
import { QualityNumberSequenceService } from './quality-number-sequence.service';

describe('QualityNumberSequenceService', () => {
  const tx = {
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    businessNumberSequence: {
      update: jest.fn(),
    },
    nonConformance: {
      findFirst: jest.fn(),
    },
    correctiveAction: {
      findFirst: jest.fn(),
    },
  };

  const prisma = {
    $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<string>) => callback(tx)),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generates the next nonconformance number from an existing locked sequence', async () => {
    tx.$queryRaw.mockResolvedValueOnce([{ id: 'seq-1', current_value: 7 }]);
    tx.businessNumberSequence.update.mockResolvedValue({ id: 'seq-1', current_value: 8 });
    const service = new QualityNumberSequenceService(prisma as any);

    await expect(service.generateNonConformanceNo('company-1', new Date('2026-05-02T00:00:00Z'))).resolves.toBe('NC-2026-0008');

    expect(tx.businessNumberSequence.update).toHaveBeenCalledWith({
      where: { id: 'seq-1' },
      data: { current_value: 8 },
    });
  });

  it('initializes a missing nonconformance sequence from the max existing current-year number', async () => {
    tx.$queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'seq-2', current_value: 14 }]);
    tx.nonConformance.findFirst.mockResolvedValue({ nc_no: 'NC-2026-0014' });
    tx.$executeRaw.mockResolvedValue(1);
    tx.businessNumberSequence.update.mockResolvedValue({ id: 'seq-2', current_value: 15 });
    const service = new QualityNumberSequenceService(prisma as any);

    await expect(service.generateNonConformanceNo('company-1', new Date('2026-08-01T00:00:00Z'))).resolves.toBe('NC-2026-0015');

    expect(tx.$executeRaw).toHaveBeenCalled();
  });

  it('uses an independent CAPA scope', async () => {
    tx.$queryRaw.mockResolvedValueOnce([{ id: 'seq-capa', current_value: 2 }]);
    tx.businessNumberSequence.update.mockResolvedValue({ id: 'seq-capa', current_value: 3 });
    const service = new QualityNumberSequenceService(prisma as any);

    await expect(service.generateCorrectiveActionNo('company-1', new Date('2026-05-02T00:00:00Z'))).resolves.toBe('CAPA-2026-0003');
  });

  it('can generate an NC number using an existing transaction client', async () => {
    tx.$queryRaw.mockResolvedValueOnce([{ id: 'seq-tx', current_value: 21 }]);
    tx.businessNumberSequence.update.mockResolvedValue({ id: 'seq-tx', current_value: 22 });
    const service = new QualityNumberSequenceService(prisma as any);

    await expect(
      service.generateNonConformanceNo('company-1', new Date('2026-05-02T00:00:00Z'), tx as any),
    ).resolves.toBe('NC-2026-0022');

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
npm run test -w server -- quality-number-sequence.service.spec.ts --runInBand
```

Expected: FAIL because `quality-number-sequence.service.ts` does not exist.

- [ ] **Step 3: Implement the service**

Create `server/src/modules/quality-number-sequence/quality-number-sequence.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';

type SequenceScope = 'non_conformance' | 'corrective_action';

type TxClient = Prisma.TransactionClient;

@Injectable()
export class QualityNumberSequenceService {
  constructor(private readonly prisma: PrismaService) {}

  generateNonConformanceNo(companyId: string, now = new Date(), tx?: TxClient): Promise<string> {
    return this.generate({
      companyId,
      scope: 'non_conformance',
      prefix: 'NC',
      period: String(now.getFullYear()),
    }, tx);
  }

  generateCorrectiveActionNo(companyId: string, now = new Date(), tx?: TxClient): Promise<string> {
    return this.generate({
      companyId,
      scope: 'corrective_action',
      prefix: 'CAPA',
      period: String(now.getFullYear()),
    }, tx);
  }

  private async generate(input: {
    companyId: string;
    scope: SequenceScope;
    prefix: 'NC' | 'CAPA';
    period: string;
  }, tx?: TxClient): Promise<string> {
    if (tx) {
      return this.generateInTransaction(tx, input);
    }

    return this.prisma.$transaction((client) => this.generateInTransaction(client as TxClient, input));
  }

  private async generateInTransaction(
    tx: TxClient,
    input: {
      companyId: string;
      scope: SequenceScope;
      prefix: 'NC' | 'CAPA';
      period: string;
    },
  ): Promise<string> {
    const sequence = await this.lockOrCreateSequence(tx, input.companyId, input.scope, input.period);
    const nextValue = sequence.current_value + 1;
    await tx.businessNumberSequence.update({
      where: { id: sequence.id },
      data: { current_value: nextValue },
    });
    return `${input.prefix}-${input.period}-${String(nextValue).padStart(4, '0')}`;
  }

  private async lockOrCreateSequence(
    tx: TxClient,
    companyId: string,
    scope: SequenceScope,
    period: string,
  ): Promise<{ id: string; current_value: number }> {
    const existing = await this.lockSequence(tx, companyId, scope, period);
    if (existing) return existing;

    const currentValue = await this.findCurrentMaxValue(tx, companyId, scope, period);
    await tx.$executeRaw(
      Prisma.sql`
        INSERT INTO business_number_sequences (id, company_id, scope, period, current_value, created_at, updated_at)
        VALUES (${randomUUID()}, ${companyId}, ${scope}, ${period}, ${currentValue}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (company_id, scope, period) DO NOTHING
      `,
    );

    const created = await this.lockSequence(tx, companyId, scope, period);
    if (!created) {
      throw new Error(`Failed to initialize sequence ${scope} for company ${companyId} and period ${period}`);
    }
    return created;
  }

  private async lockSequence(
    tx: TxClient,
    companyId: string,
    scope: SequenceScope,
    period: string,
  ): Promise<{ id: string; current_value: number } | null> {
    const rows = await tx.$queryRaw<Array<{ id: string; current_value: number }>>(
      Prisma.sql`
        SELECT id, current_value
        FROM business_number_sequences
        WHERE company_id = ${companyId}
          AND scope = ${scope}
          AND period = ${period}
        FOR UPDATE
      `,
    );
    return rows[0] ?? null;
  }

  private async findCurrentMaxValue(
    tx: TxClient,
    companyId: string,
    scope: SequenceScope,
    period: string,
  ): Promise<number> {
    if (scope === 'non_conformance') {
      const latest = await tx.nonConformance.findFirst({
        where: {
          company_id: companyId,
          nc_no: { startsWith: `NC-${period}-` },
        },
        orderBy: { nc_no: 'desc' },
        select: { nc_no: true },
      });
      return this.parseSequence(latest?.nc_no);
    }

    const latest = await tx.correctiveAction.findFirst({
      where: {
        company_id: companyId,
        capa_no: { startsWith: `CAPA-${period}-` },
      },
      orderBy: { capa_no: 'desc' },
      select: { capa_no: true },
    });
    return this.parseSequence(latest?.capa_no);
  }

  private parseSequence(value?: string | null): number {
    if (!value) return 0;
    const match = value.match(/-(\d+)$/);
    return match ? Number.parseInt(match[1], 10) : 0;
  }
}
```

- [ ] **Step 4: Add the module**

Create `server/src/modules/quality-number-sequence/quality-number-sequence.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { QualityNumberSequenceService } from './quality-number-sequence.service';

@Module({
  providers: [QualityNumberSequenceService],
  exports: [QualityNumberSequenceService],
})
export class QualityNumberSequenceModule {}
```

- [ ] **Step 5: Run the service test**

Run:

```bash
npm run test -w server -- quality-number-sequence.service.spec.ts --runInBand
```

Expected: PASS.

- [ ] **Step 6: Commit the shared service**

Run:

```bash
git add server/src/modules/quality-number-sequence
git commit -m "fix: add quality number sequence service"
```

Expected: commit succeeds.

## Task 3: Replace all NonConformance numbering paths

**Files:**
- Modify: `server/src/modules/non-conformance/non-conformance.module.ts`
- Modify: `server/src/modules/non-conformance/non-conformance.service.ts`
- Modify: `server/src/modules/non-conformance/non-conformance.service.spec.ts`
- Modify: `server/src/modules/workflow-triggers/workflow-triggers.module.ts`
- Modify: `server/src/modules/workflow-triggers/workflow-triggers.service.ts`
- Create: `server/src/modules/workflow-triggers/workflow-triggers.service.spec.ts`

- [ ] **Step 1: Update the NonConformance service test**

In `server/src/modules/non-conformance/non-conformance.service.spec.ts`, replace the first test with:

```ts
  const numberSequence = {
    generateNonConformanceNo: jest.fn(),
  };
```

Update `beforeEach()`:

```ts
    service = new NonConformanceService(prisma as any, numberSequence as any);
```

Replace `it('scopes numbering and writes by company'...)` with:

```ts
  it('uses the shared sequence service and writes by company', async () => {
    numberSequence.generateNonConformanceNo.mockResolvedValue('NC-2026-0004');
    prisma.nonConformance.create.mockResolvedValue({ id: 'nc1' });

    await service.create({ source_type: 'production_batch', source_id: 'b1', description: '偏差' }, 'u1', '2');

    expect(prisma.nonConformance.count).not.toHaveBeenCalled();
    expect(numberSequence.generateNonConformanceNo).toHaveBeenCalledWith('2');
    expect(prisma.nonConformance.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          company_id: '2',
          nc_no: 'NC-2026-0004',
          discovered_by: 'u1',
        }),
      }),
    );
  });
```

Replace the CCP deviation tests so they verify the helper also uses the sequence service and never calls `count()`:

```ts
  it('creates an open NonConformance from a CCP deviation using production batch as source', async () => {
    const tx: any = {
      nonConformance: {
        count: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 'nc-ccp-1' }),
      },
    };
    numberSequence.generateNonConformanceNo.mockResolvedValue('NC-2026-0022');

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

    expect(tx.nonConformance.count).not.toHaveBeenCalled();
    expect(numberSequence.generateNonConformanceNo).toHaveBeenCalledWith('2', expect.any(Date), tx);
    expect(tx.nonConformance.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        company_id: '2',
        nc_no: 'NC-2026-0022',
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
```

- [ ] **Step 2: Add WorkflowTriggers service tests**

Create `server/src/modules/workflow-triggers/workflow-triggers.service.spec.ts`:

```ts
import { WorkflowTriggersService } from './workflow-triggers.service';

describe('WorkflowTriggersService', () => {
  const prisma = {
    nonConformance: {
      count: jest.fn(),
      create: jest.fn(),
    },
    changeComplianceRecord: {
      create: jest.fn(),
    },
  };
  const numberSequence = {
    generateNonConformanceNo: jest.fn(),
  };

  let service: WorkflowTriggersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WorkflowTriggersService(prisma as any, numberSequence as any);
  });

  it('creates incoming-inspection failure NC with the shared sequence', async () => {
    numberSequence.generateNonConformanceNo.mockResolvedValue('NC-2026-0031');
    prisma.nonConformance.create.mockResolvedValue({ id: 'nc-incoming-1' });

    await service.handleInspectionFail({
      id: 'inspection-1',
      overall_result: 'fail',
      material_batch_id: 'mb-1',
      company_id: 'company-1',
    });

    expect(prisma.nonConformance.count).not.toHaveBeenCalled();
    expect(numberSequence.generateNonConformanceNo).toHaveBeenCalledWith('company-1');
    expect(prisma.nonConformance.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        company_id: 'company-1',
        nc_no: 'NC-2026-0031',
        source_type: 'material_batch',
        source_id: 'mb-1',
        status: 'open',
        description: expect.stringContaining('inspection-1'),
      }),
    });
  });

  it('does not create NC when incoming inspection passes', async () => {
    await service.handleInspectionFail({
      id: 'inspection-2',
      overall_result: 'pass',
      material_batch_id: 'mb-1',
      company_id: 'company-1',
    });

    expect(numberSequence.generateNonConformanceNo).not.toHaveBeenCalled();
    expect(prisma.nonConformance.create).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run the focused failing tests**

Run:

```bash
npm run test -w server -- non-conformance.service.spec.ts workflow-triggers.service.spec.ts --runInBand
```

Expected: FAIL because `NonConformanceService` and `WorkflowTriggersService` still construct with one dependency and still call count.

- [ ] **Step 4: Inject and use the sequence service in NonConformanceService**

Modify `server/src/modules/non-conformance/non-conformance.service.ts`:

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNcDto, DisposeNcDto } from './dto/create-nc.dto';
import { QualityNumberSequenceService } from '../quality-number-sequence/quality-number-sequence.service';

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

@Injectable()
export class NonConformanceService {
  constructor(
    private prisma: PrismaService,
    private readonly numberSequence: QualityNumberSequenceService,
  ) {}

  async create(dto: CreateNcDto, userId: string, companyId: string) {
    const nc_no = await this.numberSequence.generateNonConformanceNo(companyId);
    return this.prisma.nonConformance.create({
      data: {
        ...dto,
        company_id: companyId,
        nc_no,
        discovered_by: userId,
        discovered_at: new Date(),
      },
    });
  }

  async createFromCcpDeviation(input: CcpDeviationInput, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.prisma;
    const nc_no = await this.numberSequence.generateNonConformanceNo(input.companyId, new Date(), tx);

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

  async findAll(companyId: string, status?: string) {
    return this.prisma.nonConformance.findMany({
      where: { company_id: companyId, ...(status ? { status } : {}) },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
  }

  async dispose(id: string, dto: DisposeNcDto, userId: string, companyId: string) {
    const record = await this.prisma.nonConformance.findFirst({
      where: { id, company_id: companyId },
    });
    if (!record) throw new NotFoundException('不合格记录不存在');

    return this.prisma.nonConformance.update({
      where: { id },
      data: {
        disposition: dto.disposition,
        disposition_by: userId,
        disposition_at: new Date(),
        status: 'dispositioned',
      },
    });
  }
}
```

- [ ] **Step 5: Import the sequence module into NonConformanceModule**

Modify `server/src/modules/non-conformance/non-conformance.module.ts` so it imports `QualityNumberSequenceModule`:

```ts
import { Module } from '@nestjs/common';
import { NonConformanceController } from './non-conformance.controller';
import { NonConformanceService } from './non-conformance.service';
import { QualityNumberSequenceModule } from '../quality-number-sequence/quality-number-sequence.module';

@Module({
  imports: [QualityNumberSequenceModule],
  controllers: [NonConformanceController],
  providers: [NonConformanceService],
  exports: [NonConformanceService],
})
export class NonConformanceModule {}
```

- [ ] **Step 6: Inject and use the sequence service in WorkflowTriggersService**

Modify `server/src/modules/workflow-triggers/workflow-triggers.service.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { QualityNumberSequenceService } from '../quality-number-sequence/quality-number-sequence.service';

@Injectable()
export class WorkflowTriggersService {
  private readonly logger = new Logger(WorkflowTriggersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly numberSequence: QualityNumberSequenceService,
  ) {}

  @OnEvent('incoming-inspection.created')
  async handleInspectionFail(payload: {
    id: string;
    overall_result: string;
    material_batch_id: string;
    company_id: string;
  }) {
    if (payload.overall_result !== 'fail') return;

    try {
      const nc_no = await this.numberSequence.generateNonConformanceNo(payload.company_id);

      await this.prisma.nonConformance.create({
        data: {
          company_id: payload.company_id,
          nc_no,
          source_type: 'material_batch',
          source_id: payload.material_batch_id,
          status: 'open',
          description: `来料检验不合格，自动创建 - 检验单ID: ${payload.id}`,
          discovered_at: new Date(),
        },
      });

      this.logger.log(`[WorkflowTrigger] 来料检验不合格 → 已创建不合格品处置单 ${nc_no}，来源检验单: ${payload.id}`);
    } catch (error) {
      this.logger.error(`[WorkflowTrigger] 创建不合格品处置单失败: ${(error as Error).message}`);
    }
  }

  @OnEvent('change-event.status-changed')
  async handleChangeStatusChange(payload: {
    id: string;
    status: string;
    company_id: string;
  }) {
    if (payload.status !== 'compliance_review') return;

    try {
      await this.prisma.changeComplianceRecord.create({
        data: {
          company_id: payload.company_id,
          change_event_id: payload.id,
          legal_compliance: true,
        },
      });

      this.logger.log(`[WorkflowTrigger] 变更提交合规评估 → 已创建合规评估记录，变更单ID: ${payload.id}`);
    } catch (error) {
      this.logger.error(`[WorkflowTrigger] 创建合规评估记录失败: ${(error as Error).message}`);
    }
  }
}
```

- [ ] **Step 7: Import the sequence module into WorkflowTriggersModule**

Modify `server/src/modules/workflow-triggers/workflow-triggers.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { QualityNumberSequenceModule } from '../quality-number-sequence/quality-number-sequence.module';
import { WorkflowTriggersService } from './workflow-triggers.service';

@Module({
  imports: [QualityNumberSequenceModule],
  providers: [WorkflowTriggersService],
})
export class WorkflowTriggersModule {}
```

- [ ] **Step 8: Run the NonConformance and WorkflowTriggers tests**

Run:

```bash
npm run test -w server -- non-conformance.service.spec.ts workflow-triggers.service.spec.ts --runInBand
```

Expected: PASS.

- [ ] **Step 9: Commit NonConformance and WorkflowTriggers changes**

Run:

```bash
git add server/src/modules/non-conformance server/src/modules/workflow-triggers
git commit -m "fix: use safe nonconformance numbering"
```

Expected: commit succeeds.

## Task 4: Replace CorrectiveAction numbering

**Files:**
- Modify: `server/src/modules/corrective-action/corrective-action.module.ts`
- Modify: `server/src/modules/corrective-action/corrective-action.service.ts`
- Modify: `server/src/modules/corrective-action/corrective-action.service.spec.ts`

- [ ] **Step 1: Update the CorrectiveAction service test**

In `server/src/modules/corrective-action/corrective-action.service.spec.ts`, add:

```ts
  const numberSequence = {
    generateCorrectiveActionNo: jest.fn(),
  };
```

Update `beforeEach()`:

```ts
    service = new CorrectiveActionService(prisma as any, numberSequence as any);
```

Replace `it('scopes CAPA numbering and writes by company'...)` with:

```ts
  it('uses the shared sequence service and writes by company', async () => {
    numberSequence.generateCorrectiveActionNo.mockResolvedValue('CAPA-2026-0002');
    prisma.correctiveAction.create.mockResolvedValue({ id: 'c1' });

    await service.create({ trigger_type: 'non_conformance', description: '整改' }, 'u1', '2');

    expect(prisma.correctiveAction.count).not.toHaveBeenCalled();
    expect(numberSequence.generateCorrectiveActionNo).toHaveBeenCalledWith('2');
    expect(prisma.correctiveAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          company_id: '2',
          capa_no: 'CAPA-2026-0002',
        }),
      }),
    );
  });
```

- [ ] **Step 2: Run the focused failing test**

Run:

```bash
npm run test -w server -- corrective-action.service.spec.ts --runInBand
```

Expected: FAIL because `CorrectiveActionService` still constructs with one dependency and still calls count.

- [ ] **Step 3: Inject and use the sequence service**

Modify `server/src/modules/corrective-action/corrective-action.service.ts`:

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCapaDto } from './dto/create-capa.dto';
import { QualityNumberSequenceService } from '../quality-number-sequence/quality-number-sequence.service';

@Injectable()
export class CorrectiveActionService {
  constructor(
    private prisma: PrismaService,
    private readonly numberSequence: QualityNumberSequenceService,
  ) {}

  async create(dto: CreateCapaDto, userId: string, companyId: string) {
    const capa_no = await this.numberSequence.generateCorrectiveActionNo(companyId);
    return this.prisma.correctiveAction.create({
      data: { ...dto, company_id: companyId, capa_no },
    });
  }

  async findAll(companyId: string, status?: string) {
    return this.prisma.correctiveAction.findMany({
      where: { company_id: companyId, ...(status ? { status } : {}) },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
  }

  async findById(id: string, companyId: string) {
    const capa = await this.prisma.correctiveAction.findFirst({ where: { id, company_id: companyId } });
    if (!capa) throw new NotFoundException('纠正措施不存在');
    return capa;
  }

  async updateStatus(id: string, status: string, companyId: string) {
    await this.findById(id, companyId);
    return this.prisma.correctiveAction.update({
      where: { id },
      data: { status },
    });
  }

  async close(id: string, verifiedBy: string, companyId: string) {
    await this.findById(id, companyId);
    return this.prisma.correctiveAction.update({
      where: { id },
      data: {
        status: 'closed',
        verified_by: verifiedBy,
        verified_at: new Date(),
        closed_at: new Date(),
      },
    });
  }
}
```

- [ ] **Step 4: Import the sequence module**

Modify `server/src/modules/corrective-action/corrective-action.module.ts` to import `QualityNumberSequenceModule`. Keep all existing imports and providers, then add the new module to `imports`.

Use this import:

```ts
import { QualityNumberSequenceModule } from '../quality-number-sequence/quality-number-sequence.module';
```

Expected: `CorrectiveActionService` can resolve `QualityNumberSequenceService` through Nest DI.

- [ ] **Step 5: Run the CorrectiveAction test**

Run:

```bash
npm run test -w server -- corrective-action.service.spec.ts --runInBand
```

Expected: PASS.

- [ ] **Step 6: Commit CorrectiveAction change**

Run:

```bash
git add server/src/modules/corrective-action
git commit -m "fix: use safe corrective action numbering"
```

Expected: commit succeeds.

## Task 5: Verify integrated behavior

**Files:**
- Read only unless tests expose a mismatch.

- [ ] **Step 1: Run focused tests together**

Run:

```bash
npm run test -w server -- non-conformance.service.spec.ts corrective-action.service.spec.ts quality-number-sequence.service.spec.ts workflow-triggers.service.spec.ts --runInBand
```

Expected: PASS.

- [ ] **Step 2: Validate Prisma schema**

Run:

```bash
npx prisma validate --schema=server/src/prisma/schema.prisma
```

Expected: Prisma reports the schema is valid.

- [ ] **Step 3: Build server**

Run:

```bash
npm run build:server
```

Expected: build succeeds.

- [ ] **Step 4: Search for old numbering pattern**

Run:

```bash
rg -n "nonConformance\\.count|correctiveAction\\.count|NC-AUTO|count\\(\\).*nc_no|count\\(\\).*capa_no" server/src/modules/non-conformance server/src/modules/corrective-action server/src/modules/workflow-triggers
```

Expected: no `count()+1` numbering remains in `NonConformanceService.create()`, `NonConformanceService.createFromCcpDeviation()`, `WorkflowTriggersService.handleInspectionFail()`, or `CorrectiveActionService.create()`. Analytics or unrelated count usage is acceptable only if it is not used to generate `nc_no` or `capa_no`.

- [ ] **Step 5: Commit any verification fixes**

If verification required small fixes, run:

```bash
git add server/src/prisma/schema.prisma server/src/prisma/migrations server/src/modules/quality-number-sequence server/src/modules/non-conformance server/src/modules/workflow-triggers server/src/modules/corrective-action
git commit -m "test: verify safe quality numbering"
```

Expected: commit succeeds if there were fixes; if there were no fixes, skip this step.

## Final Acceptance

- `NonConformanceService.create()` uses `QualityNumberSequenceService.generateNonConformanceNo(companyId)`.
- `NonConformanceService.createFromCcpDeviation()` uses `QualityNumberSequenceService.generateNonConformanceNo(companyId, now, tx)` and keeps CCP deviation automatic NC creation.
- `WorkflowTriggersService.handleInspectionFail()` uses `QualityNumberSequenceService.generateNonConformanceNo(companyId)` and keeps incoming-inspection failure automatic NC creation.
- `CorrectiveActionService.create()` uses `QualityNumberSequenceService.generateCorrectiveActionNo(companyId)`.
- `business_number_sequences` has a unique key on `company_id + scope + period`.
- Current-year historical max number initializes a missing sequence.
- NC and CAPA numbering remain company-scoped and year-scoped.
- No `NC-AUTO-*` parallel sequence remains in workflow-trigger-created NC records.
- Focused Jest tests pass.
- `npm run build:server` passes.
- `npx prisma validate --schema=server/src/prisma/schema.prisma` passes.
