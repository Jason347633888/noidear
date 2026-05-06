# 配料、生产、包装、产品批次

---
module_id: mixing-production-packaging
business_chain:
  - MaterialLot(MaterialBatch) -> StagingAreaStock -> MixingExecution -> MixingExecutionLine -> BatchMixingAggregation -> ProductionBatch
  - ProductionBatch -> BatchMaterialUsage -> MaterialBatch (旧链路，兼容保留)
  - ProductionBatch -> PackagingMaterialUsage -> Material (包材用量，独立记录)
  - ProductionBatch -> MetalDetectionLog (金检记录)
  - ShiftInstance -> ProductionRun -> ProductionBatch (班次-生产段-批次)
  - ShiftType (主数据) -> ProductionBatch.shift_type_id (FK 已存在 schema，ShiftInstance.shift_type 仍为文本)
module_type:
  - 核心业务模块（生产执行链主链）
  - 追溯链核心节点
  - 跨模块共享（与仓储、品质、追溯、班次均有 FK 绑定）
source_of_truth:
  - ProductionBatch: 产品批次唯一事实源（代码层，对应业务口径"产品批次"）
  - MixingExecution / MixingExecutionLine: 新配料执行事实源（TASK-9 新架构）
  - BatchMixingAggregation: 配料执行与产品批次多对多归集桥接表
  - BatchMaterialUsage: 旧投料追溯桥接表（兼容保留，新链路不作为主要投料入口）
  - ShiftType: 班次类型主数据（代码 ShiftType model，已有 FK 与 ProductionBatch、StagingAreaStocktake 绑定）
  - ShiftInstance: 开班/关班运营记录（shift_type 字段为文本，未 FK 到 ShiftType）
facts_or_projections:
  - 已验证: MixingExecution/MixingExecutionLine/BatchMixingAggregation 新链路 schema 已落地
  - 已验证: BatchMaterialUsage 保留为旧链路兼容，BatchDetail.vue 仍同时支持两套入口
  - 已验证: ShiftType 主数据模型已实现，ProductionBatch.shift_type_id FK 已存在
  - 已验证: ShiftInstance.shift_type 字段为 String 文本（白班/夜班），未 FK 到 ShiftType
  - 已验证: PackagingMaterialUsage.production_batch_id 为可选字段（String?），无 FK 关系声明
  - 已验证: FinishedGoodsBatch 已从 Prisma 主模型中移除，仅有 Record.batchLinkType 中的 "finished_goods" 字符串引用残留
downstream_consumers:
  - 追溯模块 (TraceabilityQueryService): ProductionBatch -> BatchMixingAggregation -> MixingExecution -> MixingExecutionLine -> MaterialBatch
  - 追溯模块 (旧链路): ProductionBatch -> BatchMaterialUsage -> MaterialBatch
  - 品质模块: CCPRecord, ProcessMonitorRecord, MetalDetectionLog, ReworkRecord, Sample -> ProductionBatch
  - 发货模块: DeliveryNote -> ProductionBatch
  - 留样模块: Sample -> ProductionBatch
  - 统计/物料平衡: ProductionBatch.output_qty / loss_qty / sample_qty / waste_qty
current_entrypoints:
  - /batch-trace (BatchList.vue): 产品批次列表
  - /batch-trace/:id (BatchDetail.vue): 批次详情 + 旧投料添加 + 配料执行归集
  - /mixing/workbench (MixingWorkbench.vue): 新配料执行入口（配料区工作台）
  - /production/workshop-staging (WorkshopStaging.vue): 车间暂存区管理
  - /shift-dashboard (ShiftDashboard.vue): 开班/关班/生产段管理
  - /metal-detections (MetalDetectionList.vue): 金属探测记录
last_verified_commit: 7bab98dc3ccd49e8e1d76b95b28a1b79207c483c
---

## 1. 模块定位

本模块覆盖食品安全 SaaS 的"配料 -> 生产 -> 包装 -> 产品批次"核心执行链。`ProductionBatch`（产品批次）是整个追溯系统的核心节点，上游承接配料投料记录，下游连接发货、留样、不合格、投诉、召回。

模块经历了两代架构演进：

- **旧链路（BatchMaterialUsage）**：直接在产品批次详情页手工录入物料批次 ID，物料批次 ID 由用户手填，无 FIFO 推荐，无配料区约束。
- **新链路（MixingExecution + BatchMixingAggregation）**：配料在车间配料区先执行（MixingExecution），系统按 FIFO 从 StagingAreaStock 推荐批次，扣减配料区库存，生成 MixingExecutionLine；包装喷码后确认产品批次号，再通过 BatchMixingAggregation 把配料执行归集到产品批次，支持多对多。

当前系统**两套链路并存**，旧链路 (BatchDetail.vue 物料使用对话框) 和新链路 (MixingWorkbench.vue + BatchDetail.vue 归集面板) 同时可用。

## 2. 使用角色

| 角色 | 使用目的 | 关键动作 |
|---|---|---|
| 车间配料员 | 按配方和 FIFO 完成配料操作，记录实际用量 | 进入配料区工作台，选择配料执行，系统推荐批次，确认/人工调整后提交 |
| 包装线班长/负责人 | 包装喷码后确认产品批次号和入库信息 | 在产品批次列表创建或确认批次，填写批次号、包装机、责任班组、入库时间 |
| 生产班长 | 把配料执行池归集到产品批次，完成追溯链闭环 | 在 BatchDetail.vue 归集面板选择配料执行，提交归集，确认归集 |
| 品质检验员 | 针对产品批次录入金检记录、过程记录、CCP 监控 | 在金检记录页面选择批次，填写铁球/不锈钢球/铝球规格和通过状态 |
| 仓储员/班次管理员 | 管理开班/关班和生产段 | 在班次看板开班、添加生产段、关班 |

## 3. 当前入口

| 入口 | 页面 | 前端 API | 后端 API | 后端模块 |
|---|---|---|---|---|
| 产品批次列表 | `client/src/views/batch-trace/BatchList.vue` | `productionBatchApi.getList()` (`client/src/api/batch.ts`) | GET `/batch-trace/production-batches` | `batch-trace/production-batch.controller.ts` |
| 产品批次详情（旧投料） | `client/src/views/batch-trace/BatchDetail.vue` | `materialUsageApi.addUsage()` (`client/src/api/batch.ts`) | POST `/batch-trace/material-usage` | `batch-trace/batch-material-usage.controller.ts` |
| 产品批次详情（配料归集） | `client/src/views/batch-trace/BatchDetail.vue` | `batchMixingAggregationApi.create/confirm()` (`client/src/api/batch.ts`) | POST `/batch-trace/batch-mixing-aggregations` | `batch-trace/batch-mixing-aggregation.controller.ts` |
| 配料区工作台（新投料） | `client/src/views/mixing/MixingWorkbench.vue` | `client/src/api/mixing.ts` | POST `/mixing/executions`, GET `/mixing/executions`, POST `/mixing/recommend-material-batches` | `mixing/mixing.controller.ts` |
| 班次看板 | `client/src/views/shift/ShiftDashboard.vue` | `client/src/api/shift-instance.ts` | GET/POST `/shift-instances`, PATCH `/shift-instances/:id/close` | `shift-instance/shift-instance.controller.ts` |
| 班组/班次类型主数据 | （仅通过 API 访问，无独立管理页面） | `client/src/api/team-shift.ts` | GET `/team-shifts/teams`, GET `/team-shifts/shift-types` | `team-shift/team-shift.controller.ts` |
| 金检记录 | `client/src/views/metal-detection/MetalDetectionList.vue` | 内联 request | POST `/metal-detections`, GET `/metal-detections` | `metal-detection/metal-detection.controller.ts` |
| 包材用量 | （无独立前端页面，API 已实现） | — | GET/POST `/packaging-material-usages` | `packaging-material-usage/packaging-material-usage.controller.ts` |

## 4. 当前实现

| 对象 | 当前实现 | 说明 |
|---|---|---|
| `ProductionBatch`（产品批次） | Prisma model `ProductionBatch`，`@@map("production_batches")` | 追溯链唯一终端批次节点；业务口径"产品批次"；包含 `shift_type_id` FK 到 `ShiftType`（已验证）；包含 `team_id` FK 到 `Team`（已验证） |
| `MixingExecution`（配料执行） | Prisma model，`@@map("mixing_executions")`；`mixing/mixing.service.ts` | 新链路核心投料事实表；含 `shift_type_id?` 字段，但类型为 `String?`，**未声明 FK 关系到 ShiftType**（已验证） |
| `MixingExecutionLine`（配料明细） | Prisma model，`@@map("mixing_execution_lines")` | 每行含 materialBatchId、actualQuantity、fifoSuggested、manualOverride、overrideReason；与 StagingAreaStock 关联（已验证） |
| `BatchMixingAggregation`（归集桥接） | Prisma model，`@@map("batch_mixing_aggregations")`；`batch-trace/services/batch-mixing-aggregation.service.ts` | 多对多但加了 `@@unique([mixingExecutionId])` 约束，**实际强制一个 MixingExecution 只能归属一个 ProductionBatch**（与设计文档"多对多"不符，已验证） |
| `BatchMaterialUsage`（旧投料桥接） | Prisma model，`@@map("batch_material_usages")`；`batch-trace/services/batch-material-usage.service.ts` | 旧链路兼容保留；`BatchDetail.vue` 物料使用对话框直接手填 materialBatchId（已验证） |
| `ShiftType`（班次类型主数据） | Prisma model `ShiftType`，`@@map("shift_types")`；`team-shift/team-shift.service.ts` | 已实现 code/name/start_time/end_time/crosses_day；与 ProductionBatch、StagingAreaStocktake 有 FK（已验证） |
| `ShiftInstance`（开班记录） | Prisma model `ShiftInstance`，`@@map("shift_instances")`；`shift-instance/shift-instance.service.ts` | `shift_type` 字段为 `String`（白班/夜班文本），**未 FK 到 ShiftType.id**（已验证） |
| `PackagingMaterialUsage`（包材用量） | Prisma model；`packaging-material-usage/packaging-material-usage.service.ts` | `production_batch_id` 字段类型为 `String?`，**未声明 FK 关系到 ProductionBatch**（已验证）；material_name/material_code 存在快照字段 |
| `MetalDetectionLog`（金检记录） | Prisma model；`metal-detection/metal-detection.service.ts` | `production_batch_id` 有 FK 到 ProductionBatch（已验证）；含铁/不锈钢/铝三种材质通过标志 |
| `FinishedGoodsBatch` 残留 | `Record.batchLinkType = "finished_goods"` 字符串引用，`InventoryMovement.movement_type = "finished_goods_in/out"` | FinishedGoodsBatch 独立 Prisma model 已移除（TASK-9）；残留文本引用仍存在于 Record 和 InventoryMovement 的枚举字符串中（已验证） |

## 5. 正确业务流程

| 步骤 | 用户动作 | 系统结果 | 绑定模块 | 缺失后果 |
|---|---|---|---|---|
| 1. 领料到配料区 | 仓库员从仓库领料到配料区 | `StagingAreaStock` 增加，`InventoryMovement` 记录 | 仓储模块 + 配料区库存 | 配料区无库存，无法触发 FIFO |
| 2. 班前盘点 | 配料区员工完成班前/接班盘点 | `StagingAreaStocktake` 创建，差异触发异常 | workshop-staging | 盘点未完成，配料应被阻断（当前实现未强制） |
| 3. 配料执行 | 配料员在配料区工作台选配方、FIFO 推荐批次、确认用量 | 创建 `MixingExecution` + `MixingExecutionLine`，扣减 `StagingAreaStock` | mixing 模块 | 无配料执行记录，追溯链中无法找到原辅料批次来源 |
| 4. 包装喷码/入库批次确认 | 包装班长录入产品批次号、入库数量、包装机、班组 | 创建或确认 `ProductionBatch`，绑定 team_id、shift_type_id | batch-trace 模块 | 批次号手填且无配方/产品绑定，追溯链断裂 |
| 5. 配料归集 | 生产班长在 BatchDetail 归集面板选择配料执行记录 | 创建 `BatchMixingAggregation`（draft），确认后变 confirmed | batch-trace/batch-mixing-aggregation 模块 | 产品批次无配料归集，追溯新链路中无原辅料信息 |
| 6. 过程记录 | 品质员录入金检记录、CCP 记录、过程监控 | 创建 `MetalDetectionLog`、`CCPRecord`、`ProcessMonitorRecord` | metal-detection、ccp 等模块 | 无金检等过程记录，批次放行无依据 |
| 7. 产品批次放行 | 品质负责人审核并放行 | `ProductionBatch.released_by/released_at` 填写 | batch-trace 模块 | 批次未正式放行，发货、追溯均无放行时间戳 |
| 8. 发货 | 仓储员创建发货记录 | `DeliveryNote` 关联 `ProductionBatch` | 仓储/发货模块 | 追溯链无客户端节点，无法正追 |

## 6. 上下游绑定关系

```text
Supplier -> Material -> MaterialBatch(MaterialLot)
                          |
                     StagingAreaStock (配料区库存，领料后写入)
                          |
                   MixingExecution (一次配料执行，含 area_id / recipe_id / product_id)
                     |
               MixingExecutionLine (逐行原辅料批次用量，含 materialBatchId / actualQuantity)
                     |
           BatchMixingAggregation (桥接，draft -> confirmed)
                     |
              ProductionBatch (产品批次，含 team_id / shift_type_id)
               |           |            |           |
     BatchMaterialUsage  DeliveryNote  MetalDetectionLog  Sample
    (旧链路兼容)        (发货)        (金检)            (留样)
               |
     CCPRecord / ProcessMonitorRecord / ReworkRecord
               |
         NonConformance / CorrectiveAction

ShiftType (主数据: code/name/start_time/end_time)
    |          |
 ProductionBatch.shift_type_id (FK 已实现)
               |
 ShiftInstance.shift_type (文本字段，未 FK 到 ShiftType ← GAP)
    |
 ProductionRun -> ProductionBatch (可选关联，shift_instance -> run -> batch)

PackagingMaterialUsage:
  material_id -> Material (FK 存在)
  production_batch_id -> ProductionBatch (字段存在但无 FK 声明 ← GAP)
```

## 7. 当前系统差距

| GAP 编号 | 当前问题 | 根因 | 影响后果 | 严重级别 | 验证状态 | 证据 |
|---|---|---|---|---|---|---|
| GAP-200 | `ShiftInstance.shift_type` 为 `String` 文本（白班/夜班），未 FK 到 `ShiftType` 主数据表 | `ShiftInstance` schema 设计时早于 `ShiftType` 主数据模型落地；`CreateShiftInstanceDto` 用 `@IsIn(['白班', '夜班'])` 硬编码验证，未引用 ShiftType.id | 班次实例和班次类型主数据无法关联，班次时间规则（跨日/时间段）无法通过 ShiftInstance 查询；`ShiftType` 主数据的维护价值被削弱 | P1 | 已验证 | `server/src/prisma/schema.prisma` L3641-3658；`server/src/modules/shift-instance/dto/create-shift-instance.dto.ts` L5-7 |
| GAP-201 | `BatchMixingAggregation` 加了 `@@unique([mixingExecutionId])` 约束（`agg_exec_unique`），使得一个配料执行只能归集到一个产品批次，与设计文档"支持一次配料关联多个产品批次"矛盾 | `batch-mixing-aggregation.service.ts` 注释中说明了原因：避免同一套原辅料用量被多批次重复计数（双重计数风险）；但这偏离了设计规格文档的多对多意图 | 跨日夜班一次配料用于两个批次的场景（如夜班23:30配料，00:00前后分别喷码两批）无法按原设计建模；追溯时需业务确认是否接受此约束 | P1 | 已验证 | `server/src/prisma/schema.prisma` L1300-1305；`server/src/modules/batch-trace/services/batch-mixing-aggregation.service.ts` L44-59；`docs/superpowers/specs/2026-04-29-staging-area-mixing-and-batch-aggregation-design.md` §5.3 |
| GAP-202 | `BatchDetail.vue` 的"添加物料"对话框中，物料批次 ID 字段为文本输入框（`<el-input v-model="usageForm.materialBatchId" placeholder="请输入物料批次 ID" />`），用户需手填 ID | 旧链路 `BatchMaterialUsage` 未做下拉选批次，UI 未对接批次搜索组件 | 操作容错率极低；用户录入错误的 materialBatchId 会产生假追溯数据；与设计文档明确禁止手填批次 ID 的要求冲突 | P1 | 已验证 | `client/src/views/batch-trace/BatchDetail.vue` L118-119 |
| GAP-203 | `PackagingMaterialUsage.production_batch_id` 字段存在但**未声明 FK 关系到 `ProductionBatch`**，也无外键约束 | schema 中 `production_batch_id String?` 仅为裸字符串字段，未写 `@relation` | 包材用量无法通过 Prisma 关联查询到产品批次；包材追溯链断裂；删除产品批次时无级联约束 | P1 | 已验证 | `server/src/prisma/schema.prisma` L3621-3639；`ProductionBatch` model 中不含 `packagingMaterialUsages` 反向关系声明 |
| GAP-204 | `MixingExecution.shift_type_id` 字段存在（`String?`）但**未声明 FK 关系到 `ShiftType`** | schema 中 `shift_type_id String?` 无 `@relation`；`MixingService.createExecution` 也未填写该字段 | 配料执行无法关联到班次类型主数据；配料记录的班次来源无法追溯 | P2 | 已验证 | `server/src/prisma/schema.prisma` L1241；`server/src/modules/mixing/mixing.service.ts` L120-131（无 shift_type_id 赋值） |
| GAP-205 | `FinishedGoodsBatch` 已从 Prisma model 层移除，但 `Record.batchLinkType` 字段仍有 `"finished_goods"` 字符串值，`InventoryMovement.movement_type` 枚举中仍有 `"finished_goods_in"/"finished_goods_out"` | 迁移计划（TASK-9）要求逐步迁移，尚未完成全链路清理 | 旧追溯代码中引用 `finished_goods_batch_id` 或 `batchLinkType = "finished_goods"` 的查询可能产生空结果或需要特殊处理；产生维护负担 | P2 | 已验证 | `server/src/prisma/schema.prisma` L790；L2672；`docs/superpowers/plans/2026-04-30-staging-area-mixing-product-batch-implementation.md` §0 Scope Guard |
| GAP-206 | 配料执行前的班前/接班盘点校验已实现，未满足盘点状态时阻断创建 MixingExecution | 旧实现未把盘点状态接入 `MixingService.createExecution` | 旧版本存在未盘点先配料的风险 | P2 | 已实现（PR #188 已合并） | PR #188 `GAP-206: Block mixing execution without shift-start stocktake` |
| GAP-207 | `TeamShiftSchedule` 主数据和 `ShiftInstance` 之间无自动关联；`ShiftInstance` 开班时不从排班表带出班组和负责人 | `ShiftInstanceService.create` 未查询 `TeamShiftSchedule`；`ShiftInstance` model 也无 `team_id` 字段 | 开班记录无法追溯责任班组；生产班次追溯时责任班组归属不明 | P2 | 已验证 | `server/src/modules/shift-instance/shift-instance.service.ts` L14-35；`server/src/prisma/schema.prisma` L3641-3658（ShiftInstance 无 team_id 字段） |

## 8. 整改建议

| GAP 编号 | 建议整改 | 依赖模块 | 是否需要新设计 | 建议 PR | 是否可并行 |
|---|---|---|---|---|---|
| GAP-200 | 为 `ShiftInstance` 添加 `shift_type_id` FK 字段指向 `ShiftType`，同时保留 `shift_type` 文本字段一个迁移窗口（兼容旧数据）；更新 `CreateShiftInstanceDto` 支持传入 `shiftTypeId`；更新 `ShiftInstanceService` 写入 FK | team-shift 模块、shift-instance 模块 | 否（仅加字段+迁移）| PR: fix/shift-instance-shift-type-fk | 是 |
| GAP-201 | 业务确认：是否允许一次配料归属多个产品批次（双计数风险）；若允许，需移除 `@@unique([mixingExecutionId])` 约束，同时在追溯展示层加上"共用配料"标识；若不允许，需在设计文档中明确约束并更新业务流程 | batch-trace 模块 | 需要业务确认 | PR: clarify/mixing-aggregation-many-to-many | 否（需先业务决策）|
| GAP-202 | 将 `BatchDetail.vue` 物料批次 ID 输入框替换为带搜索的批次选择组件（类似 `ProductionBatchSelect` 的实现思路），调用 `/batch-trace/material-batches` 接口做 typeahead，禁止普通手填 ID | batch-trace 前端、物料批次 API | 否 | PR: fix/batch-detail-material-batch-selector | 是 |
| GAP-203 | 在 schema 中为 `PackagingMaterialUsage.production_batch_id` 添加 `@relation` 到 `ProductionBatch`，同时在 `ProductionBatch` model 中添加 `packagingMaterialUsages PackagingMaterialUsage[]` 反向关系；运行迁移 | packaging-material-usage 模块 | 否 | PR: fix/packaging-material-usage-fk | 是 |
| GAP-204 | 在 `MixingExecution` schema 中添加 `shift_type ShiftType? @relation(...)` FK；在 `MixingService.createExecution` DTO 和写入逻辑中增加 `shiftTypeId` 可选字段 | mixing 模块、team-shift 模块 | 否 | PR: fix/mixing-execution-shift-type-fk | 是 |
| GAP-205 | 按迁移计划清理 `Record.batchLinkType = "finished_goods"` 的历史数据；将 `InventoryMovement.movement_type` 中的 `finished_goods_in/out` 文本替换为 `production_in/out` 或等效业务语义；发布 TASK-9 清理 PR | record 模块、warehouse 模块 | 否（已有计划）| PR: chore/remove-finished-goods-batch-residuals | 是 |
| GAP-206 | 已完成：配料执行前置盘点校验已合并，无需继续排期 | warehouse/staging-area 模块、mixing 模块 | 否 | 已合并 | 否 |
| GAP-207 | 在 `ShiftInstance` 中增加 `team_id` FK 字段；`ShiftInstanceService.create` 时根据 `shift_type_id` 和 `shift_date` 查询 `TeamShiftSchedule` 自动带出班组，允许人工覆盖但须留原因 | shift-instance 模块、team-shift 模块 | 否 | PR: feat/shift-instance-team-binding | 否（依赖 GAP-1 先完成）|

## 9. 证据索引

| 编号 | 文件路径 | 说明 |
|---|---|---|
| E-01 | `server/src/prisma/schema.prisma` L1235-1308 | MixingExecution、MixingExecutionLine、BatchMixingAggregation 完整 schema |
| E-02 | `server/src/prisma/schema.prisma` L1463-1530 | ProductionBatch 完整 schema，含 shift_type_id FK、team_id FK、aggregations 反向关系 |
| E-03 | `server/src/prisma/schema.prisma` L1533-1560 | BatchMaterialUsage 完整 schema |
| E-04 | `server/src/prisma/schema.prisma` L2843-2872 | ShiftType、TeamShiftSchedule schema |
| E-05 | `server/src/prisma/schema.prisma` L3641-3660 | ShiftInstance schema（shift_type 为 String，无 FK） |
| E-06 | `server/src/prisma/schema.prisma` L3621-3639 | PackagingMaterialUsage schema（production_batch_id 无 FK） |
| E-07 | `server/src/prisma/schema.prisma` L3198-3215 | MetalDetectionLog schema（production_batch_id 有 FK） |
| E-08 | `server/src/modules/mixing/mixing.service.ts` | MixingService：createExecution 含 StagingAreaStock 原子扣减逻辑 |
| E-09 | `server/src/modules/batch-trace/services/batch-mixing-aggregation.service.ts` | BatchMixingAggregationService：含 `@@unique([mixingExecutionId])` 约束防双计数注释 |
| E-10 | `server/src/modules/batch-trace/services/batch-material-usage.service.ts` | BatchMaterialUsageService：旧链路，未做批次选择控件 |
| E-11 | `server/src/modules/shift-instance/shift-instance.service.ts` | ShiftInstanceService：CreateShiftInstanceDto 含 @IsIn(['白班', '夜班']) 硬编码 |
| E-12 | `client/src/views/batch-trace/BatchDetail.vue` L118-119 | 物料批次 ID 手填输入框 |
| E-13 | `client/src/api/batch.ts` | productionBatchApi、materialUsageApi、batchMixingAggregationApi 定义 |
| E-14 | `docs/superpowers/specs/2026-04-29-staging-area-mixing-and-batch-aggregation-design.md` | 配料区投料与产品批次归集设计规格文档 |
| E-15 | `docs/superpowers/plans/2026-04-30-staging-area-mixing-product-batch-implementation.md` | 实施计划文档（含 FinishedGoodsBatch 迁移式剔除要求）|
| E-16 | `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` §5.1.1 | 配料区投料追溯子链（TASK-9 新增）图示 |

## 10. 禁止重复实现与事实源边界

| 对象 | 当前事实源 | 允许展示字段 | 禁止新增的平行事实源 | 旧字段或旧模块处理 |
|---|---|---|---|---|
| 产品批次 | `ProductionBatch` | productName、productCode（快照展示）、batchNumber、status | 不得在 DeliveryNote、Record 等下游模块新建独立的"成品批次"主表 | `FinishedGoodsBatch` 已从 Prisma model 移除；`Record.batchLinkType = "finished_goods"` 属遗留字段，按 TASK-9 计划清理 |
| 原辅料批次投料（新链路） | `MixingExecution` + `MixingExecutionLine` | 均可展示，含 materialBatchId、actualQuantity、fifoSuggested | 不得在产品批次确认阶段新建平行的精确分摊用量字段 | `BatchMaterialUsage` 保留为旧链路兼容；新功能开发不得依赖 BatchMaterialUsage 作为主要追溯入口 |
| 班次类型 | `ShiftType` 主数据 | code、name、start_time、end_time 可在下游展示 | 不得在 ShiftInstance 或 ProductionBatch 中用字符串枚举重新定义班次 | `ShiftInstance.shift_type` 文本字段为历史遗留，待 GAP-1 修复后迁移 |
| 物料主数据 | `Material` | name、code 可展示 | 不得在 PackagingMaterialUsage 中维护独立的物料名称作为新事实源 | `material_name`/`material_code` 快照字段仅用于历史展示，不得作为后续新记录的主数据来源 |

## 11. 后续整改入口

| 优先级 | GAP 编号 | 推荐 PR | 前置依赖 | 可并行 | 验收命令 |
|---|---|---|---|---|---|
| P0 | GAP-202 | fix/batch-detail-material-batch-selector | 无 | 是 | 手工测试：BatchDetail 添加物料弹窗不再出现裸文本 ID 输入框 |
| P0 | GAP-203 | fix/packaging-material-usage-fk | 无 | 是 | `npx prisma validate`；检查 ProductionBatch 含 packagingMaterialUsages 反向关系 |
| P1 | GAP-200 | fix/shift-instance-shift-type-fk | 无 | 是 | `npx prisma validate`；ShiftInstance.shift_type_id FK 通过；旧 shift_type 字段兼容保留 |
| P1 | GAP-201 | clarify/mixing-aggregation-many-to-many | 需业务决策 | 否 | 业务确认邮件/决策记录存档；若移除 unique 约束，需补充物料平衡防双计数测试 |
| P1 | GAP-204 | fix/mixing-execution-shift-type-fk | GAP-200 完成后更清晰 | 是 | `npx prisma validate`；MixingExecution.shift_type_id 有 @relation |
| P2 | GAP-206 | 已合并 | 无 | 否 | PR #188 已合并；未完成盘点时创建 MixingExecution 被阻断 |
| P2 | GAP-207 | feat/shift-instance-team-binding | GAP-200 完成后 | 否 | E2E：开班时自动带出排班班组，可人工覆盖 |
| P3 | GAP-205 | chore/remove-finished-goods-batch-residuals | 追溯链清理完成 | 是 | grep "finished_goods_batch\|batchLinkType.*finished" 返回空结果 |
