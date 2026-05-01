# GAP-007 ProductionBatch 产品快照一致性设计

## 背景

`ProductionBatch` 现在已经通过 `productId` 和 `recipeId` 关联产品与配方，`productName` / `recipeName` 是批次创建时的历史快照。业务口径要求：下游追溯必须锁定主数据 ID，同时保留当时展示名称，避免产品后续改名污染历史批次。

GAP-002/003 已将 `ProductionBatch.productId` 和 `recipeId` 收敛为必填关系。本 GAP 只处理应用层防线：任何新建产品批次时，`productName` 必须由系统从 `Product.name` 填充，不能由前端或调用方手填。

## 当前代码事实

- `server/src/modules/batch-trace/dto/production-batch.dto.ts`
  - `CreateProductionBatchDto` 只包含 `productId`、`recipeId`、`plannedQuantity`、`productionDate`。
  - `ConfirmProductBatchDto` 只包含 `batchNumber`、`productId`、`recipeId`、数量、日期、包装机、班组、班次。
- `server/src/modules/batch-trace/services/production-batch.service.ts`
  - `create()` 已先查 `Product` 和 `Recipe`，再写入 `productName: product.name`。
  - `confirmProductBatch()` 已先查 `Product` 和 `Recipe`，再写入 `productName: product.name`。
- 全局 `ValidationPipe` 已启用 `whitelist: true` 和 `forbidNonWhitelisted: true`，DTO 外字段会被拒绝。

## 设计决策

1. `productName` 继续保留为 `ProductionBatch` 快照字段。
2. 前端、API DTO、service 入参不得接受手填 `productName`。
3. `productName` 只能来自 `Product.name`。
4. `recipeName` 同样作为快照，只能来自已验证的 `Recipe`。
5. 历史数据不回填、不改写；本次只补回归测试和必要注释，锁住未来写入路径。

## 不做什么

- 不改 schema。
- 不新增产品编号规则。
- 不改生产批次号规则。
- 不处理 `company_id: '1'` 租户问题；这属于其他 GAP。

## 验收标准

- `ProductionBatchService.create()` 测试断言 `productName` 来自 `Product.name`。
- `ProductionBatchService.confirmProductBatch()` 测试断言 `productName` 来自 `Product.name`。
- DTO 中没有 `productName` 字段。
- service 中不存在从 DTO 写入 `productName` 的路径。

## Superpower 与 grill-me 校准记录

- `brainstorming`：确认这是低风险应用层一致性补强，不需要改业务流程。
- `grill-me`：通过代码核对确认 DTO 已不暴露 `productName`，因此本 GAP 的实施重点是测试锁定和边界注释，不做额外重构。
- `writing-plans`：后续 implementation plan 只安排测试与小范围注释，执行 agent 只使用 `superpowers:executing-plans`。
