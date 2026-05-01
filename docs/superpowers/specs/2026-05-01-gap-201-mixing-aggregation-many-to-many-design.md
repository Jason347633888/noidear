# GAP-201 配料执行归集多对多设计

## 1. 背景和现状

GAP-201 处理 `MixingExecution` 和 `ProductionBatch` 的归集关系。现有模块文档和 TASK-9 设计把 `BatchMixingAggregation` 定义为配料执行与产品批次之间的桥接表，目标是支持包装喷码后再把配料投入池归集到一个或多个产品批次。

当前代码已经落地了 `MixingExecution`、`MixingExecutionLine` 和 `BatchMixingAggregation`，但 schema 在 `BatchMixingAggregation` 上额外保留了 `@@unique([mixingExecutionId], map: "agg_exec_unique")`。这使得一个配料执行最多只能归集到一个产品批次。`batch-mixing-aggregation.service.ts` 也显式拒绝同一 `mixingExecutionId` 归集到不同 `productionBatchId`，理由是防止同一套原辅料用量被多个批次重复计数。

该实现避免了双重计数，但破坏了现场跨日喷码场景：夜班一次配料可能在 00:00 前后被包装成两个产品批次，两个批次都应能追溯到同一配料投入池。

## 2. 当前代码事实源

- `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 将配料子链定义为 `MixingExecution -> BatchMixingAggregation <- ProductionBatch`。
- `docs/module-usage/06-mixing-production-packaging.md` 将 `BatchMixingAggregation` 标为配料执行与产品批次多对多归集桥接表。
- `server/src/prisma/schema.prisma` 中 `BatchMixingAggregation` 已有 `@@unique([productionBatchId, mixingExecutionId])`，可防止同一产品批次重复挂同一配料执行。
- 同一 schema 还存在 `@@unique([mixingExecutionId], map: "agg_exec_unique")`，实际把多对多降级为一对多。
- `server/src/modules/batch-trace/services/batch-mixing-aggregation.service.ts` 在 create 时查询已有链接并拒绝不同产品批次复用同一配料执行。
- `server/src/modules/batch-trace/services/traceability.service.ts` 的新链路追溯按产品批次读取 `aggregations -> mixingExecution -> lines`，没有为共享投入池提供标识。
- `server/src/modules/warehouse/material-balance.service.ts` 当前只统计旧链路 `BatchMaterialUsage`，没有按 `BatchMixingAggregation` 汇总新链路用量，因此本 GAP 不改物料平衡公式。

## 3. 业务边界

本设计选择恢复 `BatchMixingAggregation` 的真实多对多语义：

- 一个 `ProductionBatch` 可以归集多个 `MixingExecution`。
- 一个 `MixingExecution` 可以归集到多个 `ProductionBatch`。
- `BatchMixingAggregation` 只表达“这个产品批次暴露于这个配料投入池”，不表达该批次独占消耗了多少原辅料。
- `MixingExecutionLine.actualQuantity` 是投入池实际用量，不是每个产品批次的分摊用量。
- 当一个配料执行归集到多个产品批次时，追溯页面必须显示“共用配料执行”语义，避免用户把同一实际用量误解成每个批次各自消耗一次。

## 4. 不做什么

- 不新增平行的投料事实源。
- 不把 `BatchMaterialUsage` 重新定义为新链路主入口。
- 不在本 GAP 中引入按产品批次分摊的 `allocatedQuantity` 字段。
- 不改变 `MixingExecutionLine` 的扣减配料区库存逻辑。
- 不改变 `ProductionBatch` 作为产品批次唯一事实源的定位。
- 不修改 `MaterialBalanceService` 的旧链路核算公式；新链路物料平衡需要在后续独立 GAP 中基于 `MixingExecution` 去重设计。

## 5. 数据、接口和页面影响

### 5.1 数据影响

需要移除 `batch_mixing_aggregations` 上的单列唯一约束 `agg_exec_unique`，保留 `productionBatchId + mixingExecutionId` 的复合唯一约束。

迁移前无需回填历史数据。现有数据满足更宽松的多对多关系，删除唯一约束不会破坏已有记录。

### 5.2 接口影响

`POST /batch-trace/batch-mixing-aggregations` 应允许同一 `mixingExecutionId` 被不同 `productionBatchId` 归集。仍然必须校验：

- 产品批次存在。
- 产品批次有 `recipeId`。
- 所有配料执行存在且 `status = confirmed`。
- 配料执行的 `productId` 和 `recipeId` 与产品批次一致。
- 同一产品批次不能重复归集同一配料执行。

### 5.3 页面影响

`BatchDetail.vue` 的配料归集列表应在共享场景下展示该配料执行已关联的产品批次数量或批次号，至少让用户看到“共用配料执行”。候选配料执行列表不应因为某执行已归集到别的批次而隐藏。

### 5.4 追溯影响

产品批次反追时，可以显示共享配料执行及其原辅料批次。展示数量时必须使用“投入池实际用量”或等价语义，不得展示为“本产品批次独占用量”。

## 6. 历史数据和迁移策略

本 GAP 删除唯一约束，不需要改写历史业务数据。

迁移策略：

1. 在 migration 中删除 `agg_exec_unique`。
2. 保留 `productionBatchId_mixingExecutionId` 复合唯一约束。
3. 不创建 `allocatedQuantity` 字段。
4. 不迁移旧链路 `BatchMaterialUsage`。

如果迁移环境中不存在 `agg_exec_unique`，迁移脚本应安全跳过，不阻断部署。

## 7. 方案比较

### 方案 A：保留单执行唯一归集

优点是实现最小，天然避免双重计数。缺点是直接否定 TASK-9 的多对多设计，也不能表达跨日喷码共用配料场景。

### 方案 B：恢复多对多，但不做分摊字段

优点是符合现有主链设计和现场场景；配料执行仍是唯一投料事实源；不会伪造每个产品批次的精确用量。缺点是展示和统计必须明确“共享投入池”，不能简单把 `actualQuantity` 按产品批次重复求和。

### 方案 C：恢复多对多并新增分摊字段

优点是可以按产品批次计算更细的物料平衡。缺点是现场通常没有可靠分摊依据，容易诱导用户事后伪造精确用量；需要更大的 schema、页面和校验设计。

本 GAP 采用方案 B。方案 C 只能在业务明确要求“按产品批次分摊投入池数量”后另开独立设计。

## 8. grill-with-docs 校准结论

- 与 `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 不冲突；该文档要求追溯回到 `MixingExecution -> BatchMixingAggregation <- ProductionBatch` 主链。
- 不重复造主数据；仍复用 `Product`、`Recipe`、`MaterialBatch`、`ProductionBatch`。
- 不引入平行批次链路；`ProductionBatch` 仍是产品批次唯一事实源。
- 不破坏 `ProductionBatch / MaterialBatch / BatchMaterialUsage / InventoryMovement` 主链；旧链路兼容保留，新链路通过 `MixingExecutionLine` 表达投入池。
- 本 GAP 需要 schema migration，但不需要历史数据回填。
- 不需要新增业务确认；现有设计文档和模块文档已明确多对多意图，当前唯一约束是实现偏差。
- 可拆成一个独立 PR：移除唯一约束、调整服务校验、补测试、补共享展示。
- 可由执行 agent 按 `superpowers:executing-plans` 独立完成；如发现新链路物料平衡已经接入 `BatchMixingAggregation`，必须停止并回报，因为需要额外去重设计。

## 9. 验收标准

- Prisma schema 不再包含 `@@unique([mixingExecutionId], map: "agg_exec_unique")`。
- 数据库 migration 会删除 `agg_exec_unique`，并保留 `productionBatchId + mixingExecutionId` 复合唯一。
- `BatchMixingAggregationService.create()` 允许同一 `mixingExecutionId` 归集到两个不同产品批次。
- 同一产品批次重复归集同一配料执行仍不会产生重复行。
- 产品或配方不一致的配料执行仍会被拒绝。
- 批次详情页能显示共享配料执行语义。
- 追溯展示不把共享投入池数量描述为产品批次独占用量。
- `node tools/check-module-usage-docs.mjs`、`jq empty docs/module-usage/module-usage.manifest.json`、`git diff --check` 均通过。
