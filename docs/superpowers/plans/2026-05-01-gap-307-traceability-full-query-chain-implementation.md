# GAP-307 Traceability Full Query Chain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` only to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Execution must happen in an 独立 worktree or Multica 隔离工作目录, never in the main checkout `/Users/jiashenglin/Desktop/好玩的项目/noidear`.

**Goal:** 补齐 `/traceability` 权威查询链路，使 `materialLot`、`productionBatch`、`deliveryNote` 和场景工作台都返回冻结 `TraceQueryResult` 合同。

**Architecture:** `TraceabilityController` 继续调用 `TraceabilityService`；`TraceabilityService.query()` 只作为门面委托 `TraceabilityQueryService.query()`；`TraceabilityQueryService` 负责构建 `MaterialBatch -> BatchMaterialUsage -> ProductionBatch -> DeliveryNote` 主链、ledger、graph、risk、permission 和空结果壳。前端只调整场景到 traceMode/API 的映射，不发明新合同字段。

**Tech Stack:** NestJS, Prisma, Jest, Vue 3, Vitest, Element Plus, shared TypeScript types from `packages/types/traceability.ts`.

---

## Superpower 与 grill-me 校准记录

- 已按 `brainstorming` 形成 spec：`docs/superpowers/specs/2026-05-01-gap-307-traceability-full-query-chain-design.md`。
- 已按 `grill-with-docs` 对齐 `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`：本 GAP 复用 `MaterialBatch / BatchMaterialUsage / ProductionBatch / DeliveryNote`，不新增主数据、批次模型或平行追溯链。
- 已核对 GAP-306 当前 master 事实：`TraceabilityModule` 已注册四个子服务，本 GAP 不再处理 DI 接线。
- 本 plan 只允许执行 agent 使用 `superpowers:executing-plans`；不得使用 `brainstorming` 重写范围，不得执行 schema/migration，不得删除 legacy endpoint。
- 执行前必须运行隔离检查；如果 `pwd` 是 `/Users/jiashenglin/Desktop/好玩的项目/noidear`，必须停止并回报。
- 停止条件：如果当前代码已经和本 plan 描述不一致，例如 `TraceabilityService.query()` 已不再是权威门面，或 `packages/types/traceability.ts` 合同字段已变更，执行 agent 必须停止并回报，不得自行改合同。

## Files

- Modify: `server/src/modules/traceability/traceability.service.ts`
- Modify: `server/src/modules/traceability/traceability-query.service.ts`
- Modify: `server/src/modules/traceability/traceability-contract.mapper.ts`
- Modify: `server/src/modules/traceability/traceability-query.service.spec.ts`
- Modify: `server/src/modules/traceability/traceability-contract.mapper.spec.ts`
- Modify: `client/src/views/traceability/TraceabilityQuery.vue`
- Modify: `client/src/views/traceability/components/ScenarioWorkbenchPanel.vue`
- Modify: `client/src/views/traceability/__tests__/TraceabilityQuery.spec.ts`

## Task 1: Verify isolated worktree and current baseline

- [ ] **Step 1: Confirm execution is isolated**

Run:

```bash
git worktree list --porcelain
pwd
git branch --show-current
git status --short --branch
```

Expected: `pwd` is not `/Users/jiashenglin/Desktop/好玩的项目/noidear`; status is clean except for this task's intended edits.

- [ ] **Step 2: Confirm GAP-306 wiring is present**

Run:

```bash
sed -n '1,120p' server/src/modules/traceability/traceability.module.ts
```

Expected: providers include `TraceabilityQueryService`, `TraceabilityLinkageService`, `TraceabilityExportService`, and `TraceabilityBalanceService`.

## Task 2: Add failing tests for production batch and delivery note queries

**Files:**

- Modify: `server/src/modules/traceability/traceability-query.service.spec.ts`
- Modify: `server/src/modules/traceability/traceability-contract.mapper.spec.ts`

- [ ] **Step 1: Replace the old array-ledger expectation with frozen contract expectations**

In `server/src/modules/traceability/traceability-query.service.spec.ts`, update the first test assertion to expect the frozen shape:

```ts
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
  ledger: expect.objectContaining({ rows: expect.any(Array) }),
  graph: expect.objectContaining({ nodes: expect.any(Array), edges: expect.any(Array) }),
  risk: expect.objectContaining({ items: expect.any(Array) }),
  evidence: expect.objectContaining({ items: expect.any(Array) }),
  permission: expect.objectContaining({ canInitiateLinkage: expect.any(Boolean) }),
});
```

- [ ] **Step 2: Add a production batch bidirectional query test**

Append this test to `traceability-query.service.spec.ts`:

```ts
it('assembles a bidirectional chain for a production batch query', async () => {
  const prisma = {
    productionBatch: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'pb-1',
        batchNumber: 'PB-001',
        productName: '海绵蛋糕',
        status: 'completed',
        materialUsages: [
          {
            id: 'use-1',
            quantity: 25,
            materialBatch: {
              id: 'mb-1',
              batchNumber: 'RM-001',
              supplierBatchNo: 'SUP-001',
              material: { id: 'mat-1', name: '面粉' },
              supplier: { id: 'sup-1', name: '合格供应商' },
            },
          },
        ],
        delivery_notes: [
          {
            id: 10,
            dn_no: 'DN-001',
            customer_name: '客户A',
            shipped_qty: 100,
            unit: '箱',
          },
        ],
      }),
    },
  };

  const service = new TraceabilityQueryService(prisma as any, { getSummary: jest.fn() } as any);
  const result = await service.query(
    {
      entryMode: 'object',
      objectType: 'productionBatch',
      objectId: 'pb-1',
      traceMode: 'bidirectional',
      viewMode: 'ledger',
      timeMode: 'current',
    },
    { department: '品质', scenarioPermissions: ['bidirectionalTrace'] } as any,
  );

  expect(result.summary).toMatchObject({
    objectType: 'productionBatch',
    objectId: 'pb-1',
    traceMode: 'bidirectional',
    resultStatus: 'ok',
  });
  expect(result.ledger.rows.map((row) => row.nodeType)).toEqual([
    'materialLot',
    'ingredientUsage',
    'productionBatch',
    'deliveryNote',
  ]);
  expect(result.graph.edges.map((edge) => edge.relationType)).toEqual([
    'usedIn',
    'produces',
    'shippedBy',
  ]);
});
```

- [ ] **Step 3: Add a delivery note backward query test**

Append this test:

```ts
it('assembles a backward chain from a delivery note query', async () => {
  const prisma = {
    deliveryNote: {
      findUnique: jest.fn().mockResolvedValue({
        id: 10,
        dn_no: 'DN-001',
        customer_name: '客户A',
        shipped_qty: 100,
        unit: '箱',
        production_batch: {
          id: 'pb-1',
          batchNumber: 'PB-001',
          productName: '海绵蛋糕',
          materialUsages: [
            {
              id: 'use-1',
              quantity: 25,
              materialBatch: {
                id: 'mb-1',
                batchNumber: 'RM-001',
                material: { id: 'mat-1', name: '面粉' },
                supplier: { id: 'sup-1', name: '合格供应商' },
              },
            },
          ],
        },
      }),
    },
  };

  const service = new TraceabilityQueryService(prisma as any, { getSummary: jest.fn() } as any);
  const result = await service.query(
    {
      entryMode: 'object',
      objectType: 'deliveryNote',
      objectId: '10',
      traceMode: 'backward',
      viewMode: 'ledger',
      timeMode: 'current',
    },
    { department: '品质', scenarioPermissions: ['backwardTrace'] } as any,
  );

  expect(result.summary).toMatchObject({
    objectType: 'deliveryNote',
    objectId: '10',
    traceMode: 'backward',
    resultStatus: 'ok',
  });
  expect(result.ledger.rows.map((row) => row.nodeType)).toEqual([
    'deliveryNote',
    'productionBatch',
    'ingredientUsage',
    'materialLot',
  ]);
});
```

- [ ] **Step 4: Run tests and verify they fail before implementation**

Run:

```bash
npm --prefix server test -- traceability-query.service.spec.ts traceability-contract.mapper.spec.ts --runInBand
```

Expected: FAIL because `TraceabilityQueryService` still returns array `ledger` and does not support `productionBatch` or `deliveryNote`.

## Task 3: Refactor contract mapper into reusable chain builders

**Files:**

- Modify: `server/src/modules/traceability/traceability-contract.mapper.ts`
- Modify: `server/src/modules/traceability/traceability-contract.mapper.spec.ts`

- [ ] **Step 1: Add helper functions and row builders**

In `traceability-contract.mapper.ts`, keep `SOURCE_VERSION` and add these helpers near the top:

```ts
const toStringId = (value: unknown) => String(value ?? '');

const labelOf = (entity: any, keys: string[], fallback: string) => {
  for (const key of keys) {
    if (entity?.[key] !== undefined && entity?.[key] !== null && String(entity[key]).length > 0) {
      return String(entity[key]);
    }
  }
  return fallback;
};

const node = (
  nodeId: string,
  nodeType: string,
  businessObject: string,
  label: string,
  attributes: Record<string, unknown> = {},
) => ({
  nodeId,
  nodeType,
  businessObject,
  label,
  batchNo: label,
  riskLevel: 'normal' as const,
  permission: defaultPermission(),
  attributes,
});

export const edge = (
  sourceNodeId: string,
  targetNodeId: string,
  relationType: string,
  direction: 'forward' | 'backward' | 'bidirectional',
  index: number,
) => ({
  edgeId: `${relationType}:${sourceNodeId}:${targetNodeId}:${index}`,
  sourceNodeId,
  targetNodeId,
  relationType,
  direction,
  isMainChain: true,
  isAuxiliary: false,
  riskLevel: 'normal' as const,
});
```

- [ ] **Step 2: Add a shared result wrapper**

Add a `buildTraceResult` function:

```ts
export function buildTraceResult(input: {
  queryId: string;
  entryMode: 'object' | 'scenario';
  objectType?: string;
  objectId?: string;
  scenario?: string;
  traceMode: 'forward' | 'backward' | 'bidirectional';
  viewMode: 'ledger' | 'graph';
  timeMode: 'current' | 'asOf';
  asOfAt?: string;
  permission: any;
  rows: any[];
  edges: any[];
}) {
  return {
    summary: {
      queryId: input.queryId,
      entryMode: input.entryMode,
      objectType: input.objectType,
      objectId: input.objectId,
      scenario: input.scenario,
      traceMode: input.traceMode,
      viewMode: input.viewMode,
      timeMode: input.timeMode,
      asOfAt: input.asOfAt,
      riskLevel: 'normal' as const,
      resultStatus: input.rows.length ? 'ok' as const : 'empty' as const,
    },
    permission: input.permission,
    risk: { summaryRiskLevel: 'normal' as const, riskCount: 0, highRiskCount: 0, items: [] },
    ledger: {
      columns: [{ key: 'label', label: '节点' }],
      rows: input.rows,
      grouping: ['nodeType'],
      totals: { rowCount: input.rows.length },
    },
    graph: {
      nodes: input.rows,
      edges: input.edges,
      layout: 'vertical',
      legend: ['mainChain'],
    },
    evidence: {
      count: input.rows.length,
      items: input.rows.map((row) => ({ type: 'record' as const, label: row.label, refId: row.nodeId })),
    },
    actions: { available: ['deviation', 'complaint', 'recallAssessment'], recommended: [], created: [] },
    export: { simpleExportAvailable: true, fullPackageAvailable: true, latestExportId: null as string | null },
    meta: baseMeta(),
    extensions: {},
  };
}
```

- [ ] **Step 3: Replace `mapForwardTraceResult` internals with the shared wrapper**

Keep the export name so existing imports continue working:

```ts
export function mapForwardTraceResult(materialBatch: any, permission: any): any {
  const rows = [materialLotNode(materialBatch)];
  const edges: any[] = [];

  for (const usage of materialBatch.batchMaterialUsages ?? []) {
    const usageNode = ingredientUsageNode(usage);
    const productionNode = productionBatchNode(usage.productionBatch);
    rows.push(usageNode, productionNode);
    edges.push(edge(materialBatch.id, usage.id, 'usedIn', 'forward', edges.length));
    edges.push(edge(usage.id, usage.productionBatch.id, 'produces', 'forward', edges.length));

    for (const dn of usage.productionBatch.delivery_notes ?? []) {
      const deliveryNode = deliveryNoteNode(dn);
      rows.push(deliveryNode);
      edges.push(edge(usage.productionBatch.id, toStringId(dn.id), 'shippedBy', 'forward', edges.length));
    }
  }

  return buildTraceResult({
    queryId: `forward:${materialBatch.id}`,
    entryMode: 'object',
    objectType: 'materialLot',
    objectId: materialBatch.id,
    traceMode: 'forward',
    viewMode: 'ledger',
    timeMode: 'current',
    permission,
    rows,
    edges,
  });
}
```

Implement the referenced helpers in the same file:

```ts
export const materialLotNode = (materialBatch: any) =>
  node(
    materialBatch.id,
    'materialLot',
    'MaterialBatch',
    labelOf(materialBatch, ['batch_no', 'batchNumber', 'supplierBatchNo'], materialBatch.id),
    {
      materialId: materialBatch.materialId ?? materialBatch.material?.id,
      materialName: materialBatch.material?.name,
      supplierId: materialBatch.supplierId ?? materialBatch.supplier?.id,
      supplierName: materialBatch.supplier?.name,
    },
  );

export const ingredientUsageNode = (usage: any) =>
  node(usage.id, 'ingredientUsage', 'BatchMaterialUsage', `投料 ${usage.quantity}`, {
    quantity: usage.quantity,
    materialBatchId: usage.materialBatchId ?? usage.materialBatch?.id,
    productionBatchId: usage.productionBatchId ?? usage.productionBatch?.id,
  });

export const productionBatchNode = (productionBatch: any) =>
  node(
    productionBatch.id,
    'productionBatch',
    'ProductionBatch',
    labelOf(productionBatch, ['batch_no', 'batchNumber', 'productName'], productionBatch.id),
    {
      productId: productionBatch.productId,
      productName: productionBatch.productName,
      status: productionBatch.status,
    },
  );

export const deliveryNoteNode = (deliveryNote: any) =>
  node(toStringId(deliveryNote.id), 'deliveryNote', 'DeliveryNote', labelOf(deliveryNote, ['delivery_no', 'dn_no'], toStringId(deliveryNote.id)), {
    customerName: deliveryNote.customer_name,
    shippedQty: deliveryNote.shipped_qty,
    unit: deliveryNote.unit,
  });
```

- [ ] **Step 4: Add mapper tests for field-name compatibility**

Add to `traceability-contract.mapper.spec.ts`:

```ts
it('uses current Prisma field names when building labels', () => {
  const result = mapForwardTraceResult({
    id: 'mb-1',
    batchNumber: 'RM-001',
    batchMaterialUsages: [
      {
        id: 'use-1',
        quantity: 10,
        productionBatch: {
          id: 'pb-1',
          batchNumber: 'PB-001',
          delivery_notes: [{ id: 10, dn_no: 'DN-001' }],
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

  expect(result.ledger.rows.map((row: any) => row.label)).toContain('RM-001');
  expect(result.ledger.rows.map((row: any) => row.label)).toContain('PB-001');
  expect(result.ledger.rows.map((row: any) => row.label)).toContain('DN-001');
});
```

## Task 4: Make `TraceabilityQueryService` the single query algorithm

**Files:**

- Modify: `server/src/modules/traceability/traceability-query.service.ts`
- Modify: `server/src/modules/traceability/traceability.service.ts`

- [ ] **Step 1: Import shared types and mapper helpers**

In `traceability-query.service.ts`, replace the local `TraceQueryResult` interface with imports:

```ts
import type { TraceQueryResult } from '@noidear/types';
import {
  SOURCE_VERSION,
  buildTraceResult,
  deliveryNoteNode,
  edge,
  ingredientUsageNode,
  materialLotNode,
  productionBatchNode,
} from './traceability-contract.mapper';
```

- [ ] **Step 2: Add permission and empty result helpers**

Use this implementation in `TraceabilityQueryService`:

```ts
private buildPermissionView(currentUser: any) {
  return {
    departmentScope: currentUser?.department ?? 'unknown',
    scenarioPermissions: currentUser?.scenarioPermissions ?? [],
    canViewSummary: true,
    canViewDetail: currentUser?.department !== '访客',
    canViewEvidence: currentUser?.department !== '访客',
    canInitiateLinkage: Boolean(currentUser?.scenarioPermissions?.length),
    canExportSimple: true,
    canExportFullPackage: currentUser?.department === '品质' || currentUser?.department === '管理层',
    canUseAsOfPlayback: true,
    canExecuteHighRiskAction:
      currentUser?.department === '品质' || currentUser?.department === '管理层',
  };
}

private emptyResult(dto: QueryTraceabilityDto, currentUser: any): TraceQueryResult {
  return {
    summary: {
      queryId: `empty:${dto.objectType ?? dto.scenario ?? 'unknown'}:${dto.objectId ?? 'none'}`,
      entryMode: dto.entryMode,
      objectType: dto.objectType,
      objectId: dto.objectId,
      scenario: dto.scenario,
      traceMode: dto.traceMode,
      viewMode: dto.viewMode,
      timeMode: dto.timeMode,
      asOfAt: dto.asOfAt,
      riskLevel: 'normal',
      resultStatus: 'empty',
    },
    permission: this.buildPermissionView(currentUser),
    risk: { summaryRiskLevel: 'normal', riskCount: 0, highRiskCount: 0, items: [] },
    ledger: { columns: [{ key: 'label', label: '节点' }], rows: [], grouping: ['nodeType'], totals: { rowCount: 0 } },
    graph: { nodes: [], edges: [], layout: 'vertical', legend: ['mainChain'] },
    evidence: { count: 0, items: [] },
    actions: { available: [], recommended: [], created: [] },
    export: { simpleExportAvailable: true, fullPackageAvailable: true, latestExportId: null },
    meta: {
      generatedAt: new Date().toISOString(),
      queryHash: `empty:${dto.objectId ?? dto.scenario ?? 'unknown'}`,
      degraded: false,
      snapshotId: null,
      sourceVersion: SOURCE_VERSION,
    },
    extensions: {},
  };
}
```

- [ ] **Step 3: Route object queries by object type**

Replace `buildLedger()` usage with object-specific methods:

```ts
async query(dto: QueryTraceabilityDto, currentUser: any): Promise<TraceQueryResult> {
  this.assertScenarioPermission(dto, currentUser);

  if (dto.entryMode === 'object' && dto.objectType === 'materialLot' && dto.objectId) {
    return this.queryMaterialLot(dto, currentUser);
  }
  if (dto.entryMode === 'object' && dto.objectType === 'productionBatch' && dto.objectId) {
    return this.queryProductionBatch(dto, currentUser);
  }
  if (dto.entryMode === 'object' && dto.objectType === 'deliveryNote' && dto.objectId) {
    return this.queryDeliveryNote(dto, currentUser);
  }
  if (dto.entryMode === 'scenario') {
    return this.queryScenario(dto, currentUser);
  }

  return this.emptyResult(dto, currentUser);
}
```

- [ ] **Step 4: Implement material lot query with frozen result**

Use current include shape and existing mapper:

```ts
private async queryMaterialLot(dto: QueryTraceabilityDto, currentUser: any): Promise<TraceQueryResult> {
  const materialLot = await this.prisma.materialBatch.findUnique({
    where: { id: dto.objectId },
    include: {
      material: true,
      supplier: true,
      batchMaterialUsages: {
        include: {
          productionBatch: {
            include: { delivery_notes: true },
          },
        },
      },
    },
  });

  if (!materialLot) return this.emptyResult(dto, currentUser);

  return buildTraceResult({
    queryId: `forward:${materialLot.id}`,
    entryMode: dto.entryMode,
    objectType: dto.objectType,
    objectId: dto.objectId,
    traceMode: dto.traceMode,
    viewMode: dto.viewMode,
    timeMode: dto.timeMode,
    asOfAt: dto.asOfAt,
    permission: this.buildPermissionView(currentUser),
    ...this.materialLotChain(materialLot, dto.traceMode),
  });
}
```

Add `materialLotChain(materialLot, direction)`:

```ts
private materialLotChain(materialLot: any, direction: 'forward' | 'backward' | 'bidirectional') {
  const rows = [materialLotNode(materialLot)];
  const edges: any[] = [];

  for (const usage of materialLot.batchMaterialUsages ?? []) {
    rows.push(ingredientUsageNode(usage));
    if (usage.productionBatch) rows.push(productionBatchNode(usage.productionBatch));
    edges.push(edge(materialLot.id, usage.id, 'usedIn', direction, edges.length));
    if (usage.productionBatch) {
      edges.push(edge(usage.id, usage.productionBatch.id, 'produces', direction, edges.length));
      for (const dn of usage.productionBatch.delivery_notes ?? []) {
        rows.push(deliveryNoteNode(dn));
        edges.push(edge(usage.productionBatch.id, String(dn.id), 'shippedBy', direction, edges.length));
      }
    }
  }

  return { rows, edges };
}
```

- [ ] **Step 5: Implement production batch query**

Add:

```ts
private async queryProductionBatch(dto: QueryTraceabilityDto, currentUser: any): Promise<TraceQueryResult> {
  const productionBatch = await this.prisma.productionBatch.findUnique({
    where: { id: dto.objectId },
    include: {
      materialUsages: {
        include: {
          materialBatch: {
            include: { material: true, supplier: true },
          },
        },
      },
      delivery_notes: true,
    },
  });

  if (!productionBatch) return this.emptyResult(dto, currentUser);
  const rows: any[] = [];
  const edges: any[] = [];

  for (const usage of productionBatch.materialUsages ?? []) {
    if (usage.materialBatch) rows.push(materialLotNode(usage.materialBatch));
    rows.push(ingredientUsageNode(usage));
    if (usage.materialBatch) edges.push(edge(usage.materialBatch.id, usage.id, 'usedIn', dto.traceMode, edges.length));
    edges.push(edge(usage.id, productionBatch.id, 'produces', dto.traceMode, edges.length));
  }

  rows.push(productionBatchNode(productionBatch));

  for (const dn of productionBatch.delivery_notes ?? []) {
    rows.push(deliveryNoteNode(dn));
    edges.push(edge(productionBatch.id, String(dn.id), 'shippedBy', dto.traceMode, edges.length));
  }

  return buildTraceResult({
    queryId: `${dto.traceMode}:${productionBatch.id}`,
    entryMode: dto.entryMode,
    objectType: dto.objectType,
    objectId: dto.objectId,
    traceMode: dto.traceMode,
    viewMode: dto.viewMode,
    timeMode: dto.timeMode,
    asOfAt: dto.asOfAt,
    permission: this.buildPermissionView(currentUser),
    rows,
    edges,
  });
}
```

- [ ] **Step 6: Implement delivery note query**

Add:

```ts
private async queryDeliveryNote(dto: QueryTraceabilityDto, currentUser: any): Promise<TraceQueryResult> {
  const deliveryId = Number(dto.objectId);
  if (!Number.isInteger(deliveryId)) return this.emptyResult(dto, currentUser);

  const deliveryNote = await this.prisma.deliveryNote.findUnique({
    where: { id: deliveryId },
    include: {
      production_batch: {
        include: {
          materialUsages: {
            include: {
              materialBatch: {
                include: { material: true, supplier: true },
              },
            },
          },
        },
      },
    },
  });

  if (!deliveryNote) return this.emptyResult(dto, currentUser);

  const rows: any[] = [deliveryNoteNode(deliveryNote)];
  const edges: any[] = [];
  const productionBatch = deliveryNote.production_batch;
  rows.push(productionBatchNode(productionBatch));
  edges.push(edge(String(deliveryNote.id), productionBatch.id, 'shipsFrom', 'backward', edges.length));

  for (const usage of productionBatch.materialUsages ?? []) {
    rows.push(ingredientUsageNode(usage));
    if (usage.materialBatch) rows.push(materialLotNode(usage.materialBatch));
    edges.push(edge(productionBatch.id, usage.id, 'containsUsage', 'backward', edges.length));
    if (usage.materialBatch) edges.push(edge(usage.id, usage.materialBatch.id, 'usesLot', 'backward', edges.length));
  }

  return buildTraceResult({
    queryId: `backward:${deliveryNote.id}`,
    entryMode: dto.entryMode,
    objectType: dto.objectType,
    objectId: dto.objectId,
    traceMode: dto.traceMode,
    viewMode: dto.viewMode,
    timeMode: dto.timeMode,
    asOfAt: dto.asOfAt,
    permission: this.buildPermissionView(currentUser),
    rows,
    edges,
  });
}
```

- [ ] **Step 7: Implement minimal scenario query routing**

Add:

```ts
private async queryScenario(dto: QueryTraceabilityDto, currentUser: any): Promise<TraceQueryResult> {
  const objectId = typeof dto.filters?.objectId === 'string' ? dto.filters.objectId : dto.objectId;
  const objectType = typeof dto.filters?.objectType === 'string' ? dto.filters.objectType : dto.objectType;

  if (!objectId || !objectType) return this.emptyResult(dto, currentUser);

  return this.query({ ...dto, entryMode: 'object', objectType, objectId }, currentUser);
}
```

- [ ] **Step 8: Make `TraceabilityService.query()` delegate to `TraceabilityQueryService`**

Change constructor and query in `traceability.service.ts`:

```ts
constructor(
  private readonly prisma: PrismaService,
  private readonly traceabilityQueryService: TraceabilityQueryService,
) {}

async query(dto: TraceQueryDto, currentUser: TraceCurrentUser) {
  return this.traceabilityQueryService.query(dto as any, currentUser);
}
```

Add import:

```ts
import { TraceabilityQueryService } from './traceability-query.service';
```

Keep `balance`, `createAction`, `createExport`, `createSnapshot`, `getSnapshot`, and `getSnapshotResult` unchanged.

## Task 5: Fix scenario workbench request mapping

**Files:**

- Modify: `client/src/views/traceability/TraceabilityQuery.vue`
- Modify: `client/src/views/traceability/components/ScenarioWorkbenchPanel.vue`
- Modify: `client/src/views/traceability/__tests__/TraceabilityQuery.spec.ts`

- [ ] **Step 1: Add object fields to scenario panel**

In `ScenarioWorkbenchPanel.vue`, add object type and object id controls after scenario select:

```vue
<el-col :span="5">
  <el-form-item label="对象类型">
    <el-select v-model="form.objectType" style="width: 100%">
      <el-option label="原料批次" value="materialLot" />
      <el-option label="产品批次" value="productionBatch" />
      <el-option label="发货单" value="deliveryNote" />
    </el-select>
  </el-form-item>
</el-col>
<el-col :span="6">
  <el-form-item label="对象编号">
    <el-input v-model="form.objectId" placeholder="批次号 / ID" clearable />
  </el-form-item>
</el-col>
```

Update form:

```ts
const form = reactive({
  scenario: 'forwardTrace',
  objectType: 'materialLot',
  objectId: '',
  asOfAt: '',
});
```

- [ ] **Step 2: Map scenario to trace mode**

In `ScenarioWorkbenchPanel.vue`, add:

```ts
const scenarioTraceMode = (scenario: string) => {
  if (scenario === 'backwardTrace' || scenario === 'complaintInvestigation' || scenario === 'recallAssessment') {
    return 'backward';
  }
  if (scenario === 'materialBalance') return 'bidirectional';
  return 'forward';
};
```

Update `handleSubmit()`:

```ts
const handleSubmit = () => {
  emit('submit', {
    scenario: form.scenario,
    entryMode: 'scenario',
    traceMode: scenarioTraceMode(form.scenario),
    viewMode: 'ledger',
    timeMode: asOfEnabled.value ? 'asOf' : 'current',
    asOfAt: form.asOfAt,
    filters: {
      objectType: form.objectType,
      objectId: form.objectId,
    },
  });
};
```

- [ ] **Step 3: Route material balance scenario to balance API**

In `TraceabilityQuery.vue`, update `runScenarioQuery`:

```ts
const runScenarioQuery = async (payload: any) => {
  error.value = '';
  try {
    if (payload.scenario === 'materialBalance') {
      const balance = await traceabilityApi.materialBalance({
        productionBatchId: payload.filters?.objectType === 'productionBatch' ? payload.filters.objectId : undefined,
        materialLotId: payload.filters?.objectType === 'materialLot' ? payload.filters.objectId : undefined,
        timeMode: payload.timeMode,
        asOfAt: payload.asOfAt,
        includeEvidence: true,
        includeRecommendations: true,
      });
      result.value = null;
      ElMessage.success(`物料平衡分析完成：${balance.summary.status}`);
      return;
    }

    result.value = await traceabilityApi.query({ ...payload, viewMode: activeView.value }) as TraceQueryResult;
  } catch {
    error.value = '场景分析失败，请稍后重试';
  }
};
```

- [ ] **Step 4: Update frontend test mock**

In `TraceabilityQuery.spec.ts`, add `materialBalance` to the mocked API:

```ts
materialBalance: vi.fn(),
```

- [ ] **Step 5: Add a focused scenario mapping test**

Append:

```ts
it('keeps the scenario workbench visible for traceability workflows', async () => {
  const wrapper = mount(TraceabilityQuery, {
    global: {
      stubs: {
        'el-card': { template: '<div><slot /></div>' },
        'el-radio-group': { template: '<div><slot /></div>' },
        'el-radio-button': { template: '<button><slot /></button>' },
        ObjectTraceQueryPanel: { template: '<div />' },
        ScenarioWorkbenchPanel: { template: '<div>场景工作台</div>' },
        TraceLedgerView: { template: '<div />' },
        TraceGraphView: { template: '<div />' },
        TraceRiskPanel: { template: '<div />' },
      },
    },
  });

  expect(wrapper.text()).toContain('场景工作台');
});
```

## Task 6: Run focused verification

- [ ] **Step 1: Run server traceability tests**

Run:

```bash
npm --prefix server run traceability:test
```

Expected: PASS.

- [ ] **Step 2: Run direct Jest target for query service and mapper**

Run:

```bash
npm --prefix server test -- traceability-query.service.spec.ts traceability-contract.mapper.spec.ts --runInBand
```

Expected: PASS.

- [ ] **Step 3: Run client traceability contract tests**

Run:

```bash
npm --prefix client test -- traceability
```

Expected: PASS for `traceability`-filtered Vitest files.

- [ ] **Step 4: Run static checks**

Run:

```bash
git diff --check
```

Expected: no whitespace errors.

## Task 7: Commit implementation

- [ ] **Step 1: Review diff scope**

Run:

```bash
git diff --stat
git diff -- server/src/modules/traceability client/src/views/traceability packages/types/traceability.ts
```

Expected: no schema, migration, legacy endpoint removal, or unrelated module changes. `packages/types/traceability.ts` should remain unchanged unless the execution agent stopped and got explicit approval.

- [ ] **Step 2: Commit**

Run:

```bash
git add server/src/modules/traceability client/src/views/traceability
git commit -m "feat: complete traceability query chain"
```

Expected: commit contains only GAP-307 implementation files and tests.
