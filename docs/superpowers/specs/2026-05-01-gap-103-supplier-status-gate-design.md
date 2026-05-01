# GAP-103 Supplier Status Gate Design

## 背景

GAP-103 来自模块使用审计：`Supplier` 当前同时存在两个状态字段：

- `status`: 通用启停字段，当前注释为 `active` / `disabled`。
- `supplier_status`: 食品安全供应商准入字段，当前注释为 `approved` / `suspended` / `eliminated` / `pending`。

这两个字段不是同一个概念。`status` 表达这条供应商主数据是否启用；`supplier_status` 表达供应商在食品安全、资质、绩效评估语义下是否允许继续参与来料、领料、生产追溯链。

当前 `SupplierEvaluationService.create()` 会根据评估结论更新 `supplier_status`，但仓储入口没有统一读取这个准入字段。结果是供应商被评估为 `eliminated` 后，系统仍可能继续创建来料单、手工创建物料批次，或从该供应商既有批次领料进入生产。

## 当前代码事实源

已验证代码点：

- `server/src/prisma/schema.prisma`
  - `Supplier.status String @default("active")`
  - `Supplier.supplier_status String @default("approved")`
  - `MaterialBatch.supplierId` 关联 `Supplier`
- `server/src/modules/supplier-evaluation/supplier-evaluation.service.ts`
  - `verdict === 'eliminated'` 时更新 `supplier_status = 'eliminated'`
  - `verdict === 'conditional'` 时更新 `supplier_status = 'suspended'`
  - 其他评估结论更新为 `approved`
- `server/src/modules/warehouse/inbound.service.ts`
  - `create()` 直接使用 `supplierId` 创建来料单
  - `complete()` 直接用 `inbound.supplierId` 创建 `MaterialBatch`
- `server/src/modules/warehouse/batch.service.ts`
  - `create()` 允许直接按 `supplierId` 手工创建 `MaterialBatch`
- `server/src/modules/warehouse/requisition.service.ts`
  - `complete()` 直接按 `item.batchId` 扣减 `MaterialBatch`
  - 未检查该批次供应商的 `supplier_status`

## 业务边界

本 GAP 只解决供应商食品安全准入门禁，不重构供应商完整状态机。

准入规则：

| 字段 | 业务含义 | 本 GAP 中的处理 |
|---|---|---|
| `status` | 主数据启停 | `disabled` 不允许进入来料、批次创建、领料完成 |
| `supplier_status` | 食品安全准入 | `eliminated` 不允许进入来料、批次创建、领料完成 |
| `supplier_status = suspended` | 暂停/条件准入 | 本 GAP 不阻断，只保留后续业务确认空间 |
| `supplier_status = pending` | 待评估 | 本 GAP 不阻断，只保留后续业务确认空间 |
| `supplier_status = approved` | 通过准入 | 允许 |

为什么暂不阻断 `suspended` / `pending`：

- 当前审计 GAP 明确指出的 blocker 是 `eliminated` 供应商仍可进入业务链。
- `conditional -> suspended` 可能对应“有条件使用”而不是绝对禁用；直接阻断可能误伤真实业务。
- `pending` 是否允许试用采购属于业务策略，需要单独 grill-with-docs 后再进入新的 GAP。

## 目标

建立一个仓储模块内复用的供应商准入校验入口，让来料、物料批次和领料完成在进入追溯链前统一检查供应商状态。

执行后的业务效果：

1. 被禁用的供应商不能创建来料单。
2. 被评估淘汰的供应商不能创建来料单。
3. 被禁用或淘汰的供应商不能被手工用于创建物料批次。
4. 如果某物料批次关联的供应商后来被禁用或淘汰，领料完成时不能把这批物料发往生产或配料区。
5. 不改变既有历史数据，只阻断新的业务动作。

## 方案

新增仓储内部服务：

`server/src/modules/warehouse/services/supplier-access.service.ts`

服务职责：

- 按 `supplierId` 读取供应商状态。
- 按 `materialBatchId` 读取批次及其供应商状态。
- 对外提供两个方法：
  - `assertSupplierUsable(supplierId: string, actionLabel: string): Promise<void>`
  - `assertBatchSupplierUsable(batchId: string, actionLabel: string): Promise<void>`

阻断条件：

- 供应商不存在或 `deletedAt` 不为空：抛 `NotFoundException`。
- `status === 'disabled'`：抛 `BadRequestException`。
- `supplier_status === 'eliminated'`：抛 `BadRequestException`。
- 批次不存在或 `deletedAt` 不为空：抛 `NotFoundException`。
- 批次无 `supplierId`：不阻断。原因是历史或特殊物料批次可能没有供应商关联，本 GAP 不做历史清洗。

接入点：

- `InboundService.create()`：创建来料单前校验 `supplierId`。
- `BatchService.create()`：手工创建物料批次前，如果 dto 带 `supplierId`，校验该供应商。
- `RequisitionService.complete()`：每个领料项扣减前，按 `item.batchId` 校验批次供应商。

## 不做什么

本 GAP 不做以下事情：

- 不删除 `status` 或 `supplier_status` 任一字段。
- 不把两个状态合并为一个字段。
- 不新增 Prisma enum 或 schema migration。
- 不阻断 `supplier_status = suspended` 或 `pending`。
- 不改供应商评估规则。
- 不改前端供应商筛选器。
- 不清洗历史来料单、物料批次、领料单。

## 数据、接口、页面影响

数据影响：

- 不新增表。
- 不新增字段。
- 不修改历史数据。

接口影响：

- 仍使用原有接口。
- 当供应商已禁用或已淘汰时，相关接口从“成功创建/完成”改为返回 400。
- 当供应商或批次不存在时，返回 404。

页面影响：

- 本 GAP 不要求页面改造。
- 后续可以在供应商选择器中过滤不可用供应商，但这不是本 GAP 的 blocker。

## 历史数据和迁移策略

不涉及数据库迁移。

历史数据保留原样。执行后只影响新创建来料单、手工创建物料批次、领料完成动作。已有已完成业务记录不回滚、不重算。

## grill-with-docs 校准

校准结论：

- 与 `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 一致：供应商是主数据，来料、批次、领料是业务记录，不能在下游重复维护供应商状态。
- 不新增平行供应商事实源。
- 不新增平行批次链路。
- 门禁放在仓储业务入口，符合 `Supplier -> Material -> MaterialLot -> InventoryMovement -> IngredientUsage -> ProductionBatch` 主链。
- 本 GAP 不改变 `InventoryMovement` / `StockRecord` 双轨问题，避免扩大范围。
- 不需要用户再确认 `eliminated`：淘汰供应商不能继续进入新业务链，这是已验证 GAP 的直接结论。
- `suspended` / `pending` 是否阻断属于另一个业务策略问题，本 GAP 明确不做。

## 验收标准

执行 agent 完成 implementation plan 后，必须满足：

1. `InboundService.create()` 对 `status = disabled` 的供应商抛 `BadRequestException`。
2. `InboundService.create()` 对 `supplier_status = eliminated` 的供应商抛 `BadRequestException`。
3. `BatchService.create()` 对传入 `supplierId` 且供应商被禁用或淘汰的请求抛 `BadRequestException`。
4. `RequisitionService.complete()` 对关联淘汰供应商的 `MaterialBatch` 抛 `BadRequestException`，且不得扣减批次数量。
5. `supplier_status = suspended` 和 `pending` 暂不被本 GAP 阻断。
6. 仓储相关单元测试通过。
7. 不出现 schema、migration、前端页面改动。

