# GAP-605 Calibration Record Approval Flow Design

## 背景和现状

GAP-605 针对 `equipment-and-measuring` 模块中的计量器具校准记录。当前 `MeasuringEquipmentModule` 只注册 `MeasuringEquipmentController` 和 `MeasuringEquipmentService`，未接入 `UnifiedApprovalModule`。`POST /measuring-equipment/calibrations` 创建 `CalibrationRecord` 后会立即更新 `MeasuringEquipment.last_calibrated_at`、`next_calibration_at` 和 `status`，即校准记录由录入人直接生效。

这会使高风险量器的校准结果缺少二级确认。对金属检测仪、温度计、电子秤等影响检验和放行证据的量器，校准证书号、有效期和结果应先进入审批，审批通过后才成为量器台账的最新有效校准状态。

本设计按 issue MYL-192 的业务指令处理：GAP-605 已具备写 spec 和 implementation plan 的条件，目标是把校准记录纳入统一审批平台。

## 当前代码事实源

- `server/src/prisma/schema.prisma`
  - `MeasuringEquipment` 是计量器具台账事实源。
  - `CalibrationRecord` 是校准记录事实源，目前只有校准日期、有效期、机构、证书号、结果、备注和创建人字段，无状态机、无 `approvalInstanceId`。
- `server/src/modules/measuring-equipment/measuring-equipment.module.ts`
  - 当前未 import `UnifiedApprovalModule`，也没有注册审批回调。
- `server/src/modules/measuring-equipment/measuring-equipment.service.ts`
  - `createCalibration(dto, companyId)` 先校验量器属于当前公司，再创建校准记录，随后立即更新量器的最新校准日期、下次校准日期和状态。
  - 当前 GAP-600/GAP-602 的公司隔离已在代码中体现：创建、列表、逾期查询和历史查询均接收 `companyId`。
- `server/src/modules/equipment/record.service.ts` 与 `server/src/modules/equipment/equipment.module.ts`
  - `MaintenanceRecord` 已有可参考的 `ApprovalEngineService.startApproval` 调用和 `ApprovalCallbackRegistry` 回调模式。
- `server/src/modules/unified-approval/approval-engine.service.ts`
  - 统一审批平台在最终通过时调用步骤的 `onApproved` 回调。
  - 当前驳回路径只更新 `ApprovalInstance.status = REJECTED`，没有业务 `onRejected` 回调。
- `server/src/prisma/seed.ts`
  - 统一审批定义通过 seed upsert 到 `ApprovalDefinition`，如 `maintenance_record`、`deviation_report`、`corrective_action`。
- `client/src/views/measuring-equipment/EquipmentList.vue`
  - 当前“添加校准”弹窗提交后显示“校准记录添加成功”，未表达“待审批/已批准/已驳回”状态。

## 业务边界

- `MeasuringEquipment` 继续作为计量器具台账事实源，不新增平行量器台账。
- `CalibrationRecord` 继续作为校准历史事实源，不把校准历史明细挪到 `MeasuringEquipment`。
- `ApprovalDefinition / ApprovalInstance / ApprovalTask / ApprovalAction` 是审批事实源，校准记录只保存 `approvalInstanceId` 和业务状态快照。
- 新校准记录的生效边界是审批通过回调，不是创建记录成功。
- 审批通过后才允许更新量器台账的 `last_calibrated_at`、`next_calibration_at` 和 `status`。
- 审批驳回后保留校准记录证据，但不得更新量器台账。
- 查询量器列表时，“最近一次校准记录”只代表最近一次已批准并生效的记录；校准历史可展示 submitted/approved/rejected 全量记录。

## 不做什么

- 不把 `CalibrationRecord` 改造成动态 `RecordTemplate/Record`。
- 不新增平行审批表或模块内私有审批任务。
- 不改 `MeasuringEquipment` 主数据含义，不在检验记录中复制量器信息。
- 不处理 GAP-604 的检验记录关联量器问题。
- 不重新设计旧 `Approval`、`Workflow`、`Task`、`RecordTask` 边界。
- 不追溯创建历史校准记录的审批实例。
- 不执行业务代码实现；本 PR 只输出 spec、plan、triage、manifest 和 roadmap 更新。

## 数据影响

### Prisma 模型

`CalibrationRecord` 需要增加审批状态和审批实例字段：

- `status String @default("submitted")`
- `approvalInstanceId String?`
- `submitted_at DateTime?`
- `approved_at DateTime?`
- `rejected_at DateTime?`
- `rejected_reason String?`
- `reviewer_id String?`
- `@@index([approvalInstanceId])`
- `@@index([company_id, status])`
- `@@index([company_id, measuring_equipment_id, status])`

状态语义：

| status | 含义 | 是否更新量器台账 |
|---|---|---|
| `submitted` | 已录入并发起审批，等待确认 | 否 |
| `approved` | 审批通过，成为有效校准记录 | 是 |
| `rejected` | 审批驳回，保留证据但不生效 | 否 |

### 历史数据和迁移策略

涉及历史数据。

现有 `calibration_records` 都是创建时已直接更新量器台账的记录。迁移时应把既有记录标记为 `approved`，`approved_at` 使用 `created_at`，`submitted_at` 使用 `created_at`，`approvalInstanceId` 保持空值，不补造审批实例。

新字段迁移后，`CalibrationRecord.status` 的 Prisma 默认值应为 `submitted`，新记录必须显式走审批；迁移 SQL 需将历史行更新为 `approved`，避免历史记录被误判为待审批。

## 接口影响

- `POST /measuring-equipment/calibrations`
  - 变更为创建 `submitted` 校准记录并发起 `resourceType = calibration_record`、`triggerKey = submit` 的统一审批。
  - 成功返回带 `approvalInstanceId` 的 `CalibrationRecord`。
  - 不再立即更新 `MeasuringEquipment` 的最新校准日期、下次校准日期和状态。
  - 如果计量器具不属于当前公司，仍返回 NotFound。
  - 如果审批定义缺失，应回滚校准记录创建并返回错误，防止无审批定义时直接或半成品生效。
- `GET /measuring-equipment`
  - 返回设备列表时，内嵌的最近校准记录只取 `status = approved` 的记录。
- `GET /measuring-equipment/:id/calibrations`
  - 返回该量器的全部校准历史，包含 `status`、`approvalInstanceId`、审批时间和驳回原因。
- `ApprovalEngineService.rejectTask`
  - 需要支持可选的步骤级 `onRejected` 回调，以便校准记录在审批中心被驳回时同步为 `rejected`。

## 页面影响

- `client/src/api/measuring-equipment.ts` 增加校准记录审批字段类型。
- `client/src/views/measuring-equipment/EquipmentList.vue`
  - “添加校准”文案调整为“提交校准”。
  - 提交成功提示改为“校准记录已提交审批”。
  - 校准历史表展示审批状态。
  - 量器列表的“上次校准/下次校准”仍基于量器台账字段，只有审批通过后才变化。

## Superpower 与 grill-with-docs 校准记录

- 使用 `brainstorming`：是。已基于 issue 指令、GAP 表、模块文档、主数据/追溯模型和代码事实源完成设计探索。
- 使用 `grill-with-docs`：是。校准问题已按以下清单校准：
  - 与 `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 不冲突；`MeasuringEquipment` 和 `CalibrationRecord` 是共享实体与过程记录。
  - 不重复造主数据或事实源；量器台账仍为 `MeasuringEquipment`。
  - 不引入平行批次链路；本 GAP 不触碰 `ProductionBatch / MaterialBatch / BatchMaterialUsage / InventoryMovement` 主链。
  - 需要迁移历史校准记录状态，但不补造历史审批实例。
  - issue 已给出业务确认：GAP-605 需要输出校准记录审批 spec 和 plan。
  - 可拆成单独 PR；与 GAP-604 的检验记录关联量器分离。
  - 可被执行 agent 按 `superpowers:executing-plans` 独立完成。
- 使用 `writing-plans`：是。后续 implementation plan 必须只交给执行 agent 用 `superpowers:executing-plans` 执行。

## 验收标准

1. 新建校准记录时，记录状态为 `submitted`，返回 `approvalInstanceId`，并生成统一审批任务。
2. 新建校准记录后，在审批通过前，`MeasuringEquipment.last_calibrated_at`、`next_calibration_at` 和 `status` 不发生变化。
3. 审批通过后，`CalibrationRecord.status` 变为 `approved`，写入 `approved_at`、`reviewer_id`，并事务内更新量器台账的最新校准日期、下次校准日期和状态。
4. 审批驳回后，`CalibrationRecord.status` 变为 `rejected`，写入 `rejected_at`、`rejected_reason`、`reviewer_id`，且量器台账不更新。
5. 量器列表只把已批准校准记录作为最近有效校准记录。
6. 校准历史展示 submitted/approved/rejected 状态和审批实例 ID。
7. 历史校准记录迁移为 `approved`，不创建历史审批实例。
8. 单元测试覆盖创建、通过、驳回、租户隔离、列表只取已批准记录、统一审批驳回回调。
9. 执行 agent 在独立 worktree 或 Multica 隔离工作目录中完成实现；如果当前代码与 plan 冲突，必须停止并回报。
