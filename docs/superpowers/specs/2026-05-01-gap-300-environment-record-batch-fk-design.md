# GAP-300 EnvironmentRecord Batch FK 设计

## 背景和现状

`EnvironmentRecord` 承载生产环境温湿度、压差等前提方案监控记录。`docs/module-usage/07-quality-qc-release.md` 已把它放在质量放行证据链中，与 `CCPRecord`、`ProcessMonitorRecord`、`MetalDetectionLog`、`FragileItemInspection` 一起支撑 `ProductionBatch` 是否可放行。

当前 `EnvironmentRecord.production_batch_id` 在 Prisma schema、DTO 和页面中都是可选：

- `server/src/prisma/schema.prisma`：`production_batch_id String?`，且没有 `@relation` 到 `ProductionBatch`。
- `server/src/modules/environment-record/dto/create-environment-record.dto.ts`：`production_batch_id?: string`。
- `client/src/views/environment-record/EnvironmentRecordList.vue`：生产批次号输入框提示为“可选”，提交时空值会转成 `undefined`。

这会让环境记录脱离批次追溯链。后续追溯、投诉、召回或放行复核时，系统无法证明某个生产批次对应的生产环境是否合规。

## 当前代码事实源

- `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`：所有影响追溯、召回、放行、物料平衡的记录必须回到批次级别；过程与放行链为 `ProductionBatch -> CCPRecord / EnvironmentRecord / ProcessMonitorRecord / MetalDetectionLog / ReworkRecord / Sample`。
- `docs/module-usage/07-quality-qc-release.md`：GAP-300 已验证，根因是 `EnvironmentRecord.production_batch_id` nullable。
- `docs/module-usage/99-current-gap-register.md`：GAP-300 涉及 schema/migration，不涉及历史数据迁移。
- `server/src/prisma/schema.prisma`：`EnvironmentRecord` 当前没有 `production_batch` relation；`ProductionBatch` 当前也没有 `environment_records` 反向字段。
- `server/src/modules/environment-record/environment-record.service.ts`：创建记录时直接展开 DTO，未校验生产批次存在。
- `server/src/modules/environment-record/environment-record.controller.ts`：接口受 `JwtAuthGuard` 保护，但只传 `req.user.id` 给 service。
- `client/src/api/environment-record.ts`：`EnvironmentRecord.production_batch_id` 可为 `string | null`，创建 payload 中该字段可选。
- `client/src/views/environment-record/EnvironmentRecordList.vue`：新建对话框使用自由文本输入生产批次号。

## 业务边界

本 GAP 只收紧“质量放行模块中的环境记录必须挂生产批次”这一条追溯锚点：

- `EnvironmentRecord.production_batch_id` 必须非空。
- `EnvironmentRecord.production_batch_id` 必须 FK 到 `ProductionBatch.id`。
- `ProductionBatch` 增加 `environment_records` 反向 relation，便于后续批次放行和追溯查询聚合。
- 创建环境记录时，业务层必须先校验生产批次存在；不存在时返回 400 类业务错误，不依赖数据库 FK 暴露低层错误。
- 前端新建环境记录必须使用已有 `ProductionBatchSelect` 选择器，不再允许自由输入或留空。

`EnvironmentRecord.location` 仍为自由文本，这是 GAP-302 的范围，本 GAP 不处理。

## 不做什么

- 不新增环境监测主数据或位置主数据。
- 不把 `location` 改成 `Location` FK；这是 GAP-302。
- 不实现批次放行状态机。
- 不实现环境超标自动触发 `NonConformance`；这属于 GAP-305 或后续独立联动。
- 不处理 `FragileItemInspection.production_batch_id`；这是 GAP-301。
- 不改 `company_id` 硬编码问题；本 GAP 只处理批次追溯锚点。
- 不自动猜测或回填历史空批次环境记录。

## 数据、接口和页面影响

### 数据影响

- `EnvironmentRecord.production_batch_id` 从 `String?` 改为 `String`。
- 为 `EnvironmentRecord.production_batch_id` 增加 `ProductionBatch` relation。
- 为 `ProductionBatch` 增加 `environment_records EnvironmentRecord[]` 反向 relation。
- 为 `EnvironmentRecord.production_batch_id` 增加索引。
- migration 必须在设置 NOT NULL / FK 前检查：
  - 是否存在 `production_batch_id IS NULL` 的历史环境记录。
  - 是否存在引用不到 `production_batches.id` 的 orphan `production_batch_id`。

### 接口影响

- `POST /environment-records` 请求必须包含 `production_batch_id`。
- 如果 `production_batch_id` 缺失，DTO 校验返回 400。
- 如果 `production_batch_id` 不存在，`EnvironmentRecordService.create()` 返回 400，错误语义为“生产批次不存在”。
- `GET /environment-records` 的现有日期筛选保持不变。

### 页面影响

- `EnvironmentRecordList.vue` 新建对话框中的“生产批次号”改为必填“生产批次”。
- 使用 `client/src/components/master-data/ProductionBatchSelect.vue` 选择已有生产批次。
- 提交 payload 不再把空批次转换为 `undefined`。
- 列表可继续按原字段展示，后续若需要批次号展示可另开页面优化。

## 历史数据和迁移策略

本 GAP 标记为“不涉及历史数据迁移”，含义是本计划不自动修改历史业务数据。执行 migration 时采用 fail-fast：

1. 如果存在 `EnvironmentRecord.production_batch_id IS NULL`，migration 抛错并停止。
2. 如果存在 orphan `production_batch_id`，migration 抛错并停止。
3. 执行 agent 不得用最近批次、同日批次、位置文本或其他启发式规则自动回填。
4. 如 preflight 失败，执行 agent 必须停止并回报主 agent，由业务确认历史记录真实归属后另开数据修复任务。

## Superpower 与 grill-me 校准记录

- **任务类型判断：** GAP-300 是 `needs_spec`，影响 schema 和追溯链，必须走 `brainstorming -> grill-with-docs -> writing-plans`。
- **brainstorming 结论：** 推荐采用 schema 非空 FK + 服务层存在性校验 + 前端必选批次选择器的组合，而不是只做业务层弱校验。原因是环境记录属于放行证据链，数据库层必须防止绕过服务层写入批次断链记录。
- **grill-with-docs 校准结论：**
  - 与 `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 不冲突；本设计强化“所有跨模块查询最终都要回到批次级别”。
  - 不重复创建主数据或事实源；继续复用 `ProductionBatch`。
  - 不引入平行批次链路；`EnvironmentRecord` 直接回到 `ProductionBatch`。
  - 不破坏 `ProductionBatch / MaterialBatch / BatchMaterialUsage / InventoryMovement` 主链；只补齐过程/放行证据链的一条 FK。
  - 不自动迁移历史数据；发现空值或 orphan 时停止并回报。
  - 不需要新的业务确认；GAP 已验证且模块文档已明确环境记录属于批次放行证据链。
  - 可拆成独立小 PR：只涉及 environment-record、schema、页面字段和 focused tests。
  - 可由执行 agent 按 `superpowers:executing-plans` 独立完成。

## 验收标准

- Prisma schema 中 `EnvironmentRecord.production_batch_id` 为非空 `String`。
- Prisma schema 中 `EnvironmentRecord.production_batch` FK 指向 `ProductionBatch.id`。
- Prisma schema 中 `ProductionBatch` 有 `environment_records EnvironmentRecord[]` 反向 relation。
- migration 在设置 NOT NULL / FK 前检查空值和 orphan，并在发现历史数据不满足时失败。
- `CreateEnvironmentRecordDto.production_batch_id` 必填且不能为空。
- `EnvironmentRecordService.create()` 在写入前校验生产批次存在。
- `EnvironmentRecordList.vue` 新建记录时必须选择生产批次，不能提交空批次。
- `npx prisma validate --schema src/prisma/schema.prisma` 通过。
- `npm test -- environment-record.service.spec.ts --runInBand` 通过。
- `pnpm test:e2e -- --grep GAP-300` 通过，或执行 agent 明确说明该命令在当前仓库无对应脚本并提供已运行的替代验证。
