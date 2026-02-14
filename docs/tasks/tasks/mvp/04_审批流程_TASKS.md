# 审批流程（单级审批） - Task 分解

> **来源**: docs/design/mvp/04_审批流程.md  
> **总工作量**: 200h  
> **优先级**: P0（MVP 核心功能）  
> **依赖**: 文档管理模块（TASK-001）、任务管理模块（TASK-038）

---

## Task 统计

| 类型 | 数量 | 工作量 |
|------|------|--------|
| 数据模型 | 1 | 8h |
| 后端 API | 5 | 80h |
| 前端 UI | 4 | 64h |
| 测试 | 4 | 48h |
| **总计** | **14** | **200h** |

---

## TASK-053: 创建审批记录数据模型

**类型**: 数据模型

**工作量**: 8h

**优先级**: P0（阻塞其他 Task）

**依赖**: 无

**描述**:
根据 04_审批流程.md 第 170-182 行设计，创建 approvals 表。

**验收标准**:
- [ ] Prisma Schema 编写完成（schema.prisma）
- [ ] approvals 表包含所有字段（id, document_id, record_id, approver_id, status, comment, created_at）
- [ ] 外键约束配置正确（document_id 引用 documents(id), record_id 引用 task_records(id), approver_id 引用 users(id)）
- [ ] 检查约束配置正确（document_id 和 record_id 二选一，不能同时为空）
- [ ] 索引配置正确（document_id, record_id, approver_id, status）
- [ ] 数据库迁移文件生成

**技术要点**:
- status 字段使用枚举类型（approved, rejected）
- document_id 和 record_id 二选一，用于关联不同类型的资源

**相关文件**:
- server/src/prisma/schema.prisma
- server/prisma/migrations/xxx_add_approvals/

**后续 Task**: TASK-054（审批 API 依赖此表）

---

## TASK-054: 实现审批列表查询 API

**类型**: 后端 API

**工作量**: 16h

**优先级**: P0

**依赖**: TASK-053

**描述**:
实现待审批列表和审批历史查询 API。

**API 端点**:
- GET /api/v1/approvals/pending - 获取待审批列表
- GET /api/v1/approvals/history - 获取审批历史

**验收标准**:
- [ ] 待审批列表正确返回（只返回当前用户作为审批人的待审批项）
- [ ] 审批历史正确返回（只返回当前用户已审批的项）
- [ ] 支持分页查询
- [ ] 支持筛选（文档类型、状态）
- [ ] 返回完整的关联信息（文档/记录信息、提交人信息）
- [ ] 权限校验（@UseGuards(JwtAuthGuard)）
- [ ] Admin 可查看所有待审批项
- [ ] 异常处理
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] API 文档（Swagger）生成

**相关文件**:
- server/src/modules/approval/approval.controller.ts
- server/src/modules/approval/approval.service.ts
- server/test/approval.e2e-spec.ts

**后续 Task**: TASK-058（前端待审批列表页面依赖此 API）

---

## TASK-055: 实现文档审批 API

**类型**: 后端 API

**工作量**: 24h

**优先级**: P0

**依赖**: TASK-053

**描述**:
实现一/二/三级文档的审批 API，支持通过和驳回。

**API 端点**:
- POST /api/v1/approvals/:id/approve - 通过审批
- POST /api/v1/approvals/:id/reject - 驳回审批

**业务逻辑（通过）**:
1. 校验权限（是否为审批人或 Admin）
2. 校验状态（文档状态必须为 under_review）
3. 保存审批意见（可选）
4. 创建审批记录（status: approved）
5. 更新文档状态为 approved
6. 发送站内消息通知提交人

**业务逻辑（驳回）**:
1. 校验权限（是否为审批人或 Admin）
2. 校验状态（文档状态必须为 under_review）
3. 校验审批意见（必填）
4. 创建审批记录（status: rejected）
5. 更新文档状态为 draft
6. 发送站内消息通知提交人

**验收标准**:
- [ ] 通过审批逻辑正确
- [ ] 驳回审批逻辑正确（意见必填）
- [ ] 权限校验正确（审批人或 Admin）
- [ ] 状态校验正确（只能审批 under_review 状态）
- [ ] 发送站内消息通知
- [ ] 异常处理（无权限、状态错误、意见缺失）
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] API 文档（Swagger）生成

**业务规则**:
- BR-002: 一级/二级/三级文件创建后必须提交审批，不审批不可发布
- BR-006: 文件提交后不允许修改，只能查看或撤回

**相关文件**:
- server/src/modules/approval/approval.controller.ts
- server/src/modules/approval/approval.service.ts
- server/test/approval.e2e-spec.ts

**后续 Task**: TASK-059（前端审批按钮依赖此 API）

---

## TASK-056: 实现记录审批 API

**类型**: 后端 API

**工作量**: 24h

**优先级**: P0

**依赖**: TASK-053

**描述**:
实现四级文件记录的审批 API，支持通过和驳回。

**API 端点**:
- POST /api/v1/approvals/:id/approve - 通过审批
- POST /api/v1/approvals/:id/reject - 驳回审批

**业务逻辑（通过）**:
1. 校验权限（是否为审批人或 Admin）
2. 校验状态（记录状态必须为 submitted）
3. 保存审批意见（可选）
4. 创建审批记录（status: approved）
5. 更新记录状态为 approved
6. 更新任务状态为 completed
7. 发送站内消息通知提交人

**业务逻辑（驳回）**:
1. 校验权限（是否为审批人或 Admin）
2. 校验状态（记录状态必须为 submitted）
3. 校验审批意见（必填）
4. 创建审批记录（status: rejected）
5. 更新记录状态为 rejected
6. 更新任务状态为 pending（可重新填写）
7. 发送站内消息通知提交人

**验收标准**:
- [ ] 通过审批逻辑正确
- [ ] 驳回审批逻辑正确（意见必填）
- [ ] 权限校验正确（审批人或 Admin）
- [ ] 状态校验正确（只能审批 submitted 状态）
- [ ] 同步更新任务状态
- [ ] 发送站内消息通知
- [ ] 异常处理
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] API 文档（Swagger）生成

**业务规则**:
- BR-004: 四级文件（记录）填写后提交审批，审批通过后归档

**相关文件**:
- server/src/modules/approval/approval.controller.ts
- server/src/modules/approval/approval.service.ts
- server/test/approval.e2e-spec.ts

**后续 Task**: TASK-059（前端审批按钮依赖此 API）

---

## TASK-057: 实现会签和依次审批逻辑

**类型**: 后端 API

**工作量**: 16h

**优先级**: P1

**依赖**: TASK-055, TASK-056

**描述**:
实现会签（多人同时审批）和依次审批（串行审批）逻辑。

**会签逻辑**:
- 所有审批人同时收到通知
- 必须全部通过才能完成
- 任一拒绝则整个审批失败

**依次审批逻辑**:
- 审批人依次收到通知
- 前一人通过后下一人才能审批
- 后一人能看到前面人的审批意见

**验收标准**:
- [ ] 会签逻辑正确（全部通过才算通过）
- [ ] 依次审批逻辑正确（前一人通过后下一人才能审批）
- [ ] 审批意见可见性正确（依次审批时能看到前面人的意见）
- [ ] 通知逻辑正确（会签同时通知，依次审批依次通知）
- [ ] 异常处理
- [ ] 单元测试覆盖率 ≥ 80%

**相关文件**:
- server/src/modules/approval/approval.service.ts
- server/test/approval.service.spec.ts

**后续 Task**: 无

---

## TASK-058: 实现待审批列表页面（前端）

**类型**: 前端 UI

**工作量**: 16h

**优先级**: P0

**依赖**: TASK-054

**描述**:
实现待审批列表页面，支持筛选、分页。

**页面路由**: `/approvals/pending`

**功能要求**:
- 待审批列表展示（表格）
- 筛选（文档类型）
- 分页
- 操作按钮（审批、查看）

**验收标准**:
- [ ] 页面布局符合设计稿
- [ ] 待审批列表正确展示（文档/记录标题、提交人、提交时间）
- [ ] 筛选功能正常
- [ ] 分页功能正常
- [ ] 操作按钮正确显示
- [ ] 权限校验（只显示当前用户的待审批项）
- [ ] 异常处理
- [ ] 响应式布局

**主要组件**:
- PendingApprovals.vue - 待审批列表组件

**相关文件**:
- client/src/views/approval/PendingApprovals.vue

**后续 Task**: TASK-059（审批详情页面）

---

## TASK-059: 实现审批详情页面（前端）

**类型**: 前端 UI

**工作量**: 24h

**优先级**: P0

**依赖**: TASK-055, TASK-056

**描述**:
实现审批详情页面，支持预览文档/记录、填写审批意见、通过/驳回。

**页面路由**: `/approvals/:id`

**功能要求**:
- 文档/记录预览（PDF 预览或动态表单数据展示）
- 审批意见输入框
- 通过/驳回按钮
- 查看历史审批意见（依次审批时）

**验收标准**:
- [ ] 页面布局符合设计稿
- [ ] 文档预览正确（PDF 文件）
- [ ] 记录数据展示正确（动态表单数据）
- [ ] 审批意见输入框正确（驳回时必填）
- [ ] 通过按钮功能正常（调用 TASK-055/TASK-056 API）
- [ ] 驳回按钮功能正常（调用 TASK-055/TASK-056 API，意见必填）
- [ ] 历史审批意见展示正确（依次审批时）
- [ ] 权限校验（只有审批人或 Admin 可审批）
- [ ] 异常处理
- [ ] 响应式布局

**主要组件**:
- ApprovalDetail.vue - 审批详情组件

**相关文件**:
- client/src/views/approval/ApprovalDetail.vue

**后续 Task**: 无

---

## TASK-060: 实现审批历史页面（前端）

**类型**: 前端 UI

**工作量**: 16h

**优先级**: P1

**依赖**: TASK-054

**描述**:
实现审批历史页面，查看已审批的文档/记录。

**页面路由**: `/approvals/history`

**功能要求**:
- 审批历史列表展示（表格）
- 筛选（文档类型、审批结果）
- 分页
- 查看详情

**验收标准**:
- [ ] 页面布局符合设计稿
- [ ] 审批历史列表正确展示（文档/记录标题、审批结果、审批时间、审批意见）
- [ ] 筛选功能正常
- [ ] 分页功能正常
- [ ] 查看详情功能正常
- [ ] 权限校验（只显示当前用户的审批历史）
- [ ] 异常处理
- [ ] 响应式布局

**主要组件**:
- ApprovalHistory.vue - 审批历史组件

**相关文件**:
- client/src/views/approval/ApprovalHistory.vue

**后续 Task**: 无

---

## TASK-061: 实现审批按钮（前端）

**类型**: 前端 UI

**工作量**: 8h

**优先级**: P0

**依赖**: TASK-055, TASK-056

**描述**:
实现审批按钮组件，支持通过/驳回操作。

**功能要求**:
- 通过按钮（审批意见可选填）
- 驳回按钮（审批意见必填）
- 确认对话框
- 操作成功后刷新列表

**验收标准**:
- [ ] 通过按钮功能正常（审批意见可选填）
- [ ] 驳回按钮功能正常（审批意见必填）
- [ ] 点击后弹出确认对话框
- [ ] 操作成功后提示信息
- [ ] 操作成功后跳转到待审批列表
- [ ] 异常处理
- [ ] 权限校验（无权限时禁用按钮）

**相关文件**:
- client/src/views/approval/ApprovalDetail.vue

**后续 Task**: 无

---

## TASK-062: 编写审批管理单元测试（后端）

**类型**: 测试

**工作量**: 16h

**优先级**: P1

**依赖**: TASK-054, TASK-055, TASK-056, TASK-057

**描述**:
编写审批管理模块的单元测试，覆盖核心业务逻辑。

**测试范围**:
- 审批列表查询逻辑
- 文档审批逻辑
- 记录审批逻辑
- 会签逻辑
- 依次审批逻辑

**验收标准**:
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] 所有核心业务规则有对应测试用例
- [ ] Mock 外部依赖（Prisma、消息服务）
- [ ] 测试用例清晰、可读
- [ ] 所有测试通过

**相关文件**:
- server/test/approval.service.spec.ts

**后续 Task**: 无

---

## TASK-063: 编写审批管理集成测试（后端）

**类型**: 测试

**工作量**: 16h

**优先级**: P1

**依赖**: TASK-054, TASK-055, TASK-056

**描述**:
编写审批管理模块的集成测试，验证 API 端点。

**测试范围**:
- GET /api/v1/approvals/pending
- GET /api/v1/approvals/history
- POST /api/v1/approvals/:id/approve
- POST /api/v1/approvals/:id/reject

**验收标准**:
- [ ] 所有 API 端点有对应测试用例
- [ ] 测试覆盖正常流程和异常流程
- [ ] 测试覆盖权限校验
- [ ] 测试覆盖业务规则校验
- [ ] 所有测试通过

**相关文件**:
- server/test/approval.e2e-spec.ts

**后续 Task**: 无

---

## TASK-064: 编写前端组件单元测试

**类型**: 测试

**工作量**: 8h

**优先级**: P2

**依赖**: TASK-058, TASK-059, TASK-060

**描述**:
编写前端组件的单元测试，验证组件逻辑。

**测试范围**:
- PendingApprovals.vue
- ApprovalDetail.vue
- ApprovalHistory.vue

**验收标准**:
- [ ] 所有核心组件有对应测试用例
- [ ] 测试覆盖组件交互逻辑
- [ ] 测试覆盖数据渲染逻辑
- [ ] Mock API 请求
- [ ] 所有测试通过

**相关文件**:
- client/src/views/approval/__tests__/PendingApprovals.spec.ts
- client/src/views/approval/__tests__/ApprovalDetail.spec.ts
- client/src/views/approval/__tests__/ApprovalHistory.spec.ts

**后续 Task**: 无

---

## TASK-065: 编写 E2E 测试（Playwright）

**类型**: 测试

**工作量**: 8h

**优先级**: P2

**依赖**: TASK-058, TASK-059

**描述**:
编写审批管理模块的 E2E 测试，验证关键用户流程。

**测试场景**:
1. 用户提交文档审批 → 审批人收到通知 → 查看待审批 → 通过审批
2. 用户提交文档审批 → 审批人驳回 → 用户修改后重新提交
3. 用户提交记录审批 → 审批人通过 → 任务状态变为已完成
4. 会签模式 → 所有人通过才算通过
5. 依次审批模式 → 前一人通过后下一人才能审批

**验收标准**:
- [ ] 所有关键用户流程有对应测试用例
- [ ] 测试覆盖正常流程和异常流程
- [ ] 所有测试通过

**相关文件**:
- client/e2e/approval.spec.ts

**后续 Task**: 无

---

**本文档完成 ✅**
