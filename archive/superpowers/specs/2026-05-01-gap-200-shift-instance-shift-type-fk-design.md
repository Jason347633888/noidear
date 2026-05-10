# GAP-200 ShiftInstance ShiftType FK 设计

## 背景和现状

`ShiftType` 是班次类型主数据，表达班次编码、名称、开始/结束时间和是否跨日。当前 schema 已让 `ProductionBatch.shift_type_id` 和 `StagingAreaStocktake.shift_type_id` 关联 `ShiftType`，但 `ShiftInstance` 仍用 `shift_type String` 保存 `白班` / `夜班` 文本。

这会让开班记录脱离班次类型主数据：班次实例不能直接查询班次时间规则，跨日逻辑无法从 `ShiftInstance` 推导，后续 GAP-207 也无法可靠地按 `shift_type_id + shift_date` 匹配 `TeamShiftSchedule`。

任务类型判断：GAP-200 属于 `needs_spec`。它影响 schema、历史数据迁移和班次主数据事实源，必须先写 spec，再写 implementation plan。

## 当前代码事实源

- `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`：名称只用于展示，ID 才是跨模块关联事实；下游模块不得重复维护主数据事实源。
- 历史 Multica GAP 模块文档：已标记 GAP-200，要求 `ShiftInstance.shift_type` 从文本枚举迁到 `ShiftType` FK，并保留文本字段一个迁移窗口。
- `server/src/prisma/schema.prisma`：
  - `ShiftType` 有 `id/code/name/start_time/end_time/crosses_day/active`，并有 `batches` 和 `records` 反向关系。
  - `ProductionBatch.shift_type_id` 已有 `ShiftType? @relation(...)`。
  - `StagingAreaStocktake.shift_type_id` 已有 `ShiftType @relation(...)`。
  - `ShiftInstance.shift_type` 是 `String`，`@@unique([company_id, shift_type, shift_date])` 仍基于文本。
- `server/src/modules/shift-instance/dto/create-shift-instance.dto.ts`：`shift_type` 使用 `@IsIn(['白班', '夜班'])` 硬编码。
- `server/src/modules/shift-instance/shift-instance.service.ts`：创建时按 `company_id + shift_type + shift_date` 查重，只写文本 `shift_type`。
- `client/src/views/shift/components/OpenShiftDialog.vue`：开班弹窗硬编码白班/夜班单选。
- `client/src/api/team-shift.ts` 与 `server/src/modules/team-shift/team-shift.service.ts`：已有 `listShiftTypes()` 可读 active `ShiftType`。

## 业务边界

本 GAP 只收敛 `ShiftInstance` 到 `ShiftType` 主数据：

- `ShiftInstance` 新增 `shift_type_id`，指向 `ShiftType.id`。
- 新开班必须优先传 `shiftTypeId`。
- `shift_type` 文本字段保留一个迁移窗口，作为历史展示快照和旧客户端兼容输入，不再作为新事实源。
- 服务端从 `ShiftType.name` 写入 `shift_type` 快照，避免前端手填班次名称。
- 查重逻辑切换到 `company_id + shift_type_id + shift_date`。

由于 `ShiftType` 当前没有 `company_id` 字段，本 GAP 不引入租户级班次类型隔离；它沿用现有全局 `ShiftType` 主数据语义。

## 不做什么

- 不删除 `ShiftInstance.shift_type` 文本字段。
- 不新增平行班次类型表，不把白班/夜班枚举复制到其他模块。
- 不改 `ProductionBatch.shift_type_id` 和 `StagingAreaStocktake.shift_type_id` 的既有语义。
- 不实现 GAP-207 的 `ShiftInstance.team_id` 自动排班绑定。
- 不实现 GAP-204 的 `MixingExecution.shift_type_id` FK。
- 不重做班次主数据管理页面；只让开班弹窗使用现有 `teamShiftApi.listShiftTypes()`。
- 不处理 `company_id` 硬编码问题；这是独立租户隔离问题。

## 数据、接口和页面影响

### 数据影响

- `ShiftInstance` 增加必填 `shift_type_id` 字段和 `shift_type_ref ShiftType @relation(...)`。
- `ShiftType` 增加 `shiftInstances ShiftInstance[]` 反向关系。
- 增加 `@@unique([company_id, shift_type_id, shift_date])` 和 `@@index([shift_type_id])`。
- 旧的 `@@unique([company_id, shift_type, shift_date])` 在迁移窗口保留，用于避免旧字段快照产生重复。
- FK 删除策略使用 `Restrict`。班次类型停用应设置 `active=false`，不应硬删除导致历史开班记录失去时间规则。

### 迁移影响

迁移必须兼容现有 `shift_instances.shift_type` 文本：

1. 添加 nullable `shift_type_id`。
2. 确保已有文本值能映射到 `ShiftType`：
   - `白班` 映射到 `ShiftType.name = '白班'`，如不存在则插入默认 `code = 'DAY'`、`name = '白班'`、`start_time = '08:00'`、`end_time = '20:00'`、`crosses_day = false`。
   - `夜班` 映射到 `ShiftType.name = '夜班'`，如不存在则插入默认 `code = 'NIGHT'`、`name = '夜班'`、`start_time = '20:00'`、`end_time = '08:00'`、`crosses_day = true`。
3. 回填所有 `shift_instances.shift_type_id`。
4. 如果仍存在无法映射的 `shift_type`，迁移必须抛错停止，不得猜测。
5. 设置 `shift_type_id NOT NULL`，添加 FK、唯一约束和索引。

### 接口影响

- `POST /shift-instances` 新合同优先接受：

```json
{
  "shiftTypeId": "shift-type-id",
  "shift_date": "2026-05-01",
  "notes": "..."
}
```

- 迁移窗口内可兼容旧合同：

```json
{
  "shift_type": "白班",
  "shift_date": "2026-05-01"
}
```

旧合同只用于兼容；服务端必须查 `ShiftType.name = shift_type`，写入 `shift_type_id` 和 `shift_type` 快照。若找不到 active `ShiftType`，返回 400。

- `GET /shift-instances` 和 `GET /shift-instances/:id` 应 include `shift_type_ref`，便于页面展示名称、时间范围和 `crosses_day`。

### 页面影响

- `OpenShiftDialog.vue` 使用 `teamShiftApi.listShiftTypes()` 加载 active 班次类型。
- 班次类型控件从硬编码 radio 改成 select，提交 `shiftTypeId`。
- `ShiftDashboard.vue` 展示优先用 `shift.shift_type_ref.name`，兼容回退 `shift.shift_type`。
- `client/src/api/shift-instance.ts` 类型增加 `shiftTypeId` 和 `shift_type_ref`。

## 历史数据和迁移策略

本 GAP 涉及历史数据。迁移策略是“可确定映射则自动回填，无法确定则 fail-fast”：

- 现有代码只允许 `白班` / `夜班`，所以这两个值可确定映射到 `ShiftType`。
- migration 可以为缺失的默认 `ShiftType` 插入主数据，因为它是在收敛现有白班/夜班事实，而不是创建平行事实源。
- 如果数据库中存在除 `白班` / `夜班` 之外的历史 `shift_type`，执行 agent 必须停止并回报主 agent，不得自动创建未知班次类型。
- 旧 `shift_type` 字段保留，后续可另开清理 GAP 删除。

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** GAP-200 当前是 `needs_spec`，本 spec 按 `using-superpowers -> using-git-worktrees -> brainstorming -> grill-with-docs` 流程产出，后续 plan 按 `writing-plans` 产出。
- **brainstorming 结论：** 推荐方案是添加 `shift_type_id` FK，并保留 `shift_type` 文本为兼容快照；不选择只在服务层校验文本，也不选择立即删除文本字段。
- **grill-with-docs 校准结论：**
  - 与 `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 不冲突；本设计强化“名称只展示，ID 才关联”。
  - 不重复造主数据；继续复用 `ShiftType` 作为唯一班次类型事实源。
  - 不引入平行批次链路。
  - 不破坏 `ProductionBatch / MaterialBatch / BatchMaterialUsage / InventoryMovement` 主链；只补齐 `ShiftInstance -> ShiftType`。
  - 需要迁移历史 `shift_instances.shift_type`。
  - 不需要新的业务确认，除非历史数据出现 `白班` / `夜班` 之外的值。
  - 可拆成独立 schema/migration/API/frontend PR。
  - 可由执行 agent 按 `superpowers:executing-plans` 独立完成。

## 验收标准

- Prisma schema 中 `ShiftInstance.shift_type_id` 为必填 FK，关联 `ShiftType.id`。
- `ShiftType` 有 `shiftInstances` 反向关系。
- `ShiftInstance` 同时保留 `shift_type` 文本快照。
- migration 能把现有 `白班` / `夜班` 历史记录回填到 `shift_type_id`。
- migration 遇到未知 `shift_type` 时停止，不自动猜测。
- `POST /shift-instances` 使用 `shiftTypeId` 可成功开班。
- 旧 payload 只传 `shift_type` 时仍可在迁移窗口内成功开班，并写入对应 `shift_type_id`。
- 重复开同一 `company_id + shift_type_id + shift_date` 返回冲突。
- 前端开班弹窗从 `team-shifts/shift-types` 加载班次类型，不再硬编码白班/夜班。
- `npx prisma validate --schema src/prisma/schema.prisma` 通过。
- `npm test -- shift-instance.service.spec.ts team-shift.service.spec.ts --runInBand` 通过，或执行 agent 明确报告与本 GAP 无关的既有失败。
- `pnpm test:e2e -- --grep GAP-200` 通过，或执行 agent 明确说明当前仓库没有对应 grep 用例并补充等价验证。
