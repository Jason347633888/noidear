# GAP-109 配料区暂存区域配置化设计

## 背景和现状

GAP-109 在 历史 Multica GAP 模块文档 中定义为：`StagingAreaService.stageToZone` 固定使用 `['筛粉间', '称油间', '小料房']` 作为可用 zone，区域名称硬编码在服务端代码里，仓库布局调整或多租户区域差异都需要改代码。

当前 issue 标题/描述提到 FIFO 推荐，但项目分诊表和 manifest 中 GAP-109 的事实是“配料区 zone 配置化”；FIFO 推荐属于 GAP-110。本文档按项目文档中的 GAP-109 处理，避免把两个 GAP 合并。

## 当前代码事实源

- `server/src/modules/warehouse/staging-area.service.ts` 顶部定义 `WORKSHOP_ZONES`，`stageToZone()` 和 `transferZone()` 用该常量校验中文区域名，并写入 `StagingAreaStock.location`。
- 同一服务中 `stageToArea()` 已经使用 `StageMaterialToAreaDto.areaId` 查询 `WorkshopArea`，写入 `StagingAreaStock.area_id`，并将 `WorkshopArea.name` 作为 `location` 快照。
- `server/src/prisma/schema.prisma` 中 `WorkshopArea` 已存在，包含 `company_id/code/name/status/sort_order/deleted_at`，并与 `StagingAreaStock.area_id`、`StagingAreaStocktake.area_id`、`RecipeLine.area_id`、`BatchMaterialUsage.area_id` 关联。
- `server/src/modules/workshop-area/workshop-area.service.ts` 已提供 active `WorkshopArea` 查询，前端仓储盘点页、配料执行页、配方页已经读取 `workshopAreaApi.getList()`。
- `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 要求位置/区域属于共享主数据，不允许下游模块重复维护平行事实源。

## 业务边界

GAP-109 的目标是让配料区暂存、迁移和旧 stage 入口使用 `WorkshopArea` 作为区域事实源：

- 新写入的 `StagingAreaStock` 必须优先绑定 `area_id`。
- `location` 仅保留为区域名称快照，用于旧页面展示和历史兼容。
- 旧 `/warehouse/staging-area/stage` 和 `/warehouse/staging-area/transfer` 若仍被调用，应通过 `areaId/toAreaId` 校验 active `WorkshopArea`；如必须兼容旧 `zone/toZone` 字段，也只能通过 active `WorkshopArea.name` 解析，不能继续使用硬编码列表。
- `stage-to-area` 已经符合方向，本 GAP 只补齐旧 zone 路径和测试。

## 不做什么

- 不新增 Prisma model 或迁移。
- 不改 `WorkshopArea` 的主数据维护能力。
- 不改 FIFO 推荐逻辑；GAP-110 单独处理。
- 不重写配料执行、配方、盘点的区域选择交互。
- 不回填历史 `StagingAreaStock.area_id = null` 的旧数据；历史兼容通过 `location` 快照保留。

## 数据、接口和页面影响

- 数据：继续使用 `WorkshopArea` 和 `StagingAreaStock.area_id`，不新增事实源。`location` 从事实字段降级为展示快照。
- 接口：`POST /warehouse/staging-area/stage` 建议接受 `areaId`，兼容 `zone`；`POST /warehouse/staging-area/transfer` 建议接受 `toAreaId`，兼容 `toZone`。
- 页面：当前 `client/src/views/warehouse/StagingArea.vue` 主要使用盘点和 `areaId` 查询，不需要新增页面；若存在旧 stage/transfer 调用，只需改为传 `areaId/toAreaId`。
- 测试：补 `StagingAreaService` 单元测试，覆盖 active `WorkshopArea` 校验、写入 `area_id`、旧中文名称兼容和停用区域拒绝。

## 历史数据和迁移策略

不涉及数据库迁移。历史 `StagingAreaStock.location` 文本继续可读；新写入路径要同时写 `area_id` 和 `location` 快照。若执行 agent 发现生产数据需要历史回填，必须停止并回报，不得在本 GAP 内临时添加迁移。

## Superpower 与 grill-with-docs 校准结论

- 与 `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 不冲突：区域属于 `Location/WorkshopArea` 共享主数据，下游库存暂存只引用，不新建平行事实源。
- 不重复造主数据：不创建新的 zone 配置表，复用 `WorkshopArea`。
- 不引入平行批次链路：批次仍是 `MaterialBatch`，暂存库存仍是 `StagingAreaStock`。
- 不破坏 `ProductionBatch / MaterialBatch / BatchMaterialUsage / InventoryMovement` 主链：本 GAP 只改变配料区区域引用，不改变库存流水和投料桥接。
- 不需要历史数据迁移：保留 `location` 旧快照；新记录补齐 `area_id`。
- 不需要额外业务确认：active `WorkshopArea` 已是现有主数据和前端选择来源。
- 可拆成独立小 PR：只改仓储 staging area 旧 zone 路径及测试。
- 可由执行 agent 按 `executing-plans` 独立完成。

## 验收标准

- `server/src/modules/warehouse/staging-area.service.ts` 不再导出或依赖 `WORKSHOP_ZONES` 硬编码列表。
- `stageToZone()` 新写入或更新暂存库存时校验 active `WorkshopArea`，并写入 `area_id`。
- `transferZone()` 迁移目标区时校验 active `WorkshopArea`，目标库存按 `batchId + area_id` 合并。
- 停用或不存在的区域返回业务错误，不写 `StagingAreaStock`。
- `location` 仅作为 `WorkshopArea.name` 快照保留。
- 单元测试覆盖新区域校验和旧字段兼容。
