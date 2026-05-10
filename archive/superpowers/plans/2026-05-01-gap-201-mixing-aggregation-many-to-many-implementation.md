# GAP-201 Mixing Aggregation Many-to-Many Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Do not use brainstorming, writing-plans, or redesign the master-data model during execution. Steps use checkbox (`- [ ]`) syntax for tracking. If current code disagrees with this plan, stop and report the mismatch to the main agent.

**Goal:** Restore `BatchMixingAggregation` as a true many-to-many bridge while making shared mixing executions explicit in service tests, traceability output, and batch detail display.

**Architecture:** Remove only the erroneous single-column unique constraint on `mixingExecutionId`; keep the composite unique key for one production batch plus one mixing execution. Treat `MixingExecutionLine.actualQuantity` as shared input-pool quantity, not per-batch allocated quantity, and surface shared links so users do not double count them mentally.

**Tech Stack:** Prisma schema/migration, NestJS services and Jest tests, Vue 3 + Element Plus, TypeScript API adapters.

---

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** 主 agent 已按 `using-superpowers -> using-git-worktrees -> brainstorming -> grill-with-docs -> writing-plans` 为 GAP-201 生成 spec 和本 implementation plan。
- **brainstorming 结论：** 采用“恢复多对多、无分摊字段”的方案；`BatchMixingAggregation` 表示产品批次暴露于配料投入池，不表示该产品批次独占消耗整套 `MixingExecutionLine.actualQuantity`。
- **grill-with-docs 校准结论：** 已对照 `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 和 历史 Multica GAP 模块文档，确认本计划不新增主数据、不引入平行批次链路、不破坏 `ProductionBatch / MaterialBatch / BatchMaterialUsage / InventoryMovement` 主链。
- **执行限制：** Multica 执行 agent 只能使用 `superpowers:executing-plans` 执行本计划；不得扩展到 GAP-202、GAP-203、GAP-204、GAP-206 或新链路物料平衡重算。
- **执行隔离：** 执行本计划前必须从最新 `origin/master` 创建独立 worktree，或使用 Multica 隔离工作目录；不得在主 checkout `/Users/jiashenglin/Desktop/好玩的项目/noidear` 直接修改、提交或 push。如发现当前目录是主 checkout，必须停止并回报主 agent。
- **停止条件：** 如果执行 agent 发现本计划与当前代码、`AGENTS.md`、`docs/AGENT_GUIDE.md`、`docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 或 spec 冲突，必须停止并回报主 agent，不得猜测实现。
- **物料平衡停止条件：** 如果执行时发现 `MaterialBalanceService` 或追溯查询层已经按 `BatchMixingAggregation` 汇总新链路用量，必须停止并回报主 agent，因为共享投入池需要先设计去重规则。

## File Map

All commands below assume the execution agent is at the root of its isolated `noidear` worktree or Multica checkout.

- Modify: `server/src/prisma/schema.prisma`
- Add: `server/src/prisma/migrations/20260501000300_batch_mixing_aggregation_many_to_many/migration.sql`
- Modify: `server/src/modules/batch-trace/services/batch-mixing-aggregation.service.ts`
- Modify: `server/src/modules/batch-trace/services/batch-mixing-aggregation.service.spec.ts`
- Modify: `server/src/modules/batch-trace/services/production-batch.service.ts`
- Modify: `server/src/modules/batch-trace/services/traceability.service.ts`
- Modify: `server/src/modules/batch-trace/services/traceability.service.spec.ts`
- Modify: `client/src/views/batch-trace/BatchDetail.vue`
- Do not modify: `server/src/modules/mixing/mixing.service.ts`
- Do not modify: `server/src/modules/warehouse/material-balance.service.ts`
- Do not modify: `server/src/modules/warehouse/`

## Task 1: Add backend regression tests for shared mixing execution links

**Files:**
- Modify: `server/src/modules/batch-trace/services/batch-mixing-aggregation.service.spec.ts`

- [ ] **Step 1: Replace the rejection test with an allow-shared test**

Replace the test named `rejects when an execution is already aggregated to a different product batch` with:

```ts
    it('allows one confirmed execution to be aggregated to another matching product batch', async () => {
      prisma.productionBatch.findUnique.mockResolvedValue({
        id: 'pb-new',
        productId: 'product-1',
        recipeId: 'recipe-1',
      });
      prisma.mixingExecution.findMany.mockResolvedValue([
        { id: 'mix-1', productId: 'product-1', recipeId: 'recipe-1', status: 'confirmed' },
      ]);
      prisma.$transaction.mockResolvedValue([{ id: 'agg-new', productionBatchId: 'pb-new', mixingExecutionId: 'mix-1' }]);

      const result = await service.create({
        productionBatchId: 'pb-new',
        mixingExecutionIds: ['mix-1'],
      });

      expect(result).toHaveLength(1);
      expect(prisma.batchMixingAggregation.findMany).not.toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ mixingExecutionId: expect.anything() }),
        }),
      );
    });
```

- [ ] **Step 2: Add a same-batch idempotency test**

Add this test after the allow-shared test:

```ts
    it('upserts the same production batch and execution pair instead of creating duplicates', async () => {
      prisma.productionBatch.findUnique.mockResolvedValue({
        id: 'pb-1',
        productId: 'product-1',
        recipeId: 'recipe-1',
      });
      prisma.mixingExecution.findMany.mockResolvedValue([
        { id: 'mix-1', productId: 'product-1', recipeId: 'recipe-1', status: 'confirmed' },
      ]);
      prisma.$transaction.mockResolvedValue([{ id: 'agg-existing', productionBatchId: 'pb-1', mixingExecutionId: 'mix-1' }]);

      await service.create({
        productionBatchId: 'pb-1',
        mixingExecutionIds: ['mix-1'],
        note: 'reuse same pair',
      });

      expect(prisma.batchMixingAggregation.upsert).toHaveBeenCalledWith({
        where: {
          productionBatchId_mixingExecutionId: {
            productionBatchId: 'pb-1',
            mixingExecutionId: 'mix-1',
          },
        },
        create: {
          productionBatchId: 'pb-1',
          mixingExecutionId: 'mix-1',
          status: 'draft',
          note: 'reuse same pair',
        },
        update: {
          note: 'reuse same pair',
        },
      });
    });
```

- [ ] **Step 3: Run the focused test and verify current failure**

```bash
(cd server && npm test -- batch-mixing-aggregation.service.spec.ts --runInBand)
```

Expected: FAIL because the current service still rejects a `mixingExecutionId` already linked to a different `productionBatchId`.

## Task 2: Remove the one-execution-one-batch schema constraint

**Files:**
- Modify: `server/src/prisma/schema.prisma`
- Add: `server/src/prisma/migrations/20260501000300_batch_mixing_aggregation_many_to_many/migration.sql`

- [ ] **Step 1: Update the Prisma model**

In `model BatchMixingAggregation`, replace:

```prisma
  @@unique([productionBatchId, mixingExecutionId])
  @@unique([mixingExecutionId], map: "agg_exec_unique")
  @@map("batch_mixing_aggregations")
```

with:

```prisma
  @@unique([productionBatchId, mixingExecutionId])
  @@index([mixingExecutionId])
  @@map("batch_mixing_aggregations")
```

- [ ] **Step 2: Add migration SQL**

Create `server/src/prisma/migrations/20260501000300_batch_mixing_aggregation_many_to_many/migration.sql` with:

```sql
-- Restore BatchMixingAggregation as a true many-to-many bridge.
-- Keep productionBatchId + mixingExecutionId unique, but allow the same
-- mixing execution to be linked to multiple product batches.

DROP INDEX IF EXISTS "agg_exec_unique";

CREATE INDEX IF NOT EXISTS "batch_mixing_aggregations_mixingExecutionId_idx"
  ON "batch_mixing_aggregations" ("mixingExecutionId");
```

- [ ] **Step 3: Validate Prisma schema**

```bash
(cd server && npx prisma validate)
```

Expected: PASS with `The schema at prisma/schema.prisma is valid`.

## Task 3: Allow shared aggregation in the service

**Files:**
- Modify: `server/src/modules/batch-trace/services/batch-mixing-aggregation.service.ts`

- [ ] **Step 1: Remove the cross-batch conflict query**

Delete this whole block:

```ts
    // BatchMixingAggregation has no quantity-split field, so an execution must
    // belong to at most one product batch — otherwise a single set of material
    // usages would be double-counted across two batches in traceability and
    // material balance. Reject any execution already linked elsewhere.
    const existingLinks = await this.prisma.batchMixingAggregation.findMany({
      where: { mixingExecutionId: { in: dto.mixingExecutionIds } },
      select: { mixingExecutionId: true, productionBatchId: true },
    });
    const conflicting = existingLinks.find(
      (link) => link.productionBatchId !== dto.productionBatchId,
    );
    if (conflicting) {
      throw new BadRequestException(
        `配料执行 ${conflicting.mixingExecutionId} 已归集到其它产品批次`,
      );
    }
```

- [ ] **Step 2: Add a replacement comment before `const upsertOps`**

```ts
    // GAP-201: BatchMixingAggregation is a many-to-many bridge. The composite
    // unique key keeps one production batch from linking the same execution
    // twice, while allowing another production batch to share the same input
    // pool for cross-day packaging traceability.
```

- [ ] **Step 3: Run the focused service test**

```bash
(cd server && npm test -- batch-mixing-aggregation.service.spec.ts --runInBand)
```

Expected: PASS.

## Task 4: Include shared aggregation metadata in backend reads

**Files:**
- Modify: `server/src/modules/batch-trace/services/production-batch.service.ts`
- Modify: `server/src/modules/batch-trace/services/traceability.service.ts`
- Modify: `server/src/modules/batch-trace/services/traceability.service.spec.ts`

- [ ] **Step 1: Add sibling aggregation metadata to `ProductionBatchService.findOne`**

Inside the `aggregations.include.mixingExecution.include` block, replace:

```ts
                lines: {
                  include: {
                    materialBatch: true,
                    material: true,
                  },
                },
```

with:

```ts
                aggregations: {
                  include: {
                    productionBatch: {
                      select: { id: true, batchNumber: true },
                    },
                  },
                  orderBy: { createdAt: 'asc' },
                },
                lines: {
                  include: {
                    materialBatch: true,
                    material: true,
                  },
                },
```

- [ ] **Step 2: Add sibling aggregation metadata to `TraceabilityService.traceProductionBatch`**

Inside the `aggregations.include.mixingExecution.include` block, insert the same `aggregations` include before `lines`.

- [ ] **Step 3: Mark shared aggregation edges in `TraceabilityService.traceProductionBatch`**

Replace:

```ts
      edges.push({
        source: productionBatch.id,
        target: execution.id,
        relation: 'aggregation',
      });
```

with:

```ts
      const linkedBatchCount = execution.aggregations?.length ?? 0;

      edges.push({
        source: productionBatch.id,
        target: execution.id,
        relation: linkedBatchCount > 1 ? 'sharedAggregation' : 'aggregation',
      });
```

- [ ] **Step 4: Add a traceability regression assertion**

In `server/src/modules/batch-trace/services/traceability.service.spec.ts`, update the existing `traceProductionBatch` test fixture so the returned `mixingExecution` includes:

```ts
                aggregations: [
                  { productionBatch: { id: 'pb-1', batchNumber: 'PB-001' } },
                  { productionBatch: { id: 'pb-2', batchNumber: 'PB-002' } },
                ],
```

Then add this assertion after the existing node assertions:

```ts
      expect(result.edges).toContainEqual({
        source: 'pb-1',
        target: 'mix-1',
        relation: 'sharedAggregation',
      });
```

- [ ] **Step 5: Run traceability tests**

```bash
(cd server && npm test -- traceability.service.spec.ts --runInBand)
```

Expected: PASS.

## Task 5: Show shared mixing executions in BatchDetail

**Files:**
- Modify: `client/src/views/batch-trace/BatchDetail.vue`

- [ ] **Step 1: Add helper functions in `<script setup>`**

Add these helpers after `hasDraftAggregations`:

```ts
const linkedProductionBatches = (agg: any) =>
  agg?.mixingExecution?.aggregations
    ?.map((item: any) => item.productionBatch)
    ?.filter(Boolean) ?? [];

const isSharedMixingExecution = (agg: any) =>
  linkedProductionBatches(agg).length > 1;

const linkedBatchNumbers = (agg: any) =>
  linkedProductionBatches(agg)
    .map((batch: any) => batch.batchNumber || batch.id)
    .join('、');
```

- [ ] **Step 2: Add shared display to the aggregation card**

Inside the aggregation card, after:

```vue
          <div><strong>实际配料重量：</strong>{{ agg.mixingExecution?.actual_weight }}</div>
```

insert:

```vue
          <div v-if="isSharedMixingExecution(agg)">
            <strong>归集方式：</strong>
            <el-tag type="warning" size="small">共用配料执行</el-tag>
            <span style="margin-left: 8px">{{ linkedBatchNumbers(agg) }}</span>
          </div>
```

- [ ] **Step 3: Run client type check or build**

```bash
npm run build:client
```

Expected: PASS.

## Task 6: Run final verification

**Files:**
- No file edits.

- [ ] **Step 1: Run focused backend tests**

```bash
(cd server && npm test -- batch-mixing-aggregation.service.spec.ts traceability.service.spec.ts --runInBand)
```

Expected: PASS.

- [ ] **Step 2: Validate Prisma**

```bash
(cd server && npx prisma validate)
```

Expected: PASS.

- [ ] **Step 3: Run repository checks required by planning docs if touched**

```bash
# 历史 Multica GAP 校验脚本已退役；当前不再运行此校验
# 历史 Multica GAP 机器索引已退役；当前不再校验
git diff --check
```

Expected: all commands exit 0.

## Execution Handoff

Execute this plan only with `superpowers:executing-plans`. Do not merge GAP-201 with GAP-202 or GAP-203. If any command reveals that new-link material balance already consumes `BatchMixingAggregation`, stop and report the mismatch before editing further.
