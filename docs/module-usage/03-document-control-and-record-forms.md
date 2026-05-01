# 体系文件中心与记录表单管理

---
module_id: document-control-and-record-forms
business_chain:
  - 治理记录链：Document → DocumentVersion → DocumentIssuance → DocumentReadRequirement → DocumentReadConfirmation
  - 记录表单索引链：RecordFormLandingEntry → RecordTemplate → Record → RecordTaskAssignment → RecordTaskInstance
  - 文控运营链：DocumentTrainingNeed → DocumentAuditCoverageService → DocumentImpactReview → DocumentControlWorkbenchService
module_type:
  - 治理记录
  - 动态表单表现层
  - 主数据治理入口
source_of_truth:
  - Document（受控文件）
  - RecordTemplate + Record（动态表单）
  - RecordFormLandingEntry（04 记录表单索引落地映射）
facts_or_projections:
  - Document：事实源（文件版本、状态、编号、内容）
  - RecordFormLandingEntry：治理元数据（表单落地状态，非业务事实）
  - RecordTemplate / Record：事实源（动态表单字段定义和填写记录）
  - DocumentTrainingNeed / DocumentAuditCoverageService：文控派生投影（不是培训/内审事实源）
downstream_consumers:
  - 内审模块（AuditPlan.documentIds 引用 Document.id，AuditFinding.documentId 关联 Document）
  - 培训模块（TrainingProject.documentIds 引用 Document.id，DocumentTrainingNeed 链接 TrainingProject）
  - 各业务模块记录填写（Record 通过 RecordTemplate 落地）
  - 追溯链（部分追溯记录通过 RecordTemplate/Record 落地）
current_entrypoints:
  - /documents — SystemDocumentCenter.vue — 受控文件主列表
  - /documents/control/record-form-index — RecordFormLandingIndex.vue — 04 记录表单索引
  - /documents/control/workbench — DocumentControlWorkbench.vue — 文控工作台
  - /documents/control/workbench/issues — DocumentControlIssueList.vue — 问题明细
  - /documents/operations/read-confirmations — ReadConfirmationCenter.vue — 阅读确认
  - /documents/operations/training-needs — TrainingNeedCenter.vue — 培训需求（文控派生）
  - /documents/operations/audit-coverage — AuditCoverageCenter.vue — 审核覆盖（文控派生）
  - /documents/operations/impact — ImpactAnalysisWorkbench.vue — 影响分析
  - /documents/operations/audit-chain — AuditChainExplorer.vue — 审核链路
  - /documents/control/number-rules — NumberRuleCenter.vue — 编号规则
  - /templates — TemplateList.vue — 动态表单模板（RecordTemplate）
  - /records — RecordList.vue — 动态表单填写记录（Record）
  - /records/fill/:templateId — RecordFill.vue — 新建填写
  - /records/task/:instanceId — RecordFill.vue — 任务触发填写
last_verified_commit: 7bab98dc3ccd49e8e1d76b95b28a1b79207c483c
---

## 1. 模块定位

体系文件中心不是单纯的文件库，而是食品安全体系文件的治理平台。它管辖三类受控对象：

```
体系文件中心
├── 受控文件（Document）：01 管理手册 / 02 程序文件 / 03 作业指导书 / 05 公司文件 / 06 外来文件
├── 记录表单索引（RecordFormLandingEntry）：04 记录表单索引，管理 283 张源表单与落地入口的映射关系
└── 动态表单引擎（RecordTemplate + Record）：用于承接那些无独立业务模块的表单填写
```

三个概念的分离边界（这是核心认知问题）：

| 概念 | 含义 | 当前代码落点 |
|---|---|---|
| 04 记录表单索引 | 283 张源表单编号与落地入口的治理映射表（不是实际数据） | `RecordFormLandingEntry` 模型，`RecordFormLandingIndex.vue` 页面 |
| 动态表单（RecordTemplate/Record） | 通用表单引擎，承接无独立业务模型的表单填写 | `RecordTemplate` + `Record` 模型，`RecordFill.vue` 页面 |
| 业务模块 Landing | 已有独立业务模型的模块（如 IncomingInspection、ProductionBatch）承接表单记录 | 各业务模块独立路由，RecordFormLandingEntry.targetModule/targetRoute 指向 |

**体系文件中心不存储培训记录、内审记录、CAPA 记录或追溯记录的业务事实**。它通过 `DocumentTrainingNeed`（文控派生）和 `DocumentAuditCoverageService`（派生查询）提供治理视图，但培训和内审事实分别由各自独立模块管理。

## 2. 使用角色

| 角色 | 使用目的 | 关键动作 |
|---|---|---|
| 文控专员（品质部 / 行政人事） | 维护受控文件版本、发放、阅读确认 | 上传文件、发布、归档、作废、发起修订、配置阅读要求 |
| 文控管理员 | 维护 04 记录表单索引落地状态、编号规则、工作台问题处理 | 确认落地策略、维护 RecordFormLandingEntry、编号规则配置 |
| 部门负责人 | 查阅本部门文件、确认阅读 | 文件详情查看、确认已阅 |
| 填表操作员 | 通过动态表单入口填写记录 | 打开 RecordFill.vue，填写并提交 Record |
| 系统管理员 | 配置动态表单模板 | 在 /templates 设计 RecordTemplate |
| 内审员 | 查阅文件作为内审证据 | 浏览 DocumentDetail.vue，内审通过 AuditPlan 关联文档 ID |

## 3. 当前入口

| 入口 | 页面 | 前端 API | 后端 API | 后端模块 |
|---|---|---|---|---|
| 受控文件列表 | `/documents` → `SystemDocumentCenter.vue` | `GET /documents` (document-control.ts) | `GET /api/v1/documents` | `DocumentController` |
| 文件详情 | `/documents/:id` → `DocumentDetail.vue` | `GET /documents/:id` | `GET /api/v1/documents/:id` | `DocumentController` |
| 文件上传 | `/documents/upload/:level` → `DocumentUpload.vue` | `POST /documents/upload` | `POST /api/v1/documents/upload` | `DocumentController` |
| 04 记录表单索引 | `/documents/control/record-form-index` → `RecordFormLandingIndex.vue` | `GET /documents/record-form-index` | `GET /api/v1/documents/record-form-index` | `RecordFormLandingService` via `DocumentController` |
| 文控工作台 | `/documents/control/workbench` → `DocumentControlWorkbench.vue` | `GET /documents/control/workbench` | `GET /api/v1/documents/control/workbench` | `DocumentControlWorkbenchService` |
| 阅读确认中心 | `/documents/operations/read-confirmations` → `ReadConfirmationCenter.vue` | `GET /documents/:id/read-status` | `GET /api/v1/documents/:id/read-status` | `DocumentReadRequirementService` |
| 培训需求中心（文控派生） | `/documents/operations/training-needs` → `TrainingNeedCenter.vue` | `GET /documents/control/training-needs` | `GET /api/v1/documents/control/training-needs` | `DocumentTrainingNeedService` |
| 审核覆盖中心（文控派生） | `/documents/operations/audit-coverage` → `AuditCoverageCenter.vue` | `GET /documents/control/audit-coverage` | `GET /api/v1/documents/control/audit-coverage` | `DocumentAuditCoverageService` |
| 动态表单模板 | `/templates` → `TemplateList.vue` | `record-template.ts` | `GET /api/v1/record-templates` | `RecordTemplateController` |
| 动态表单填写 | `/records/fill/:templateId` → `RecordFill.vue` | `record.ts` / `new-record.ts` | `POST /api/v1/records` | `RecordController` |
| 动态表单记录列表 | `/records` → `RecordList.vue` | `GET /records` | `GET /api/v1/records` | `RecordController` |
| 文件发放记录 | `/document-issuances` → `DocumentIssuanceList.vue` | `document-issuance.ts` | `GET /api/v1/document-issuances` | `DocumentIssuanceController` |

## 4. 当前实现

| 对象 | 当前实现 | 说明 |
|---|---|---|
| `Document` | Prisma 模型，6 种 document_type，支持版本化（DocumentVersion）、生命周期（draft→pending→effective→archived/obsolete）、Markdown 正文、跨文档引用（DocumentReference） | 已验证：`server/src/prisma/schema.prisma` 第 280 行 |
| `DocumentVersion` | 版本历史表，与 Document 一对多 | 已实现，版本号为 Decimal，当前展示存在乱码问题（GAP 见第 7 节） |
| `RecordFormLandingEntry` | 记录表单落地映射表，sourceCode 唯一，持有 targetModule / targetModel / targetRoute / targetTemplateId / landingStrategy / landingStatus 等治理字段 | 已验证：`server/src/prisma/schema.prisma` 第 2563 行 |
| `RecordTemplate` | 动态表单模板，fieldsJson 存储字段定义，支持版本化（templateFamilyId + version）、批次关联（batchLinkEnabled）、审批工作流 | 已验证：`server/src/prisma/schema.prisma` 第 770 行 |
| `Record` | 动态表单填写实例，dataJson 存储数据，支持 productionBatchId 关联追溯链 | 已验证：`server/src/prisma/schema.prisma` 第 825 行 |
| `RecordTaskAssignment` / `RecordTaskInstance` | 任务驱动的表单填写调度（定期任务自动触发） | 已验证：schema 第 2368、2393 行 |
| `DocumentIssuance` | 文件发放记录（线下实物发放登记），对应 GRSS-XZ-JL-02、GRSS-XZ-JL-23 等表单 | 已实现，但与 Document.id 无外键关联（GAP） |
| `NumberRule` + `PendingNumber` | 编号规则，支持年度重置，服务于文件编号生成 | 已实现，`NumberRuleService` 在 `DocumentController` 中暴露 |
| `DocumentTrainingNeed` | 文控派生培训需求（不是培训记录事实源），可关联到 TrainingProject | 已验证：schema 第 3741 行 |
| `DocumentAuditCoverageService` | 派生审核覆盖统计（不是内审事实源） | 已实现，`/documents/control/audit-coverage` |
| `DocumentImpactReview` / `DocumentImpactItem` | 文档变更影响分析 | 已实现 |
| `BusinessDocumentLink` | 业务对象与文档的桥接关系 | 已实现，schema 第 2540 行 |

## 5. 正确业务流程

**受控文件治理流程：**

| 步骤 | 用户动作 | 系统结果 | 绑定模块 | 缺失后果 |
|---|---|---|---|---|
| 1 | 文控专员上传文件（选择分级和文档类型） | 系统生成 Document，按 NumberRule 分配编号，状态=draft | NumberRuleService, DocumentService | 无编号规则则编号混乱 |
| 2 | 提交审批 | 状态=pending，创建 Approval 或 UnifiedApproval 工作流实例 | UnifiedApprovalModule | 跳过审批则发布无管控 |
| 3 | 审批通过 | 状态=effective，DocumentVersion 记录版本 | DocumentLifecycleService | - |
| 4 | 配置阅读要求 | 创建 DocumentReadRequirement，相关人员收到阅读确认任务 | DocumentReadRequirementService | 无阅读确认则合规依据缺失 |
| 5 | 发起修订 | 创建 revision 草稿 Document（revisionOfId 指向原文件） | DocumentLifecycleService | 原地修改则版本历史断裂 |
| 6 | 文件到期或变更触发影响分析 | 创建 DocumentImpactReview，关联受影响下游文件或记录表单 | DocumentImpactService | 变更影响无法追踪 |
| 7 | 归档/作废 | 状态=archived 或 obsolete，archiveReason 记录原因 | DocumentLifecycleService | - |

**记录表单索引治理流程（04 表单索引）：**

| 步骤 | 用户动作 | 系统结果 | 绑定模块 | 缺失后果 |
|---|---|---|---|---|
| 1 | 文控专员查看 RecordFormLandingIndex，识别 unimplemented 表单 | 页面展示 283 张表单的落地状态（已落地/未落地/待确认） | RecordFormLandingService | 表单索引缺失则无法追踪落地进度 |
| 2 | 系统建议落地策略（AI suggestion） | 返回建议的 targetModule / targetTemplateId | RecordFormLandingService.getSuggestion | 无建议则人工维护成本高 |
| 3 | 文控专员确认落地策略 | 更新 RecordFormLandingEntry.landingStatus=implemented，confirmationStatus=confirmed | RecordFormLandingService.confirm | 不确认则工作台持续报告 unconfirmed_landing_targets 问题 |
| 4 | 字段覆盖检查 | 系统对比源表单字段与目标模块字段差异 | RecordFormLandingEntry.fieldCoverageStatus | 字段缺失则数据合规性无保障 |

## 6. 上下游绑定关系

**体系文件中心作为上游时，下游模块引用规则：**

- **内审模块**：`AuditPlan.documentIds[]` 直接存储 `Document.id`，`AuditFinding.documentId` 关联 `Document`。内审事实（AuditPlan、AuditFinding）的事实源在内审模块，不在体系文件中心。体系文件中心通过 `DocumentAuditCoverageService` 提供聚合视图，但不拥有内审数据。
- **培训模块**：`TrainingProject.documentIds[]` 存储 `Document.id`。体系文件中心的 `DocumentTrainingNeed` 是由文控工作台发现"某文件需要培训"时生成的派生需求，可与 `TrainingProject` 关联，但培训记录事实在培训模块。
- **动态表单**：`RecordFormLandingEntry.targetTemplateId` 指向 `RecordTemplate`，`RecordTemplate` 的 `Record` 为实际填写事实。文控索引是指针层，动态表单是实际数据层。
- **业务模块（如 IncomingInspection、ProductionBatch）**：`RecordFormLandingEntry.targetModule` 和 `targetRoute` 指向业务模块路由，实际数据不存在体系文件中心。
- **CAPA（CorrectiveAction）**：体系文件中心不创建 CAPA 记录，不拥有 CAPA 事实。CAPA 由独立 CorrectiveAction 模块管理。
- **追溯**：体系文件中心不参与追溯主链（MaterialLot→IngredientUsage→ProductionBatch）。Record 可通过 `productionBatchId` 关联批次，但追溯查询必须经过 `TraceabilityQueryService`。

## 7. 当前系统差距

| GAP 编号 | 当前问题 | 根因 | 影响后果 | 严重级别 | 验证状态 | 证据 |
|---|---|---|---|---|---|---|
| GAP-400 | Document.version 字段类型为 `Decimal(3,1)`，前端展示为乱码（如 "1.0" 的 Decimal 对象） | schema 设计使用 Prisma Decimal 而非 String 或 Int | 用户界面版本号不可读，影响文件识别和合规审计 | P1 | 已验证 | `server/src/prisma/schema.prisma` 第 289 行：`version Decimal @default(1.0) @db.Decimal(3, 1)`；spec 文件 `docs/superpowers/specs/2026-04-28-document-control-and-record-form-governance-design.md` 第 11 行已记录此问题 |
| GAP-401 | DocumentIssuance 模型（`server/src/prisma/schema.prisma` 第 3485 行）无 `documentId` 外键，无法与 Document 关联 | 早期实现将发放记录作为独立登记表，未关联受控文件 | 文件发放台账（GRSS-XZ-JL-02、GRSS-XZ-JL-23）与受控文件版本脱节，无法验证发放的是否为有效版本 | P1 | 已验证 | `server/src/prisma/schema.prisma` 第 3485-3498 行无 documentId 字段 |
| GAP-402 | `documents/operations/training-needs` 页面（TrainingNeedCenter）展示的是文控派生培训需求（DocumentTrainingNeed），与培训模块的 TrainingProject 是两套入口，用户容易混淆两者定位 | 文控派生需求与培训模块实体语义相近，但入口独立 | 文控专员和培训负责人可能在两处重复维护培训信息，产生平行事实风险 | P2 | 已验证 | `client/src/api/document-operations.ts` 第 10-29 行；`client/src/router/index.ts` 第 90-93 行（documents/operations/training-needs）；`client/src/router/index.ts` 第 513-565 行（独立培训模块路由） |
| GAP-403 | 04 记录表单索引（RecordFormLandingIndex.vue）目前是手工维护入口，landingStatus 大量为 unimplemented，文控工作台报告大量 missingLandingTargets 和 unconfirmedLandingTargets 类型问题 | 283 张表单未全部完成落地映射确认 | 无法向监管机构证明所有源表单均有数字化落地入口 | P2 | 已验证 | `client/src/api/document-control.ts` WorkbenchIssueType 枚举包含 `missingLandingTargets`、`unconfirmedLandingTargets`；`RecordFormLandingEntry.landingStatus @default("unimplemented")` |
| GAP-404 | 动态表单 RecordTemplate 版本管理中 `templateFamilyId + version` 的唯一约束已实现，但前端 `TemplateEdit.vue` 的 `updateFields` 调用与后端接口字段存在不一致风险 | 前端改版过程中接口版本演进不同步 | 模板字段更新可能静默失败，影响表单填写 | P2 | 未验证（需运行系统确认） | spec 文件 `docs/superpowers/specs/2026-04-28-document-control-and-record-form-governance-design.md` 第 77 行：「前端 updateFields 与后端接口存在不一致风险」 |
| GAP-405 | AuditReport 完成后生成 PDF 并存入 Document（`AuditReport.documentId` 关联 Document），等于内审报告被归入文控文件体系。但体系文件中心的 document_type 枚举不包含 AUDIT_REPORT 类型，导致内审报告与受控文件混在同一个列表 | AuditReport 设计时将归档文件引用了 Document 模型，但未对 document_type 进行分类区分 | 内审报告出现在受控文件列表中，干扰文控专员查阅，也不符合内审文件应由内审模块管理的边界原则 | P2 | 已验证 | `server/src/prisma/schema.prisma` 第 2255-2260 行 `AuditReport.documentId String`；`document-control.constants.ts` 第 1-8 行 DOCUMENT_TYPES 枚举无 AUDIT_REPORT 类型 |
| GAP-406 | `DocumentVersion` 的 version 字段也是 Decimal，与 Document 主表版本号问题一致，且缺少 V1/V2/V3 语义的修订版本号展示规则 | 版本设计决策问题 | 用户无法区分文件是"1.1 小修"还是"V2 大修"，影响体系文件管理规范性 | P2 | 已验证 | `server/src/prisma/schema.prisma` 第 386 行 `model DocumentVersion` |

## 8. 整改建议

| GAP 编号 | 建议整改 | 依赖模块 | 是否需要新设计 | 建议 PR | 是否可并行 |
|---|---|---|---|---|---|
| GAP-400 | 将 Document.version 修改为 `Int versionNo`（已存在此字段），在前端展示为 `V${versionNo}`，废弃 Decimal version 字段（保留 DB 列做历史兼容） | Document 模块 | 否，versionNo 字段已在 schema 中存在（第 370 行） | fix/document-version-display | 是 |
| GAP-401 | 为 DocumentIssuance 增加 `documentId String?` 外键关联 Document，迁移现有发放记录做关联 | DocumentIssuance 模块 | 否 | feat/document-issuance-link | 是 |
| GAP-402 | 在培训需求中心页面增加"关联到培训项目"快捷操作（现已有 linkTrainingNeed API），并在文控工作台的培训需求问题卡片上清晰标注这是"派生需求入口"而非"培训记录入口" | 文控模块、培训模块 | 否 | fix/training-need-ux-clarification | 是 |
| GAP-403 | 优先批量处理 RecordFormLandingEntry unimplemented 条目，配合 model-landing 生成脚本完成自动建议，再由文控专员逐批确认 | RecordFormLandingService、model-landing 模块 | 否，基础设施已存在 | feat/record-form-landing-batch-confirm | 否（需要人工确认） |
| GAP-404 | 在服务端增加对 `updateFields` 操作的接口版本校验或字段 schema 校验，防止字段定义错位提交 | RecordTemplate 模块 | 否 | fix/record-template-field-update-guard | 是 |
| GAP-405 | 为 AuditReport 归档的 Document 设置 `document_type = 'AUDIT_REPORT'` 或更合适的 `source_folder = 'audit'`，并在文控列表前端过滤时默认排除内审归档类文件 | Document 模块、内审模块 | 否 | fix/audit-report-document-type-tag | 是 |
| GAP-406 | 统一前端版本展示规则：使用 `versionNo` 字段展示为 V1/V2/V3，并在发起修订草稿时自动预填 `versionNo+1` | Document 模块 | 否 | fix/document-revision-version-ux | 是（与 GAP-1 可合并为同一 PR） |

## 9. 证据索引

- `server/src/prisma/schema.prisma` 第 280 行：Document 模型定义
- `server/src/prisma/schema.prisma` 第 770 行：RecordTemplate 模型定义
- `server/src/prisma/schema.prisma` 第 825 行：Record 模型定义
- `server/src/prisma/schema.prisma` 第 2563 行：RecordFormLandingEntry 模型定义
- `server/src/prisma/schema.prisma` 第 3485 行：DocumentIssuance 模型（无 documentId 外键）
- `server/src/prisma/schema.prisma` 第 3741 行：DocumentTrainingNeed 模型
- `server/src/modules/document/document.controller.ts`：DocumentController，`@Controller('documents')`
- `server/src/modules/document/constants/document-control.constants.ts`：DOCUMENT_TYPES 枚举
- `server/src/modules/document/services/record-form-landing.service.ts`：RecordFormLandingService
- `server/src/modules/record-template/record-template.controller.ts`：RecordTemplateController
- `server/src/modules/record/record.controller.ts`：RecordController
- `server/src/modules/document-issuance/document-issuance.controller.ts`：DocumentIssuanceController
- `client/src/api/document-control.ts`：前端文控 API 适配器
- `client/src/api/document-operations.ts`：前端文控运营 API（阅读确认、培训需求、审核覆盖）
- `client/src/router/index.ts` 第 30-119 行：documents/* 路由
- `client/src/views/documents/`：所有文控页面组件
- `docs/superpowers/specs/2026-04-28-document-control-and-record-form-governance-design.md`：文控治理设计规范

## 10. 禁止重复实现与事实源边界

| 对象 | 当前事实源 | 允许展示字段 | 禁止新增的平行事实源 | 旧字段或旧模块处理 |
|---|---|---|---|---|
| 受控文件 | `Document` 模型 | title, number, doc_code, status, versionNo, document_type | 禁止在培训模块或内审模块重新维护文件清单 | Document.version（Decimal）过渡期保留，后续用 versionNo 替代 |
| 记录表单落地映射 | `RecordFormLandingEntry` 模型 | sourceCode, landingStatus, targetModule, targetRoute | 禁止在各业务模块各自维护表单编号映射 | 无 |
| 动态表单模板 | `RecordTemplate` 模型 | code, name, fieldsJson, version, status | 禁止在 Document 模型中存储表单字段定义 | 无 |
| 动态表单填写记录 | `Record` 模型 | number, dataJson, status, productionBatchId | 禁止为每类记录表单新建独立模型（应先判断是否需要业务模块落地） | 无 |
| 培训需求（文控派生） | `DocumentTrainingNeed` 模型（派生） | linkedTrainingProjectId | 禁止体系文件中心存储培训出勤、考试成绩等培训事实 | 无 |
| 文件发放记录 | `DocumentIssuance` 模型 | document_name, document_code, issued_to, issued_by | 禁止在 Document 模型中增加发放记录字段 | 补 documentId 外键关联（GAP-2） |
| 内审覆盖统计 | `DocumentAuditCoverageService` 派生查询 | 审核覆盖率、未覆盖文件列表 | 禁止在体系文件中心建立 AuditFinding 或 AuditPlan 副本 | 无 |

## 11. 后续整改入口

| 优先级 | GAP 编号 | 推荐 PR | 前置依赖 | 可并行 | 验收命令 |
|---|---|---|---|---|---|
| P1 | GAP-400 | fix/document-version-display | 无 | 是（与 GAP-7 合并） | 打开任意文件详情页，版本号展示为 V1/V2/V3 格式 |
| P1 | GAP-401 | feat/document-issuance-link | 无 | 是 | `SELECT * FROM document_issuances WHERE document_id IS NULL` 数量应为 0（迁移后） |
| P2 | GAP-402 | fix/training-need-ux-clarification | 无 | 是 | 在 TrainingNeedCenter 页面有明确"派生需求"标注，点击关联跳转到 /training/projects 而非文控入口 |
| P2 | GAP-403 | feat/record-form-landing-batch-confirm | model-landing 生成脚本 | 否 | `SELECT COUNT(*) FROM record_form_landing_entries WHERE landing_status = 'unimplemented'` 接近 0 |
| P2 | GAP-405 | fix/audit-report-document-type-tag | 内审模块 | 是 | /documents 文件列表不出现内审报告条目 |
| P2 | GAP-404 | fix/record-template-field-update-guard | 无 | 是 | 服务端对 fieldsJson 的 schema 校验测试通过 |
| P2 | GAP-406 | fix/document-revision-version-ux | GAP-1 | 是（合并进 GAP-1 PR） | 修订草稿创建后版本号自动递增展示 |
