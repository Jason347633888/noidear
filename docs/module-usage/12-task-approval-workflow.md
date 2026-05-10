# 任务派发 / 审批 / 工作流模块

---
module_id: task-approval-workflow
business_chain:
  - 任务派发 → 记录填写 → 审批流转 → 偏差处理 → 归档
  - 文档/变更/培训/其他业务对象 → 审批发起 → 统一审批平台或旧审批引擎 → 通过/驳回
module_type:
  - 治理/流程型模块
source_of_truth:
  - schema: ApprovalDefinition, ApprovalInstance, ApprovalTask, ApprovalAction (统一审批平台)
  - schema: Approval (旧文档审批模型，仅保留用于文档模块兼容)
  - schema: WorkflowTemplate, WorkflowInstance, WorkflowTask (P1-3 工作流)
  - schema: Task, TaskRecord (任务管理)
  - schema: RecordTaskAssignment, RecordTaskInstance (任务派发/周期记录)
  - schema: TodoTask (待办聚合)
facts_or_projections:
  - ApprovalDefinition/Instance/Task/Action：统一审批平台的事实源
  - Approval：旧审批事实源（文档模块残留）
  - WorkflowTemplate/Instance/Task：工作流事实源（独立系统）
  - Task/TaskRecord：任务管理事实源
  - RecordTaskAssignment/Instance：周期记录任务派发事实源
  - TodoTask：跨模块待办聚合视图（由 ApprovalTodoBridge 等桥写入）
downstream_consumers:
  - 文档模块（PR4 后通过 ApprovalInstance；旧 Approval 表保留只读历史兼容，新文档不再写旧 Approval）
  - 研发流程、培训计划、偏差报告、来料、变更（通过统一审批平台 ApprovalInstance）
  - 记录填写模块（通过 RecordTaskInstance → Record）
  - My-Todos 待办视图（读 TodoTask）
current_entrypoints:
  - /approvals (旧审批列表, ApprovalList.vue)
  - /approvals/pending, /approvals/history, /approvals/all (旧审批平台页面)
  - /workflow/templates, /workflow/instances, /workflow/tasks (工作流管理)
  - /tasks, /tasks/:id (任务管理)
  - /my-todos (待办聚合视图)
  - /record-tasks/my (待填任务实例)
  - /record-tasks/manage (任务配置)
last_verified_commit: 7bab98dc3ccd49e8e1d76b95b28a1b79207c483c
---

## 1. 模块定位

本模块横跨三条独立机制：

| 机制 | 核心表 | 用途 |
|------|--------|------|
| **旧审批（Legacy Approval）** | `approvals` | 历史文档的只读兼容路径（PR4 后不再新增写入）；新文档审批全走 ApprovalInstance |
| **统一审批平台（Unified Approval Platform）** | `approval_definitions` / `approval_instances` / `approval_tasks` / `approval_actions` | 新一代多步骤审批引擎，供研发流程、培训、偏差报告等业务模块挂载 |
| **工作流（Workflow）** | `workflow_templates` / `workflow_instances` / `workflow_tasks` | P1-3 通用工作流，支持按模板配置的多步骤任务流转，独立于统一审批平台 |
| **任务管理（Task）** | `tasks` / `task_records` | 管理员派发给部门的填写任务，带提交/审批/偏差三态 |
| **任务派发（Record Task）** | `record_task_assignments` / `record_task_instances` | 管理员对特定 RecordTemplate 配置周期性或单次填写任务，由 ScheduledTask 自动触发生成实例 |
| **待办聚合（TodoTask）** | `todo_tasks` | 将统一审批平台待办、工作流待办等汇聚成统一视图，由各模块的桥接服务写入 |

**这五条机制并非互通**：工作流引擎与统一审批平台是两套独立的流转系统；旧审批表（`approvals`）自 PR4 起不再新增写入，仅作历史兼容只读路径。三者共存，但无共享数据通道。

## 2. 使用角色

| 角色 | 使用目的 | 关键动作 |
|------|----------|----------|
| 管理员 | 配置审批定义、工作流模板、任务配置 | 创建 ApprovalDefinition、WorkflowTemplate、RecordTaskAssignment |
| 业务发起人 | 发起审批/工作流 | startApproval、创建 WorkflowInstance、创建 Task |
| 审批人/工作流任务执行人 | 审批通过/驳回 | ApprovalTask.approve/reject，WorkflowTask.complete |
| 普通员工 | 查看待填任务、填写记录 | 查看 RecordTaskInstance、提交 Record |
| 所有用户 | 查看待办 | 访问 /my-todos，查看 TodoTask |

## 3. 当前入口

| 入口 | 页面 | 前端 API | 后端 API | 后端模块 |
|------|------|----------|----------|----------|
| /approvals | ApprovalList.vue | `GET /approvals/pending` | `GET /approvals/pending` | approval.controller |
| /approvals/history | ApprovalHistory.vue | `GET /approvals/history` | `GET /approvals/history` | approval.controller |
| /approvals/all | ApprovalAll.vue | `approval.ts` | `GET /approvals` (不存在，见 GAP) | approval.controller |
| /workflow/templates | TemplateList.vue | `GET /workflow-templates` | `GET /workflow-templates` | workflow-template.controller |
| /workflow/instances | InstanceList.vue | `GET /workflow-instances` | `GET /workflow-instances` | workflow-instance.controller |
| /workflow/tasks | MyTasks.vue | `GET /workflow-tasks` | `GET /workflow-tasks` | workflow-task.controller |
| /tasks | TaskList.vue | `GET /tasks` | `GET /tasks` | task.controller |
| /tasks/:id | TaskDetail.vue | `GET /tasks/:id` | `GET /tasks/:id` | task.controller |
| /my-todos | MyTodos.vue | `GET /todos` | `GET /todos` | todo.controller |
| /record-tasks/my | RecordTaskInstanceList.vue | `GET /record-task-instances/pending` | `GET /record-task-instances/pending` | record-task.controller |
| /record-tasks/manage | RecordTaskAssignmentList.vue | `GET /record-task-assignments` | `GET /record-task-assignments` | record-task.controller |
| 统一审批（程序调用）| - | `unifiedApprovalApi` | `approval-instances`, `approval-tasks` | unified-approval 模块 |

## 4. 当前实现

| 对象 | 当前实现 | 说明 |
|------|----------|------|
| Approval（旧审批） | `approvals` 表，关联 `documents` | 支持 single/countersign/sequential；仅文档模块使用 |
| ApprovalDefinition | `approval_definitions`，存 JSON steps | 审批流程模板，按 module+resourceType+triggerKey+version 唯一 |
| ApprovalInstance | `approval_instances` | 每次业务发起产生一个实例，含 status 状态机 |
| ApprovalTask | `approval_tasks` | 每个步骤对应一条任务，支持角色/部门/权限码/用户直接分配 |
| ApprovalAction | `approval_actions` | 每次操作记录（approve/reject/COMMENT/COMMENT\_ONLY） |
| ApprovalTodoBridge | 写入 TodoTask | 统一审批 pending 任务写入待办聚合 |
| WorkflowTemplate | `workflow_templates`，steps 存 JSON | 工作流模板，独立于统一审批定义 |
| WorkflowInstance | `workflow_instances` | 工作流实例，关联 Record |
| WorkflowTask | `workflow_tasks` | 工作流步骤任务，支持委托（delegatedTo） |
| Task | `tasks`，关联 RecordTemplate | 管理员派发的填写任务 |
| TaskRecord | `task_records` | 提交的填写记录，含 approvalInstanceId 关联统一审批 |
| RecordTaskAssignment | `record_task_assignments` | 任务配置，支持周期（cron\_expression）和单次 |
| RecordTaskInstance | `record_task_instances` | 实际触发的填写任务实例 |
| ScheduledTaskService | 按 cron 自动生成 RecordTaskInstance | 依赖 cron-parser 解析表达式 |
| TodoTask | `todo_tasks` | 待办聚合，type+relatedId 唯一 |

## 5. 正确业务流程

| 步骤 | 用户动作 | 系统结果 | 绑定模块 | 缺失后果 |
|------|----------|----------|----------|----------|
| 1 | 管理员创建审批定义 | ApprovalDefinition 写入 | unified-approval | 业务模块无法发起审批 |
| 2 | 业务事件触发（如提交培训计划）| ApprovalEngineService.startApproval 调用 | unified-approval | 审批未发起，业务卡住 |
| 3 | 系统按步骤创建 ApprovalTask，写 TodoTask | ApprovalTask + TodoTask 写入 | unified-approval, todo | 审批人无感知 |
| 4 | 审批人在待办或审批页面操作 | approveTask / rejectTask | unified-approval | 流程不前进 |
| 5 | 最终步骤通过 | ApprovalInstance 状态变为 APPROVED，回调注册的业务 | ApprovalCallbackRegistry | 业务状态不更新 |
| 6 | 管理员配置任务派发 | RecordTaskAssignment 写入 | record-task | 无法生成周期填写任务 |
| 7 | ScheduledTask 触发 | RecordTaskInstance 生成 | scheduled-task | 员工看不到待填任务 |
| 8 | 员工提交记录 | Record + RecordTaskInstance.status 更新 | record-task, record | 填写记录无法提交 |

## 6. 上下游绑定关系

- **统一审批平台 → 多业务模块**：研发流程（ProcessInstance）、培训计划（TrainingPlan）、任务记录（TaskRecord）、偏差报告（DeviationReport）均通过 `approvalInstanceId` 关联到 `approval_instances`，由 `ApprovalCallbackRegistry` 注册回调。
- **旧审批平台 → 文档模块**：`approvals.documentId` 关联 `documents`；旧审批接口（`/approvals/chains`, `/approvals/:id/approve`）仍在 approval.controller 中，且前端适配器同时保留旧接口调用（`approveLevel1`, `approveLevel2`）。
- **工作流 → Record**：`workflow_instances` 通过 `records` 反向关联，工作流实例可绑定到记录。
- **RecordTaskAssignment → RecordTemplate**：`record_task_assignments.templateId` 关联 `record_templates`，任务实例生成后可提交 Record。
- **TodoTask → 多业务来源**：由 ApprovalTodoBridge（审批待办）等桥接服务写入，是多来源待办的聚合层，不是独立事实源。

## 7. 当前系统差距

> **边界说明见：** [`docs/superpowers/specs/2026-05-01-approval-workflow-task-boundary-guide.md`](../superpowers/specs/2026-05-01-approval-workflow-task-boundary-guide.md)
>
> 该文档包含旧 Approval、UnifiedApproval、Workflow、Task、RecordTaskAssignment 五类机制的定义、决策树和禁止事项，适用于 GAP-502/503/504 的后续整改。

| GAP 编号 | 当前问题 | 根因 | 影响后果 | 严重级别 | 验证状态 | 证据 |
|----------|----------|------|----------|----------|----------|------|
| GAP-500 | 前端 `approveLevel1`/`approveLevel2` 调用 `/approvals/level1/:id/approve` 和 `/approvals/level2/:id/approve`，后端无此路由 | 旧接口残留调用未清理 | 旧审批"一级/二级审批"按钮调用后返回 404 | P1（高） | 已验证 | `client/src/api/approval.ts:L63,L76`；`server/src/modules/approval/approval.controller.ts` 无 level1/level2 路由 |
| GAP-501 | 前端 `GET /auth/profile` vs 后端 `@Post('profile')` HTTP 方法不匹配 | auth.controller 将 profile 定义为 POST，前端 store 用 GET | 用户登录后获取 profile 返回 405，页面可能初始化失败 | P0（关键） | 已验证 | `client/src/stores/user.ts:L45`；`server/src/modules/auth/auth.controller.ts:L17` |
| GAP-502 | 旧审批平台（Approval 模型）与统一审批平台（ApprovalInstance/Task）并存 | **文档模块已完成迁移（PR4）**：新文档提交全走 ApprovalInstance，旧 Approval 表保留只读历史兼容，`prisma.approval.create` 已清零 | 历史文档兼容路径仍读旧 Approval；前端 `/approvals/*` 页面为历史入口，不新增接入 | P1（历史兼容） | **已部分完成（PR4）** | ADR: `docs/decisions/2026-05-09-document-approval-legacy-compatibility.md` |
| GAP-503 | 工作流（Workflow）与统一审批平台（UnifiedApproval）并存，语义重叠，无文档说明各自适用场景 | P1-3 工作流在统一审批平台之前实现 | 新业务不知道应该用哪套审批机制 | P1（高） | 已验证 | `server/src/modules/workflow/` 和 `server/src/modules/unified-approval/` 独立模块；`schema.prisma:L686` WorkflowTemplate vs L434 ApprovalDefinition |
| GAP-504 | Task（任务管理）与 RecordTask（任务派发）两套任务机制并存，模型结构相似但无明确区分文档 | 两套系统独立开发 | 管理员不知道何时用哪套任务派发 | P2（中） | 已验证 | `schema.prisma:L3832` Task vs L2368 RecordTaskAssignment；两者均关联 RecordTemplate |

## 8. 整改建议

| GAP 编号 | 建议整改 | 依赖模块 | 是否需要新设计 | 建议 PR | 是否可并行 |
|----------|----------|----------|----------------|---------|-----------|
| GAP-500 | 删除 `approveLevel1`/`approveLevel2` 前端调用，统一使用 `approveUnified` | 前端 approval.ts | 否 | fix/approval-remove-legacy-level-calls | 是 |
| GAP-501 | 将 `auth.controller.ts` 的 `@Post('profile')` 改为 `@Get('profile')` | auth 模块 | 否 | fix/auth-profile-method-get | 是 |
| GAP-502 | **已完成（PR4）**：新文档审批全走 ApprovalInstance，旧 Approval 表只读历史兼容，`prisma.approval.create` 清零；ADR 已记录 | approval, document | 否 | 已合并（PR #200） | — |
| GAP-503 | 在 AGENTS.md 或模块文档中补充决策树：何时使用 Workflow vs UnifiedApproval，并确定迁移方向 | workflow, unified-approval | 需要业务确认 | docs/workflow-vs-unified-approval-decision | 否（需先做业务决策） |
| GAP-504 | 补充 RecordTask（周期性表单派发） vs Task（一次性任务+审批）的使用场景说明 | task, record-task | 否 | docs/task-vs-record-task-guide | 是 |

## 9. 证据索引

- `server/src/modules/approval/approval.controller.ts`：旧审批控制器，路由 `/approvals`
- `server/src/modules/unified-approval/approval-engine.service.ts`：统一审批平台核心引擎
- `server/src/modules/unified-approval/approval-instance.controller.ts`：路由 `/approval-instances`
- `server/src/modules/unified-approval/approval-task.controller.ts`：路由 `/approval-tasks`
- `server/src/modules/workflow/workflow-template.controller.ts`：路由 `/workflow-templates`
- `server/src/modules/workflow/workflow-instance.controller.ts`：路由 `/workflow-instances`
- `server/src/modules/task/task.controller.ts`：路由 `/tasks`
- `server/src/modules/record-task/record-task.controller.ts`：路由 `/record-task-assignments`, `/record-task-instances`
- `server/src/modules/scheduled-task/scheduled-task.service.ts`：cron 触发 RecordTaskInstance
- `server/src/modules/todo/todo.controller.ts`：路由 `/todos`
- `server/src/modules/auth/auth.controller.ts`：`@Post('profile')` — HTTP 方法错误
- `client/src/stores/user.ts:L45`：`GET /auth/profile` 调用
- `client/src/api/approval.ts`：旧审批 + 统一审批混合调用
- `client/src/api/unified-approval.ts`：统一审批平台前端适配器
- `client/src/api/workflow.ts`：工作流前端适配器
- `server/src/prisma/schema.prisma:L401`：Approval（旧）
- `server/src/prisma/schema.prisma:L434`：ApprovalDefinition（统一审批）
- `server/src/prisma/schema.prisma:L686`：WorkflowTemplate
- `server/src/prisma/schema.prisma:L3832`：Task
- `server/src/prisma/schema.prisma:L2368`：RecordTaskAssignment
- `server/src/prisma/schema.prisma:L2003`：TodoTask

## 10. 禁止重复实现与事实源边界

| 对象 | 当前事实源 | 允许展示字段 | 禁止新增的平行事实源 | 旧字段或旧模块处理 |
|------|-----------|-------------|---------------------|-------------------|
| 统一审批流程定义 | `approval_definitions` | 名称、步骤描述 | 禁止在其他模块自建 JSON 审批配置 | WorkflowTemplate 步骤配置不应混入 |
| 审批状态 | `approval_instances.status` / `approval_tasks.status` | 状态展示 | 禁止业务表自行维护额外 approvalStatus 字段（DeviationReport 已关联 approvalInstanceId） | 旧 `approvals.status` 保留仅供文档模块 |
| 工作流状态 | `workflow_instances.status` | 状态展示 | 禁止与统一审批平台混用实例表 | 独立系统，无融合计划前不动 |
| 待办 | `todo_tasks` | 类型、标题、关联 ID | 禁止各业务页面绕过 TodoTask 自建私有待办列表 | TodoTask 是聚合视图，由桥接服务写入 |

## 11. 后续整改入口

| 优先级 | GAP 编号 | 推荐 PR | 前置依赖 | 可并行 | 验收命令 |
|--------|----------|---------|----------|--------|---------|
| P0 | GAP-501 | fix/auth-profile-method-get | 无 | 是 | `curl -X GET /auth/profile -H "Authorization: Bearer <token>"` 返回 200 |
| P1 | GAP-500 | fix/approval-remove-legacy-level-calls | 无 | 是 | 确认前端无 `/approvals/level1` 或 `/approvals/level2` 调用 |
| P1 | GAP-502 | docs/approval-migration-plan | 无 | 是 | 文档明确旧审批废弃计划 |
| P1 | GAP-503 | docs/workflow-vs-unified-approval-decision | 业务确认 | 否 | 文档包含两套机制决策树 |
| P2 | GAP-504 | docs/task-vs-record-task-guide | 无 | 是 | 文档明确两套任务使用场景 |
