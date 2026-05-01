# GAP-301 FragileItemInspection Batch FK 设计

## 背景和现状

`FragileItemInspection` 承载玻璃及硬塑完整性检查记录，是品质管控与放行模块中的异物控制证据。`docs/module-usage/07-quality-qc-release.md` 将它与 `CCPRecord`、`EnvironmentRecord`、`ProcessMonitorRecord`、`MetalDetectionLog` 一起放在 `ProductionBatch -> ... -> 放行判断` 链路中。

当前 `FragileItemInspection.production_batch_id` 仍为可选裸字符串：

- `server/src/prisma/schema.prisma`：`production_batch_id String?`，没有 `@relation` 到 `ProductionBatch`。
- `server/src/modules/fragile-item-inspection/dto/create-fragile-item-inspection.dto.ts`：`production_batch_id?: string`。
- `server/src/modules/fragile-item-inspection/fragile-item-inspection.service.ts`：创建时直接展开 DTO，未校验生产批次存在。
- `client/src/views/fragile-item-inspection/FragileItemInspectionList.vue`：新建记录的“批次号”为可选自由文本输入，空值会转成 `undefined`。

这会让异物控制记录脱离批次放行和召回证据链。追溯、投诉、召回或放行复核时，系统无法证明某个生产批次对应的玻璃及硬塑检查是否合格。

## 当前代码事实源

- `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`：所有会影响追溯、召回、放行、物料平衡的记录必须能够回到批次级别；过程与放行链围绕 `ProductionBatch` 聚合质量证据。
- `docs/module-usage/07-quality-qc-release.md`：GAP-301 已验证，根因是 `FragileItemInspection.production_batch_id` nullable。
- `docs/module-usage/99-current-gap-register.md`：GAP-301 涉及 schema/migration，不涉及历史数据迁移。
- `server/src/prisma/schema.prisma`：`ProductionBatch` 已有 `ccp_records`、`rework_records`、`process_monitor_records`、`metal_detection_logs`、`environment_records` 反向关系；尚无 `fragile_item_inspections`。
- `server/src/prisma/schema.prisma`：`FragileItemInspection` 当前没有 `production_batch` relation，也没有 `production_batch_id` 索引。
- `server/src/modules/fragile-item-inspection/fragile-item-inspection.controller.ts`：接口受 `JwtAuthGuard` 保护，但 create 只传 DTO。
- `server/src/modules/fragile-item-inspection/fragile-item-inspection.service.ts`：`company_id` 仍硬编码为 `'1'`，本 GAP 不处理该租户问题。
- `client/src/components/master-data/ProductionBatchSelect.vue`：已有生产批次远程选择组件，可复用。
- `client/src/api/fragile-item-inspection.ts`：`production_batch_id` 类型当前为 `string | null`，创建 payload 中字段可选。

## 业务边界

本 GAP 只收紧“质量放行链中的玻璃及硬塑完整性检查必须挂生产批次”这一条追溯锚点：

- `FragileItemInspection.production_batch_id` 必须非空。
- `FragileItemInspection.production_batch_id` 必须 FK 到 `ProductionBatch.id`。
- `ProductionBatch` 增加 `fragile_item_inspections` 反向 relation，便于后续批次放行、召回和追溯聚合。
- 创建检查记录时，服务层必须先校验生产批次存在；不存在时返回 400 类业务错误。
- 前端新建检查记录必须使用已有 `ProductionBatchSelect` 选择器，不再允许自由输入或留空。

“哪些场景可无生产批次”的校准结论是：在当前 `FragileItemInspection` 事实表内没有可无生产批次的场景。若业务要记录开工前、停产日、区域级或设施级玻璃/硬塑日常巡检，不能继续复用这张批次放行证据表；应使用 `RecordTemplate/Record` 动态表单，或另开独立设施巡检模型设计。

## 不做什么

- 不新增玻璃器具、硬塑器具或设施主数据。
- 不把 `location` 改成 `Location` FK；如需位置主数据化，应另开 GAP。
- 不实现批次放行状态机。
- 不实现检查不合格自动触发 `NonConformance`；这属于 GAP-305 或后续独立联动。
- 不改 `company_id` 硬编码问题；本 GAP 只处理批次追溯锚点。
- 不自动猜测或回填历史空批次检查记录。
- 不把无批次日常巡检塞进 `FragileItemInspection` 的 nullable 例外。

## 数据、接口和页面影响

### 数据影响

- `FragileItemInspection.production_batch_id` 从 `String?` 改为 `String`。
- 为 `FragileItemInspection.production_batch_id` 增加 `ProductionBatch` relation。
- 为 `ProductionBatch` 增加 `fragile_item_inspections FragileItemInspection[]` 反向 relation。
- 为 `FragileItemInspection.production_batch_id` 增加索引。
- migration 必须在设置 NOT NULL / FK 前检查：
  - 是否存在 `production_batch_id IS NULL` 的历史检查记录。
  - 是否存在引用不到 `production_batches.id` 的 orphan `production_batch_id`。

### 接口影响

- `POST /fragile-item-inspections` 请求必须包含非空 `production_batch_id`。
- 如果 `production_batch_id` 缺失，DTO 校验返回 400。
- 如果 `production_batch_id` 不存在，`FragileItemInspectionService.create()` 返回 400，错误语义为“生产批次不存在”。
- `GET /fragile-item-inspections` 的日期筛选保持不变。
- `DELETE /fragile-item-inspections/:id` 行为保持不变。

### 页面影响

- `FragileItemInspectionList.vue` 新建对话框中的“批次号”改为必填“生产批次”。
- 使用 `client/src/components/master-data/ProductionBatchSelect.vue` 选择已有生产批次。
- 提交 payload 不再把空批次转换为 `undefined`。
- 列表可继续展示 `production_batch_id`；显示批次号/产品名属于后续查询 include 或展示优化，不在本 GAP 范围。

## 历史数据和迁移策略

本 GAP 标记为“不涉及历史数据迁移”，含义是本计划不自动修改历史业务数据。执行 migration 时采用 fail-fast：

1. 如果存在 `FragileItemInspection.production_batch_id IS NULL`，migration 抛错并停止。
2. 如果存在 orphan `production_batch_id`，migration 抛错并停止。
3. 执行 agent 不得用同日批次、同地点批次、器具名称或其他启发式规则自动回填。
4. 如 preflight 失败，执行 agent 必须停止并回报主 agent，由业务确认历史记录真实归属后另开数据修复任务。

## Superpower 与 grill-me 校准记录

- **任务类型判断：** GAP-301 是 `needs_spec`，影响 schema 和追溯/放行证据链，必须走 `brainstorming -> grill-with-docs -> writing-plans`。
- **brainstorming 结论：** 推荐采用 schema 非空 FK + 服务层存在性校验 + 前端必选批次选择器的组合，而不是只做前端或服务层弱校验。原因是 `FragileItemInspection` 属于批次放行证据链，数据库层必须防止绕过服务层写入断链记录。
- **grill-with-docs 校准结论：**
  - 与 `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 不冲突；本设计强化“所有跨模块查询最终都要回到批次级别”。
  - 不重复创建主数据或事实源；继续复用 `ProductionBatch`。
  - 不引入平行批次链路；`FragileItemInspection` 直接回到 `ProductionBatch`。
  - 不破坏 `ProductionBatch / MaterialBatch / BatchMaterialUsage / InventoryMovement` 主链；只补齐过程/放行证据链的一条 FK。
  - 不自动迁移历史数据；发现空值或 orphan 时停止并回报。
  - 无批次日常巡检不属于当前 `FragileItemInspection` 模型；若业务需要，应另开动态表单或设施巡检模型，不保留 nullable 例外。
  - 可拆成独立小 PR：只涉及 fragile-item-inspection、schema、页面字段和 focused tests。
  - 可由执行 agent 按 `superpowers:executing-plans` 独立完成。

## 验收标准

- Prisma schema 中 `FragileItemInspection.production_batch_id` 为非空 `String`。
- Prisma schema 中 `FragileItemInspection.production_batch` FK 指向 `ProductionBatch.id`。
- Prisma schema 中 `ProductionBatch` 有 `fragile_item_inspections FragileItemInspection[]` 反向 relation。
- migration 在设置 NOT NULL / FK 前检查空值和 orphan，并在发现历史数据不满足时失败。
- `CreateFragileItemInspectionDto.production_batch_id` 必填且不能为空。
- `FragileItemInspectionService.create()` 在写入前校验生产批次存在。
- `FragileItemInspectionList.vue` 新建记录时必须选择生产批次，不能提交空批次。
- `npx prisma validate --schema src/prisma/schema.prisma` 通过。
- `npm test -- fragile-item-inspection.service.spec.ts --runInBand` 通过。
- `npm run build -w client` 通过，或执行 agent 明确说明当前环境缺少依赖并提供已运行的替代验证。
