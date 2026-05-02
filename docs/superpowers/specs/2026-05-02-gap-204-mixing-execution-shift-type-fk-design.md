# GAP-204 MixingExecution ShiftType FK 设计

## 背景和现状

`MixingExecution` 是配料区新投料链路的一次配料执行事实表，位于 `MaterialBatch -> StagingAreaStock -> MixingExecution -> MixingExecutionLine -> BatchMixingAggregation -> ProductionBatch` 子链中。当前 schema 已有 `MixingExecution.shift_type_id String?` 字段，但没有声明到 `ShiftType` 的 Prisma relation，也没有 `ShiftType` 反向关系。

这会让配料执行的班次来源停留在裸字符串 ID：Prisma 无法通过 include 读取班次类型名称、时间范围和跨日规则；数据库也不会阻止孤儿 `shift_type_id`。同时，`MixingService.createExecution` 和前端 `MixingWorkbench.vue` 还没有传入 `shiftTypeId`，所以新配料执行即使字段存在，也不会写入班次类型主数据引用。

任务类型判断：GAP-204 属于 `needs_spec`。它影响 schema FK、生产执行事实链和班次类型主数据引用，必须先写轻量 spec，再写 implementation plan。

## 当前代码事实源

- `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`：名称只用于展示，ID 才是跨模块关联事实；生产执行记录必须能回到批次和主数据链。
- `docs/module-usage/06-mixing-production-packaging.md`：已标记 GAP-204，要求 `MixingExecution.shift_type_id` 增加到 `ShiftType` 的 FK，并让创建配料执行时写入该字段。
- `server/src/prisma/schema.prisma`：
  - `MixingExecution.shift_type_id String?` 存在，但没有 `shift_type ShiftType? @relation(...)`。
  - `ShiftType` 已有 `batches ProductionBatch[]`、`records StagingAreaStocktake[]`、`shiftInstances ShiftInstance[]`，但没有 `mixingExecutions MixingExecution[]`。
  - `ProductionBatch.shift_type_id`、`StagingAreaStocktake.shift_type_id`、当前 `ShiftInstance.shift_type_id` 均已关联 `ShiftType`。
- `server/src/modules/mixing/dto/mixing.dto.ts`：`CreateMixingExecutionDto` 不接受 `shiftTypeId`。
- `server/src/modules/mixing/mixing.service.ts`：
  - `listExecutions()` 不支持按班次类型过滤，也没有 include `shift_type`。
  - `createExecution()` 创建 `mixingExecution` 时没有写 `shift_type_id`。
- `client/src/api/mixing.ts`：`CreateMixingExecutionPayload` 没有 `shiftTypeId`。
- `client/src/views/mixing/MixingWorkbench.vue`：配料执行表单只有产品、配方、配料区、工作日期、实际配料重量和原辅料明细，没有班次类型选择。
- `client/src/api/team-shift.ts` 与 `server/src/modules/team-shift/team-shift.service.ts`：已有 `listShiftTypes()` 可读取 active `ShiftType`。

## 业务边界

本 GAP 只补齐 `MixingExecution -> ShiftType` 主数据引用：

- `MixingExecution.shift_type_id` 保持可选，因为历史配料执行可能没有班次类型，且配料执行在某些补录场景下可能先不绑定班次。
- 新增 `shift_type ShiftType? @relation(fields: [shift_type_id], references: [id], onDelete: SetNull)`。
- `ShiftType` 增加 `mixingExecutions MixingExecution[]` 反向关系。
- `CreateMixingExecutionDto` 增加可选 `shiftTypeId`，服务端校验 active `ShiftType` 存在后写入 `shift_type_id`。
- `ListMixingExecutionsDto` 可增加可选 `shiftTypeId` 过滤；响应 include `shift_type`，便于页面展示班次名称和时间段。
- `MixingWorkbench.vue` 使用现有 `teamShiftApi.listShiftTypes()` 加载班次类型并提交 `shiftTypeId`。

## 不做什么

- 不新增班次类型主数据表，不复制白班/夜班枚举。
- 不改变 `ShiftType` 的全局主数据语义，不为 `ShiftType` 新增 `company_id`。
- 不改 `ProductionBatch.shift_type_id`、`StagingAreaStocktake.shift_type_id` 或 `ShiftInstance.shift_type_id` 的既有语义。
- 不实现 GAP-206 的配料前盘点阻断。
- 不实现 GAP-207 的班组自动排班绑定。
- 不改变 `BatchMixingAggregation` 多对多/唯一约束问题。
- 不删除或重写旧链路 `BatchMaterialUsage`。
- 不把 `MixingExecution.shift_type_id` 改为非空；历史和补录场景由后续业务决策再收紧。

## 数据、接口和页面影响

### 数据影响

- `MixingExecution.shift_type_id` 保持 `String?`。
- `MixingExecution` 增加可选 relation：`shift_type ShiftType? @relation(fields: [shift_type_id], references: [id], onDelete: SetNull)`。
- `ShiftType` 增加反向关系：`mixingExecutions MixingExecution[]`。
- `MixingExecution` 增加 `@@index([shift_type_id])`，支持按班次类型查询配料执行。
- FK 删除策略使用 `SetNull`。班次类型如果被硬删除，历史配料执行仍保留，但失去主数据关联；正常业务应通过 `active=false` 停用班次类型。

### 迁移影响

本 GAP 不要求回填历史 `mixing_executions.shift_type_id`：

1. 现有字段本身已经是 nullable，历史数据可保持为空。
2. 迁移只做孤儿数据 preflight：如果存在非空 `shift_type_id` 且无法匹配 `shift_types.id`，必须 fail-fast，不得自动删除或猜测映射。
3. preflight 通过后添加 FK 和索引。

### 接口影响

`POST /mixing/executions` 增加可选字段：

```json
{
  "recipeId": "recipe-id",
  "productId": "product-id",
  "areaId": "area-id",
  "shiftTypeId": "shift-type-id",
  "workDate": "2026-05-02",
  "actualWeight": 50,
  "lines": [
    {
      "recipeLineId": "recipe-line-id",
      "materialBatchId": "material-batch-id",
      "actualQuantity": 50,
      "manualOverride": false
    }
  ]
}
```

服务端行为：

- 不传 `shiftTypeId`：兼容旧客户端，创建成功，`shift_type_id = null`。
- 传入 inactive 或不存在的 `shiftTypeId`：返回 400，不创建配料执行，也不扣减库存。
- 传入有效 `shiftTypeId`：创建 `MixingExecution.shift_type_id`。

`GET /mixing/executions` 增加可选查询参数 `shiftTypeId`，并 include `shift_type`。

### 页面影响

- `MixingWorkbench.vue` 增加班次类型 select，数据来源为 `teamShiftApi.listShiftTypes()`。
- 提交时把选中的 `shiftTypeId` 传给 `mixingApi.createExecution()`。
- 班次类型仍保持可选；没有配置或未选择时，不阻断配料执行。

## 历史数据和迁移策略

本 GAP 涉及 schema migration，但不涉及历史数据回填。

- 已有 `mixing_executions.shift_type_id` 为空的记录保持为空。
- 已有非空 `shift_type_id` 必须引用存在的 `shift_types.id`；否则 migration 停止，执行 agent 回报需要业务确认。
- 不根据工作日期、班组、配料区或 `ShiftInstance` 猜测历史班次类型，因为这会制造不可信追溯数据。
- 后续若业务要求所有新配料执行必须绑定班次类型，应另开 GAP，把字段从 optional 收紧为必填，并定义历史回填策略。

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** GAP-204 当前是 `needs_spec`，本 spec 按 `using-superpowers -> using-git-worktrees -> brainstorming -> grill-with-docs` 流程产出，后续 plan 按 `writing-plans` 产出。
- **brainstorming 结论：** 推荐方案是补齐 `MixingExecution.shift_type_id` 到 `ShiftType` 的可选 FK，同时让创建配料执行可传 `shiftTypeId`；不选择只在服务层校验裸 ID，也不选择立即把字段改为必填。
- **grill-with-docs 校准结论：**
  - 与 `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 不冲突；本设计强化“名称只展示，ID 才关联”。
  - 不重复造主数据；继续复用 `ShiftType` 作为唯一班次类型事实源。
  - 不引入平行批次链路。
  - 不破坏 `ProductionBatch / MaterialBatch / BatchMaterialUsage / InventoryMovement` 主链；只补齐 `MixingExecution -> ShiftType`。
  - 需要 schema migration，但不需要历史数据回填；只需要孤儿 `shift_type_id` preflight。
  - 不需要新的业务确认，除非数据库中已有孤儿 `mixing_executions.shift_type_id`。
  - 可拆成独立 schema/API/frontend PR。
  - 可由执行 agent 按 `superpowers:executing-plans` 独立完成。

## 验收标准

- Prisma schema 中 `MixingExecution.shift_type_id` 有可选 relation 到 `ShiftType.id`。
- `ShiftType` 有 `mixingExecutions` 反向关系。
- migration 在添加 FK 前检查孤儿 `shift_type_id`，发现孤儿时 fail-fast。
- `CreateMixingExecutionDto` 支持可选 `shiftTypeId`。
- `MixingService.createExecution()` 在 `shiftTypeId` 存在时校验 active `ShiftType`，并写入 `shift_type_id`。
- `shiftTypeId` 无效时返回 `BadRequestException`，且不扣减 `StagingAreaStock`。
- `listExecutions()` 支持 `shiftTypeId` 过滤，并 include `shift_type`。
- `client/src/api/mixing.ts` 类型包含可选 `shiftTypeId`。
- `MixingWorkbench.vue` 可从 `teamShiftApi.listShiftTypes()` 加载班次类型并提交。
- `cd server && npx prisma validate --schema src/prisma/schema.prisma` 通过。
- `cd server && npm test -- mixing.service.spec.ts --runInBand` 通过。
- `npm run build:client` 通过。
- 当前仓库未配置根级 GAP-204 E2E 脚本；如执行 agent 添加 E2E，用 `npm run test:e2e -w client -- --grep GAP-204`，不得使用 pnpm。
