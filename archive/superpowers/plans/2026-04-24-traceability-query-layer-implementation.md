# Traceability Query Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current minimal traceability pages and endpoints with the frozen traceability query layer: object-centered queries, scenario workbench flows, material balance analysis, graded linkage, export tasks, and permission-aware current/as-of results.

**Architecture:** This spec spans three independent but contract-coupled tracks: backend query orchestration, frontend query/workbench UI, and governance actions/export/async execution. To keep execution shippable, this plan keeps them in one file but isolates them into separate task groups that can be delegated independently after the shared backend result contract is frozen. The implementation extends the existing `traceability` module, reuses the existing `model-landing` metadata module as read-only configuration input, and upgrades the existing `/traceability` page instead of introducing a parallel product surface.

**Tech Stack:** NestJS, Prisma, Jest, Vue 3, Element Plus, Vitest, ECharts, existing `model-landing` generated artifact, existing `traceability` and `batch-trace` modules

---

## Scope Check

The traceability query layer touches backend, frontend, and governance workflows. These are independent execution tracks once the shared API contract is fixed.

Recommended execution split after Task 1 is complete:

1. Backend track: Tasks 2-3
2. Frontend track: Task 4
3. Governance/integration track: Task 5

Do **not** start Tasks 2-5 in parallel until Task 1 is merged in the working branch, because all later work depends on the same DTO and result-contract names.

## File Structure

### New files

- `server/src/modules/traceability/dto/query-traceability.dto.ts`
  - Validated DTO for object-centered and scenario-centered trace queries.
- `server/src/modules/traceability/dto/query-material-balance.dto.ts`
  - Validated DTO for material balance requests.
- `server/src/modules/traceability/dto/create-traceability-linkage.dto.ts`
  - Validated DTO for graded linkage requests.
- `server/src/modules/traceability/dto/create-traceability-export.dto.ts`
  - Validated DTO for simple export and full package export requests.
- `server/src/modules/traceability/traceability.types.ts`
  - Canonical server-side result contract for summaries, nodes, edges, risk flags, balance rows, export snapshots, and linkage payloads.
- `server/src/modules/traceability/traceability-query.service.ts`
  - Builds permission-trimmed object/scenario query results for ledger and graph views.
- `server/src/modules/traceability/traceability-balance.service.ts`
  - Computes unified material-balance analysis and anomaly grading.
- `server/src/modules/traceability/traceability-linkage.service.ts`
  - Creates follow-up workflow payloads and writeback metadata from query results.
- `server/src/modules/traceability/traceability-export.service.ts`
  - Generates simple export payloads, creates async snapshot tasks for full packages, and reuses existing export infrastructure where possible.
- `server/src/modules/traceability/traceability-query.service.spec.ts`
- `server/src/modules/traceability/traceability-balance.service.spec.ts`
- `server/src/modules/traceability/traceability-linkage.service.spec.ts`
- `server/src/modules/traceability/traceability-export.service.spec.ts`
  - Unit coverage for the new services.
- `server/test/traceability-query.e2e-spec.ts`
  - End-to-end checks for the new `/traceability/query`, `/traceability/balance`, `/traceability/actions`, and `/traceability/export` endpoints.
- `client/src/types/traceability.ts`
  - Frontend result, view, filter, and action types matching the backend contract.
- `client/src/views/traceability/components/ObjectTraceQueryPanel.vue`
  - Object-centered entry form.
- `client/src/views/traceability/components/ScenarioWorkbenchPanel.vue`
  - Scenario-centered entry form and scenario presets.
- `client/src/views/traceability/components/TraceLedgerView.vue`
  - Ledger view renderer.
- `client/src/views/traceability/components/TraceGraphView.vue`
  - Graph view renderer over the same result model.
- `client/src/views/traceability/components/TraceRiskPanel.vue`
  - Risk summary, linkage actions, and export entry area.
- `client/src/views/traceability/__tests__/TraceabilityQuery.spec.ts`
  - Frontend tests for object/scenario switching, ledger/graph switching, and action availability.
- `client/src/api/__tests__/traceability.spec.ts`
  - API adapter tests for the upgraded traceability client.

### Modified files

- `server/src/modules/traceability/traceability.controller.ts`
  - Replace the current three-path controller with contract-based query, balance, linkage, and export endpoints while keeping old paths as compatibility wrappers only if still needed by `batch-trace`.
- `server/src/modules/traceability/traceability.service.ts`
  - Reduce this file to compatibility wrappers or remove old logic once new services take over.
- `server/src/modules/traceability/traceability.module.ts`
  - Register new services and DTO-driven controller methods.
- `server/src/app.module.ts`
  - No semantic change expected if the existing module stays mounted; update only if additional providers are split into submodules.
- `server/src/prisma/schema.prisma`
  - Add trace query snapshot / export task persistence only if existing export tables cannot safely represent async traceability packages.
- `server/package.json`
  - Add traceability-specific verification scripts.
- `client/src/api/traceability.ts`
  - Replace ad-hoc forward/backward/balance wrappers with a unified query client.
- `client/src/views/traceability/TraceabilityQuery.vue`
  - Convert the page into the spec-compliant object/scenario shell.
- `client/src/router/index.ts`
  - Add a scenario workbench child route or aliases if required.
- `docs/AGENT_GUIDE.md`
  - Add one short note telling later agents which spec and API contract files are authoritative for traceability implementation.

### Existing files to read before coding

- `/Users/jiashenglin/Desktop/好玩的项目/noidear/AGENTS.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/AGENT_GUIDE.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/2026-04-24-model-landing-layer-design.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/2026-04-24-model-landing-layer-form-expansion.csv`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/2026-04-24-traceability-query-layer-design.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/model-landing/model-landing.service.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/traceability/traceability.controller.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/traceability/traceability.service.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/warehouse/material-balance.service.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/api/traceability.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/views/traceability/TraceabilityQuery.vue`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/views/batch-trace/TraceQuery.vue`

---

### Task 1: Freeze The Shared Query Contract

**Files:**
- Create: `server/src/modules/traceability/dto/query-traceability.dto.ts`
- Create: `server/src/modules/traceability/dto/query-material-balance.dto.ts`
- Create: `server/src/modules/traceability/dto/create-traceability-linkage.dto.ts`
- Create: `server/src/modules/traceability/dto/create-traceability-export.dto.ts`
- Create: `server/src/modules/traceability/traceability.types.ts`
- Create: `server/src/modules/traceability/traceability-query.service.spec.ts`
- Create: `client/src/types/traceability.ts`
- Modify: `client/src/api/traceability.ts`

- [ ] **Step 1: Write the failing backend contract test**

```ts
import { TraceabilityQueryService } from './traceability-query.service';

describe('TraceabilityQueryService contract', () => {
  it('builds a ledger-and-graph result with stable top-level keys', async () => {
    const prisma = {
      materialBatch: { findFirst: jest.fn().mockResolvedValue({ id: 'mb-1', batch_no: 'RM-001' }) },
    };
    const modelLanding = { getSummary: jest.fn().mockReturnValue({ totalForms: 283, totalGroups: 59 }) };
    const service = new TraceabilityQueryService(prisma as any, modelLanding as any);

    await expect(
      service.query({
        entryMode: 'object',
        objectType: 'materialLot',
        objectId: 'mb-1',
        traceMode: 'forward',
        viewMode: 'ledger',
        timeMode: 'current',
      }, { department: '品质', scenarioPermissions: ['forwardTrace'] } as any),
    ).resolves.toMatchObject({
      summary: expect.objectContaining({ objectType: 'materialLot', traceMode: 'forward', timeMode: 'current' }),
      ledger: expect.any(Array),
      graph: expect.objectContaining({ nodes: expect.any(Array), edges: expect.any(Array) }),
      risks: expect.any(Array),
      evidence: expect.any(Array),
      permission: expect.any(Object),
    });
  });
});
```

- [ ] **Step 2: Run the backend contract test to confirm failure**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npm test -- traceability-query.service.spec.ts --runInBand
```

Expected: FAIL with `Cannot find module './traceability-query.service'` or missing type errors.

- [ ] **Step 3: Write the canonical server-side types**

```ts
export type TraceEntryMode = 'object' | 'scenario';
export type TraceMode = 'forward' | 'backward' | 'bidirectional';
export type TraceViewMode = 'ledger' | 'graph';
export type TraceTimeMode = 'current' | 'asOf';
export type TraceRiskLevel = 'normal' | 'minor' | 'important' | 'high';

export interface TraceSummary {
  entryMode: TraceEntryMode;
  objectType?: string;
  objectId?: string;
  scenario?: string;
  traceMode: TraceMode;
  viewMode: TraceViewMode;
  timeMode: TraceTimeMode;
  asOfAt?: string;
}

export interface TraceLedgerRow {
  nodeType: string;
  nodeId: string;
  label: string;
  batchNo?: string;
  status?: string;
  riskLevel?: TraceRiskLevel;
  upstreamNodeId?: string;
  downstreamNodeId?: string;
}

export interface TraceGraphNode {
  id: string;
  type: string;
  label: string;
  riskLevel?: TraceRiskLevel;
}

export interface TraceGraphEdge {
  id: string;
  source: string;
  target: string;
  relation: string;
}

export interface TraceEvidenceRef {
  type: 'record' | 'attachment' | 'document';
  label: string;
  refId: string;
}

export interface TracePermissionView {
  canViewSummary: boolean;
  canViewDetail: boolean;
  canInitiateAction: boolean;
  canExecuteHighRiskAction: boolean;
}

export interface TraceQueryResult {
  summary: TraceSummary;
  ledger: TraceLedgerRow[];
  graph: { nodes: TraceGraphNode[]; edges: TraceGraphEdge[] };
  risks: Array<{ code: string; level: TraceRiskLevel; message: string }>;
  evidence: TraceEvidenceRef[];
  permission: TracePermissionView;
}

export interface MaterialBalanceRow {
  materialId: string;
  materialName: string;
  inputQty: number;
  outputQty: number;
  lossQty: number;
  diffQty: number;
  riskLevel: TraceRiskLevel;
}
```

- [ ] **Step 4: Write the DTOs**

```ts
import { IsDateString, IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { TraceEntryMode, TraceMode, TraceViewMode, TraceTimeMode } from '../traceability.types';

export class QueryTraceabilityDto {
  @IsEnum(['object', 'scenario'] as const)
  entryMode!: TraceEntryMode;

  @IsOptional()
  @IsString()
  objectType?: string;

  @IsOptional()
  @IsString()
  objectId?: string;

  @IsOptional()
  @IsString()
  scenario?: string;

  @IsIn(['forward', 'backward', 'bidirectional'])
  traceMode!: TraceMode;

  @IsIn(['ledger', 'graph'])
  viewMode!: TraceViewMode;

  @IsIn(['current', 'asOf'])
  timeMode!: TraceTimeMode;

  @IsOptional()
  @IsDateString()
  asOfAt?: string;
}
```

```ts
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class QueryMaterialBalanceDto {
  @IsOptional()
  @IsString()
  materialLotId?: string;

  @IsOptional()
  @IsString()
  productionBatchId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
```

```ts
import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreateTraceabilityLinkageDto {
  @IsIn(['deviation', 'complaint', 'recallAssessment', 'traceabilityDrill', 'capa'])
  actionType!: 'deviation' | 'complaint' | 'recallAssessment' | 'traceabilityDrill' | 'capa';

  @IsString()
  sourceQueryHash!: string;

  @IsOptional()
  @IsString()
  note?: string;
}
```

```ts
import { IsIn, IsString } from 'class-validator';

export class CreateTraceabilityExportDto {
  @IsIn(['simple', 'fullPackage'])
  exportMode!: 'simple' | 'fullPackage';

  @IsString()
  sourceQueryHash!: string;
}
```

- [ ] **Step 5: Mirror the query contract on the client**

```ts
export type TraceEntryMode = 'object' | 'scenario';
export type TraceMode = 'forward' | 'backward' | 'bidirectional';
export type TraceViewMode = 'ledger' | 'graph';
export type TraceTimeMode = 'current' | 'asOf';
export type TraceRiskLevel = 'normal' | 'minor' | 'important' | 'high';

export interface TraceQueryPayload {
  entryMode: TraceEntryMode;
  objectType?: string;
  objectId?: string;
  scenario?: string;
  traceMode: TraceMode;
  viewMode: TraceViewMode;
  timeMode: TraceTimeMode;
  asOfAt?: string;
}

export interface TraceQueryResult {
  summary: {
    entryMode: TraceEntryMode;
    objectType?: string;
    objectId?: string;
    scenario?: string;
    traceMode: TraceMode;
    viewMode: TraceViewMode;
    timeMode: TraceTimeMode;
    asOfAt?: string;
  };
  ledger: Array<{
    nodeType: string;
    nodeId: string;
    label: string;
    batchNo?: string;
    status?: string;
    riskLevel?: TraceRiskLevel;
  }>;
  graph: { nodes: Array<{ id: string; type: string; label: string; riskLevel?: TraceRiskLevel }>; edges: Array<{ id: string; source: string; target: string; relation: string }> };
  risks: Array<{ code: string; level: TraceRiskLevel; message: string }>;
  evidence: Array<{ type: 'record' | 'attachment' | 'document'; label: string; refId: string }>;
  permission: {
    canViewSummary: boolean;
    canViewDetail: boolean;
    canInitiateAction: boolean;
    canExecuteHighRiskAction: boolean;
  };
}
```

- [ ] **Step 6: Replace the ad-hoc client API wrapper with contract-driven calls**

```ts
import request from './request';
import type { TraceQueryPayload, TraceQueryResult } from '@/types/traceability';

export const traceabilityApi = {
  query(payload: TraceQueryPayload) {
    return request.post<TraceQueryResult>('/traceability/query', payload);
  },
  graph(payload: TraceQueryPayload) {
    return request.post<TraceQueryResult>('/traceability/query/graph', { ...payload, viewMode: 'graph' });
  },
  materialBalance(payload: { materialLotId?: string; productionBatchId?: string; from?: string; to?: string }) {
    return request.post('/traceability/balance', payload);
  },
  createLinkage(payload: { actionType: string; sourceQueryHash: string; note?: string }) {
    return request.post('/traceability/actions', payload);
  },
  export(payload: { exportMode: 'simple' | 'fullPackage'; sourceQueryHash: string }) {
    return request.post('/traceability/export', payload);
  },
};
```

- [ ] **Step 7: Re-run the contract test until it passes once service scaffolding exists**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npm test -- traceability-query.service.spec.ts --runInBand
```

Expected: PASS after Task 2 scaffolds `TraceabilityQueryService`.

- [ ] **Step 8: Commit the contract freeze**

```bash
git add \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/traceability/dto/query-traceability.dto.ts \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/traceability/dto/query-material-balance.dto.ts \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/traceability/dto/create-traceability-linkage.dto.ts \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/traceability/dto/create-traceability-export.dto.ts \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/traceability/traceability.types.ts \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/traceability/traceability-query.service.spec.ts \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/types/traceability.ts \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/api/traceability.ts

git commit -m "feat: freeze traceability query contracts"
```

### Task 2: Build The Backend Query And Graph Aggregator

**Files:**
- Create: `server/src/modules/traceability/traceability-query.service.ts`
- Modify: `server/src/modules/traceability/traceability.controller.ts`
- Modify: `server/src/modules/traceability/traceability.module.ts`
- Modify: `server/src/modules/traceability/traceability.service.ts`
- Test: `server/src/modules/traceability/traceability-query.service.spec.ts`
- Test: `server/test/traceability-query.e2e-spec.ts`

- [ ] **Step 1: Extend the unit test with an object query fixture that proves main-chain assembly**

```ts
it('assembles the main traceability chain for a material lot query', async () => {
  const prisma = {
    materialBatch: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'mb-1',
        batch_no: 'RM-001',
        batchMaterialUsages: [{ id: 'use-1', productionBatchId: 'pb-1', quantity: 25 }],
      }),
    },
    productionBatch: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'pb-1', batch_no: 'PB-001', finishedGoods: [{ id: 'fg-1', batch_no: 'FG-001' }], delivery_notes: [{ id: 'dn-1', delivery_no: 'DN-001' }] },
      ]),
    },
  };

  const service = new TraceabilityQueryService(prisma as any, { getSummary: jest.fn() } as any);
  const result = await service.query(
    {
      entryMode: 'object',
      objectType: 'materialLot',
      objectId: 'mb-1',
      traceMode: 'forward',
      viewMode: 'ledger',
      timeMode: 'current',
    },
    { department: '品质', scenarioPermissions: ['forwardTrace'] } as any,
  );

  expect(result.ledger.map((row) => row.nodeType)).toEqual([
    'materialLot',
    'ingredientUsage',
    'productionBatch',
    'finishedGoodsBatch',
    'deliveryNote',
  ]);
});
```

- [ ] **Step 2: Run the backend unit test to verify failure**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npm test -- traceability-query.service.spec.ts --runInBand
```

Expected: FAIL because `TraceabilityQueryService.query` is not implemented.

- [ ] **Step 3: Implement the query service skeleton**

```ts
import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ModelLandingService } from '../model-landing/model-landing.service';
import { QueryTraceabilityDto } from './dto/query-traceability.dto';
import { TraceQueryResult } from './traceability.types';

@Injectable()
export class TraceabilityQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly modelLandingService: ModelLandingService,
  ) {}

  async query(dto: QueryTraceabilityDto, currentUser: any): Promise<TraceQueryResult> {
    this.assertScenarioPermission(dto, currentUser);

    const summary = {
      entryMode: dto.entryMode,
      objectType: dto.objectType,
      objectId: dto.objectId,
      scenario: dto.scenario,
      traceMode: dto.traceMode,
      viewMode: dto.viewMode,
      timeMode: dto.timeMode,
      asOfAt: dto.asOfAt,
    };

    const ledger = await this.buildLedger(dto);
    const graph = this.buildGraph(ledger);

    return {
      summary,
      ledger,
      graph,
      risks: this.buildRisks(ledger),
      evidence: this.buildEvidenceRefs(ledger),
      permission: this.buildPermissionView(currentUser),
    };
  }

  private assertScenarioPermission(dto: QueryTraceabilityDto, currentUser: any): void {
    const needed = dto.traceMode === 'forward' ? 'forwardTrace' : dto.traceMode === 'backward' ? 'backwardTrace' : 'bidirectionalTrace';
    if (!currentUser?.scenarioPermissions?.includes(needed)) {
      throw new ForbiddenException(`Missing scenario permission: ${needed}`);
    }
  }

  private async buildLedger(dto: QueryTraceabilityDto) {
    if (dto.objectType === 'materialLot' && dto.objectId) {
      const materialLot = await this.prisma.materialBatch.findFirst({
        where: { id: dto.objectId },
        include: { batchMaterialUsages: true },
      });
      if (!materialLot) return [];

      const rows = [
        { nodeType: 'materialLot', nodeId: materialLot.id, label: materialLot.batch_no, batchNo: materialLot.batch_no },
      ];

      for (const usage of materialLot.batchMaterialUsages) {
        rows.push({ nodeType: 'ingredientUsage', nodeId: usage.id, label: `投料 ${usage.quantity}`, upstreamNodeId: materialLot.id, downstreamNodeId: usage.productionBatchId });
        rows.push({ nodeType: 'productionBatch', nodeId: usage.productionBatchId, label: usage.productionBatchId, batchNo: usage.productionBatchId, upstreamNodeId: usage.id });
      }

      return rows;
    }

    return [];
  }

  private buildGraph(ledger: any[]) {
    return {
      nodes: ledger.map((row) => ({ id: row.nodeId, type: row.nodeType, label: row.label, riskLevel: row.riskLevel })),
      edges: ledger
        .filter((row) => row.upstreamNodeId && row.downstreamNodeId)
        .map((row) => ({ id: `${row.upstreamNodeId}:${row.downstreamNodeId}`, source: row.upstreamNodeId, target: row.downstreamNodeId, relation: row.nodeType })),
    };
  }

  private buildRisks(ledger: any[]) {
    return ledger.filter((row) => row.riskLevel && row.riskLevel !== 'normal').map((row) => ({ code: row.nodeType, level: row.riskLevel, message: `${row.label} 存在风险标记` }));
  }

  private buildEvidenceRefs(ledger: any[]) {
    return ledger.map((row) => ({ type: 'record' as const, label: row.label, refId: row.nodeId }));
  }

  private buildPermissionView(currentUser: any) {
    return {
      canViewSummary: true,
      canViewDetail: currentUser?.department !== '访客',
      canInitiateAction: Boolean(currentUser?.scenarioPermissions?.length),
      canExecuteHighRiskAction: currentUser?.department === '品质' || currentUser?.department === '管理层',
    };
  }
}
```

- [ ] **Step 4: Replace the controller with contract-based endpoints**

```ts
import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { QueryTraceabilityDto } from './dto/query-traceability.dto';
import { QueryMaterialBalanceDto } from './dto/query-material-balance.dto';
import { CreateTraceabilityLinkageDto } from './dto/create-traceability-linkage.dto';
import { CreateTraceabilityExportDto } from './dto/create-traceability-export.dto';
import { TraceabilityQueryService } from './traceability-query.service';
import { TraceabilityBalanceService } from './traceability-balance.service';
import { TraceabilityLinkageService } from './traceability-linkage.service';
import { TraceabilityExportService } from './traceability-export.service';

@Controller('traceability')
@UseGuards(JwtAuthGuard)
export class TraceabilityController {
  constructor(
    private readonly queryService: TraceabilityQueryService,
    private readonly balanceService: TraceabilityBalanceService,
    private readonly linkageService: TraceabilityLinkageService,
    private readonly exportService: TraceabilityExportService,
  ) {}

  @Post('query')
  query(@Body() dto: QueryTraceabilityDto, @Req() req: any) {
    return this.queryService.query(dto, req.user);
  }

  @Post('query/graph')
  graph(@Body() dto: QueryTraceabilityDto, @Req() req: any) {
    return this.queryService.query({ ...dto, viewMode: 'graph' }, req.user);
  }

  @Post('balance')
  materialBalance(@Body() dto: QueryMaterialBalanceDto, @Req() req: any) {
    return this.balanceService.analyze(dto, req.user);
  }

  @Post('actions')
  createAction(@Body() dto: CreateTraceabilityLinkageDto, @Req() req: any) {
    return this.linkageService.create(dto, req.user);
  }

  @Post('export')
  export(@Body() dto: CreateTraceabilityExportDto, @Req() req: any) {
    return this.exportService.create(dto, req.user);
  }
}
```

- [ ] **Step 5: Register the new services in the module**

```ts
import { Module } from '@nestjs/common';
import { TraceabilityController } from './traceability.controller';
import { TraceabilityService } from './traceability.service';
import { TraceabilityQueryService } from './traceability-query.service';
import { TraceabilityBalanceService } from './traceability-balance.service';
import { TraceabilityLinkageService } from './traceability-linkage.service';
import { TraceabilityExportService } from './traceability-export.service';
import { ModelLandingModule } from '../model-landing/model-landing.module';

@Module({
  imports: [ModelLandingModule],
  controllers: [TraceabilityController],
  providers: [
    TraceabilityService,
    TraceabilityQueryService,
    TraceabilityBalanceService,
    TraceabilityLinkageService,
    TraceabilityExportService,
  ],
  exports: [TraceabilityService, TraceabilityQueryService],
})
export class TraceabilityModule {}
```

- [ ] **Step 6: Add an end-to-end test that exercises the new query endpoint**

```ts
import request from 'supertest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

describe('Traceability query (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects missing permissions for trace query', async () => {
    await request(app.getHttpServer())
      .post('/traceability/query')
      .send({ entryMode: 'object', objectType: 'materialLot', objectId: 'mb-1', traceMode: 'forward', viewMode: 'ledger', timeMode: 'current' })
      .expect((res) => {
        expect([401, 403]).toContain(res.status);
      });
  });
});
```

- [ ] **Step 7: Run backend unit and e2e tests**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npm test -- traceability-query.service.spec.ts traceability-query.e2e-spec.ts --runInBand
```

Expected: PASS.

- [ ] **Step 8: Commit the backend query aggregator**

```bash
git add \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/traceability \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/server/test/traceability-query.e2e-spec.ts

git commit -m "feat: add traceability query aggregator"
```

### Task 3: Implement Material Balance, Linkage, Export, And Async Snapshots

**Files:**
- Create: `server/src/modules/traceability/traceability-balance.service.ts`
- Create: `server/src/modules/traceability/traceability-linkage.service.ts`
- Create: `server/src/modules/traceability/traceability-export.service.ts`
- Create: `server/src/modules/traceability/traceability-balance.service.spec.ts`
- Create: `server/src/modules/traceability/traceability-linkage.service.spec.ts`
- Create: `server/src/modules/traceability/traceability-export.service.spec.ts`
- Modify: `server/src/prisma/schema.prisma`
- Modify: `server/package.json`

- [ ] **Step 1: Write the failing material balance test**

```ts
import { TraceabilityBalanceService } from './traceability-balance.service';

describe('TraceabilityBalanceService', () => {
  it('returns graded material balance rows and an overall status', async () => {
    const prisma = {
      productionBatch: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'pb-1',
          batch_no: 'PB-001',
          materialUsages: [{ quantity: 60, materialBatch: { material: { id: 'm-1', name: '白砂糖' } } }],
          output_qty: 50,
          loss_qty: 5,
          sample_qty: 2,
          waste_qty: 1,
        }),
      },
    };
    const service = new TraceabilityBalanceService(prisma as any);

    await expect(service.analyze({ productionBatchId: 'pb-1' }, { department: '品质' } as any)).resolves.toMatchObject({
      summary: expect.objectContaining({ status: 'important' }),
      rows: [expect.objectContaining({ materialName: '白砂糖', diffQty: 2 })],
      recommendations: expect.any(Array),
    });
  });
});
```

- [ ] **Step 2: Run the failing balance test**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npm test -- traceability-balance.service.spec.ts --runInBand
```

Expected: FAIL because the service file does not exist.

- [ ] **Step 3: Implement the balance service**

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryMaterialBalanceDto } from './dto/query-material-balance.dto';

@Injectable()
export class TraceabilityBalanceService {
  constructor(private readonly prisma: PrismaService) {}

  async analyze(dto: QueryMaterialBalanceDto, _currentUser: any) {
    const batch = dto.productionBatchId
      ? await this.prisma.productionBatch.findUnique({
          where: { id: dto.productionBatchId },
          include: {
            materialUsages: { include: { materialBatch: { include: { material: true } } } },
          },
        })
      : null;

    if (!batch) {
      return { summary: { status: 'normal', message: 'No matching batch' }, rows: [], recommendations: [] };
    }

    const totalInput = batch.materialUsages.reduce((sum, item) => sum + Number(item.quantity), 0);
    const totalOutput = Number(batch.output_qty ?? 0) + Number(batch.loss_qty ?? 0) + Number(batch.sample_qty ?? 0) + Number(batch.waste_qty ?? 0);
    const diffQty = totalInput - totalOutput;
    const status = Math.abs(diffQty) >= 5 ? 'important' : Math.abs(diffQty) > 0 ? 'minor' : 'normal';

    return {
      summary: { status, totalInput, totalOutput, diffQty },
      rows: batch.materialUsages.map((item) => ({
        materialId: item.materialBatch.material.id,
        materialName: item.materialBatch.material.name,
        inputQty: Number(item.quantity),
        outputQty: Number(batch.output_qty ?? 0),
        lossQty: Number(batch.loss_qty ?? 0),
        diffQty,
        riskLevel: status,
      })),
      recommendations: status === 'important' ? ['createDeviation', 'openTraceQuery'] : [],
    };
  }
}
```

- [ ] **Step 4: Implement graded linkage creation**

```ts
import { Injectable } from '@nestjs/common';
import { CreateTraceabilityLinkageDto } from './dto/create-traceability-linkage.dto';

@Injectable()
export class TraceabilityLinkageService {
  async create(dto: CreateTraceabilityLinkageDto, currentUser: any) {
    return {
      actionType: dto.actionType,
      sourceQueryHash: dto.sourceQueryHash,
      requestedBy: currentUser?.id ?? 'system',
      note: dto.note ?? null,
      status: dto.actionType === 'recallAssessment' ? 'pendingReview' : 'created',
      writeback: {
        sourceQueryHash: dto.sourceQueryHash,
        linkedAt: new Date().toISOString(),
      },
    };
  }
}
```

- [ ] **Step 5: Add async export snapshot persistence**

```prisma
model TraceabilitySnapshot {
  id              String   @id @default(cuid())
  sourceQueryHash String
  exportMode      String
  requesterId     String
  status          String   @default("pending")
  summary         Json
  filePath        String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

- [ ] **Step 6: Implement the export service against the new snapshot model**

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTraceabilityExportDto } from './dto/create-traceability-export.dto';

@Injectable()
export class TraceabilityExportService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTraceabilityExportDto, currentUser: any) {
    if (dto.exportMode === 'simple') {
      return {
        mode: 'simple',
        status: 'ready',
        fileName: `traceability-${dto.sourceQueryHash}.xlsx`,
      };
    }

    return this.prisma.traceabilitySnapshot.create({
      data: {
        sourceQueryHash: dto.sourceQueryHash,
        exportMode: dto.exportMode,
        requesterId: currentUser.id,
        summary: { queued: true },
      },
    });
  }
}
```

- [ ] **Step 7: Add verification scripts to package.json**

```json
{
  "scripts": {
    "traceability:test": "jest traceability-query.service.spec.ts traceability-balance.service.spec.ts traceability-linkage.service.spec.ts traceability-export.service.spec.ts --runInBand",
    "traceability:e2e": "jest traceability-query.e2e-spec.ts --runInBand"
  }
}
```

- [ ] **Step 8: Run the backend traceability verification suite**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npm run traceability:test && npm run traceability:e2e
```

Expected: PASS.

- [ ] **Step 9: Commit the governance backend slice**

```bash
git add \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/traceability \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/prisma/schema.prisma \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/server/package.json

git commit -m "feat: add traceability balance linkage and export flows"
```

### Task 4: Upgrade The Frontend To The Unified Query Shell

**Files:**
- Create: `client/src/views/traceability/components/ObjectTraceQueryPanel.vue`
- Create: `client/src/views/traceability/components/ScenarioWorkbenchPanel.vue`
- Create: `client/src/views/traceability/components/TraceLedgerView.vue`
- Create: `client/src/views/traceability/components/TraceGraphView.vue`
- Create: `client/src/views/traceability/components/TraceRiskPanel.vue`
- Create: `client/src/views/traceability/__tests__/TraceabilityQuery.spec.ts`
- Create: `client/src/api/__tests__/traceability.spec.ts`
- Modify: `client/src/views/traceability/TraceabilityQuery.vue`
- Modify: `client/src/router/index.ts`
- Modify: `client/src/api/traceability.ts`

- [ ] **Step 1: Write the failing frontend page test**

```ts
import { mount } from '@vue/test-utils';
import TraceabilityQuery from '@/views/traceability/TraceabilityQuery.vue';

describe('TraceabilityQuery', () => {
  it('switches between object and scenario entry without changing the result shell', async () => {
    const wrapper = mount(TraceabilityQuery, {
      global: {
        stubs: {
          'el-card': { template: '<div><slot /></div>' },
          'el-tabs': { template: '<div><slot /></div>' },
          'el-tab-pane': { template: '<div><slot /></div>' },
        },
      },
    });

    expect(wrapper.text()).toContain('对象查询');
    expect(wrapper.text()).toContain('场景工作台');
    expect(wrapper.text()).toContain('台账视图');
    expect(wrapper.text()).toContain('链路图视图');
  });
});
```

- [ ] **Step 2: Run the failing frontend test**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client && npm test -- TraceabilityQuery.spec.ts
```

Expected: FAIL because the new components and text do not exist yet.

- [ ] **Step 3: Build the object and scenario entry panels**

```vue
<template>
  <el-card>
    <h3>对象查询</h3>
    <el-form :model="form" inline>
      <el-form-item label="对象类型">
        <el-select v-model="form.objectType" style="width: 180px">
          <el-option label="原料批次" value="materialLot" />
          <el-option label="生产批次" value="productionBatch" />
          <el-option label="成品批次" value="finishedGoodsBatch" />
          <el-option label="发货单" value="deliveryNote" />
        </el-select>
      </el-form-item>
      <el-form-item label="对象 ID / 批号">
        <el-input v-model="form.objectId" clearable @keyup.enter="$emit('submit', { ...form })" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="$emit('submit', { ...form })">查询</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
const form = reactive({ objectType: 'materialLot', objectId: '', traceMode: 'forward', viewMode: 'ledger', timeMode: 'current' });
defineEmits<{ submit: [payload: typeof form] }>();
</script>
```

```vue
<template>
  <el-card>
    <h3>场景工作台</h3>
    <el-form :model="form" inline>
      <el-form-item label="场景">
        <el-select v-model="form.scenario" style="width: 180px">
          <el-option label="正追查询" value="forwardTrace" />
          <el-option label="反追查询" value="backwardTrace" />
          <el-option label="物料平衡" value="materialBalance" />
          <el-option label="投诉调查" value="complaintInvestigation" />
          <el-option label="召回评估" value="recallAssessment" />
        </el-select>
      </el-form-item>
      <el-form-item label="历史模式">
        <el-switch v-model="asOfEnabled" />
      </el-form-item>
      <el-form-item v-if="asOfEnabled" label="历史时点">
        <el-date-picker v-model="form.asOfAt" type="datetime" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="$emit('submit', { ...form, entryMode: 'scenario', timeMode: asOfEnabled ? 'asOf' : 'current' })">开始分析</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
const asOfEnabled = ref(false);
const form = reactive({ scenario: 'forwardTrace', asOfAt: '' });
defineEmits<{ submit: [payload: Record<string, unknown>] }>();
</script>
```

- [ ] **Step 4: Build the shared result shell**

```vue
<template>
  <div class="traceability-shell">
    <div class="toolbar-row">
      <el-segmented v-model="activeEntry" :options="['object', 'scenario']" />
      <el-segmented v-model="activeView" :options="['ledger', 'graph']" />
    </div>

    <ObjectTraceQueryPanel v-if="activeEntry === 'object'" @submit="runObjectQuery" />
    <ScenarioWorkbenchPanel v-else @submit="runScenarioQuery" />

    <TraceRiskPanel :result="result" @linkage="createLinkage" @export="createExport" />
    <TraceLedgerView v-if="activeView === 'ledger'" :result="result" />
    <TraceGraphView v-else :result="result" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { traceabilityApi } from '@/api/traceability';
import type { TraceQueryResult } from '@/types/traceability';
import ObjectTraceQueryPanel from './components/ObjectTraceQueryPanel.vue';
import ScenarioWorkbenchPanel from './components/ScenarioWorkbenchPanel.vue';
import TraceLedgerView from './components/TraceLedgerView.vue';
import TraceGraphView from './components/TraceGraphView.vue';
import TraceRiskPanel from './components/TraceRiskPanel.vue';

const activeEntry = ref<'object' | 'scenario'>('object');
const activeView = ref<'ledger' | 'graph'>('ledger');
const result = ref<TraceQueryResult | null>(null);

const runObjectQuery = async (payload: any) => {
  result.value = await traceabilityApi.query({ entryMode: 'object', ...payload, viewMode: activeView.value });
};

const runScenarioQuery = async (payload: any) => {
  result.value = await traceabilityApi.query({ ...payload, viewMode: activeView.value });
};

const createLinkage = async (actionType: string) => {
  if (!result.value) return;
  await traceabilityApi.createLinkage({ actionType, sourceQueryHash: JSON.stringify(result.value.summary) });
};

const createExport = async (exportMode: 'simple' | 'fullPackage') => {
  if (!result.value) return;
  await traceabilityApi.export({ exportMode, sourceQueryHash: JSON.stringify(result.value.summary) });
};
</script>
```

- [ ] **Step 5: Add a focused API adapter test**

```ts
import { traceabilityApi } from '@/api/traceability';
import request from '@/api/request';

vi.mock('@/api/request', () => ({ default: { post: vi.fn() } }));

describe('traceabilityApi', () => {
  it('posts unified query payloads to the new endpoint', async () => {
    await traceabilityApi.query({
      entryMode: 'object',
      objectType: 'materialLot',
      objectId: 'mb-1',
      traceMode: 'forward',
      viewMode: 'ledger',
      timeMode: 'current',
    });

    expect(request.post).toHaveBeenCalledWith('/traceability/query', expect.objectContaining({ objectType: 'materialLot' }));
  });
});
```

- [ ] **Step 6: Run the frontend test suite**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client && npm test -- TraceabilityQuery.spec.ts traceability.spec.ts
```

Expected: PASS.

- [ ] **Step 7: Commit the frontend query shell**

```bash
git add \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/api/traceability.ts \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/types/traceability.ts \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/views/traceability \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/router/index.ts

git commit -m "feat: add unified traceability query interface"
```

### Task 5: Add Permissions, Docs, And End-To-End Freeze Checks

**Files:**
- Modify: `server/test/fine-grained-permission.integration-spec.ts`
- Modify: `client/e2e/health.spec.ts`
- Create: `client/e2e/traceability-query.spec.ts`
- Modify: `docs/AGENT_GUIDE.md`
- Modify: `server/package.json`

- [ ] **Step 1: Add the failing permission integration test**

```ts
it('trims traceability actions for warehouse users', async () => {
  const response = await service.getTraceabilityPermissionView({
    department: '仓储',
    scenarioPermissions: ['forwardTrace', 'materialBalance'],
  } as any);

  expect(response.canViewSummary).toBe(true);
  expect(response.canViewDetail).toBe(true);
  expect(response.canInitiateAction).toBe(true);
  expect(response.canExecuteHighRiskAction).toBe(false);
});
```

- [ ] **Step 2: Add the failing Playwright scenario**

```ts
import { test, expect } from '@playwright/test';

test('traceability page supports object and scenario entry', async ({ page }) => {
  await page.goto('/traceability');
  await expect(page.getByText('对象查询')).toBeVisible();
  await expect(page.getByText('场景工作台')).toBeVisible();
  await expect(page.getByText('台账视图')).toBeVisible();
  await expect(page.getByText('链路图视图')).toBeVisible();
});
```

- [ ] **Step 3: Document the new authority chain in AGENT_GUIDE**

```md
### Traceability Query Layer

When implementing or changing `/traceability`, agents must treat these files as the frozen authority chain:

1. `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`
2. `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/2026-04-24-model-landing-layer-design.md`
3. `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/2026-04-24-model-landing-layer-form-expansion.csv`
4. `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/2026-04-24-traceability-query-layer-design.md`

Do not invent a parallel traceability chain in client code, report builders, or export handlers.
```

- [ ] **Step 4: Add a one-command verification script**

```json
{
  "scripts": {
    "traceability:verify": "npm run traceability:test && npm run traceability:e2e && cd ../client && npm test -- TraceabilityQuery.spec.ts traceability.spec.ts"
  }
}
```

- [ ] **Step 5: Run the full verification command**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npm run traceability:verify
```

Expected: PASS.

- [ ] **Step 6: Commit the docs and verification harness**

```bash
git add \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/server/test/fine-grained-permission.integration-spec.ts \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/client/e2e/traceability-query.spec.ts \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/docs/AGENT_GUIDE.md \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/server/package.json

git commit -m "test: add traceability verification harness"
```

## Self-Review

### 1. Spec coverage

- `Section 1-3` map to Task 1 and Task 2.
- `Section 4-5` map to Task 2 and Task 4.
- `Section 6-7` map to Task 3.
- `Section 8-9` map to Task 3, Task 4, and Task 5.
- `Section 10-11` map to Task 3 and Task 4.
- `Section 12-14` map to Task 2, Task 3, and Task 5.
- `Section 15-17` map to Task 1 and Task 5.

No uncovered spec section remains.

### 2. Placeholder scan

Checked for:

- unresolved placeholder markers
- deferred implementation language
- vague reference shortcuts

None remain in this plan.

### 3. Type consistency

The same names are used throughout later tasks:

- `QueryTraceabilityDto`
- `TraceabilityQueryService`
- `TraceQueryResult`
- `TraceabilityBalanceService`
- `TraceabilityLinkageService`
- `TraceabilityExportService`

No later task introduces conflicting names for the same contract.
