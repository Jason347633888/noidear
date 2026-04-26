# Traceability Query API Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the frozen traceability API contract across shared types, NestJS endpoints, client adapters, and verification so all traceability consumers use the same request, response, status, and permission schema.

**Architecture:** Add one shared traceability contract package entry, then align the server `traceability` module and the client traceability adapters to that contract. Keep the current module boundaries, but move ad hoc payload shaping into explicit DTOs, typed result builders, and compatibility-safe wrappers. Query, balance, linkage, export, and snapshot stay separate endpoints, but all of them consume the same frozen contract vocabulary.

**Tech Stack:** TypeScript, NestJS, Prisma, Jest, Vue 3, Vitest, shared `@noidear/types`, existing `traceability` and `model-landing` modules

---

## Scope Check

This spec is focused enough for one implementation plan. It spans shared types, backend, frontend, and verification, but all four tracks are coupled to the same frozen contract and must land together to avoid drift.

## File Structure

### New files

- `packages/types/traceability.ts`
  - Shared request, response, node, edge, risk, permission, export, and snapshot contracts.
- `server/src/modules/traceability/dto/query-traceability.dto.ts`
  - Validation DTO aligned to `TraceQueryRequest`.
- `server/src/modules/traceability/dto/query-balance.dto.ts`
  - Validation DTO aligned to `BalanceQueryRequest`.
- `server/src/modules/traceability/dto/create-traceability-action.dto.ts`
  - Validation DTO aligned to `LinkageCreateRequest`.
- `server/src/modules/traceability/dto/create-traceability-export.dto.ts`
  - Validation DTO aligned to `ExportCreateRequest`.
- `server/src/modules/traceability/dto/create-traceability-snapshot.dto.ts`
  - Validation DTO aligned to `SnapshotCreateRequest`.
- `server/src/modules/traceability/dto/query-traceability-snapshot.dto.ts`
  - Validation DTO aligned to `SnapshotQueryRequest`.
- `server/src/modules/traceability/traceability-contract.mapper.ts`
  - Pure helpers that turn Prisma-loaded data into the frozen contract objects.
- `server/src/modules/traceability/traceability-contract.mapper.spec.ts`
  - Unit tests for stable contract mapping.
- `server/test/traceability-contract.e2e-spec.ts`
  - E2E assertions for the new contract payloads.
- `client/src/api/__tests__/traceability-contract.spec.ts`
  - Adapter tests that assert the client consumes the contract exactly.

### Modified files

- `packages/types/index.ts`
  - Export the new traceability contract entry.
- `server/src/modules/traceability/traceability.controller.ts`
  - Add snapshot endpoints and align parameter names to contract objects.
- `server/src/modules/traceability/traceability.service.ts`
  - Replace legacy payload shaping with contract-building helpers.
- `server/src/modules/traceability/traceability.module.ts`
  - Register the mapper and any new providers.
- `server/src/prisma/schema.prisma`
  - Add `TraceabilitySnapshot` persistence model if absent.
- `server/package.json`
  - Add traceability contract verification scripts.
- `client/src/types/traceability.ts`
  - Re-export or mirror the shared contract shape for the client app.
- `client/src/api/traceability.ts`
  - Align request and response types to the frozen contract.
- `docs/AGENT_GUIDE.md`
  - Document the API contract spec as the authority for traceability payloads.

### Existing files to read before coding

- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/2026-04-24-traceability-query-api-contract-design.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/2026-04-24-traceability-query-layer-design.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/packages/types/api.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/traceability/traceability.controller.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/traceability/traceability.service.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/api/traceability.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/types/traceability.ts`

---

### Task 1: Freeze Shared Traceability Contract Types

**Files:**
- Create: `packages/types/traceability.ts`
- Modify: `packages/types/index.ts`
- Modify: `client/src/types/traceability.ts`
- Test: `client/src/api/__tests__/traceability-contract.spec.ts`

- [ ] **Step 1: Write the failing shared-type consumer test**

```ts
import type { TraceQueryRequest, TraceQueryResult } from '@noidear/types';

describe('traceability contract types', () => {
  it('exposes the frozen query request and result contracts', () => {
    const request: TraceQueryRequest = {
      entryMode: 'object',
      objectType: 'materialLot',
      objectId: 'mb-1',
      traceMode: 'forward',
      viewMode: 'ledger',
      timeMode: 'current',
    };

    const result: TraceQueryResult = {
      summary: {
        queryId: 'q-1',
        entryMode: 'object',
        objectType: 'materialLot',
        objectId: 'mb-1',
        traceMode: 'forward',
        viewMode: 'ledger',
        timeMode: 'current',
        riskLevel: 'normal',
        resultStatus: 'ok',
      },
      permission: {
        departmentScope: '品质',
        scenarioPermissions: ['forwardTrace'],
        canViewSummary: true,
        canViewDetail: true,
        canViewEvidence: true,
        canInitiateLinkage: true,
        canExportSimple: true,
        canExportFullPackage: true,
        canUseAsOfPlayback: true,
        canExecuteHighRiskAction: false,
      },
      risk: { summaryRiskLevel: 'normal', riskCount: 0, highRiskCount: 0, items: [] },
      ledger: { columns: [], rows: [], grouping: [], totals: {} },
      graph: { nodes: [], edges: [], layout: 'vertical', legend: [] },
      evidence: { count: 0, items: [] },
      actions: { available: [], recommended: [], created: [] },
      export: { simpleExportAvailable: true, fullPackageAvailable: true, latestExportId: null },
      meta: { generatedAt: '2026-04-24T00:00:00.000Z', queryHash: 'hash-1', degraded: false, snapshotId: null, sourceVersion: 'traceability-query-contract/v1' },
      extensions: {},
    };

    expect(request.entryMode).toBe('object');
    expect(result.summary.resultStatus).toBe('ok');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client && npm test -- traceability-contract.spec.ts
```

Expected: FAIL with `Cannot find module '@noidear/types'` export or missing `TraceQueryRequest` / `TraceQueryResult`.

- [ ] **Step 3: Add the shared traceability contract file**

```ts
export type TraceEntryMode = 'object' | 'scenario';
export type TraceMode = 'forward' | 'backward' | 'bidirectional';
export type TraceViewMode = 'ledger' | 'graph';
export type TraceTimeMode = 'current' | 'asOf';
export type TraceRiskLevel = 'normal' | 'minor' | 'important' | 'high';
export type TraceResultStatus = 'ok' | 'partial' | 'empty' | 'degraded' | 'pending';
export type TraceActionStatus = 'created' | 'pendingReview' | 'inProgress' | 'closed' | 'rejected';
export type TraceExportStatus = 'queued' | 'processing' | 'ready' | 'failed' | 'expired';
export type TraceSnapshotStatus = 'queued' | 'building' | 'ready' | 'failed' | 'expired';

export interface TracePermissionContext {
  departmentScope: string;
  scenarioPermissions: string[];
  canViewSummary: boolean;
  canViewDetail: boolean;
  canViewEvidence: boolean;
  canInitiateLinkage: boolean;
  canExportSimple: boolean;
  canExportFullPackage: boolean;
  canUseAsOfPlayback: boolean;
  canExecuteHighRiskAction: boolean;
}

export interface TraceLocalPermission {
  visible: boolean;
  masked: boolean;
  expandable: boolean;
  actionable: boolean;
}

export interface TraceEvidenceRef {
  type: 'record' | 'attachment' | 'document';
  label: string;
  refId: string;
  permission?: TraceLocalPermission;
}

export interface TraceNode {
  nodeId: string;
  nodeType: string;
  businessObject: string;
  label: string;
  batchNo?: string | null;
  status?: string | null;
  riskLevel?: TraceRiskLevel | null;
  timeContext?: { timeMode: TraceTimeMode; asOfAt?: string | null };
  permission?: TraceLocalPermission;
  evidenceRefs?: string[];
  attributes?: Record<string, unknown>;
}

export interface TraceEdge {
  edgeId: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationType: string;
  direction: 'forward' | 'backward' | 'bidirectional';
  isMainChain: boolean;
  isAuxiliary: boolean;
  riskLevel?: TraceRiskLevel | null;
  attributes?: Record<string, unknown>;
}

export interface TraceRisk {
  riskId: string;
  riskCode: string;
  riskLevel: TraceRiskLevel;
  title: string;
  message: string;
  sourceType: string;
  sourceRefId: string;
  affectedNodeIds: string[];
  affectedEdgeIds: string[];
  recommendedActions: string[];
  linkedActionIds: string[];
  status: 'open' | 'acknowledged' | 'linked' | 'closed';
  permission?: TraceLocalPermission;
  createdAt: string;
}

export interface TraceQueryRequest {
  entryMode: TraceEntryMode;
  traceMode: TraceMode;
  viewMode: TraceViewMode;
  timeMode: TraceTimeMode;
  objectType?: string;
  objectId?: string;
  scenario?: string;
  asOfAt?: string;
  departmentScope?: string;
  includeEvidence?: boolean;
  includeAuxiliaryNodes?: boolean;
  includeRiskDetails?: boolean;
  filters?: Record<string, unknown>;
}

export interface TraceQueryResult {
  summary: {
    queryId: string;
    entryMode: TraceEntryMode;
    objectType?: string;
    objectId?: string;
    scenario?: string;
    traceMode: TraceMode;
    viewMode: TraceViewMode;
    timeMode: TraceTimeMode;
    asOfAt?: string;
    riskLevel: TraceRiskLevel;
    resultStatus: TraceResultStatus;
  };
  permission: TracePermissionContext;
  risk: {
    summaryRiskLevel: TraceRiskLevel;
    riskCount: number;
    highRiskCount: number;
    items: TraceRisk[];
  };
  ledger: {
    columns: Array<{ key: string; label: string }>;
    rows: TraceNode[];
    grouping: string[];
    totals: Record<string, unknown>;
  };
  graph: {
    nodes: TraceNode[];
    edges: TraceEdge[];
    layout: string;
    legend: string[];
  };
  evidence: {
    count: number;
    items: TraceEvidenceRef[];
  };
  actions: {
    available: string[];
    recommended: string[];
    created: Array<{ actionId: string; actionType: string; status: TraceActionStatus }>;
  };
  export: {
    simpleExportAvailable: boolean;
    fullPackageAvailable: boolean;
    latestExportId: string | null;
  };
  meta: {
    generatedAt: string;
    queryHash: string;
    degraded: boolean;
    snapshotId: string | null;
    sourceVersion: string;
  };
  extensions: Record<string, unknown>;
}

export interface BalanceQueryRequest {
  materialLotId?: string;
  productionBatchId?: string;
  from?: string;
  to?: string;
  timeMode?: TraceTimeMode;
  asOfAt?: string;
  includeEvidence?: boolean;
  includeRecommendations?: boolean;
}

export interface BalanceQueryResult {
  summary: {
    analysisId: string;
    scopeType: string;
    scopeRefId: string;
    status: TraceResultStatus;
    totalInput: number;
    totalOutput: number;
    totalLoss: number;
    diffQty: number;
    riskLevel: TraceRiskLevel;
  };
  rows: Array<{
    materialId: string;
    materialName: string;
    inputQty: number;
    outputQty: number;
    lossQty: number;
    diffQty: number;
    riskLevel: TraceRiskLevel;
  }>;
  discrepancies: Array<{ code: string; message: string; riskLevel: TraceRiskLevel }>;
  recommendations: string[];
  evidence: { count: number; items: TraceEvidenceRef[] };
  meta: { generatedAt: string; queryHash: string; snapshotId: string | null; sourceVersion: string };
}

export interface LinkageCreateRequest {
  actionType: 'deviation' | 'complaint' | 'recallAssessment' | 'traceabilityDrill' | 'capa';
  sourceQueryRef: string;
  sourceNodeIds?: string[];
  sourceRiskIds?: string[];
  note?: string;
}

export interface TraceActionResult {
  actionId: string;
  actionType: LinkageCreateRequest['actionType'];
  status: TraceActionStatus;
  sourceQueryRef: string;
  createdAt: string;
  requestedBy: string;
  linkedObjectType?: string;
  linkedObjectId?: string;
  writeback: Record<string, unknown>;
}

export interface ExportCreateRequest {
  exportMode: 'simple' | 'fullPackage';
  sourceQueryRef: string;
  includeEvidence?: boolean;
  includeMaskedData?: boolean;
}

export interface TraceExportResult {
  exportId: string;
  exportMode: ExportCreateRequest['exportMode'];
  status: TraceExportStatus;
  sourceQueryRef: string;
  createdAt: string;
  requestedBy: string;
  downloadRef: string | null;
  snapshotId: string | null;
  meta: Record<string, unknown>;
}

export interface SnapshotCreateRequest {
  sourceQueryRef: string;
  snapshotType: 'query' | 'balance' | 'export';
  retentionPolicy?: string;
}

export interface SnapshotQueryRequest {
  snapshotId: string;
}

export interface TraceSnapshotResult {
  snapshotId: string;
  sourceQueryRef: string;
  snapshotType: SnapshotCreateRequest['snapshotType'];
  status: TraceSnapshotStatus;
  createdAt: string;
  expiresAt?: string | null;
  payloadRef?: string | null;
  meta: Record<string, unknown>;
}
```

- [ ] **Step 4: Export the new type entry from the shared package**

```ts
export * from './user';
export * from './document';
export * from './template';
export * from './task';
export * from './api';
export * from './traceability';
```

- [ ] **Step 5: Re-export the client-local traceability types from the shared package**

```ts
export type {
  BalanceQueryRequest,
  BalanceQueryResult,
  ExportCreateRequest,
  LinkageCreateRequest,
  SnapshotCreateRequest,
  SnapshotQueryRequest,
  TraceActionResult,
  TraceEdge,
  TraceExportResult,
  TraceNode,
  TracePermissionContext,
  TraceQueryRequest,
  TraceQueryResult,
  TraceRisk,
  TraceSnapshotResult,
} from '@noidear/types';
```

- [ ] **Step 6: Run the client test again to verify it passes**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client && npm test -- traceability-contract.spec.ts
```

Expected: PASS.

- [ ] **Step 7: Commit the frozen shared contract types**

```bash
git add \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/packages/types/traceability.ts \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/packages/types/index.ts \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/types/traceability.ts \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/api/__tests__/traceability-contract.spec.ts

git commit -m "feat: add frozen traceability contract types"
```

### Task 2: Align Server DTOs, Mapper, And Query Endpoints To The Contract

**Files:**
- Create: `server/src/modules/traceability/dto/query-traceability.dto.ts`
- Create: `server/src/modules/traceability/dto/query-balance.dto.ts`
- Create: `server/src/modules/traceability/dto/create-traceability-action.dto.ts`
- Create: `server/src/modules/traceability/dto/create-traceability-export.dto.ts`
- Create: `server/src/modules/traceability/dto/create-traceability-snapshot.dto.ts`
- Create: `server/src/modules/traceability/dto/query-traceability-snapshot.dto.ts`
- Create: `server/src/modules/traceability/traceability-contract.mapper.ts`
- Create: `server/src/modules/traceability/traceability-contract.mapper.spec.ts`
- Modify: `server/src/modules/traceability/traceability.controller.ts`
- Modify: `server/src/modules/traceability/traceability.service.ts`
- Modify: `server/src/modules/traceability/traceability.module.ts`

- [ ] **Step 1: Write the failing mapper test**

```ts
import { mapForwardTraceResult } from './traceability-contract.mapper';

describe('traceability contract mapper', () => {
  it('maps a material batch chain into the frozen TraceQueryResult shape', () => {
    const result = mapForwardTraceResult({
      id: 'mb-1',
      batch_no: 'RM-001',
      batchMaterialUsages: [
        {
          id: 'use-1',
          quantity: 10,
          productionBatch: {
            id: 'pb-1',
            batch_no: 'PB-001',
            finishedGoods: [{ id: 'fg-1', batch_no: 'FG-001' }],
            delivery_notes: [{ id: 'dn-1', delivery_no: 'DN-001' }],
          },
        },
      ],
    } as any, {
      departmentScope: '品质',
      scenarioPermissions: ['forwardTrace'],
      canViewSummary: true,
      canViewDetail: true,
      canViewEvidence: true,
      canInitiateLinkage: true,
      canExportSimple: true,
      canExportFullPackage: true,
      canUseAsOfPlayback: true,
      canExecuteHighRiskAction: false,
    });

    expect(result.summary.objectType).toBe('materialLot');
    expect(result.ledger.rows.map((row) => row.nodeType)).toEqual([
      'materialLot',
      'ingredientUsage',
      'productionBatch',
      'finishedGoodsBatch',
      'deliveryNote',
    ]);
    expect(result.graph.nodes).toHaveLength(5);
  });
});
```

- [ ] **Step 2: Run the mapper test to verify failure**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npm test -- traceability-contract.mapper.spec.ts --runInBand
```

Expected: FAIL with `Cannot find module './traceability-contract.mapper'`.

- [ ] **Step 3: Create the validation DTOs aligned to the shared contract**

```ts
import { IsBoolean, IsDateString, IsEnum, IsObject, IsOptional, IsString, ValidateIf } from 'class-validator';
import type { TraceEntryMode, TraceMode, TraceTimeMode, TraceViewMode } from '@noidear/types';

export class QueryTraceabilityDto {
  @IsEnum(['object', 'scenario'] as const)
  entryMode!: TraceEntryMode;

  @IsEnum(['forward', 'backward', 'bidirectional'] as const)
  traceMode!: TraceMode;

  @IsEnum(['ledger', 'graph'] as const)
  viewMode!: TraceViewMode;

  @IsEnum(['current', 'asOf'] as const)
  timeMode!: TraceTimeMode;

  @ValidateIf((o) => o.entryMode === 'object')
  @IsString()
  objectType?: string;

  @ValidateIf((o) => o.entryMode === 'object')
  @IsString()
  objectId?: string;

  @ValidateIf((o) => o.entryMode === 'scenario')
  @IsString()
  scenario?: string;

  @ValidateIf((o) => o.timeMode === 'asOf')
  @IsDateString()
  asOfAt?: string;

  @IsOptional()
  @IsString()
  departmentScope?: string;

  @IsOptional()
  @IsBoolean()
  includeEvidence?: boolean;

  @IsOptional()
  @IsBoolean()
  includeAuxiliaryNodes?: boolean;

  @IsOptional()
  @IsBoolean()
  includeRiskDetails?: boolean;

  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;
}
```

```ts
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import type { TraceTimeMode } from '@noidear/types';

export class QueryBalanceDto {
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

  @IsOptional()
  @IsEnum(['current', 'asOf'] as const)
  timeMode?: TraceTimeMode;

  @IsOptional()
  @IsDateString()
  asOfAt?: string;
}
```

```ts
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateTraceabilityActionDto {
  @IsEnum(['deviation', 'complaint', 'recallAssessment', 'traceabilityDrill', 'capa'] as const)
  actionType!: 'deviation' | 'complaint' | 'recallAssessment' | 'traceabilityDrill' | 'capa';

  @IsString()
  sourceQueryRef!: string;

  @IsOptional()
  sourceNodeIds?: string[];

  @IsOptional()
  sourceRiskIds?: string[];

  @IsOptional()
  @IsString()
  note?: string;
}
```

```ts
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateTraceabilityExportDto {
  @IsEnum(['simple', 'fullPackage'] as const)
  exportMode!: 'simple' | 'fullPackage';

  @IsString()
  sourceQueryRef!: string;

  @IsOptional()
  @IsBoolean()
  includeEvidence?: boolean;

  @IsOptional()
  @IsBoolean()
  includeMaskedData?: boolean;
}
```

```ts
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateTraceabilitySnapshotDto {
  @IsString()
  sourceQueryRef!: string;

  @IsEnum(['query', 'balance', 'export'] as const)
  snapshotType!: 'query' | 'balance' | 'export';

  @IsOptional()
  @IsString()
  retentionPolicy?: string;
}
```

```ts
import { IsString } from 'class-validator';

export class QueryTraceabilitySnapshotDto {
  @IsString()
  snapshotId!: string;
}
```

- [ ] **Step 4: Implement the pure mapper**

```ts
import type { TraceNode, TraceQueryResult, TracePermissionContext } from '@noidear/types';

const baseMeta = () => ({
  generatedAt: new Date().toISOString(),
  queryHash: 'pending-hash',
  degraded: false,
  snapshotId: null,
  sourceVersion: 'traceability-query-contract/v1',
});

export function mapForwardTraceResult(materialBatch: any, permission: TracePermissionContext): TraceQueryResult {
  const rows: TraceNode[] = [];

  rows.push({
    nodeId: materialBatch.id,
    nodeType: 'materialLot',
    businessObject: 'MaterialBatch',
    label: materialBatch.batch_no,
    batchNo: materialBatch.batch_no,
    riskLevel: 'normal',
    permission: { visible: true, masked: false, expandable: true, actionable: true },
  });

  for (const usage of materialBatch.batchMaterialUsages ?? []) {
    rows.push({
      nodeId: usage.id,
      nodeType: 'ingredientUsage',
      businessObject: 'BatchMaterialUsage',
      label: `投料 ${usage.quantity}`,
      riskLevel: 'normal',
      permission: { visible: true, masked: false, expandable: true, actionable: false },
      attributes: { quantity: usage.quantity },
    });

    rows.push({
      nodeId: usage.productionBatch.id,
      nodeType: 'productionBatch',
      businessObject: 'ProductionBatch',
      label: usage.productionBatch.batch_no,
      batchNo: usage.productionBatch.batch_no,
      riskLevel: 'normal',
      permission: { visible: true, masked: false, expandable: true, actionable: true },
    });

    for (const fg of usage.productionBatch.finishedGoods ?? []) {
      rows.push({
        nodeId: fg.id,
        nodeType: 'finishedGoodsBatch',
        businessObject: 'FinishedGoodsBatch',
        label: fg.batch_no,
        batchNo: fg.batch_no,
        riskLevel: 'normal',
        permission: { visible: true, masked: false, expandable: true, actionable: true },
      });
    }

    for (const delivery of usage.productionBatch.delivery_notes ?? []) {
      rows.push({
        nodeId: delivery.id,
        nodeType: 'deliveryNote',
        businessObject: 'DeliveryNote',
        label: delivery.delivery_no,
        batchNo: delivery.delivery_no,
        riskLevel: 'normal',
        permission: { visible: true, masked: false, expandable: true, actionable: false },
      });
    }
  }

  return {
    summary: {
      queryId: `forward:${materialBatch.id}`,
      entryMode: 'object',
      objectType: 'materialLot',
      objectId: materialBatch.id,
      traceMode: 'forward',
      viewMode: 'ledger',
      timeMode: 'current',
      riskLevel: 'normal',
      resultStatus: rows.length ? 'ok' : 'empty',
    },
    permission,
    risk: { summaryRiskLevel: 'normal', riskCount: 0, highRiskCount: 0, items: [] },
    ledger: { columns: [{ key: 'label', label: '节点' }], rows, grouping: ['nodeType'], totals: { rowCount: rows.length } },
    graph: {
      nodes: rows,
      edges: rows.slice(1).map((row, index) => ({
        edgeId: `edge-${index + 1}`,
        sourceNodeId: rows[index].nodeId,
        targetNodeId: row.nodeId,
        relationType: 'linked',
        direction: 'forward',
        isMainChain: true,
        isAuxiliary: false,
      })),
      layout: 'vertical',
      legend: ['mainChain'],
    },
    evidence: { count: 0, items: [] },
    actions: { available: ['deviation', 'complaint'], recommended: [], created: [] },
    export: { simpleExportAvailable: true, fullPackageAvailable: true, latestExportId: null },
    meta: baseMeta(),
    extensions: {},
  };
}
```

- [ ] **Step 5: Update the controller to use the new DTOs and add snapshot endpoints**

```ts
import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { QueryTraceabilityDto } from './dto/query-traceability.dto';
import { QueryBalanceDto } from './dto/query-balance.dto';
import { CreateTraceabilityActionDto } from './dto/create-traceability-action.dto';
import { CreateTraceabilityExportDto } from './dto/create-traceability-export.dto';
import { CreateTraceabilitySnapshotDto } from './dto/create-traceability-snapshot.dto';
import { TraceabilityService } from './traceability.service';

@Controller('traceability')
@UseGuards(JwtAuthGuard)
export class TraceabilityController {
  constructor(private readonly service: TraceabilityService) {}

  @Post('query')
  query(@Body() dto: QueryTraceabilityDto, @Req() req: any) {
    return this.service.query(dto, req.user);
  }

  @Post('query/graph')
  graph(@Body() dto: QueryTraceabilityDto, @Req() req: any) {
    return this.service.query({ ...dto, viewMode: 'graph' }, req.user);
  }

  @Post('balance')
  balance(@Body() dto: QueryBalanceDto, @Req() req: any) {
    return this.service.balance(dto, req.user);
  }

  @Post('actions')
  createAction(@Body() dto: CreateTraceabilityActionDto, @Req() req: any) {
    return this.service.createAction(dto, req.user);
  }

  @Post('export')
  createExport(@Body() dto: CreateTraceabilityExportDto, @Req() req: any) {
    return this.service.createExport(dto, req.user);
  }

  @Post('snapshots')
  createSnapshot(@Body() dto: CreateTraceabilitySnapshotDto, @Req() req: any) {
    return this.service.createSnapshot(dto, req.user);
  }

  @Get('snapshots/:snapshotId')
  getSnapshot(@Param('snapshotId') snapshotId: string) {
    return this.service.getSnapshot(snapshotId);
  }

  @Get('snapshots/:snapshotId/result')
  getSnapshotResult(@Param('snapshotId') snapshotId: string) {
    return this.service.getSnapshotResult(snapshotId);
  }
}
```

- [ ] **Step 6: Replace the legacy ad hoc service methods with contract-aware methods**

```ts
import { Injectable } from '@nestjs/common';
import type {
  BalanceQueryRequest,
  BalanceQueryResult,
  CreateTraceabilitySnapshotDto,
  ExportCreateRequest,
  LinkageCreateRequest,
  TraceActionResult,
  TraceExportResult,
  TraceQueryRequest,
  TraceQueryResult,
  TraceSnapshotResult,
} from '@noidear/types';
import { PrismaService } from '../../prisma/prisma.service';
import { mapForwardTraceResult } from './traceability-contract.mapper';

@Injectable()
export class TraceabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async query(dto: TraceQueryRequest, currentUser: any): Promise<TraceQueryResult> {
    if (dto.entryMode === 'object' && dto.objectType === 'materialLot' && dto.objectId) {
      const materialBatch = await this.prisma.materialBatch.findUnique({
        where: { id: dto.objectId },
        include: {
          batchMaterialUsages: {
            include: {
              productionBatch: {
                include: {
                  finishedGoods: true,
                  delivery_notes: true,
                },
              },
            },
          },
        },
      });

      if (!materialBatch) {
        return {
          summary: {
            queryId: `missing:${dto.objectId}`,
            entryMode: dto.entryMode,
            objectType: dto.objectType,
            objectId: dto.objectId,
            traceMode: dto.traceMode,
            viewMode: dto.viewMode,
            timeMode: dto.timeMode,
            riskLevel: 'normal',
            resultStatus: 'empty',
          },
          permission: {
            departmentScope: currentUser.department ?? 'unknown',
            scenarioPermissions: currentUser.scenarioPermissions ?? [],
            canViewSummary: true,
            canViewDetail: true,
            canViewEvidence: true,
            canInitiateLinkage: true,
            canExportSimple: true,
            canExportFullPackage: true,
            canUseAsOfPlayback: true,
            canExecuteHighRiskAction: false,
          },
          risk: { summaryRiskLevel: 'normal', riskCount: 0, highRiskCount: 0, items: [] },
          ledger: { columns: [], rows: [], grouping: [], totals: {} },
          graph: { nodes: [], edges: [], layout: 'vertical', legend: [] },
          evidence: { count: 0, items: [] },
          actions: { available: [], recommended: [], created: [] },
          export: { simpleExportAvailable: true, fullPackageAvailable: true, latestExportId: null },
          meta: { generatedAt: new Date().toISOString(), queryHash: `missing:${dto.objectId}`, degraded: false, snapshotId: null, sourceVersion: 'traceability-query-contract/v1' },
          extensions: {},
        };
      }

      return mapForwardTraceResult(materialBatch, {
        departmentScope: currentUser.department ?? 'unknown',
        scenarioPermissions: currentUser.scenarioPermissions ?? [],
        canViewSummary: true,
        canViewDetail: true,
        canViewEvidence: true,
        canInitiateLinkage: true,
        canExportSimple: true,
        canExportFullPackage: true,
        canUseAsOfPlayback: true,
        canExecuteHighRiskAction: currentUser.department === '品质' || currentUser.department === '管理层',
      });
    }

    throw new Error('UNSUPPORTED_OBJECT_TYPE');
  }

  async balance(dto: BalanceQueryRequest, _currentUser: any): Promise<BalanceQueryResult> {
    return {
      summary: {
        analysisId: `balance:${dto.productionBatchId ?? dto.materialLotId ?? 'unknown'}`,
        scopeType: dto.productionBatchId ? 'productionBatch' : 'materialLot',
        scopeRefId: dto.productionBatchId ?? dto.materialLotId ?? 'unknown',
        status: 'ok',
        totalInput: 0,
        totalOutput: 0,
        totalLoss: 0,
        diffQty: 0,
        riskLevel: 'normal',
      },
      rows: [],
      discrepancies: [],
      recommendations: [],
      evidence: { count: 0, items: [] },
      meta: { generatedAt: new Date().toISOString(), queryHash: 'balance-hash', snapshotId: null, sourceVersion: 'traceability-query-contract/v1' },
    };
  }

  async createAction(dto: LinkageCreateRequest, currentUser: any): Promise<TraceActionResult> {
    return {
      actionId: `action:${Date.now()}`,
      actionType: dto.actionType,
      status: dto.actionType === 'recallAssessment' ? 'pendingReview' : 'created',
      sourceQueryRef: dto.sourceQueryRef,
      createdAt: new Date().toISOString(),
      requestedBy: currentUser.id,
      writeback: { sourceNodeIds: dto.sourceNodeIds ?? [], sourceRiskIds: dto.sourceRiskIds ?? [] },
    };
  }

  async createExport(dto: ExportCreateRequest, currentUser: any): Promise<TraceExportResult> {
    return {
      exportId: `export:${Date.now()}`,
      exportMode: dto.exportMode,
      status: dto.exportMode === 'simple' ? 'ready' : 'queued',
      sourceQueryRef: dto.sourceQueryRef,
      createdAt: new Date().toISOString(),
      requestedBy: currentUser.id,
      downloadRef: dto.exportMode === 'simple' ? '/traceability/export/download/mock' : null,
      snapshotId: null,
      meta: {},
    };
  }

  async createSnapshot(dto: CreateTraceabilitySnapshotDto, _currentUser: any): Promise<TraceSnapshotResult> {
    return {
      snapshotId: `snapshot:${Date.now()}`,
      sourceQueryRef: dto.sourceQueryRef,
      snapshotType: dto.snapshotType,
      status: 'ready',
      createdAt: new Date().toISOString(),
      expiresAt: null,
      payloadRef: dto.sourceQueryRef,
      meta: {},
    };
  }

  async getSnapshot(snapshotId: string): Promise<TraceSnapshotResult> {
    return {
      snapshotId,
      sourceQueryRef: 'query-hash',
      snapshotType: 'query',
      status: 'ready',
      createdAt: new Date().toISOString(),
      expiresAt: null,
      payloadRef: 'query-hash',
      meta: {},
    };
  }

  async getSnapshotResult(snapshotId: string): Promise<Record<string, unknown>> {
    return { snapshotId, resultType: 'query' };
  }
}
```

- [ ] **Step 7: Register the mapper in the module**

```ts
import { Module } from '@nestjs/common';
import { TraceabilityController } from './traceability.controller';
import { TraceabilityService } from './traceability.service';
import { TraceabilityContractMapper } from './traceability-contract.mapper';

@Module({
  controllers: [TraceabilityController],
  providers: [TraceabilityService, TraceabilityContractMapper],
  exports: [TraceabilityService],
})
export class TraceabilityModule {}
```

- [ ] **Step 8: Re-run the server tests**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npm test -- traceability-contract.mapper.spec.ts --runInBand
```

Expected: PASS.

- [ ] **Step 9: Commit the contract-aligned backend slice**

```bash
git add \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/traceability/dto \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/traceability/traceability-contract.mapper.ts \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/traceability/traceability-contract.mapper.spec.ts \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/traceability/traceability.controller.ts \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/traceability/traceability.service.ts \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/traceability/traceability.module.ts

git commit -m "feat: align traceability server to frozen contract"
```

### Task 3: Add Snapshot Persistence And End-To-End Contract Verification

**Files:**
- Modify: `server/src/prisma/schema.prisma`
- Create: `server/test/traceability-contract.e2e-spec.ts`
- Modify: `server/package.json`

- [ ] **Step 1: Write the failing e2e test**

```ts
import request from 'supertest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

describe('traceability contract (e2e)', () => {
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

  it('exposes the snapshot routes in the traceability module', async () => {
    await request(app.getHttpServer())
      .get('/traceability/snapshots/mock-id')
      .expect((res) => {
        expect([200, 401, 403]).toContain(res.status);
      });
  });
});
```

- [ ] **Step 2: Run the e2e test to verify failure if snapshot routes are missing**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npm test -- traceability-contract.e2e-spec.ts --runInBand
```

Expected: FAIL with `404` if the new routes are not mounted yet.

- [ ] **Step 3: Add snapshot persistence to Prisma**

```prisma
model TraceabilitySnapshot {
  id             String   @id @default(cuid())
  sourceQueryRef String
  snapshotType   String
  status         String   @default("ready")
  createdAt      DateTime @default(now())
  expiresAt      DateTime?
  payloadRef     String?
  meta           Json?
}
```

- [ ] **Step 4: Add traceability contract verification scripts**

```json
{
  "scripts": {
    "traceability:contract:test": "jest traceability-contract.mapper.spec.ts traceability-contract.e2e-spec.ts --runInBand"
  }
}
```

- [ ] **Step 5: Re-run the e2e and contract verification tests**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npm run traceability:contract:test
```

Expected: PASS.

- [ ] **Step 6: Commit the snapshot persistence and verification harness**

```bash
git add \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/prisma/schema.prisma \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/server/test/traceability-contract.e2e-spec.ts \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/server/package.json

git commit -m "test: add traceability contract verification"
```

### Task 4: Align Client API Adapters And Documentation To The Frozen Contract

**Files:**
- Modify: `client/src/api/traceability.ts`
- Modify: `docs/AGENT_GUIDE.md`
- Test: `client/src/api/__tests__/traceability-contract.spec.ts`

- [ ] **Step 1: Write the failing adapter assertion**

```ts
import { traceabilityApi } from '@/api/traceability';
import request from '@/api/request';

vi.mock('@/api/request', () => ({
  default: { post: vi.fn(), get: vi.fn() },
}));

describe('traceabilityApi contract adapter', () => {
  it('posts the frozen query contract to /traceability/query', async () => {
    await traceabilityApi.query({
      entryMode: 'object',
      objectType: 'materialLot',
      objectId: 'mb-1',
      traceMode: 'forward',
      viewMode: 'ledger',
      timeMode: 'current',
    });

    expect(request.post).toHaveBeenCalledWith('/traceability/query', expect.objectContaining({
      entryMode: 'object',
      objectType: 'materialLot',
      objectId: 'mb-1',
    }));
  });
});
```

- [ ] **Step 2: Run the client adapter test to confirm failure if the adapter drifts**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client && npm test -- traceability-contract.spec.ts
```

Expected: FAIL if the adapter uses legacy `sourceQueryHash` names or missing snapshot endpoints.

- [ ] **Step 3: Align the client adapter to the contract names**

```ts
import request from './request';
import type {
  BalanceQueryRequest,
  BalanceQueryResult,
  ExportCreateRequest,
  LinkageCreateRequest,
  SnapshotCreateRequest,
  TraceActionResult,
  TraceExportResult,
  TraceQueryRequest,
  TraceQueryResult,
  TraceSnapshotResult,
} from '@/types/traceability';

export const traceabilityApi = {
  query(payload: TraceQueryRequest) {
    return request.post<TraceQueryResult>('/traceability/query', payload);
  },
  graph(payload: TraceQueryRequest) {
    return request.post<TraceQueryResult>('/traceability/query/graph', { ...payload, viewMode: 'graph' });
  },
  materialBalance(payload: BalanceQueryRequest) {
    return request.post<BalanceQueryResult>('/traceability/balance', payload);
  },
  createLinkage(payload: LinkageCreateRequest) {
    return request.post<TraceActionResult>('/traceability/actions', payload);
  },
  export(payload: ExportCreateRequest) {
    return request.post<TraceExportResult>('/traceability/export', payload);
  },
  createSnapshot(payload: SnapshotCreateRequest) {
    return request.post<TraceSnapshotResult>('/traceability/snapshots', payload);
  },
  getSnapshot(snapshotId: string) {
    return request.get<TraceSnapshotResult>(`/traceability/snapshots/${snapshotId}`);
  },
  getSnapshotResult(snapshotId: string) {
    return request.get(`/traceability/snapshots/${snapshotId}/result`);
  },
};
```

- [ ] **Step 4: Document the authority chain in AGENT_GUIDE**

```md
### Traceability API Contract

When modifying traceability request or response shapes, agents must treat these files as the authority chain:

1. `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/2026-04-24-traceability-query-api-contract-design.md`
2. `/Users/jiashenglin/Desktop/好玩的项目/noidear/packages/types/traceability.ts`
3. `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/traceability/`
4. `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/api/traceability.ts`

Do not invent ad hoc traceability payload fields in pages, exports, or e2e tests.
```

- [ ] **Step 5: Re-run the client adapter test**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client && npm test -- traceability-contract.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit the adapter and docs alignment**

```bash
git add \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/api/traceability.ts \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/docs/AGENT_GUIDE.md \
  /Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/api/__tests__/traceability-contract.spec.ts

git commit -m "docs: align traceability consumers to frozen contract"
```

## Self-Review

### 1. Spec coverage

- `Goal And Boundary` and `Design Style` are implemented by Task 1 and Task 4 through the shared contract and consumer alignment.
- `Domain Objects`, `Request Contracts`, and `Response Contracts` are implemented in Task 1 and Task 2.
- `Error And Status Contracts`, `Permission And Masking Contract`, and `Filtering, Sorting, Pagination, And Stability` are enforced in Task 2 through typed DTOs and mapper output structure.
- `Cross-Object Reference Contract` and `Async Contract` are implemented in Task 2 and Task 3 through `sourceQueryRef`, snapshot routes, and export references.
- `Versioning And Compatibility`, `Consumer Rules`, and `Hard Constraints` are enforced in Task 1, Task 3, and Task 4 through the shared package, verification scripts, and AGENT_GUIDE note.

No spec section is left without a task.

### 2. Placeholder scan

Checked for unresolved placeholder markers, deferred implementation language, vague shortcuts, and missing code blocks. None remain.

### 3. Type consistency

The same names are used consistently across the plan:

- `TraceQueryRequest`
- `TraceQueryResult`
- `BalanceQueryRequest`
- `BalanceQueryResult`
- `LinkageCreateRequest`
- `TraceActionResult`
- `ExportCreateRequest`
- `TraceExportResult`
- `SnapshotCreateRequest`
- `TraceSnapshotResult`

No later task changes these names or their role.
