# 统一审批底座设计规格说明

**版本**: 1.0  
**日期**: 2026-04-26  
**范围**: 文档审批、研发流程会签、记录表单审批、跨模块审批待办  
**状态**: 待评审

---

## 1. 背景

当前审批能力分散在多套模型中：

- `Approval`：主要服务文档审批，绑定具体 `documentId` 和具体 `approverId`
- `ProcessStepApproval`：服务研发流程步骤会签，按 `instanceId + stepNumber + role` 建待签槽位
- `WorkflowTask`：服务工作流任务
- `TodoTask`：服务“我的待办”的聚合展示
- `Notification`：服务通知，但不是所有审批都会接入

这种结构短期能跑，但长期会导致每个模块重复实现审批、通知、待办、历史和统计。一二三级文件、研发记录、采购、品质、仓储、CAPA、不合格、内审等表单越多，维护成本越高。

目标不是把所有业务硬塞进旧 `Approval` 表，而是建立一个统一审批底座：所有业务模块只声明“要审批什么、谁审批、怎么审批、通过后做什么”，审批底座统一负责审批任务、待办、通知、历史、权限校验和审计。

---

## 2. 设计目标

1. **统一入口**：所有待审批事项进入同一个审批中心、我的待办、通知中心。
2. **统一模型**：文档、研发流程、动态记录、业务对象审批都使用同一套审批实例和审批任务模型。
3. **配置化规则**：审批人、角色、部门、会签/顺签/任一审批等规则来自模板，不写死在业务代码里。
4. **业务解耦**：审批底座不直接知道 Product、Recipe、Document 的内部状态；业务模块通过回调/事件处理审批通过后的副作用。
5. **事务可靠**：审批动作、任务状态、业务副作用在需要强一致的场景中必须同事务完成。
6. **可迁移**：保留旧审批数据，逐步把新流程迁入统一审批底座，不一次性破坏现有模块。
7. **可审计**：每一次创建、签署、驳回、转交、取消、超时都留审批动作日志。

---

## 3. 非目标

本设计不一次性重做所有业务页面，也不要求第一阶段迁移所有历史审批数据。

第一阶段不做复杂 BPMN 设计器，只实现审批模板配置、审批实例、审批任务、统一待办和研发流程接入。后续可在此基础上做可视化流程设计。

---

## 4. 核心概念

### 4.1 业务资源

所有被审批对象用统一资源定位：

```text
resourceType + resourceId + optional resourceStep
```

示例：

| 场景 | resourceType | resourceId | resourceStep |
| --- | --- | --- | --- |
| 文档发布审批 | document | document.id | publish |
| 一级文件修订审批 | document | document.id | revision |
| 研发 Step4 五部门会签 | process_instance | processInstance.id | step:4 |
| CAPA 关闭审批 | corrective_action | correctiveAction.id | close |
| 动态记录提交审批 | record | record.id | submit |

审批底座只保存资源定位，不复制业务字段。

### 4.2 审批定义

审批定义描述“这类资源应该怎么批”。

```text
ApprovalDefinition
  module: document/process/capa/record/warehouse/...
  resourceType: document/process_instance/...
  triggerKey: publish/step:4/close/submit/...
  name: 审批名称
  version: 版本
  status: active/inactive
  steps: ApprovalStepDefinition[]
```

定义必须版本化。已经发起的审批实例永远绑定当时的定义版本，后续修改模板不影响历史审批。

### 4.3 审批实例

审批实例表示某个业务资源的一次审批流程。

```text
ApprovalInstance
  definitionId
  definitionVersion
  resourceType
  resourceId
  resourceStep
  title
  status: PENDING/APPROVED/REJECTED/CANCELLED
  currentStepKey
  createdById
```

一个资源可以有多次审批实例，例如同一文件多次修订审批。

### 4.4 审批任务

审批任务表示“谁需要处理”。

```text
ApprovalTask
  instanceId
  stepKey
  assignmentType: USER/ROLE/DEPARTMENT/PERMISSION
  assigneeUserId?
  assigneeRoleCode?
  assigneeDepartmentId?
  assigneePermissionCode?
  claimMode: DIRECT/CLAIMABLE
  status: PENDING/APPROVED/REJECTED/CANCELLED
  claimedById?
  actedById?
```

具体人审批用 `USER + DIRECT`。部门/角色任一人可签用 `ROLE/DEPARTMENT/PERMISSION + CLAIMABLE`。实际签署后写入 `claimedById/actedById`。

### 4.5 审批动作

审批动作是不可变历史。

```text
ApprovalAction
  instanceId
  taskId
  actorId
  action: APPROVE/REJECT/CLAIM/TRANSFER/CANCEL/COMMENT
  comment
  createdAt
  snapshot
```

`snapshot` 保存当时的角色、部门、任务状态和关键上下文，避免后续组织架构变化导致历史失真。

---

## 5. 支持的审批模式

| 模式 | 说明 | 示例 |
| --- | --- | --- |
| single | 一个任务通过即通过当前步骤 | 总经理批准 |
| countersign_all | 所有任务都通过才通过 | 研发 Step4 五部门会签 |
| countersign_any | 任一任务通过即通过 | 部门任一主管审批 |
| sequential | 按顺序逐步审批 | 主管 → 经理 → 总经理 |
| parallel_groups | 多组并行，每组内部可配置 all/any | 品质组 all + 制造组 any |

驳回默认终止整个审批实例，并取消同实例下仍待处理任务。特殊业务需要“驳回到上一环节”时，由定义中的 `rejectPolicy` 指定。

---

## 6. 数据模型

### 6.1 新增模型

```prisma
model ApprovalDefinition {
  id           String   @id @default(cuid())
  module       String
  resourceType String
  triggerKey   String
  name         String
  version      Int
  status       String   @default("active")
  steps        Json
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  instances ApprovalInstance[]

  @@unique([module, resourceType, triggerKey, version])
  @@index([resourceType, triggerKey, status])
  @@map("approval_definitions")
}

model ApprovalInstance {
  id                String   @id @default(cuid())
  definitionId      String
  definition        ApprovalDefinition @relation(fields: [definitionId], references: [id], onDelete: Restrict)
  definitionVersion Int
  resourceType      String
  resourceId        String
  resourceStep      String?
  title             String
  status            String   @default("PENDING")
  currentStepKey    String?
  createdById       String
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  completedAt       DateTime?

  tasks   ApprovalTask[]
  actions ApprovalAction[]

  @@index([resourceType, resourceId])
  @@index([status])
  @@map("approval_instances")
}

model ApprovalTask {
  id                       String   @id @default(cuid())
  instanceId               String
  instance                 ApprovalInstance @relation(fields: [instanceId], references: [id], onDelete: Cascade)
  stepKey                  String
  stepName                 String
  approvalMode             String
  assignmentType           String
  assigneeUserId           String?
  assigneeRoleCode         String?
  assigneeDepartmentId     String?
  assigneePermissionCode   String?
  claimMode                String   @default("DIRECT")
  status                   String   @default("PENDING")
  claimedById              String?
  actedById                String?
  comment                  String?
  actedAt                  DateTime?
  dueAt                    DateTime?
  createdAt                DateTime @default(now())
  updatedAt                DateTime @updatedAt

  actions ApprovalAction[]

  @@index([instanceId, stepKey])
  @@index([status])
  @@index([assigneeUserId, status])
  @@index([assigneeRoleCode, status])
  @@index([assigneeDepartmentId, status])
  @@index([assigneePermissionCode, status])
  @@map("approval_tasks")
}

model ApprovalAction {
  id         String   @id @default(cuid())
  instanceId String
  instance   ApprovalInstance @relation(fields: [instanceId], references: [id], onDelete: Cascade)
  taskId     String?
  task       ApprovalTask? @relation(fields: [taskId], references: [id], onDelete: SetNull)
  actorId    String
  action     String
  comment    String?
  snapshot   Json?
  createdAt  DateTime @default(now())

  @@index([instanceId])
  @@index([taskId])
  @@index([actorId])
  @@map("approval_actions")
}
```

### 6.2 旧模型处理

`Approval` 和 `ProcessStepApproval` 不立即删除。

迁移策略：

1. 新审批全部走统一审批底座。
2. 旧 `Approval` 作为历史兼容读取，后续可迁入 `ApprovalInstance/ApprovalTask/ApprovalAction`。
3. `ProcessStepApproval` 在研发流程迁移完成后停止创建；研发页面改读统一审批任务。
4. `TodoTask` 继续作为统一待办表，但审批待办由 `ApprovalTask` 驱动同步生成。

---

## 7. 审批模板结构

模板保存在 `ApprovalDefinition.steps` 中。

```json
[
  {
    "stepKey": "step4-review",
    "stepName": "产品开发评审会签",
    "mode": "countersign_all",
    "assignments": [
      { "type": "department", "departmentCode": "PZ", "roleCode": "quality_manager", "label": "品质部" },
      { "type": "department", "departmentCode": "ZZ", "roleCode": "manufacture_manager", "label": "制造部" },
      { "type": "department", "departmentCode": "CG", "roleCode": "purchase_manager", "label": "采购部" },
      { "type": "department", "departmentCode": "KF", "roleCode": "development_manager", "label": "产品开发部" },
      { "type": "role", "roleCode": "gm", "label": "总经理" }
    ],
    "rejectPolicy": "reject_instance",
    "onApproved": "process.stepApproved"
  }
]
```

审批引擎只解释 `mode`、`assignments`、`rejectPolicy`。`onApproved` 是业务回调键，由业务模块注册处理。

---

## 8. 服务边界

### 8.1 ApprovalEngineService

职责：

- 根据 `resourceType + triggerKey` 查找 active definition
- 创建 `ApprovalInstance`
- 展开当前步骤的 `ApprovalTask`
- 处理 approve/reject/claim/transfer
- 判断当前步骤是否完成
- 推进下一审批步骤或完成实例
- 写 `ApprovalAction`
- 同步 `TodoTask`
- 创建 `Notification`
- 触发业务回调

### 8.2 ApprovalAssignmentResolver

职责：

- 把模板中的 `user/role/department/permission` 解析成可处理用户集合
- 校验当前用户是否允许处理某个任务
- 支持部门、角色、权限、管理员覆盖规则

这里必须复用现有 `User`、`Role`、`Department`、`FineGrainedPermission`、`DepartmentPermission`，不能再写死中文部门名到审批角色的映射。

### 8.3 ApprovalTodoBridge

职责：

- 审批任务创建时同步 `TodoTask`
- 审批任务完成、驳回、取消时关闭相关 `TodoTask`
- 为 `/my-todos` 提供跳转路径

审批待办的 `TodoTask.relatedId` 指向 `ApprovalTask.id`，`actionRoute` 根据 `ApprovalInstance.resourceType` 生成。

### 8.4 ApprovalNotificationBridge

职责：

- 新审批任务通知候选处理人
- 通过、驳回、取消通知发起人
- 顺签进入下一人时通知下一人

### 8.5 ApprovalCallbackRegistry

职责：

- 业务模块注册回调键
- 审批通过后调用业务副作用
- 支持在同一个 transaction 中执行强一致副作用

示例：

| 回调键 | 业务处理 |
| --- | --- |
| `document.publishApproved` | 文档状态改为 approved/published |
| `process.stepApproved` | 研发流程推进步骤 |
| `process.step1Approved` | 创建 Product(draft) |
| `process.step6Approved` | 创建 Recipe/RecipeLine |
| `process.step7Approved` | Product.status 改为 active，流程完成 |
| `capa.closeApproved` | CAPA 状态改为 closed |

---

## 9. API 设计

### 9.1 审批定义

```text
GET    /approval-definitions
POST   /approval-definitions
GET    /approval-definitions/:id
PATCH  /approval-definitions/:id
POST   /approval-definitions/:id/activate
POST   /approval-definitions/:id/deactivate
```

### 9.2 审批实例

```text
POST /approval-instances
GET  /approval-instances
GET  /approval-instances/:id
GET  /approval-instances/by-resource/:resourceType/:resourceId
```

创建审批实例 body：

```json
{
  "resourceType": "process_instance",
  "resourceId": "proc_123",
  "resourceStep": "step:4",
  "triggerKey": "step:4",
  "title": "产品开发评审会签 - 草莓蛋糕"
}
```

### 9.3 审批任务

```text
GET  /approval-tasks/my-pending
GET  /approval-tasks/history
POST /approval-tasks/:id/approve
POST /approval-tasks/:id/reject
POST /approval-tasks/:id/claim
POST /approval-tasks/:id/transfer
```

前端不再传“我是什么角色”。后端根据当前用户、任务 assignment、角色、部门、权限判断是否能处理。

---

## 10. 研发流程接入方式

研发流程不再直接创建 `ProcessStepApproval`。

### 10.1 提交步骤

```text
POST /process/instances/:id/steps
```

行为：

1. 保存 `ProcessStepData` 为 `SUBMITTED`
2. 如果该步骤需要审批，调用 `ApprovalEngineService.startApproval`
3. 审批引擎按模板创建 `ApprovalInstance + ApprovalTask`
4. 审批任务进入 `TodoTask` 和通知
5. 流程实例停留在当前步骤，等待审批完成

### 10.2 审批通过

审批引擎判断当前步骤审批完成后，调用研发模块回调。

研发模块负责：

| 步骤 | 回调副作用 |
| --- | --- |
| Step1 | 创建 `Product(draft)`，写 `ProcessInstance.productId/productName`，步骤 APPROVED，推进 Step2 |
| Step2 | 步骤 APPROVED，推进 Step3 |
| Step3 | 试验结论通过时自动 APPROVED，推进 Step4 |
| Step4 | 五部门会签全部通过，步骤 APPROVED，推进 Step5 |
| Step5 | 同步营养成分到 Product，步骤 APPROVED，推进 Step6 |
| Step6 | 创建或更新 Recipe/RecipeLine，步骤 APPROVED，推进 Step7 |
| Step7 | 激活 Product，流程 COMPLETED |

这些副作用必须和审批实例完成动作在同一个 transaction 中执行，避免审批已通过但业务状态没更新。

### 10.3 前端展示

`DeptSignoffPanel` 改为通用 `ApprovalTaskPanel`：

- 读取当前资源和步骤的 `ApprovalInstance`
- 展示任务：部门、角色、候选范围、状态、实际签署人、意见、时间
- 当前用户可处理的任务显示“同意/驳回”
- 不从客户端提交角色身份，只提交 action/comment

---

## 11. 文档审批迁移方式

旧文档审批从 `Approval` 迁到统一审批底座。

### 11.1 一级、二级、三级文件

按文件级别配置审批定义：

| 文件级别 | triggerKey | 审批规则 |
| --- | --- | --- |
| 一级文件 | document.publish.level1 | 起草部门负责人 → 管理者代表/总经理 |
| 二级文件 | document.publish.level2 | 部门负责人 → 品质负责人 |
| 三级文件 | document.publish.level3 | 部门负责人或授权审批人 |

具体规则以现有业务文件和系统角色为准，落入 `ApprovalDefinition`，不写死在 `ApprovalService`。

### 11.2 旧 API 兼容

保留现有 `/approvals/*` 路由一段时间，但内部改为读取统一审批实例和任务。

旧接口兼容策略：

- `/approvals/pending` 返回 `ApprovalTask`
- `/approvals/detail/:id` 支持旧 `Approval.id` 和新 `ApprovalTask.id`
- `/approvals/history` 从 `ApprovalAction` 聚合

---

## 12. 我的待办与通知

审批底座创建任务时必须同步：

1. `ApprovalTask`
2. `TodoTask`
3. `Notification`

`TodoType` 建议新增：

```prisma
approval_task
```

保留旧 `approval` 类型作为兼容。新审批统一使用 `approval_task`。

`TodoTask.relatedId = ApprovalTask.id`。`TodoService` 通过 `ApprovalTask -> ApprovalInstance` 计算跳转路径：

| resourceType | 跳转 |
| --- | --- |
| document | `/approvals/detail/:taskId` 或 `/documents/:resourceId` |
| process_instance | `/process/:resourceId` |
| record | `/records/:resourceId` |
| corrective_action | `/corrective-actions/:resourceId` |

---

## 13. 权限规则

审批权限只由后端判断。

允许处理任务的条件：

1. `assigneeUserId === currentUser.id`
2. 当前用户拥有 `assigneeRoleCode`
3. 当前用户属于 `assigneeDepartmentId`
4. 当前用户拥有 `assigneePermissionCode`
5. 当前用户是 admin 或拥有全局审批覆盖权限

客户端可以传 `taskId/action/comment`，不能传“我的角色”“我的部门”作为授权依据。

---

## 14. 审计和合规

每次审批动作写入 `ApprovalAction`。

必须记录：

- 操作人
- 操作时间
- 操作类型
- 审批意见
- 当时的任务 assignment 快照
- 当前资源定位
- IP/UA 可通过现有 `OperationLog` 扩展记录

已批准步骤和已发布文件默认不可回编。需要修改时必须发起新审批或变更流程。

---

## 15. 迁移计划

### Phase 1：审批底座落地

- 新增 `ApprovalDefinition/ApprovalInstance/ApprovalTask/ApprovalAction`
- 新增 `ApprovalEngineService`
- 新增 assignment resolver
- 接入 `TodoTask` 和 `Notification`
- 新增基础 API
- 单元测试覆盖 single、countersign_all、sequential、reject、permission resolver

### Phase 2：研发流程接入

- 研发流程停止创建 `ProcessStepApproval`
- 用统一审批定义表达 Step1/2/4/5/6/7 审批
- `DeptSignoffPanel` 替换为 `ApprovalTaskPanel`
- Step1/5/6/7 副作用改为审批回调事务执行
- E2E 覆盖完整 7 步流程

### Phase 3：文档审批接入

- 文档发布、修订、作废审批接入统一审批底座
- `/approvals` 页面改读统一审批任务
- 旧 `ApprovalService` 变为兼容层
- 保留旧数据只读或迁移到新模型

### Phase 4：动态记录和跨模块审批接入

- 记录表单提交审批接入统一审批底座
- CAPA、不合格、采购、仓储等模块按需迁移
- 审批定义管理页面上线

---

## 16. 测试要求

### 单元测试

- 审批定义选择 active version
- single 审批完成实例
- countersign_all 必须全部通过
- countersign_any 任一通过即完成并取消其他任务
- sequential 只激活当前顺序任务
- reject 取消剩余任务并通知发起人
- assignment resolver 不信任客户端角色
- TodoTask 创建和关闭
- Notification 创建

### 集成测试

- 研发 Step4 五部门会签全部通过后推进 Step5
- 研发 Step6 审批通过后 Recipe/RecipeLine 创建成功
- 研发 Step6 RecipeLine 创建失败时审批任务和流程状态回滚
- 文档发布审批通过后文档状态更新
- `/my-todos` 能看到审批任务并跳转

### E2E 测试

- 研发 7 步完整流程
- 文档发布审批流程
- 驳回后不可继续推进
- 非授权用户不能审批
- admin 覆盖审批可用且有审计记录

---

## 17. 风险与取舍

### 为什么不直接复用旧 `Approval` 表

旧 `Approval` 表适合“具体人审批具体文档”，不适合作为长期统一底座。研发会签、动态记录审批、CAPA 审批都需要 `resourceType/resourceId`、角色/部门/权限 assignment、claimable 任务和业务回调。直接把这些补进旧表会让旧文档审批和新业务审批互相污染。

### 为什么保留 `TodoTask`

`TodoTask` 已经是“我的待办”的入口。审批底座负责产生标准审批任务，`TodoTask` 负责跨模块聚合展示。两者职责不同，不需要合并。

### 最大风险

这是基础设施重构，范围比修研发会签大。必须分阶段落地，第一阶段只做底座和研发接入，不同时重写所有业务模块。

---

## 18. 成功标准

1. 新增审批场景不再新建独立审批表。
2. 新增审批场景只需要创建 `ApprovalDefinition` 和业务回调。
3. 所有审批待办进入 `/my-todos`。
4. 所有审批动作进入统一审批历史。
5. 研发流程不再依赖 `ProcessStepApproval`。
6. 文档审批可以通过兼容层或迁移读取统一审批底座。
7. 客户端不能伪造审批角色或部门。
8. 审批通过后的业务副作用具备事务一致性。
