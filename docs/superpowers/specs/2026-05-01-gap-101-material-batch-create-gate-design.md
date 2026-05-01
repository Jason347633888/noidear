# GAP-101 Material Batch Create Gate Design

## 背景和现状

GAP-101 来自供应商、采购来料与仓储链路审计。`MaterialBatch` 是业务口径 `MaterialLot`，是来料检验、领料、投料、追溯和物料平衡的核心批次锚点。

当前正确链路是：

```text
Supplier -> MaterialInbound -> MaterialInboundItem -> MaterialBatch -> StockRecord(in)
```

`InboundService.complete()` 在入库单审批通过后创建 `MaterialBatch`，同时写入 `StockRecord(recordType: 'in')`，并把 `MaterialInboundItem.createdBatchId` 指向新批次。这样批次可以反查到到货单、供应商、供应商批号、生产日期、有效期和入库流水。

问题是 `BatchController` 仍暴露 `POST /warehouse/batches`，`BatchService.create()` 会直接 `prisma.materialBatch.create({ data: createBatchDto })`。这条路径可以绕过 `MaterialInbound.complete()`，创建没有到货单来源、没有入库流水的物料批次，破坏 `Supplier -> MaterialInbound -> MaterialBatch -> IncomingInspection` 与后续追溯链。

任务类型判断：`needs_spec`。原因是本 GAP 影响批次事实源、库存入口和追溯主链，必须先用 `brainstorming` 写 spec，再用 `grill-with-docs` 校准，最后用 `writing-plans` 输出 implementation plan。

## 当前代码事实源

已验证代码点：

- `server/src/modules/warehouse/batch.controller.ts`
  - `@Controller('warehouse/batches')`
  - `@Post()` 调用 `this.batchService.create(createBatchDto)`
- `server/src/modules/warehouse/batch.service.ts`
  - `create()` 直接调用 `this.prisma.materialBatch.create({ data: createBatchDto })`
  - 捕获 `P2002` 后返回批次号重复错误
- `server/src/modules/warehouse/dto/batch.dto.ts`
  - `CreateBatchDto` 要求调用方直接传 `batchNumber/materialId/productionDate/expiryDate/quantity`
  - `supplierId` 为可选，允许创建无供应商批次
- `server/src/modules/warehouse/inbound.service.ts`
  - `complete()` 在事务内创建 `MaterialBatch`
  - 同一事务写 `StockRecord(recordType: 'in', relatedType: 'inbound')`
  - 同一事务更新 `MaterialInboundItem.createdBatchId`
- `server/src/prisma/schema.prisma`
  - `MaterialBatch` 与 `MaterialInboundItem` 通过 `MaterialInboundItem.createdBatchId` 关联
  - `MaterialBatch` 与 `StockRecord`、`IncomingInspection`、`MaterialRequisitionItem`、`BatchMaterialUsage` 关联
- `client/src/api/warehouse.ts`
  - `batchApi.create()` 仍调用 `POST /warehouse/batches`
- `client/src/views/warehouse/BatchManagement.vue`
  - 当前页面只展示列表和筛选，没有创建批次按钮

## 业务边界

本 GAP 只解决“是否允许手工创建 `MaterialBatch`”的问题，不重构库存流水、供应商状态机或来料检验选择器。

`MaterialBatch` 的新增来源必须收敛到 `MaterialInbound.complete()`。批次查询、详情、更新可变展示字段、锁定、FIFO 查询仍属于 `BatchService` 的职责。

保留能力：

- `GET /warehouse/batches`
- `GET /warehouse/batches/:id`
- `GET /warehouse/batches/fifo`
- `PUT /warehouse/batches/:id`
- `PUT /warehouse/batches/:id/lock`
- `InboundService.complete()` 自动创建批次

废弃能力：

- 外部调用 `POST /warehouse/batches` 直接创建批次
- 前端 API 适配器暴露 `batchApi.create()`

## 方案评估

推荐方案：废弃直接创建路径。

实现方式是保留路由但让 `BatchService.create()` 抛 `GoneException`，使 `POST /warehouse/batches` 返回 410，并在错误信息中指向 `MaterialInbound.complete()`。这样外部集成能收到稳定、明确的废弃响应，执行 agent 不需要删除路由导致不确定的 404，也不需要新增 schema。

备选方案一：只加管理员权限门禁。

该方案可以减少普通用户误用，但管理员仍可创建无 `MaterialInbound` 来源、无 `StockRecord(in)` 的批次。它不能解决追溯事实源断裂，只是把风险转移给高权限用户，因此不推荐。

备选方案二：在 schema 中新增 `sourceInboundItemId` 并强制非空。

该方案能在数据库层面表达来源约束，但会要求迁移现有 `MaterialBatch` 数据，并改写 `InboundService.complete()` 的创建顺序。当前 schema 已存在 `MaterialInboundItem.createdBatchId`，足以证明由入库完成创建的批次来源。本 GAP 的历史数据影响已判定为 false，因此不推荐为本 GAP 引入 migration。

## 不做什么

本 GAP 不做以下事情：

- 不新增 Prisma model、字段、enum 或 migration。
- 不清洗历史 `MaterialBatch` 数据。
- 不重算历史 `StockRecord`。
- 不改变 `InboundService.complete()` 的自动建批次语义。
- 不改变 `MaterialInbound` 审批流程。
- 不改变 `BatchService.findAll/findOne/update/lock/getFIFO`。
- 不处理 `GAP-102` 的 `StockRecord` / `InventoryMovement` 统一问题。
- 不处理 `GAP-103` 的供应商状态门禁；如果执行时 GAP-103 已落地，应复用现状并避免重新设计供应商准入。
- 不处理 `GAP-100` 的来料检验批次选择器。

## 数据、接口、页面影响

数据影响：

- 不新增表或字段。
- 不修改历史数据。
- 新请求不再能通过 `POST /warehouse/batches` 写入 orphan `MaterialBatch`。
- `InboundService.complete()` 仍会写 `MaterialBatch` + `StockRecord(in)` + `MaterialInboundItem.createdBatchId`。

接口影响：

- `POST /warehouse/batches` 从成功创建改为返回 410 Gone。
- 410 响应消息必须明确说明：直接创建物料批次已废弃，请通过完成 `MaterialInbound` 创建。
- 其他 `/warehouse/batches` 读取、更新、锁定、FIFO 接口不变。

页面影响：

- `BatchManagement.vue` 当前没有创建按钮，不需要页面删除入口。
- `client/src/api/warehouse.ts` 需要移除 `batchApi.create()`，防止新前端代码继续接入废弃路径。

## 历史数据和迁移策略

不涉及数据库迁移。

历史 `MaterialBatch` 保留原样，不补建 `MaterialInbound` 或 `StockRecord`。本 GAP 只阻断新的直接创建动作。若后续审计发现历史 orphan 批次，需要另立数据治理 GAP，不能混入本 PR。

## grill-with-docs 校准记录

校准结论：

- 与 `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 一致：`MaterialLot(MaterialBatch)` 是追溯主链节点，必须能回到采购到来料链。
- 不重复造主数据或事实源；仍复用 `Supplier`、`MaterialInbound`、`MaterialBatch`、`StockRecord`。
- 不引入平行批次链路；废弃的是平行创建入口。
- 不破坏 `ProductionBatch / MaterialBatch / BatchMaterialUsage / InventoryMovement` 主链；相反，阻断无来源批次进入后续 `BatchMaterialUsage`。
- 不需要迁移历史数据，因为本 GAP 的修复点是运行时入口门禁。
- 不需要用户业务确认：已验证 GAP 明确指出手工创建批次会断开追溯链，且正确入口已存在。
- 可以拆成独立小 PR：后端 410、前端 API 移除、测试更新。
- 可以被执行 agent 按 `executing-plans` 独立完成；若发现代码事实已变更，必须停止回报。

## 验收标准

执行 agent 完成 implementation plan 后，必须满足：

1. `BatchService.create()` 对任意 `CreateBatchDto` 抛 `GoneException`。
2. `POST /warehouse/batches` 返回 410 Gone。
3. `POST /warehouse/batches` 不调用 `prisma.materialBatch.create()`。
4. `InboundService.complete()` 自动创建 `MaterialBatch` 的路径保持不变。
5. `InboundService.complete()` 仍写入 `StockRecord(recordType: 'in', relatedType: 'inbound')`。
6. `client/src/api/warehouse.ts` 不再暴露 `batchApi.create()`。
7. 全仓库后端单元测试通过，客户端构建通过。
8. 不出现 schema、migration 或历史数据脚本改动。
