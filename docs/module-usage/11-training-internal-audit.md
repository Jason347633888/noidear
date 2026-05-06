# 培训管理与内部审核

---
module_id: training-internal-audit
business_chain:
  - 培训链：TrainingPlan → TrainingProject → TrainingQuestion → LearningRecord(RecordTask) → ExamRecord → TrainingArchive
  - 内审链：AuditPlan → AuditFinding → RectificationService → AuditReport → Document(归档)
module_type:
  - 治理记录（内审）
  - 管理支持（培训）
source_of_truth:
  - TrainingPlan（年度培训计划）
  - TrainingProject（培训项目）
  - TrainingArchive（培训档案，由 ArchiveService 生成）
  - AuditPlan（内审计划）
  - AuditFinding（内审发现/整改记录）
  - AuditReport（内审报告）
facts_or_projections:
  - TrainingPlan/TrainingProject：事实源
  - TrainingArchive：由 ArchiveService 生成的归档文件，事实源在 TrainingProject
  - AuditPlan/AuditFinding：事实源
  - AuditReport：由 ReportService 生成，归档 PDF 存入 Document，事实源在 AuditPlan
  - DocumentTrainingNeed（体系文件中心）：文控派生需求，不是培训事实源
  - DocumentAuditCoverageService（体系文件中心）：文控派生查询，不是内审事实源
downstream_consumers:
  - 体系文件中心（Document.auditFindings、Document.auditReports 反向关系）
  - 文控工作台（DocumentAuditCoverageService 消费 AuditPlan/AuditFinding）
  - TodoTask（audit_rectification 类型任务由内审整改生成）
  - UnifiedApprovalModule（AuditPlan 完成时触发审批流）
current_entrypoints:
  - /training/plans — PlanList.vue — 年度培训计划列表
  - /training/plans/:id — PlanDetail.vue — 培训计划详情
  - /training/projects — ProjectList.vue — 培训项目列表
  - /training/projects/create — ProjectForm.vue — 新建培训项目
  - /training/projects/:id — ProjectDetail.vue — 培训项目详情
  - /training/projects/:id/questions — QuestionManage.vue — 考题管理
  - /training/exam/:projectId — ExamPage.vue — 在线考试
  - /training/statistics — StatisticsPage.vue — 培训统计
  - /training/archives — ArchiveList.vue — 培训档案列表
  - /training/archives/:id — ArchiveDetail.vue — 培训档案详情
  - /internal-audit/plans — PlanList.vue — 内审计划列表
  - /internal-audit/plans/:id/execute — AuditExecute.vue — 执行内审
  - /internal-audit/rectifications — RectificationList.vue — 整改任务列表
  - /internal-audit/verifications — VerificationList.vue — 复审任务列表
  - /internal-audit/reports — ReportList.vue — 内审报告列表
  - /internal-audit/reports/:id — ReportDetail.vue — 内审报告详情
last_verified_commit: 7bab98dc3ccd49e8e1d76b95b28a1b79207c483c
---

## 1. 模块定位

**培训管理模块**承接食品安全体系要求的员工培训全流程：年度培训计划制定、培训项目组织与执行、在线考试评估、培训档案归档。对应 283 张源表单中的 GRSS-XZ-JL-14（培训记录评价表）、GRSS-XZ-JL-15（培训需求申请单）、GRSS-XZ-JL-28（新员工入职培训记录档案）等行政人事部培训类表单，以及 GRSS-PZ-JL-55（行政人事部工作总结）中的 TrainingRecord 实体。

**内审管理模块**承接 ISO 22000 / BRCGS 要求的内部审核闭环：审核计划制定、文件审核执行、不符合项记录与整改、整改复审、内审报告归档。对应 283 张源表单中的 GRSS-PZ-JL-10（内审实施计划表）、GRSS-PZ-JL-11（内审检查表）、GRSS-PZ-JL-12（内部审核报告）等品质部内审类表单。

两个模块均属于**治理/管理层**，不参与追溯主链（MaterialLot→IngredientUsage→ProductionBatch）。内审的审核对象是 **Document（受控文件）**，不直接关联批次或原料数据。

## 2. 使用角色

| 角色 | 使用目的 | 关键动作 |
|---|---|---|
| 行政人事 / 培训负责人 | 制定年度培训计划，创建培训项目，安排学员 | 创建 TrainingPlan（年度计划），创建 TrainingProject，添加/移除学员，更新项目状态 |
| 培训讲师 | 组织培训执行，管理考题，查看学员成绩 | 管理 TrainingQuestion，查看 LearningRecord，生成 TrainingArchive |
| 培训学员 | 参加在线考试，查看学习记录 | 访问 ExamPage.vue，提交考试，查看 my 学习记录 |
| 内审员（品质部） | 制定内审计划，执行文件审核，记录发现项 | 创建 AuditPlan，启动审核（start），创建 AuditFinding（符合/不符合） |
| 责任部门负责人 | 处理整改任务 | 查看 RectificationList，提交整改证据（rectifiedDocumentId） |
| 内审员（复审） | 验证整改结果 | 查看 VerificationList，通过或驳回整改 |
| 管理层 | 查阅内审报告，汇入管理评审 | 查看 ReportList / ReportDetail，AuditReport.summary 数据供管理评审使用 |

## 3. 当前入口

**培训模块：**

| 入口 | 页面 | 前端 API | 后端 API（实际路径） | 后端模块 |
|---|---|---|---|---|
| 年度培训计划列表 | `/training/plans` → `PlanList.vue` | `GET /training/plans` (training.ts) | `GET /api/v1/training/plans` | `TrainingController` |
| 培训计划详情 | `/training/plans/:id` → `PlanDetail.vue` | `GET /training/plans/:id` | `GET /api/v1/training/plans/:id` | `TrainingController` |
| 培训项目列表 | `/training/projects` → `ProjectList.vue` | `GET /training/projects` | `GET /api/v1/training/projects` | `TrainingController` |
| 新建培训项目 | `/training/projects/create` → `ProjectForm.vue` | `POST /training/projects` | `POST /api/v1/training/projects` | `TrainingController` |
| 培训项目详情 | `/training/projects/:id` → `ProjectDetail.vue` | `GET /training/projects/:id` | `GET /api/v1/training/projects/:id` | `TrainingController` |
| 考题管理 | `/training/projects/:id/questions` → `QuestionManage.vue` | `/training/questions` | `GET /api/v1/training/questions` | `QuestionController` |
| 在线考试 | `/training/exam/:projectId` → `ExamPage.vue` | `/training/exam/*` | `POST /api/v1/training/exam/*` | `ExamController` |
| 学习记录 | （嵌入项目详情） | `GET /training/records` | `GET /api/v1/training/records` | `RecordController` |
| 培训档案列表 | `/training/archives` → `ArchiveList.vue` | 硬编码 `/api/v1/training/archives` | **服务端路径为 `/api/v1/training/archive`（单数）** | `ArchiveController` |
| 培训档案详情 | `/training/archives/:id` → `ArchiveDetail.vue` | 硬编码 `/api/v1/training/archives/:id` | **服务端路径为 `/api/v1/training/archive/:id`（单数）** | `ArchiveController` |

**内审模块：**

| 入口 | 页面 | 前端 API | 后端 API（实际路径） | 后端模块 |
|---|---|---|---|---|
| 内审计划列表 | `/internal-audit/plans` → `PlanList.vue` | 硬编码 `/api/v1/audit/plans` (plan.ts) | `GET /api/v1/audit/plans` | `AuditPlanController` |
| 创建内审计划 | （PlanList 内） | 硬编码 `/api/v1/audit/plans` | `POST /api/v1/audit/plans` | `AuditPlanController` |
| 执行内审 | `/internal-audit/plans/:id/execute` → `AuditExecute.vue` | 硬编码 `/api/v1/audit/findings` (finding.ts) | `POST /api/v1/audit/findings` | `AuditExecutionController` |
| 整改任务列表 | `/internal-audit/rectifications` → `RectificationList.vue` | `GET /api/v1/audit/findings/my-rectifications` | `GET /api/v1/audit/findings/my-rectifications` | `RectificationController` |
| 复审任务列表 | `/internal-audit/verifications` → `VerificationList.vue` | `GET /api/v1/audit/findings/pending-verification` | `GET /api/v1/audit/findings/pending-verification` | `RectificationController` + `VerificationController` |
| 内审报告列表 | `/internal-audit/reports` → `ReportList.vue` | 硬编码 `/api/v1/audit/reports` (report.ts) | `GET /api/v1/audit/reports` | `ReportController` |
| 完成内审（生成报告） | （ReportList 或 PlanList 操作） | `POST /api/v1/audit/plans/:id/complete` (report.ts) | `POST /api/v1/audit/plans/:id/complete` | `ReportController` |

## 4. 当前实现

| 对象 | 当前实现 | 说明 |
|---|---|---|
| `TrainingPlan` | Prisma 模型，year 字段唯一（每年仅一个计划），状态：draft/pending_approval/approved/rejected，支持 UnifiedApproval 审批流 | 已验证：`schema.prisma` 第 2027 行 |
| `TrainingProject` | Prisma 模型，关联 TrainingPlan（planId），包含 trainerId、trainees（String[] 学员 ID 数组）、documentIds（培训资料文档 ID 数组）、passingScore、maxAttempts | 已验证：`schema.prisma` 第 2047 行 |
| `TrainingQuestion` | Prisma 模型，关联 TrainingProject，QuestionType：choice/judge | 已验证：`schema.prisma` 第 2080 行 |
| `LearningRecord`（代码名 RecordTask/TrainingRecord） | 关联 TrainingProject，记录学员学习状态和考试历史 | 已验证：`server/src/modules/training/record.controller.ts` |
| `TrainingArchive` | Prisma 模型，关联 TrainingProject（唯一），一对一归档，由 `ArchiveService.generateArchive()` 触发生成 PDF | 已验证：`schema.prisma` 第 2136 行；`server/src/modules/training/archive.controller.ts` |
| `TrainingScheduleService` | 定时任务，自动处理培训相关定期操作 | 已验证：`server/src/modules/training/training.schedule.ts` |
| `AuditPlan` | Prisma 模型，type: quarterly/semiannual/annual，documentIds（审核文件 ID 数组），status: draft/ongoing/pending_rectification/completed | 已验证：`schema.prisma` 第 2155 行 |
| `AuditFinding` | Prisma 模型，关联 AuditPlan 和 Document，auditResult: compliant/non_compliant，整改状态机：pending/rectifying/pending_verification/verified/rejected | 已验证：`schema.prisma` 第 2192 行 |
| `AuditReport` | Prisma 模型，summary（Json），pdfUrl（MinIO PDF），documentId（归档至 Document 体系） | 已验证：`schema.prisma` 第 2240 行 |
| `AuditCronService` | 定时检查逾期整改项，触发通知 | 已验证：`server/src/modules/internal-audit/audit-cron.service.ts` |
| `VerificationController` | 处理内审发现验证（通过/驳回）；服务端 `@Controller('audit')` 下的子路由 | 已验证：`server/src/modules/internal-audit/verification/` |
| `RectificationController` | 处理整改提交、查询我的整改任务；`@Controller('audit/findings')` | 已验证：`server/src/modules/internal-audit/rectification/` |

## 5. 正确业务流程

**培训管理流程：**

| 步骤 | 用户动作 | 系统结果 | 绑定模块 | 缺失后果 |
|---|---|---|---|---|
| 1 | 培训负责人创建年度培训计划（year 唯一） | 创建 TrainingPlan（draft） | TrainingController | 无年度计划则培训项目无法归属 |
| 2 | 提交审批 | 状态=pending_approval，创建 UnifiedApproval 工作流 | UnifiedApprovalModule | 无审批则计划未经管理层确认 |
| 3 | 审批通过 | 状态=approved（触发 approvalCallbackRegistry 回调） | ApprovalCallbackRegistry | - |
| 4 | 创建培训项目（归属已审批计划，分配讲师、学员、关联培训资料文件） | 创建 TrainingProject（planned） | TrainingController | - |
| 5 | 更新项目状态为进行中 | 状态=ongoing（通过 PUT /projects/:id/status） | TrainingController | 注意：前端 training.ts 调用 `/projects/:id/start` POST，但服务端无此端点，需用 `PUT /projects/:id/status` 替代（GAP） |
| 6 | 学员在线考试 | 创建 ExamRecord，成绩与 LearningRecord 关联 | ExamController | 无考试则无能力验证证据 |
| 7 | 完成培训项目 | 状态=completed | TrainingController | 注意：前端调用 `/projects/:id/complete` POST，服务端无此端点（GAP） |
| 8 | 生成培训档案 | POST /training/archive/:projectId，创建 TrainingArchive，生成 PDF | ArchiveService | 无档案则培训无书面证明 |

**内审管理流程：**

| 步骤 | 用户动作 | 系统结果 | 绑定模块 | 缺失后果 |
|---|---|---|---|---|
| 1 | 内审员创建审核计划（选择审核周期、时间范围、参与文件） | 创建 AuditPlan（draft） | AuditPlanController | - |
| 2 | 启动审核 | 状态=ongoing | AuditPlanController（`POST /audit/plans/:id/start`） | 不启动则无法提交发现项 |
| 3 | 内审员逐文件记录发现结果（符合/不符合） | 为每个文件创建 AuditFinding | AuditExecutionController | 无发现记录则审核无证据链 |
| 4 | 不符合项分配整改责任人，设置整改期限 | 状态=ongoing→pending_rectification，责任人收到 TodoTask（audit_rectification） | RectificationService | 无任务通知则整改无跟踪 |
| 5 | 责任人提交整改（上传整改后文件版本） | AuditFinding.status=pending_verification，rectifiedDocumentId 记录整改证据 | RectificationController | 无整改证据则复审无依据 |
| 6 | 内审员复审整改结果 | status=verified（通过）或 rejected（驳回，循环回步骤4） | VerificationController（审批流触发：audit.findingVerified 回调） | - |
| 7 | 所有发现项完成 → 生成内审报告 | POST /audit/plans/:id/complete，创建 AuditReport，生成 PDF，归档至 Document（documentId） | ReportController | 无报告则无法提交管理评审 |

## 6. 上下游绑定关系

**培训模块上下游：**

- **上游**：Document（TrainingProject.documentIds 引用培训资料文件）；体系文件中心的 DocumentTrainingNeed（文控工作台发现某文件需要培训，可关联到 TrainingProject）
- **下游**：ManagementReview（年度培训统计汇入管理评审）；GRSS-PZ-JL-55（行政人事部工作总结）包含 TrainingRecord 实体
- **边界**：培训不参与追溯主链，不关联 ProductionBatch/MaterialLot。TrainingProject.trainees 存储 User.id 数组，复用 Employee/User 主数据。

**内审模块上下游：**

- **上游**：Document（AuditPlan.documentIds 和 AuditFinding.documentId 关联受控文件）；AuditFinding 的整改证据通过 rectifiedDocumentId 关联 Document 修订版本
- **下游**：Document（AuditReport.documentId 归档报告）；CorrectiveAction（CAPA）—— 内审不符合项应触发 CorrectiveAction，当前系统状态需确认（见 GAP）；ManagementReview（GRSS-PZ-JL-50 管理评审包含 InternalAudit 实体）；TodoTask（audit_rectification 类型）
- **边界**：内审的审核对象是文件（Document），不直接审核批次或原料。不得在内审模块中创建 ProductionBatch 或 MaterialLot 的平行记录。

## 7. 当前系统差距

| GAP 编号 | 当前问题 | 根因 | 影响后果 | 严重级别 | 验证状态 | 证据 |
|---|---|---|---|---|---|---|
| GAP-407 | 内审前端 API（`client/src/api/internal-audit/`）所有请求路径硬编码为 `/api/v1/audit/...`，而 `request.ts` 的 `baseURL` 已为 `/api/v1`，导致实际请求路径为 `/api/v1/api/v1/audit/...`（双前缀），所有内审 API 调用将失败（404） | 前端 API 文件开发时混用了绝对路径（带 `/api/v1`）和相对路径（不带前缀），与请求拦截器 baseURL 规范不一致 | 内审计划、发现项、整改、报告等所有内审核心功能均无法正常调用后端，内审模块实际上处于不可用状态 | P0 | 已验证 | `client/src/api/request.ts` 第 20 行 `baseURL: '/api/v1'`；`client/src/api/internal-audit/finding.ts` 第 74 行 `'/api/v1/audit/findings'`；`client/src/api/internal-audit/plan.ts` 第 52 行 `'/api/v1/audit/plans'`；`client/src/api/internal-audit/report.ts` 第 30 行 `'/api/v1/audit/plans/...'` |
| GAP-408 | 培训档案前端页面（`ArchiveList.vue`、`ArchiveDetail.vue`）硬编码请求路径为 `/api/v1/training/archives`（复数），但服务端 `ArchiveController` 声明路径为 `@Controller('training/archive')`（单数），加上 baseURL `/api/v1` 后实际请求为 `/api/v1/api/v1/training/archives`，产生双前缀且路径拼写不一致两个 bug | 同 GAP-8，前端直接使用绝对路径；同时 archive vs archives 拼写不一致 | 培训档案列表和详情页无法加载，档案 PDF 下载也失败；档案生成后用户无法查看 | P0 | 已验证 | `client/src/views/training/archives/ArchiveList.vue` 第 116 行 `'/api/v1/training/archives'`；`server/src/modules/training/archive.controller.ts` 第 15 行 `@Controller('training/archive')` |
| GAP-409 | 前端培训 API（`client/src/api/training.ts`）调用 `POST /training/projects/:id/start`、`POST /training/projects/:id/complete`、`POST /training/projects/:id/cancel`，但服务端 `TrainingController` 没有这三个端点（只有 `PUT /projects/:id/status`） | 前后端开发未对齐，前端先行于服务端实现，或服务端重构后未更新前端 | 培训项目状态变更（启动/完成/取消）功能全部失败（404 Not Found），培训项目卡在 planned 状态无法推进 | P0 | 已验证 | `client/src/api/training.ts` 第 130-146 行（startTrainingProject/completeTrainingProject/cancelTrainingProject）；`server/src/modules/training/training.controller.ts` 第 82-118 行（无对应端点，仅有 `PUT /projects/:id/status`） |
| GAP-410 | 内审不符合项（AuditFinding）整改完成后，当前系统无自动触发 `CorrectiveAction`（CAPA）的逻辑。业务上不符合项应进入 CAPA 闭环，但验证通过路径没有写入 `CorrectiveAction.trigger_type = 'internal_audit'` + `trigger_id = AuditFinding.id` | 内审模块实现时未与 CAPA 模块设计整合 | 内审不符合项整改完成只在内审内部闭环（verified 状态），不进入全厂 CAPA 系统追踪，管理评审无法汇总"内审触发的 CAPA 数量" | P1 | 已验证 | `server/src/prisma/schema.prisma` 第 2192-2236 行 `AuditFinding` 模型无 `correctiveActionId` 字段；`server/src/prisma/schema.prisma` 第 3068-3073 行 CorrectiveAction 已有 `trigger_type` 和 `trigger_id` |
| GAP-411 | 内审计划（AuditPlan）的 `@Controller('audit/plans')` 和内审执行（AuditExecutionController）的 `@Controller('audit')` 路径存在前缀碰撞风险：`GET /audit/plans/:id/progress`（AuditExecutionController）与 `GET /audit/plans/:id`（AuditPlanController）在 NestJS 路由解析中可能产生冲突，取决于注册顺序 | 两个 controller 使用了部分重叠的前缀 `audit` 和 `audit/plans`，且同时在 `audit/plans/:id` 前缀下提供不同子路径 | 路由解析时 `GET /audit/plans/:id/progress` 可能被 `GET /audit/plans/:id` 捕获，导致 404 或数据错误 | P1 | 未验证（需要运行系统确认） | `server/src/modules/internal-audit/audit-plan/audit-plan.controller.ts` 第 22 行 `@Controller('audit/plans')`；`server/src/modules/internal-audit/audit-execution/audit-execution.controller.ts` 第 29 行 `@Controller('audit')` |
| GAP-412 | 培训模块的 `TrainingProject.trainees` 仍为 `String[]`，桥接表迁移方案已完成设计并进入执行排期 | 现状仍使用数组存储关联而非桥接表 | 培训参与人名单仍可能包含已离职员工 ID，存在脏数据风险 | P2 | 已验证，待执行 | `server/src/prisma/schema.prisma` 第 2056 行 `trainees String[]`；计划 PR #168 已合并 |
| GAP-413 | 内审报告归档时，`AuditReport.documentId` 将报告关联到 Document 体系，但 Document 的 `document_type` 枚举中无 AUDIT_REPORT 类型（见 GAP-6），且 AuditReport 生成的 Document 条目会出现在文控受控文件列表中 | 内审与文控边界未明确隔离（同 GAP-405） | 内审报告混入受控文件列表，干扰文控专员，与 GAP-6 共享根因 | P2 | 已验证 | 与 GAP-405 证据相同 |
| GAP-414 | ManagementReview 第一版已独立建模，并自动汇总 AuditReport.summary 与 TrainingArchive 统计 | 旧版管理评审仅依赖动态表单承接 | 旧流程需要人工收集汇总证据 | P2 | 已实现（PR #182 已合并） | PR #182 `feat: GAP-414 management review modeling` |

## 8. 整改建议

| GAP 编号 | 建议整改 | 依赖模块 | 是否需要新设计 | 建议 PR | 是否可并行 |
|---|---|---|---|---|---|
| GAP-407 | 将 `client/src/api/internal-audit/` 下所有 `/api/v1/audit/...` 路径改为 `/audit/...`（去掉重复前缀），确保与 request.ts baseURL 一致 | 无 | 否 | fix/internal-audit-api-prefix | 是 |
| GAP-408 | 修复培训档案前端路径：将 `/api/v1/training/archives` 改为 `/training/archive`（去掉 `/api/v1` 并修正 archive 单数）；或将服务端 `@Controller('training/archive')` 改为 `@Controller('training/archives')` 并统一为复数 | 无 | 否 | fix/training-archive-route-mismatch | 是 |
| GAP-409 | 在服务端 `TrainingController` 增加 `POST /projects/:id/start`、`POST /projects/:id/complete`、`POST /projects/:id/cancel` 端点，或在前端 training.ts 将这三个函数改用 `PUT /projects/:id/status` + body | 无 | 否（推荐统一为 status 端点） | fix/training-project-status-endpoints | 是 |
| GAP-410 | 不新增 `AuditFinding.correctiveActionId`；复用 `CorrectiveAction.trigger_type = 'internal_audit'` + `trigger_id = AuditFinding.id`，在内审不符合项整改验证通过（verified）时幂等创建 CAPA | CorrectiveAction 模块；依赖 GAP-316 CAPA 来源校验与反查合同 | 是 | feat/audit-finding-to-capa-linkage | 是（GAP-316 后执行） |
| GAP-411 | 将 AuditExecutionController 的 `@Controller('audit')` 改为 `@Controller('audit/executions')` 或合并到 AuditPlanController，消除路径前缀碰撞 | 内审模块 | 否 | fix/audit-controller-prefix-conflict | 否（需先运行系统确认实际是否冲突） |
| GAP-412 | 保持既有设计：将 TrainingProject 学员关系迁移为 `TrainingProjectTrainee(projectId, userId)` 桥接表，待执行 | 培训模块、User 模块 | 是（schema 变更） | refactor/training-project-trainee-table | 否（需数据迁移） |
| GAP-413 | 同 GAP-405 整改方案：为内审归档的 Document 设置专属 document_type 标签 | 内审模块、文控模块 | 否 | 合并至 fix/audit-report-document-type-tag | 是 |
| GAP-414 | 已完成：ManagementReview 第一版独立模型与聚合接口已落地，无需继续排期 | 内审模块、培训模块、文控模块 | 是 | 已合并 | 否 |

## 9. 证据索引

- `server/src/prisma/schema.prisma` 第 2027 行：TrainingPlan 模型
- `server/src/prisma/schema.prisma` 第 2047 行：TrainingProject 模型（注意 trainees String[] 字段第 2056 行）
- `server/src/prisma/schema.prisma` 第 2136 行：TrainingArchive 模型
- `server/src/prisma/schema.prisma` 第 2155 行：AuditPlan 模型
- `server/src/prisma/schema.prisma` 第 2192 行：AuditFinding 模型（无 correctiveActionId 字段）
- `server/src/prisma/schema.prisma` 第 2240 行：AuditReport 模型
- `server/src/prisma/schema.prisma` 第 3055 行：CorrectiveAction.trigger_type 有 `internal_audit` 枚举值但无外键
- `server/src/modules/training/training.controller.ts` 第 24 行：`@Controller('training')`，第 82-118 行：无 start/complete/cancel 端点
- `server/src/modules/training/archive.controller.ts` 第 15 行：`@Controller('training/archive')`（单数）
- `server/src/modules/training/training.module.ts`：TrainingModule 完整结构
- `server/src/modules/internal-audit/audit-plan/audit-plan.controller.ts` 第 22 行：`@Controller('audit/plans')`
- `server/src/modules/internal-audit/audit-execution/audit-execution.controller.ts` 第 29 行：`@Controller('audit')`
- `server/src/modules/internal-audit/rectification/`：RectificationController，`@Controller('audit/findings')`
- `server/src/modules/internal-audit/report/`：ReportController，`@Controller('audit')`
- `server/src/modules/internal-audit/internal-audit.module.ts`：InternalAuditModule，audit.findingVerified 审批回调
- `server/src/main.ts` 第 51 行：`app.setGlobalPrefix('api/v1')`（导致 GAP-8、GAP-9）
- `client/src/api/request.ts` 第 20 行：`baseURL: '/api/v1'`（导致 GAP-8、GAP-9）
- `client/src/api/training.ts` 第 130-146 行：前端调用不存在的 start/complete/cancel 端点（GAP-10）
- `client/src/api/internal-audit/finding.ts` 第 74 行：双前缀 `/api/v1/audit/findings`（GAP-8）
- `client/src/api/internal-audit/plan.ts` 第 52 行：双前缀 `/api/v1/audit/plans`（GAP-8）
- `client/src/api/internal-audit/report.ts` 第 30 行：双前缀 `/api/v1/audit/...`（GAP-8）
- `client/src/views/training/archives/ArchiveList.vue` 第 116 行：硬编码 `/api/v1/training/archives`（GAP-9）
- `client/src/views/training/archives/ArchiveDetail.vue` 第 91 行：硬编码 `/api/v1/training/archives/:id`（GAP-9）
- `client/src/router/index.ts` 第 513-565 行：培训模块路由；第 569-601 行：内审模块路由

## 10. 禁止重复实现与事实源边界

| 对象 | 当前事实源 | 允许展示字段 | 禁止新增的平行事实源 | 旧字段或旧模块处理 |
|---|---|---|---|---|
| 培训计划 | `TrainingPlan` | year, title, status | 禁止体系文件中心或管理评审模块重建培训计划副本 | 无 |
| 培训项目与档案 | `TrainingProject` + `TrainingArchive` | department, scheduledDate, attendeeCount, passedCount | 禁止在 RecordTemplate/Record 中建立平行的培训出勤事实 | 无 |
| 培训需求（文控派生） | `DocumentTrainingNeed`（派生） | linkedTrainingProjectId（投影） | 禁止在体系文件中心存储培训出勤、考试成绩等培训事实 | 无 |
| 内审计划与发现 | `AuditPlan` + `AuditFinding` | planId, documentId, auditResult, status | 禁止在体系文件中心建立 AuditFinding 副本；禁止在业务模块建立局部内审记录替代全厂内审系统 | 无 |
| 内审报告 | `AuditReport`（归档至 Document） | summary, pdfUrl, documentId | 内审报告事实在 AuditReport，Document 仅作归档存储；禁止在 RecordTemplate/Record 中平行维护内审报告 | 补 document_type 标签区分受控文件与内审归档（GAP-14） |
| CAPA 关联 | `CorrectiveAction`（独立模块） | trigger_type = internal_audit, trigger_id = AuditFinding.id | 禁止在 AuditFinding 中建立整改闭环替代 CAPA；整改证据需最终在 CorrectiveAction 中关联 | 复用 CAPA 多态来源合同，不新增 AuditFinding FK（GAP-410） |
| 管理评审汇总 | 待定（建议 ManagementReview 独立模型） | AuditReport.summary, TrainingArchive 统计 | 禁止分散在各部门 RecordTemplate/Record 中各自维护管理评审数据 | 短期 RecordTemplate 过渡，长期独立建模（GAP-15） |

## 11. 后续整改入口

| 优先级 | GAP 编号 | 推荐 PR | 前置依赖 | 可并行 | 验收命令 |
|---|---|---|---|---|---|
| P0 | GAP-407 | fix/internal-audit-api-prefix | 无 | 是 | 在浏览器网络面板中，`/internal-audit/plans` 页面请求应为 `GET /api/v1/audit/plans`（非 `/api/v1/api/v1/...`），返回 200 |
| P0 | GAP-408 | fix/training-archive-route-mismatch | 无 | 是 | `/training/archives` 页面能加载档案列表，请求路径为 `GET /api/v1/training/archive`，返回 200 |
| P0 | GAP-409 | fix/training-project-status-endpoints | 无 | 是 | 调用前端 `startTrainingProject` 后，项目状态变为 ongoing（200 而非 404） |
| P1 | GAP-410 | feat/audit-finding-to-capa-linkage | GAP-316 CAPA 来源校验与反查合同 | 是（GAP-316 后） | 验证内审不符合项 verified 后，CorrectiveAction 表中出现对应记录，`trigger_type = 'internal_audit'`，`trigger_id = AuditFinding.id` |
| P1 | GAP-411 | fix/audit-controller-prefix-conflict | 需先运行系统确认实际冲突 | 否 | `GET /api/v1/audit/plans/:id/progress` 返回正确进度数据，而非被 `GET /api/v1/audit/plans/:id` 拦截 |
| P2 | GAP-412 | refactor/training-project-trainee-table | 无 | 否（需数据迁移） | 计划已合并，待实现；学员关系最终应迁移为 training_project_trainees |
| P2 | GAP-413 | 合并至 fix/audit-report-document-type-tag | 内审模块 | 是 | /documents 文件列表不出现 AuditReport 来源的条目 |
| P2 | GAP-414 | 已合并 | 无 | 否 | PR #182 已合并；ManagementReview 已可聚合内审摘要和培训统计 |
