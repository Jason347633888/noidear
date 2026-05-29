# 动态填报能力退役设计

**日期：** 2026-05-23  
**状态：** 方向已确认，待 implementation plan 执行  
**目标：** 一次性删除当前未使用的动态填报平台，保留已经独立建模的业务表、主数据、批次、追溯、文控和审批能力。

本 spec 只定义退役边界和验收标准，不直接执行代码删除。后续实现必须在独立 worktree 完成。

---

## 与 `simple-role-module-access` plan 的执行顺序（硬约束）

本退役 spec 与 `docs/superpowers/specs/2026-05-23-simple-role-module-access-design.md` 及其 implementation plan `docs/superpowers/plans/2026-05-23-simple-role-module-access.md` 同时存在。当前工作线已经把动态填报相关 controller 纳入模块开关和 OwnershipScope 计划，因此两份计划不能互相无视。

执行规则：

1. 如果目标分支已经开始执行 `simple-role-module-access` plan：必须先让该 plan 跑到 Task 33 完成（模块开关 + 治理白名单 + 审批契约 + 旧权限子系统下线 + 前端集成 + E2E 验收，含 Task 11 给业务 controller 加 `@ModuleKey()`），再执行本退役 spec。
2. Task 34-47（OwnershipScope）可以与本 spec 并行，但本 spec 不依赖 OwnershipScope 完成。
3. 不允许在未同步修正 `REGISTRY_CONFIG`、controller `@ModuleKey()` 标注和 Appendix A/B 的情况下删除动态填报 controller；否则简单角色 plan 的覆盖率校验会被打穿。
4. 如果未来在干净分支上先退役动态填报，再执行简单角色 plan，则必须先重写简单角色 plan 中所有动态填报路由、controller 和 ownership 行，不得照抄当前 plan。

### 必须回退或修正的 `simple-role-module-access` 产物

退役 spec 实施时，按下表回退或修正前一 plan 留下的代码 / 文档：

| 来源（前一 plan） | 退役 spec 的处理 |
|---|---|
| `server/src/modules/module-access/registry-config.ts` 中 `document_approval` 数组 | 删除 `templates`、`dynamic-forms`、`record-templates`、`records`；保留 `documents`、`approval-definitions`（审批模板平台保留）。最终 `document_approval` 只保留 `documents`、`approval-definitions`。 |
| `server/src/modules/module-access/registry-config.ts` 中 `work_execution` 数组 | 删除 `tasks`（动态填报旧任务）；保留 `todos`、`approval-tasks`、`approval-instances`。 |
| `server/src/modules/module-access/coverage.spec.ts`（启动期覆盖率校验） | 重跑要保证：删除的 controller 路径不再在 `REGISTRY_CONFIG` 内、剩余 controller 全部命中。 |
| `Appendix A: Ownership Audit Matrix` 中 `Task` / `Record` / `RecordTemplate` 三行 | 标记为 ⚠️ removed by retirement spec；OwnershipScope 不再为这些模型实现 listForOwnership。 |
| `Appendix B: Ownership Migration Required Matrix` | 不受退役影响（B 只列需要新增 FK 的模型）。 |
| 前一 plan Task 11 给 `record-template.controller.ts` / `records.controller.ts` / `tasks/task.controller.ts` 加的 `@ModuleKey()` 装饰器 | 随 controller 一起删除（本 spec 已经把这些 controller 列在删除清单）。 |
| 前一 plan Task 23 重写后的 seeds | 本 spec 进一步删除剩余 `prisma.recordTemplate / record / task / taskRecord / recordTaskAssignment / recordTaskInstance / changeEventFormTask` 调用，以及 `record.submitApproved`、`taskRecord.*` 等动态填报审批定义 fixture。 |
| 前一 plan Task 37（work_execution ownership）中的 `TaskService.listForOwnership` | 整段移除（Task 模型已删除）。 |
| 前一 plan Task 38（document_approval ownership）中的 `RecordService.listForOwnership` | 整段移除（Record 模型已删除）。 |

实施时如果发现目标分支处于简单角色 plan 的中间状态（例如 Task 11 还没跑完、coverage spec 尚未稳定），暂停退役，先把该 plan 推到可验证边界。

---

## 一句话说明

删除 `RecordTemplate / Record / RecordTaskAssignment / RecordTaskInstance` 代表的动态模板、动态填报、定期填报任务和旧任务填报链路。凡是已经独立建模的业务记录继续保留，例如环境记录、过程监控、清洁消毒、违规、用药、访客、返工、变更合规、换产检查、食品安全文化、仓储、设备、培训、研发、追溯、召回和审批。

---

## 背景

当前模板管理的新建模板只能配置少量字段。即使补齐拖拽式设计器、字段组件、字段校验、打印、审批、任务派发，也无法解决一个更根本的问题：大量食品安全表单都包含主数据、班次、批次、车间、设备、人员、物料、供应商等结构化业务对象。

如果继续用 `fieldsJson / dataJson` 承载这些内容，会形成一套平行事实源：

```text
主数据 / 批次 / 业务表
        +
RecordTemplate / Record 的 JSON 数据
```

这会让追溯、统计、权限、审批、召回、投诉、不合格等模块在两套来源之间取舍。项目当前没有历史业务数据需要迁移，动态填报能力处于未使用状态，因此本次允许破坏式删除，不做旧数据兼容。

---

## 当前动态填报能力是什么

### RecordTemplate

`RecordTemplate` 是动态表单模板。当前 schema 中包含模板编码、名称、版本、状态、字段 JSON、保留期限、偏差配置、批次关联配置、审批配置等。它支撑模板管理、模板设计器、版本修订、启停用和字段定义。

需要删除的能力：

- 模板列表、创建、编辑、归档、删除。
- 模板字段设计器和字段 JSON 版本。
- 模板级偏差、批次关联、保留期、审批开关。
- `/record-templates` 与兼容别名 `/templates` API。

### Record

`Record` 是按动态模板生成的填报实例。当前 schema 中包含模板外键、填报 JSON、状态、创建人、提交审批信息、关联生产批次、关联任务实例、关联变更事件、业务来源字段等。

需要删除的能力：

- 动态记录创建、草稿、提交、审批回调、导出、PDF。
- 动态记录与生产批次的 `relatedRecords` 关联。
- 动态记录的变更日志、电子签名、偏差检测。
- `/records` 相关 API 与前端填报页面。

### RecordTaskAssignment / RecordTaskInstance

`RecordTaskAssignment` 是动态填报任务配置，`RecordTaskInstance` 是生成出来的待填任务。它们按模板、部门、周期、截止时间创建待办。

需要删除的能力：

- 动态填报任务分派。
- 待填任务列表、认领、完成、逾期。
- 定期任务 cron 生成动态填报实例。
- `/record-task-assignments`、`/record-task-instances` 相关 API 与页面。

### 旧 Task / TaskRecord

当前还有旧的 `Task / TaskRecord` 填报链路，依赖 `RecordTemplate` 并通过 `TaskRecord` 保存提交数据。它和动态模板能力属于同一套动态填报平台，不是审批任务或普通待办。

需要删除的能力：

- `server/src/modules/task` 旧填报任务模块。
- `packages/types/task.ts` 和 `client/src/api/task.ts` 中仅服务旧动态填报的类型和 API。
- 前端 `client/src/views/tasks/*` 动态填报任务页面。

保留对象：

- `ApprovalTask`：审批运行时任务。
- `TodoTask`：普通待办。
- 独立业务模块自己的任务或状态字段。

---

## 设计目标

1. 删除整套动态填报平台，不保留空壳页面或空壳 API。
2. 删除动态表单模型、动态记录模型、动态任务模型和旧填报任务模型。
3. 删除模板管理、记录填报、记录任务、旧任务填报的菜单、路由、API 封装和页面。
4. 保留所有独立业务表模块，尤其是已经落地的食品安全过程记录、质量治理、仓储、设备、培训、研发、追溯、召回、投诉、不合格、返工等模块。
5. 保留文控中心；**04 记录表单索引整体退役**（`RecordFormLandingEntry / RecordFormLandingIndex.vue / record-form-landing.service.ts` 全部删除，不保留任何"索引页"概念）。
6. **model-landing 模块整体退役**（含后端模块、CLI、generated 清单、freeze test、CSV 运行时输入、npm script）。未来新表单按需建独立业务模块，团队不再维护 283 表单的运行时索引；backlog 由开发者各自的 mybrain / 项目管理工具承接。
7. 保留主数据、批次、追溯、召回、审批的结构化事实链。
8. 不做历史数据迁移、兼容 API、兼容前端路由或旧动态记录导出。

---

## 非目标

1. 不在本次补做拖拽式表单设计器。
2. 不新增新的通用字段组件系统。
3. 不把 283 张源表单一次性补齐为独立业务模块（按需逐张补，不在本次范围）。
4. 不在系统里保留 283 表单的运行时索引或落地状态追踪（model-landing 整体退役）。
5. 不删除独立业务表模块，只删除动态模板平台 + model-landing 相关运行时能力。
6. 不删除 `ProcessTemplate`。它属于产品研发流程模板，不是 `RecordTemplate`。
7. 不删除 `ApprovalInstance / ApprovalTask / ApprovalAction`。它们是新审批运行时。
8. 不删除 `TodoTask`。它是普通待办。

---

## 数据模型退役范围

### 删除模型

以下 Prisma model 应从 `server/src/prisma/schema.prisma` 中删除：

| 模型 | 删除原因 |
|---|---|
| `RecordTemplate` | 动态表单模板退役 |
| `Record` | 动态填报实例退役 |
| `RecordChangeLog` | 只服务动态记录审计 |
| `RecordTaskAssignment` | 动态填报任务配置退役 |
| `RecordTaskInstance` | 动态待填任务实例退役 |
| `Task` | 旧动态填报任务退役 |
| `TaskRecord` | 旧动态填报提交数据退役 |
| `ChangeEventFormTask` | 变更事件自动生成动态表单任务退役 |
| `RecordFormLandingEntry` | 04 记录表单索引整体退役（model-landing 退役一并去除运行时索引） |

这些模型对应的数据表可以直接 drop。项目当前无历史业务数据，不需要导出、回填或兼容迁移。

### 删除或调整外键关系

实现时必须同步清理下列反向关系和外键。删除模型时务必把对应的 `@relation` 链都断掉，否则 `prisma generate` 会因 invalid relation 报错。

| 所在模型 | 当前动态关系 | 新设计 |
|---|---|---|
| `User` | `recordsCreated`、`recordChanges`、`recordTaskAssignments`、`tasksCreated`（指向旧动态 Task）、`taskRecordsSubmitted`、`taskRecordsApproved` | 删除这些动态关系，保留用户与独立业务表、审批、待办的关系 |
| `Department` | `recordTaskAssignments`、`tasks`（指向旧动态 Task `@relation("TaskDepartment")`） | 删除两条 |
| `RecordTemplate`（被删） | 反向：`Task.template`、`TaskRecord.template`（隐式 templateId）、`ChangeEventFormTask.template`、`RecordFormLandingEntry.targetTemplate`、`Record.template` | 随 `RecordTemplate` 一起删除；同步删除所有上游 FK 列 |
| `Task`（被删） | 自身 FK：`templateId` → RecordTemplate、`departmentId` → Department、`creatorId` → User；反向：`TaskRecord.task` | 整模型连同所有 FK 与索引删除 |
| `TaskRecord`（被删） | 自身 FK：`taskId`、`templateId`、`submitterId`、`approverId`、`approvalInstanceId` | 整模型连同所有 FK 与索引删除 |
| `Record`（被删） | 自身 FK：`templateId`、`createdBy`、`productionBatchId`、`taskInstanceId`、`changeEventId`；反向：`RecordChangeLog.record`、`DeviationReport.record`、`ProductRecallEvidence.record`、`ChangeEventFormTask.record` | 整模型连同所有反向引用同步处理 |
| `ProductionBatch` | `relatedRecords: Record[] @relation("RecordProductionBatch")` | 删除该反向关系，追溯只使用结构化批次链和独立业务表关系 |
| `DeviationReport` | `recordId / record` 动态记录来源 | 删除 `recordId` 字段与索引；偏差来源改由独立业务对象或快照字段表达 |
| `ChangeEvent` | `records: Record[]`、`formTasks: ChangeEventFormTask[]` | 两条反向关系都删 |
| `ProductRecallEvidence` | `recordId / record` | 删除 `recordId` 字段与索引；保留文件、外部引用、追溯快照或独立业务对象引用 |
| `RecordFormLandingEntry`（整模型删除） | `targetTemplateId / targetTemplate`、整张表 | 整模型从 schema 移除，对应 `record_form_landing_entries` 表 drop。详见下方 § model-landing 整体退役 |

### 保留模型

以下 Prisma model 命名含 `Record` 或在路由层叫 `*-records`，但属于**独立业务表**，与动态填报平台无关，不得因命名相似被误删（已与 `server/src/prisma/schema.prisma` 实际定义对齐 2026-05-23）：

| 类型 | 名称 |
|---|---|
| Prisma model | `EnvironmentRecord`、`ProcessMonitorRecord`、`CleaningRecord`、`ViolationRecord`、`MedicationRecord`、`VisitorRecord`、`EmergencyDrillRecord`、`FragileItemInspection`、`LineChangeCheckRecord`、`FoodSafetyCultureRecord`、`ReworkRecord`、`ChangeComplianceRecord`、`ChangeVerificationRecord`、`WasteDisposalRecord`、`MetalDetectionLog`、`CCPRecord` |
| Prisma model（研发流程） | `ProcessTemplate`、`ProcessInstance`、`ProcessStepData`（**不是** `ProcessRecord` —— schema 里没有这个 model） |
| Prisma model（培训域） | `LearningRecord`、`ExamRecord`、`TrainingArchive`、`TrainingProject`、`TrainingPlan`、`TrainingQuestion`（**不是** `TrainingRecord` —— schema 里没有这个 model；旧 model-landing 清单里的 `"TrainingRecord"` 字符串是 283 表单分类标签，随 model-landing 退役一起消失） |
| Controller path | `process-records`（隶属 `process-record` 模块，对应 ProcessMonitorRecord 等过程参数）、`*-records` 命名的 22 个独立业务 controller |

判断标准：只要它有独立 schema 行、独立 controller/service、字段参与业务规则或被其他模块引用，就属于业务表模块，不属于动态填报平台。退役范围内被删除的动态模型只包括「删除模型」表中明确列出的 9 个 model：`RecordTemplate / Record / RecordChangeLog / RecordTaskAssignment / RecordTaskInstance / Task / TaskRecord / ChangeEventFormTask / RecordFormLandingEntry`，**清单之外的任何 Record/Task 命名都默认保留**。

---

## 后端退役范围

### 删除动态模块

从 `server/src/app.module.ts` 移除并删除对应模块目录（含全部 `*.spec.ts` 测试文件）：

| 模块目录 | 处理 | 关联 spec 文件 |
|---|---|---|
| `server/src/modules/record-template/` | 整目录删除 | `record-template.controller.spec.ts`、`template-alias.controller.spec.ts`、`record-template.service.spec.ts` 等 |
| `server/src/modules/record/` | 整目录删除 | `record.controller.spec.ts`、`record.service.spec.ts`、`record-export.service.spec.ts`、各 dto/interceptors 下 spec |
| `server/src/modules/record-task/` | 整目录删除 | `record-task.controller.spec.ts`、`record-task-cron.service.spec.ts`、`record-task-instance.service.spec.ts` |
| `server/src/modules/task/` | 整目录删除（旧动态填报任务） | `task.controller.spec.ts`、`task.service.spec.ts`、`task.module.spec.ts` |
| `server/src/modules/scheduled-task/` | 当前仅基于 `recordTaskAssignment` 生成动态任务实例（已用 `rg "recordTaskAssignment\\|recordTaskInstance" server/src/modules/scheduled-task` 验证 4 个文件全部命中），整目录删除；若未来存在独立调度器，另行新建 | `scheduled-task.service.spec.ts` |
| `server/src/modules/change-event/change-event-form-task.service.ts` | 单文件删除（按上方拓扑顺序） | `change-event-form-task.service.spec.ts` |

### 需要重写、不能整体删除的 spec 文件

| 文件 | 重写要点 |
|---|---|
| `server/src/modules/shift-instance/shift-completion.service.spec.ts` | 当前 mock 了 `prisma.recordTemplate.findMany`。退役后 service 不再读 RecordTemplate，spec 改为基于独立业务表完成度（或临时全 PASS 直到 shift-completion 重写）。 |
| `server/src/modules/document/services/record-form-landing.service.spec.ts` | 整文件删除（service 本体也删，见 § model-landing 整体退役） |
| `server/src/modules/batch-trace/services/traceability.service.spec.ts` | 移除对 `relatedRecords` 的断言；追溯仅基于结构化批次链。 |
| `server/src/modules/unified-approval/approval-callback-coverage.spec.ts` | 删除 `record.submitApproved` / `taskRecord.*` 等回调注册的 it()。 |

### 删除动态 API

以下 API 不再注册，也不保留兼容返回：

- `/api/v1/record-templates`
- `/api/v1/templates`
- `/api/v1/records`
- `/api/v1/record-task-assignments`
- `/api/v1/record-task-instances`
- `/api/v1/tasks` 中服务旧动态填报的接口
- `/api/v1/change-events/:id/form-tasks`
- `/api/v1/change-events/form-tasks/:taskId/fill`

删除后访问这些地址应由 Nest 路由自然返回 404，而不是返回“功能维护中”。

### 清理被动态填报牵连的模块

| 模块 | 清理方式 |
|---|---|
| `change-event` | 删除 `ChangeEventFormTaskService`，删除创建变更事件时自动生成动态表单任务的逻辑；变更事件只保留自身字段、审批和业务关系（拓扑顺序见下方「change-event 删除顺序」） |
| `document` | 删除 `RecordFormLandingService` 及其 controller / spec / DTO（与 model-landing 一起退役）；保留体系文件中心、文档版本、`BusinessDocumentLink` 等独立能力 |
| `batch-trace` | 删除 `relatedRecords` 查询和导出段落；保留供应商、物料、物料批次、投料、生产批次、发货、投诉、召回链路 |
| `deviation` | 删除基于动态记录、动态模板、旧 `TaskRecord` 的统计；保留独立偏差、不合格、CAPA 等结构化来源 |
| `product-recall` | 删除召回证据到动态 `Record` 的外键；保留文件证据、外部引用、追溯快照和召回批次 |
| `shift-instance` | 删除通过 `recordTemplate` 判断班次完成度的逻辑；班次完成度只来自独立业务表或显式业务规则 |
| `audit / approval registry` | 删除 `record.submitApproved`、旧 `taskRecord.*` 等动态填报审批回调注册（见下方「审批回调与定义数据清理」） |

### change-event 删除顺序

`ChangeEventFormTaskService` 当前被 `change-event.service.ts:18` 注入并出现在 `change-event.module.ts` 的 providers/exports 中。直接删 service 文件会让 change-event.controller / change-event.service 编译失败。按以下拓扑顺序处理：

1. 改 `server/src/modules/change-event/change-event.service.ts`：移除 `ChangeEventFormTaskService` 的构造注入与所有调用点（创建变更事件后自动生成表单任务的代码段）。
2. 改 `server/src/modules/change-event/change-event.controller.ts`：删除 `/change-events/:id/form-tasks` 与 `/change-events/form-tasks/:taskId/fill` 两个端点对应的 handler 方法，删除 `ChangeEventFormTaskService` 的构造注入。
3. 改 `server/src/modules/change-event/change-event.module.ts`：从 providers / exports 数组移除 `ChangeEventFormTaskService`。
4. 删除文件：`server/src/modules/change-event/change-event-form-task.service.ts` 与 `change-event-form-task.service.spec.ts`。
5. 改 `server/src/prisma/schema.prisma`：删除 `model ChangeEventFormTask`、`ChangeEvent.formTasks` 反向关系。
6. 跑 `npm run prisma:generate -w server`，确认 prisma 不再 panic。
7. 跑 `npm run build:server`，确认无残留引用。

### 变更评审证据如何继续承载（删除 ChangeEventFormTask 不留缺口）

退役 `ChangeEventFormTask` 之前，变更评审证据由"动态表单任务"承载：每次变更自动派发 N 张评审表单（`GRSS-KF-JL-07 / JL-08 / GRSS-PZ-JL-22 / JL-45` 等），每张表单独立走一次审批，用户在动态表单里填字段。这是一套**主审批 + N 个表单审批并行**的双轨结构，是动态填报平台的典型病。

退役后**不新增** `ChangeReviewRecord` 等替代模型；变更评审证据由 ChangeEvent 自身的能力承担：

| 评审场景中的业务问题 | 退役后承载位置 | 模型 / 字段 |
|---|---|---|
| 谁要变 / 变什么 / 为什么 | `ChangeEvent` 主体字段 | `description`、`reason`、`applied_by`、`applied_at`、`change_type` |
| 评审是否通过 + 评审人 + 评审结论 | `ChangeEvent` 自带统一审批流（`change-event.service.ts:40` 调 `approvalEngine.startApproval`） | `ApprovalInstance` + `ApprovalTask`（审批人 = 评审人；审批意见 = 评审结论） |
| 评审范围 / 涉及对象 | `ChangeEvent.relations` | `ChangeEventRelation` |
| 具体变更方案 / 字段前后差异 | `ProductProcessChangePlan.payloadJson` | 已有 |
| 实际执行了什么动作 | `ChangeEventExecution + ChangeEventExecutionArtifact`（前后快照） | 已有 |
| 事后效果验证 | `ChangeVerificationRecord` | 已有独立模块 |
| 合规审查 | `ChangeComplianceRecord` | 已有独立模块 |
| 评审补充材料（附件、引用文件） | `ChangeEvent` 关联 `BusinessDocumentLink` → `Document` | 已有 |

**面对客户/外部审计**：当被问到"`GRSS-PZ-JL-22 工艺评审`在哪？" → 在系统里打开对应 `ChangeEvent` 详情页 → 看它的 `ApprovalInstance` 详情（审批人、审批时间、审批意见）+ `ChangeEvent.description / reason` + 关联的 `Document` 附件即可。证据链是**结构化的、可统计的、可追溯的**。

**spec 不允许的事**：

1. 不允许新建 `ChangeReviewRecord` 模型（详见 `docs/adr/0001-retire-dynamic-form-platform.md`：动态填报退役后，未来新表单都要走独立业务模块；但变更评审的语义已经被 ChangeEvent 自带审批流承载，**不需要**再单独立模块）。
2. 不允许把"评审"塞进 `ChangeVerificationRecord`（评审 = 事前判断方案合不合理；验证 = 事后确认效果是否达到，两者在 ISO/HACCP 体系语义不同，混合会造成长期治理债）。
3. 不允许保留任何"自动生成表单任务"语义，包括 `getDefaultFormCodesForChangeType / getDefaultFormCodesForChangeScopes`、`CHANGE_EVENT_DEFAULT_FORM_CODES`、`RETIRED_CHANGE_FORM_CODES`、`PRODUCT_RND_ONLY_FORM_CODES` 这些常量（连同 `change-event-default-form-rules.ts` 整文件删除）。

### 审批回调与定义数据清理

`simple-role-module-access` plan 已经把 `ApprovalDefinition` 的合法 `assignments` 收口到 `USER / ROLE / DEPARTMENT_ROLE` 三种 type；启动期扫描会把不合规的模板置为 `disabled_legacy`。本退役 spec 要在此基础上**再清一层**：

**代码侧（回调注册）**：

- 文件：`server/src/modules/unified-approval/approval-callback.registry.ts`
- 文件：`server/src/modules/unified-approval/approval-callback-coverage.spec.ts`
- 操作：删除所有 `record.submitApproved`、`taskRecord.*`、`record.*`、`change-event.formTaskApproved` 等**资源类型属于动态填报**的回调注册项；coverage spec 同步更新或删除相关 it()。
- 实施时用 `rg "record\\.submit|taskRecord\\.|formTask" server/src/modules/unified-approval -n` 一并扫剩余引用。

**数据侧（approval_definitions 表）**：

退役 migration 中追加一段 SQL（或在 service 启动期一次性清理）：

```sql
-- 删除引用动态填报资源类型的审批运行时；这些实例退役后没有回调可执行。
-- 顺序不能反：approval_instances 通过 definitionId restrict 引用 approval_definitions。
DELETE FROM approval_actions
WHERE "instanceId" IN (
  SELECT id FROM approval_instances
  WHERE "resourceType" IN ('record', 'task_record', 'taskRecord')
);

DELETE FROM approval_tasks
WHERE "instanceId" IN (
  SELECT id FROM approval_instances
  WHERE "resourceType" IN ('record', 'task_record', 'taskRecord')
);

DELETE FROM approval_instances
WHERE "resourceType" IN ('record', 'task_record', 'taskRecord');

-- 最后删除动态填报审批定义。
DELETE FROM approval_definitions
WHERE "resourceType" IN ('record', 'task_record', 'taskRecord')
   OR module IN ('record', 'task');

-- 防御性清理历史坏数据；正常 FK 下应为零行。
DELETE FROM approval_tasks WHERE "instanceId" NOT IN (SELECT id FROM approval_instances);
```

`record-form-landing.service.ts` 中通过统一审批引擎给动态记录发起审批的代码段（如有）一并删除；具体方法名以 `rg "ApprovalEngineService" server/src/modules/record server/src/modules/record-task server/src/modules/task server/src/modules/change-event` 输出为准。

---

## 前端退役范围

### 删除菜单与路由

从 `client/src/navigation/menu.ts` 和 `client/src/router/index.ts` 移除：

- 模板管理。
- 新建模板、编辑模板、模板设计器、容差配置。
- 记录列表、记录详情、动态填报。
- 我的待填任务、记录任务管理。
- 旧动态任务页面。

左侧菜单中"文控与审批"仍可保留体系文件中心、审批历史、审批模板（`ApprovalDefinition` 仍存在）等独立入口；**不得保留**"记录表单索引"和"模板管理"入口（前者随 model-landing 退役删除，后者随动态填报退役删除）。

### 删除前端 API 与页面

删除或清空引用后删除：

- `client/src/api/record-template.ts`
- `client/src/api/record.ts`
- `client/src/api/new-record.ts`
- `client/src/api/record-task.ts`
- `client/src/api/task.ts` 中旧动态填报部分
- `client/src/views/templates/*`
- `client/src/views/records/*`
- `client/src/views/record/*`
- `client/src/views/record-tasks/*`
- `client/src/views/tasks/*` 中旧动态填报页面

组件层面：

**`client/src/components/DynamicForm.vue` + `client/src/components/FormBuilder.vue`** — 2026-05-23 扫描确认**零跨模块复用**（grep 排除动态填报本身页面后无任何独立业务模块引用）。**直接整体删除**这两个文件 + 其测试，不需要迁移或抽 shared 组件。

implementer 验收扫描（删完后跑一次确保无残留引用）：

```bash
rg -nE "from '@/components/(DynamicForm|FormBuilder)'|DynamicForm\b|FormBuilder\b" client/src --type vue --type ts
# 预期：零输出
rg -nE "from '@/api/(record|record-template|record-task|new-record)'|from '@/api/task'" client/src --type vue --type ts
# 预期：零输出（动态填报相关 api/* 文件也已经按 § 删除前端 API 与页面 一并删掉）
```

### 记录表单索引页面

`RecordFormLandingIndex.vue` 整页删除（含路由注册和菜单入口）。退役后**不存在**任何"记录表单索引 / 表单落地总览"概念；新表单的开发顺序由项目管理工具承接，不在 noidear 运行时展示。

---

## model-landing 整体退役

`model-landing` 模块原本是 283 张源记录表单的运行时索引层（表单代码 → 业务模块映射 + 落地状态），由 CSV → generated.ts → controller/service 这条链路支撑。退役动态填报后，团队改为**按需逐张做独立业务模块**，不再需要这层运行时索引。整体退役范围如下：

### 后端

| 资产 | 处理 |
|---|---|
| `server/src/modules/model-landing/` 整目录（controller / service / parser / module / types + 全部 spec） | 删除 |
| `server/src/modules/model-landing/generated/model-landing.generated.ts`（4500+ 行 283 表单清单） | 删除 |
| `server/scripts/generate-model-landing-artifacts.ts` | 删除 |
| `server/scripts/verify-model-landing-artifacts.ts` | 删除 |
| `server/test/model-landing-freeze.spec.ts` | 删除 |
| `server/package.json` 中 `model-landing:generate` / `model-landing:verify` 两个 npm script | 删除 |
| `server/src/app.module.ts` 中对 `ModelLandingModule` 的 import 与 imports 数组登记 | 删除 |
| `server/src/modules/module-access/registry-config.ts`（前一 plan 产物）中 `model-landing` 路由前缀 | 同步从 `product_rd` 数组移除 |

### DB / Prisma

| 资产 | 处理 |
|---|---|
| `RecordFormLandingEntry` Prisma model | 整模型删除（已计入 § 数据模型退役范围 § 删除模型表） |
| `record_form_landing_entries` 表 | 退役 migration 中 drop |
| `Document.recordFormLandingEntries` 等反向关系（如有） | 同步删除 |
| `server/src/modules/document/services/record-form-landing.service.ts` + 对应 spec | 删除 |

### 前端

| 资产 | 处理 |
|---|---|
| `client/src/views/documents/RecordFormLandingIndex.vue`（或同名 view） | 删除 |
| 菜单 / 路由中对应"记录表单索引"入口 | 删除（菜单组"文控与审批"只剩"体系文件中心 + 审批历史 + 审批模板"） |
| 前端 `client/src/api/model-landing.ts`（如存在） | 删除 |

### 数据源

| 资产 | 处理 |
|---|---|
| `docs/superpowers/specs/2026-04-24-model-landing-layer-form-expansion.csv`（若仍存在于活跃 spec 区） | 从活跃事实源中移除；当前仓库已只有 archive 副本，不需要额外动作 |
| `archive/superpowers/specs/2026-04-24-model-landing-layer-*` 与 `archive/superpowers/plans/2026-04-24-model-landing-layer-*` | **保留为历史资料**；只从 `AGENTS.md`、`docs/AGENT_GUIDE.md`、`docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 等当前事实源里移除引用，避免执行者继续把 archive 当运行时合同 |

### 验收命令

之前 `npm run model-landing:verify -w server` 是退役 spec 验收命令的一部分。**退役后这个命令不存在**，验收命令清单同步移除（见 § 验证命令）。

### 不需要新增的替代品

- **不**新建任何"表单 backlog 看板"。283 表单的下一张该做什么，由开发者 / 项目管理工具（如 Linear、Jira 或 markdown backlog）自行管理；不进入 noidear 运行时。
- **不**保留任何 `/api/v1/model-landing/*` 兼容端点。前端 `RecordFormLandingIndex.vue` 没了之后没有调用者。

### 替代叙事（CONTEXT.md 同步要求）

文控与 04 记录表单的关系简化为：

```text
Document / DocumentVersion / BusinessDocumentLink
（不再有 04 记录表单索引这个独立概念；每张表单要么有自己的业务模块路由，要么压根不在系统里出现）
```

`CONTEXT.md` 必须同步删除 `记录表单索引 / 落地健康状态 / 动态表单 / 记录填写任务 / 周期任务生成器 / 记录填写结果导出` 这些运行时术语，并引用 `docs/adr/0001-retire-dynamic-form-platform.md` 解释退役决策。

---

## 追溯边界

删除动态记录后，追溯链路不得再从 `Record.dataJson` 或 `Record.productionBatchId` 补关系。

保留链路：

```text
Supplier
  -> Material
  -> MaterialBatch
  -> BatchMaterialUsage
  -> ProductionBatch
  -> DeliveryNote / CustomerComplaint / ProductRecall
```

可以继续补强独立业务表到批次的关系，但不能通过动态记录作为中间层。

导出和快照中不再出现“相关动态记录”段落。若某些独立业务记录需要进入导出，应在对应业务模型中显式建关系并在追溯服务里单独实现。

---

## 迁移策略

1. 不迁移动态模板。
2. 不迁移动态记录。
3. 不迁移动态任务实例。
4. 不保留旧 API。
5. 不保留前端兼容路由。
6. Prisma migration 直接删除表、外键、索引和枚举引用。
7. Seed 中的动态模板、动态记录任务、旧任务填报数据全部删除。

### Prisma 迁移命名与命令

按项目 npm scripts 惯例：

```bash
# 生成迁移（不立刻应用，便于人工 review SQL）
DATABASE_URL="postgresql://noidear:noidear123@localhost:5432/document_system" \
  npm run prisma:migrate -w server -- --name retire_dynamic_forms --create-only

# review server/src/prisma/migrations/<ts>_retire_dynamic_forms/migration.sql 后应用
DATABASE_URL="postgresql://noidear:noidear123@localhost:5432/document_system" \
  npm run prisma:migrate -w server
```

迁移 SQL 必须包含（按依赖逆序）：drop FK / drop index / drop table，外加上方 `RecordFormLandingEntry`、`ApprovalDefinition / ApprovalInstance / ApprovalTask` 的清理段。

### 需要改写的 seed 文件

当前扫描结果（2026-05-23）：6 个 seed 文件里，4 个文件触动动态填报：3 个含动态模型 fixture，`seed.ts` 含动态审批定义 fixture。后续执行时以 `rg` 重新确认，不能只信固定行号。

| 文件 | 处置 | 定位方式 |
|---|---|---|
| `server/src/prisma/seed-dev.ts` | **改** | 搜 `prisma.recordTemplate.createMany`，整段删除 |
| `server/src/prisma/seed-baseline.ts` | **改** | 搜 `prisma.recordTemplate` 与 `PRODUCT_RD_7STEP_TEMPLATE_*`，删除动态模板 fixture；保留三角色、admin user、`e2e-test-dept` 等无关 fixture |
| `server/src/prisma/seed-e2e.ts` | **改** | 搜 `prisma.recordTemplate`、`prisma.recordTaskAssignment`、`prisma.recordTaskInstance`、动态 `prisma.record.findFirst`，删除整段动态填报 fixture；该文件中其它独立业务 fixture（NonConformance / DeviationReport 等）保留 |
| `server/src/prisma/seed.ts` | **改** | 无动态模型调用，但有 `module: 'record' / resourceType: 'record' / onApproved: 'record.submitApproved'` 与 `module: 'task' / resourceType: 'task_record' / taskRecord.*` 两个动态审批定义 fixture；整段删除 |
| `server/src/prisma/seed-org.ts` | **不改** | 同上，零命中 |
| `server/src/prisma/seed-demo.ts` | **不改** | 同上，零命中 |

implementer 验证扫描已干净的命令：

```bash
rg -nE "prisma\\.(recordTemplate|record|recordChangeLog|recordTaskAssignment|recordTaskInstance|task|taskRecord|changeEventFormTask|recordFormLandingEntry)\\." server/src/prisma/seed*.ts
# 预期：零输出

rg -nE "record\\.submitApproved|taskRecord\\.|module: 'record'|module: 'task'|resourceType: 'record'|resourceType: 'task_record'" server/src/prisma/seed*.ts
# 预期：零输出；如果命中独立业务模块的普通 task 文本，必须人工确认不是旧动态填报审批定义
```

如果本地数据库已有测试数据，允许通过 reset 或迁移 drop 清理。此项目当前按无历史业务数据处理；implementation plan 不应依赖某个会话里曾经 reset 过数据库的偶然状态。

---

## 验收标准

### 代码结构

1. `server/src/app.module.ts` 不再导入动态填报模块。
2. `server/src/modules/record-template`、`server/src/modules/record`、`server/src/modules/record-task`、旧 `server/src/modules/task` 不再作为运行时模块存在。
3. `server/src/modules/scheduled-task` 若仍存在，不能再引用 `recordTaskAssignment` 或 `recordTaskInstance`；当前实现只服务动态填报时应删除。
4. `client/src/navigation/menu.ts` 不再暴露模板管理、动态记录、待填记录任务、旧动态任务入口。
5. `client/src/router/index.ts` 不再注册动态填报相关路由。

### 数据模型

1. Prisma schema 中不存在 `RecordTemplate`、`Record`、`RecordChangeLog`、`RecordTaskAssignment`、`RecordTaskInstance`、动态填报 `Task`、`TaskRecord`、`ChangeEventFormTask`、`RecordFormLandingEntry`。
2. `ProductionBatch` 不再有 `relatedRecords`。
3. `ProductRecallEvidence` 不再有动态 `Record` 外键。
4. `DeviationReport` 不再有动态 `Record` 外键。
5. DB 中 `record_form_landing_entries` 表已 drop。

### 行为

1. 动态填报 API 不再注册。
2. 记录表单索引整体不存在（无 API、无前端页、无 DB 表、无菜单入口）。
3. 变更事件不再生成动态表单任务。
4. 班次完成度不再依赖动态模板。
5. 追溯查询、导出、快照不再包含动态记录段落。
6. 独立业务记录模块仍可访问、编译、测试。
7. `model-landing:generate` / `model-landing:verify` npm script 不再存在；CI 不再尝试跑它们。

### 验证命令

实现完成后至少运行：

```bash
npm run build:server
npm run build:client
npm run typecheck:types
npm run traceability:verify -w server
```

注意：`model-landing:verify` 在退役 spec 实施过程中**被删除**（连同两个 model-landing npm script），所以验收命令清单里**不再**包含它。如果你看到任何文档 / CI 配置仍引用，那是漏改需要补回来。

如果实现改动触碰到追溯服务，还需要运行：

```bash
npm run traceability:test -w server
```

如果实现改动触碰到 Prisma schema，还需要运行：

```bash
npm run prisma:generate -w server
```

实际命令以当前 `package.json` 为准；若命令不存在，implementation plan 必须列明替代验证命令。

---

## 风险与防误删规则

1. `Record` 是动态填报模型，但很多独立业务模型名称也包含 `Record`。删除时不能按文件名模糊删除。
2. `Task / TaskRecord` 只删除旧动态填报任务，不删除 `ApprovalTask` 和 `TodoTask`。
3. `ProcessTemplate` 与 `RecordTemplate` 无关，必须保留。
4. `RecordFormLandingEntry` 与 `model-landing` 整体退役（详见 § model-landing 整体退役）；不再尝试保留"索引能力"。
5. `model-landing.generated.ts`、运行时 CSV 输入、生成脚本和 freeze test 全部删除；`archive/superpowers/` 下的历史资料保留，但不得再被当前协议文档引用为事实源。
6. `ScheduledTaskModule` 当前实现只生成动态填报任务实例，应删除；若后续需要通用调度器，应重新建模，不复用动态填报命名。
7. 旧 migration 文件可以保留历史记录，不要求改写；当前 schema 和新增 migration 必须表达退役后的最终状态。

---

## 顶层文档同步更新清单

退役实施完成前，下列顶层文档必须按本节更新。执行时先用 `rg` 重新确认行号，下面的行号只描述 2026-05-23 的当前快照。

### docs/adr/0001-retire-dynamic-form-platform.md（口径对齐）

| 段落 | 处置 |
|---|---|
| Decision 中把 `archive/superpowers/...model-landing...` 列为删除范围的表述 | 改为：运行时代码、生成物、脚本、活跃协议引用删除；`archive/superpowers/` 下历史 spec/plan/csv 保留为历史资料 |
| Consequences 中“CSV 源清单也删除” | 改为：CSV 不再作为运行时输入和 hard gate 事实源；archive 副本保留，未来不得直接复活为当前合同 |
| Validation 中关于 model-landing 文件不存在的断言 | 限定为 `server/src/modules/model-landing/`、scripts、freeze test、generated 和活跃协议引用不存在；不要求 archive 历史资料不存在 |

### AGENTS.md（1 处）

| 行 | 原文 | 处置 |
|---|---|---|
| 31 | `- deciding between RecordTemplate/Record and independent business tables` | **整行删除**（RecordTemplate / Record 已不存在） |

### docs/AGENT_GUIDE.md（5 处）

| 行 | 原文片段 | 处置 |
|---|---|---|
| 3 | `…追溯与 model-landing 约束。` | 改为 `…追溯约束。`（去掉 `与 model-landing`） |
| 21 | `- 食品安全 SaaS、283 张源表单、记录表单、模板。` | 改为 `- 食品安全 SaaS、独立业务记录表、主数据、批次、追溯、召回。` |
| 26 | `- 判断 \`RecordTemplate/Record\` 与独立业务表的边界。` | **整行删除** |
| 37 | `- 动态表单：\`RecordTemplate\`、\`Record\`、\`RecordTaskAssignment\`、\`RecordTaskInstance\`。` | **整行删除** |
| 152-166 | `## 10. Model Landing 合同` 整段（含 archive csv、generated.ts 路径、`npm run model-landing:verify -w server` 命令、"不要重新分类 283 张表单"约束） | **整段删除**；后续小节 `## 11. 项目结构速查` 顺位提为 `## 10`。如果其他段落对"§10/§11"有交叉引用需同步调整，按 `rg "§ ?10\|§ ?11" docs/AGENT_GUIDE.md` 全文复核 |

### docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md（8 处）

| 行 | 原文片段 | 处置 |
|---|---|---|
| 15 | `- \`server/src/modules/model-landing/\`` | **整行删除** |
| 19-30 | `283 张源表单的落地映射当前由 model-landing artifact 表达：`<br>+ 三个 path 列表<br>+ `验证命令：`<br>+ ```npm run model-landing:verify -w server```<br>+ `npm run traceability:verify -w server` | **整段删除**；只保留 `npm run traceability:verify -w server` 作为追溯验证命令，迁移到上一段或新建一个简短的"验证命令"小段 |
| 38 | `5. \`RecordTemplate\` / \`Record\` 用于动态记录表单，不替代核心主数据和批次账。` | **整行删除**；后续编号"6. 新审批默认使用 ApprovalInstance / ApprovalTask"调整为"5." |
| 171-175 | `使用 \`RecordTemplate\` / \`Record\` 的情况：`<br>+ 三条列表（表单结构变化频繁 / 主要用途是填报、归档…/ 不作为主数据、批次、库存…） | **整段删除**；上一段（建独立模型的判断标准）作为唯一答案保留 |
| 177 | `若一张源表单包含主数据字段和检查记录，应拆分：主数据进入独立模型，检查项进入记录表单或业务记录模型。` | 改为 `若一张源表单包含主数据字段和检查记录，应拆分：主数据进入独立模型，检查项进入对应业务记录模型。`（去掉 `记录表单或`） |
| 187-188 | `- 记录模板：\`RecordTemplate\``<br>`- 填报记录：\`Record\`` | **两行整体删除**（文控与业务对象边界清单中这两项不再存在） |
| 227 | `- 是否让 \`Record.data\` 成为库存、批次或追溯事实源。` | **整行删除** |
| 229 | `- 是否需要更新 \`model-landing.generated.ts\` 并运行验证。` | **整行删除** |

### CONTEXT.md（术语收口）

| 术语 / 表述 | 处置 |
|---|---|
| `动态表单`、`记录填写任务`、`周期任务生成器`、`记录填写结果导出` | 从活跃能力和术语清单中删除；如需解释历史，统一引用 `docs/adr/0001-retire-dynamic-form-platform.md` |
| `记录表单索引`、`落地健康状态` | 删除运行时概念；改写为“每张 04 源记录表单要么有独立业务模块，要么不在系统中出现” |
| 指向 `RecordTemplate / Record / RecordFormLandingEntry / model-landing` 的当前事实描述 | 删除或改为历史说明，不得继续作为当前架构合同 |

implementer 的 verification 命令（顶层文档清扫完跑一次确保没漏）：

```bash
rg -nE "RecordTemplate|动态填报|动态表单|model-landing|283 张|记录表单索引|record-task|scheduled-task|RecordFormLandingEntry" \
   AGENTS.md docs/AGENT_GUIDE.md docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md
# 预期：零输出

rg -nE "RecordTemplate|动态填报|动态表单|model-landing|283 张|记录表单索引|record-task|scheduled-task|RecordFormLandingEntry" CONTEXT.md
# 预期：只允许出现在"已退役 / ADR 解释 / 历史术语"语境；不得作为当前能力、模块入口、事实源或 hard gate 出现
```

---

## 后续实施计划要求

implementation plan 必须按以下顺序拆解：

0. 确认 `simple-role-module-access` plan 至少跑到 Task 33 完成（覆盖 controller `@ModuleKey()` 标注 + 启动期 fail-fast + 审批契约收口）。未到此节点不允许开始本退役实施。
1. 建立独立 worktree（如 `feat/retire-dynamic-forms`），与 `simple-role-module-access` 的 worktree 互不污染。
2. 做 Prisma schema 删除和 migration（按本 spec § 迁移策略 § Prisma 迁移命名与命令 给出的命令）；同步执行 ApprovalDefinition / ApprovalInstance / ApprovalTask 清理 SQL（见 § 审批回调与定义数据清理）。
3. 清理后端模块注册、服务引用、审批回调、seed 和测试（按 § 与 simple-role-module-access plan 的执行顺序 § 必须回退或修正的产物 表逐行回退）。
4. 清理文控索引、变更事件、追溯、偏差、召回、班次等动态引用；其中 `change-event` 严格按 § change-event 删除顺序 七步执行。
5. 清理前端菜单、路由、API、页面和动态表单组件；删前先执行 § 前端退役范围 中给出的两段 `rg` 扫描脚本，覆盖率全部 review 后再删。
6. 按本 spec § 顶层文档同步更新清单 更新 `AGENTS.md`、`docs/AGENT_GUIDE.md`、`docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`、`CONTEXT.md`。
7. 执行验收命令（见 § 验证命令）并记录失败修复。

实现完成后，运行时系统应只剩：

```text
独立业务表模块
主数据 / 批次 / 追溯
文控（体系文件中心 + 审批历史 + 审批模板）
审批 / 待办
```

不再存在：

```text
动态模板
动态记录
动态字段设计器
动态填报任务
旧动态任务填报
04 记录表单索引（含 model-landing 模块、generated 清单、运行时 CSV 输入、前端索引页）
```
