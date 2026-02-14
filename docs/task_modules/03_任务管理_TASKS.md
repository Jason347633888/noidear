# 任务管理（四级文件填写任务） - Task 分解

> **来源**: docs/design/mvp/03_任务管理.md  
> **总工作量**: 240h  
> **优先级**: P0（MVP 核心功能）  
> **依赖**: 模板管理模块（TASK-021）、审批流程模块（待拆分）

---

## Task 统计

| 类型 | 数量 | 工作量 |
|------|------|--------|
| 数据模型 | 2 | 16h |
| 后端 API | 6 | 96h |
| 前端 UI | 5 | 80h |
| 测试 | 4 | 48h |
| **总计** | **17** | **240h** |

---

## TASK-037: 创建任务数据模型

**类型**: 数据模型

**工作量**: 8h

**优先级**: P0（阻塞其他 Task）

**依赖**: 无

**描述**:
根据 03_任务管理.md 第 136-149 行设计，创建 tasks 表。

**验收标准**:
- [ ] Prisma Schema 编写完成（schema.prisma）
- [ ] tasks 表包含所有字段（id, template_id, department_id, deadline, status, creator_id, created_at, updated_at, deleted_at）
- [ ] 外键约束配置正确（template_id 引用 templates(id), department_id 引用 departments(id), creator_id 引用 users(id)）
- [ ] 索引配置正确（department_id, status, deadline）
- [ ] 数据库迁移文件生成
- [ ] 软删除字段配置正确（deleted_at DateTime?）

**技术要点**:
- status 字段使用枚举类型（pending, completed, cancelled）
- deadline 字段使用 DateTime 类型，必填

**相关文件**:
- server/src/prisma/schema.prisma
- server/prisma/migrations/xxx_add_tasks/

**后续 Task**: TASK-039（任务 CRUD API 依赖此表）

---

## TASK-038: 创建任务记录数据模型

**类型**: 数据模型

**工作量**: 8h

**优先级**: P0（阻塞其他 Task）

**依赖**: TASK-037

**描述**:
根据 03_任务管理.md 第 152-169 行设计，创建 task_records 表。

**验收标准**:
- [ ] Prisma Schema 编写完成（schema.prisma）
- [ ] task_records 表包含所有字段（id, task_id, template_id, data_json, status, submitter_id, submitted_at, approver_id, approved_at, created_at, updated_at, deleted_at）
- [ ] data_json 字段使用 Json 类型（存储填写数据）
- [ ] 外键约束配置正确（task_id 引用 tasks(id), template_id 引用 templates(id), submitter_id 引用 users(id), approver_id 引用 users(id)）
- [ ] 唯一索引配置正确（@@unique([task_id])，每个任务只能有一条提交记录）
- [ ] 数据库迁移文件生成

**技术要点**:
- status 字段使用枚举类型（pending, submitted, approved, rejected）
- submitter_id 字段记录第一人提交后的提交人（锁定机制）

**相关文件**:
- server/src/prisma/schema.prisma
- server/prisma/migrations/xxx_add_task_records/

**后续 Task**: TASK-044（任务提交 API 依赖此表）

---

## TASK-039: 实现任务 CRUD API

**类型**: 后端 API

**工作量**: 16h

**优先级**: P0

**依赖**: TASK-037

**描述**:
实现任务的创建、读取、更新 API。

**API 端点**:
- POST /api/v1/tasks - 创建任务（分发）
- GET /api/v1/tasks - 查询任务列表（我的任务）
- GET /api/v1/tasks/:id - 查询任务详情
- PUT /api/v1/tasks/:id - 更新任务

**验收标准**:
- [ ] 所有端点实现完成
- [ ] 请求/响应格式符合设计文档（03_任务管理.md 第 200-231 行）
- [ ] 创建任务时校验模板是否存在且未停用（BR-005）
- [ ] 创建任务时发送站内消息通知部门内所有人
- [ ] 查询任务列表支持筛选（全部/待完成/已完成）
- [ ] 权限校验（@UseGuards(JwtAuthGuard)）
- [ ] 异常处理完整（try-catch）
- [ ] 单元测试覆盖率 ≥ 80%（核心业务逻辑必须 100%，边缘逻辑可低于 80%）
- [ ] API 文档（Swagger）生成

**业务规则校验**:
- BR-009: 任务必须指定执行人，否则无法分发
- BR-005: 模板停用后，不可再新建数据

**相关文件**:
- server/src/modules/task/task.controller.ts
- server/src/modules/task/task.service.ts
- server/src/modules/task/dto/*.dto.ts
- server/test/task.e2e-spec.ts

**后续 Task**: TASK-047（前端任务列表页面依赖此 API）

---

## TASK-040: 实现任务取消 API

**类型**: 后端 API

**工作量**: 8h

**优先级**: P1

**依赖**: TASK-039

**描述**:
实现任务取消 API，允许发起人取消任务。

**API 端点**:
- POST /api/v1/tasks/:id/cancel

**业务逻辑**:
1. 校验权限（只有发起人可取消）
2. 校验状态（只有 pending 状态可取消）
3. 更新任务状态为 cancelled
4. 发送站内消息通知部门内所有人

**验收标准**:
- [ ] 权限校验正确（只有发起人可取消）
- [ ] 状态校验正确（只有 pending 状态可取消）
- [ ] 取消后发送站内消息通知
- [ ] 异常处理（任务不存在、无权限、状态错误）
- [ ] 单元测试覆盖率 ≥ 80%（核心业务逻辑必须 100%，边缘逻辑可低于 80%）
- [ ] API 文档（Swagger）生成

**相关文件**:
- server/src/modules/task/task.controller.ts
- server/src/modules/task/task.service.ts
- server/test/task.e2e-spec.ts

**后续 Task**: TASK-048（前端取消按钮依赖此 API）

---

## TASK-041: 实现任务暂存 API

**类型**: 后端 API

**工作量**: 16h

**优先级**: P1

**依赖**: TASK-038

**描述**:
实现任务暂存 API，允许部门成员保存草稿数据。

**API 端点**:
- POST /api/v1/tasks/:id/draft

**业务逻辑**:
1. 校验权限（部门内成员可暂存）
2. 校验状态（只有 pending 状态可暂存）
3. 保存数据到 task_records 表（status: pending）
4. 不触发审批流程

**验收标准**:
- [ ] 权限校验正确（部门内成员可暂存）
- [ ] 状态校验正确（只有 pending 状态可暂存）
- [ ] 数据保存到 task_records 表（status: pending）
- [ ] 不触发审批流程
- [ ] 异常处理（任务不存在、无权限、状态错误）
- [ ] 单元测试覆盖率 ≥ 80%（核心业务逻辑必须 100%，边缘逻辑可低于 80%）
- [ ] API 文档（Swagger）生成

**相关文件**:
- server/src/modules/task/task.controller.ts
- server/src/modules/task/task.service.ts
- server/test/task.e2e-spec.ts

**后续 Task**: TASK-049（前端暂存按钮依赖此 API）

---

## TASK-042: 实现任务提交 API

**类型**: 后端 API

**工作量**: 24h

**优先级**: P0

**依赖**: TASK-038

**描述**:
实现任务提交 API，锁定任务并触发审批流程。

**API 端点**:
- POST /api/v1/tasks/:id/submit

**业务逻辑**:
1. 校验权限（部门内成员可提交）
2. 校验状态（只有 pending 状态可提交）
3. 校验字段验证（从模板读取验证规则）:
   - 读取任务关联的模板（task.template_id → templates 表）
   - 解析模板的 fields_json 配置
   - 遍历每个字段，检查用户提交的 data_json 是否符合验证规则：
     * 必填字段：检查字段是否存在且非空
     * 数值字段：检查 min/max 范围
     * 文本字段：检查长度限制（minLength/maxLength）
     * 正则验证：检查 pattern 正则匹配
   - 验证失败时返回详细错误信息（字段名 + 错误原因）
4. 保存数据到 task_records 表（status: submitted, submitter_id）
5. 锁定任务（第一人提交后其他人不可再提交）
6. 触发审批流程（调用审批模块 API）
7. 发送站内消息通知审批人

**验收标准**:
- [ ] 权限校验正确（部门内成员可提交）
- [ ] 状态校验正确（只有 pending 状态可提交）
- [ ] 字段验证逻辑正确（必填、最小值、最大值、正则）
- [ ] 锁定机制正确（第一人提交后其他人不可再提交）
- [ ] 自动触发审批流程（调用审批模块 API）
- [ ] 发送站内消息通知审批人
- [ ] 异常处理（任务不存在、无权限、状态错误、验证失败）
- [ ] 单元测试覆盖率 ≥ 80%（核心业务逻辑必须 100%，边缘逻辑可低于 80%）
- [ ] API 文档（Swagger）生成

**业务规则**:
- BR-004: 四级文件（记录）填写后提交审批，审批通过后归档

**相关文件**:
- server/src/modules/task/task.controller.ts
- server/src/modules/task/task.service.ts
- server/test/task.e2e-spec.ts

**后续 Task**: TASK-049（前端提交按钮依赖此 API）

---

## TASK-043: 实现任务逾期检查定时任务

**类型**: 后端 API

**工作量**: 16h

**优先级**: P1

**依赖**: TASK-039

**描述**:
实现定时任务，检查逾期任务并发送站内消息提醒。

**定时规则**:
- 每天 00:00 执行
- 检查 deadline < 当前时间 的任务
- 发送站内消息通知部门内所有人

**验收标准**:
- [ ] 定时任务配置正确（使用 @nestjs/schedule）
- [ ] 逾期任务查询逻辑正确
- [ ] 发送站内消息通知
- [ ] 异常处理（查询失败、通知失败）
  - 定时任务执行失败时记录日志
  - 连续失败 3 次时发送告警（可选，需配置告警邮箱）
- [ ] 单元测试覆盖率 ≥ 80%（核心业务逻辑必须 100%，边缘逻辑可低于 80%）

**技术要点**:
- 使用 @nestjs/schedule 实现定时任务
- Cron 表达式：`0 0 * * *`（每天 00:00）

**相关文件**:
- server/src/modules/task/task.cron.ts
- server/test/task.cron.spec.ts

**后续 Task**: 无

---

## TASK-044: 实现任务列表页面（前端）

**类型**: 前端 UI

**工作量**: 16h

**优先级**: P0

**依赖**: TASK-039

**描述**:
实现我的任务列表页面，支持 Tabs 切换、逾期标记。

**页面路由**: `/my-tasks`

**功能要求**:
- 任务列表展示（表格）
- Tabs 切换（全部/待完成/已完成）
- 逾期标记（红色）
- 操作按钮（填写、查看、取消）

**验收标准**:
- [ ] 页面布局符合设计稿（03_任务管理.md 第 278-289 行）
- [ ] 任务列表正确展示（模板名称、执行部门、截止时间、状态）
- [ ] Tabs 切换功能正常（全部/待完成/已完成）
- [ ] 逾期标记正确（红色标记，黄色警告）
- [ ] 操作按钮根据状态动态显示
- [ ] 权限校验（只显示部门内任务）
- [ ] 异常处理（加载失败、网络错误）
- [ ] 响应式布局（支持 1920x1080 分辨率）

**主要组件**:
- TaskList.vue - 任务列表组件

**相关文件**:
- client/src/views/task/MyTasks.vue

**后续 Task**: TASK-049（任务填写页面）

---

## TASK-045: 实现任务分发页面（前端）

**类型**: 前端 UI

**工作量**: 16h

**优先级**: P0

**依赖**: TASK-039

**描述**:
实现任务分发页面，允许管理员/Leader 分发任务。

**页面路由**: `/tasks/create`

**功能要求**:
- 选择模板（下拉）
- 选择执行部门（下拉）
- 设置截止日期（日期选择器）
- 分发任务按钮

**验收标准**:
- [ ] 页面布局符合设计稿
- [ ] 模板下拉列表正确（只显示启用状态的模板）
- [ ] 部门下拉列表正确
- [ ] 截止日期选择器正确（不能选择过去时间）
- [ ] 分发任务功能正常（调用 TASK-039 API）
- [ ] 表单验证（模板、部门、截止日期必填）
- [ ] 权限校验（只有管理员/Leader 可分发）
- [ ] 异常处理（分发失败、网络错误）
- [ ] 响应式布局

**主要组件**:
- TaskCreate.vue - 任务分发组件

**相关文件**:
- client/src/views/task/TaskCreate.vue

**后续 Task**: 无

---

## TASK-046: 实现任务填写页面（前端）

**类型**: 前端 UI

**工作量**: 24h

**优先级**: P0

**依赖**: TASK-041, TASK-042, TASK-030（动态表单渲染组件）

**描述**:
实现任务填写页面，支持动态表单填写、暂存、提交。

**页面路由**: `/tasks/:id/fill`

**功能要求**:
- 任务信息展示（执行部门、截止时间、分发人）
- 动态表单填写（调用 TASK-030 动态表单组件）
- 暂存按钮（保存草稿）
- 提交审批按钮

**验收标准**:
- [ ] 页面布局符合设计稿（03_任务管理.md 第 293-314 行）
- [ ] 任务信息正确展示
- [ ] 动态表单正确渲染（调用 TASK-030 动态表单组件）
- [ ] 暂存功能正常（调用 TASK-041 API）
- [ ] 提交功能正常（调用 TASK-042 API）
- [ ] 字段验证正确（必填、最小值、最大值、正则）
- [ ] 锁定机制正确（第一人提交后其他人只能查看）
- [ ] 权限校验（只有部门内成员可填写）
- [ ] 异常处理（暂存失败、提交失败、网络错误）
- [ ] 响应式布局

**主要组件**:
- TaskForm.vue - 任务填写组件

**相关文件**:
- client/src/views/task/TaskForm.vue

**后续 Task**: 无

---

## TASK-047: 实现任务详情页面（前端）

**类型**: 前端 UI

**工作量**: 16h

**优先级**: P1

**依赖**: TASK-039

**描述**:
实现任务详情页面，支持查看任务信息和填写数据。

**页面路由**: `/tasks/:id`

**功能要求**:
- 任务信息展示（模板名称、执行部门、截止时间、分发人、状态）
- 填写数据展示（只读）
- 操作按钮（编辑、取消、导出）

**验收标准**:
- [ ] 页面布局符合设计稿
- [ ] 任务信息正确展示
- [ ] 填写数据正确展示（只读）
- [ ] 操作按钮根据状态动态显示
- [ ] 权限校验（只有部门内成员可查看）
- [ ] 异常处理（加载失败、网络错误）
- [ ] 响应式布局

**主要组件**:
- TaskDetail.vue - 任务详情组件

**相关文件**:
- client/src/views/task/TaskDetail.vue

**后续 Task**: 无

---

## TASK-048: 实现任务取消按钮（前端）

**类型**: 前端 UI

**工作量**: 8h

**优先级**: P1

**依赖**: TASK-040

**描述**:
实现任务取消按钮，允许发起人取消任务。

**功能要求**:
- 取消按钮
- 确认对话框
- 取消成功后刷新列表

**验收标准**:
- [ ] 取消按钮正确显示（只有发起人可见，且任务状态为 pending）
- [ ] 点击后弹出确认对话框
- [ ] 调用 TASK-040 API 取消任务
- [ ] 取消成功后提示信息
- [ ] 取消成功后刷新列表
- [ ] 异常处理（取消失败、网络错误）
- [ ] 权限校验（无权限时禁用按钮）

**相关文件**:
- client/src/views/task/MyTasks.vue

**后续 Task**: 无

---

## TASK-049: 编写任务管理单元测试（后端）

**类型**: 测试

**工作量**: 16h

**优先级**: P1

**依赖**: TASK-039, TASK-040, TASK-041, TASK-042

**描述**:
编写任务管理模块的单元测试，覆盖核心业务逻辑。

**测试范围**:
- 任务 CRUD 逻辑
- 任务取消逻辑
- 任务暂存逻辑
- 任务提交逻辑
- 任务逾期检查逻辑

**验收标准**:
- [ ] 单元测试覆盖率 ≥ 80%（核心业务逻辑必须 100%，边缘逻辑可低于 80%）
- [ ] 所有核心业务规则有对应测试用例
- [ ] Mock 外部依赖（Prisma、消息服务）
- [ ] 测试用例清晰、可读
- [ ] 所有测试通过

**相关文件**:
- server/test/task.service.spec.ts

**后续 Task**: 无

---

## TASK-050: 编写任务管理集成测试（后端）

**类型**: 测试

**工作量**: 16h

**优先级**: P1

**依赖**: TASK-039, TASK-040, TASK-041, TASK-042

**描述**:
编写任务管理模块的集成测试，验证 API 端点。

**测试范围**:
- POST /api/v1/tasks
- GET /api/v1/tasks
- GET /api/v1/tasks/:id
- PUT /api/v1/tasks/:id
- POST /api/v1/tasks/:id/cancel
- POST /api/v1/tasks/:id/draft
- POST /api/v1/tasks/:id/submit

**验收标准**:
- [ ] 所有 API 端点有对应测试用例
- [ ] 测试覆盖正常流程和异常流程
- [ ] 测试覆盖权限校验
- [ ] 测试覆盖业务规则校验
- [ ] 所有测试通过

**相关文件**:
- server/test/task.e2e-spec.ts

**后续 Task**: 无

---

## TASK-051: 编写前端组件单元测试

**类型**: 测试

**工作量**: 8h

**优先级**: P2

**依赖**: TASK-044, TASK-045, TASK-046, TASK-047

**描述**:
编写前端组件的单元测试，验证组件逻辑。

**测试范围**:
- TaskList.vue
- TaskCreate.vue
- TaskForm.vue
- TaskDetail.vue

**验收标准**:
- [ ] 所有核心组件有对应测试用例
- [ ] 测试覆盖组件交互逻辑
- [ ] 测试覆盖数据渲染逻辑
- [ ] Mock API 请求
- [ ] 所有测试通过

**相关文件**:
- client/src/views/task/__tests__/TaskList.spec.ts
- client/src/views/task/__tests__/TaskCreate.spec.ts
- client/src/views/task/__tests__/TaskForm.spec.ts
- client/src/views/task/__tests__/TaskDetail.spec.ts

**后续 Task**: 无

---

## TASK-052: 编写 E2E 测试（Playwright）

**类型**: 测试

**工作量**: 8h

**优先级**: P2

**依赖**: TASK-044, TASK-045, TASK-046

**描述**:
编写任务管理模块的 E2E 测试，验证关键用户流程。

**测试场景**:
1. 管理员分发任务 → 部门成员收到通知 → 填写任务 → 提交审批
2. 部门成员暂存任务 → 查看草稿 → 继续填写 → 提交审批
3. 第一人提交任务 → 其他人无法再填写（锁定机制）
4. 发起人取消任务 → 部门成员无法再填写
5. 任务逾期 → 红色标记 → 发送站内消息提醒

**验收标准**:
- [ ] 所有关键用户流程有对应测试用例
- [ ] 测试覆盖正常流程和异常流程
- [ ] 所有测试通过

**相关文件**:
- client/e2e/task.spec.ts

**后续 Task**: 无

---

**本文档完成 ✅**
