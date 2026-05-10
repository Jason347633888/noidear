# GAP-308 TraceabilitySnapshot 持久化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Execution must happen in an 独立 worktree or Multica 隔离工作目录, never in the main checkout.

**Goal:** 让 `/traceability/export` 与 `/traceability/snapshots` 使用现有 `TraceabilitySnapshot` 表真实持久化，并让 snapshot 读取接口从数据库返回合同形状结果。

**Architecture:** 复用 GAP-306 已注册的 `TraceabilityExportService` 作为导出和 snapshot 持久化边界；`TraceabilityService` 只委托该服务，不重写 GAP-307 的完整追溯查询链。使用现有 `TraceabilitySnapshot.summary Json` 保存 retention、payload、meta，不改 Prisma schema。

**Tech Stack:** NestJS, Prisma, Jest, TypeScript, shared traceability contract fields from `packages/types/traceability.ts`。

---

## Superpower 与 grill-me 校准记录

- 已使用 `brainstorming` 形成 spec：`docs/superpowers/specs/2026-05-01-gap-308-traceability-snapshot-persistence-design.md`。
- 已使用 `grill-with-docs` 对齐 `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`：本 GAP 不改变 `ProductionBatch / MaterialBatch / BatchMaterialUsage / InventoryMovement` 主链，只保存追溯查询和导出证据快照。
- 已按 `grill-me` 等价校准清单核对：不重复造主数据、不引入平行批次链路、不需要 schema migration、不需要用户业务确认、可作为独立小 PR 执行。
- 已使用 `writing-plans` 写本执行计划。
- 执行 agent 只能使用 `superpowers:executing-plans`；禁止使用其他实现流程扩展范围。

## Worktree 隔离要求

执行前必须运行：

```bash
git worktree list --porcelain
pwd
git branch --show-current
git status --short --branch
```

如果 `pwd` 是 `/Users/jiashenglin/Desktop/好玩的项目/noidear`，必须停止并回报，不得修改、提交或 push。

推荐从最新 `origin/master` 创建分支：

```bash
git fetch origin master
git switch -c codex/gap-308-traceability-snapshot-persistence origin/master
```

## 停止条件

- 如果 `TraceabilitySnapshot` schema 字段与本 plan 不一致，停止并回报，不要自行添加 migration。
- 如果 GAP-307 已经修改了 `TraceabilityService.query` 或 snapshot payload 结构，停止并回报冲突，不要重写完整查询链。
- 如果需要新增真实文件下载、对象存储、导出下载 endpoint，停止并回报；这不属于 GAP-308。
- 如果任何步骤要求修改 `ProductionBatch`、`MaterialBatch`、`BatchMaterialUsage`、`InventoryMovement`、投诉或召回模型，停止并回报。
- 如果测试失败来自既有 GAP-307 查询链缺口，只报告失败，不要在本 PR 中实现查询算法。

## Files

- Modify: `server/src/modules/traceability/traceability-export.service.ts`
- Modify: `server/src/modules/traceability/traceability-export.service.spec.ts`
- Modify: `server/src/modules/traceability/traceability.service.ts`
- Create: `server/src/modules/traceability/traceability.service.spec.ts`
- Read-only reference: `packages/types/traceability.ts`
- Read-only reference: `server/src/prisma/schema.prisma`

## Task 1: 写 TraceabilityExportService 持久化失败测试

**Files:**

- Modify: `server/src/modules/traceability/traceability-export.service.spec.ts`

- [ ] **Step 1: Replace `traceability-export.service.spec.ts` with contract-focused tests**

```ts
import { ConflictException, NotFoundException } from '@nestjs/common';
import { TraceabilityExportService } from './traceability-export.service';

const createPrisma = () => ({
  traceabilitySnapshot: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
});

const snapshotRow = {
  id: 'snap-1',
  sourceQueryHash: 'hash-001',
  exportMode: 'simple',
  requesterId: 'user-1',
  status: 'ready',
  snapshotType: 'export',
  summary: {
    sourceQueryRef: 'hash-001',
    snapshotType: 'export',
    exportMode: 'simple',
    retention: { retentionPolicy: 'audit-default', expiresAt: null },
    payloadRef: 'hash-001',
    resultSummary: { sourceQueryRef: 'hash-001' },
    resultPayload: {
      summary: {
        queryId: 'q-1',
        entryMode: 'object',
        objectType: 'materialLot',
        objectId: 'batch-1',
        traceMode: 'forward',
        viewMode: 'ledger',
        timeMode: 'current',
        riskLevel: 'normal',
        resultStatus: 'ok',
      },
      permission: {},
      risk: { items: [] },
      ledger: { rows: [] },
      graph: { nodes: [], edges: [] },
      evidence: { items: [] },
      actions: { available: [] },
      export: {},
      meta: { queryHash: 'hash-001' },
      extensions: {},
    },
  },
  filePath: null,
  createdAt: new Date('2026-05-01T00:00:00.000Z'),
  updatedAt: new Date('2026-05-01T00:00:00.000Z'),
};

describe('TraceabilityExportService', () => {
  it('persists simple exports and returns TraceExportResult with snapshotId', async () => {
    const prisma = createPrisma();
    prisma.traceabilitySnapshot.create.mockResolvedValue(snapshotRow);
    const service = new TraceabilityExportService(prisma as any);

    const result = await service.create(
      { exportMode: 'simple', sourceQueryRef: 'hash-001', includeEvidence: true },
      { id: 'user-1' } as any,
    );

    expect(prisma.traceabilitySnapshot.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sourceQueryHash: 'hash-001',
        exportMode: 'simple',
        requesterId: 'user-1',
        status: 'ready',
        snapshotType: 'export',
        summary: expect.objectContaining({
          sourceQueryRef: 'hash-001',
          snapshotType: 'export',
          exportMode: 'simple',
        }),
      }),
    });
    expect(result).toMatchObject({
      exportId: 'snap-1',
      exportMode: 'simple',
      status: 'ready',
      sourceQueryRef: 'hash-001',
      requestedBy: 'user-1',
      snapshotId: 'snap-1',
      downloadRef: null,
    });
  });

  it('persists fullPackage exports as queued and returns TraceExportResult', async () => {
    const prisma = createPrisma();
    prisma.traceabilitySnapshot.create.mockResolvedValue({
      ...snapshotRow,
      id: 'snap-2',
      exportMode: 'fullPackage',
      status: 'queued',
      summary: { ...snapshotRow.summary, exportMode: 'fullPackage' },
    });
    const service = new TraceabilityExportService(prisma as any);

    const result = await service.create(
      { exportMode: 'fullPackage', sourceQueryRef: 'hash-002' },
      { id: 'user-2' } as any,
    );

    expect(prisma.traceabilitySnapshot.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sourceQueryHash: 'hash-002',
        exportMode: 'fullPackage',
        requesterId: 'user-2',
        status: 'queued',
        snapshotType: 'export',
      }),
    });
    expect(result).toMatchObject({
      exportId: 'snap-2',
      exportMode: 'fullPackage',
      status: 'queued',
      sourceQueryRef: 'hash-002',
      requestedBy: 'user-2',
      snapshotId: 'snap-2',
    });
  });

  it('creates query snapshots and maps database row to TraceSnapshotResult', async () => {
    const prisma = createPrisma();
    prisma.traceabilitySnapshot.create.mockResolvedValue({
      ...snapshotRow,
      id: 'snap-query',
      exportMode: 'snapshot',
      snapshotType: 'query',
      summary: { ...snapshotRow.summary, snapshotType: 'query', exportMode: 'snapshot' },
    });
    const service = new TraceabilityExportService(prisma as any);

    const result = await service.createSnapshot(
      { sourceQueryRef: 'hash-003', snapshotType: 'query', retentionPolicy: 'audit-default' },
      { id: 'user-3' } as any,
    );

    expect(result).toMatchObject({
      snapshotId: 'snap-query',
      sourceQueryRef: 'hash-003',
      snapshotType: 'query',
      status: 'ready',
      payloadRef: 'hash-003',
      expiresAt: null,
    });
  });

  it('reads snapshots from database', async () => {
    const prisma = createPrisma();
    prisma.traceabilitySnapshot.findUnique.mockResolvedValue(snapshotRow);
    const service = new TraceabilityExportService(prisma as any);

    const result = await service.getSnapshot('snap-1');

    expect(prisma.traceabilitySnapshot.findUnique).toHaveBeenCalledWith({ where: { id: 'snap-1' } });
    expect(result).toMatchObject({
      snapshotId: 'snap-1',
      sourceQueryRef: 'hash-001',
      snapshotType: 'export',
      status: 'ready',
    });
  });

  it('throws NotFoundException for missing snapshots', async () => {
    const prisma = createPrisma();
    prisma.traceabilitySnapshot.findUnique.mockResolvedValue(null);
    const service = new TraceabilityExportService(prisma as any);

    await expect(service.getSnapshot('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns persisted formal result payload for snapshot result', async () => {
    const prisma = createPrisma();
    prisma.traceabilitySnapshot.findUnique.mockResolvedValue(snapshotRow);
    const service = new TraceabilityExportService(prisma as any);

    const result = await service.getSnapshotResult('snap-1') as any;

    expect(result.summary.queryId).toBe('q-1');
    expect(result.meta.queryHash).toBe('hash-001');
  });

  it('throws ConflictException when snapshot has no formal result payload', async () => {
    const prisma = createPrisma();
    prisma.traceabilitySnapshot.findUnique.mockResolvedValue({
      ...snapshotRow,
      summary: { sourceQueryRef: 'hash-001', snapshotType: 'export' },
    });
    const service = new TraceabilityExportService(prisma as any);

    await expect(service.getSnapshotResult('snap-1')).rejects.toBeInstanceOf(ConflictException);
  });
});
```

- [ ] **Step 2: Run the focused test and confirm it fails before implementation**

```bash
npm --prefix server test -- traceability-export.service --runInBand
```

Expected: FAIL because `createSnapshot`, `getSnapshot`, `getSnapshotResult`, and contract-shaped export results are not implemented.

## Task 2: 实现 TraceabilityExportService 持久化和映射

**Files:**

- Modify: `server/src/modules/traceability/traceability-export.service.ts`

- [ ] **Step 1: Replace `traceability-export.service.ts` with the persistence boundary**

```ts
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTraceabilityExportDto } from './dto/create-traceability-export.dto';
import { CreateTraceabilitySnapshotDto } from './dto/create-traceability-snapshot.dto';

type TraceCurrentUser = {
  id?: string;
};

type TraceabilitySnapshotRow = {
  id: string;
  sourceQueryHash: string;
  exportMode: string;
  requesterId: string;
  status: string;
  snapshotType: string;
  summary: unknown;
  filePath: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type SnapshotSummary = {
  sourceQueryRef?: string;
  snapshotType?: 'query' | 'balance' | 'export';
  exportMode?: 'simple' | 'fullPackage' | 'snapshot';
  retention?: {
    retentionPolicy?: string;
    expiresAt?: string | null;
  };
  payloadRef?: string | null;
  resultSummary?: Record<string, unknown>;
  resultPayload?: Record<string, unknown>;
  createdBy?: string;
  meta?: Record<string, unknown>;
};

const asSummary = (summary: unknown): SnapshotSummary =>
  summary && typeof summary === 'object' && !Array.isArray(summary) ? (summary as SnapshotSummary) : {};

@Injectable()
export class TraceabilityExportService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTraceabilityExportDto, currentUser: TraceCurrentUser) {
    const status = dto.exportMode === 'simple' ? 'ready' : 'queued';
    const row = await this.persistSnapshot({
      sourceQueryRef: dto.sourceQueryRef,
      snapshotType: 'export',
      exportMode: dto.exportMode,
      status,
      currentUser,
      retentionPolicy: 'audit-default',
      resultSummary: {
        sourceQueryRef: dto.sourceQueryRef,
        exportMode: dto.exportMode,
        includeEvidence: dto.includeEvidence ?? false,
        includeMaskedData: dto.includeMaskedData ?? false,
      },
    });

    return {
      exportId: row.id,
      exportMode: dto.exportMode,
      status,
      sourceQueryRef: row.sourceQueryHash,
      createdAt: row.createdAt.toISOString(),
      requestedBy: row.requesterId,
      downloadRef: row.filePath,
      snapshotId: row.id,
      meta: {
        snapshotType: row.snapshotType,
      },
    };
  }

  async createSnapshot(dto: CreateTraceabilitySnapshotDto, currentUser: TraceCurrentUser) {
    const row = await this.persistSnapshot({
      sourceQueryRef: dto.sourceQueryRef,
      snapshotType: dto.snapshotType,
      exportMode: 'snapshot',
      status: 'ready',
      currentUser,
      retentionPolicy: dto.retentionPolicy ?? 'audit-default',
      resultSummary: {
        sourceQueryRef: dto.sourceQueryRef,
        snapshotType: dto.snapshotType,
      },
    });

    return this.mapSnapshot(row);
  }

  async getSnapshot(snapshotId: string) {
    const row = await this.findSnapshot(snapshotId);
    return this.mapSnapshot(row);
  }

  async getSnapshotResult(snapshotId: string) {
    const row = await this.findSnapshot(snapshotId);
    const summary = asSummary(row.summary);

    if (!summary.resultPayload) {
      throw new ConflictException(`Traceability snapshot ${snapshotId} does not contain a replayable result payload`);
    }

    return summary.resultPayload;
  }

  private async findSnapshot(snapshotId: string): Promise<TraceabilitySnapshotRow> {
    const row = await this.prisma.traceabilitySnapshot.findUnique({ where: { id: snapshotId } });

    if (!row) {
      throw new NotFoundException(`Traceability snapshot ${snapshotId} not found`);
    }

    return row as TraceabilitySnapshotRow;
  }

  private async persistSnapshot(input: {
    sourceQueryRef: string;
    snapshotType: 'query' | 'balance' | 'export';
    exportMode: 'simple' | 'fullPackage' | 'snapshot';
    status: 'ready' | 'queued';
    currentUser: TraceCurrentUser;
    retentionPolicy: string;
    resultSummary: Record<string, unknown>;
    resultPayload?: Record<string, unknown>;
  }): Promise<TraceabilitySnapshotRow> {
    const requesterId = input.currentUser?.id ?? 'system';
    const summary: SnapshotSummary = {
      sourceQueryRef: input.sourceQueryRef,
      snapshotType: input.snapshotType,
      exportMode: input.exportMode,
      retention: {
        retentionPolicy: input.retentionPolicy,
        expiresAt: null,
      },
      payloadRef: input.sourceQueryRef,
      resultSummary: input.resultSummary,
      resultPayload: input.resultPayload,
      createdBy: requesterId,
      meta: {
        createdByGap: 'GAP-308',
      },
    };

    return this.prisma.traceabilitySnapshot.create({
      data: {
        sourceQueryHash: input.sourceQueryRef,
        exportMode: input.exportMode,
        requesterId,
        status: input.status,
        snapshotType: input.snapshotType,
        summary,
      },
    }) as Promise<TraceabilitySnapshotRow>;
  }

  private mapSnapshot(row: TraceabilitySnapshotRow) {
    const summary = asSummary(row.summary);
    const snapshotType = summary.snapshotType ?? (row.snapshotType as 'query' | 'balance' | 'export');

    return {
      snapshotId: row.id,
      sourceQueryRef: summary.sourceQueryRef ?? row.sourceQueryHash,
      snapshotType,
      status: row.status as 'queued' | 'building' | 'ready' | 'failed' | 'expired',
      createdAt: row.createdAt.toISOString(),
      expiresAt: summary.retention?.expiresAt ?? null,
      payloadRef: summary.payloadRef ?? row.sourceQueryHash,
      meta: {
        exportMode: summary.exportMode ?? row.exportMode,
        retentionPolicy: summary.retention?.retentionPolicy ?? null,
        filePath: row.filePath,
        legacyShape: !summary.sourceQueryRef,
        ...(summary.meta ?? {}),
      },
    };
  }
}
```

- [ ] **Step 2: Run the focused export service test**

```bash
npm --prefix server test -- traceability-export.service --runInBand
```

Expected: PASS.

## Task 3: 委托 TraceabilityService 的 export 和 snapshot 路径

**Files:**

- Modify: `server/src/modules/traceability/traceability.service.ts`
- Create: `server/src/modules/traceability/traceability.service.spec.ts`

- [ ] **Step 1: Create `traceability.service.spec.ts` for delegation**

```ts
import { TraceabilityService } from './traceability.service';

describe('TraceabilityService snapshot/export delegation', () => {
  const prisma = {};

  it('delegates export creation to TraceabilityExportService', async () => {
    const exportService = {
      create: jest.fn().mockResolvedValue({ exportId: 'snap-1', snapshotId: 'snap-1' }),
    };
    const service = new TraceabilityService(prisma as any, exportService as any);

    await expect(
      service.createExport({ exportMode: 'simple', sourceQueryRef: 'hash-001' }, { id: 'user-1' }),
    ).resolves.toMatchObject({ snapshotId: 'snap-1' });
    expect(exportService.create).toHaveBeenCalledWith(
      { exportMode: 'simple', sourceQueryRef: 'hash-001' },
      { id: 'user-1' },
    );
  });

  it('delegates snapshot creation and reads to TraceabilityExportService', async () => {
    const exportService = {
      createSnapshot: jest.fn().mockResolvedValue({ snapshotId: 'snap-2' }),
      getSnapshot: jest.fn().mockResolvedValue({ snapshotId: 'snap-2' }),
      getSnapshotResult: jest.fn().mockResolvedValue({ summary: { queryId: 'q-1' } }),
    };
    const service = new TraceabilityService(prisma as any, exportService as any);

    await expect(
      service.createSnapshot({ sourceQueryRef: 'hash-002', snapshotType: 'query' }, { id: 'user-2' }),
    ).resolves.toMatchObject({ snapshotId: 'snap-2' });
    await expect(service.getSnapshot('snap-2')).resolves.toMatchObject({ snapshotId: 'snap-2' });
    await expect(service.getSnapshotResult('snap-2')).resolves.toMatchObject({ summary: { queryId: 'q-1' } });
  });
});
```

- [ ] **Step 2: Run the new service test and confirm it fails before delegation**

```bash
npm --prefix server test -- traceability.service --runInBand
```

Expected: FAIL because `TraceabilityService` constructor does not accept `TraceabilityExportService` and methods still return memory objects.

- [ ] **Step 3: Modify imports and constructor in `traceability.service.ts`**

Add this import:

```ts
import { TraceabilityExportService } from './traceability-export.service';
```

Replace the constructor:

```ts
constructor(
  private readonly prisma: PrismaService,
  private readonly exportService: TraceabilityExportService,
) {}
```

- [ ] **Step 4: Replace the four memory methods with delegation**

```ts
async createExport(dto: TraceExportDto, currentUser: TraceCurrentUser) {
  return this.exportService.create(dto, currentUser);
}

async createSnapshot(dto: TraceSnapshotDto, currentUser: TraceCurrentUser) {
  return this.exportService.createSnapshot(dto, currentUser);
}

async getSnapshot(snapshotId: string) {
  return this.exportService.getSnapshot(snapshotId);
}

async getSnapshotResult(snapshotId: string) {
  return this.exportService.getSnapshotResult(snapshotId);
}
```

Do not change `query`, `balance`, `createAction`, `buildEmptyResult`, or `mapForwardTraceResult`.

- [ ] **Step 5: Run service and export tests**

```bash
npm --prefix server test -- traceability.service traceability-export.service --runInBand
```

Expected: PASS.

## Task 4: 运行追溯模块回归验证

**Files:**

- No additional files.

- [ ] **Step 1: Run all traceability focused tests**

```bash
npm --prefix server test -- traceability --runInBand
```

Expected: PASS. If failures mention full-chain query support, productionBatch backward trace, deliveryNote query, or GAP-307 query behavior, stop and report as dependency conflict.

- [ ] **Step 2: Run TypeScript or server test command used by the repo if available**

```bash
npm --prefix server test -- --runInBand
```

Expected: PASS or unrelated existing failures documented with exact failing suite names.

- [ ] **Step 3: Check for forbidden field names in client and DTO contracts**

```bash
rg -n "sourceQueryHash" client/src packages/types server/src/modules/traceability/dto
```

Expected: no `sourceQueryHash` in client or shared contract; schema/service persistence internals may still use `sourceQueryHash`.

- [ ] **Step 4: Check diff hygiene**

```bash
git diff -- server/src/modules/traceability/traceability-export.service.ts server/src/modules/traceability/traceability-export.service.spec.ts server/src/modules/traceability/traceability.service.ts server/src/modules/traceability/traceability.service.spec.ts
git diff --check
```

Expected: only GAP-308 service and test files changed; no schema, migration, page, complaint, recall, or batch-chain files changed.

## Task 5: Commit and PR

**Files:**

- Commit only implementation files from this plan.

- [ ] **Step 1: Review changed files**

```bash
git status --short
```

Expected changed files:

```text
M server/src/modules/traceability/traceability-export.service.ts
M server/src/modules/traceability/traceability-export.service.spec.ts
M server/src/modules/traceability/traceability.service.ts
A server/src/modules/traceability/traceability.service.spec.ts
```

- [ ] **Step 2: Commit**

```bash
git add server/src/modules/traceability/traceability-export.service.ts server/src/modules/traceability/traceability-export.service.spec.ts server/src/modules/traceability/traceability.service.ts server/src/modules/traceability/traceability.service.spec.ts
git commit -m "fix: persist traceability snapshots"
```

- [ ] **Step 3: Push**

```bash
git push -u origin codex/gap-308-traceability-snapshot-persistence
```

- [ ] **Step 4: Open PR**

PR title:

```text
fix: persist traceability snapshots
```

PR body must include:

```markdown
## Summary
- Persist `/traceability/export` and `/traceability/snapshots` through existing `TraceabilitySnapshot`.
- Return contract-shaped `TraceExportResult` and `TraceSnapshotResult`.
- Delegate snapshot/export persistence through `TraceabilityExportService`.

## GAP
- GAP-308

## Plan
- docs/superpowers/plans/2026-05-01-gap-308-traceability-snapshot-persistence-implementation.md

## Not Included
- No schema or migration changes.
- No GAP-307 full-chain trace query implementation.
- No ProductRecall, CustomerComplaint, CAPA, or batch-chain model changes.

## Verification
- `npm --prefix server test -- traceability-export.service --runInBand`
- `npm --prefix server test -- traceability.service traceability-export.service --runInBand`
- `npm --prefix server test -- traceability --runInBand`
- `git diff --check`
```
