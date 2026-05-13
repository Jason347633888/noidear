# API Contract Gap Repair — Full Spec

**Date:** 2026-05-13
**Scope:** API 契约缺口修复、功能瘦身剔除、文控瘦身、全项目审批事实源收敛
**Strategy:** 先修系统地图识别准确性，再一次性收敛 API adapter、页面直连缺口、统一审批边界和已决议剔除功能
**Premise:** 当前项目没有历史业务数据，不需要数据迁移，也不需要为旧错误接口保留软兼容

---

## 背景

`tools/generate-system-map.py` 对比 `client/src/api/` 与 `server/src/modules/` 后输出了一批“前端已调用但后端无对应实现”的接口。人工复核当前代码后，原清单存在三类问题：

1. **脚本误判**：后端 controller 已存在，但脚本解析漏掉了多行装饰器、`@UseInterceptors(FileInterceptor(...))`、`@Controller()` 空前缀 controller、以及部分嵌套路由。
2. **脚本漏报**：`client/src/api/**` 子目录未被递归扫描，曾漏掉内审 API 缺口；即使该业务模块本轮剔除，脚本仍必须能识别子目录调用，避免其他模块继续漏报。
3. **检查范围偏窄**：页面和组件里还有直接 `request.*(...)` 调用，系统地图当前没有把它们作为正式缺口纳入同一轮判断。

本 spec 的目标不是把原清单全部机械实现，而是建立可信的前后端契约检查，并按当前真实业务边界一次性修完所有已发现缺口。对已经决议剔除的功能，修复动作是删除功能面，而不是补接口、隐藏菜单或保留空壳兼容。

---

## 事实口径

后端运行合同来自 `server/src/main.ts`：

- 全局前缀：`/api/v1`
- 前端 `client/src/api/request.ts` 已默认使用 `/api/v1`
- 系统地图中的路径比较应忽略此前缀，只比较业务路径
- Nest controller 路由事实来自已注册 module 下的 `*.controller.ts`

食品安全与主数据口径来自：

- `docs/AGENT_GUIDE.md`
- `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`
- `CONTEXT.md`

涉及 `Product`、`Material`、`Supplier`、`ProductionBatch`、`IncomingInspection`、`FragileItemInspection`、`RecordTemplate/Record` 的接口修复不得创建平行主数据或批次事实源。

当前项目没有历史业务数据。因此：

- 不做历史数据迁移。
- 不为旧接口保留长期兼容别名。
- 可以删除未被活跃页面使用的旧 API adapter、旧页面、旧测试断言。
- 可以把旧 approval 兼容面直接迁到统一审批事实源，而不是继续维持旧 `Approval` 创建入口。
- “剔除”表示功能瘦身：删除菜单、路由、页面、API adapter、后端 controller/service/module、schema/model 引用、seed、权限、测试和系统地图残留；不得只做前端隐藏。

### 审批与流程事实源

全项目只保留一个正式审批事实源：

- `ApprovalDefinition`：审批定义。
- `ApprovalInstance`：某个业务对象发起的一次审批实例。
- `ApprovalTask`：审批步骤上的待处理任务。
- `ApprovalAction`：审批动作日志。

业务模块只允许做三件事：

1. 在业务提交点调用 `ApprovalEngineService.startApproval(...)` 发起统一审批。
2. 在业务对象上保存 `approvalInstanceId` 作为回链。
3. 通过统一审批回调更新业务对象状态。

除 `POST /approval-tasks/:id/approve` 和 `POST /approval-tasks/:id/reject` 外，其他模块不得保留独立审批决策入口。业务模块自己的 `approve/reject` route、旧 `Approval` route、`ChangeApproval` route、`ProcessStepApproval` 会签 route、`WorkflowTask` 的 approve/reject route 都不应作为审批事实源继续存在。

统一审批只回答“准不准做”。业务模块继续回答“做没做完”：

- `approve` / `reject` 表示同意或驳回某个业务申请，属于正式审批，必须走统一审批任务。
- `complete` / `verify` / `close` / `issue` / `archive` 表示业务执行、验证、关闭、发放或归档结果，不写入审批事实源，由对应业务模块维护状态。
- 同一个待办入口可以展示审批任务和业务执行任务，但待办入口只是投影，不是事实源。
- 动态表单和记录模板不得内嵌审批按钮或审批步骤字段。记录可以提交统一审批，但审批动作必须在统一审批任务中完成。

当前 `workflow` 模块的 template/instance/task/runtime 本质上仍是旧审批流与审核流设计器，和统一审批平台职责重叠。本轮不再保留 workflow 模板、实例、任务、设计器或统计入口。未来若需要可视化配置审批流，应在 `unified-approval` 下建设“审批定义管理”，不是复用旧 workflow。

## 本轮剔除与收敛范围

以下范围不再作为 API gap 修补对象。implementation plan 必须直接删除或收敛，不能补空壳后端，也不能为了页面不报错保留旧兼容 route。

| 范围 | 当前实现入口 | 决策 |
|------|--------------|------|
| 资产借用记录 | `asset-loan-record` 前端页面/API、`AssetLoanRecordModule`、`AssetLoanRecord` 模型 | 直接剔除。未来若需要资产管理，应回到设备/资产主数据，不恢复自由文本借用台账 |
| 审核与审查业务模块 | 内审计划/执行/整改/报告、管理评审、业务审核管理入口 | 直接剔除。`client/src/api/internal-audit/**`、`client/src/views/internal-audit/**`、`management-review` 前后端模块和相关路由不再补缺口 |
| 系统审计日志 | `/audit/login-logs`、`/audit/permission-logs`、`/audit/sensitive-logs`、`/audit/search` | 暂不归入“审核与审查”业务模块。它是系统治理日志，监控大屏也依赖 `/audit/dashboard`，除非后续明确要求删除系统审计日志 |
| 单点登录 | `client/src/api/sso.ts`、`SsoLogin.vue`、`auth/sso` 后端 controller/service | 直接剔除，保留本地账号登录 |
| 变更审批 | `change-approval` 前端 API、`ChangeApprovalModule`、`ChangeApproval` 模型 | 不再作为独立审批事实源。变更提交审批只走统一审批实例与审批任务，变更状态回写到 `ChangeEvent` |
| 工作流 | `workflow` 前端页面/API、`WorkflowModule`、`WorkflowTemplate`、`WorkflowInstance`、`WorkflowTask` | 直接剔除。旧 workflow 是审批/审核流设计器，与统一审批事实源重叠；不再补 workflow route 缺口 |
| 运维 UI | `monitoring` 前端页面/API、监控大屏、运行指标、告警规则、告警历史 | 删除前端页面、菜单、router、API adapter 和页面测试；不再补 monitoring 页面缺口 |
| 数据大屏/管理驾驶舱 | `/statistics/dashboard`、`/management-dashboard`、`ManagementDashboardService` | 删除数据大屏和管理驾驶舱；不影响普通统计页面 |
| 系统健康检查 | `/health*`、`/liveness` | 保留后端健康探针供部署和基础监控使用；删除用户侧健康页面和监控大屏消费，不作为业务 UI |

---

## 文控瘦身范围

文控保留目标是“受控文件库 + 记录表单入口索引 + 引用健康”，不再承接运营治理平台、培训派生、审计覆盖或统计导出。

### 保留能力

| 能力 | 保留边界 |
|------|----------|
| 体系文件中心 | 保留统一入口，不再为文件类别拆独立页面；现有 6 类文件类别不动：管理手册、程序文件、作业指导书、记录表单索引、公司文件、外来文件 |
| 文件基础操作 | 保留上传、列表、详情、预览、下载、普通筛选查询 |
| 文件生命周期 | 保留草稿、提交统一审批、发布生效、修订、归档；退出使用统一以归档处理，不再保留作废 |
| 统一审批 | 文件审批只走 `ApprovalInstance` / `ApprovalTask`；文件自身只保存状态、当前版本和 `approvalInstanceId` |
| 复审/续期 | 保留 `review_due_date`、`external_expires_at`；到期前自动派复审/续期待办，任务回到文件详情 |
| 复审/续期结果 | 无论内容是否变化，都必须走“修订草稿 -> 统一审批 -> 发布新版本”；不得直接修改当前生效文件的复审日期或外来文件有效期 |
| 版本历史 | 保留版本历史、历史版本预览、历史版本下载 |
| 跨文档引用与引用健康 | 保留 `DocumentReference`、`MarkdownWikilinkService`、`DocumentReferenceHealthService`；保留 `[[...]]` 显式引用与悬空/冲突/归档/被替代检查 |
| 记录表单入口索引 | 保留轻量映射：源表单编号/名称 -> `targetRoute` 或 `targetTemplateId`；用于制度正文中 `[[...]]` 表单引用跳转 |
| 默认编号规则 | 保留内部默认编号生成能力；不提供用户维护编号规则页面 |

### 剔除能力

| 能力 | 删除范围 |
|------|----------|
| 阅读确认 | 删除阅读确认中心、确认已阅读、阅读要求、阅读状态；删除 `DocumentReadConfirmation`、`DocumentReadRequirement` 及相关 API |
| 文控派生培训需求 | 删除培训需求中心、建议/接受/驳回/关联培训项目；删除 `DocumentTrainingNeed` 及相关 API。培训模块仍可自行选择文件作为资料 |
| 文控工作台与健康度 | 删除文控工作台、问题明细、文控健康度；删除 `DocumentControlWorkbenchService`、`DocumentHealthService` 及对应 route/page |
| 审核覆盖 | 删除审核覆盖中心与 `DocumentCoverageReview`；前面已决议剔除审核与审查业务模块 |
| 影响分析 | 删除影响分析工作台、`DocumentImpactReview`、`DocumentImpactItem`；若未来需要影响评估，应归入变更管理或统一审批语境 |
| 证据链/审核链路 | 删除文控下的 audit-chain/evidence-chain 能力；保留引用健康，不保留审计链路 |
| 独立编号规则管理 | 删除 `NumberRuleCenter.vue`、`/documents/number-rules*` 管理接口和用户维护 CRUD；优先用常量或配置实现默认规则，不保留 `NumberRule` 表作为业务配置中心 |
| 表单领用记录 | 删除 `document-issuance` 前后端和 `DocumentIssuance` 模型，不再维护纸质表单领用台账 |
| 文档统计与列表导出 | 删除文档统计页面/API、`/documents/export`、`/export/documents`、`DocumentExportService`；保留单个文件下载/预览 |
| 全文搜索/推荐/访问日志 | 删除 `FulltextIndex`、`DocumentRecommendation`、`DocumentViewLog` 和推荐/访问时长/全文索引同步逻辑；保留普通数据库筛选 |
| 旧文档专用审批 | 删除旧 `Approval` 文档审批链路和 `/approvals/chains` 兼容面，统一走正式审批 |
| 版本对比/回滚 | 删除版本对比和回滚；恢复旧内容也必须发起修订草稿并审批发布为新版本 |
| 作废 | 删除 `obsolete` 动作、状态、字段和页面入口；引用健康将归档/被替代视为不可作为当前依据 |

### 记录表单入口索引细节

当前代码已经存在 `[[...]]` 显式引用机制，不需要重新设计：

- `MarkdownWikilinkService` 已解析 `[[目标]]` 和 `[[目标|显示文字]]`。
- 受控文件引用按 `number` / `title` / `doc_code` 匹配。
- 记录表单引用已支持从 `[[GRSS-XX-JL-数字...]]` 中提取源表单编号并查询 `RecordFormLandingEntry`。
- `DocumentReferenceHealthService` 已识别 `record_form_landing`、`unresolved_record_form`、`conflict_record_form`。

本轮只保留轻量索引能力：

- 保留一个简单“记录表单入口索引”页面，用于维护源表单到填写入口的映射。
- 保留字段边界：`sourceCode`、`targetRoute`、`targetTemplateId`、`targetModule`、`targetModel`、`notes`；删除自动建议、批量确认、字段覆盖、评分、健康度等治理字段和操作。
- 文件正文或文末用 `[[...]]` 显式引用表单；渲染时匹配唯一 `record_form_landing` 后应能点击跳到 `targetRoute`，若目标是动态模板则跳到模板填写入口。
- 未匹配或多候选时保留引用健康提示，但不生成工作台问题队列。

---

## 目标

1. 修正系统地图脚本，让“缺失接口”结果可作为 implementation plan 依据。
2. 修复 `client/src/api/**/*.ts` 范围内真实缺口。
3. 收敛 `client/src/views/**`、`client/src/components/**` 中直接调用 `request.*(...)` 的真实缺口。
4. 删除已决议剔除功能的完整产品面，不补空壳后端，不迁入动态模板做软保留。
5. 收敛文控到“受控文件库 + 记录表单入口索引 + 引用健康”的轻量范围，删除运营治理平台能力。
6. 收敛全项目审批入口，确保正式审批只由统一审批实例、任务和动作承载。
7. 为 implementation plan 提供完整边界、修复方向和验收命令，不再把直连调用或旧兼容面延后。

---

## 非目标

- 不新增第二套审批引擎、审批表或审批工作台。
- 不新增第二套 `Material`、`Supplier`、`ProductionBatch` 或追溯链路。
- 不把误判接口作为新后端接口补齐。
- 不在本 spec 中写逐步 implementation plan。
- 不处理移动端或第三方系统接口。

---

## 系统地图可信化

当前脚本的前端解析和后端解析都偏窄：

- 前端只扫 `client/src/api/*.ts`，漏掉 `client/src/api/**` 子目录中的调用，例如当前应删除的 `internal-audit` API
- URL 正则会把 TypeScript generic 中的字符串误判为 URL，例如 `HealthCheckResponse['services']`
- 后端 route 正则只能处理简单的一行装饰器，遇到多行 Swagger 装饰器和 `FileInterceptor(...)` 会漏 route
- `@Controller()` 空前缀 controller 被漏掉，例如 `product-process-change`
- 缺少“controller 是否被 module 注册”的运行时校验

脚本应输出两层结果：

| 输出组 | 扫描范围 | 用途 |
|--------|----------|------|
| `api_adapter_missing` | `client/src/api/**/*.ts`，排除测试文件 | 正式 API adapter 契约缺口 |
| `direct_client_missing` | `client/src/**/*.ts`、`client/src/**/*.vue` 中非 API adapter 的 `request.*(...)` | 页面/组件直连缺口，必须收敛到 adapter 或删除 |

后端解析需要支持：

- `@Controller('prefix')`
- `@Controller()`
- `@Get()` / `@Post()` 等空路径
- route decorator 与 handler 之间任意数量的其他 decorator
- 多行 decorator 参数
- `:id`、`${id}`、数字 id 的归一化匹配

脚本输出应区分四种状态：

| 状态 | 含义 |
|------|------|
| `matched` | 前端调用与后端 route 方法 + 路径匹配 |
| `api_adapter_missing` | API adapter 调用找不到后端 route |
| `direct_client_missing` | 页面/组件直连调用找不到后端 route |
| `backend_only` | 后端存在但前端 API adapter 未使用 |

---

## API Adapter 真实缺口

修复顺序：

1. 有现成正确后端语义时，改前端到现有 route。
2. adapter 只有测试覆盖、没有活跃页面/组件调用时，删除 dead adapter 和测试断言。
3. 确认为真实业务能力且前端活跃使用时，补后端 route。

### 审批与流程

当前无历史数据，旧 `Approval` 创建链路不再作为兼容包袱保留。新审批事实源是统一审批实例与审批任务。

| 当前前端调用 | 当前后端事实 | 修复方向 |
|--------------|--------------|----------|
| `POST /approvals/chains` | 仅有 `GET /approvals/chains/:documentId`；当前只在 `approval-api.spec.ts` 中被测到 | 删除 `approvalApi.createApprovalChain` dead adapter 和对应测试；不新增后端 route |
| `DELETE /workflow-templates/:id` | 属于本轮剔除的旧 workflow 模块 | 删除 workflow 前端/API/后端/schema，不补 route |
| `POST /workflow-templates/:id/publish` | 属于本轮剔除的旧 workflow 模块 | 删除 workflow 前端/API/后端/schema，不补 route |
| `POST /workflow-templates/:id/archive` | 属于本轮剔除的旧 workflow 模块 | 删除 workflow 前端/API/后端/schema，不补 route |
| `GET /workflow-tasks/my` | 属于本轮剔除的旧 workflow 模块 | 删除 workflow 待办页与 API，不修 `/workflow-tasks/my` 或 `/workflow-tasks/my-tasks` |
| `POST /process/instances/:instanceId/approve` | 后端仍有步骤会签 `POST /process/instances/:id/steps/:stepNumber/approvals` 和 `ProcessStepApproval` 独立事实源 | 删除 `processApi.approveStep` dead adapter；同时移除 `ProcessStepApproval` 会签事实源，研发流程步骤审批只走统一审批任务 |

### 全项目审批收敛

系统地图缺口只暴露了一部分审批问题。人工复核后，本轮 implementation plan 还必须覆盖以下独立审批面：

| 残留审批面 | 当前代码事实 | 收敛方向 |
|------------|--------------|----------|
| 旧 `approval` 模块 | `ApprovalController` / `ApprovalService` / `Approval` 模型仍存在，且 `ApprovalService` 仍能创建旧会签/顺签记录 | 删除旧 `approval` 模块、旧 `Approval` 模型、`client/src/api/approval.ts` 旧 adapter、旧 approvals 页面和测试；正式待审/历史页面迁到 `unified-approval` API |
| 旧文档审批 fallback | `DocumentService.approve/withdraw`、`FilePreviewService`、统计/导出/证据链仍读取旧 `prisma.approval` | 无历史数据，不保留 fallback；文档审批、撤回、预览权限和审批展示全部基于 `approvalInstanceId` 与统一审批任务 |
| 独立变更审批 | `ChangeApprovalModule`、`ChangeApproval` 模型、`client/src/api/change-approval.ts` 仍维护变更专用审批记录 | 删除独立模型和 API；`ChangeEvent` 提交审批只发起 `ApprovalInstance`，审批结果由统一回调写回变更状态 |
| 研发步骤会签 | `ProcessStepApprovalService`、`ProcessStepApproval` 模型、`DeptSignoffPanel` 和 `processApi.submitApproval/getApprovals` 仍维护步骤级签署事实 | 删除步骤会签表和旧 UI；`requiredApprovals` 或步骤配置必须映射到 `ApprovalDefinition`，步骤提交后只产生 `ApprovalTask` |
| 工作流任务审批 | `WorkflowTaskController` 提供 `/workflow-tasks/:id/approve|reject`，`WorkflowTaskService` 自己推进 approved/rejected | 删除整个 workflow 模块；不保留 workflow task/runtime，也不把它改造成普通人工任务 |
| 业务模块直连审批 | 设备维护、仓库入库/领料/退料/报废、召回、任务、偏差、培训、记录等模块存在本地 `approve/reject` route 或 service 方法 | 保留“提交审批”入口；删除或迁移“同意/驳回”入口到 `/approval-tasks/:id/approve|reject`。业务状态推进放入统一审批 callback。`complete` / `verify` / `close` 等业务执行动作保留在业务模块 |

验收时必须扫描并解释所有生产代码中的 `@Post(...approve...)`、`@Post(...reject...)`、`prisma.approval`、`prisma.changeApproval`、`prisma.processStepApproval`。除统一审批 controller 和非审批语义的技术误报外，不应再有独立审批事实源。

### 记录与模板

| 当前前端调用 | 当前后端事实 | 修复方向 |
|--------------|--------------|----------|
| `POST /records/:id/approve` | 后端有 `POST /records/:id/submit`、`POST /records/:id/signature`、`PUT /records/:id/approved`；当前 `recordApi.approveRecord` 没有活跃调用 | 删除 `recordApi.approveRecord` dead adapter；不新增绕过统一审批的 route；`PUT /records/:id/approved` 若表示审批必须迁到统一审批，若只是填报确认则改名为 `confirm/sign`，不得继续使用 approved 语义 |
| `GET /records/:recordId/pdf` | 无对应 route | 补后端 PDF 导出，以 `Record` + `RecordTemplate` 为事实源 |
| `PUT /templates/:templateId/tolerance` | `templates` alias 仅覆盖模板 CRUD | 补到 `record-template` / `template-alias` 边界，容差配置归属记录模板扩展能力 |
| `GET /templates/:templateId/tolerance` | 同上 | 同上 |

动态表单字段收敛：

- 删除 `approval-step` 字段类型和 `ApprovalStepField` 组件，不再允许模板配置内嵌审批人、审批意见、通过/驳回按钮。
- 若记录模板需要审批，记录提交后发起 `ApprovalInstance`，页面展示 `ApprovalTaskPanel` 或跳转统一审批待办。
- 记录模板字段只表达填报内容，不表达审批流程事实。

### 生产与批次

| 当前前端调用 | 当前后端事实 | 修复方向 |
|--------------|--------------|----------|
| `POST /batch-trace/production-batches/:id/complete` | 现有 `POST /batch-trace/production-batches/confirm` 与 `PUT /batch-trace/production-batches/:id`；当前 `productionBatchApi.complete` 没有活跃调用 | 删除 dead adapter；不把未使用的完工动作作为本轮欠账 |

### 仓库与物料

| 当前前端调用 | 当前后端事实 | 修复方向 |
|--------------|--------------|----------|
| `DELETE /warehouse/suppliers/:id` | 后端有 `PUT /warehouse/suppliers/:id/disable` | 前端改为 disable，不新增硬删除 |
| `GET /warehouse/material-balance` | 后端有 `/warehouse/material-balance/check/:batchId` 与 `/warehouse/material-balance/check-all` | 前端若有 `batchId` 调 `/check/:batchId`；无 `batchId` 调 `/check-all` |

以下原清单项已存在后端实现，不作为缺口处理：

- `warehouse/materials` CRUD
- `warehouse/suppliers/:id/documents` 上传与替换
- `product-process-change` 四个接口
- `products/:id/reports` 上传与替换
- `incoming-inspections` 全组接口
- `fragile-item-inspections` 全组接口
- `import/documents`、`import/users`
- `upload/photo`、`upload/signature`

### 质量与监控

| 当前前端调用 | 当前后端事实 | 修复方向 |
|--------------|--------------|----------|
| `GET /monitoring/metrics/available` | 属于本轮删除的运维 UI | 删除 monitoring 前端页面/API adapter，不补 route |
| `GET /monitoring/alerts/rules/:id` | 属于本轮删除的运维 UI | 删除 monitoring 前端页面/API adapter，不补 route |

原清单中其他 monitoring 告警接口即使后端已有实现，也不再作为用户侧功能保留。implementation plan 应删除前端 monitoring 入口、页面、API adapter、页面测试；后端 monitoring/alert 运行时是否作为内部采集能力保留，按不暴露 UI 的最小依赖处理。

`health` 不是业务页面能力。本轮保留后端健康探针，删除用户侧健康页面和 monitoring 大屏消费：

- 保留 `GET /health`、`GET /health/dependencies`、`GET /liveness` 这类后端探针，具体响应以部署/服务自检需要为准。
- 删除 `client/src/api/health.ts` 中仅服务 UI 的 adapter，或仅保留非页面调用所需的最小类型。
- 系统地图不得再把 `HealthCheckResponse['services']` 误判成 URL。

### 培训考试

| 当前前端调用 | 当前后端事实 | 修复方向 |
|--------------|--------------|----------|
| `PUT /training/questions/order` | 后端为 `PUT /training/questions/update-order`，body 为 `{ projectId, questionOrders }` | 前端改到后端现有 route，并补齐 `projectId` 与字段名映射 |

### 已剔除业务模块中的历史缺口

审核与审查业务模块已决定剔除，所以下列内审缺口不再补后端：

| 当前前端调用 | 当前后端事实 | 修复方向 |
|--------------|--------------|----------|
| `POST /audit/plans/:planId/submit` | 无对应 route；属于内审执行状态流 | 删除内审前端入口/API 与后端 internal-audit 模块，不补 route |
| `POST /audit/plans/:planId/withdraw` | 无对应 route；属于内审执行状态流 | 删除内审前端入口/API 与后端 internal-audit 模块，不补 route |

注意：这里的 `/audit/plans` 是内审业务命名空间遗留，不等同于系统审计日志 `/audit/login-logs`、`/audit/search`。

---

## 页面与组件直连缺口

这些缺口必须和 API adapter 缺口放入同一个 implementation plan。原则是：活跃页面迁入 API adapter；废弃页面、废弃组件、废弃 route 直接删除；不新增空壳兼容 route。

| 当前直连调用 | 位置/状态 | 当前后端事实 | 修复方向 |
|--------------|-----------|--------------|----------|
| `GET /approvals` | `ApprovalAll.vue`；菜单未暴露，但 router 仍注册 `/approvals/all` | 后端没有 all 列表；旧 approval 不再保留历史兼容包袱 | 删除 `ApprovalAll.vue` 与 `/approvals/all` route；不重定向，不新增 `GET /approvals` |
| `POST /auth/change-password` | `Password.vue` 活跃页面 | 后端为 `PATCH /auth/change-password` | 前端改为 PATCH，并迁入 auth adapter |
| `POST /workflow/templates` | `WorkflowDesigner.vue`；属于旧 workflow 设计器 | 本轮剔除整个 workflow 模块 | 删除 `WorkflowDesigner.vue`、workflow routes/menu/API；不迁移到 `/workflow-templates` |
| `GET /statistics/dashboard*` / `GET /statistics/dashboard/kpis` | 数据大屏/管理驾驶舱页面 | 本轮删除数据大屏和管理驾驶舱 | 删除 `StatisticsDashboard.vue`、`ManagementDashboard.vue`、相关 route/menu/API；不补 dashboard route |
| `GET /batch-trace/production-batches/:id/trace` | `TraceVisualization.vue` 文件残留；router 注释已写“removed: use /traceability instead” | 正式追溯入口是 `/traceability/query`；batch-trace 下仅有 PDF 导出 | 删除残留视图文件，或把唯一入口迁到 `/traceability`；不新增旧 trace route |
| `POST /documents/:docId/references/:refId/sync` | `ReferenceBlock.vue` 孤立组件，未被当前前端引用 | 后端有创建/查询/影响范围，服务层有批量同步快照能力但无单条组件 route | 删除孤立组件；不为未挂载组件新增 route |
| `DELETE /templates/:id` | `TemplateList.vue` 活跃页面；当前仅 `draft` 显示删除 | `templates` alias 无 delete；`record-templates` 有 archive/activate | 补“记录模板草稿废弃”：仅 `draft` 且无记录、任务、版本链引用时允许物理删除；其他状态必须走 archive/activate 生命周期 |
| `POST /templates/:id/copy` | `TemplateList.vue` 的复制入口 | 无对应 route；复制模板当前不作为正式能力 | 删除复制按钮、`handleCopy` 和调用；不补后端 |
| `POST /templates/:id/toggle` | `TemplateList.vue` 活跃页面 | `record-templates` 有 archive/activate，但 alias 无 toggle | 前端改为明确调用 archive/activate；不新增含糊 toggle |
| `POST /templates/from-excel` | `TemplateList.vue` 的 Excel 导入入口 | 无对应 route；记录模板导入当前不作为正式能力 | 删除 Excel 导入入口和调用；不补后端 |
| `POST /templates/parse-excel` | `ExcelUpload.vue` 被 `TemplateEdit.vue` 使用 | 无对应 route；记录模板导入当前不作为正式能力 | 删除 `ExcelUpload.vue` 挂载点和组件；不补后端 |
| `POST /user-permissions` | `GrantPermissionDialog.vue` | 后端为 `POST /user-permissions/grant` | 改为 grant adapter |
| `GET /user-permissions/:userId` | `UserPermissions.vue` | 后端为 `GET /user-permissions/:userId/effective` | 改为 effective adapter |
| `POST /user-permissions/:userId` | `UserPermissions.vue` | 后端为 `POST /user-permissions/batch-grant` | 改为 batch-grant adapter |
| `DELETE /user-permissions/:userId/:permissionId` | `UserPermissions.vue` | 后端为 `DELETE /user-permissions/:id/revoke` 或 `POST /user-permissions/batch-revoke` | 前端必须使用授权记录 id 撤销；若只有 permissionId，则先取 effective 列表中的授权记录 id |
| `DELETE /user-permissions/:id` | `UserPermissionsManager.vue` | 后端为 `DELETE /user-permissions/:id/revoke` | 改为 revoke adapter |

---

## 必须删除或迁移的旧测试

接口测试不能继续固定错误路径。至少需要处理：

- `client/src/__tests__/approval-api.spec.ts` 中 `POST /approvals/chains` 断言。
- workflow template / instance / task / designer 相关测试随整个 workflow 模块删除，不再断言 delete/publish/archive 或 my-tasks 合同。
- user-permission 页面/组件测试应断言 grant/effective/revoke 正式路径。
- template Excel 导入相关测试应删除或改为断言入口不存在。
- `asset-loan-record`、`internal-audit`、`management-review`、`auth/sso`、`change-approval`、`workflow` 的页面/API/service 测试随模块删除或迁移到正式事实源，不保留空壳断言。

---

## 验收标准

### 系统地图

运行：

```bash
python3 tools/generate-system-map.py
```

期望：

- `product-process-change` 不再被误报缺失
- `incoming-inspection` 不再被误报缺失
- `fragile-item-inspection` 不再被误报缺失
- `monitoring` 不再作为用户侧 API 缺口；前端 monitoring 页面/API adapter 已删除
- `health` 不再出现 `GET services`；后端健康探针可保留但不生成用户侧页面缺口
- `client/src/api/**` 子目录被递归扫描；实施完成后不应再残留 `internal-audit` / `management-review` / `workflow` / `monitoring` API adapter
- 输出同时包含 `api_adapter_missing` 与 `direct_client_missing`

### 后端

运行：

```bash
npm run build:server
rg -n "prisma\\.(approval|changeApproval|processStepApproval)\\b|@Post\\('[^']*(approve|reject)|@Post\\(\"[^\"]*(approve|reject)" server/src/modules --glob '*.ts'
```

期望：

- Nest 编译通过，无 controller/module 注入错误。
- `prisma.approval`、`prisma.changeApproval`、`prisma.processStepApproval` 不再出现在生产模块代码中。
- `@Post(...approve...)` / `@Post(...reject...)` 只允许出现在 `unified-approval` 的审批任务 controller，或经人工确认不是审批语义的技术误报。

### 前端

运行：

```bash
npm run build:client
```

期望：前端 API 类型和调用参数通过构建。

### 契约回归

新增或更新轻量契约检查脚本或测试，至少覆盖：

- 前端 API adapter 的所有 request 调用都能匹配后端 route，或被显式列入 dead/deprecated 清单。
- 页面/组件 direct request 调用要么迁入 adapter，要么被显式列入删除清单。
- 后端 route 解析能识别多行装饰器和空前缀 controller。
- TypeScript generic 字符串不会被识别为 URL。
- 被剔除功能不再出现在菜单、router、API adapter、后端 module 注册、schema 主模型、seed 和测试中。
- 文控瘦身剔除项不再出现在菜单、router、API adapter、后端 controller/service/module、schema 主模型、seed 和测试中。
- 运维 UI、数据大屏和管理驾驶舱不再出现在菜单、router、前端 API adapter、页面测试和用户侧页面中；后端健康探针保留。
- 独立审批事实源不再出现：旧 `Approval`、`ChangeApproval`、`ProcessStepApproval`、`WorkflowTemplate`、`WorkflowInstance`、`WorkflowTask` 和业务模块直连 approve/reject 均已删除或迁移到统一审批。
- 动态表单不再包含 `approval-step` 字段或内嵌审批按钮；记录审批只能通过统一审批任务完成。
- `[[...]]` 引用受控文件和记录表单入口均可渲染健康状态；`record_form_landing.targetRoute` 点击后能跳到实际填写入口。

### 缺口清零口径

实施完成后，`api_adapter_missing` 应为 0。

`direct_client_missing` 应为 0；若仍有页面直连 request，必须满足：

- 后端 route 匹配；
- 该调用有明确保留理由；
- 不属于旧 approval、旧 batch-trace trace、旧 user-permission 路径。
- 不属于本轮剔除的 `asset-loan-record`、`internal-audit`、`management-review`、`auth/sso`、`change-approval`、`workflow`、`monitoring`、`statistics/dashboard`、`management-dashboard` 路径。

---

## 风险与边界

1. **审批语义风险**：`/approvals/chains`、`/records/:id/approve`、`/process/instances/:id/approve`、`/workflow-tasks/:id/approve|reject`、业务模块本地 `approve/reject` 不应补成或保留为绕过统一审批事实源的新后端捷径。当前无历史数据，直接删除旧创建入口、旧兼容 fallback、独立审批模型和旧 workflow 模块。
2. **模板删除风险**：记录模板属于业务配置。删除必须拆成“记录模板草稿废弃”和“记录模板归档”；只有未启用且未被引用的草稿可以物理删除。
3. **仓储主数据风险**：供应商删除应保持 disable/停用语义，不应物理删除未来追溯会引用的供应商。
4. **记录 PDF 风险**：PDF 导出必须以 `Record` 和 `RecordTemplate` 为事实源，不允许前端生成后上传成第二事实源。
5. **追溯入口风险**：`TraceVisualization.vue` 残留不得复活旧 `/batch-trace/production-batches/:id/trace`，正式查询入口应是 `/traceability/query`。
6. **剔除范围风险**：资产借用、内审/管理评审、SSO、独立变更审批必须删除干净；不允许留下隐藏 route、dead adapter 或半残留测试来制造下一轮假缺口。
7. **系统审计边界风险**：业务审核与审查剔除不等于删除系统审计日志。`/audit/plans` 属于内审业务遗留，`/audit/login-logs`、`/audit/search` 属于系统治理日志。
8. **健康检查契约风险**：删除运维 UI 不等于删除部署探针。`/health`、`/health/dependencies`、`/liveness` 可保留后端能力，但不再为前端监控大屏补契约。
9. **文控瘦身边界风险**：删除工作台、健康度、培训派生和审计链路时，不得误删 `DocumentReference` / `MarkdownWikilinkService` / `DocumentReferenceHealthService`，因为跨文档引用与表单入口引用是保留能力。
10. **文档生命周期风险**：作废、回滚和直接改复审日期都应收敛到“归档”或“修订草稿 -> 统一审批 -> 发布新版本”，不能留下第二条状态通道。
11. **工作流边界风险**：旧 workflow 模块不再保留。不要把 `WorkflowTask` 改名后继续作为第二套任务/审批 runtime；未来若需要审批流配置，应进入 unified-approval 的审批定义管理。
12. **业务回调风险**：删除业务模块本地 approve/reject 后，必须补齐统一审批 callback，否则会出现审批通过但业务对象状态不推进的断链。
13. **审批与执行混淆风险**：不要把 `complete` / `verify` / `close` / `issue` / `archive` 这类业务执行动作塞进审批事实源。它们可以进待办入口，但状态事实仍归对应业务模块。
14. **动态表单审批风险**：`approval-step` 字段会让记录模板内嵌第二套审批按钮，必须删除或迁移到统一审批展示；不能只删除 `recordApi.approveRecord` adapter。
15. **系统地图可信度风险**：若不先修脚本，新的 issue 会继续把已存在接口误判成缺失，造成重复造轮子。
16. **驾驶舱瘦身风险**：本轮只删除运维 UI、数据大屏和管理驾驶舱；普通统计页面、业务详情里的操作聚合、产品工作台和追溯查询场景面板暂不按驾驶舱删除。

---

## Implementation Plan 覆盖边界

implementation plan 必须覆盖以下全部内容，不分拆延后：

1. 修 `tools/generate-system-map.py`，重新生成可信缺口清单。
2. 删除剔除范围的完整功能面：`asset-loan-record`、内审/管理评审业务模块、SSO、独立 `change-approval`、旧 `workflow`、运维 UI、数据大屏和管理驾驶舱入口与模型引用。
3. 收敛全项目审批事实源：删除旧 `approval` 模块与 `Approval` 模型、删除 `ChangeApproval`、删除 `ProcessStepApproval`、删除 `WorkflowTemplate` / `WorkflowInstance` / `WorkflowTask`，迁移业务模块本地 approve/reject 到统一审批任务与 callback。
4. 执行文控瘦身：删除阅读确认、培训需求、工作台/健康度/问题明细、审核覆盖、影响分析、证据链/审核链路、编号规则管理、表单领用、文档统计/导出、全文搜索/推荐/访问日志、作废、版本对比/回滚和旧文档审批。
5. 收敛文控保留能力：文件中心、生命周期、统一审批、复审/续期待办、版本历史、引用健康、记录表单入口索引、默认编号规则、普通筛选。
6. 清理 dead API adapter 与错误测试断言。
7. 修改前端到已有后端正式 route。
8. 补齐真实后端 route：record PDF、template tolerance 等。
9. 保留后端健康探针，删除用户侧健康页面、监控大屏和 monitoring API adapter。
10. 收敛页面/组件 direct request 调用：迁入 adapter、改正式 route、或删除废弃文件/路由。
11. 跑系统地图、审批残留扫描、前端构建、后端构建和契约回归。
