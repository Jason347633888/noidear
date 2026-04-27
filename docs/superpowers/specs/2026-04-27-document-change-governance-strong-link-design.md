# 文控与变更治理强引用闭环设计

## 1. 背景

当前系统已经具备文档管理、文控中心、文控运营、变更管理、培训、内审、审批等模块，但这些模块之间仍存在“部分强关联 + 部分弱引用”的状态。

已经较可靠的关系包括：

- `DocumentReference` 维护文档与文档、文档与外部目标之间的引用关系。
- `DocumentReadRequirement` / `DocumentReadConfirmation` 强关联 `Document`。
- `DocumentTrainingNeed` 强关联 `Document`。
- `DocumentImpactReview` 能从文档引用、记录表单入口生成影响项。
- `DocumentHealthService` 能汇总复审、外来文件到期、阅读逾期、培训需求、影响项等状态。

主要问题是：这些能力还没有完全串成业务闭环，部分字段只保存字符串、路由或目标 ID，数据库层面无法证明目标对象真实存在，也难以从业务逻辑上回答“某次变更影响了哪些文件、表单、记录、培训、审核和整改”。

本设计目标是把文控治理和变更治理统一到一条强关系主线中，减少重复评审和弱引用。

## 2. 设计目标

1. 统一文档状态口径，避免 `approved` 与 `effective` 混用。
2. 把文控字段中的关键弱引用收紧为强关系或显式校验关系。
3. 以 `ChangeEvent` 作为统一变更主事件，承接文档、产品、配方、工艺、HACCP、设备、供应商等变更。
4. 复用现有 `RecordTemplate` 表单模板，通过 `Record` 的填写用途区分初次确认、变更验证和周期复评，避免复制表单模板。
5. 让文控工作台从“数量看板”升级为“问题池 + 修复入口”。
6. 逐步形成合规证据链：文件 -> 表单 -> 记录 -> 审批 -> 审核 -> 整改。

## 3. 非目标

本阶段不做以下事情：

- 不删除现有业务表单，除非已经明确判定为重复并完成历史依赖检查。
- 不复制“初次验证表”“变更验证表”“周期复评表”等平行模板。
- 不把所有评审表单合并成一张大表。
- 不重写审批平台。
- 不重构全部食品安全追溯链。
- 不一次性迁移所有历史数据到完整强外键。

设计采用渐进式收紧：先补强最关键关系，再把变更主线和文控闭环接起来。

例外处理：`产品更改申请表` 功能已被 `ChangeEvent + ChangeApproval + ChangeEventFormTask` 覆盖，属于重复表单，允许从默认表单配置中退役；是否物理删除历史模板和历史记录，放到迁移阶段单独确认。

## 4. 当前问题归类

### 4.1 文档状态口径不统一

旧文档列表使用 `approved` 表示已发布，新文控体系文件库使用 `effective` 表示有效。两个状态语义接近，但筛选和展示不一致。

建议统一为：

- `draft`：草稿
- `pending`：待审批
- `rejected`：已驳回
- `effective`：已生效
- `archived`：已归档
- `obsolete`：已作废

兼容策略：

- 服务层读取时短期兼容 `approved`。
- 新写入统一使用 `effective`。
- 后续提供一次性数据迁移将 `approved` 转为 `effective`。

### 4.2 文控部门字段弱引用

`Document.owner_department` 当前是字符串，无法和 `Department`、权限、统计稳定联动。

建议新增或启用：

- `ownerDepartmentId -> Department.id`
- `ownerUserId -> User.id`

保留 `owner_department` 作为历史展示字段或冗余快照，但业务判断以 ID 字段为准。

### 4.3 记录表单索引弱引用

`RecordFormLandingEntry` 当前主要通过以下字段定位目标：

- `targetModule`
- `targetModel`
- `targetRoute`
- `targetTemplateId`
- `relatedDocIds`

其中 `targetTemplateId`、`relatedDocIds` 应该具备更强约束。

建议：

- `targetTemplateId` 强关联 `RecordTemplate.id`。
- `relatedDocIds` 短期保留数组，服务层校验每个文档存在；长期拆为关联表 `RecordFormLandingDocument`。
- `targetRoute` 继续保留，因为它是前端导航入口，不适合作为唯一业务事实源。

### 4.4 培训需求弱引用

`DocumentTrainingNeed.linkedTrainingProjectId` 当前只是字符串。

建议改为：

- `linkedTrainingProjectId -> TrainingProject.id`

业务规则：

- 培训需求可以先处于 `suggested` 或 `accepted`。
- 只有关联真实培训项目后才能进入 `linked`。
- 如果培训项目被删除或归档，需要保留历史快照，不能静默断链。

### 4.5 阅读要求范围弱引用

`DocumentReadRequirement.scopeType/scopeId` 支持 `department`、`role`、`user`，但当前缺少目标存在性校验。

建议短期使用服务层校验：

- `scopeType=user` 时校验 `User.id`。
- `scopeType=department` 时校验 `Department.id`。
- `scopeType=role` 时校验 `Role.id`。

长期可以视使用频率决定是否拆成三类专用表；当前不建议过早拆分。

### 4.6 变更评审表单分散

现有表单中，多张表单都在做变更、影响、评审、验证或审批，包括：

- 产品开发评审记录
- 产品验证记录表
- 工艺流程图确认记录
- 工艺、配料变更、复称、评估、验证记录
- 变更申请表
- 前提方案（PRP）验证记录
- 危害控制计划确认、验证记录
- 车间布局变更 HACCP 风险评估确认、验证记录
- 小批量生产变更验证确认表

这些表单不应被删除，也不应按“初次/变更/周期”复制模板。它们应继续作为现有 `RecordTemplate` 表单模板使用；每次填写生成 `Record`，由 `Record.usageType` 标记本次填写用途。

`产品更改申请表` 不再列入目标保留表单。它和统一变更申请、审批放行功能重复，应从变更类型默认带出表单中删除；后续迁移时可把它设为 `retired` 或物理删除空模板。

关键边界：

- 初次验证、初次确认、初次建立基线不是变更，不创建 `ChangeEvent`。
- 变更触发的验证、评审、确认才进入 `ChangeEvent`。
- 周期复评或定期验证可以复用同一张表单模板，但不强制进入 `ChangeEvent`。
- `ChangeEvent` 负责串联变更闭环，不接管所有验证场景。
- `产品开发评审记录` 属于产品研发流程评审，不属于通用变更流程默认表单。

### 4.7 文档管理功能半闭环

当前 `文档管理` 和 `文控中心` 已有不少页面和接口，但多个功能仍处于“能看、不能完整操作”的状态。

已确认问题：

- 版本管理只在文档详情页展示历史版本，前端没有查看历史版本、下载历史版本、版本对比、回滚入口。
- 后端已有 `versions`、`compare`、`rollback` 接口，但版本历史不包含当前版本快照，回滚缺少原因、权限和完整审计语义。
- 上传页按钮写“提交审批”，但后端创建文档后只保存为 `draft`，没有自动提交审批。
- 旧文档管理使用 `approved`，文控体系文件库和健康度使用 `effective`，状态筛选和操作条件不一致。
- 体系文件库只能筛选和查看，不能从列表进入补元数据、复审、归档、作废等动作。
- 记录表单索引后端有维护接口，前端只展示和跳转，没有编辑目标入口、目标模板、相关文件的 UI。
- 文控工作台只显示数量和部分列表，卡片不能点击进入明细，也不能直接处理问题。
- 阅读确认、影响分析、审核覆盖、审核链路等页面更像调试查询工具，缺少从文档详情和工作台进入的业务路径。

第一批优化目标不是重做全部文控系统，而是把文档模块最常用的生命周期功能做成可操作闭环。

## 5. 目标业务模型

### 5.1 表单模板与填写记录

`RecordTemplate` 指当前系统中已经上传、导入或维护的记录表单模板，例如：

- 产品验证记录表
- 工艺流程图确认记录
- 工艺、配料变更、复称、评估、验证记录
- 危害控制计划确认、验证记录
- 小批量生产变更验证确认表

`RecordTemplate` 是空白表单模板；`Record` 是基于模板填写出来的一次实际记录。同一张模板可以在不同业务场景下重复使用。

建议为 `Record` 增加填写用途字段：

```text
Record
  -> templateId
  -> usageType: initial | change | periodic
  -> sourceType
  -> sourceId
  -> changeEventId?
```

用途定义：

- `initial`：初次验证、初次确认、初次建立基线。
- `change`：变更触发的验证、评审、确认。
- `periodic`：周期复评、定期验证、年度确认。

第一版不引入 `revalidation`、`abnormal` 等更细场景，避免让用户重新判断过多分类。

### 5.2 三类入口

同一张表单模板通过不同入口生成 `Record`：

```text
入口 1：初次建立
  -> 选择或创建业务对象
  -> 系统带出对应 RecordTemplate
  -> 填写 Record
  -> usageType = initial
  -> sourceType/sourceId = 业务对象或流程对象
  -> changeEventId = null

入口 2：变更流程
  -> 创建 ChangeEvent
  -> 选择 changeType
  -> 系统带出对应 RecordTemplate
  -> 填写 Record
  -> usageType = change
  -> sourceType/sourceId = change_event / ChangeEvent.id
  -> changeEventId = 当前 ChangeEvent

入口 3：周期复评
  -> 周期任务或复评入口
  -> 系统带出对应 RecordTemplate
  -> 填写 Record
  -> usageType = periodic
  -> sourceType/sourceId = 周期任务或被复评对象
  -> changeEventId = null
```

`ChangeEvent` 只是第二类入口，不是所有验证记录的总入口。

### 5.3 产品研发评审边界

`产品开发评审记录` 对应 `GRSS-KF-JL-01`，应直接挂在产品研发流程 `ProcessInstance` 下，而不是挂到通用 `ChangeEvent` 下。

当前产品研发 7 步流程已经有明确位置：

```text
Step 1: 新产品开发申请书 (JL-09)
Step 2: 新产品开发计划书 (JL-10)
Step 3: 研发试验记录 (JL-11)
Step 4: 产品开发评审 (JL-01)
Step 5: 产品标签信息记录 (JL-04)
Step 6: 产品操作规程 (JL-02) + 产品配方以及工艺参数 (JL-06)
Step 7: 产品验证记录 (JL-07)
```

因此：

- 新产品首次开发时，`产品开发评审记录` 由产品研发流程 Step 4 生成 `Record(usageType=initial)`。
- 产品开发流程中的 Step 4 多部门评审结果决定是否进入标签、规程、配方工艺和最终验证阶段。
- 后续产品、配方、工艺发生真实变更时，才创建 `ChangeEvent`。
- 通用变更流程不默认带出 `产品开发评审记录`，除非未来明确存在“产品研发流程外的产品复审”场景。

`产品更改申请表` 对应 `GRSS-KF-JL-03`，后续不再作为独立表单使用：

- 申请信息由 `ChangeEvent` 承载。
- 审批意见由 `ChangeApproval` 或统一审批实例承载。
- 需要填写的专业评审和验证内容由 `ChangeEventFormTask -> RecordTemplate -> Record` 承载。
- 该表单从默认表单包、记录表单索引推荐和新建变更带出逻辑中移除。

### 5.4 统一变更主线

所有真实变更先进入 `ChangeEvent`：

```text
ChangeEvent
  -> ChangeImpactAssessment
  -> ChangeEventFormTask
      -> RecordTemplate
      -> Record(usageType=change)
  -> DocumentImpactReview
  -> ChangeComplianceRecord
  -> ChangeVerificationRecord
  -> ChangeApproval
  -> DocumentTrainingNeed
  -> RelatedDocuments
  -> RelatedRecordTemplates
  -> RelatedProducts
  -> RelatedRecipes
  -> RelatedProcessSteps
  -> RelatedMaterials
  -> RelatedSuppliers
  -> RelatedEquipment
  -> RelatedBatches
```

`ChangeEvent` 是统一主事件，子记录负责不同专业环节。原有表单模板不被吞并；变更流程只负责按变更类型自动带出需要填写的模板，并把填写后的 `Record` 挂回本次变更。

### 5.5 变更类型

第一版支持以下变更类型：

- `document`：文件/制度/作业指导书变更
- `record_form`：记录表单或表单入口变更
- `product`：产品主数据或规格变更
- `recipe`：配方变更
- `process`：工艺步骤、参数、CCP/PRP 变更
- `equipment`：设备、布局、维护相关变更
- `supplier`：供应商或物料准入变更
- `haccp`：食品安全计划、危害分析、控制措施变更
- `other`：其他变更

### 5.6 子环节职责

`ChangeImpactAssessment`：
统一影响范围清单，记录哪些对象受影响、影响等级、建议动作。

`ChangeEventFormTask`：
记录本次变更默认需要填写哪些表单模板，以及每张表单对应的填写状态。它是“变更类型 -> 默认带出哪些表”的结果，不是用户额外维护的业务模块。

`DocumentImpactReview`：
只处理文控影响，例如引用文件、记录表单入口、阅读确认、培训需求、文档复审。

`ChangeComplianceRecord`：
处理食品安全、法规、HACCP、PRP、过敏原、召回、追溯等合规影响。

`ChangeVerificationRecord`：
记录变更层面的验证摘要、验证结论和放行判断。详细填写内容优先落在对应 `RecordTemplate -> Record` 上，避免和原有验证表单重复录入。

`ChangeApproval`：
记录最终审批、放行、驳回或补充验证要求。

`DocumentTrainingNeed`：
承接变更带来的阅读和培训动作。

## 6. 数据关系设计

### 6.1 新增或调整字段

`Document`：

- 新增 `ownerDepartmentId String?`
- 新增 `ownerUserId String?`
- 保留 `owner_department String?` 作为历史展示字段。

`RecordFormLandingEntry`：

- `targetTemplateId` 关联 `RecordTemplate.id`。
- 长期新增 `RecordFormLandingDocument` 代替 `relatedDocIds String[]`。

`Record`：

- 新增 `usageType String?`，第一版允许值为 `initial`、`change`、`periodic`。
- 新增 `sourceType String?`，记录本次填写来源对象类型，例如 `product`、`recipe`、`process_step`、`document`、`supplier`、`haccp_plan`。
- 新增 `sourceId String?`，记录本次填写来源对象 ID。
- 新增 `changeEventId String?`，仅 `usageType=change` 时关联 `ChangeEvent.id`。
- 保留现有 `entity_links Json?`，用于兼容历史或多对象弱引用；新增结构化字段用于主链查询。

产品研发流程中的记录建议使用：

- `sourceType = process_instance`
- `sourceId = ProcessInstance.id`
- `usageType = initial`

例如 `产品开发评审记录` 应以这种方式挂到产品研发流程 Step 4。

`DocumentTrainingNeed`：

- `linkedTrainingProjectId` 关联 `TrainingProject.id`。

`DocumentImpactReview`：

- 新增 `changeEventId String?`，关联 `ChangeEvent.id`。
- 保留 `sourceType/sourceId`，用于兼容文档或其他来源触发。

`DocumentImpactItem`：

- 保留 `targetType/targetId/targetRoute`。
- 服务层对已知 `targetType` 做目标存在性校验。

`DocumentReadRequirement`：

- 暂不拆表。
- 创建和更新时对 `scopeType/scopeId` 做服务层校验。

新增 `ChangeEventFormTask`：

- `changeEventId` 关联 `ChangeEvent.id`。
- `templateId` 关联 `RecordTemplate.id`。
- `recordId` 可选关联 `Record.id`。
- `status` 第一版使用 `pending`、`filled`、`approved`。
- `required` 标记这张表是否为当前变更类型默认必填。
- `sortOrder` 控制显示顺序。

第一版不做“不适用并写原因”、不做附件上传、不做关联已有记录。用户在变更流程里填写出来的 `Record` 才挂到当前 `ChangeEventFormTask`。

### 6.2 推荐新增关联表

为避免 `ChangeEvent` 直接加过多 nullable 字段，建议新增统一关联表：

```text
ChangeEventRelation
  id
  changeEventId
  targetType
  targetId
  targetRoute
  targetLabel
  relationType
  impactLevel
  requiredAction
  status
```

用途：

- 关联文档、表单模板、产品、配方、工艺步骤、设备、供应商、批次等对象。
- 支撑统一影响分析。
- 支撑合规证据链。

已知 `targetType` 应通过服务层校验，未知或外部系统目标允许保存快照，但要标记为弱引用。

`ChangeEventRelation` 只用于关联变更影响对象，不替代表单填写记录。表单填写仍由 `ChangeEventFormTask -> RecordTemplate -> Record` 表达。

## 7. 页面与流程设计

### 7.1 文控中心菜单

左侧只保留一个顶级 `文控中心`，其下包含：

- 体系文件库
- 文档台账
- 模板管理
- 记录表单索引
- 文控工作台
- 阅读确认
- 培训需求
- 文控健康度
- 审核覆盖
- 变更影响评审
- 合规证据链

### 7.2 统一变更页面

新增或改造 `变更管理 -> 新建变更`，页面分为：

- 基本信息
- 默认表单
- 审批放行
- 证据链

用户操作流程：

1. 新建变更。
2. 选择变更类型。
3. 系统根据变更类型自动生成 `ChangeEventFormTask`。
4. 页面直接显示本次需要填写的表单列表。
5. 用户逐张填写表单，生成 `Record(usageType=change)`。
6. 表单完成后提交审批。

页面不暴露“变更场景模板”概念，也不要求用户手工挑选一堆评审节点。

第一版表单任务状态只保留：

- `pending`：未填写。
- `filled`：已填写。
- `approved`：已审批或已确认。

不提供以下操作：

- 标记不适用并填写原因。
- 上传附件。
- 关联已有记录。

如果某类变更确实需要食品安全、HACCP、文控、验证等评审，应该体现在默认带出的表单模板中，而不是让用户重新判断该走哪些环节。

### 7.3 初次建立与周期复评入口

初次验证和周期复评不从 `变更管理` 进入。

初次建立入口：

- 新建产品、新建配方、新建工艺步骤、新建 HACCP 控制点、新建文件或首次发布前确认时，系统带出对应表单模板。
- 填写后生成 `Record(usageType=initial)`。
- 该记录作为初始基线证据。

产品研发初次建立入口：

- 继续使用 `产品研发流程（7步）`。
- `产品开发评审记录` 固定为 Step 4。
- Step 4 通过后，才继续进入产品标签、操作规程、配方工艺参数和产品验证。
- Step 4 生成的记录使用 `sourceType=process_instance`、`sourceId=ProcessInstance.id`、`usageType=initial`。

周期复评入口：

- 周期任务、年度复评或定期验证入口带出对应表单模板。
- 填写后生成 `Record(usageType=periodic)`。
- 该记录作为周期性确认或复评证据。

这两个入口可以复用同一张 `RecordTemplate`，但不创建 `ChangeEvent`。

### 7.4 文控工作台升级

文控工作台不只显示数量，而要显示问题明细和处理动作：

- 元数据缺失 -> 进入文档编辑或快速补齐面板
- 表单入口缺失 -> 进入记录表单索引维护
- 阅读逾期 -> 进入阅读确认列表
- 培训需求未处理 -> 进入培训需求处理
- 影响项未关闭 -> 进入变更影响评审
- 作废文件仍被引用 -> 进入引用关系和影响分析

### 7.5 文档管理第一批可用性完善

第一批把 `文档管理` 从“列表 + 详情展示”补成可用的文控台账。

#### 状态统一

新写入统一使用：

```text
draft -> pending -> effective
draft/rejected -> pending
pending -> rejected
effective -> archived
effective -> obsolete
archived -> effective
```

兼容旧值：

- 读取时 `approved` 按 `effective` 展示。
- 归档、作废、下载、预览、版本管理等操作短期接受 `approved` 和 `effective`。
- 新审批通过、新恢复、新回滚后的可用状态统一写 `effective`。

#### 版本管理

文档详情页的版本历史必须变成可操作：

- 展示当前版本和历史版本。
- 支持下载任一历史版本。
- 支持预览任一历史版本。
- 支持选择两个版本对比。
- 支持回滚到历史版本，并填写回滚原因。

后端规则：

- 上传新文件或回滚前，必须把当前版本保存为 `DocumentVersion`。
- 回滚生成一个新的当前版本，不直接覆盖版本号。
- 回滚记录操作日志，包含 `fromVersion`、`targetVersion`、`newVersion`、`reason`。
- 回滚只允许 `draft`、`rejected`、`effective/approved` 文档；`archived`、`obsolete` 不允许回滚。

#### 上传与审批语义

上传页拆清楚两个动作：

- `保存草稿`：创建 `draft`。
- `提交审批`：创建后立即提交审批，状态进入 `pending`。

编辑页同理：

- 修改草稿或驳回文档后可保存草稿。
- 修改后提交审批时调用保存再调用提交，避免按钮文案和后端行为不一致。

#### 文控工作台可处理

工作台卡片点击后进入对应明细：

- 待审核：进入待审批列表。
- 即将复审：进入体系文件库，带复审筛选。
- 外来文件到期：进入体系文件库，带外来文件到期筛选。
- 作废仍被引用：进入影响分析或引用关系明细。
- 表单入口缺失：进入记录表单索引，带缺失筛选。
- 元数据缺失：进入体系文件库，带缺失元数据筛选。

明细至少提供“查看文档/进入维护页”的动作，第一批不要求在工作台内直接完成所有修复。

#### 记录表单索引维护

`RecordFormLandingIndex` 从只读列表升级为维护页面：

- 可编辑 `targetModule`、`targetModel`、`targetRoute`、`targetTemplateId`、`landingStrategy`、`relatedDocIds`、`notes`。
- 保存时调用已有 `PATCH /documents/record-form-index/:code`。
- `targetTemplateId` 应通过后端校验，确认模板存在。
- `relatedDocIds` 应通过后端校验，确认文件存在。

第一批不做批量导入，不做自动推荐。

## 8. 自动影响分析规则

第一版影响分析来源：

1. `DocumentReference`：找到被引用和引用其他对象的文件。
2. `RecordFormLandingEntry`：找到相关源表单和落地入口。
3. `DocumentReadRequirement`：找到需要重新阅读的人群。
4. `DocumentTrainingNeed`：生成或更新培训需求。
5. `ChangeEventRelation`：汇总产品、配方、工艺、设备、供应商、批次等业务对象。
6. `ChangeEventFormTask`：找到本次变更需要填写的表单模板和已生成记录。

后续增强：

- 从 `RecipeLine` 找受影响物料。
- 从 `ProcessStep` 找受影响 CCP/PRP。
- 从 `ProductionBatch` 找在制或历史批次。
- 从内审模块找相关审核记录。
- 从 CAPA/不合格模块找相关整改项。

## 9. 分阶段实施

### 阶段零：文档管理第一批可用性

- 统一文档状态读写口径，兼容旧 `approved`。
- 完善版本管理：当前版本入历史、历史版本下载/预览、对比、回滚原因和审计。
- 修正上传页“保存草稿/提交审批”语义。
- 文控工作台卡片可点击，进入对应明细或维护入口。
- 记录表单索引可编辑并保存。

验收标准：

- 文档审批通过后新状态为 `effective`，旧 `approved` 文档仍能正常展示和操作。
- 用户能在详情页下载、预览、对比、回滚历史版本。
- 上传页点击“提交审批”后文档确实进入 `pending`。
- 工作台每个卡片都能进入对应明细，不再只是数量。
- 记录表单索引可维护目标入口并持久化。

### 阶段一：强引用收紧

- 统一文档状态写入口径。
- 增加 `ownerDepartmentId` / `ownerUserId`。
- 将 `RecordFormLandingEntry.targetTemplateId` 关联 `RecordTemplate`。
- 将 `DocumentTrainingNeed.linkedTrainingProjectId` 关联 `TrainingProject`。
- 为 `DocumentReadRequirement.scopeType/scopeId` 增加服务层校验。

验收标准：

- 新建或更新相关记录时，不能保存不存在的部门、用户、角色、模板或培训项目。
- 旧数据仍可读取。
- 文控中心页面不因兼容字段缺失而报错。

### 阶段二：统一变更主线

- 为 `Record` 增加 `usageType/sourceType/sourceId/changeEventId`。
- 新增 `ChangeEventRelation`。
- 新增 `ChangeEventFormTask`。
- `DocumentImpactReview` 支持关联 `ChangeEvent`。
- 文档变更、产品变更、配方变更、工艺变更统一创建 `ChangeEvent`。
- 变更类型自动带出对应 `RecordTemplate`。
- 填写后生成 `Record(usageType=change)` 并挂到 `ChangeEventFormTask`。
- 从变更默认表单中移除 `产品更改申请表`。
- 保持 `产品开发评审记录` 只在产品研发流程 Step 4 中使用，不进入通用变更默认表单。

验收标准：

- 一个变更事件能看到影响范围、默认表单、已填写记录、文控影响、审批记录。
- 同一张表单模板可以同时用于初次验证、变更验证和周期复评。
- 初次验证和周期复评不会被错误要求创建 `ChangeEvent`。
- 产品研发流程 Step 4 能看到 `产品开发评审记录`，新建变更时不会默认带出它。
- 新建变更时不会再出现 `产品更改申请表`。
- 文控影响评审不再孤立存在。

### 阶段三：工作台可处理化

- 文控工作台每个问题数量可点击。
- 每类问题有明细列表。
- 每个明细有处理入口。

验收标准：

- 用户能从工作台直接进入修复动作。
- 问题处理后计数自动减少或状态变化。

### 阶段四：合规证据链

- 文件关联表单模板。
- 表单模板关联实际记录。
- 记录关联审批、审核、整改。
- 变更事件关联相关证据。

验收标准：

- 能从文件追到记录证据。
- 能从变更追到审批、验证、培训、文档更新。
- 能从内审问题追到整改闭环。

## 10. 风险与处理

### 10.1 历史数据不完整

处理方式：

- 允许历史弱引用继续展示。
- 新增 `linkStrength` 或类似服务层标记，区分强引用、弱引用、失效引用。
- 工作台暴露“弱引用待修复”问题。

### 10.2 状态迁移影响旧页面

处理方式：

- 服务层兼容读取 `approved`。
- 新写入统一 `effective`。
- 前端状态标签统一映射。

### 10.3 变更流程过重

处理方式：

- 变更类型只决定默认带出哪些表单模板。
- 第一版不做不适用、附件、关联已有记录等重操作。
- 小变更可以只带出少量表单并进入审批。
- 涉及食品安全、HACCP、配方、工艺、供应商时，通过默认表单包带出对应评审和验证表。

### 10.4 表单模板概念混淆

处理方式：

- 产品文案使用“记录表单”或“表单模板”，避免在页面上暴露 `RecordTemplate` 技术名。
- 明确 `RecordTemplate` 是已经上传或导入的空白表单模板。
- 明确 `Record` 是某一次填写后的记录。
- 明确 `usageType` 只标记这次填写用途，不改变表单模板本身。

### 10.5 产品研发评审被误放进变更流程

处理方式：

- `产品开发评审记录` 只挂产品研发 `ProcessInstance`。
- 记录表单索引中将它的主要入口指向 `/process` 或研发流程详情，而不是 `/change-events`。
- model landing 仍可保留它和 `Product`、`ProcessStep`、`Inspection` 等实体的关联，但不要因为包含 `ChangeEvent` 标签就把它放入变更默认表单包。

### 10.6 重复申请表残留

处理方式：

- `产品更改申请表` 从变更默认表单包移除。
- 如果库里已有该 `RecordTemplate`，先设为 `retired` 或从索引隐藏。
- 只有确认没有历史记录依赖后，才考虑物理删除模板。

## 11. 待用户确认

推荐第一批实现顺序：

1. 阶段零文档管理第一批可用性。
2. 阶段一强引用收紧。
3. 阶段二中先补 `Record.usageType/sourceType/sourceId/changeEventId` 与 `ChangeEventFormTask`。
4. 清理变更默认表单包：移除 `产品更改申请表`，排除 `产品开发评审记录`。
5. 阶段三工作台明细化。
6. 阶段四证据链。

第一版 `usageType` 只支持 `initial`、`change`、`periodic`。

变更类型第一批建议只覆盖 `document`、`record_form`、`recipe`、`process`，暂不建议第一批覆盖所有变更类型，否则范围过大。
