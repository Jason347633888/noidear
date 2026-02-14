# 内审管理系统 - Task 分解

> **来源**: docs/design/layer2_体系管理/15_内审管理系统.md
> **总工作量**: 304h
> **优先级**: P1（体系管理核心模块）
> **依赖**: 文档管理系统、TodoTask 统一待办

---

## Task 统计

| 类型 | 数量 | 工作量 |
|------|------|--------|
| 数据模型 | 2 | 16h |
| 后端 API | 6 | 128h |
| 前端 UI | 5 | 104h |
| 测试 | 3 | 40h |
| 集成与优化 | 2 | 16h |
| **总计** | **18** | **304h** |

---

## Phase 1: 数据模型（16h）

### TASK-325: 创建内审管理核心表（3 个表）

**类型**: 数据模型

**工作量**: 12h

**优先级**: P0（阻塞其他 Task）

**依赖**: 无

**描述**:
根据 15_内审管理系统.md 第 168-249 行设计，创建内审管理核心数据表。

**核心表清单**:
1. AuditPlan - 内审计划
2. AuditFinding - 审核发现（内审记录）
3. AuditReport - 内审报告（归档）

**验收标准**:
- [ ] Prisma Schema 编写完成（schema.prisma）
- [ ] AuditPlan 表包含字段（id, title, type, startDate, endDate, documentIds[], status, auditorId, createdBy, createdAt, updatedAt, startedAt, completedAt）
- [ ] AuditFinding 表包含字段（id, planId, documentId, auditResult, issueType, description, department, assigneeId, dueDate, status, rectificationDocumentId, rectificationVersion, verifiedBy, verifiedAt, rejectionReason, createdAt, updatedAt）
- [ ] AuditReport 表包含字段（id, planId, documentId, pdfPath, generatedAt, createdAt）
- [ ] type 字段枚举正确（quarterly, semiannual, annual）
- [ ] auditResult 字段枚举正确（符合, 不符合）
- [ ] issueType 字段枚举正确（需要修改, 缺失记录, 文档缺失）
- [ ] AuditFinding.status 字段枚举正确（pending, rectifying, pending_verification, verified, rejected）
- [ ] 外键约束配置正确
- [ ] 唯一索引配置正确（AuditReport.planId）
- [ ] 级联删除配置正确（AuditFinding onDelete: Cascade）
- [ ] 数据库迁移文件生成

**业务规则**:
- BR-116: 内审计划创建规则
- BR-134: 内审报告唯一性（planId @unique）

**相关文件**:
- server/src/prisma/schema.prisma
- server/prisma/migrations/xxx_add_audit_tables/

**后续 Task**: TASK-327~332（所有后端 API 依赖这些表）

---

### TASK-326: 扩展 TodoTask 表（audit_rectification 类型）

**类型**: 数据模型

**工作量**: 4h

**优先级**: P0（阻塞整改管理）

**依赖**: TASK-301（统一待办任务表）

**描述**:
扩展 TodoTask 表的 type 字段，添加内审整改待办类型（audit_rectification）。

**验收标准**:
- [ ] TodoTask.type 枚举添加 audit_rectification
- [ ] 数据库迁移文件生成（ALTER TABLE）
- [ ] 文档更新（TodoTask 类型说明）

**业务规则**:
- BR-126: 整改待办任务生成规则（type = audit_rectification）

**相关文件**:
- server/src/prisma/schema.prisma
- server/prisma/migrations/xxx_add_audit_todo_type/

**后续 Task**: TASK-329（整改管理 API 依赖此类型）

---

## Phase 2: 后端 API（128h）

### TASK-327: 实现内审计划管理 API

**类型**: 后端 API

**工作量**: 24h

**优先级**: P0

**依赖**: TASK-325

**描述**:
实现内审计划的创建、查询、更新、删除、启动 API。

**API 端点**:
- POST /api/v1/audit/plans - 创建内审计划
- GET /api/v1/audit/plans - 查询内审计划列表
- GET /api/v1/audit/plans/:id - 查询内审计划详情
- PUT /api/v1/audit/plans/:id - 更新内审计划
- DELETE /api/v1/audit/plans/:id - 删除内审计划
- POST /api/v1/audit/plans/:id/start - 启动内审计划

**验收标准**:
- [ ] 支持创建内审计划（title, type, startDate, endDate, documentIds, auditorId）
- [ ] 支持查询内审计划列表（分页、筛选：type, status）
- [ ] 支持查询内审计划详情（包含审核发现列表、统计信息）
- [ ] 支持更新内审计划（draft 状态可修改）
- [ ] 支持删除内审计划（draft 状态可删除）
- [ ] 支持启动内审计划（draft → ongoing，BR-119）
- [ ] 标题校验（5-100字符，BR-116）
- [ ] 审核时间范围校验（startDate < endDate，BR-116）
- [ ] 文档勾选校验（至少 1 个，只能选已发布文档，BR-117）
- [ ] 权限校验（@UseGuards(JwtAuthGuard)）
- [ ] 异常处理
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] API 文档（Swagger）生成

**业务规则**:
- BR-116: 内审计划创建规则
- BR-117: 内审计划文档勾选规则
- BR-119: 内审计划启动规则
- BR-120: 内审计划状态流转

**相关文件**:
- server/src/modules/audit/audit.controller.ts
- server/src/modules/audit/audit.service.ts
- server/src/modules/audit/dto/create-plan.dto.ts
- server/test/audit.e2e-spec.ts

**后续 Task**: TASK-328（审核执行 API）

---

### TASK-328: 实现审核执行 API

**类型**: 后端 API

**工作量**: 24h

**优先级**: P0

**依赖**: TASK-325, TASK-327

**描述**:
实现审核执行 API，支持记录审核结果、提交审核报告。

**API 端点**:
- POST /api/v1/audit/findings - 记录审核结果
- PUT /api/v1/audit/findings/:id - 更新审核结果
- POST /api/v1/audit/plans/:id/submit - 提交审核报告
- POST /api/v1/audit/plans/:id/withdraw - 撤回审核报告

**验收标准**:
- [ ] 支持记录审核结果（planId, documentId, auditResult）
- [ ] 支持记录"符合"结果（只记录 auditResult = "符合"）
- [ ] 支持记录"不符合"结果（必须填写 issueType, description, department, assigneeId）
- [ ] 自动计算整改期限（dueDate = 审核日期 + 30 天，BR-121）
- [ ] 支持更新审核结果（ongoing 状态可修改）
- [ ] 支持提交审核报告（满足 BR-124 条件）
- [ ] 提交后自动生成整改待办任务（仅"不符合"项，BR-126）
- [ ] 提交后内审计划状态变为 pending_rectification
- [ ] 支持撤回审核报告（pending_rectification → ongoing，删除待办任务，BR-125）
- [ ] 审核进度计算正确（BR-123）
- [ ] 问题描述最少 10 字符校验（BR-121）
- [ ] 权限校验（只有内审员可操作）
- [ ] 异常处理
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] API 文档（Swagger）生成

**业务规则**:
- BR-121: 审核文档记录规则
- BR-122: 问题类型枚举
- BR-123: 审核进度计算
- BR-124: 审核报告提交条件
- BR-125: 审核结果不可修改规则
- BR-126: 整改待办任务生成规则

**相关文件**:
- server/src/modules/audit/finding.controller.ts
- server/src/modules/audit/finding.service.ts
- server/src/modules/audit/dto/create-finding.dto.ts
- server/test/audit.e2e-spec.ts

**后续 Task**: TASK-334（前端审核执行页面）

---

### TASK-329: 实现整改管理 API

**类型**: 后端 API

**工作量**: 20h

**优先级**: P0

**依赖**: TASK-325, TASK-326

**描述**:
实现整改管理 API，支持责任人提交整改、查询整改记录。

**API 端点**:
- GET /api/v1/audit/findings/my-rectifications - 查询我的整改任务
- POST /api/v1/audit/findings/:id/submit-rectification - 提交复审

**验收标准**:
- [ ] 支持查询我的整改任务（返回待整改的 AuditFinding 列表）
- [ ] 支持提交复审（自动记录整改证据）
- [ ] 自动记录整改文档 ID 和版本号（BR-127）
- [ ] 提交后不符合项状态变为 pending_verification
- [ ] 提交后待办任务状态变为 pending_verification
- [ ] 权限校验（只有责任人可提交）
- [ ] 异常处理（整改证据缺失）
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] API 文档（Swagger）生成

**业务规则**:
- BR-127: 整改提交规则

**相关文件**:
- server/src/modules/audit/rectification.controller.ts
- server/src/modules/audit/rectification.service.ts
- server/src/modules/audit/dto/submit-rectification.dto.ts
- server/test/audit.e2e-spec.ts

**后续 Task**: TASK-335（前端整改管理页面）

---

### TASK-330: 实现复审验证 API

**类型**: 后端 API

**工作量**: 20h

**优先级**: P0

**依赖**: TASK-325, TASK-329

**描述**:
实现复审验证 API，支持内审员验证整改结果。

**API 端点**:
- GET /api/v1/audit/findings/pending-verification - 查询待复审列表
- POST /api/v1/audit/findings/:id/verify - 通过验证
- POST /api/v1/audit/findings/:id/reject - 驳回整改

**验收标准**:
- [ ] 支持查询待复审列表（status = pending_verification）
- [ ] 支持通过验证（不符合项状态 → verified，待办任务状态 → completed）
- [ ] 自动记录验证人和验证时间（verifiedBy, verifiedAt，BR-128）
- [ ] 支持驳回整改（不符合项状态 → rectifying，待办任务重新分配）
- [ ] 驳回原因必填（rejectionReason，BR-128）
- [ ] 权限校验（只有内审员可验证，BR-128）
- [ ] 异常处理
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] API 文档（Swagger）生成

**业务规则**:
- BR-128: 整改复审验证规则
- BR-130: 内审计划完成条件

**相关文件**:
- server/src/modules/audit/verification.controller.ts
- server/src/modules/audit/verification.service.ts
- server/src/modules/audit/dto/verify-finding.dto.ts
- server/test/audit.e2e-spec.ts

**后续 Task**: TASK-331（内审报告生成 API）

---

### TASK-331: 实现内审报告生成 API

**类型**: 后端 API

**工作量**: 24h

**优先级**: P1

**依赖**: TASK-325, TASK-330

**描述**:
实现内审报告自动生成 API，支持生成 PDF、归档到文档系统。

**API 端点**:
- POST /api/v1/audit/plans/:id/complete - 完成内审计划（自动生成报告）
- GET /api/v1/audit/reports?planId=xxx - 查询内审报告

**验收标准**:
- [ ] 支持完成内审计划（满足 BR-130 条件）
- [ ] 生成 PDF 包含完整信息（基本信息、审核范围、审核结果汇总、不符合项清单、整改验证记录、统计分析，BR-133）
- [ ] 上传 PDF 到 MinIO（路径：audit-reports/{year}/{planId}.pdf）
- [ ] 自动归档到文档系统（创建四级文件，BR-132）
- [ ] 文档编号自动生成（REC-AUDIT-{YYYY}-{序号}）
- [ ] 文档标题自动生成（{内审标题}-内审报告-{完成日期}）
- [ ] 文档类型固定为 audit_record
- [ ] 文件级别固定为 4
- [ ] 归属部门固定为质量部
- [ ] 内审报告唯一性校验（BR-134）
- [ ] 权限校验（只有内审员可完成）
- [ ] 异常处理（条件不满足、报告已存在）
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] API 文档（Swagger）生成

**业务规则**:
- BR-130: 内审计划完成条件
- BR-131: 内审报告生成时机
- BR-132: 内审报告归档规则
- BR-133: 内审报告 PDF 格式
- BR-134: 内审报告唯一性

**技术要点**:
- 使用 PDFKit 或 Puppeteer 生成 PDF
- 使用 MinIO 存储 PDF
- 调用文档管理 API 创建四级文件

**相关文件**:
- server/src/modules/audit/report.controller.ts
- server/src/modules/audit/report.service.ts
- server/src/modules/audit/templates/report.html
- server/test/audit.e2e-spec.ts

**后续 Task**: TASK-336（前端内审报告查看页面）

---

### TASK-332: 实现历史计划复制 API

**类型**: 后端 API

**工作量**: 16h

**优先级**: P1

**依赖**: TASK-325, TASK-327

**描述**:
实现历史内审计划复制 API，支持复用历史计划的文档列表。

**API 端点**:
- POST /api/v1/audit/plans/:id/copy - 复制历史计划

**验收标准**:
- [ ] 支持复制任意状态的历史计划（BR-118）
- [ ] 复制内容：文档列表（documentIds）、计划类型（type）
- [ ] 不复制内容：审核发现、审核报告、审核时间、内审员
- [ ] 复制后的计划状态为 draft
- [ ] 复制后的标题自动添加"（副本）"后缀
- [ ] 权限校验（@UseGuards(JwtAuthGuard)）
- [ ] 异常处理（原计划不存在）
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] API 文档（Swagger）生成

**业务规则**:
- BR-118: 内审计划复制规则

**相关文件**:
- server/src/modules/audit/audit.controller.ts
- server/src/modules/audit/audit.service.ts
- server/test/audit.e2e-spec.ts

**后续 Task**: TASK-333（前端内审计划管理页面）

---

## Phase 3: 前端 UI（104h）

### TASK-333: 实现内审计划管理页面

**类型**: 前端 UI

**工作量**: 24h

**优先级**: P0

**依赖**: TASK-327, TASK-332

**描述**:
实现内审计划列表页面和编辑页面，支持创建、编辑、删除、启动、复制计划。

**页面路由**:
- /audit/plans - 内审计划列表
- /audit/plans/create - 创建内审计划
- /audit/plans/:id - 内审计划详情

**功能要求**:
- 内审计划列表展示（标题、类型、状态、审核时间、内审员、创建时间）
- 创建内审计划（标题、类型、审核时间、内审员、文档勾选器）
- 文档勾选器（按级别/部门筛选、批量勾选、显示已勾选数量）
- 编辑内审计划（draft 状态可编辑）
- 删除内审计划（draft 状态可删除）
- 启动内审计划（draft → ongoing，跳转到审核页面）
- 复制历史计划（一键复制文档列表）

**验收标准**:
- [ ] 页面布局符合设计稿
- [ ] 列表展示功能正常（分页、筛选：type, status）
- [ ] 创建功能正常（调用 POST /api/v1/audit/plans）
- [ ] 编辑功能正常（调用 PUT /api/v1/audit/plans/:id）
- [ ] 删除功能正常（调用 DELETE /api/v1/audit/plans/:id）
- [ ] 启动功能正常（调用 POST /api/v1/audit/plans/:id/start）
- [ ] 复制功能正常（调用 POST /api/v1/audit/plans/:id/copy）
- [ ] 文档勾选器功能正常（筛选、批量勾选、已勾选数量显示）
- [ ] 标题校验（5-100字符）
- [ ] 审核时间范围校验（startDate < endDate）
- [ ] 文档勾选校验（至少 1 个）
- [ ] 权限校验（无权限时禁用操作按钮）
- [ ] 异常处理
- [ ] 响应式布局

**主要组件**:
- AuditPlanList.vue - 内审计划列表组件
- AuditPlanForm.vue - 内审计划表单组件
- DocumentSelector.vue - 文档勾选器组件

**相关文件**:
- client/src/views/audit/PlanList.vue
- client/src/views/audit/PlanForm.vue
- client/src/views/audit/PlanDetail.vue
- client/src/components/DocumentSelector.vue

**后续 Task**: TASK-334（审核执行页面）

---

### TASK-334: 实现审核执行页面

**类型**: 前端 UI

**工作量**: 24h

**优先级**: P0

**依赖**: TASK-328

**描述**:
实现审核执行页面，支持记录审核结果、提交审核报告、撤回审核报告。

**页面路由**:
- /audit/plans/:id/execute - 审核执行

**功能要求**:
- 审核文档列表展示（文档标题、级别、部门、审核状态、操作）
- 审核进度显示（已审核 X/总数 Y）
- 记录审核结果（符合/不符合）
- 记录不符合项（问题类型、问题描述、责任部门、责任人、整改期限）
- 提交审核报告（满足条件后启用按钮）
- 撤回审核报告（pending_rectification 状态可撤回）

**验收标准**:
- [ ] 页面布局符合设计稿
- [ ] 文档列表展示正常（已勾选的文档）
- [ ] 审核进度显示正确
- [ ] 记录"符合"结果功能正常（调用 POST /api/v1/audit/findings）
- [ ] 记录"不符合"结果功能正常（必填字段校验）
- [ ] 整改期限自动计算（审核日期 + 30 天）
- [ ] 提交审核报告功能正常（调用 POST /api/v1/audit/plans/:id/submit）
- [ ] 撤回审核报告功能正常（调用 POST /api/v1/audit/plans/:id/withdraw）
- [ ] 问题描述最少 10 字符校验
- [ ] 权限校验（只有内审员可操作）
- [ ] 异常处理
- [ ] 响应式布局

**主要组件**:
- AuditExecute.vue - 审核执行页面组件
- FindingForm.vue - 审核结果表单组件

**相关文件**:
- client/src/views/audit/AuditExecute.vue
- client/src/components/FindingForm.vue

**后续 Task**: TASK-335（整改管理页面）

---

### TASK-335: 实现整改管理页面

**类型**: 前端 UI

**工作量**: 20h

**优先级**: P0

**依赖**: TASK-329, TASK-330

**描述**:
实现整改管理页面，支持责任人查看整改任务、提交复审，内审员复审验证。

**页面路由**:
- /audit/rectifications - 我的整改任务（责任人视图）
- /audit/verifications - 待复审列表（内审员视图）

**功能要求**:
- 我的整改任务列表（问题描述、责任文档、整改期限、状态）
- 查看审核发现详情（问题类型、问题描述、审核文档）
- 提交复审（关联整改文档、自动记录版本号）
- 待复审列表（待验证的整改任务）
- 复审验证（查看整改证据、通过/驳回）

**验收标准**:
- [ ] 页面布局符合设计稿
- [ ] 我的整改任务列表展示正常（调用 GET /api/v1/audit/findings/my-rectifications）
- [ ] 审核发现详情显示正确
- [ ] 提交复审功能正常（调用 POST /api/v1/audit/findings/:id/submit-rectification）
- [ ] 待复审列表展示正常（调用 GET /api/v1/audit/findings/pending-verification）
- [ ] 通过验证功能正常（调用 POST /api/v1/audit/findings/:id/verify）
- [ ] 驳回整改功能正常（调用 POST /api/v1/audit/findings/:id/reject）
- [ ] 驳回原因必填校验
- [ ] 权限校验（责任人 vs 内审员视图）
- [ ] 异常处理
- [ ] 响应式布局

**主要组件**:
- RectificationList.vue - 整改任务列表组件
- VerificationList.vue - 待复审列表组件
- VerificationDialog.vue - 复审验证对话框组件

**相关文件**:
- client/src/views/audit/RectificationList.vue
- client/src/views/audit/VerificationList.vue
- client/src/components/VerificationDialog.vue

**后续 Task**: TASK-336（内审报告查看页面）

---

### TASK-336: 实现内审报告查看页面

**类型**: 前端 UI

**工作量**: 20h

**优先级**: P1

**依赖**: TASK-331

**描述**:
实现内审报告查看页面，支持查看内审报告 PDF、下载报告。

**页面路由**:
- /audit/reports - 内审报告列表
- /audit/reports/:id - 内审报告详情

**功能要求**:
- 内审报告列表展示（内审标题、类型、审核时间、生成时间）
- 查看内审报告详情（PDF 预览）
- 下载内审报告 PDF
- 查看关联的文档系统归档记录
- 完成内审计划（触发报告生成）

**验收标准**:
- [ ] 页面布局符合设计稿
- [ ] 列表展示功能正常（分页、筛选：type, 年度）
- [ ] PDF 预览功能正常（PdfViewer 组件）
- [ ] 下载功能正常（从 MinIO 下载）
- [ ] 关联文档记录显示正确
- [ ] 完成内审计划功能正常（调用 POST /api/v1/audit/plans/:id/complete）
- [ ] 权限校验（只有授权用户可查看）
- [ ] 异常处理
- [ ] 响应式布局

**主要组件**:
- ReportList.vue - 内审报告列表组件
- ReportDetail.vue - 内审报告详情组件

**相关文件**:
- client/src/views/audit/ReportList.vue
- client/src/views/audit/ReportDetail.vue

**后续 Task**: 无

---

### TASK-337: 实现待办任务（整改）集成

**类型**: 前端 UI

**工作量**: 16h

**优先级**: P0

**依赖**: TASK-316（我的待办页面），TASK-329

**描述**:
在我的待办页面集成内审整改任务，支持从待办跳转到整改详情。

**功能要求**:
- 待办类型筛选添加"内审整改"选项
- 点击内审整改待办跳转到整改详情页面
- 整改待办显示问题描述、责任文档、整改期限
- 整改待办完成后自动标记（复审通过时）

**验收标准**:
- [ ] 待办类型筛选包含 audit_rectification
- [ ] 点击待办正确跳转到整改详情（/audit/rectifications/:id）
- [ ] 整改待办显示正确信息
- [ ] 整改待办完成状态正确（复审通过后自动完成）
- [ ] 异常处理
- [ ] 响应式布局

**相关文件**:
- client/src/views/todo/TodoList.vue（复用）
- client/src/components/TodoCard.vue（扩展）

**后续 Task**: 无

---

## Phase 4: 测试（40h）

### TASK-338: 编写内审管理单元测试（后端）

**类型**: 测试

**工作量**: 12h

**优先级**: P1

**依赖**: TASK-327~332

**描述**:
编写内审管理模块的单元测试，覆盖核心业务逻辑。

**测试范围**:
- 内审计划管理逻辑
- 审核执行逻辑
- 整改管理逻辑
- 复审验证逻辑
- 内审报告生成逻辑
- 历史计划复制逻辑

**验收标准**:
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] 所有核心业务规则有对应测试用例（BR-116~BR-135）
- [ ] Mock 外部依赖（Prisma、MinIO、DocumentService）
- [ ] 测试用例清晰、可读
- [ ] 所有测试通过

**相关文件**:
- server/test/audit.service.spec.ts
- server/test/finding.service.spec.ts
- server/test/report.service.spec.ts

**后续 Task**: 无

---

### TASK-339: 编写内审管理集成测试（后端）

**类型**: 测试

**工作量**: 12h

**优先级**: P1

**依赖**: TASK-327~332

**描述**:
编写内审管理模块的集成测试，验证 API 端点。

**测试范围**:
- POST /api/v1/audit/plans
- POST /api/v1/audit/plans/:id/start
- POST /api/v1/audit/findings
- POST /api/v1/audit/plans/:id/submit
- POST /api/v1/audit/findings/:id/submit-rectification
- POST /api/v1/audit/findings/:id/verify
- POST /api/v1/audit/plans/:id/complete
- POST /api/v1/audit/plans/:id/copy

**验收标准**:
- [ ] 所有 API 端点有对应测试用例
- [ ] 测试覆盖正常流程和异常流程
- [ ] 测试覆盖权限校验
- [ ] 测试覆盖业务规则校验
- [ ] 所有测试通过

**相关文件**:
- server/test/audit.e2e-spec.ts
- server/test/finding.e2e-spec.ts
- server/test/verification.e2e-spec.ts

**后续 Task**: 无

---

### TASK-340: 编写 E2E 测试（Playwright）

**类型**: 测试

**工作量**: 16h

**优先级**: P2

**依赖**: TASK-333~337

**描述**:
编写内审管理模块的 E2E 测试，验证关键用户流程。

**测试场景**:
1. 创建内审计划 → 勾选文档 → 启动内审 → 逐个审核 → 提交审核报告
2. 责任人查看整改待办 → 修改文档 → 提交复审
3. 内审员复审验证 → 通过验证 → 整改待办自动完成
4. 所有不符合项验证通过 → 完成内审计划 → 自动生成内审报告 → 自动归档
5. 复制历史内审计划 → 修改信息 → 启动审核

**验收标准**:
- [ ] 所有关键用户流程有对应测试用例
- [ ] 测试覆盖正常流程和异常流程
- [ ] 所有测试通过

**相关文件**:
- client/e2e/audit.spec.ts
- client/e2e/rectification.spec.ts

**后续 Task**: 无

---

## Phase 5: 集成与优化（16h）

### TASK-341: 实现定时任务（整改期限监控）

**类型**: 集成

**工作量**: 8h

**优先级**: P1

**依赖**: TASK-329

**描述**:
实现定时任务，支持整改期限监控、逾期提醒。

**定时任务清单**:
1. 整改期限监控（每天早上 9:00）
   - 查询所有逾期未完成的整改任务（dueDate < 当前日期 && status != verified）
   - 标记待办任务为"逾期"
   - 发送逾期提醒（邮件/站内信）

**验收标准**:
- [ ] 定时任务正常运行（使用 @nestjs/schedule）
- [ ] 整改逾期提醒正常发送
- [ ] 定时任务日志记录完整
- [ ] 异常处理（邮件发送失败）
- [ ] 单元测试覆盖率 ≥ 80%

**业务规则**:
- BR-129: 整改期限监控规则

**技术要点**:
- 使用 @nestjs/schedule 实现定时任务
- 使用 Cron 表达式配置执行时间
- 记录定时任务执行日志

**相关文件**:
- server/src/modules/audit/audit.schedule.ts

**后续 Task**: 无

---

### TASK-342: 集成文档管理系统（报告归档）

**类型**: 集成

**工作量**: 8h

**优先级**: P1

**依赖**: TASK-331

**描述**:
集成文档管理系统，实现内审报告自动归档到文档系统。

**集成要点**:
- 完成内审计划时自动调用文档管理 API
- 创建四级文件（level = 4）
- 文档编号自动生成（REC-AUDIT-{YYYY}-{序号}）
- 文档类型固定为 audit_record
- 归属部门固定为质量部

**验收标准**:
- [ ] 文档自动创建功能正常（调用文档管理 API）
- [ ] 文档编号生成正确（序号连续）
- [ ] 文档信息填写正确（标题、类型、级别、部门）
- [ ] MinIO 文件路径关联正确
- [ ] 异常处理（文档创建失败）
- [ ] 单元测试覆盖率 ≥ 80%

**业务规则**:
- BR-132: 内审报告归档规则

**相关文件**:
- server/src/modules/audit/report.service.ts

**后续 Task**: 无

---

**本文档完成 ✅**
