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
4. 将现有多张“评审/验证/审批”表单归位为 `ChangeEvent` 的子环节，而不是并行孤立流程。
5. 让文控工作台从“数量看板”升级为“问题池 + 修复入口”。
6. 逐步形成合规证据链：文件 -> 表单 -> 记录 -> 审批 -> 审核 -> 整改。

## 3. 非目标

本阶段不做以下事情：

- 不删除现有业务表单。
- 不把所有评审表单合并成一张大表。
- 不重写审批平台。
- 不重构全部食品安全追溯链。
- 不一次性迁移所有历史数据到完整强外键。

设计采用渐进式收紧：先补强最关键关系，再把变更主线和文控闭环接起来。

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
- 产品更改申请表
- 产品验证记录表
- 工艺流程图确认记录
- 工艺、配料变更、复称、评估、验证记录
- 变更申请表
- 前提方案（PRP）验证记录
- 危害控制计划确认、验证记录
- 车间布局变更 HACCP 风险评估确认、验证记录
- 小批量生产变更验证确认表

这些表单不应被删除，但应归位到统一的 `ChangeEvent` 主线下。

## 5. 目标业务模型

### 5.1 统一变更主线

所有变更先进入 `ChangeEvent`：

```text
ChangeEvent
  -> ChangeImpactAssessment
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

`ChangeEvent` 是统一主事件，子记录负责不同专业环节。

### 5.2 变更类型

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

### 5.3 子环节职责

`ChangeImpactAssessment`：
统一影响范围清单，记录哪些对象受影响、影响等级、建议动作。

`DocumentImpactReview`：
只处理文控影响，例如引用文件、记录表单入口、阅读确认、培训需求、文档复审。

`ChangeComplianceRecord`：
处理食品安全、法规、HACCP、PRP、过敏原、召回、追溯等合规影响。

`ChangeVerificationRecord`：
记录验证计划、验证方法、验证结果和验证结论。

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
- 影响范围
- 文控影响
- 食品安全/HACCP 评审
- 验证计划
- 审批放行
- 证据链

不同变更类型只显示相关页签。

### 7.3 文控工作台升级

文控工作台不只显示数量，而要显示问题明细和处理动作：

- 元数据缺失 -> 进入文档编辑或快速补齐面板
- 表单入口缺失 -> 进入记录表单索引维护
- 阅读逾期 -> 进入阅读确认列表
- 培训需求未处理 -> 进入培训需求处理
- 影响项未关闭 -> 进入变更影响评审
- 作废文件仍被引用 -> 进入引用关系和影响分析

## 8. 自动影响分析规则

第一版影响分析来源：

1. `DocumentReference`：找到被引用和引用其他对象的文件。
2. `RecordFormLandingEntry`：找到相关源表单和落地入口。
3. `DocumentReadRequirement`：找到需要重新阅读的人群。
4. `DocumentTrainingNeed`：生成或更新培训需求。
5. `ChangeEventRelation`：汇总产品、配方、工艺、设备、供应商、批次等业务对象。

后续增强：

- 从 `RecipeLine` 找受影响物料。
- 从 `ProcessStep` 找受影响 CCP/PRP。
- 从 `ProductionBatch` 找在制或历史批次。
- 从内审模块找相关审核记录。
- 从 CAPA/不合格模块找相关整改项。

## 9. 分阶段实施

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

- 新增 `ChangeEventRelation`。
- `DocumentImpactReview` 支持关联 `ChangeEvent`。
- 文档变更、产品变更、配方变更、工艺变更统一创建 `ChangeEvent`。
- 现有变更评审、验证、审批表单挂到 `ChangeEvent` 下。

验收标准：

- 一个变更事件能看到影响范围、文控影响、验证记录、审批记录。
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

- 变更类型决定必填环节。
- 小变更可以只走文控影响和审批。
- 涉及食品安全、HACCP、配方、工艺、供应商时才强制合规评审和验证。

## 11. 待用户确认

推荐第一批实现顺序：

1. 阶段一强引用收紧。
2. 阶段二中只先覆盖 `document`、`record_form`、`recipe`、`process` 四类变更。
3. 阶段三工作台明细化。
4. 阶段四证据链。

暂不建议第一批覆盖所有变更类型，否则范围过大。
