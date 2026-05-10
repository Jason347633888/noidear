# 审批 / 工作流 / 任务边界使用指南

> **GAP-502 / GAP-503 / GAP-504**
> 本文档说明旧审批、统一审批、工作流、任务、记录任务派发五类机制的适用边界，帮助后续 agent 和开发者在不阅读 schema 的前提下选择正确机制。

---

## 结论先行

| 场景 | 选择 |
|------|------|
| 文档模块的历史审批记录兼容 | 旧 `Approval`（只读/维护，禁止新接入） |
| 新业务需要多步骤审批（如培训、偏差、来料、变更） | `UnifiedApproval`（ApprovalDefinition → ApprovalInstance → ApprovalTask） |
| 需要按模板配置多步骤流程、支持条件路由 | `Workflow`（WorkflowTemplate → WorkflowInstance → WorkflowTask） |
| 管理员向部门下发一次性数据收集任务 | `Task`（含 TaskRecord 提交，接入 UnifiedApproval 审批） |
| 按计划周期性生成记录表单填写任务 | `RecordTaskAssignment`（由 cron 自动生成 RecordTaskInstance） |

---

## 一、五类机制定义

### 1. 旧 `Approval`（Legacy Approval）

**表：** `approvals`

**用途：** 文档模块的链式签批，支持 `single`（单级）、`countersign`（会签）、`sequential`（顺签）三种模式，直接关联 `documents.id`。

**权威性：** 历史/兼容性口径。当前只有文档模块使用，且 `ApprovalService.getPendingApprovals()` 已做 fallback 兼容两套 API。

**状态：** 迁移冻结——禁止新业务继续接入，不迁移历史数据，不删除现有接口。

---

### 2. `UnifiedApproval`（统一审批平台）

**表：** `approval_definitions` / `approval_instances` / `approval_tasks` / `approval_actions`

**用途：** 新一代多步骤审批引擎。支持：
- 审批模式：`single`、`countersign_all`、`countersign_any`、`sequential`、`parallel_groups`
- 分配策略：`user`、`role`、`department`、`permission`
- Claim 模式：`DIRECT`（直接分配）、`CLAIMABLE`（抢单池）
- 回调机制：`ApprovalCallbackRegistry` 在审批通过后更新业务状态

**接入方式：**
1. 在 `approval_definitions` 写入审批流程定义（`resourceType + triggerKey + version`）
2. 业务事件触发时调用 `ApprovalEngineService.startApproval()`
3. 等待 `ApprovalCallbackRegistry` 回调更新业务状态

**已接入模块：** 研发流程（ProcessInstance）、培训计划（TrainingPlan）、任务记录（TaskRecord）、偏差报告（DeviationReport）、来料、变更、文档。

**权威性：** 后续审批工作的权威方向。

---

### 3. `Workflow`（通用工作流引擎）

**表：** `workflow_templates` / `workflow_instances` / `workflow_tasks`

**用途：** 通用流程编排，按模板 JSON 配置多步骤任务流转，支持：
- 条件路由（ConditionParser）
- 任务委托（delegatedTo）
- 步骤回滚
- 10 分钟 cron 超时升级

**与 UnifiedApproval 的区别：**

| 维度 | Workflow | UnifiedApproval |
|------|----------|-----------------|
| 定位 | 通用步骤流转编排 | 业务对象审批决策 |
| 步骤定义 | JSON 配置，灵活条件 | 固定审批步骤 + 分配策略 |
| 审批语义 | 无内置审批语义 | approve / reject / comment |
| 回调机制 | 无内置回调注册 | ApprovalCallbackRegistry |
| 待办聚合 | 通过 WorkflowTodoBridge 写 TodoTask | 通过 ApprovalTodoBridge 写 TodoTask |

**已接入模块：** Record（记录填写）、Training（培训）。

**权威性：** 独立系统，无融合计划前不与统一审批平台互通。

---

### 4. `Task`（一次性任务管理）

**表：** `tasks` / `task_records`

**用途：** 管理员向部门下发一次性数据收集任务。流程：
1. 管理员创建 `Task`（关联 `RecordTemplate`，指定部门和截止日期）
2. 部门成员提交 `TaskRecord`（支持草稿、偏差检测）
3. `TaskRecord` 接入 `UnifiedApprovalEngine` 完成审批
4. 审批通过后归档

**与 RecordTaskAssignment 的区别：** `Task` 是管理员手动下发的单次事项，有明确截止和审批链路；`RecordTaskAssignment` 是计划性周期配置，由系统自动触发。

---

### 5. `RecordTaskAssignment`（周期性记录任务派发）

**表：** `record_task_assignments` / `record_task_instances`

**用途：** 管理员为特定 `RecordTemplate` 配置周期性或单次填写任务计划：
- 周期性：通过 `cron_expression` 配置，由 `ScheduledTaskService` 自动生成 `RecordTaskInstance`
- 单次：设置 `deadline`，系统触发后生成实例
- 状态控制：`active` / `paused` / `closed`

**实例生命周期：** `RecordTaskInstance` 生成 → 员工在 `/record-tasks/my` 查看 → 提交 Record → 实例状态更新。

**与 Task 的区别：** `RecordTaskAssignment` 没有内置审批链路，关注的是周期性数据采集的触发和派发；`Task` 关注一次性下发 + 提交审批。

---

## 二、新业务接入决策树

```
需要发起一次业务审批（需要人工 approve/reject）？
  ├─ 是 → 是否是文档模块的旧链式审批兼容场景？
  │         ├─ 是 → 维护旧 Approval（不允许新增接入）
  │         └─ 否 → 使用 UnifiedApproval（ApprovalDefinition + startApproval）
  └─ 否 → 是否是多步骤流程编排（含条件路由、步骤回滚）？
             ├─ 是 → 使用 Workflow（WorkflowTemplate + WorkflowInstance）
             └─ 否 → 是否是管理员手动下发给部门的一次性填写任务？
                        ├─ 是 → 使用 Task（Task + TaskRecord，自动接入 UnifiedApproval）
                        └─ 否 → 是否是按计划周期性生成记录表单填写任务？
                                   ├─ 是 → 使用 RecordTaskAssignment（cron 触发）
                                   └─ 否 → 重新确认需求
```

---

## 三、禁止事项

1. **禁止新业务接入旧 `Approval`**
   旧 `Approval` 仅供文档模块历史兼容，不允许任何新业务模块直接写 `approvals` 表或调用 `approval.controller` 的链式审批接口。

2. **禁止把 `Workflow` 当审批平台替代品**
   `Workflow` 是通用流程编排引擎，无内置 approve/reject 语义，不能替代 `UnifiedApproval` 做业务审批决策。混用会导致审批状态无法通过 `ApprovalCallbackRegistry` 回传业务，待办无法聚合。

3. **禁止把周期性记录表单派发塞进一次性 `Task`**
   `Task` 没有 cron 配置，也没有 `paused`/`closed` 生命周期控制。周期性采集场景应使用 `RecordTaskAssignment`。

4. **禁止在业务模块里重新建一套审批状态字段**
   不允许在业务表（如偏差报告、培训计划）上新增 `approvalStatus`、`approvalResult` 等字段来绕过统一审批平台。业务状态应通过 `approvalInstanceId` 关联 `approval_instances`，由 `ApprovalCallbackRegistry` 回调更新。

---

## 四、后续迁移建议

> 本 PR 不执行迁移，仅记录建议方向。

| 项目 | 建议 | 前置条件 |
|------|------|----------|
| 旧 `Approval` → UnifiedApproval | 文档模块历史审批逐步迁移至统一审批平台，旧接口标注 `@deprecated` | 需业务确认文档审批链路改造范围 |
| 旧审批接口废弃 | 在 `approval.controller.ts` 加 deprecation 注释，前端移除 `approveLevel1`/`approveLevel2` 调用 | GAP-500 已记录，可并行推进 |
| Workflow 与 UnifiedApproval 融合评估 | 两套系统目前独立，无融合计划。如果出现同一业务对象同时需要审批决策和步骤流转，再评估桥接方案 | 需业务场景出现后再决策 |

---

## 五、证据索引

| 声明 | 证据来源 |
|------|----------|
| 旧 Approval 仅文档模块使用 | `server/src/modules/approval/approval.service.ts`：注释"仅支持文档审批" |
| UnifiedApproval 已接入多模块 | `server/src/modules/unified-approval/approval-engine.service.ts`：ApprovalCallbackRegistry |
| Workflow 独立于统一审批 | `server/src/modules/workflow/workflow-template.controller.ts` 和 `approval-instance.controller.ts` 无交叉注入 |
| Task 接入 UnifiedApproval | `server/src/modules/task/task.service.ts`：TaskRecord.approvalInstanceId 关联 approval_instances |
| RecordTaskAssignment cron 触发 | `server/src/modules/record-task/record-task-cron.service.ts` |
| schema 行号 | `schema.prisma:L401`（Approval）、`L434`（ApprovalDefinition）、`L686`（WorkflowTemplate）、`L3832`（Task）、`L2368`（RecordTaskAssignment） |
| 模块使用文档 | 历史 Multica GAP 模块文档：GAP-502/503/504 |
