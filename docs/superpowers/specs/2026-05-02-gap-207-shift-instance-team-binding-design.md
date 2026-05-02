# GAP-207 ShiftInstance Team Schedule Binding 设计

## 背景和现状

GAP-207 处理的是班次运营记录与排班主数据之间的断链。GAP-200 已让 `ShiftInstance` 通过 `shift_type_id` 关联 `ShiftType` 主数据，满足按 `shift_type_id + shift_date` 查询 `TeamShiftSchedule` 的前置条件。但当前 `TeamShiftSchedule` 只对 `team_id + shift_type_id + work_date` 唯一，允许同一天同一班次排多个班组，因此自动绑定必须显式处理多匹配场景，不能用 `findFirst` 任意选择一个班组。

当前系统已有 `Team`、`TeamMember`、`ShiftType`、`TeamShiftSchedule`，但 `ShiftInstance` 只记录 `shift_type_id`、`shift_type`、`shift_date`、开关班人和状态，没有 `team_id`，也不会在开班时查询排班表。因此开班记录不能稳定说明“这一天这个班次由哪个班组负责”，后续 `ProductionRun -> ProductionBatch` 也无法从班次运营记录追溯责任班组。

任务类型判断：GAP-207 属于 `needs_spec`。它影响生产执行链的事实源绑定和 schema，必须先写 spec，再写 implementation plan。

## 当前代码事实源

- `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`：生产链必须围绕 `ProductionBatch` 和投料主链，不得用展示文本替代 ID 关联；班组、位置、批次等下游字段应复用主数据。
- `docs/module-usage/06-mixing-production-packaging.md`：已标记 GAP-207，要求 `ShiftInstance` 与 `TeamShiftSchedule` 自动关联，开班时带出班组，避免责任班组归属不明。
- `docs/superpowers/specs/2026-05-01-gap-200-shift-instance-shift-type-fk-design.md`：明确 GAP-207 依赖 `ShiftInstance.shift_type_id`，GAP-200 不实现班组自动排班绑定。
- `docs/superpowers/specs/2026-04-29-staging-area-mixing-and-batch-aggregation-design.md`：`TeamShiftSchedule` 原始设计包含 `workDate`、`shiftTypeId`、`teamId`、`leaderId`，并要求现场覆盖责任班组时记录原因。
- `server/src/prisma/schema.prisma`：
  - `Team` 已存在，并与 `ProductionBatch`、`StagingAreaStocktake` 有关系。
  - `TeamMember.employee_id` 是字符串字段，没有独立 `Employee` Prisma relation。
  - `ShiftType` 已有 `shiftInstances ShiftInstance[]`。
  - `TeamShiftSchedule` 当前有 `team_id`、`shift_type_id`、`work_date`，没有 `leader_id`；唯一约束是 `@@unique([team_id, shift_type_id, work_date])`，不保证 `shift_type_id + work_date` 唯一。
  - `ShiftInstance` 当前有 `shift_type_id` FK，但没有 `team_id` 或负责人字段。
- `server/src/modules/shift-instance/shift-instance.service.ts`：`create()` 只解析 `ShiftType`、检查重复班次并创建 `ShiftInstance`，未查询 `TeamShiftSchedule`。
- `server/src/modules/team-shift/team-shift.service.ts`：`createSchedule()` 只创建 `team_id + shift_type_id + work_date` 排班，未保存负责人。
- `client/src/api/shift-instance.ts` 和 `client/src/views/shift/components/OpenShiftDialog.vue`：开班 payload 只传 `shiftTypeId`、`shift_date`、`notes`。

## 业务边界

本 GAP 只补齐“排班表 -> 开班记录”的责任绑定：

- `TeamShiftSchedule` 继续作为某日期、某班次类型、某班组的排班事实源；本 GAP 不把它改成“每个班次日期只能一个班组”的强约束。
- `ShiftInstance` 新增 `team_id` 可选 FK，开班时查询全部 `TeamShiftSchedule(team_id, shift_type_id, work_date)` 匹配行；只有匹配数为 1 时才默认带出班组和负责人。
- `TeamShiftSchedule` 新增 `leader_id` 可选字段，用于记录排班负责人；由于当前 schema 没有 `Employee` 模型，`leader_id` 与 `TeamMember.employee_id` 一样保持字符串。
- `ShiftInstance` 新增 `leader_id` 可选快照字段，开班时从排班表带出，用于保留当次开班责任人。
- 允许开班 payload 人工覆盖 `teamId` 和 `leaderId`，但只要覆盖值与排班表不同，必须提供 `teamOverrideReason`。
- 如果同一 `shiftTypeId + shift_date` 存在多个排班行，服务端不得自动选择；开班请求必须显式传入 `teamId` 和 `teamOverrideReason`，用于记录现场指定责任班组的原因。若该 `teamId` 命中其中一个排班行且未传 `leaderId`，负责人从该排班行带出；若 `teamId` 不在候选排班中，则视为人工覆盖并仍需校验班组有效。
- `ShiftInstance.opened_by` 仍表示实际开班操作人，不替代排班负责人。

如果当天该班次没有排班表记录，系统不阻断开班：`team_id` 和 `leader_id` 为空，但服务端可继续创建开班记录。这避免因历史或未配置排班导致生产中断，同时让有排班数据的新记录自动带出责任归属。

## 不做什么

- 不新增平行班组、班次或人员主数据。
- 不重构 `TeamMember.employee_id` 为强 FK；当前系统没有 `Employee` 模型，本 GAP 不引入员工主数据迁移。
- 不改变 GAP-200 的 `ShiftInstance.shift_type_id` 语义。
- 不改变 `ProductionBatch.team_id`，也不自动从 `ShiftInstance.team_id` 回填既有生产批次。
- 不实现 `MixingExecution.team_id` 或 GAP-204 的配料执行班次类型绑定。
- 不实现排班管理页面重构；只扩展现有排班创建 DTO/API 支持负责人字段。
- 不处理 `company_id = '1'` 的既有租户硬编码问题。
- 不在本 GAP 为 `TeamShiftSchedule` 增加 `@@unique([shift_type_id, work_date])` 或对应迁移；同班次多班组排班是否禁止属于更高层业务排班规则，不在本 PR 强制收窄。

## 数据、接口和页面影响

### 数据影响

- `Team` 增加 `shiftInstances ShiftInstance[]` 反向关系。
- `TeamShiftSchedule` 增加 `leader_id String?`，不加 FK。
- `ShiftInstance` 增加：
  - `team_id String?`
  - `team Team? @relation(fields: [team_id], references: [id], onDelete: SetNull)`
  - `leader_id String?`
  - `team_override_reason String?`
- `ShiftInstance` 增加 `@@index([team_id])`，便于按班组查询开班记录。

### 迁移影响

本 GAP 需要 schema migration，但不强制回填历史数据：

- 现有 `shift_instances` 历史行无法可靠反推出当时班组和负责人，迁移时保持 `team_id`、`leader_id`、`team_override_reason` 为空。
- 现有 `team_shift_schedules` 历史行没有负责人字段，迁移时 `leader_id` 为空。
- 执行 agent 不得根据班次名称、开班人或生产批次猜测历史班组。

### 接口影响

- `POST /shift-instances` 新增可选字段：

```json
{
  "shiftTypeId": "shift-type-id",
  "shift_date": "2026-05-02",
  "teamId": "team-id",
  "leaderId": "employee-or-user-id",
  "teamOverrideReason": "临时调班",
  "notes": "..."
}
```

- 若不传 `teamId`/`leaderId`，服务端按 `shiftTypeId + shift_date` 查询全部 `TeamShiftSchedule`。匹配数为 1 时自动写入排班班组和负责人；匹配数为 0 时允许无班组开班；匹配数大于 1 时返回 400，要求显式传 `teamId` 和 `teamOverrideReason`。
- 若传入覆盖值且与排班记录不同，必须传 `teamOverrideReason`，否则返回 400。
- 若存在多个匹配排班，即使 `teamId` 命中其中一个排班行，也必须传 `teamOverrideReason`，原因用于审计“为什么本次开班选择该责任班组”。
- `GET /shift-instances` 和 `GET /shift-instances/:id` include `team`，返回班组 code/name。
- `POST /team-shifts/schedules` 支持可选 `leaderId`，保存到 `TeamShiftSchedule.leader_id`。

### 页面影响

- `OpenShiftDialog.vue` 可以保持当前最小开班流程，不强制用户选择班组。
- 前端类型 `ShiftInstance` 增加 `team_id`、`team`、`leader_id`、`team_override_reason` 字段，便于后续展示。
- `ShiftDashboard.vue` 展示班次时优先显示 `team.name`；无排班时显示为空或既有布局，不新增阻断提示。
- 本计划不要求新增排班管理页面；排班负责人可先通过 API 写入。

## 历史数据和迁移策略

历史数据不回填：

- `shift_instances.team_id` 设为 nullable，旧行保持 null。
- `shift_instances.leader_id` 设为 nullable，旧行保持 null。
- `team_shift_schedules.leader_id` 设为 nullable，旧行保持 null。

新数据策略：

- 当按 `shiftTypeId + shift_date` 查询结果恰好存在一个 `TeamShiftSchedule` 时，`ShiftInstanceService.create()` 自动带出 `team_id` 和 `leader_id`。
- 当不存在排班时，允许创建无班组开班记录。
- 当存在多个匹配 `TeamShiftSchedule` 时，禁止自动绑定任意班组；请求必须提供 `teamId` 和 `teamOverrideReason`，否则返回 400。
- 当人工覆盖排班班组或负责人时，必须记录原因。

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** GAP-207 当前按 `using-superpowers -> using-git-worktrees -> brainstorming -> grill-with-docs -> writing-plans` 处理，执行阶段只允许 `superpowers:executing-plans`。
- **brainstorming 结论：** 推荐方案是在 `ShiftInstance` 中保存排班结果快照，并由服务端按 `TeamShiftSchedule` 自动带出；不选择只在页面展示排班，也不选择把排班结果写回生产批次。
- **grill-with-docs 校准结论：**
  - 与 `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 不冲突；本设计强化“ID 才关联”，责任班组通过 `team_id` 绑定。
  - 不重复造主数据；继续复用 `Team`、`ShiftType`、`TeamShiftSchedule`。
  - 不引入平行批次链路。
  - 不破坏 `ProductionBatch / MaterialBatch / BatchMaterialUsage / InventoryMovement` 主链；只补齐班次运营记录的责任归属。
  - 需要 schema migration，但历史数据不自动猜测回填。
  - 不需要新的业务确认；当前选择“不新增唯一约束，改为多匹配时要求显式指定班组和原因”，避免 silent arbitrary binding。如果未来业务要求同一日期班次只能一个班组，应另开排班规则收敛 GAP 并配套历史数据清洗。
  - 可拆成独立 PR，依赖 GAP-200 已完成。
  - 可由执行 agent 按 `superpowers:executing-plans` 独立完成。

## 验收标准

- Prisma schema 中 `ShiftInstance.team_id` 为可选 FK，关联 `Team.id`，并有 `@@index([team_id])`。
- Prisma schema 中 `Team.shiftInstances` 反向关系存在。
- `TeamShiftSchedule.leader_id`、`ShiftInstance.leader_id`、`ShiftInstance.team_override_reason` 字段存在。
- migration 不回填历史班组或负责人，不猜测历史责任归属。
- `ShiftInstanceService.create()` 在匹配到唯一排班时自动写入 `team_id` 和 `leader_id`。
- 没有排班时仍可开班，`team_id` 和 `leader_id` 为空。
- 同一 `shiftTypeId + shift_date` 存在多个排班时，未传 `teamId` 和 `teamOverrideReason` 必须返回 400，且不得创建 `ShiftInstance`。
- 同一 `shiftTypeId + shift_date` 存在多个排班时，显式传入候选 `teamId` 和 `teamOverrideReason` 后才能创建；未传 `leaderId` 时从所选排班行带出负责人。
- 人工覆盖排班班组或负责人且未填写 `teamOverrideReason` 时返回 400。
- `GET /shift-instances` 和 `GET /shift-instances/:id` 返回 `team`。
- `POST /team-shifts/schedules` 可保存可选 `leaderId`。
- `npx prisma validate --schema src/prisma/schema.prisma` 通过。
- `npm test -- shift-instance.service.spec.ts team-shift.service.spec.ts --runInBand` 通过，或执行 agent 明确报告与本 GAP 无关的既有失败。
- `pnpm test:e2e -- --grep GAP-207` 通过，或执行 agent 明确说明当前仓库没有对应 grep 用例并补充等价验证。
