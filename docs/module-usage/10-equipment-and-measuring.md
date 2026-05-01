# 设备管理与计量器具管理

---
module_id: equipment-and-measuring
business_chain:
  - 设备台账链：Equipment → MaintenancePlan → MaintenanceRecord（approved）
  - 故障链：Equipment → EquipmentFault → MaintenanceRecord（corrective）
  - 计量器具链：MeasuringEquipment → CalibrationRecord
module_type:
  - 基础设施管理
  - 合规记录
source_of_truth:
  - server/src/prisma/schema.prisma: Equipment, MaintenancePlan, MaintenanceRecord, EquipmentFault, MeasuringEquipment, CalibrationRecord
  - server/src/modules/equipment/
  - server/src/modules/measuring-equipment/
facts_or_projections:
  - Equipment：设备台账事实源（设备编号、类别、位置、状态）
  - MaintenancePlan：系统生成的保养计划（由 scheduler.service.ts 自动创建）
  - MaintenanceRecord：保养执行记录事实源（含审批状态机 draft→submitted→approved/rejected）
  - EquipmentFault：故障记录事实源
  - MeasuringEquipment：计量器具台账事实源（company_id 当前硬编码为 '1'，见 GAP-600）
  - CalibrationRecord：校准记录事实源（company_id 当前硬编码为 '1'，见 GAP-600）
downstream_consumers:
  - 仓储模块（RequisitionType.maintenance 领料，来自 05 模块）
  - 统一审批平台（MaintenanceRecord 审批回调由 UnifiedApprovalModule 处理）
  - 通知模块（设备保养到期提醒，NotificationModule）
current_entrypoints:
  - /equipment — EquipmentList.vue — 设备台账列表
  - /equipment/stats — EquipmentStats.vue — 设备统计
  - /equipment/:id — EquipmentDetail.vue — 设备详情
  - /equipment/plans — PlanList.vue — 保养计划列表
  - /equipment/plans/calendar — PlanCalendar.vue — 保养日历
  - /equipment/records — RecordList.vue — 保养记录列表
  - /equipment/records/create — RecordForm.vue — 新建保养记录
  - /equipment/records/:id — RecordDetail.vue — 保养记录详情
  - /equipment/faults — FaultList.vue — 故障记录列表
  - /equipment/faults/create — FaultCreate.vue — 新建故障
  - /equipment/faults/stats — FaultStats.vue — 故障统计
  - /equipment/faults/:id — FaultDetail.vue — 故障详情
  - /measuring-equipment — EquipmentList.vue (measuring-equipment) — 计量器具列表
last_verified_commit: 12aec17
---

## 1. 模块定位

设备管理模块负责管理生产设备的台账、预防性保养计划（PM）、保养记录和故障处理。计量器具管理模块负责管理量器台账及其检定/校准记录。两个模块在技术上独立部署（`server/src/modules/equipment/` 和 `server/src/modules/measuring-equipment/`），但业务上同属"设备与计量"合规要求领域。

```
设备管理
├── Equipment（设备台账，@@map("equipment")）
│     ├── MaintenancePlan（保养计划，由 SchedulerService 自动生成）
│     │     └── MaintenanceRecord（保养执行记录，含审批状态机）
│     └── EquipmentFault（故障记录）
│
计量器具管理
└── MeasuringEquipment（计量器具台账）
      └── CalibrationRecord（校准/检定记录）
```

设备模块具备完整的业务功能（CRUD、审批、调度、统计）；计量器具模块功能较精简（仅支持录入和查询，无审批流程）。

## 2. 使用角色

| 角色 | 使用目的 | 关键动作 |
|---|---|---|
| 设备管理员/车间班长 | 维护设备台账、录入保养记录、报告故障 | 创建 Equipment；complete MaintenanceRecord；创建 EquipmentFault |
| 品质/设备部负责人 | 审批保养记录，确认设备合规 | 审批 MaintenanceRecord（submitted → approved/rejected） |
| 计量管理员 | 维护量器台账、录入校准记录 | 创建 MeasuringEquipment；createCalibration |
| 系统/管理人员 | 查看设备统计、逾期保养预警 | 访问 /equipment/stats；查询 /measuring-equipment/overdue |

## 3. 当前入口

| 入口 | 页面 | 后端控制器 | 后端 API | 说明 |
|---|---|---|---|---|
| 设备台账列表 | `/equipment` → `EquipmentList.vue` | `EquipmentController (@Controller('equipment'))` | `GET /api/v1/equipment` | 支持分页、按分类/状态过滤 |
| 设备统计 | `/equipment/stats` → `EquipmentStats.vue` | `StatsController` | `GET /api/v1/equipment/stats` | — |
| 设备详情 | `/equipment/:id` → `EquipmentDetail.vue` | `EquipmentController` | `GET /api/v1/equipment/:id` | 含保养历史 |
| 保养计划 | `/equipment/plans` → `PlanList.vue` | `PlanController (@Controller('maintenance-plans'))` | `GET /api/v1/maintenance-plans` | — |
| 保养日历 | `/equipment/plans/calendar` → `PlanCalendar.vue` | `PlanController` | `GET /api/v1/maintenance-plans/calendar` | — |
| 保养记录 | `/equipment/records` → `RecordList.vue` | `RecordController (@Controller('maintenance-records'))` | `GET /api/v1/maintenance-records` | — |
| 故障记录 | `/equipment/faults` → `FaultList.vue` | `FaultController` | `GET /api/v1/equipment/faults` | — |
| 计量器具列表 | `/measuring-equipment` → `EquipmentList.vue` | `MeasuringEquipmentController (@Controller('measuring-equipment'))` | `GET /api/v1/measuring-equipment` | 含最近一次校准记录 |
| 逾期计量器具 | — | `MeasuringEquipmentController` | `GET /api/v1/measuring-equipment/overdue` | 按 next_calibration_at 查询 |
| 校准记录 | — | `MeasuringEquipmentController` | `GET /api/v1/measuring-equipment/:id/calibrations` | — |

## 4. 当前实现

| 对象 | 当前实现 | 说明 |
|---|---|---|
| `Equipment` | Prisma 模型 `@@map("equipment")`；状态枚举 EquipmentStatus（active/inactive/scrapped）；支持 maintenanceConfig JSON 配置分级保养；接入 UnifiedApprovalModule | 已验证：`server/src/prisma/schema.prisma` 第 1618 行 |
| `MaintenancePlan` | 由 `SchedulerService`（`@Cron`）自动生成，保养级别 MaintenanceLevel（daily/weekly/monthly/quarterly/annual） | 已验证：`server/src/modules/equipment/scheduler.service.ts`；`server/src/prisma/schema.prisma` 第 1651 行 |
| `MaintenanceRecord` | 状态机 draft→submitted→approved/rejected；支持 approved_by、rejected_reason；关联 UnifiedApproval 审批回调；支持附件上传（UploadController） | 已验证：`server/src/prisma/schema.prisma` 第 1681 行；`server/src/modules/equipment/record.service.ts` |
| `EquipmentFault` | 故障紧急程度枚举 FaultUrgencyLevel（urgent/normal/low）；故障状态 FaultStatus（pending/in_progress/completed/cancelled） | 已验证：`server/src/prisma/schema.prisma` 第 1721 行 |
| `MeasuringEquipment` | Prisma 模型；status 字段为字符串（'normal'\|'overdue'\|'scrapped'），非枚举；`company_id` 硬编码为 `'1'`（见 GAP-600） | 已验证：`server/src/prisma/schema.prisma` 第 3129 行；`server/src/modules/measuring-equipment/measuring-equipment.service.ts` 第 12 行 |
| `CalibrationRecord` | 记录 calibrated_at、valid_until、result（'pass'\|'fail'\|'conditional'）；创建校准记录后自动更新 MeasuringEquipment.next_calibration_at 和 status；`company_id` 硬编码为 `'1'`（见 GAP-600） | 已验证：`server/src/prisma/schema.prisma` 第 3147 行；`server/src/modules/measuring-equipment/measuring-equipment.service.ts` 第 29-55 行 |
| `EquipmentModule` | 完整注册：EquipmentController、PlanController、RecordController、FaultController、StatsController、UploadController；集成 NotificationModule 和 UnifiedApprovalModule | 已验证：`server/src/modules/equipment/equipment.module.ts` |
| `MeasuringEquipmentModule` | 仅注册 MeasuringEquipmentController 和 MeasuringEquipmentService；无审批集成 | 已验证：`server/src/modules/measuring-equipment/measuring-equipment.module.ts` |

## 5. 正确业务流程

**设备保养流程（预防性保养 PM）：**

| 步骤 | 用户动作 | 系统结果 | 绑定模块 | 缺失后果 |
|---|---|---|---|---|
| 1 | 设备管理员录入新设备（名称、类别、位置、负责人、保养配置） | 创建 Equipment，自动生成设备编号（EQ-{YYYYMMDD}-{序号}） | EquipmentService | 无设备台账则保养计划无锚点 |
| 2 | 系统按保养配置自动生成保养计划 | SchedulerService 按 Cron 创建 MaintenancePlan（pending），关联设备和保养级别 | SchedulerService | 手动创建计划易遗漏 |
| 3 | 保养到期提醒 | NotificationModule 发送待办通知 | NotificationModule | 无提醒则保养过期 |
| 4 | 设备管理员录入保养记录 | 创建 MaintenanceRecord（draft），关联 planId | RecordService | 无执行记录则计划闭环断开 |
| 5 | 提交审批 | MaintenanceRecord 状态变 submitted，发起统一审批流程 | UnifiedApprovalModule | 未提交则无法进入审批确认 |
| 6 | 负责人审批 | 审批通过 → status=approved；拒绝 → status=rejected + rejected_reason | UnifiedApprovalModule 回调 | — |

**计量器具校准流程：**

| 步骤 | 用户动作 | 系统结果 | 绑定模块 | 缺失后果 |
|---|---|---|---|---|
| 1 | 计量管理员录入新量器 | 创建 MeasuringEquipment，设置 calibration_cycle_days 和 next_calibration_at | MeasuringEquipmentService | 无台账则无法管控校准周期 |
| 2 | 系统预警逾期量器 | GET /measuring-equipment/overdue 查询 next_calibration_at ≤ today 的量器 | MeasuringEquipmentService | 无预警则校准过期不被发现 |
| 3 | 计量管理员录入校准记录（送检机构、证书号、结果） | 创建 CalibrationRecord；自动更新量器 last_calibrated_at、next_calibration_at、status | MeasuringEquipmentService | 无校准记录则合规证明缺失 |

## 6. 上下游绑定关系

- **上游**：无直接上游业务模块；Equipment 台账由管理员维护
- **下游**：
  - 仓储模块（05）：`MaterialRequisition.requisitionType = 'maintenance'` 表示维修领料，关联设备维修场景，但当前 schema 无 equipmentId 外键约束（见 GAP-603）
  - 统一审批平台（12）：MaintenanceRecord 通过 UnifiedApprovalModule 审批回调
  - 通知模块：保养到期提醒
- **与 QC 记录的关系**：MeasuringEquipment 为品质检验所用量器（如温度计、称重仪），校准有效期影响检验结果的合规性，但当前无 FK 关联 CCPRecord 或 IncomingInspection（见 GAP-604）

## 7. 当前系统差距

| GAP 编号 | 当前问题 | 根因 | 影响后果 | 严重级别 | 验证状态 | 证据 |
|---|---|---|---|---|---|---|
| GAP-600 | `MeasuringEquipmentService` 中 `company_id` 硬编码为 `'1'`（`createEquipment` 和 `createCalibration` 均写死），`CalibrationRecord.company_id` 同样硬编码 | 计量模块未接入 JWT 认证提取 company_id，延续了 GAP-304 的同类问题 | SaaS 多公司场景下计量器具和校准记录无法隔离，不同公司数据混用同一 company_id | P0 | 已验证 | `server/src/modules/measuring-equipment/measuring-equipment.service.ts` 第 12 行 `company_id: '1'`；第 41 行 `company_id: '1'` |
| GAP-601 | `EquipmentController`（`@Controller('equipment')`）及 `RecordController`（`@Controller('maintenance-records')`）、`PlanController`（`@Controller('maintenance-plans')`）均未声明 `@UseGuards(JwtAuthGuard)`，而 `MeasuringEquipmentController` 已加 guard | 设备模块控制器开发时遗漏认证守卫 | 设备台账、保养计划、保养记录接口无需登录即可访问，存在未授权写入风险 | P1 | 已验证 | `server/src/modules/equipment/equipment.controller.ts` 无 `@UseGuards`；`server/src/modules/measuring-equipment/measuring-equipment.controller.ts` 第 8 行已有 `@UseGuards(JwtAuthGuard)` |
| GAP-602 | `MeasuringEquipmentService.findAllEquipment()` 过滤条件为 `status: { not: 'scrapped' }`，但 `findOverdue()` 无 company_id 过滤，返回所有公司逾期量器 | findOverdue 与 findAllEquipment 过滤逻辑不一致，且均受 GAP-600 影响 | 逾期预警接口暴露所有租户数据，无隔离 | P1 | 已验证 | `server/src/modules/measuring-equipment/measuring-equipment.service.ts` 第 20-28 行 `findOverdue()` 无 where company_id 条件 |
| GAP-603 | `MaterialRequisition.requisitionType = 'maintenance'` 的领料单无 `equipmentId` 外键关联 `Equipment`，无法追踪维修领料对应哪台设备 | 仓储模块（05）与设备模块设计时未做关联 | 维修领料台账与设备维修记录脱节，无法核查设备维修物料用量 | P2 | 已验证（schema 层面）| `server/src/prisma/schema.prisma` MaterialRequisition 模型（约第 1057 行）无 equipmentId 字段 |
| GAP-604 | `MeasuringEquipment`（计量器具）与 `IncomingInspection`、`CCPRecord` 等检验记录无外键关联，无法追踪某次检验使用了哪台量器、该量器校准状态是否有效 | 模块间无跨模块关联设计 | 无法满足 BRCGS 等认证对"检验使用量器须有效校准"的可追溯要求 | P2 | 需要运行系统确认 | `server/src/prisma/schema.prisma` IncomingInspection 和 CCPRecord 模型无 measuring_equipment_id 字段（需确认） |
| GAP-605 | 计量器具模块（`MeasuringEquipmentModule`）无审批流程，校准记录由管理员直接录入即生效，无二级确认或签核机制 | 模块设计简化，未接入 UnifiedApprovalModule | 校准记录篡改风险；高风险量器（如金属检测仪）的检定记录无法满足审计要求 | P2 | 已验证（模块定义无审批） | `server/src/modules/measuring-equipment/measuring-equipment.module.ts` 无 UnifiedApprovalModule import |

## 8. 整改建议

| GAP 编号 | 建议整改 | 依赖模块 | 是否需要新设计 | 建议 PR | 是否可并行 |
|---|---|---|---|---|---|
| GAP-600 | 在 `MeasuringEquipmentController` 注入 `@Request() req`，从 `req.user.companyId` 获取 company_id，修改 `createEquipment` 和 `createCalibration` 不再写死 `'1'`；同步修复 `findAllEquipment` 和 `findOverdue` 加 company_id where 条件 | auth 模块（JWT payload 需包含 companyId） | 否，参考 GAP-304 修复模式 | fix/measuring-equipment-company-id-from-jwt | 否（依赖 auth JWT companyId 支持，与 GAP-304 同批次修复） |
| GAP-601 | 在 `EquipmentController`、`PlanController`、`RecordController`、`FaultController`、`StatsController`、`UploadController` 上添加 `@UseGuards(JwtAuthGuard)` 装饰器 | auth 模块 | 否 | fix/equipment-controller-auth-guard | 是 |
| GAP-602 | 在 `findOverdue()` 中增加 company_id 参数（待 GAP-600 修复后同步处理） | auth 模块 | 否，与 GAP-600 合并 | fix/measuring-equipment-company-id-from-jwt | 是（合并进 GAP-600 PR） |
| GAP-603 | 在 `MaterialRequisition` 增加可选字段 `equipment_id String?`，加 @relation 到 Equipment；在前端维修领料单填写时提供设备选择器 | 仓储模块（05）、设备模块 | 否，字段增量 | feat/requisition-equipment-link | 是 |
| GAP-604 | 业务确认是否需要在检验记录上关联量器；若需要，在 `IncomingInspection` 和 `CCPRecord` 增加 `measuring_equipment_id String?` 外键 | 品质模块（07）、计量模块 | 需要业务确认后设计 | feat/inspection-measuring-instrument-link | 否（依赖业务决策） |
| GAP-605 | 评估是否将计量器具校准记录纳入 UnifiedApprovalModule 审批流；如需接入，参考 MaintenanceRecord 审批模式 | UnifiedApprovalModule | 需要业务确认 | feat/calibration-record-approval-flow | 否（依赖业务决策） |

## 9. 证据索引

- `server/src/prisma/schema.prisma` 第 1573 行：设备管理系统注释块开始
- `server/src/prisma/schema.prisma` 第 1618 行：Equipment 模型定义
- `server/src/prisma/schema.prisma` 第 1651 行：MaintenancePlan 模型定义
- `server/src/prisma/schema.prisma` 第 1681 行：MaintenanceRecord 模型定义
- `server/src/prisma/schema.prisma` 第 1721 行：EquipmentFault 模型定义
- `server/src/prisma/schema.prisma` 第 3129 行：MeasuringEquipment 模型定义
- `server/src/prisma/schema.prisma` 第 3147 行：CalibrationRecord 模型定义
- `server/src/modules/equipment/equipment.module.ts`：EquipmentModule 完整注册
- `server/src/modules/equipment/equipment.controller.ts`：`@Controller('equipment')`，无 JwtAuthGuard（GAP-601）
- `server/src/modules/equipment/record.controller.ts`：`@Controller('maintenance-records')`，无 JwtAuthGuard（GAP-601）
- `server/src/modules/equipment/plan.controller.ts`：`@Controller('maintenance-plans')`，无 JwtAuthGuard（GAP-601）
- `server/src/modules/equipment/scheduler.service.ts`：Cron 保养计划自动生成
- `server/src/modules/measuring-equipment/measuring-equipment.module.ts`：MeasuringEquipmentModule
- `server/src/modules/measuring-equipment/measuring-equipment.controller.ts`：`@Controller('measuring-equipment')`，第 8 行有 `@UseGuards(JwtAuthGuard)`
- `server/src/modules/measuring-equipment/measuring-equipment.service.ts`：第 12 行 `company_id: '1'`（GAP-600）；第 41 行 `company_id: '1'`（GAP-600）
- `client/src/router/index.ts` 第 452–509 行：equipment/* 路由定义
- `client/src/router/index.ts` 第 768–770 行：measuring-equipment 路由定义
- `client/src/views/equipment/`：EquipmentList、EquipmentDetail、EquipmentStats 等页面
- `client/src/views/measuring-equipment/EquipmentList.vue`：计量器具列表页面

## 10. 禁止重复实现与事实源边界

| 对象 | 当前事实源 | 允许展示字段 | 禁止新增的平行事实源 | 旧字段或旧模块处理 |
|---|---|---|---|---|
| 设备台账 | `Equipment` 模型（equipment 表） | code, name, category, location, status | 禁止在保养记录或故障记录中重新维护设备属性文本 | 无 |
| 保养计划 | `MaintenancePlan`（maintenance_plans 表） | maintenanceLevel, scheduledDate, status | 禁止手动创建平行保养清单；计划由 SchedulerService 统一生成 | 无 |
| 保养执行记录 | `MaintenanceRecord`（maintenance_records 表） | status, maintenanceDate, submittedBy, approvedBy | 禁止在设备台账字段中维护最新保养时间（应查询 MaintenanceRecord） | 无 |
| 故障记录 | `EquipmentFault`（equipment_faults 表） | urgencyLevel, faultStatus, description | 禁止在保养记录中嵌套存储故障描述 | 无 |
| 计量器具台账 | `MeasuringEquipment` 模型 | code, name, calibration_cycle_days, next_calibration_at, status | 禁止在检验记录表中重新维护量器信息 | 无 |
| 校准记录 | `CalibrationRecord` 模型 | calibrated_at, valid_until, result, certificate_no | 禁止在 MeasuringEquipment 主表存储校准历史明细（仅存最新 next_calibration_at） | 无 |

## 11. 后续整改入口

| 优先级 | GAP 编号 | 推荐 PR | 前置依赖 | 可并行 | 验收命令 |
|---|---|---|---|---|---|
| P0 | GAP-600 | fix/measuring-equipment-company-id-from-jwt | auth 模块 JWT 含 companyId（与 GAP-304 同批） | 否 | `POST /api/v1/measuring-equipment` 返回记录的 company_id 与 JWT 中 companyId 一致 |
| P1 | GAP-601 | fix/equipment-controller-auth-guard | 无 | 是 | `curl -X GET /api/v1/equipment` 无 Authorization header 返回 401 |
| P1 | GAP-602 | fix/measuring-equipment-company-id-from-jwt | GAP-600 | 是（合并进 GAP-600 PR） | `GET /api/v1/measuring-equipment/overdue` 仅返回当前公司逾期量器 |
| P2 | GAP-603 | feat/requisition-equipment-link | 仓储模块 05 | 是 | 维修领料单可选关联设备，schema 迁移通过 |
| P2 | GAP-604 | feat/inspection-measuring-instrument-link | 业务确认 | 否 | 需要业务确认后定义验收标准 |
| P2 | GAP-605 | feat/calibration-record-approval-flow | 业务确认 | 否 | 需要业务确认后定义验收标准 |
