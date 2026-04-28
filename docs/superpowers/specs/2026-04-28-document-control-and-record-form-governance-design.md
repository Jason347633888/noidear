# 文控文件与记录表单治理中心设计

## 1. 背景

当前文控中心已经具备文件上传、预览、Markdown 查看、引用解析、记录表单索引、动态表单模板、业务模块入口、审批、阅读确认、培训需求、影响分析等能力，但这些能力之间的边界还不够清楚。

用户在实际使用中暴露出几个问题：

- 体系文件可以查看，但已发布文件不能直接编辑，需要明确“修订而不是原地修改”的闭环。
- 文档详情页把文件信息和文控信息拆成多块，出现重复字段，例如文档级别和来源分类重复。
- 版本号展示为内部 Decimal 结构，用户看到乱码。
- Markdown 正文里不应再存放文件编号、版本、责任部门等文件信息，这些应由系统字段统一管理。
- 记录表单不是普通文件，不能简单并入 01/02/03 文件详情页。
- 一些记录表单已经融合到研发、供应商、检验、生产等业务模块，不能再要求用户重复录入动态表单字段。
- 证据链作为独立主入口价值不高，更适合成为详情页里的上下文能力。

本设计一次性覆盖文控文件、记录表单索引、动态表单承接、业务模块承接、编号规则、Markdown 引用健康和执行证据展示，不再拆成“第一期/后续支持”。

## 2. 现有实现梳理

### 2.1 体系文件

现有主要模型和能力：

- `Document`
- `DocumentVersion`
- `NumberRule`
- `PendingNumber`
- `DocumentReference`
- `BusinessDocumentLink`
- `DocumentService.generateDocumentNumber(level, departmentId)`
- `DocumentService.updateMarkdown`
- `FilePreviewService`
- `DocumentReferenceHealthService`

当前编号生成已经存在，按 `level + departmentId + sequence` 生成编号，并支持删除编号补位。后续不应重新实现一套并行编号逻辑，而应复用并增强现有 `NumberRule`。

### 2.2 记录表单

现有主要模型和能力：

- `RecordFormLandingEntry`
- `RecordTemplate`
- `Record`
- `RecordTaskAssignment`
- `RecordTaskInstance`
- `RecordFormLandingService`
- `RecordTemplateService.createNewVersion`
- `RecordFill.vue`
- `RecordFormLandingIndex.vue`

当前 `04 记录表单索引` 已经不是空白模块。它的关键职责是把源表单编号映射到实际落地入口，例如业务模块路由、动态表单模板或未落地状态。

### 2.3 证据链

现有主要能力：

- `DocumentEvidenceChainService`
- `GET /documents/control/evidence-chain`
- `AuditChainExplorer.vue`
- `EvidenceChainGraph.vue`
- `packages/types/document-evidence-chain.ts`

该能力已经接入，但更像探索页和聚合服务，不适合作为普通用户的主导航入口。应保留服务和 API，把用户侧能力嵌入文档详情、记录表单索引详情和业务记录详情。

### 2.4 现有实现对照表

后续实施必须先复用已有模块，再补缺口。不得因为本设计重新建立平行模块。

| 设计领域 | 当前已有实现 | 当前不足 | 实施原则 |
| --- | --- | --- | --- |
| 受控文件上传与详情 | `Document`, `DocumentService.create`, `DocumentUpload.vue`, `DocumentDetail.vue` | 详情页字段重复，版本号展示不友好，正文与文控信息边界不清 | 保留现有上传和详情入口，重整展示和字段语义 |
| 文档版本与历史 | `DocumentVersion`, `getVersionHistory`, `rollbackVersion`, 历史版本预览/下载 | 当前是 `Decimal 1.0/1.1` 思路，不是 `V1/V2/V3`；缺少“发起修订草稿”闭环 | 复用历史版本能力，新增修订草稿语义和版本展示规则 |
| 生命周期 | `DocumentLifecycleService`, `archive`, `obsolete`, `publish`, `approve` | 发布、审批、修订关系尚未统一成用户可理解闭环 | 保留生命周期服务，补修订入口和状态约束 |
| Markdown 编辑 | `updateMarkdown`, `MarkdownEditor`, `MarkdownViewer` | 只允许草稿等可编辑状态，已发布文件缺少“发起修订后编辑草稿”路径 | 不开放已发布原地编辑，补修订草稿编辑 |
| 04 记录表单索引 | `RecordFormLandingEntry`, `RecordFormLandingService`, `RecordFormLandingIndex.vue` | 目前是手工维护入口，缺少落地状态、置信度、系统建议、字段覆盖差异 | 增强索引，不重建索引 |
| 动态表单 | `RecordTemplate`, `Record`, `DynamicForm.vue`, `RecordFill.vue`, `TemplateDesigner.vue`, `RecordService` | 已能建模板和填记录，但模板版本、落地关系、字段覆盖治理不足；前端 `updateFields` 与后端接口存在不一致风险 | 复用动态表单引擎，补治理层和接口一致性 |
| 编号规则 | `NumberRule`, `PendingNumber`, `generateDocumentNumber`, `DocumentCronService` 年度重置 | 当前只支持 `level + departmentId + sequence`，没有配置页和格式模板；记录模板编号未接入 | 增强现有 `NumberRule`，不另建编号系统 |
| Markdown 引用健康 | `MarkdownWikilinkService`, `DocumentReference`, `DocumentReferenceHealthService`, 文档详情引用健康 UI | 当前主要解析文件引用，不解析 04 表单索引和落地状态 | 扩展现有引用服务，不重做引用系统 |
| 文控工作台与问题清单 | `DocumentControlWorkbenchService`, `DocumentControlWorkbench.vue`, `DocumentControlIssueList.vue` | 问题类型还没有覆盖记录表单落地、字段覆盖、表单引用未落地 | 在现有工作台问题体系中扩展 |
| 阅读、培训、影响分析、审核覆盖 | `DocumentReadRequirementService`, `DocumentTrainingNeedService`, `DocumentImpactService`, `DocumentAuditCoverageService` 及对应页面 | 这些能力已独立存在，不应塞进记录表单或证据链主流程 | 作为文控上下文复用，只在详情页或工作台聚合摘要 |
| 证据链 | `DocumentEvidenceChainService`, `AuditChainExplorer.vue`, `EvidenceChainGraph.vue` | 独立入口不适合普通用户，页面要求手填 ID | 保留底层服务，移除主菜单入口，嵌入详情上下文 |

## 3. 核心定位

文控中心不是单纯文件库，而是：

```text
体系文件治理
+ 记录表单索引
+ 编号规则
+ 引用健康
+ 落地状态
+ 执行证据上下文
```

系统中有两类受控对象：

```text
文控中心
├── 受控文件：01 管理手册 / 02 程序文件 / 03 作业指导书 / 05 公司文件 / 06 外来文件
└── 记录表单：04 记录表单索引 / 表单模板 / 填写记录入口
```

两类对象同属文控体系，但闭环不同：

- 受控文件管“文件版本”。
- 记录表单管“表单入口、模板版本、填写记录和业务落地关系”。

## 4. 受控文件闭环

适用范围：

```text
01 管理手册
02 程序文件
03 作业指导书
05 公司文件
06 外来文件
```

现有基础：

- `Document` 已承载文档主体。
- `DocumentVersion` 已承载历史文件版本。
- `DocumentService` 已有上传、更新、审批、归档、作废、版本历史、历史版本预览/下载、回滚能力。
- `DocumentLifecycleService` 已有发布和 supersede 相关能力。
- `DocumentDetail.vue` 已展示生命周期按钮和历史版本。

当前缺口：

- 当前更新文件会直接在原文档上替换文件并把 Decimal 版本递增 `0.1`，不是“发起修订生成新草稿”。
- 当前版本展示仍是 `v{{ document.version }}`，会暴露 Decimal 显示问题。
- 当前缺少明确的 `V1/V2/V3` 用户版本语义。
- 当前缺少“已发布文档发起修订 -> 草稿 -> 审批 -> 发布 -> 原版本被替代”的完整用户入口。

生命周期：

```text
上传或新建文件
→ 系统按文控编号规则生成编号
→ V1 草稿
→ 提交审批
→ V1 发布
→ 发起修订
→ V2 草稿
→ 审批通过
→ V2 发布，V1 进入历史版本
```

规则：

- 已发布文件不允许原地编辑。
- 已发布文件只显示“发起修订”。
- 发起修订生成下一版本草稿，例如 `V2 草稿`。
- 草稿保存不影响当前已发布版本。
- 发布新版本后，旧版本保留为历史版本。
- 版本号统一显示为 `V1 / V2 / V3`。
- Markdown 正文只保存正文内容，不保存文件编号、版本、责任部门、复审日期等文件信息。
- Markdown 文件支持在线编辑草稿；非 Markdown 文件以查看、下载、重新上传修订稿为主。
- 实施时应优先改造现有 `DocumentService`、`DocumentLifecycleService` 和 `DocumentDetail.vue`，不要新建平行文档版本模块。

## 5. 文档详情页信息结构

文档详情页只保留一个统一的“文档信息”区，不再拆成基础信息和文控信息两块。

推荐字段：

```text
文档编号
文件名称
文件分类
文件类型
状态
版本号
责任部门
负责人
复审日期
创建人
创建时间
```

字段规则：

- 删除 `文件大小` 展示。
- 删除单独的 `文档级别`。
- 删除单独的 `来源分类`。
- `文档级别 + 来源分类` 合并成 `文件分类`，例如 `03 作业指导书`。
- 版本号只显示 `V1 / V2 / V3`，不得直接渲染 Decimal 内部对象。

按钮规则：

```text
草稿：编辑草稿、提交审批、查看、下载、删除草稿
已发布：发起修订、查看、下载、停用、归档、作废
审批中：查看、下载、查看审批、撤回
已归档/已作废：查看、下载、查看历史
```

证据链不作为独立主按钮强调，可在详情页中以“引用与执行情况”“关联记录”等区块展示。

## 6. 记录表单索引定位

`04 记录表单索引` 不是普通文件库，也不是所有表单的统一填写页。

现有基础：

- `RecordFormLandingEntry` 已经存在。
- `RecordFormLandingService` 已经能从 `ModelLandingService` 读取 283 张源表单，并叠加已维护的 landing entry。
- `RecordFormLandingIndex.vue` 已经能显示源编号、表单名、部门、链路定位和目标入口。
- 管理员当前已经能维护 `targetModule`、`targetModel`、`targetRoute`、`targetTemplateId`。

当前缺口：

- 当前索引只显示目标入口，不显示正式落地状态。
- 当前维护方式偏手工，没有系统建议、置信度和确认状态。
- 当前没有“部分落地”和字段覆盖差异。
- 当前没有把 Markdown 引用、模板状态、业务入口状态统一成健康度。

它的定位是：

```text
记录表单主索引
+ Markdown 引用解析目标
+ 业务落地关系地图
+ 动态表单承接入口
+ 未落地风险清单
+ 执行证据桥
```

每张源表单需要展示：

```text
源表单编号
源表单名称
归属部门
业务链路
被哪些体系文件引用
落地方式
目标入口
当前模板版本
是否可填写
最近记录
落地健康状态
```

落地方式包括：

```text
业务模块承接
动态表单承接
部分落地
未落地
不适合动态表单
```

用户从记录表单索引进入时，系统应告诉用户“这张表在哪里落地”，而不是强迫所有表都在索引页填写。

## 7. 业务模块承接

部分表单已经融合到业务模块，例如：

- 产品研发流程中的研发申请、研发计划、研发试验记录、开发评审等。
- 供应商模块中的供应商准入、资质、评价。
- 检验模块中的来料检验、成品检验、外检报告。
- 生产模块中的投料、过程监控、清洁消毒、放行相关记录。

这些表单不应再重复创建动态表单模板。记录表单索引只维护绑定关系：

```text
源表单编号
→ targetModule
→ targetModel
→ targetRoute
→ landingStrategy = business_module
```

用户实际填写时仍进入业务模块。

## 8. 动态表单承接

动态表单不是新模块。系统已经有 `RecordTemplate`、`Record`、`DynamicForm.vue`、`RecordFill.vue`、`TemplateDesigner.vue` 和 `RecordService`，后续工作是在这些现有能力上补治理和落地关系。

现有能力：

- `RecordTemplate.fieldsJson.fields` 已能定义字段结构。
- `DynamicForm.vue` 已能按模板渲染填写表单。
- `RecordFill.vue` 已能通过 `/records/fill/:templateId` 填写记录。
- `RecordService.create` 已能生成 `Record`，并支持偏差校验、批次关联、工作流触发。
- `DynamicFormBatchService` 已能按批次查询动态表单提交记录。
- `TemplateDesigner.vue` 已提供字段设计体验。

当前不足：

- 动态表单和 `04 记录表单索引` 的承接关系还只是手工绑定。
- 缺少“业务模块承接 / 动态表单承接 / 部分落地 / 未落地 / 不适合动态表单”的正式状态。
- 缺少系统预识别和管理员确认。
- 缺少字段覆盖差异清单。
- 缺少“从 04 索引一键创建或绑定动态模板”的完整入口。
- `recordTemplateApi.updateFields()` 调用 `/record-templates/:id/fields`，但后端 `RecordTemplateController` 当前没有这个路由；实施时必须先统一前后端契约。

动态表单用于承接没有独立业务模块的简单合规记录。

适合动态表单承接的类型：

- 日常检查
- 简单巡查
- 签到确认
- 轻量台账
- 暂时没有复杂业务状态机的记录

不适合动态表单独立承接的类型：

- 供应商准入
- 来料检验
- 生产批次投料
- 成品放行
- 投诉召回
- 追溯演练
- 涉及核心主数据和批次链路的复杂流程

动态表单闭环：

```text
记录表单索引
→ 创建或绑定动态表单模板
→ 配置字段、校验规则、责任部门、填写频率、审批要求
→ 启用模板
→ 用户填写
→ 生成 Record
→ 审批、签名、偏差处理、查询、导出
```

实施要求：

- 不新建第二套动态表单引擎。
- 不把已经由业务模块承接的表单复制进动态表单。
- 先通过 `RecordFormLandingEntry` 建立源表单到模板或业务入口的关系。
- 对已存在模板只做绑定和治理，不要求用户重新录字段。
- 对接口不一致处先修契约，再扩展页面能力。

## 9. 部分落地处理

部分落地指系统中已经有相关业务页面或模型，但不能确认是否完整覆盖源表单字段和流程。

规则：

- 部分落地不自动补动态表单。
- 系统先生成字段覆盖差异清单。
- 管理员再决定处理方式。

处理选项：

```text
补到业务模块
用动态表单补充
标记为无需系统化
标记为不适合动态表单
```

字段覆盖差异至少包括：

```text
源表单字段
现有业务字段
已覆盖字段
缺失字段
名称不同但语义相同字段
无需系统化字段
建议处理方式
```

## 10. 系统预识别与管理员确认

记录表单索引的落地关系采用：

```text
系统预识别
→ 管理员确认
→ 正式生效
```

该能力当前尚未完整实现，但必须基于现有 `ModelLandingService` 和 `RecordFormLandingService` 增强。

系统预识别线索：

- 已有 `RecordFormLandingEntry`。
- 已有 `RecordTemplate`。
- 现有业务路由和业务模块。
- model-landing 中的 283 张表单分类、链路定位和实体归类。
- Markdown 引用关系。

示例：

```text
源表单：GRSS-KF-JL-11 研发试验记录
系统建议：业务模块承接
候选入口：产品研发流程 Step 3
置信度：高
状态：待确认
操作：确认 / 修改 / 标记部分落地 / 标记不适合动态表单
```

确认后状态变为 `已确认落地`。

冲突场景：

```text
同一源表单同时匹配业务模块和动态模板
同一源表单绑定多个入口
Markdown 引用对象存在，但入口未确认
业务入口存在，但模板版本停用
```

冲突应进入“引用问题”或“落地问题”清单，由管理员处理。

## 11. 记录表单模板版本

记录表单模板不是普通文件版本，而是字段结构版本。

现有基础：

- `RecordTemplate.version` 已存在。
- `RecordTemplateService.createNewVersion()` 已存在。
- `RecordTemplateService.getVersionHistory(code)` 已存在。

当前缺口：

- 当前新版本通过 `existing.code + -vN` 生成新编号，会把同一模板族拆成多个业务编号。
- 当前会直接归档旧版本并创建 `active` 新版本，缺少草稿、审批、启用的受控过程。
- 当前 `Record` 只保存 `templateId`，可追到当时模板记录，但模板族关系不清晰。
- 当前模板更新接口允许直接更新 `fieldsJson`，对已启用模板的结构变更约束不足。

闭环：

```text
模板 V1 草稿
→ 设计字段结构
→ 审批通过
→ V1 启用
→ 用户按 V1 填写记录
→ 发起模板改版
→ V2 草稿
→ 审批通过
→ V2 启用，V1 停止新填但历史记录继续按 V1 查看
```

规则：

- 已启用模板不允许原地修改字段结构。
- 发起改版生成下一版本草稿。
- 同一表单模板编号下保留 `V1 / V2 / V3`。
- 不应通过 `code-v2` 这种方式制造新的业务编号。
- 历史记录必须绑定当时使用的模板版本。
- 新记录默认使用最新启用版本。

## 12. 编号规则

编号规则放在文控中心，不做全系统通用编号平台。

编号规则也不是从零实现。系统已经有一套简化编号能力：

- `NumberRule`：当前字段为 `level`、`departmentId`、`sequence`。
- `PendingNumber`：用于删除编号后的补位复用。
- `DocumentService.generateDocumentNumber(level, departmentId)`：已通过事务和 `SELECT FOR UPDATE` 生成文档编号。
- `DocumentCronService.resetAnnualNumberSequences()`：已有年度重置序号能力。
- `packages/types/api.ts` 已定义 `NumberRule` 前端类型。

当前不足：

- 现有规则格式写死为 `{level}-{department.code}-{seq}`。
- 没有编号规则配置页面。
- 没有规则管理 API。
- 没有固定前缀、分类代码、格式模板、序号位数、分隔符、启停状态、规则锁定、已使用次数等配置。
- 记录表单模板 `RecordTemplate.code` 仍由用户传入，没有接入文控编号规则。
- 记录实例编号另由 `DocumentNoService` 按 `templateCode-date-seq` 生成，应保留为“填写记录编号”，不要和“模板编号”混淆。

覆盖对象：

```text
体系文件编号规则
记录表单模板编号规则
```

实现原则：

- 复用现有 `NumberRule`。
- 当前已存在编号继续保留。
- 新文件和新模板按启用规则自动生成编号。
- 普通用户不手填最终编号。
- 管理员配置规则。
- 规则已产生编号后，关键格式字段不允许直接修改，只能停用后新建规则。
- 记录实例编号继续保留 `DocumentNoService` 语义，除非后续单独设计“记录编号规则”。

规则配置项：

```text
适用对象：体系文件 / 记录表单
适用分类：01 / 02 / 03 / 04 / 05 / 06
固定前缀
部门代码
分类代码
序号位数
分隔符
是否按部门独立编号
是否年度重置
```

示例配置：

```text
格式：{公司前缀}-{部门代码}-{文件类别代码}-{序号2位}
结果：GRSS-PZ-ZD-08
```

该格式只是公司配置，不应写死在代码里。

## 13. Markdown 引用与引用健康

Markdown 正文可以引用体系文件、记录表单和业务入口。

引用能力已有基础，不能重做：

- `MarkdownWikilinkService` 已能解析 `[[...]]`。
- 保存 Markdown 草稿时已能同步 `DocumentReference`。
- 当前可按 `Document.number`、`Document.title`、`Document.doc_code` 匹配受控文件。
- 已支持 `unresolved_document` 和 `conflict_document`。
- `DocumentReferenceHealthService` 已能输出 `healthy / dangling / invalid / conflict / superseded`。
- `DocumentDetail.vue` 已展示引用健康概览和问题处理动作。
- `SystemDocumentCenter.vue` 已能调用全局引用问题清单。

当前不足：

- 当前 wikilink 主要解析受控文件，不解析 `04 记录表单索引`。
- 当前健康检查只查 `document / unresolved_document / conflict_document`，没有覆盖 `record_form_landing`。
- 还不能判断“表单存在但未落地”“业务入口冲突”“模板停用”“表单已被业务模块承接”。
- 设计中的 `unimplemented` 状态尚未实现。
- 引用问题清单还没有合并“文件引用问题 + 记录表单落地问题”。

引用记录表单时，系统应从 `04 记录表单索引` 解析目标，而不是只做文本链接。

示例：

```markdown
生产过程应填写 [[GRSS-ZZ-JL-43 玻璃及硬塑制品检查表]]
```

系统应判断：

```text
源表单是否存在
是否已落地
落地方式是什么
是否有填写入口
是否有启用模板
是否已被业务模块承接
是否有新版本
是否已停用或作废
```

引用健康状态：

```text
healthy：引用存在，且落地关系有效
dangling：引用对象不存在
unimplemented：表单存在，但没有业务入口或动态模板
invalid：引用对象已停用、作废或不可用
superseded：引用对象已有新版本
conflict：同一表单存在多个冲突入口
```

引用问题页以可处理清单展示，不做关系图谱。

实施要求：

- 扩展 `MarkdownWikilinkService`，让 `[[GRSS-xx-JL-xx 表单名]]` 能解析到 `RecordFormLandingEntry`。
- 扩展 `DocumentReference.targetType` 的使用范围，增加或规范 `record_form_landing`、`unresolved_record_form`、`conflict_record_form`。
- 扩展 `DocumentReferenceHealthService`，把表单落地状态纳入健康判断。
- 复用 `DocumentReference` 表，不新建平行引用表。

## 14. 执行证据展示

证据链不作为独立主导航模块。

现有基础：

- `DocumentEvidenceChainService` 已能从 document、record_template、record、change_event、audit_finding、corrective_action 聚合关系。
- `AuditChainExplorer.vue` 和 `EvidenceChainGraph.vue` 已存在。
- 文档详情页已能跳转证据链页面。

当前处理决策：

- 保留后端服务、API、共享类型和路由。
- 不再保留左侧菜单独立入口。
- 后续用户侧展示改为详情页内的“引用与执行情况”“关联记录”“执行证据”。

保留底层关系查询能力，但用户侧嵌入到具体页面：

```text
体系文件详情页：
  显示引用了哪些记录表单、这些表单是否已落地、最近记录情况。

记录表单索引详情页：
  显示被哪些体系文件引用、落地到哪个业务模块或动态表单、最近填写记录。

业务记录详情页：
  显示来源表单、支撑哪些体系文件要求、相关审批和签名。
```

菜单中不再保留独立“审核链路/证据链”入口。

## 15. 页面结构

文控中心主入口建议保留：

```text
体系文件中心
记录表单索引
编号规则
引用问题
文控工作台
```

其他能力根据成熟度和使用频率嵌入详情页或工作台，例如阅读确认、培训需求、影响分析、审核覆盖。

现有页面复用要求：

- `DocumentControlWorkbench.vue` 和 `DocumentControlIssueList.vue` 已存在，落地问题和引用问题应优先并入现有问题清单体系。
- `ReadConfirmationCenter.vue`、`TrainingNeedCenter.vue`、`ImpactAnalysisWorkbench.vue`、`AuditCoverageCenter.vue` 已存在，不应重复成新菜单。
- `DocumentHealthDashboard.vue` 已存在，健康指标可以扩展记录表单落地健康。
- `AuditChainExplorer.vue` 保留路由和调试能力，但不再作为主菜单。

体系文件详情页重点：

- 文档信息
- 正文查看或草稿编辑
- 引用关系
- 修订历史
- 审批状态
- 关联执行记录摘要

记录表单索引详情页重点：

- 源表单信息
- 落地方式
- 目标入口
- 当前模板版本
- 被引用文件
- 最近记录
- 字段覆盖差异
- 管理员确认状态

编号规则页重点：

- 规则列表
- 新建规则
- 停用规则
- 查看已使用次数
- 查看最近生成编号
- 规则冲突检查

引用问题页重点：

- 问题类型
- 来源文件
- 引用目标
- 风险原因
- 建议动作
- 一键跳转处理

## 16. 数据模型调整方向

### 16.1 `NumberRule`

在现有模型基础上增强配置能力，而不是重建。当前模型只有 `level`、`departmentId`、`sequence`，实施时以迁移扩展现表为主。

建议补充：

```text
scope
sourceFolder
prefix
categoryCode
format
sequencePadding
separator
resetPolicy
isActive
lockedAfterUse
usedCount
```

### 16.2 `RecordFormLandingEntry`

建议补充：

```text
landingStatus
confirmationStatus
confidence
confirmedBy
confirmedAt
fieldCoverageStatus
fieldCoverageSummary
primaryRoute
sourceFormVersion
```

当前模型已有 `sourceCode`、`targetModule`、`targetModel`、`targetRoute`、`targetTemplateId`、`landingStrategy`、`relatedDocIds`、`notes`，实施时只补治理字段。

### 16.3 `RecordTemplate`

建议从“code-v2”改成“同一模板族下的版本”。

建议补充：

```text
templateFamilyId
baseCode
version
versionStatus
supersedesId
effectiveAt
retiredAt
approvedBy
approvedAt
```

历史记录必须能追到填写时使用的模板版本。

当前 `RecordTemplate.version` 已存在，`Record.templateId` 已能绑定具体模板版本记录；需要补的是模板族和受控状态，不是重建模板表。

### 16.4 `Document`

建议统一版本展示和修订关系。

现有 `version Decimal` 可继续兼容，但前端展示必须转成 `V1 / V2 / V3`。

如后续需要更稳定，可增加：

```text
versionNo Int
revisionOfId
revisionStatus
```

当前已有 `version Decimal`、`DocumentVersion`、`superseded_by_id`、`lineage_key` 等字段，实施时优先复用这些字段并补用户可理解的修订语义。

## 17. API 调整方向

建议新增或调整。凡已有 API 必须复用或兼容，不得并行创建语义重复接口。

```text
POST /documents/:id/revisions
PATCH /documents/:id/draft
POST /documents/:id/submit
POST /documents/:id/publish

GET /documents/number-rules
POST /documents/number-rules
PATCH /documents/number-rules/:id
POST /documents/number-rules/:id/deactivate

GET /documents/record-form-index/landing-suggestions
POST /documents/record-form-index/:code/confirm
PATCH /documents/record-form-index/:code
GET /documents/record-form-index/:code/field-coverage

POST /record-templates/:id/revisions
PATCH /record-templates/:id/draft
POST /record-templates/:id/submit
POST /record-templates/:id/activate
```

现有 API 应尽量复用，避免重复建平行能力。

现有 API 对照：

- 文档版本历史、对比、回滚、历史预览、历史下载已存在，应继续复用。
- 文档归档、作废、恢复、发布、审批已存在，应继续复用。
- Markdown 更新 API 已存在，但只能用于可编辑草稿。
- 记录表单索引 list/update 已存在，应扩展建议和确认接口。
- 记录模板 create/update/new-version/versions 已存在，应修正版本语义。
- 前端 `recordTemplateApi.updateFields()` 与后端缺少 `PUT /record-templates/:id/fields` 的契约不一致必须处理。

## 18. 权限规则

建议权限：

```text
document:view
document:create
document:revise
document:approve
document:publish
document:archive
document:obsolete

record_form:index_view
record_form:landing_manage
record_form:template_create
record_form:template_revise
record_form:template_approve

document:number_rule_manage
document:reference_issue_manage
```

原则：

- 普通用户可查看已发布文件。
- 有权限用户可发起修订。
- 草稿创建者可编辑自己的草稿。
- 管理员或文控角色可编辑所有草稿、管理编号规则、确认落地关系。
- 已发布文件和已启用模板不允许原地改结构。

## 19. 验证重点

必须验证：

- 已发布文件不能原地编辑。
- 发起修订生成新版本草稿。
- 新版本发布后旧版本仍可查看。
- 版本号显示为 `V1 / V2 / V3`。
- 文档详情页不再显示重复字段和文件大小。
- Markdown 正文不再依赖“文件信息”段。
- 编号由规则生成，不能由普通用户手填。
- 记录表单索引能显示业务模块承接、动态表单承接、部分落地、未落地、不适合动态表单。
- 已业务模块承接的表单不会重复创建动态模板。
- 部分落地先生成字段覆盖差异，不自动补动态表单。
- Markdown 引用记录表单时能进入引用健康检查。
- 独立证据链菜单入口移除，但底层查询能力保留。
- 不重复实现已有 `RecordTemplate/Record/DynamicForm`。
- 不重复实现已有 `NumberRule/PendingNumber/generateDocumentNumber`。
- 不重复实现已有 `MarkdownWikilinkService/DocumentReferenceHealthService`。
- 模板设计器前后端字段更新接口契约一致。

## 20. 非目标

本设计不做以下事情：

- 不把供应商证照、外检报告、产品外检 PDF 的有效期维护放进体系文件中心主流程。
- 不把所有记录表单强制迁移到动态表单。
- 不用动态表单替代研发、供应商、检验、生产等核心业务模块。
- 不做关系图谱。
- 不做全系统统一编号平台，只做文控范围编号规则。
- 不删除已有证据链 API 和服务。

## 21. 决策总结

最终设计决策：

- 受控文件走“发起修订”而不是已发布原地编辑。
- 01/02/03/05/06 进入受控文件闭环。
- 04 是记录表单索引和执行桥，不是普通文件。
- 记录表单索引用系统预识别加管理员确认。
- 动态表单只承接没有独立业务模块的简单表单。
- 已融合到业务模块的表单只绑定入口，不重复录字段。
- 部分落地先做字段覆盖差异。
- 编号规则放在文控中心，复用并增强 `NumberRule`。
- Markdown 引用必须能解析到文件、表单索引和落地状态。
- 证据链降级为内嵌上下文能力，不作为主导航入口。
