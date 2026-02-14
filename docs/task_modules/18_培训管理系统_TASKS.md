# 培训管理系统 - Task 分解

> **来源**: docs/design/layer2_体系管理/14_培训管理系统.md
> **总工作量**: 384h
> **优先级**: P1（体系管理核心模块）
> **依赖**: 工作流引擎、文档管理系统

---

## Task 统计

| 类型 | 数量 | 工作量 |
|------|------|--------|
| 数据模型 | 3 | 32h |
| 后端 API | 7 | 144h |
| 前端 UI | 6 | 120h |
| 测试 | 4 | 64h |
| 集成与优化 | 2 | 24h |
| **总计** | **22** | **384h** |

---

## Phase 1: 数据模型（32h）

### TASK-301: 创建统一待办任务表（TodoTask）

**类型**: 数据模型

**工作量**: 8h

**优先级**: P0（阻塞其他 Task）

**依赖**: 无

**描述**:
根据 14_培训管理系统.md 第 146-177 行设计，创建统一待办任务表（TodoTask），支持培训、审批、设备维护等多种待办类型。

**验收标准**:
- [ ] Prisma Schema 编写完成（schema.prisma）
- [ ] TodoTask 表包含所有字段（id, userId, type, relatedId, title, description, status, priority, dueDate, completedAt, createdAt, updatedAt）
- [ ] type 字段枚举正确（training_organize, training_attend, approval, equipment_maintain, inventory, change_request）
- [ ] status 字段枚举正确（pending, completed）
- [ ] priority 字段枚举正确（low, normal, high, urgent）
- [ ] 外键约束配置正确（userId 引用 users(id)）
- [ ] 索引配置正确（userId+status, type+relatedId, status+dueDate）
- [ ] 数据库迁移文件生成

**技术要点**:
- relatedId 根据 type 不同，关联不同业务实体
- training_organize/training_attend → TrainingProject.id
- approval → WorkflowTask.id
- equipment_maintain → EquipmentTask.id

**相关文件**:
- server/src/prisma/schema.prisma
- server/prisma/migrations/xxx_add_todo_task/

**后续 Task**: TASK-310（待办任务管理 API 依赖此表）

---

### TASK-302: 创建培训模块核心表（6 个表）

**类型**: 数据模型

**工作量**: 16h

**优先级**: P0（阻塞其他 Task）

**依赖**: TASK-301

**描述**:
根据 14_培训管理系统.md 第 182-254 行设计，创建培训模块核心数据表。

**核心表清单**:
1. TrainingPlan - 年度培训计划
2. TrainingProject - 培训项目（具体培训课程）
3. TrainingQuestion - 考试题目
4. LearningRecord - 学习记录
5. ExamRecord - 考试记录（支持多次考试）
6. TrainingArchive - 培训档案

**验收标准**:
- [ ] TrainingPlan 表包含字段（id, year, title, status, createdBy, createdAt, updatedAt）
- [ ] TrainingProject 表包含字段（id, planId, title, description, department, quarter, trainerId, trainees[], scheduledDate, documentIds[], passingScore, maxAttempts, status, createdAt, updatedAt, completedAt）
- [ ] TrainingQuestion 表包含字段（id, projectId, type, content, options, correctAnswer, points, order, createdAt）
- [ ] LearningRecord 表包含字段（id, projectId, userId, examScore, attempts, passed, completedAt, createdAt, updatedAt）
- [ ] ExamRecord 表包含字段（id, learningRecordId, answers, score, submittedAt, createdAt）
- [ ] TrainingArchive 表包含字段（id, projectId, documentId, pdfPath, generatedAt, createdAt）
- [ ] 外键约束配置正确
- [ ] 唯一索引配置正确（TrainingPlan.year, LearningRecord.projectId+userId, TrainingArchive.projectId）
- [ ] 级联删除配置正确（TrainingProject onDelete: Cascade）
- [ ] 数据库迁移文件生成

**业务规则**:
- BR-091: 年度培训计划唯一性（@unique([year])）
- BR-106: 考试记录保存（每次考试都创建 ExamRecord）
- BR-114: 培训档案唯一性（projectId @unique）

**相关文件**:
- server/src/prisma/schema.prisma
- server/prisma/migrations/xxx_add_training_tables/

**后续 Task**: TASK-304~309（所有后端 API 依赖这些表）

---

### TASK-303: 创建培训档案归档表

**类型**: 数据模型

**工作量**: 8h

**优先级**: P1

**依赖**: TASK-302

**描述**:
创建培训档案归档表，记录培训档案 PDF 生成和文档系统归档信息。

**验收标准**:
- [ ] Prisma Schema 编写完成
- [ ] TrainingArchive 表包含字段（id, projectId, documentId, pdfPath, generatedAt, createdAt）
- [ ] 外键约束配置正确（projectId 引用 training_projects(id), documentId 引用 documents(id)）
- [ ] projectId 唯一索引配置正确
- [ ] 数据库迁移文件生成

**业务规则**:
- BR-112: 培训档案生成时机（项目 completed 时自动生成）
- BR-113: 培训档案归档规则（自动创建四级文件）
- BR-114: 培训档案唯一性（每个项目只能生成一次）

**相关文件**:
- server/src/prisma/schema.prisma
- server/prisma/migrations/xxx_add_training_archive/

**后续 Task**: TASK-309（培训档案生成 API 依赖此表）

---

## Phase 2: 后端 API（144h）

### TASK-304: 实现年度培训计划 CRUD API

**类型**: 后端 API

**工作量**: 16h

**优先级**: P0

**依赖**: TASK-302

**描述**:
实现年度培训计划的创建、查询、更新、删除 API。

**API 端点**:
- POST /api/v1/training/plans - 创建年度培训计划
- GET /api/v1/training/plans - 查询培训计划列表
- GET /api/v1/training/plans/:id - 查询培训计划详情
- PUT /api/v1/training/plans/:id - 更新培训计划
- DELETE /api/v1/training/plans/:id - 删除培训计划

**验收标准**:
- [ ] 支持创建年度培训计划（year, title, createdBy）
- [ ] 支持查询培训计划列表（分页、筛选）
- [ ] 支持查询培训计划详情（包含项目列表）
- [ ] 支持更新培训计划（draft 可直接修改，approved 需重新审批）
- [ ] 支持删除培训计划（draft 可删除）
- [ ] 年度唯一性校验（BR-091）
- [ ] 权限校验（@UseGuards(JwtAuthGuard)）
- [ ] 异常处理（年度重复、无权限、计划不存在）
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] API 文档（Swagger）生成

**业务规则**:
- BR-091: 年度培训计划唯一性
- BR-092: 培训计划审批规则
- BR-093: 培训计划修改规则

**相关文件**:
- server/src/modules/training/training.controller.ts
- server/src/modules/training/training.service.ts
- server/src/modules/training/dto/create-plan.dto.ts
- server/test/training.e2e-spec.ts

**后续 Task**: TASK-305（培训项目管理 API）

---

### TASK-305: 实现培训项目管理 API

**类型**: 后端 API

**工作量**: 24h

**优先级**: P0

**依赖**: TASK-302, TASK-304

**描述**:
实现培训项目的创建、查询、更新、删除 API，支持学员管理、培训资料引用。

**API 端点**:
- POST /api/v1/training/projects - 创建培训项目
- GET /api/v1/training/projects - 查询培训项目列表
- GET /api/v1/training/projects/:id - 查询培训项目详情
- PUT /api/v1/training/projects/:id - 更新培训项目
- DELETE /api/v1/training/projects/:id - 删除培训项目
- POST /api/v1/training/projects/:id/trainees - 添加学员
- DELETE /api/v1/training/projects/:id/trainees/:userId - 移除学员

**验收标准**:
- [ ] 支持创建培训项目（planId, title, department, quarter, trainerId, trainees, documentIds, passingScore, maxAttempts, scheduledDate）
- [ ] 支持查询培训项目列表（分页、筛选：部门、状态、季度）
- [ ] 支持查询培训项目详情（包含学员列表、考试题目、学习记录）
- [ ] 支持更新培训项目（planned 可修改，ongoing 只能修改学员）
- [ ] 支持删除培训项目（planned 可删除，其他状态只能取消）
- [ ] 支持添加学员（自动生成学习记录和待办任务）
- [ ] 支持移除学员（自动删除学习记录和待办任务）
- [ ] 培训资料引用校验（只能引用已发布文档，BR-097）
- [ ] 学员数量限制（1-100 人，BR-099）
- [ ] 权限校验（培训讲师可修改学员名单，BR-098）
- [ ] 异常处理
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] API 文档（Swagger）生成

**业务规则**:
- BR-096: 培训项目状态流转
- BR-097: 培训资料引用规则
- BR-098: 培训讲师权限
- BR-099: 培训学员限制
- BR-100: 培训取消规则

**相关文件**:
- server/src/modules/training/training.controller.ts
- server/src/modules/training/training.service.ts
- server/src/modules/training/dto/create-project.dto.ts
- server/test/training.e2e-spec.ts

**后续 Task**: TASK-312（前端培训项目管理页面）

---

### TASK-306: 实现考试题目管理 API

**类型**: 后端 API

**工作量**: 16h

**优先级**: P0

**依赖**: TASK-302

**描述**:
实现考试题目的创建、查询、更新、删除 API，支持选择题和判断题。

**API 端点**:
- POST /api/v1/training/questions - 创建考试题目
- GET /api/v1/training/questions?projectId=xxx - 查询题目列表
- PUT /api/v1/training/questions/:id - 更新题目
- DELETE /api/v1/training/questions/:id - 删除题目

**验收标准**:
- [ ] 支持创建选择题（type: choice, content, options: A/B/C/D, correctAnswer, points, order）
- [ ] 支持创建判断题（type: judge, content, correctAnswer: true/false, points, order）
- [ ] 支持查询题目列表（按 projectId 筛选，按 order 排序）
- [ ] 支持更新题目（planned 状态可修改）
- [ ] 支持删除题目（planned 状态可删除）
- [ ] 题目类型校验（choice/judge）
- [ ] 答案格式校验（choice: A/B/C/D, judge: true/false）
- [ ] 权限校验（只有计划创建人可管理题目）
- [ ] 异常处理
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] API 文档（Swagger）生成

**业务规则**:
- BR-104: 考试答案验证
- BR-107: 考试题目顺序

**相关文件**:
- server/src/modules/training/question.controller.ts
- server/src/modules/training/question.service.ts
- server/src/modules/training/dto/create-question.dto.ts
- server/test/training.e2e-spec.ts

**后续 Task**: TASK-313（前端考试题目管理页面）

---

### TASK-307: 实现在线考试 API

**类型**: 后端 API

**工作量**: 24h

**优先级**: P0

**依赖**: TASK-302, TASK-306

**描述**:
实现在线考试 API，支持开始考试、提交答案、自动评分、多次考试。

**API 端点**:
- POST /api/v1/training/exam/start - 开始考试（获取题目）
- POST /api/v1/training/exam/submit - 提交答案（自动评分）

**验收标准**:
- [ ] 支持开始考试（返回题目列表，不包含正确答案）
- [ ] 支持提交答案（answers: { questionId: answer }）
- [ ] 自动评分逻辑正确（对比正确答案，计算总分）
- [ ] 考试次数限制（attempts ≤ maxAttempts，BR-102）
- [ ] 及格规则校验（score ≥ passingScore → passed = true，BR-103）
- [ ] 创建 ExamRecord 记录（保存答案和分数，BR-106）
- [ ] 更新 LearningRecord（更新 examScore, attempts, passed）
- [ ] 通过考试后自动完成待办任务（BR-109）
- [ ] 所有学员考试完毕后自动触发档案生成（BR-101）
- [ ] 权限校验（只有学员本人可参加考试）
- [ ] 异常处理（超过考试次数、答案格式错误）
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] API 文档（Swagger）生成

**业务规则**:
- BR-102: 考试次数限制
- BR-103: 考试及格规则
- BR-104: 考试答案验证
- BR-105: 考试自动评分
- BR-106: 考试记录保存

**相关文件**:
- server/src/modules/training/exam.controller.ts
- server/src/modules/training/exam.service.ts
- server/src/modules/training/dto/submit-exam.dto.ts
- server/test/training.e2e-spec.ts

**后续 Task**: TASK-314（前端在线考试界面）

---

### TASK-308: 实现学习记录查询 API

**类型**: 后端 API

**工作量**: 16h

**优先级**: P1

**依赖**: TASK-302

**描述**:
实现学习记录查询 API，支持查询学员考试成绩、考试次数、通过状态。

**API 端点**:
- GET /api/v1/training/records?projectId=xxx - 查询项目学习记录
- GET /api/v1/training/records/my - 查询我的学习记录
- GET /api/v1/training/records/:id/exams - 查询考试记录历史

**验收标准**:
- [ ] 支持查询项目学习记录（按 projectId 筛选，返回所有学员记录）
- [ ] 支持查询我的学习记录（返回当前用户的学习记录）
- [ ] 支持查询考试记录历史（返回所有考试记录，按时间倒序）
- [ ] 返回数据包含学员信息、考试分数、通过状态、考试次数
- [ ] 权限校验（培训讲师可查看项目记录，学员只能查看自己）
- [ ] 异常处理
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] API 文档（Swagger）生成

**相关文件**:
- server/src/modules/training/record.controller.ts
- server/src/modules/training/record.service.ts
- server/test/training.e2e-spec.ts

**后续 Task**: TASK-312（前端培训项目管理页面显示学员记录）

---

### TASK-309: 实现培训档案生成 API

**类型**: 后端 API

**工作量**: 24h

**优先级**: P1

**依赖**: TASK-302, TASK-303

**描述**:
实现培训档案自动生成 API，支持生成 PDF、归档到文档系统。

**API 端点**:
- POST /api/v1/training/archive/:projectId - 手动生成培训档案
- GET /api/v1/training/archive?projectId=xxx - 查询培训档案

**验收标准**:
- [ ] 支持手动生成培训档案（或自动触发）
- [ ] 生成 PDF 包含完整信息（基本信息、培训内容、参训人员、培训效果，BR-115）
- [ ] 上传 PDF 到 MinIO（路径：archives/{year}/{projectId}.pdf）
- [ ] 自动归档到文档系统（创建四级文件，BR-113）
- [ ] 文档编号自动生成（REC-TRAIN-{YYYY}-{序号}）
- [ ] 文档标题自动生成（{培训标题}-{日期}）
- [ ] 文档类型固定为 training_record
- [ ] 归属部门继承培训项目的 department
- [ ] 培训档案唯一性校验（BR-114）
- [ ] 权限校验（只有计划创建人可生成档案）
- [ ] 异常处理（项目未完成、档案已存在）
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] API 文档（Swagger）生成

**业务规则**:
- BR-112: 培训档案生成时机
- BR-113: 培训档案归档规则
- BR-114: 培训档案唯一性
- BR-115: 培训档案 PDF 格式

**技术要点**:
- 使用 PDFKit 或 Puppeteer 生成 PDF
- 使用 MinIO 存储 PDF
- 调用文档管理 API 创建四级文件

**相关文件**:
- server/src/modules/training/archive.controller.ts
- server/src/modules/training/archive.service.ts
- server/src/modules/training/templates/archive.html
- server/test/training.e2e-spec.ts

**后续 Task**: TASK-315（前端培训档案查看页面）

---

### TASK-310: 实现待办任务管理 API

**类型**: 后端 API

**工作量**: 24h

**优先级**: P0

**依赖**: TASK-301

**描述**:
实现统一待办任务管理 API，支持查询待办、完成待办、删除待办。

**API 端点**:
- GET /api/v1/todos - 查询我的待办列表
- GET /api/v1/todos/:id - 查询待办详情
- POST /api/v1/todos/:id/complete - 完成待办
- DELETE /api/v1/todos/:id - 删除待办

**验收标准**:
- [ ] 支持查询我的待办列表（分页、筛选：type, status, priority）
- [ ] 支持按截止日期排序（逾期优先）
- [ ] 支持查询待办详情（返回关联业务信息）
- [ ] 支持完成待办（status: pending → completed）
- [ ] 支持删除待办（只能删除 pending 状态）
- [ ] 待办类型统计（按 type 分组统计数量）
- [ ] 逾期待办高亮显示（dueDate < 当前日期）
- [ ] 权限校验（只能操作自己的待办）
- [ ] 异常处理
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] API 文档（Swagger）生成

**业务规则**:
- BR-108: 待办任务自动生成
- BR-109: 待办任务自动完成
- BR-110: 待办任务删除规则
- BR-111: 待办任务逾期提醒

**相关文件**:
- server/src/modules/todo/todo.controller.ts
- server/src/modules/todo/todo.service.ts
- server/src/modules/todo/dto/query-todo.dto.ts
- server/test/todo.e2e-spec.ts

**后续 Task**: TASK-316（前端我的待办页面）

---

## Phase 3: 前端 UI（120h）

### TASK-311: 实现年度培训计划页面

**类型**: 前端 UI

**工作量**: 20h

**优先级**: P0

**依赖**: TASK-304

**描述**:
实现年度培训计划列表页面和编辑页面，支持创建、查看、编辑、删除培训计划。

**页面路由**:
- /training/plans - 培训计划列表
- /training/plans/create - 创建培训计划
- /training/plans/:id - 培训计划详情

**功能要求**:
- 培训计划列表展示（年度、标题、状态、项目数量、创建人、创建时间）
- 创建培训计划（年度、标题）
- 查看培训计划详情（基本信息 + 培训项目列表）
- 编辑培训计划（draft 可编辑）
- 删除培训计划（draft 可删除）
- 提交审批（调用工作流引擎）

**验收标准**:
- [ ] 页面布局符合设计稿
- [ ] 列表展示功能正常（分页、搜索）
- [ ] 创建功能正常（调用 POST /api/v1/training/plans）
- [ ] 编辑功能正常（调用 PUT /api/v1/training/plans/:id）
- [ ] 删除功能正常（调用 DELETE /api/v1/training/plans/:id）
- [ ] 状态显示正确（draft, pending_approval, approved）
- [ ] 权限校验（无权限时禁用操作按钮）
- [ ] 异常处理
- [ ] 响应式布局

**主要组件**:
- TrainingPlanList.vue - 培训计划列表组件
- TrainingPlanForm.vue - 培训计划表单组件

**相关文件**:
- client/src/views/training/PlanList.vue
- client/src/views/training/PlanForm.vue
- client/src/views/training/PlanDetail.vue

**后续 Task**: TASK-312（培训项目管理页面）

---

### TASK-312: 实现培训项目管理页面

**类型**: 前端 UI

**工作量**: 24h

**优先级**: P0

**依赖**: TASK-305, TASK-308

**描述**:
实现培训项目管理页面，支持创建、编辑、删除项目，管理学员，查看学习记录。

**页面路由**:
- /training/projects - 培训项目列表
- /training/projects/create - 创建培训项目
- /training/projects/:id - 培训项目详情

**功能要求**:
- 培训项目列表展示（标题、部门、季度、讲师、学员数量、状态、计划日期）
- 创建培训项目（标题、部门、季度、讲师、学员、培训资料、考试配置、计划日期）
- 编辑培训项目（planned 可编辑）
- 删除培训项目（planned 可删除）
- 添加/移除学员
- 查看学习记录（学员列表、考试成绩、通过状态）

**验收标准**:
- [ ] 页面布局符合设计稿
- [ ] 列表展示功能正常（分页、筛选：部门、状态、季度）
- [ ] 创建功能正常（调用 POST /api/v1/training/projects）
- [ ] 编辑功能正常（调用 PUT /api/v1/training/projects/:id）
- [ ] 删除功能正常（调用 DELETE /api/v1/training/projects/:id）
- [ ] 学员管理功能正常（添加/移除学员）
- [ ] 学习记录查看功能正常（调用 GET /api/v1/training/records）
- [ ] 培训资料选择器（引用已发布文档）
- [ ] 学员选择器（多选，显示部门）
- [ ] 权限校验（培训讲师可管理学员）
- [ ] 异常处理
- [ ] 响应式布局

**主要组件**:
- TrainingProjectList.vue - 培训项目列表组件
- TrainingProjectForm.vue - 培训项目表单组件
- LearningRecordTable.vue - 学习记录表格组件

**相关文件**:
- client/src/views/training/ProjectList.vue
- client/src/views/training/ProjectForm.vue
- client/src/views/training/ProjectDetail.vue
- client/src/components/LearningRecordTable.vue

**后续 Task**: TASK-313（考试题目管理页面）

---

### TASK-313: 实现考试题目管理页面

**类型**: 前端 UI

**工作量**: 16h

**优先级**: P0

**依赖**: TASK-306

**描述**:
实现考试题目管理页面，支持创建、编辑、删除选择题和判断题。

**页面路由**:
- /training/projects/:id/questions - 考试题目管理

**功能要求**:
- 题目列表展示（题号、题型、题目内容、分值）
- 创建选择题（题目内容、选项 A/B/C/D、正确答案、分值）
- 创建判断题（题目内容、正确答案 true/false、分值）
- 编辑题目（planned 状态可编辑）
- 删除题目（planned 状态可删除）
- 题目排序（拖拽排序）

**验收标准**:
- [ ] 页面布局符合设计稿
- [ ] 列表展示功能正常（按 order 排序）
- [ ] 创建选择题功能正常（调用 POST /api/v1/training/questions）
- [ ] 创建判断题功能正常（调用 POST /api/v1/training/questions）
- [ ] 编辑功能正常（调用 PUT /api/v1/training/questions/:id）
- [ ] 删除功能正常（调用 DELETE /api/v1/training/questions/:id）
- [ ] 题目排序功能正常（拖拽更新 order 字段）
- [ ] 题型选择（选择题/判断题）
- [ ] 答案格式校验（选择题 A/B/C/D，判断题 true/false）
- [ ] 权限校验（只有计划创建人可管理）
- [ ] 异常处理
- [ ] 响应式布局

**主要组件**:
- QuestionList.vue - 题目列表组件
- QuestionForm.vue - 题目表单组件

**相关文件**:
- client/src/views/training/QuestionManage.vue
- client/src/components/QuestionForm.vue

**后续 Task**: TASK-314（在线考试界面）

---

### TASK-314: 实现在线考试界面

**类型**: 前端 UI

**工作量**: 24h

**优先级**: P0

**依赖**: TASK-307

**描述**:
实现在线考试界面，支持开始考试、答题、提交答案、查看成绩。

**页面路由**:
- /training/exam/:projectId - 在线考试

**功能要求**:
- 考试说明（培训标题、及格分数、考试次数限制）
- 开始考试（调用 start API，显示题目）
- 答题界面（单选题、判断题）
- 提交答案（调用 submit API，自动评分）
- 显示考试结果（分数、是否通过、剩余考试次数）
- 重新考试（未通过且有剩余次数时）

**验收标准**:
- [ ] 页面布局符合设计稿
- [ ] 考试说明显示正确
- [ ] 开始考试功能正常（调用 POST /api/v1/training/exam/start）
- [ ] 答题界面交互流畅（选择答案、切换题目）
- [ ] 提交答案功能正常（调用 POST /api/v1/training/exam/submit）
- [ ] 考试结果显示正确（分数、通过状态、剩余次数）
- [ ] 答案必填校验（未答完不能提交）
- [ ] 考试次数限制校验（超过次数禁用考试）
- [ ] 通过考试后禁用重考
- [ ] 异常处理
- [ ] 响应式布局

**主要组件**:
- ExamPage.vue - 考试页面组件
- QuestionCard.vue - 题目卡片组件
- ExamResult.vue - 考试结果组件

**相关文件**:
- client/src/views/training/ExamPage.vue
- client/src/components/QuestionCard.vue
- client/src/components/ExamResult.vue

**后续 Task**: TASK-315（培训档案查看页面）

---

### TASK-315: 实现培训档案查看页面

**类型**: 前端 UI

**工作量**: 16h

**优先级**: P1

**依赖**: TASK-309

**描述**:
实现培训档案查看页面，支持查看培训档案 PDF、下载档案。

**页面路由**:
- /training/archives - 培训档案列表
- /training/archives/:id - 培训档案详情

**功能要求**:
- 培训档案列表展示（培训标题、部门、日期、生成时间）
- 查看培训档案详情（PDF 预览）
- 下载培训档案 PDF
- 查看关联的文档系统归档记录

**验收标准**:
- [ ] 页面布局符合设计稿
- [ ] 列表展示功能正常（分页、筛选：部门、年度）
- [ ] PDF 预览功能正常（PdfViewer 组件）
- [ ] 下载功能正常（从 MinIO 下载）
- [ ] 关联文档记录显示正确
- [ ] 权限校验（只有授权用户可查看）
- [ ] 异常处理
- [ ] 响应式布局

**主要组件**:
- ArchiveList.vue - 培训档案列表组件
- ArchiveDetail.vue - 培训档案详情组件

**相关文件**:
- client/src/views/training/ArchiveList.vue
- client/src/views/training/ArchiveDetail.vue

**后续 Task**: 无

---

### TASK-316: 实现我的待办页面

**类型**: 前端 UI

**工作量**: 20h

**优先级**: P0

**依赖**: TASK-310

**描述**:
实现统一的我的待办页面，支持查看、筛选、完成、删除待办任务。

**页面路由**:
- /todos - 我的待办

**功能要求**:
- 待办列表展示（标题、类型、优先级、截止日期、状态）
- 待办类型筛选（培训、审批、设备维护等）
- 待办状态筛选（待处理、已完成）
- 待办排序（截止日期、优先级）
- 完成待办
- 删除待办
- 逾期待办高亮显示
- 待办类型统计（按类型分组显示数量）

**验收标准**:
- [ ] 页面布局符合设计稿
- [ ] 列表展示功能正常（分页、筛选、排序）
- [ ] 类型筛选功能正常（training_organize, training_attend, approval 等）
- [ ] 状态筛选功能正常（pending, completed）
- [ ] 完成功能正常（调用 POST /api/v1/todos/:id/complete）
- [ ] 删除功能正常（调用 DELETE /api/v1/todos/:id）
- [ ] 逾期待办高亮显示（dueDate < 当前日期，红色背景）
- [ ] 待办类型统计显示正确
- [ ] 点击待办跳转到关联业务页面（培训项目详情、审批详情等）
- [ ] 异常处理
- [ ] 响应式布局

**主要组件**:
- TodoList.vue - 待办列表组件
- TodoCard.vue - 待办卡片组件

**相关文件**:
- client/src/views/todo/TodoList.vue
- client/src/components/TodoCard.vue

**后续 Task**: 无

---

## Phase 4: 测试（64h）

### TASK-317: 编写培训管理单元测试（后端）

**类型**: 测试

**工作量**: 16h

**优先级**: P1

**依赖**: TASK-304~310

**描述**:
编写培训管理模块的单元测试，覆盖核心业务逻辑。

**测试范围**:
- 年度培训计划管理逻辑
- 培训项目管理逻辑
- 考试题目管理逻辑
- 在线考试逻辑（自动评分）
- 学习记录查询逻辑
- 培训档案生成逻辑
- 待办任务管理逻辑

**验收标准**:
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] 所有核心业务规则有对应测试用例（BR-091~BR-115）
- [ ] Mock 外部依赖（Prisma、MinIO、WorkflowEngine）
- [ ] 测试用例清晰、可读
- [ ] 所有测试通过

**相关文件**:
- server/test/training.service.spec.ts
- server/test/exam.service.spec.ts
- server/test/archive.service.spec.ts
- server/test/todo.service.spec.ts

**后续 Task**: 无

---

### TASK-318: 编写培训管理集成测试（后端）

**类型**: 测试

**工作量**: 16h

**优先级**: P1

**依赖**: TASK-304~310

**描述**:
编写培训管理模块的集成测试，验证 API 端点。

**测试范围**:
- POST /api/v1/training/plans
- GET /api/v1/training/plans
- POST /api/v1/training/projects
- POST /api/v1/training/questions
- POST /api/v1/training/exam/start
- POST /api/v1/training/exam/submit
- GET /api/v1/training/records
- POST /api/v1/training/archive/:projectId
- GET /api/v1/todos

**验收标准**:
- [ ] 所有 API 端点有对应测试用例
- [ ] 测试覆盖正常流程和异常流程
- [ ] 测试覆盖权限校验
- [ ] 测试覆盖业务规则校验
- [ ] 所有测试通过

**相关文件**:
- server/test/training.e2e-spec.ts
- server/test/exam.e2e-spec.ts
- server/test/todo.e2e-spec.ts

**后续 Task**: 无

---

### TASK-319: 编写前端组件单元测试

**类型**: 测试

**工作量**: 16h

**优先级**: P2

**依赖**: TASK-311~316

**描述**:
编写前端组件的单元测试，验证组件逻辑。

**测试范围**:
- TrainingPlanList.vue
- TrainingProjectList.vue
- QuestionManage.vue
- ExamPage.vue
- ArchiveList.vue
- TodoList.vue

**验收标准**:
- [ ] 所有核心组件有对应测试用例
- [ ] 测试覆盖组件交互逻辑
- [ ] 测试覆盖数据渲染逻辑
- [ ] Mock API 请求
- [ ] 所有测试通过

**相关文件**:
- client/src/views/training/__tests__/PlanList.spec.ts
- client/src/views/training/__tests__/ExamPage.spec.ts
- client/src/views/todo/__tests__/TodoList.spec.ts

**后续 Task**: 无

---

### TASK-320: 编写 E2E 测试（Playwright）

**类型**: 测试

**工作量**: 16h

**优先级**: P2

**依赖**: TASK-311~316

**描述**:
编写培训管理模块的 E2E 测试，验证关键用户流程。

**测试场景**:
1. 创建年度培训计划 → 添加培训项目 → 提交审批 → 审批通过 → 自动生成待办任务
2. 学员查看待办 → 进入培训项目 → 参加考试 → 提交答案 → 查看成绩 → 待办自动完成
3. 学员第一次考试不通过 → 重新考试 → 通过 → 待办完成
4. 所有学员考试完毕 → 自动生成培训档案 → 自动归档到文档系统
5. 培训讲师查看学习记录 → 下载培训档案 PDF

**验收标准**:
- [ ] 所有关键用户流程有对应测试用例
- [ ] 测试覆盖正常流程和异常流程
- [ ] 所有测试通过

**相关文件**:
- client/e2e/training.spec.ts
- client/e2e/exam.spec.ts
- client/e2e/todo.spec.ts

**后续 Task**: 无

---

## Phase 5: 集成与优化（24h）

### TASK-321: 集成工作流引擎（培训计划审批）

**类型**: 集成

**工作量**: 8h

**优先级**: P1

**依赖**: TASK-304

**描述**:
集成工作流引擎，实现培训计划的审批流程。

**集成要点**:
- 提交培训计划审批时创建 WorkflowInstance
- 审批通过后自动生成待办任务
- 审批驳回后计划状态回到 draft

**验收标准**:
- [ ] 提交审批功能正常（创建 WorkflowInstance）
- [ ] 审批通过后自动触发待办任务生成
- [ ] 审批驳回后计划状态正确更新
- [ ] 重新审批时删除旧待办生成新待办
- [ ] 异常处理
- [ ] 单元测试覆盖率 ≥ 80%

**相关文件**:
- server/src/modules/training/training.service.ts

**后续 Task**: 无

---

### TASK-322: 实现定时任务（待办提醒、档案生成）

**类型**: 集成

**工作量**: 16h

**优先级**: P1

**依赖**: TASK-309, TASK-310

**描述**:
实现定时任务，支持待办逾期提醒、培训档案自动生成。

**定时任务清单**:
1. 待办逾期提醒（每天早上 9:00）
   - 查询所有逾期待办（dueDate < 当前日期 && status = pending）
   - 发送逾期提醒（邮件/站内信）

2. 培训档案自动生成（每小时检查）
   - 查询所有已完成但未生成档案的项目
   - 自动调用档案生成 API

**验收标准**:
- [ ] 定时任务正常运行（使用 @nestjs/schedule）
- [ ] 待办逾期提醒正常发送
- [ ] 培训档案自动生成正常触发
- [ ] 定时任务日志记录完整
- [ ] 异常处理（邮件发送失败、档案生成失败）
- [ ] 单元测试覆盖率 ≥ 80%

**业务规则**:
- BR-111: 待办任务逾期提醒
- BR-112: 培训档案生成时机

**技术要点**:
- 使用 @nestjs/schedule 实现定时任务
- 使用 Cron 表达式配置执行时间
- 记录定时任务执行日志

**相关文件**:
- server/src/modules/training/training.schedule.ts
- server/src/modules/todo/todo.schedule.ts

**后续 Task**: 无

---

**本文档完成 ✅**
