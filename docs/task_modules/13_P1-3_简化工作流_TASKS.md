# P1-3: 工作流引擎完整方案 - TASKS.md

> **来源**: docs/design/technical_debt/P1-3_简化工作流.md
> **模块分类**: Technical Debt（P1 高优先级）
> **实现状态**: ⏳ 未实现（完整技术方案已完成）
> **优先级**: ⭐⭐⭐ 高（Phase 11 内审管理、复杂审批流程的基础）
> **依赖**: 无

---

## 任务统计

| 统计项 | 数量 |
|--------|------|
| **总任务数** | 22 |
| **数据模型任务** | 3 |
| **后端 API 任务** | 8 |
| **定时任务** | 1 |
| **前端 UI 任务** | 7 |
| **测试任务** | 3 |
| **预计总工时** | 320h |

---

## 任务列表

### 一、数据模型（3 个任务，48h）

#### TASK-253: WorkflowTemplate 表设计（16h）

**任务描述**:
- 创建 WorkflowTemplate 表（工作流模板）
- 定义模板属性：code（模板编码）、name（模板名称）、departmentId（所属部门）、category（类别）、steps（步骤配置 JSON）
- 模板编码格式：`{category}_{department}_{seq}`（如 `document_production_001`）
- 模板类别：document、task、record
- 步骤配置 JSON：包含步骤名称、审批人角色、超时时间、并行模式
- 添加索引：code、category、departmentId

**验收标准**:
- [ ] Prisma Schema 定义完成
- [ ] 模板编码唯一约束（@unique）
- [ ] 索引创建成功（code、category、departmentId）
- [ ] steps 字段使用 JSON 存储步骤配置
- [ ] 支持模板版本（version）
- [ ] 支持模板停用（status: active | inactive）

**依赖**: 无

**步骤配置示例**:
```json
[
  {
    "index": 0,
    "name": "部门主管审批",
    "assigneeRole": "manager",
    "parallelMode": false,
    "timeoutHours": 24
  },
  {
    "index": 1,
    "name": "质量部会签",
    "assigneeRole": "quality_manager",
    "parallelMode": true,
    "parallelAssignees": ["user_001", "user_002"],
    "timeoutHours": 48
  }
]
```

**相关文件**:
- `server/src/prisma/schema.prisma`
- `server/src/prisma/seed.ts`

---

#### TASK-254: WorkflowInstance 表设计（16h）

**任务描述**:
- 创建 WorkflowInstance 表（工作流实例）
- 定义实例属性：templateId、resourceType、resourceId、resourceTitle、initiatorId、status、currentStep
- 工作流状态：pending | in_progress | completed | rejected | cancelled | timeout
- 资源类型：document、task、record
- 添加索引：templateId、resourceType、resourceId、status、initiatorId

**验收标准**:
- [ ] Prisma Schema 定义完成
- [ ] 外键约束：templateId → WorkflowTemplate（onDelete: Restrict）
- [ ] 索引创建成功
- [ ] 支持当前步骤记录（currentStep）
- [ ] 支持取消原因（cancelReason）

**依赖**: TASK-253

**技术要点**:
- resourceType + resourceId 确定关联资源
- initiatorId 记录工作流发起人

**相关文件**:
- `server/src/prisma/schema.prisma`

---

#### TASK-255: WorkflowTask 表设计（16h）

**任务描述**:
- 创建 WorkflowTask 表（工作流任务）
- 定义任务属性：instanceId、stepIndex、stepName、assigneeId、status、dueAt、completedAt、escalatedTo
- 任务状态：pending | approved | rejected | skipped | timeout
- 支持审批意见（comment）
- 添加索引：instanceId、assigneeId、status、dueAt

**验收标准**:
- [ ] Prisma Schema 定义完成
- [ ] 外键约束：instanceId → WorkflowInstance（onDelete: Cascade）
- [ ] 索引创建成功
- [ ] 支持超时升级（escalatedTo）
- [ ] 支持审批意见（comment）

**依赖**: TASK-254

**技术要点**:
- 串行审批：前一步完成后创建下一步任务
- 并行审批：同时创建多个任务
- 超时升级：escalatedTo 记录升级给谁

**相关文件**:
- `server/src/prisma/schema.prisma`

---

### 二、后端 API（8 个任务，160h）

#### TASK-256: 工作流模板 CRUD API（20h）

**任务描述**:
- 实现工作流模板创建、查询、更新、停用 API
- 实现模板编码自动生成
- 实现模板版本管理

**验收标准**:
- [ ] POST /api/v1/workflow-templates - 创建工作流模板
- [ ] GET /api/v1/workflow-templates - 分页查询工作流模板
- [ ] GET /api/v1/workflow-templates/:id - 查询工作流模板详情
- [ ] PUT /api/v1/workflow-templates/:id - 更新工作流模板
- [ ] PUT /api/v1/workflow-templates/:id/disable - 停用工作流模板
- [ ] 模板编码自动生成（格式：{category}_{department}_{seq}）
- [ ] 修改模板时创建新版本

**依赖**: TASK-253

**技术要点**:
- 模板修改时创建新版本，旧版本仍可查看但不可使用
- 停用模板后，已启动的工作流实例仍可继续执行

**相关文件**:
- `server/src/modules/workflow/template.controller.ts`
- `server/src/modules/workflow/template.service.ts`
- `server/src/modules/workflow/dto/template.dto.ts`

---

#### TASK-257: 工作流启动 API（24h）

**任务描述**:
- 实现工作流启动 API
- 实现启动条件检查（资源状态）
- 实现自动创建第一步任务

**验收标准**:
- [ ] POST /api/v1/workflow-instances - 启动工作流
- [ ] 启动前检查资源是否满足条件（如文档状态为 draft）
- [ ] 启动时自动创建第一步任务
- [ ] 第一步任务状态为 pending
- [ ] 启动时记录发起人和发起时间

**依赖**: TASK-254

**技术要点**:
- 使用 Prisma Transaction 保证原子性
- 启动时自动分配第一步审批人

**相关文件**:
- `server/src/modules/workflow/instance.controller.ts`
- `server/src/modules/workflow/instance.service.ts`

---

#### TASK-258: 串行审批逻辑（24h）

**任务描述**:
- 实现串行审批流程
- 实现审批通过后自动创建下一步任务
- 实现审批驳回后工作流状态变更

**验收标准**:
- [ ] 串行审批按步骤顺序执行
- [ ] 前一步未完成时后一步不可执行
- [ ] 审批通过后自动创建下一步任务并通知审批人
- [ ] 审批驳回后工作流状态变为 rejected
- [ ] 所有步骤完成后工作流状态变为 completed

**依赖**: TASK-255

**技术要点**:
- 使用 Prisma Transaction 保证状态一致性
- 审批通过后自动触发下一步任务创建

**相关文件**:
- `server/src/modules/workflow/task.service.ts`

---

#### TASK-259: 并行审批逻辑（会签）（28h）

**任务描述**:
- 实现并行审批流程
- 实现全部通过才进入下一步
- 实现一人拒绝全部失效

**验收标准**:
- [ ] 并行审批的所有任务同时创建
- [ ] 同时通知所有审批人
- [ ] 所有并行任务都通过后，才进入下一步
- [ ] 任一并行任务拒绝，整个工作流状态变为 rejected
- [ ] 任一并行任务超时，其他并行任务不能继续
- [ ] 一人拒绝后，其他并行任务自动跳过

**依赖**: TASK-255

**技术要点**:
- 并行任务检查逻辑：所有并行任务状态 = approved
- 一人拒绝时批量更新其他并行任务状态为 skipped

**相关文件**:
- `server/src/modules/workflow/task.service.ts`

---

#### TASK-260: 审批超时升级逻辑（20h）

**任务描述**:
- 实现审批超时检查定时任务
- 实现自动升级给上级审批人
- 实现升级通知

**验收标准**:
- [ ] 定时任务：每 10 分钟检查超时任务
- [ ] 超时后自动升级给上级审批人（escalatedTo）
- [ ] 升级后通知原审批人和上级审批人
- [ ] 原审批人仍可完成审批
- [ ] 升级记录在任务中

**依赖**: TASK-255

**技术要点**:
- 使用 @nestjs/schedule 实现定时任务
- 超时检查逻辑：dueAt < NOW() AND status = pending

**相关文件**:
- `server/src/modules/workflow/task.scheduler.ts`

---

#### TASK-261: 工作流取消 API（16h）

**任务描述**:
- 实现工作流取消 API
- 实现取消权限检查（仅发起人或管理员可取消）
- 实现取消通知

**验收标准**:
- [ ] POST /api/v1/workflow-instances/:id/cancel - 取消工作流
- [ ] 权限检查：仅工作流发起人或管理员可取消
- [ ] 仅 pending 或 in_progress 状态可取消
- [ ] 必须填写取消原因
- [ ] 取消后通知所有相关审批人

**依赖**: TASK-254

**相关文件**:
- `server/src/modules/workflow/instance.controller.ts`
- `server/src/modules/workflow/instance.service.ts`

---

#### TASK-262: 工作流任务审批 API（20h）

**任务描述**:
- 实现工作流任务审批 API
- 实现审批权限检查
- 实现审批意见必填

**验收标准**:
- [ ] POST /api/v1/workflow-tasks/:taskId/approve - 审批通过
- [ ] POST /api/v1/workflow-tasks/:taskId/reject - 审批驳回
- [ ] 权限检查：仅任务指派人可审批
- [ ] 审批意见必填
- [ ] 审批后自动更新工作流状态
- [ ] 审批后发送通知

**依赖**: TASK-255

**技术要点**:
- 审批后触发串行/并行审批逻辑
- 使用 Prisma Transaction 保证状态一致性

**相关文件**:
- `server/src/modules/workflow/task.controller.ts`
- `server/src/modules/workflow/task.service.ts`

---

#### TASK-263: 我的待审批任务 API（8h）

**任务描述**:
- 实现我的待审批任务查询 API
- 实现任务筛选（按状态、资源类型）

**验收标准**:
- [ ] GET /api/v1/workflow-tasks/my-tasks?status=pending - 查询我的待审批任务
- [ ] 支持按状态筛选（pending、all）
- [ ] 支持按资源类型筛选（document、task、record）
- [ ] 返回任务列表包含：资源标题、步骤名称、发起人、截止时间

**依赖**: TASK-255

**相关文件**:
- `server/src/modules/workflow/task.controller.ts`
- `server/src/modules/workflow/task.service.ts`

---

### 三、定时任务（1 个任务，16h）

#### TASK-264: 工作流定时任务调度（16h）

**任务描述**:
- 实现审批超时检查定时任务
- 实现超时升级逻辑
- 实现超时通知

**验收标准**:
- [ ] 定时任务：每 10 分钟检查超时任务
- [ ] 超时任务自动升级给上级审批人
- [ ] 升级后发送通知
- [ ] 定时任务日志记录正确

**依赖**: TASK-260

**技术要点**:
- 使用 @nestjs/schedule 实现定时任务
- 定时任务执行时间：每 10 分钟

**相关文件**:
- `server/src/modules/workflow/task.scheduler.ts`

---

### 四、前端 UI（7 个任务，80h）

#### TASK-265: 工作流模板编辑器（简化版）（16h）

**任务描述**:
- 实现工作流模板编辑器页面（路由：/workflow-templates/editor）
- 实现基本信息配置
- 实现步骤配置（添加、编辑、删除）

**验收标准**:
- [ ] 基本信息配置：模板名称、所属部门、类别
- [ ] 步骤配置：步骤名称、审批人角色、超时时间、并行模式
- [ ] 支持添加步骤
- [ ] 支持编辑步骤
- [ ] 支持删除步骤
- [ ] 支持步骤排序
- [ ] 表单验证正确

**依赖**: TASK-256

**相关文件**:
- `client/src/views/workflow/TemplateEditor.vue`
- `client/src/api/workflow.ts`

---

#### TASK-266: 工作流模板列表页面（8h）

**任务描述**:
- 实现工作流模板列表页面（路由：/workflow-templates）
- 实现模板筛选
- 实现模板停用

**验收标准**:
- [ ] 模板列表显示：编码、名称、类别、部门、版本、状态
- [ ] 支持按类别/部门/状态筛选
- [ ] 停用模板时显示确认对话框
- [ ] 点击模板跳转到编辑器

**依赖**: TASK-256

**相关文件**:
- `client/src/views/workflow/TemplateList.vue`

---

#### TASK-267: 我的待办任务页面（12h）

**任务描述**:
- 实现我的待办任务页面（路由：/my-tasks）
- 实现任务筛选（按资源类型）
- 实现审批操作

**验收标准**:
- [ ] 待办任务列表显示：资源标题、步骤名称、发起人、截止时间、操作
- [ ] 支持按资源类型筛选（全部、文档、任务、记录）
- [ ] 点击审批按钮打开审批对话框
- [ ] 截止时间临近时高亮显示（如明天到期标红）

**依赖**: TASK-263

**相关文件**:
- `client/src/views/workflow/MyTasks.vue`

---

#### TASK-268: 审批对话框（16h）

**任务描述**:
- 实现审批对话框
- 实现审批流程可视化（步骤进度）
- 实现资源预览

**验收标准**:
- [ ] 对话框显示：审批流程进度、资源预览、审批意见输入
- [ ] 审批流程进度显示（使用 el-steps）
- [ ] 资源预览（如文档预览）
- [ ] 审批意见输入框（必填）
- [ ] 通过/拒绝按钮
- [ ] 审批成功后关闭对话框并刷新列表

**依赖**: TASK-262

**技术要点**:
- 使用 Element Plus Steps 组件显示审批进度
- 资源预览根据资源类型动态加载（文档 PDF 预览、任务详情等）

**相关文件**:
- `client/src/views/workflow/components/ApprovalDialog.vue`

---

#### TASK-269: 工作流实例列表页面（8h）

**任务描述**:
- 实现工作流实例列表页面（路由：/workflow-instances）
- 实现实例筛选
- 实现实例详情查看

**验收标准**:
- [ ] 工作流实例列表显示：模板名称、资源标题、发起人、状态、创建时间
- [ ] 支持按状态/资源类型筛选
- [ ] 点击实例跳转到详情页面
- [ ] 支持取消工作流（仅发起人或管理员）

**依赖**: TASK-257

**相关文件**:
- `client/src/views/workflow/InstanceList.vue`

---

#### TASK-270: 工作流实例详情页面（12h）

**任务描述**:
- 实现工作流实例详情页面（路由：/workflow-instances/:id）
- 实现审批历史显示
- 实现审批流程可视化

**验收标准**:
- [ ] 工作流基本信息显示：模板名称、资源标题、发起人、状态
- [ ] 审批流程可视化（步骤进度 + 当前步骤高亮）
- [ ] 审批历史列表：步骤名称、审批人、审批时间、审批意见、审批结果
- [ ] 支持取消工作流（仅发起人或管理员）

**依赖**: TASK-257

**技术要点**:
- 使用 Element Plus Timeline 组件显示审批历史

**相关文件**:
- `client/src/views/workflow/InstanceDetail.vue`

---

#### TASK-271: 工作流统计页面（8h）

**任务描述**:
- 实现工作流统计页面（路由：/workflow/stats）
- 实现工作流完成率统计
- 实现超时任务统计

**验收标准**:
- [ ] 统计概览卡片：总工作流数、进行中数、已完成数、已拒绝数
- [ ] 完成率趋势图表（按月）
- [ ] 超时任务排行（按审批人）
- [ ] 支持日期范围筛选

**依赖**: TASK-257

**技术要点**:
- 使用 ECharts 绘制图表

**相关文件**:
- `client/src/views/workflow/WorkflowStats.vue`

---

### 五、测试（3 个任务，16h）

#### TASK-272: 串行审批单元测试（8h）

**任务描述**:
- 测试串行审批流程逻辑
- 测试审批通过后自动创建下一步任务
- 测试审批驳回后工作流状态变更

**验收标准**:
- [ ] 串行审批流程测试通过
- [ ] 审批通过后自动创建下一步任务测试
- [ ] 审批驳回后工作流状态变更测试
- [ ] 所有步骤完成后工作流状态变为 completed 测试
- [ ] 单元测试覆盖率 > 85%

**依赖**: TASK-258

**相关文件**:
- `server/src/modules/workflow/task.service.spec.ts`

---

#### TASK-273: 并行审批集成测试（8h）

**任务描述**:
- 测试并行审批流程（会签）
- 测试全部通过才进入下一步
- 测试一人拒绝全部失效

**验收标准**:
- [ ] 并行审批流程测试通过
- [ ] 所有并行任务都通过后进入下一步测试
- [ ] 任一并行任务拒绝后工作流状态变为 rejected 测试
- [ ] 一人拒绝后其他并行任务自动跳过测试
- [ ] 集成测试覆盖率 > 80%

**依赖**: TASK-259

**相关文件**:
- `server/src/modules/workflow/task.service.spec.ts`

---

#### TASK-274: 工作流系统 E2E 测试（留空，暂不实施）

**任务描述**:
- （暂不实施，留待后续优化）

**验收标准**:
- [ ] （暂无）

**依赖**: TASK-265~271

---

## 实施说明

### 关键技术点

1. **工作流模板编码**:
   - 格式：`{category}_{department}_{seq}`
   - 示例：document_production_001

2. **串行审批**:
   - 按步骤顺序执行
   - 前一步完成后自动创建下一步任务
   - 审批驳回后工作流状态变为 rejected

3. **并行审批（会签）**:
   - 所有任务同时创建
   - 所有任务都通过后才进入下一步
   - 任一任务拒绝，整个工作流失效

4. **审批超时升级**:
   - 定时任务每 10 分钟检查超时任务
   - 超时后自动升级给上级审批人
   - 原审批人仍可完成审批

5. **工作流取消**:
   - 仅发起人或管理员可取消
   - 仅 pending 或 in_progress 状态可取消
   - 必须填写取消原因

### 依赖关系

```
TASK-253 (WorkflowTemplate 表) → TASK-254 (WorkflowInstance 表) → TASK-255 (WorkflowTask 表)
                                → TASK-256 (模板 CRUD API)

TASK-254 → TASK-257 (工作流启动 API)
        → TASK-261 (工作流取消 API)

TASK-255 → TASK-258 (串行审批逻辑)
        → TASK-259 (并行审批逻辑)
        → TASK-260 (超时升级逻辑) → TASK-264 (定时任务调度)
        → TASK-262 (任务审批 API)
        → TASK-263 (我的待审批任务 API)

TASK-256 ~ TASK-264 (后端 + 定时任务) → TASK-265 ~ TASK-271 (前端 UI) → TASK-272 ~ TASK-274 (测试)
```

### 实施顺序建议

1. **Phase 1 - 数据模型**（48h）: TASK-253 ~ TASK-255
2. **Phase 2 - 核心 API**（160h）: TASK-256 ~ TASK-263
3. **Phase 3 - 定时任务**（16h）: TASK-264
4. **Phase 4 - 前端界面**（80h）: TASK-265 ~ TASK-271
5. **Phase 5 - 测试验证**（16h）: TASK-272 ~ TASK-274

---

**文档版本**: 1.0
**最后更新**: 2026-02-14
**任务总数**: 22
**预计总工时**: 320h
