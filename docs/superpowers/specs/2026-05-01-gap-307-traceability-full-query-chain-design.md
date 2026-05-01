# GAP-307 追溯查询完整链路设计

## 背景和现状

GAP-307 是 P0 追溯查询缺口。当前权威入口已经收敛为 `/traceability`，权威 API 合同已经冻结在 `packages/types/traceability.ts` 和 `docs/superpowers/specs/2026-04-24-traceability-query-api-contract-design.md`，GAP-306 也已经把 `TraceabilityQueryService`、`TraceabilityLinkageService`、`TraceabilityExportService`、`TraceabilityBalanceService` 注册到 `TraceabilityModule`。

剩余问题是查询能力本身没有完成：`TraceabilityService.query` 仍只识别 `entryMode: object` + `objectType: materialLot`，其他对象入口直接返回空结果。`TraceabilityQueryService` 也只构建 `materialLot -> ingredientUsage -> productionBatch -> deliveryNote` 的正追简化台账，尚未支持生产批次反追、发货单反追、生产批次双向追溯、场景工作台和物料平衡回链。

## 当前代码事实源

- `server/src/modules/traceability/traceability.module.ts` 已注册 GAP-306 的四个子服务，GAP-307 不再处理 DI 接线。
- `server/src/modules/traceability/traceability.service.ts` 是 controller 当前注入的门面服务，`query()` 只在 `materialLot` 对象查询时读取 `prisma.materialBatch.findUnique()`，否则返回 `buildEmptyResult()`。
- `server/src/modules/traceability/traceability-query.service.ts` 存在查询服务，但返回结构仍是局部接口：`ledger` 是数组，`risks` 是数组，和冻结 `TraceQueryResult.ledger.rows`、`risk.items` 合同不一致。
- `server/src/modules/traceability/traceability-contract.mapper.ts` 只提供 `mapForwardTraceResult()`，能够把物料批次正追映射为冻结合同形状。
- `packages/types/traceability.ts` 是共享合同事实源，执行实现不得新增页面私有字段或旧字段。
- `client/src/api/traceability.ts` 已使用共享合同，前端查询路径是 `/traceability/query` 与 `/traceability/query/graph`。
- `client/src/views/traceability/TraceabilityQuery.vue` 已提供对象查询和场景工作台入口；对象类型已有 `materialLot`、`productionBatch`、`deliveryNote`。
- `server/src/prisma/schema.prisma` 当前主链为 `MaterialBatch -> BatchMaterialUsage -> ProductionBatch -> DeliveryNote`，TASK-9 后 `FinishedGoodsBatch` 不再作为当前 Prisma 终端模型。

## 业务边界

GAP-307 只补齐追溯查询链路，不改变主数据与批次事实源：

- 业务标准名 `MaterialLot` 对应代码模型 `MaterialBatch`。
- 业务标准名 `IngredientUsage` 对应代码模型 `BatchMaterialUsage`。
- `ProductionBatch` 是当前成品批次终端节点。
- `DeliveryNote` 连接生产批次、客户名称、发货数量和运输信息。
- 物料平衡必须从 `MaterialBatch`、`BatchMaterialUsage`、`ProductionBatch.output_qty/loss_qty/sample_qty/waste_qty`、`DeliveryNote.shipped_qty` 读取，不从备注或页面派生。

支持范围：

- 对象查询：`materialLot` 正追、`productionBatch` 双向、`deliveryNote` 反追。
- 场景查询：`forwardTrace`、`backwardTrace`、`materialBalance`、`complaintInvestigation`、`recallAssessment` 先复用同一主链输出，场景差异放入 `summary.scenario` 和 `extensions`。
- 视图：ledger 和 graph 使用同一 `TraceQueryResult` 数据集。
- 权限：保留现有部门权限视图，不在本 GAP 设计 RBAC 新模型。

## 不做什么

- 不新增 Prisma model，不改 schema，不写 migration。
- 不恢复或重建 `FinishedGoodsBatch`。
- 不删除 legacy `batch-trace/trace/*` 端点；GAP-312 负责下线。
- 不实现 `TraceabilitySnapshot` 持久化；GAP-308 负责。
- 不把 ProductRecall 从动态表单独立建模；GAP-311 负责。
- 不修改 CustomerComplaint 的 `customer_name` 或 `production_batch_id` schema；GAP-309/GAP-310 负责。
- 不在前端页面、导出处理器或测试中发明 `TraceQueryResult` 以外的字段。

## 方案比较

### 方案 A：只在 `TraceabilityService` 内继续堆查询分支

优点是改动少。缺点是会让门面服务继续膨胀，`TraceabilityQueryService` 变成死代码，且后续 GAP-308 导出和快照仍无法复用查询层。

### 方案 B：把 `TraceabilityService.query()` 改为委托 `TraceabilityQueryService`

优点是保留 controller 门面不变，同时让主查询逻辑集中到 `TraceabilityQueryService`，后续导出、快照、联动都能复用同一合同输出。缺点是需要同步改造 `TraceabilityQueryService` 的返回结构和测试。

### 方案 C：新建查询聚合器并保留两个旧服务

优点是隔离彻底。缺点是当前模块已经有 `TraceabilityQueryService`，再加聚合器会引入第三个查询事实源，违背追溯权威链收敛要求。

选择方案 B。`TraceabilityService` 保持 controller 门面，`TraceabilityQueryService` 成为唯一查询算法入口，所有对象查询和场景查询都返回冻结 `TraceQueryResult`。

## 数据、接口和页面影响

### 数据影响

不改表结构，不迁移数据。执行实现只读取现有关系：

- `MaterialBatch.batchMaterialUsages.productionBatch.delivery_notes`
- `ProductionBatch.materialUsages.materialBatch.material.supplier`
- `ProductionBatch.delivery_notes`
- `DeliveryNote.production_batch.materialUsages.materialBatch`

### 接口影响

`POST /traceability/query` 和 `POST /traceability/query/graph` 的 URL 不变，请求继续使用 `TraceQueryRequest`。响应必须稳定为 `TraceQueryResult`：

- `ledger.rows` 包含主链节点。
- `graph.nodes` 与 `ledger.rows` 同源。
- `graph.edges` 表达 MaterialBatch、BatchMaterialUsage、ProductionBatch、DeliveryNote 之间的方向关系。
- 空结果仍返回完整壳，不抛 500。
- 不再返回旧的 `risks` 顶层数组或数组型 `ledger`。

### 页面影响

`ObjectTraceQueryPanel.vue` 已有三个对象类型，本 GAP 只要求执行 agent 确保 `productionBatch` 和 `deliveryNote` 查询能获得非空结果。`ScenarioWorkbenchPanel.vue` 当前会把所有场景固定为 `traceMode: forward`，执行实现需要让不同场景映射到正确 traceMode：

- `forwardTrace` -> `forward`
- `backwardTrace`、`complaintInvestigation`、`recallAssessment` -> `backward`
- `materialBalance` -> 继续走 `/traceability/balance`

## 历史数据和迁移策略

不涉及 schema migration，也不需要写历史数据迁移脚本。

执行实现必须兼容历史字段命名差异：代码中部分链路使用 `batchNumber` / `batch_no`、`dn_no` / `delivery_no` 口径不一致。查询层应使用小型 label helper 只做展示兼容，不把这些字段变成新的事实源。

历史数据缺失关系时，查询结果应保持完整合同壳并标记 `summary.resultStatus: empty` 或 `partial`。不得因为某个批次缺少发货单、物料用量或供应商而抛出未处理异常。

## 验收标准

- `TraceabilityService.query()` 委托 `TraceabilityQueryService.query()`，controller 对外入口不变。
- `TraceabilityQueryService.query()` 返回 `TraceQueryResult` 冻结合同形状。
- `materialLot` 正追继续返回 `materialLot -> ingredientUsage -> productionBatch -> deliveryNote`。
- `productionBatch` 双向查询返回上游 `materialLot/ingredientUsage` 和下游 `deliveryNote`。
- `deliveryNote` 反追返回 `deliveryNote -> productionBatch -> ingredientUsage -> materialLot`。
- 场景工作台不会固定所有场景为 forward；至少 `backwardTrace`、`complaintInvestigation`、`recallAssessment` 使用 backward 语义。
- 物料平衡入口仍返回 `BalanceQueryResult`，并能从生产批次或物料批次回链到正式查询上下文。
- 现有 `/traceability` 页面、`client/src/api/traceability.ts` 合同测试、后端 traceability focused tests 通过。
- 不修改业务代码以外的 schema/migration，不删除 legacy endpoint。

## Superpower 与 grill-me 校准记录

- `using-superpowers`：已读取并按技能入口要求检查任务适用技能。
- `using-git-worktrees`：已确认当前目录是 Multica 隔离工作目录，不是主 checkout。
- `brainstorming`：本 spec 已比较三种方案，选择将查询算法收敛到 `TraceabilityQueryService`，避免新增平行查询事实源。
- `grill-with-docs`：已对照 `MASTER_DATA_AND_TRACEABILITY_MODEL.md` 和冻结追溯设计，确认不重复造主数据、不引入平行批次链路、不破坏 `ProductionBatch / MaterialBatch / BatchMaterialUsage / InventoryMovement` 主链。
- `writing-plans`：后续 implementation plan 必须只交给执行 agent 使用 `superpowers:executing-plans`。
