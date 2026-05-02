# GAP-414 ManagementReview 建模设计

## 背景和现状

`ManagementReview` 是管理层对质量和食品安全管理体系适宜性、充分性、有效性的年度评审。它不是追溯主链对象，但会汇总追溯演练、召回、供应商评价、CAPA、食品安全目标、部门年度总结、培训和内审结果，是治理与持续改进层的聚合对象。

当前 GAP-414 已验证：

- `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 将 `ManagementReview / 管理评审` 标记为“未独立建模，当前更适合 RecordTemplate/Record，待收敛”，同时明确“管理评审不是孤立文档，而是跨模块输入汇编”。
- `docs/superpowers/specs/2026-04-24-model-landing-layer-design.md` 的冻结模型落地层将 `SF-governance-management-review` 定义为“治理与闭环 / 双轨 / 新增管理评审对象”，并给出动作 `ACT-add-management-review`：输入、会议、输出、跟踪建议围绕同一对象建模。
- 真实源表单中，GRSS-PZ-JL-53《管理评审计划》定义年度、评审时间、地点、材料提交截止日期、参加人员范围和 20 项评审内容；GRSS-PZ-JL-51《管理评审会议纪要》定义会议记录和结论摘要；GRSS-PZ-JL-52《管理评审报告》定义评审输出和改进措施；GRSS-PZ-JL-46 到 GRSS-PZ-JL-56 是部门输入材料。
- 当前 Prisma schema 中没有 `ManagementReview` 模型，也没有管理评审 API 或页面。
- 培训模块已有 `TrainingPlan`、`TrainingProject`、`LearningRecord`、`TrainingArchive`；`ArchiveService.normalizeArchive()` 已能提供 `attendeeCount`、`passedCount`、`departmentName`、`trainingDate` 等年度培训输入。
- 内审模块已有 `AuditPlan`、`AuditFinding`、`AuditReport`；`AuditReport.summary` 已结构化保存 `totalDocuments`、`conformCount`、`nonConformCount`、`byLevel`、`byDepartment`、`byIssueType`。

因此，GAP-414 不再缺少业务边界：第一版应建立独立 `ManagementReview` 聚合对象，并且只复用现有 `AuditReport` 和 `TrainingArchive` 作为自动汇总输入；RecordTemplate/Record 保留为原始表单证据和双轨展示层，Document 保留为输出归档证据，二者不能继续充当管理评审事实源或第一版输入来源。

## 当前代码事实源

- `server/src/prisma/schema.prisma`
  - `TrainingPlan.year` 年度唯一，`TrainingProject.planId` 绑定年度计划。
  - `TrainingArchive.projectId` 唯一，关联 `TrainingProject`，`documentId` 可归档到文档系统。
  - `AuditReport.planId` 唯一，关联 `AuditPlan`，`summary Json` 已保存内审统计。
  - `RecordTemplate` / `Record` 是动态表单引擎，适合保存表单原文和签批证据，不适合作为跨模块聚合事实源。
  - `Document` 是高复用受控文件/归档文件事实源，可被管理评审输出报告引用。
- `server/src/modules/training/archive.service.ts`
  - `findArchives()` 和 `findArchiveById()` 已返回 `projectTitle`、`departmentName`、`trainingDate`、`attendeeCount`、`passedCount`。
- `server/src/modules/internal-audit/report/report.service.ts`
  - `calculateSummary()` 已按文件数、符合/不符合数、文件层级、部门、问题类型生成汇总。
- `client/src/router/index.ts`
  - 现有培训和内审页面已经在同一主路由下注册；管理评审可以作为治理入口新增 `/management-reviews`。

## 业务边界

本 GAP 建立最小可执行的管理评审聚合链：

- 新增 `ManagementReview` 作为年度管理评审事实源，按 `companyId + year` 保持年度唯一。
- 新增 `ManagementReviewInput` 保存输入材料快照。第一版输入材料只来自：
  - `AuditReport`：内审报告汇总。
  - `TrainingArchive`：培训项目归档和考试通过情况。
- 新增 `ManagementReviewAction` 保存评审输出的改进措施、责任部门、责任人、期限和关闭状态。
- 管理评审服务提供“收集输入材料”动作，从现有 `AuditReport` 和 `TrainingArchive` 生成输入快照，不复制 AuditReport 或 TrainingArchive 事实。
- 前端新增管理评审列表和详情页，支持创建年度评审、触发输入收集、查看自动汇总和维护改进措施。
- `RecordTemplate/Record` 双轨保留：GRSS-PZ-JL-50/51/52/53 这类表单原文仍保留在动态表单系统中；第一版只允许 `ManagementReview` 关联 `meetingMinutesRecordId`、`reportRecordId` 作为会议纪要和报告证据，不提供 `ManagementReviewInput.sourceType = record` 输入能力。
- `Document` 只作为 `reportDocumentId` 输出归档证据；第一版不提供 `ManagementReviewInput.sourceType = document` 输入能力。

## 不做什么

- 不把管理评审做成仅 `RecordTemplate/Record` 的普通表单；独立模型是事实源。
- 不在管理评审模块复制培训项目、培训档案、内审报告、CAPA、召回、追溯演练或供应商评价的主数据。
- 不自动生成 GRSS-PZ-JL-52 管理评审报告 PDF；第一版只保存结构化评审对象、自动输入快照和改进措施，可在评审完成时关联已有 `Document` 或 `Record` 作为输出证据。
- 不实现手工输入、Record 输入、Document 输入，也不实现追溯演练、ProductRecall、SupplierEvaluation、CorrectiveAction 的完整自动汇总适配器；这些来源后续在各模块稳定并另写合同后补适配器。
- 不改 `AuditReport.summary`、`TrainingArchive`、`RecordTemplate`、`Record` 的既有语义。
- 不触碰 `ProductionBatch / MaterialBatch / BatchMaterialUsage / InventoryMovement` 主追溯链。

## 数据、接口和页面影响

### 数据影响

新增三个 Prisma 模型：

- `ManagementReview`
  - 年度、标题、状态、评审时间、地点、材料提交截止日期、目的、评审范围、参会人员、创建人、完成时间、输出报告关联。
  - `@@unique([companyId, year])` 防止同租户同年度重复评审。
- `ManagementReviewInput`
  - 关联 `ManagementReview`，保存来源类型、来源 ID、部门、标题、摘要 JSON、是否纳入评审。
  - `sourceType` 第一版只允许 `audit_report` 和 `training_archive`；`sourceId` 必填。
  - `@@unique([reviewId, sourceType, sourceId])` 防止同一个来源重复进入同一次评审。
- `ManagementReviewAction`
  - 关联 `ManagementReview`，保存改进措施、责任部门、责任人、期限、状态、验证说明和关闭时间。

### 接口影响

新增后端模块 `management-review`：

- `POST /management-reviews`：创建年度管理评审。
- `GET /management-reviews`：按年度、状态查询列表。
- `GET /management-reviews/:id`：查看详情，包含输入材料和改进措施。
- `POST /management-reviews/:id/collect-sources`：从当前年度 `AuditReport` 和 `TrainingArchive` 收集输入快照。
- `POST /management-reviews/:id/actions`：新增改进措施。
- `PATCH /management-reviews/:id/actions/:actionId`：更新改进措施状态和验证说明。
- `POST /management-reviews/:id/complete`：标记评审完成，可写入 `reportDocumentId` 或 `reportRecordId`。

### 页面影响

新增前端入口：

- `/management-reviews`：年度管理评审列表，可创建年度评审。
- `/management-reviews/:id`：详情页展示评审计划信息、输入材料、自动汇总、改进措施。

页面展示必须突出事实源：

- 内审输入显示 `AuditReport` 标题、年度、文件总数、符合数、不符合数。
- 培训输入显示 `TrainingArchive` 对应项目、部门、参训人数、通过人数。
- 不展示手工/记录/文档输入入口；Record/Document 仅在评审完成或证据区作为会议纪要、评审报告归档引用。

## 历史数据和迁移策略

本 GAP 新增独立模型，不强制迁移既有动态表单历史记录。

迁移策略：

1. 新建 `management_reviews`、`management_review_inputs`、`management_review_actions` 三张表。
2. 不回填历史 `Record` 数据；历史管理评审表单继续保留在动态表单或文档系统中。
3. 执行 agent 不得在本 GAP 中提供手动 `Record` / `Document` / `manual` 输入能力；如需要把历史 Record 作为输入来源，必须另写 schema/API 合同和数据归属规则。
4. 新创建的管理评审从实施后开始按 `ManagementReview` 作为事实源，动态表单和文档只作为证据附件或输出归档。

## Superpower 与 grill-me 校准记录

- **任务类型判断：** GAP-414 是 `needs_spec`，影响 schema、跨模块治理链和 RecordTemplate/Record 与独立业务表的取舍，必须走 `brainstorming -> grill-with-docs -> writing-plans`。
- **brainstorming 结论：** 推荐“独立 `ManagementReview` 聚合对象 + AuditReport/TrainingArchive 自动输入快照 + 改进措施 + Record/Document 输出证据”。只使用 RecordTemplate/Record 无法稳定聚合 AuditReport 和 TrainingArchive；把 manual/record/document 输入和所有治理来源一次性接入会扩大 schema/API 合同，超出本 PR 可执行边界。
- **grill-with-docs 校准结论：**
  - 与 `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 不冲突；该文档虽写“当前更适合 RecordTemplate/Record”，但同时要求“管理评审不是孤立文档，而是跨模块输入汇编”，冻结 model-landing 已将其收敛为新增双轨对象。
  - 不重复造主数据或事实源；`AuditReport`、`TrainingArchive` 只作为自动输入来源引用和快照，`Record`、`Document` 只作为会议纪要或输出报告证据。
  - 不引入平行批次链路；管理评审不直接关联 `ProductionBatch` 或 `MaterialBatch`。
  - 不破坏 `ProductionBatch / MaterialBatch / BatchMaterialUsage / InventoryMovement` 主链。
  - 不需要迁移历史数据；历史 Record/Document 保留，不自动猜测归属。
  - 不需要用户业务确认；源表单已明确年度频率、计划、会议纪要、报告、部门输入和改进措施边界。
  - 可拆成独立小 PR：新增 ManagementReview 核心模型、后端汇总服务、基础页面和 focused tests。
  - 可由执行 agent 按 `superpowers:executing-plans` 独立完成。

## 验收标准

- Prisma schema 中存在 `ManagementReview`、`ManagementReviewInput`、`ManagementReviewAction` 三个模型。
- 同一 `companyId + year` 只能创建一个 `ManagementReview`。
- `POST /management-reviews/:id/collect-sources` 能把该年度 `AuditReport.summary` 转为 `ManagementReviewInput`，且重复执行不产生重复输入。
- `POST /management-reviews/:id/collect-sources` 能把该年度 `TrainingArchive` 的 `attendeeCount`、`passedCount`、通过率转为 `ManagementReviewInput`，且重复执行不产生重复输入。
- `ManagementReviewInput` 只保存快照和来源引用，不复制或覆盖 `AuditReport`、`TrainingArchive` 原事实。
- 管理评审详情页能展示年度、状态、输入材料和改进措施。
- 管理评审详情页能触发输入收集并刷新输入列表。
- 可新增、更新 `ManagementReviewAction`，用于管理评审输出的改进措施跟踪。
- `(cd server && npx prisma validate --schema src/prisma/schema.prisma)` 通过。
- `(cd server && npm test -- management-review.service.spec.ts --runInBand)` 通过。
- `npm run build -w client` 通过。
