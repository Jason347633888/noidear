# 2026-04-24 Model Landing Layer Design

## 1. Goal And Scope

This spec defines how the 283 source forms from the food-safety source system should land in `noidear`'s data implementation.

It does not redefine the business relationships already established in `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`. Instead, it answers a more concrete question:

- which forms must map to independent business models
- which forms should remain in `RecordTemplate/Record`
- which forms should use a dual-track model
- where current `noidear` models are sufficient, where they need extension, and where new models are justified

This spec includes:

- landing decision criteria
- form-family strategy
- per-form decision format
- target model mapping rules
- dynamic-form retention boundaries
- schema convergence boundaries
- implementation usage instructions

This spec does not include:

- API design
- frontend page design
- migration scripts
- traceability query API details
- runtime performance design

This spec answers: how data should land.

It does not answer: how data is queried, rendered, or migrated.

## 2. Landing Decision Framework

This spec uses a two-axis decision framework and limits outcomes to three landing strategies.

### 2.1 Business Object Axis

Each form must first be classified by its core business object.

Object types are:

- master data objects
  - `Product`
  - `Material`
  - `Supplier`
  - `Customer`
  - `Employee`
  - `Location`
  - master-data extensions
- batch and traceability objects
  - `MaterialLot`
  - `ProductionBatch`
  - `FinishedGoodsBatch`
  - `IngredientUsage`
  - `DeliveryNote`
  - `Sample`
- process and quality objects
  - incoming inspection
  - process monitoring
  - CCP
  - metal detection
  - environment monitoring
  - release
  - rework
- governance and improvement objects
  - `CorrectiveAction`
  - `SupplierEvaluation`
  - `ManagementReview`
  - `TraceabilityDrill`
  - `ProductRecall`
  - training, meetings, audits, assessments
- generic documents and weakly structured records
  - general logs
  - explanatory records
  - low-frequency approvals
  - temporary checklists
  - archival records that do not become cross-module system facts

If the object type is unclear, the form cannot be assigned a landing strategy.

### 2.2 Implementation Axis

After identifying the object, the implementation mode must be chosen.

Allowed implementation modes are:

- `Independent Model`
  - stable business object
  - referenced by other modules
  - used in statistics, validation, traceability, or structured querying
  - requires stable fields and interfaces
- `Dynamic Form`
  - primarily serves data entry, approval, archival, and presentation
  - structure may vary
  - does not act as the default system fact source
  - weak query and linkage requirements
- `Dual-Track`
  - dynamic form preserves input UX, approval flow, and source-document fidelity
  - structured model supports cross-module relationships, traceability, analytics, and querying
  - both layers must be linked by stable identifiers or business keys

### 2.3 Allowed Conclusions

Each form may only conclude as one of:

1. `Independent Model`
2. `Dynamic Form`
3. `Dual-Track`

The spec does not allow open-ended placeholders such as:

- decide later
- keep dynamic for now
- evaluate during implementation

### 2.4 Decision Order

For each form or form family, evaluation follows this order:

1. identify the core object
2. determine whether the object is a shared entity or part of the traceability chain
3. determine whether other modules need to reference it structurally
4. determine whether it requires stable querying, statistics, or validation
5. determine whether dynamic forms alone are sufficient
6. conclude `Independent Model`, `Dynamic Form`, or `Dual-Track`

### 2.5 Hard Rule

Form complexity alone is not a valid primary criterion.

Primary criteria must be:

- business criticality
- query and linkage intensity

## 3. Decision Matrix

### 3.1 Dimension A: Business Criticality

This dimension answers whether the form records a core system fact source.

Grades:

- `A1 High`
  - master data objects
  - batch-chain objects
  - traceability bridge objects
  - core governance objects requiring structured management under food-safety or system rules
- `A2 Medium`
  - important process records
  - quality-control records
  - important within a module but not always global shared facts
- `A3 Low`
  - explanatory, temporary, weakly structured, or low-frequency log records
  - not direct cross-module fact sources

### 3.2 Dimension B: Query And Linkage Intensity

This dimension answers whether the data must be used in structured, repeated ways by the system.

Grades:

- `B1 High`
  - referenced by multiple modules
  - used in traceability, statistics, alerts, validation, or joins
  - requires stable APIs or dedicated query surfaces
- `B2 Medium`
  - queried and summarized, but mainly within one module or local management scope
  - limited linkage
- `B3 Low`
  - mainly for viewing, archival, approval, or export
  - rarely referenced by other entities

### 3.3 Dimension C: Input And Workflow Complexity

This is an auxiliary dimension only.

It considers:

- approval workflow complexity
- need to preserve original form layout
- field variability over time
- signatures, attachments, images, scanned documents
- strong need to resemble paper forms

When this dimension is high, dynamic forms become more valuable.

### 3.4 Dimension D: Historical Fidelity And Audit Requirements

This is also auxiliary.

It considers:

- whether original form semantics and layout must be preserved
- whether original completion traces must be retained
- whether audit review, approval chains, or sign-off chains matter
- whether customer, regulatory, or certification review depends on preserving source-form evidence

When this dimension is high, pure structured tables are often insufficient by themselves.

### 3.5 Conclusion Rules

Default matrix rules are:

- `A1 + B1`
  - default to `Independent Model` or `Dual-Track`
  - dynamic-form-only is not allowed
- `A1 + B2`
  - usually `Dual-Track` or `Independent Model`
- `A2 + B1`
  - usually `Dual-Track`
  - some cases may be `Independent Model`
- `A2 + B2`
  - depends on auxiliary dimensions
  - usually `Dynamic Form` or `Dual-Track`
- `A3 + B3`
  - default to `Dynamic Form`
- `A3 + B2`
  - usually `Dynamic Form`
  - some cases may be `Dual-Track`

### 3.6 Non-Dynamic-Only Types

The following categories may not remain dynamic-form-only:

- master data
- material lots
- production batches
- ingredient-usage bridges
- delivery or shipped-batch relationships
- key nodes in forward and backward traceability

## 4. Form Family Layering Strategy

The family-level strategy defines the default direction. Final decisions are still made per form.

### 4.1 Core Structured Object Family

These forms correspond to core system fact sources and therefore require structured models.

Includes:

- product master data
- material master data
- supplier master data
- recipe and BOM
- material-lot or incoming-batch records
- production-batch records
- issue, usage, and bridging records
- finished-goods batch records
- delivery and shipment linkage records

Strategy:

- default `Independent Model`
- if source-form fidelity or approval flow matters, use `Dual-Track`
- dynamic-form-only is not allowed

### 4.2 Quality And Process Control Family

These forms sit within production, quality, and inspection processes and often need both evidence retention and structured analytics.

Includes:

- incoming inspection
- in-process inspection
- CCP records
- metal-detection records
- environment monitoring
- release records
- rework records
- sample-retention records
- process monitoring records

Strategy:

- default to evaluate for `Dual-Track`
- if the record directly determines batch status, release status, or quality decision, favor an independent structured model or structured parent model
- if the main value is process evidence and archival, dynamic forms may remain primary
- individual subtypes must still be decided separately

### 4.3 Traceability And Recall Governance Family

These forms are not always high-frequency, but they are high-value governance objects.

Includes:

- forward-trace drills
- backward-trace drills
- recall drills
- actual recall records
- complaint handling with traceability closure
- batch trace-analysis records

Strategy:

- default `Dual-Track`
- original exercise or case forms must be preserved
- structured querying and traceability logic are also required
- as the query layer matures, some objects may graduate into stronger dedicated models

### 4.4 Governance, Review, And Improvement Family

These forms support system operations, management, and closure loops. They are important, but not always part of the core traceability path.

Includes:

- corrective and preventive actions
- supplier evaluation
- management review
- food-safety team activities
- training and competency evaluation
- internal audits, external audits, and remediation
- risk assessment, vulnerability assessment, and food defense records

Strategy:

- default `Dual-Track` or `Dynamic Form`
- if the object spans time, needs status tracking, or requires multi-department closure, favor `Independent Model` plus dynamic-form evidence
- if mainly used for archival and audit evidence, favor `Dynamic Form`

### 4.5 Generic Log And Weakly Structured Document Family

These forms mainly exist so someone can fill them, preserve them, and search them later.

Includes:

- key borrowing logs
- visitor registration
- temporary inspection checklists
- explanatory logs
- low-frequency asset or supplies records
- departmental records that do not enter the shared business chain

Strategy:

- default `Dynamic Form`
- upgrade only when the record clearly becomes part of shared entities or cross-module linkage

### 4.6 Uniform Rule

Family strategy defines the default direction only.

Final landing still occurs per form.

## 5. Per-Form Output Format

The appendix for individual forms must use one fixed schema.

### 5.1 Required Fields

Each form entry must include:

- `编号`
- `表单名`
- `部门`
- `表单族`
- `核心业务对象`
- `当前链路位置`
- `业务关键性等级`
- `查询/联动强度等级`
- `建议落表策略`
- `目标模型`
- `动态表单角色`
- `是否需要双轨`
- `判定理由`
- `备注/待实现缺口`

### 5.2 Field Semantics

Constraints:

- `核心业务对象`
  - describe only the primary object or object pair
  - do not write a long narrative
- `当前链路位置`
  - choose a stable chain label such as:
    - master data
    - incoming prerequisite
    - batch-chain core
    - production process
    - quality control
    - shipping downstream
    - governance closure
- `建议落表策略`
  - must be one of:
    - `独立建模`
    - `动态表单`
    - `双轨`
- `目标模型`
  - if an existing model can receive the form, name it
  - if no model exists, name the proposed business model
  - for dynamic-form-dominant records, still explain whether structured extraction is required
- `动态表单角色`
  - examples:
    - primary entry layer
    - approval and archive layer
    - source evidence layer
    - not applicable
- `备注/待实现缺口`
  - explain:
    - semantic mismatch with current code
    - missing models
    - temporary dual-track gaps

### 5.3 Target Model Notation

The `目标模型` field must use dual naming when business and code names differ:

- `MaterialLot -> MaterialBatch`
- `IngredientUsage -> BatchMaterialUsage`

If names match, only one name is needed.

### 5.4 Direct Implementation Input

This output format is designed to directly drive:

- model convergence lists
- schema change lists
- dynamic-form integration lists
- data migration plans
- API design inputs

### 5.5 Hard Rule

Per-form output must state the current landing decision, not just a soft recommendation.

If future upgrade is possible, the trigger condition for that upgrade must be stated.

## 6. Target Model Mapping Rules

### 6.1 Reuse Existing Stable Models First

If current `schema.prisma` already contains a stable model capable of representing the object, reuse it first.

Priority reusable models include:

- `Product`
- `Material`
- `Supplier`
- `Recipe`
- `RecipeLine`
- `MaterialBatch`
- `IncomingInspection`
- `InventoryMovement`
- `StockCount`
- `ProductionBatch`
- `BatchMaterialUsage`
- `FinishedGoodsBatch`
- `DeliveryNote`
- `Sample`
- `CCPRecord`
- `ReworkRecord`
- `EnvironmentRecord`
- `ProcessMonitorRecord`
- `MetalDetectionLog`
- `SupplierEvaluation`
- `SupplierDocument`
- `CorrectiveAction`

### 6.2 Always Mark Business Name And Code Name Together When They Differ

When terminology differs, notation must be:

`BusinessStandardName -> CurrentCodeModelName`

Examples:

- `MaterialLot -> MaterialBatch`
- `IngredientUsage -> BatchMaterialUsage`
- `ProcessRecord -> ProcessMonitorRecord`

### 6.3 Allowed Mapping Results

Target-model mapping may only conclude as one of:

1. `Map to Existing Model`
2. `Extend Existing Model`
3. `Add New Model`

### 6.4 Admission Criteria For New Models

A new model is only justified when at least one is true:

- the object is an independent business fact source
- merging into an existing model would create semantic confusion
- the object needs its own lifecycle, state machine, permission boundary, or closure loop
- the object will support stable queries, APIs, or screens
- forcing it into dynamic forms or an existing model would weaken traceability, linkage, or governance quality

New models are justified by independent objects, not by form count.

### 6.5 Dual-Track Mapping Rule

If the conclusion is `Dual-Track`, the spec must state both layers explicitly:

- which structured business model receives the system-level facts
- which form layer continues to carry the source-form experience and archival behavior

This must not be left implicit.

### 6.6 Forbidden Patterns

The spec explicitly forbids:

- multiple parallel models for the same business object across different modules
- splitting one object into multiple duplicate models only because form names differ
- keeping traceability-chain key nodes purely in dynamic forms without structured extraction
- forcing semantically different objects into one model only because a nearby model already exists

## 7. Dynamic Form Retention Boundary

### 7.1 Official Position Of Dynamic Forms

Dynamic forms are a form-platform layer, not the default business truth layer.

They primarily carry:

- form configuration
- data-entry experience
- approval flow
- source-record archival
- source-layout fidelity
- attachments, signatures, and trace retention

They do not default to carrying:

- unique master-data sources
- batch-chain core nodes
- shared cross-module business objects
- high-frequency join and query centers
- traceability bridge logic

### 7.2 Cases That Fit Dynamic Forms

Dynamic forms remain the default for:

- low-frequency, weakly structured, weakly linked records
- records whose main value is approval, archival, and evidence retention
- forms whose fields change often
- records where original layout and approval trace matter more than structured analytics
- departmental records that do not become shared system facts

### 7.3 Cases That Cannot Stay Dynamic-Only

These objects may not remain dynamic-form-only:

- master data
- recipe or BOM core structures
- material lots
- production batches
- ingredient-usage bridges
- delivery-to-batch relationships
- key traceability objects
- governance objects that are heavily reused across modules

### 7.4 Standard Definition Of Dual-Track

Dual-track applies when an object needs both:

- source-form input, approval, and archival behavior
- structured querying, analytics, traceability, and linkage

Dual-track is not duplicate design. It is layered responsibility:

- dynamic forms preserve the source activity and document experience
- structured models support system relationships and computation

### 7.5 Relationship Between Dynamic Forms And Structured Models

When dual-track is used, the spec must clarify:

- which layer is the structured fact source
- which layer is the source-evidence layer
- how the layers are linked
- which fields remain form-only
- which fields must be extracted into structured models

### 7.6 Hard Rule

The existence of an already-built dynamic-form layer is not a valid reason to keep all not-yet-modeled forms in that layer.

A form carrier is not equivalent to finished business modeling.

## 8. Convergence Boundary With Current Schema

### 8.1 Role Of Current Schema

Current `server/src/prisma/schema.prisma` represents:

- implemented model foundations
- current engineering reality
- reusable assets

It does not automatically prove:

- that all 283 forms are correctly absorbed
- that current model boundaries are final
- that code naming is the final business terminology

### 8.2 How This Spec Treats Schema

For each form or object, this spec performs exactly one of:

1. reuse current model directly
2. extend along the current-model direction
3. declare a justified new model

Schema is an input to convergence, not the upper bound of the business definition.

### 8.3 Conflicts Considered Implementation Gaps

The following cases are treated as implementation convergence gaps rather than business-definition conflicts:

- code model names differ from business names
- current models cover only part of the object
- a model can store data but cannot yet support cross-module relationships
- dynamic forms exist but no structured entity is extracted yet
- a structured model exists but has no clear dual-track relationship with the form layer

### 8.4 Cases That Must Be Explicitly Marked

Per-form output must explicitly note cases where:

- schema has no corresponding model
- current model semantics are insufficient
- the same business object is represented redundantly in code
- dynamic-form and structured-model layers lack a stable key relationship
- a form should be structured but currently lives entirely in form data

### 8.5 Hard Rule

The spec does not lower its standards because current implementation is incomplete.

If business evidence says an object should be independently modeled, the spec must say so.

## 9. Final Deliverable Structure

### 9.1 Main Body

The main body should contain:

1. goal and scope
2. landing decision framework
3. decision matrix
4. form-family layering strategy
5. target model mapping rules
6. dynamic-form retention boundary
7. convergence boundary with current schema
8. implementation usage notes

### 9.2 Appendix A: Form Family Summary Table

This appendix should list, for each family:

- form family
- overall landing strategy
- default target-model direction
- dynamic-form role
- whether dynamic-only is allowed
- special notes

### 9.3 Appendix B: Per-Form Table For All 283 Forms

This appendix is the main execution input.

It must use the fixed field schema defined in Section 5.

Subsequent agents should read landing decisions from this appendix rather than re-deriving them.

### 9.4 Appendix C: Model Convergence Action List

This appendix should summarize:

- existing models reused directly
- existing models that require extension
- new models recommended
- objects that require dual-track explicitly
- object families that should remain dynamic-form dominant

This appendix becomes the bridge into schema specs, implementation plans, and migration design.

### 9.5 Appendix D: Terminology Mapping Table

This appendix should list:

- business standard names
- current code model names
- notes

Examples:

- `MaterialLot -> MaterialBatch`
- `IngredientUsage -> BatchMaterialUsage`
- `ProcessRecord -> ProcessMonitorRecord`

### 9.6 Hard Requirement

The final document must enable both of these outcomes:

- an agent with no prior context can open it and know how all 283 forms should land
- an agent preparing schema work can extract model actions directly without redoing domain analysis

## 10. Implementation Usage Notes

### 10.1 Mandatory Read Order

Any agent working on the following topics must read in order:

- schema changes
- dynamic-form integration
- structured extraction from forms
- traceability functionality
- form migration
- new model design

Required read order:

1. `/Users/jiashenglin/Desktop/好玩的项目/noidear/AGENTS.md`
2. `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/AGENT_GUIDE.md`
3. `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`
4. this model-landing-layer spec

### 10.2 Direct Uses Of This Spec

This spec should be used directly to derive:

- schema convergence specs
- `RecordTemplate/Record` integration rules
- data migration plans
- model implementation plans
- traceability-query dependency lists

Agents should not repeat the analysis of what the 283 forms mean.

### 10.3 Conditions For Deviation

Deviation from this spec is not allowed by default.

Deviation is only acceptable when:

- new source-form evidence proves the original classification wrong
- current implementation reveals a previously unseen major constraint
- new business requirements change object boundaries
- clear evidence shows a form family must change strategy

When deviating, the agent must record:

- the original conclusion
- the new evidence
- the reason for change

### 10.4 Relationship To The Next Spec

Once approved, the next `Traceability Query Layer` spec should build on this document directly.

It should use this document to determine:

- which objects are structured
- which objects are dual-track
- which queries cannot depend on pure dynamic-form data
- which chain nodes are already fixed

The next spec should not reopen landing-strategy decisions.

### 10.5 Hard Rule

If implementation has not yet landed some objects into their target models, agents may not silently downgrade them back to dynamic-form-only. That is an implementation gap, not a design change.


## Appendix A. Form Family Summary Table

This appendix defines the family-level default landing strategy. It is the control layer above template groups.

### Appendix A.1 Field Definition

Each subfamily row uses these fields:

- `子族 ID`
- `子族名称`
- `所属大族`
- `核心业务对象`
- `默认落表策略`
- `默认目标模型方向`
- `动态表单角色`
- `是否允许仅动态表单`
- `关联模板组方向`
- `特别说明`

### Appendix A.2 Summary Table

| 子族 ID | 子族名称 | 所属大族 | 核心业务对象 | 默认落表策略 | 默认目标模型方向 | 动态表单角色 | 是否允许仅动态表单 | 关联模板组方向 | 特别说明 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `SF-master-product` | 产品主数据 | 主数据 | `Product` | 独立建模 | `Product` | 补充录入层或证据层 | 否 | 产品档案、产品信息、产品维护 | 研发、生产、追溯共享事实源 |
| `SF-master-material` | 物料主数据 | 主数据 | `Material` | 独立建模 | `Material` | 补充录入层或证据层 | 否 | 原辅料、包材、物料维护 | 采购、来料、配方、投料共享事实源 |
| `SF-master-supplier` | 供应商主数据 | 主数据 | `Supplier` | 独立建模 | `Supplier` | 补充录入层；资质可双轨 | 否 | 供应商档案、准入维护 | 与评价、来料质量、资质联动 |
| `SF-master-customer` | 客户主数据 | 主数据 | `Customer` | 独立建模 | `Customer` 或新增客户模型 | 补充录入层 | 否 | 客户信息、投诉、发货后链路 | 不应长期散落在文本里 |
| `SF-master-employee` | 人员/岗位主数据 | 主数据 | `Employee` | 双轨 | 用户/组织能力扩展模型 | 签核、培训、岗位资质承接层 | 否 | 培训、签到、岗位资质、签核审批 | 身份可复用，能力与签核需结构化+证据 |
| `SF-master-location` | 位置/区域/仓位主数据 | 主数据 | `Location` | 独立建模 | `Location` 或位置扩展模型 | 补充录入层 | 否 | 仓位、区域、监测点、取样点 | 库存、环境监测、区域治理共享引用 |
| `SF-recipe-product` | 产品配方 | 配方与工艺 | `Recipe` | 独立建模 | `Recipe` | 审批归档层或证据层 | 否 | 产品配方、研发配方、配方审批 | 产品与物料理论关系核心对象 |
| `SF-recipe-line` | 配方明细/BOM | 配方与工艺 | `RecipeLine` | 独立建模 | `RecipeLine` | 原始证据层 | 否 | 配方明细、BOM、原辅料构成 | 配方可执行化的核心明细层 |
| `SF-process-step` | 工艺步骤 | 配方与工艺 | `ProcessStep` | 独立建模 | `ProcessStep` | 审批归档层 | 否 | 工艺流程、工艺步骤、工艺卡 | 过程记录和控制标准上游对象 |
| `SF-process-parameter-spec` | 工艺参数标准 | 配方与工艺 | `ProcessParameterSpec` | 双轨 | `ProcessStep` 扩展或新增参数标准模型 | 原始工艺卡和审批证据层 | 否 | 工艺参数、标准参数、工艺卡 | 标准参数应结构化，原始工艺卡仍需保留 |
| `SF-process-version` | 产品开发版本 | 配方与工艺 | `ProductProcessVersion` | 双轨 | 新增产品工艺版本聚合模型 | 研发审批、版本留痕层 | 否 | 产品开发、配方变更、工艺变更 | 配方、工艺、参数版本化聚合 |
| `SF-process-work-instruction-binding` | 作业指导绑定 | 配方与工艺 | `WorkInstructionBinding` | 双轨 | 新增绑定关系模型或受控文件关系扩展 | 受控文件原始记录层 | 否 | 作业指导、工艺引用、受控文件绑定 | 绑定关系不应长期只靠文本引用 |
| `SF-batch-material-lot` | 来料批次 | 批次与追溯 | `MaterialLot -> MaterialBatch` | 独立建模 | `MaterialBatch` | 来料原始登记和证据层 | 否 | 来料登记、原辅料批次、包材批次 | 追溯起点对象 |
| `SF-batch-inventory-movement` | 库存批次与库存移动 | 批次与追溯 | `InventoryMovement` | 独立建模 | `InventoryMovement` | 台账原始记录层 | 否 | 入库、出库、移库、库存台账 | 追溯辅助主链重要桥接 |
| `SF-batch-ingredient-usage` | 投料/领料/配料桥接 | 批次与追溯 | `IngredientUsage -> BatchMaterialUsage` | 独立建模 | `BatchMaterialUsage` | 投料记录原始证据层 | 否 | 投料、领料、配料记录 | 正追反追核心桥梁 |
| `SF-batch-production` | 生产批次 | 批次与追溯 | `ProductionBatch` | 独立建模 | `ProductionBatch` | 生产原始记录层 | 否 | 生产批次、批次开工、生产日报 | 主追溯链中段锚点 |
| `SF-batch-finished-goods` | 成品批次 | 批次与追溯 | `FinishedGoodsBatch` | 独立建模 | `FinishedGoodsBatch` | 成品台账和放行证据层 | 否 | 成品批次、成品入库、放行前置 | 连接生产结果和出货前状态 |
| `SF-batch-delivery` | 发货/出货链路 | 批次与追溯 | `DeliveryNote` | 独立建模 | `DeliveryNote` | 发货原始单据和证据层 | 否 | 发货记录、出货单、客户发运 | 投诉和召回入口 |
| `SF-batch-sample` | 留样/复检链路 | 批次与追溯 | `Sample` | 双轨 | `Sample` | 留样原始记录和复检证据层 | 否 | 留样记录、复检记录、样品管理 | 依附批次链但保真要求高 |
| `SF-trace-forward-drill` | 正追演练 | 批次与追溯 | `TraceabilityDrill` | 双轨 | `TraceabilityDrill` | 演练原始记录层 | 否 | 正追演练、追溯验证 | 验证主链可用性 |
| `SF-trace-backward-drill` | 反追演练 | 批次与追溯 | `TraceabilityDrill` | 双轨 | `TraceabilityDrill` | 演练原始记录层 | 否 | 反追演练、追溯验证 | 与正追共用治理对象但查询方向不同 |
| `SF-trace-recall` | 召回/召回演练 | 批次与追溯 | `ProductRecall` | 双轨 | `ProductRecall` | 召回原始记录和演练证据层 | 否 | 召回、召回演练、召回评估 | 连接客户、发货、成品批次和处置闭环 |
| `SF-quality-incoming-inspection` | 来料检验 | 质量与过程控制 | `IncomingInspection` | 双轨 | `IncomingInspection` | 原始检验单和签核证据层 | 否 | 原辅料检验、包材检验、来料检验台账 | 检验结果需结构化关联批次和供应商 |
| `SF-quality-process-monitoring` | 过程监控 | 质量与过程控制 | `ProcessRecord -> ProcessMonitorRecord` | 双轨 | `ProcessMonitorRecord` | 过程原始记录层 | 否 | 过程记录、工艺监控、过程巡检 | 参数与检查结果需结构化沉淀 |
| `SF-quality-ccp` | CCP 监控 | 质量与过程控制 | `CCPRecord` | 双轨 | `CCPRecord` | 关键控制点原始记录层 | 否 | CCP 记录、关键限值监控、验证 | 食品安全关键记录 |
| `SF-quality-metal-detection` | 金探记录 | 质量与过程控制 | `MetalDetectionLog` | 双轨 | `MetalDetectionLog` | 设备检测原始记录层 | 否 | 金探记录、异物控制、设备检测 | 与放行和异常处置直接相关 |
| `SF-quality-environment` | 环境与区域监测 | 质量与过程控制 | `EnvironmentRecord` | 双轨 | `EnvironmentRecord` | 监测原始记录层 | 否 | 环境监测、卫生检查、区域监测 | 监测点、区域、结果需结构化 |
| `SF-quality-release-decision` | 放行判定 | 质量与过程控制 | `ReleaseDecision` | 双轨 | 批次状态扩展或新增放行决定模型 | 放行签批和依据证据层 | 否 | 放行记录、批次判定、成品判定 | 批次质量结论汇总点 |
| `SF-quality-rework` | 返工/返修记录 | 质量与过程控制 | `ReworkRecord` | 双轨 | `ReworkRecord` | 返工审批和原始记录层 | 否 | 返工、返修、重工记录 | 涉及批次重入和后续状态 |
| `SF-quality-deviation` | 偏差/异常记录 | 质量与过程控制 | `DeviationCase` | 双轨 | 偏差模块扩展或新增偏差对象 | 异常原始记录和调查证据层 | 否 | 偏差记录、异常记录、不合格调查 | 跨过程控制和治理闭环 |
| `SF-quality-hold-disposition` | 待判/隔离/处置记录 | 质量与过程控制 | `HoldDisposition` | 双轨 | 新增处置对象或批次状态扩展 | 处置审批和证据层 | 否 | 待处理品、不合格品、隔离品、处置审批 | 高频处置动作需结构化承接 |
| `SF-governance-supplier-evaluation` | 供应商评价 | 治理与闭环 | `SupplierEvaluation` | 双轨 | `SupplierEvaluation` | 评价原始记录和评分证据层 | 否 | 供应商评价、年度考核、准入复评 | 结果需结构化沉淀，证据仍要保留 |
| `SF-governance-supplier-documents` | 供应商资质/外部文件 | 治理与闭环 | `SupplierDocument` | 双轨 | `SupplierDocument` | 资质文件和证明材料层 | 否 | 供应商资质、证照、合规文件、外来文件 | 类型、有效期、关联供应商要结构化 |
| `SF-governance-capa` | 纠正预防措施 | 治理与闭环 | `CorrectiveAction` | 双轨 | `CorrectiveAction` | 措施申请、分析、验证证据层 | 否 | 纠正措施、预防措施、不合格整改 | 典型闭环对象 |
| `SF-governance-management-review` | 管理评审 | 治理与闭环 | `ManagementReview` | 双轨 | 新增管理评审对象 | 会议输入、纪要、输出和签批证据层 | 否 | 管理评审计划、输入、输出、跟踪 | 不应只作为零散会议记录存在 |
| `SF-governance-training` | 培训与能力评价 | 治理与闭环 | `TrainingProgram` | 双轨 | 培训模块扩展或新增培训对象 | 签到、考试、评价、附件证据层 | 否 | 培训计划、培训签到、考试、能力评价 | 涉及计划、对象、效果和到期跟踪 |
| `SF-governance-audit` | 内审/外审/检查 | 治理与闭环 | `AuditCase` | 双轨 | 新增审核/检查对象 | 检查表、发现项、整改证据层 | 否 | 内审、外审、客户审核、监管检查 | 天然带发现项与整改闭环 |
| `SF-governance-risk-assessment` | 风险评估/食品防护/脆弱性评估 | 治理与闭环 | `RiskAssessment` | 双轨 | 新增风险评估对象 | 评估表、评分依据、复评证据层 | 否 | 风险评估、VACCP/TACCP、食品防护 | 版本、复评和措施跟踪不应只做静态文档 |
| `SF-governance-food-safety-team` | 食品安全小组与文化建设 | 治理与闭环 | `FoodSafetyTeamActivity` | 双轨 | 新增食品安全小组活动对象 | 会议、活动、评价原始记录层 | 否 | 食品安全小组、文化建设、活动评价 | 要体现治理运行而非静态活动记录 |
| `SF-governance-complaint` | 客户投诉与后市场闭环 | 治理与闭环 | `ComplaintCase` | 双轨 | 新增投诉对象或客户问题对象 | 投诉原始记录、调查和沟通证据层 | 否 | 客户投诉、调查、整改、召回评估 | 连接客户、批次、发货、原因分析和措施闭环 |
| `SF-governance-document-control` | 文控异常与体系治理记录 | 治理与闭环 | `DocumentControlException` | 动态表单 | 动态表单为主，必要时补治理对象 | 主录入层和归档层 | 是 | 文件控制异常、版本异常、发放回收异常 | 当前偏治理留痕，联动增强后再升级 |

### Appendix A.3 Frozen Execution-Level Group Table

This table freezes the 59 execution-level groups discovered during second-pass attachment. It is the operational expansion of Appendix A.2.

| 执行层模板组 ID | 归属子族 ID | 核心业务对象 | 继承落表策略 | 继承目标模型方向 | 当前用途说明 | 当前表单数 |
| --- | --- | --- | --- | --- | --- | --- |
| `FG-quality-environment-cleaning-02` | `SF-quality-environment` | `EnvironmentRecord` | 双轨 | EnvironmentRecord | 环境清洁/消毒执行组 | `28` |
| `FG-batch-ingredient-usage-production-04` | `SF-batch-ingredient-usage` | `IngredientUsage -> BatchMaterialUsage` | 独立建模 | BatchMaterialUsage | 投料打料/配料执行组 | `18` |
| `FG-governance-maintenance-equipment-02` | `SF-governance-document-control` | `DocumentControlException` | 动态表单 | 动态表单为主，必要时补治理对象 | 维护保养执行组 | `14` |
| `FG-governance-support-communications-02` | `SF-governance-document-control` | `DocumentControlException` | 动态表单 | 动态表单为主，必要时补治理对象 | 沟通/支持运营执行组 | `12` |
| `FG-batch-production-01` | `SF-batch-production` | `ProductionBatch` | 独立建模 | ProductionBatch | 生产批次执行主组 | `11` |
| `FG-governance-audit-01` | `SF-governance-audit` | `AuditCase` | 双轨 | 新增审核/检查对象 | 审核检查主组 | `11` |
| `FG-quality-incoming-inspection-01` | `SF-quality-incoming-inspection` | `IncomingInspection` | 双轨 | IncomingInspection | 来料检验主组 | `10` |
| `FG-quality-calibration-lab-01` | `SF-quality-process-monitoring` | `ProcessRecord -> ProcessMonitorRecord` | 双轨 | ProcessMonitorRecord | 化验/校准/计量主组 | `10` |
| `FG-quality-product-inspection-finished-03` | `SF-quality-process-monitoring` | `ProcessRecord -> ProcessMonitorRecord` | 双轨 | ProcessMonitorRecord | 成品/半成品检验组 | `10` |
| `FG-quality-environment-monitoring-03` | `SF-quality-environment` | `EnvironmentRecord` | 双轨 | EnvironmentRecord | 环境监测/参数记录组 | `9` |
| `FG-quality-ccp-01` | `SF-quality-ccp` | `CCPRecord` | 双轨 | CCPRecord | CCP 主组 | `8` |
| `FG-batch-inventory-support-02` | `SF-batch-inventory-movement` | `InventoryMovement` | 独立建模 | InventoryMovement | 支持类库存流转组 | `7` |
| `FG-governance-management-review-input-summary-02` | `SF-governance-management-review` | `ManagementReview` | 双轨 | 新增管理评审对象 | 管理评审部门总结输入组 | `7` |
| `FG-governance-visitor-access-02` | `SF-governance-document-control` | `DocumentControlException` | 动态表单 | 动态表单为主，必要时补治理对象 | 访客/受控区域准入组 | `7` |
| `FG-governance-document-control-02` | `SF-governance-document-control` | `DocumentControlException` | 动态表单 | 动态表单为主，必要时补治理对象 | 文控操作记录组 | `7` |
| `FG-governance-management-review-core-04` | `SF-governance-management-review` | `ManagementReview` | 双轨 | 新增管理评审对象 | 管理评审核心组 | `6` |
| `FG-trace-recall-01` | `SF-trace-recall` | `ProductRecall` | 双轨 | ProductRecall | 召回/召回演练主组 | `6` |
| `FG-governance-supplier-documents-01` | `SF-governance-supplier-documents` | `SupplierDocument` | 双轨 | SupplierDocument | 供应商资质主组 | `6` |
| `FG-process-version-product-development-02` | `SF-process-version` | `ProductProcessVersion` | 双轨 | 新增产品工艺版本聚合模型 | 研发/开发变更组 | `5` |
| `FG-batch-inventory-warehouse-02` | `SF-batch-inventory-movement` | `InventoryMovement` | 独立建模 | InventoryMovement | 仓储库存流转组 | `5` |
| `FG-quality-process-monitoring-01` | `SF-quality-process-monitoring` | `ProcessRecord -> ProcessMonitorRecord` | 双轨 | ProcessMonitorRecord | 一般过程监控主组 | `5` |
| `FG-quality-environment-inspection-02` | `SF-quality-environment` | `EnvironmentRecord` | 双轨 | EnvironmentRecord | 卫生检查/健康检查组 | `5` |
| `FG-quality-product-inspection-process-02` | `SF-quality-process-monitoring` | `ProcessRecord -> ProcessMonitorRecord` | 双轨 | ProcessMonitorRecord | 制程检验/在线检测组 | `5` |
| `FG-batch-finished-goods-01` | `SF-batch-finished-goods` | `FinishedGoodsBatch` | 独立建模 | FinishedGoodsBatch | 成品批次主组 | `4` |
| `FG-quality-allergen-control-01` | `SF-quality-environment` | `EnvironmentRecord` | 双轨 | EnvironmentRecord | 过敏原控制主组 | `4` |
| `FG-batch-sample-01` | `SF-batch-sample` | `Sample` | 双轨 | Sample | 留样复检主组 | `4` |
| `FG-governance-food-safety-team-01` | `SF-governance-food-safety-team` | `FoodSafetyTeamActivity` | 双轨 | 新增食品安全小组活动对象 | 食品安全小组主组 | `4` |
| `FG-governance-supplier-evaluation-01` | `SF-governance-supplier-evaluation` | `SupplierEvaluation` | 双轨 | SupplierEvaluation | 供应商评价主组 | `4` |
| `FG-governance-training-01` | `SF-governance-training` | `TrainingProgram` | 双轨 | 培训模块扩展或新增培训对象 | 培训主组 | `4` |
| `FG-batch-delivery-sales-02` | `SF-batch-delivery` | `DeliveryNote` | 独立建模 | DeliveryNote | 销售出货支组 | `3` |
| `FG-governance-risk-assessment-01` | `SF-governance-risk-assessment` | `RiskAssessment` | 双轨 | 新增风险评估对象 | 风险评估主组 | `3` |
| `FG-quality-deviation-01` | `SF-quality-deviation` | `DeviationCase` | 双轨 | 偏差模块扩展或新增偏差对象 | 偏差异常主组 | `3` |
| `FG-process-version-system-verification-03` | `SF-process-version` | `ProductProcessVersion` | 双轨 | 新增产品工艺版本聚合模型 | 体系验证/脆弱性验证组 | `3` |
| `FG-quality-process-monitoring-02` | `SF-quality-process-monitoring` | `ProcessRecord -> ProcessMonitorRecord` | 双轨 | ProcessMonitorRecord | 设备/巡检过程监控支组 | `3` |
| `FG-master-product-01` | `SF-master-product` | `Product` | 独立建模 | Product | 产品主数据主组 | `2` |
| `FG-process-parameter-spec-01` | `SF-process-parameter-spec` | `ProcessParameterSpec` | 双轨 | ProcessStep 扩展或参数标准模型 | 工艺参数标准主组 | `2` |
| `FG-quality-release-decision-01` | `SF-quality-release-decision` | `ReleaseDecision` | 双轨 | 新增放行决定模型或批次状态扩展 | 放行判定主组 | `2` |
| `FG-process-version-engineering-change-04` | `SF-process-version` | `ProductProcessVersion` | 双轨 | 新增产品工艺版本聚合模型 | 工程变更组 | `2` |
| `FG-governance-maintenance-asset-03` | `SF-governance-document-control` | `DocumentControlException` | 动态表单 | 动态表单为主，必要时补治理对象 | 设备台账/验收支组 | `2` |
| `FG-governance-risk-assessment-02` | `SF-governance-risk-assessment` | `RiskAssessment` | 双轨 | 新增风险评估对象 | 环境因素/风险机遇支组 | `2` |
| `FG-governance-audit-02` | `SF-governance-audit` | `AuditCase` | 双轨 | 新增审核/检查对象 | 应急演练/审核输入支组 | `2` |
| `FG-process-step-01` | `SF-process-step` | `ProcessStep` | 独立建模 | ProcessStep | 工艺步骤主组 | `1` |
| `FG-batch-ingredient-usage-requisition-02` | `SF-batch-ingredient-usage` | `IngredientUsage -> BatchMaterialUsage` | 独立建模 | BatchMaterialUsage | 领料/领用支组 | `1` |
| `FG-quality-hold-disposition-01` | `SF-quality-hold-disposition` | `HoldDisposition` | 双轨 | 新增处置对象或批次状态扩展 | 待判隔离主组 | `1` |
| `FG-quality-hold-disposition-02` | `SF-quality-hold-disposition` | `HoldDisposition` | 双轨 | 新增处置对象或批次状态扩展 | 不合格处置支组 | `1` |
| `FG-batch-ingredient-usage-change-control-03` | `SF-batch-ingredient-usage` | `IngredientUsage -> BatchMaterialUsage` | 独立建模 | BatchMaterialUsage | 配料变更控制支组 | `1` |
| `FG-quality-calibration-lab-02` | `SF-quality-process-monitoring` | `ProcessRecord -> ProcessMonitorRecord` | 双轨 | ProcessMonitorRecord | 内部校准支组 | `1` |
| `FG-quality-metal-detection-01` | `SF-quality-metal-detection` | `MetalDetectionLog` | 双轨 | MetalDetectionLog | 金探主组 | `1` |
| `FG-governance-risk-assessment-03` | `SF-governance-risk-assessment` | `RiskAssessment` | 双轨 | 新增风险评估对象 | 产品风险区判定支组 | `1` |
| `FG-process-version-01` | `SF-process-version` | `ProductProcessVersion` | 双轨 | 新增产品工艺版本聚合模型 | 通用变更申请遗留组 | `1` |
| `FG-governance-food-safety-team-02` | `SF-governance-food-safety-team` | `FoodSafetyTeamActivity` | 双轨 | 新增食品安全小组活动对象 | 食品安全调度会议支组 | `1` |
| `FG-quality-allergen-control-02` | `SF-quality-environment` | `EnvironmentRecord` | 双轨 | EnvironmentRecord | 过敏原趋势分析支组 | `1` |
| `FG-quality-rework-01` | `SF-quality-rework` | `ReworkRecord` | 双轨 | ReworkRecord | 返工返修主组 | `1` |
| `FG-trace-backward-drill-01` | `SF-trace-backward-drill` | `TraceabilityDrill` | 双轨 | TraceabilityDrill | 反追演练主组 | `1` |
| `FG-trace-forward-drill-01` | `SF-trace-forward-drill` | `TraceabilityDrill` | 双轨 | TraceabilityDrill | 正追演练主组 | `1` |
| `FG-governance-management-review-input-customer-03` | `SF-governance-management-review` | `ManagementReview` | 双轨 | 新增管理评审对象 | 管理评审顾客满意度输入组 | `1` |
| `FG-governance-document-control-03` | `SF-governance-document-control` | `DocumentControlException` | 动态表单 | 动态表单为主，必要时补治理对象 | 文控变更申请支组 | `1` |
| `FG-batch-material-lot-01` | `SF-batch-material-lot` | `MaterialLot -> MaterialBatch` | 独立建模 | MaterialBatch | 来料批次主组 | `1` |
| `FG-master-material-02` | `SF-master-material` | `Material` | 独立建模 | Material | 物料分类/明细变更支组 | `1` |

## Appendix B. Template Group And Per-Form Expansion Protocol

This appendix defines how the 283 source forms are first grouped, then expanded per file.

### Appendix B.1 Template Group Main Table Field Definition

Each template group row uses these fields:

- `模板组 ID`
- `模板组名`
- `所属子族 ID`
- `所属大族`
- `核心业务对象`
- `业务用途`
- `结构特征`
- `业务关键性等级`
- `查询/联动强度等级`
- `默认落表策略`
- `目标模型`
- `动态表单角色`
- `是否需要双轨`
- `组内适用规则`
- `例外判断规则`
- `包含表单数量`
- `包含表单清单`

### Appendix B.2 Primary Template Group Baseline

The first-pass baseline contains 35 stable template groups. The source directory remains the final anchor. `MASTER_DATA_AND_TRACEABILITY_MODEL.md` remains the explanation layer.

| 模板组 ID | 模板组名 | 所属子族 ID | 所属大族 | 核心业务对象 | 默认落表策略 | 目标模型 |
| --- | --- | --- | --- | --- | --- | --- |
| `FG-master-product-01` | 产品主数据模板组 | `SF-master-product` | 主数据 | `Product` | 独立建模 | `Product` |
| `FG-master-material-01` | 物料主数据模板组 | `SF-master-material` | 主数据 | `Material` | 独立建模 | `Material` |
| `FG-master-supplier-01` | 供应商主数据模板组 | `SF-master-supplier` | 主数据 | `Supplier` | 独立建模 | `Supplier` |
| `FG-master-customer-01` | 客户主数据模板组 | `SF-master-customer` | 主数据 | `Customer` | 独立建模 | `Customer` 或新增客户模型 |
| `FG-master-employee-01` | 人员岗位模板组 | `SF-master-employee` | 主数据 | `Employee` | 双轨 | 用户/组织能力扩展模型 |
| `FG-master-location-01` | 位置区域模板组 | `SF-master-location` | 主数据 | `Location` | 独立建模 | `Location` 或位置扩展模型 |
| `FG-recipe-product-01` | 产品配方模板组 | `SF-recipe-product` | 配方与工艺 | `Recipe` | 独立建模 | `Recipe` |
| `FG-recipe-line-01` | 配方明细模板组 | `SF-recipe-line` | 配方与工艺 | `RecipeLine` | 独立建模 | `RecipeLine` |
| `FG-process-step-01` | 工艺步骤模板组 | `SF-process-step` | 配方与工艺 | `ProcessStep` | 独立建模 | `ProcessStep` |
| `FG-process-parameter-spec-01` | 工艺参数标准模板组 | `SF-process-parameter-spec` | 配方与工艺 | `ProcessParameterSpec` | 双轨 | `ProcessStep` 扩展或新增参数标准模型 |
| `FG-process-version-01` | 产品开发版本模板组 | `SF-process-version` | 配方与工艺 | `ProductProcessVersion` | 双轨 | 新增产品工艺版本聚合模型 |
| `FG-process-work-instruction-binding-01` | 作业指导绑定模板组 | `SF-process-work-instruction-binding` | 配方与工艺 | `WorkInstructionBinding` | 双轨 | 新增绑定关系模型或受控文件关系扩展 |
| `FG-batch-material-lot-01` | 来料批次模板组 | `SF-batch-material-lot` | 批次与追溯 | `MaterialLot -> MaterialBatch` | 独立建模 | `MaterialBatch` |
| `FG-batch-inventory-movement-01` | 库存流转模板组 | `SF-batch-inventory-movement` | 批次与追溯 | `InventoryMovement` | 独立建模 | `InventoryMovement` |
| `FG-batch-ingredient-usage-01` | 投料桥接模板组 | `SF-batch-ingredient-usage` | 批次与追溯 | `IngredientUsage -> BatchMaterialUsage` | 独立建模 | `BatchMaterialUsage` |
| `FG-batch-production-01` | 生产批次模板组 | `SF-batch-production` | 批次与追溯 | `ProductionBatch` | 独立建模 | `ProductionBatch` |
| `FG-batch-finished-goods-01` | 成品批次模板组 | `SF-batch-finished-goods` | 批次与追溯 | `FinishedGoodsBatch` | 独立建模 | `FinishedGoodsBatch` |
| `FG-batch-delivery-01` | 发货链路模板组 | `SF-batch-delivery` | 批次与追溯 | `DeliveryNote` | 独立建模 | `DeliveryNote` |
| `FG-batch-sample-01` | 留样复检模板组 | `SF-batch-sample` | 批次与追溯 | `Sample` | 双轨 | `Sample` |
| `FG-trace-forward-drill-01` | 正追演练模板组 | `SF-trace-forward-drill` | 批次与追溯 | `TraceabilityDrill` | 双轨 | `TraceabilityDrill` |
| `FG-trace-backward-drill-01` | 反追演练模板组 | `SF-trace-backward-drill` | 批次与追溯 | `TraceabilityDrill` | 双轨 | `TraceabilityDrill` |
| `FG-trace-recall-01` | 召回与召回演练模板组 | `SF-trace-recall` | 批次与追溯 | `ProductRecall` | 双轨 | `ProductRecall` |
| `FG-quality-incoming-inspection-01` | 来料检验模板组 | `SF-quality-incoming-inspection` | 质量与过程控制 | `IncomingInspection` | 双轨 | `IncomingInspection` |
| `FG-quality-process-monitoring-01` | 过程监控模板组 | `SF-quality-process-monitoring` | 质量与过程控制 | `ProcessRecord -> ProcessMonitorRecord` | 双轨 | `ProcessMonitorRecord` |
| `FG-quality-ccp-01` | CCP 监控模板组 | `SF-quality-ccp` | 质量与过程控制 | `CCPRecord` | 双轨 | `CCPRecord` |
| `FG-quality-metal-detection-01` | 金探记录模板组 | `SF-quality-metal-detection` | 质量与过程控制 | `MetalDetectionLog` | 双轨 | `MetalDetectionLog` |
| `FG-quality-environment-01` | 环境区域监测模板组 | `SF-quality-environment` | 质量与过程控制 | `EnvironmentRecord` | 双轨 | `EnvironmentRecord` |
| `FG-quality-release-decision-01` | 放行判定模板组 | `SF-quality-release-decision` | 质量与过程控制 | `ReleaseDecision` | 双轨 | 批次状态扩展或新增放行决定模型 |
| `FG-quality-rework-01` | 返工返修模板组 | `SF-quality-rework` | 质量与过程控制 | `ReworkRecord` | 双轨 | `ReworkRecord` |
| `FG-quality-deviation-01` | 偏差异常模板组 | `SF-quality-deviation` | 质量与过程控制 | `DeviationCase` | 双轨 | 偏差模块扩展或新增偏差对象 |
| `FG-quality-hold-disposition-01` | 待判隔离处置模板组 | `SF-quality-hold-disposition` | 质量与过程控制 | `HoldDisposition` | 双轨 | 新增处置对象或批次状态扩展 |
| `FG-governance-supplier-evaluation-01` | 供应商评价模板组 | `SF-governance-supplier-evaluation` | 治理与闭环 | `SupplierEvaluation` | 双轨 | `SupplierEvaluation` |
| `FG-governance-supplier-documents-01` | 供应商资质模板组 | `SF-governance-supplier-documents` | 治理与闭环 | `SupplierDocument` | 双轨 | `SupplierDocument` |
| `FG-governance-capa-01` | 纠正预防措施模板组 | `SF-governance-capa` | 治理与闭环 | `CorrectiveAction` | 双轨 | `CorrectiveAction` |
| `FG-governance-management-review-01` | 管理评审模板组 | `SF-governance-management-review` | 治理与闭环 | `ManagementReview` | 双轨 | 新增管理评审对象 |
| `FG-governance-training-01` | 培训能力模板组 | `SF-governance-training` | 治理与闭环 | `TrainingProgram` | 双轨 | 培训模块扩展或新增培训对象 |
| `FG-governance-audit-01` | 审核检查模板组 | `SF-governance-audit` | 治理与闭环 | `AuditCase` | 双轨 | 新增审核/检查对象 |
| `FG-governance-risk-assessment-01` | 风险评估模板组 | `SF-governance-risk-assessment` | 治理与闭环 | `RiskAssessment` | 双轨 | 新增风险评估对象 |
| `FG-governance-food-safety-team-01` | 食品安全小组模板组 | `SF-governance-food-safety-team` | 治理与闭环 | `FoodSafetyTeamActivity` | 双轨 | 新增食品安全小组活动对象 |
| `FG-governance-complaint-01` | 客户投诉模板组 | `SF-governance-complaint` | 治理与闭环 | `ComplaintCase` | 双轨 | 新增投诉对象或客户问题对象 |
| `FG-governance-document-control-01` | 文控异常模板组 | `SF-governance-document-control` | 治理与闭环 | `DocumentControlException` | 动态表单 | 动态表单为主，必要时补治理对象 |

### Appendix B.3 Split Rules

A template group may be split into `-02`, `-03`, and so on only when at least one is true:

- the group contains different core business objects
- the object is the same but the business purpose has diverged
- the field structure is no longer homologous
- the default landing strategy is no longer the same
- the target model direction is no longer the same
- exception coverage exceeds `30%`

The following are not valid split reasons:

- only the year differs
- only the form number differs
- only the department path differs while object, purpose, and structure remain the same
- only the title wording differs
- only the visual layout or field order differs

### Appendix B.4 Per-Form Expansion Field Definition

Each source form row must include:

- `模板组 ID`
- `编号`
- `表单名`
- `路径`
- `部门`
- `表单族`
- `核心业务对象`
- `当前链路位置`
- `业务关键性等级`
- `查询/联动强度等级`
- `建议落表策略`
- `目标模型`
- `动态表单角色`
- `是否需要双轨`
- `是否例外`
- `例外原因`
- `覆盖前结论`
- `覆盖后结论`
- `判定理由`
- `备注/待实现缺口`

Default inheritance from the template group applies to:

- `表单族`
- `核心业务对象`
- `业务关键性等级`
- `查询/联动强度等级`
- `建议落表策略`
- `目标模型`
- `动态表单角色`
- `是否需要双轨`

### Appendix B.5 Exception Control

Per-form overrides are allowed only when at least one is true:

- the form's core object differs from the rest of the group
- the form keeps the same object but its business purpose changes
- the field structure is no longer homologous
- the form sits in a different traceability-chain position
- the form carries an additional state machine, approval chain, or closure requirement
- the current schema is better served by a different model than the default group model

When an override occurs, the per-form row must record:

- `是否例外 = 是`
- `例外原因`
- `覆盖前结论`
- `覆盖后结论`

If a group exceeds `30%` exception coverage, it must be split and re-judged.

### Appendix B.6 Execution Order

The execution order for building the full appendix is fixed:

1. scan all source forms from the actual source directory
2. attach each form to one of the 35 baseline template groups
3. identify non-fitting groups and split them using the split rules
4. generate the per-form expansion table
5. calculate exception ratios and loop back if a group exceeded the threshold

### Appendix B.7 First-Pass Execution Status

A first-pass execution run has already been completed against the live source directory. The generated outputs are:

- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/2026-04-24-model-landing-layer-form-expansion-first-pass.csv`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/2026-04-24-model-landing-layer-form-expansion-first-pass.md`

Current first-pass status:

- scanned source forms: `283`
- mapped forms: `283`
- unmapped forms: `0`
- template groups used in first pass: `35`

The first pass also surfaced several stable execution-level groups that are more specific than the initial baseline wording, especially around:

- product inspection
- calibration and laboratory records
- allergen control
- support operations
- visitor access
- maintenance support

These first-pass files are the current execution truth for template-group attachment. If later appendix tables are manually refined, they must stay consistent with these generated outputs or explicitly record the reason for divergence.

### Appendix B.8 Second-Pass Execution Status

A second-pass split run has also been completed to resolve the first-pass oversized groups and move the appendix from coarse attachment into an implementation-ready draft.

The generated outputs are:

- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/2026-04-24-model-landing-layer-form-expansion.csv`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/2026-04-24-model-landing-layer-form-expansion.md`

Current second-pass status:

- scanned source forms: `283`
- mapped forms: `283`
- unmapped forms: `0`
- template groups used in second pass: `59`

The second pass is the current implementation-ready draft. The first-pass files remain useful as audit evidence, but implementation-facing work should read the second-pass outputs first.

### Appendix B.9 Stable Execution-Level Split Groups

The second pass established a set of stable execution-level split groups beyond the original 35 baseline groups.

These groups do not redefine the model layer. They refine how concrete source forms attach to the model layer.

#### Environment And Hygiene Splits

- `FG-quality-environment-cleaning-02`
  - sanitation and cleaning records
- `FG-quality-environment-monitoring-03`
  - temperature, humidity, pressure, chlorine, microbiology, and similar monitored values
- `FG-quality-environment-inspection-02`
  - hygiene inspection and health-check style records

#### Ingredient-Usage Splits

- `FG-batch-ingredient-usage-requisition-02`
  - requisition or warehouse-led issue records
- `FG-batch-ingredient-usage-change-control-03`
  - ingredient or weighing change-control records
- `FG-batch-ingredient-usage-production-04`
  - production-facing issue, premix, and batching execution records

#### Product-Inspection Splits

- `FG-quality-product-inspection-process-02`
  - in-process checkpoints and inline quality controls
- `FG-quality-product-inspection-finished-03`
  - finished-product or semi-finished-product inspection records

#### Support And Document Splits

- `FG-governance-support-communications-02`
  - communication, reporting, reference-list, and support-operation records
- `FG-governance-document-control-02`
  - document-control operation records
- `FG-governance-document-control-03`
  - document change requests that still belong to the controlled-document loop
- `FG-governance-visitor-access-02`
  - visitor, access, and controlled-area access records

#### Maintenance And Asset Splits

- `FG-governance-maintenance-equipment-02`
  - repair, maintenance, inspection, and maintenance-execution records
- `FG-governance-maintenance-asset-03`
  - equipment registry and acceptance records

#### Version-And-Change Splits

- `FG-process-version-product-development-02`
  - product development and development-change records
- `FG-process-version-system-verification-03`
  - program, PRP, or system-verification records
- `FG-process-version-engineering-change-04`
  - engineering-change and trial-change records

#### Inventory And Delivery Splits

- `FG-batch-inventory-warehouse-02`
  - warehouse-facing inventory movement records
- `FG-batch-inventory-support-02`
  - support-material, chemical, medicine, key, uniform, and similar support inventory records
- `FG-batch-delivery-sales-02`
  - sales-delivery and outbound shipment records

#### Management-Review Splits

- `FG-governance-management-review-core-04`
  - core management-review records
- `FG-governance-management-review-input-summary-02`
  - departmental annual-summary inputs
- `FG-governance-management-review-input-customer-03`
  - customer-satisfaction inputs

### Appendix B.10 Relationship Between Split Groups And Model Actions

The execution-level split groups do not create new model categories by themselves.

They exist for three reasons:

- to reduce exception density inside over-broad template groups
- to keep per-form attachment rules stable
- to make later implementation and migration work more mechanical

Unless explicitly noted otherwise, split groups still inherit the same high-level model action from their parent subfamily and parent template-group direction.

Examples:

- `FG-quality-environment-cleaning-02`, `FG-quality-environment-monitoring-03`, and `FG-quality-environment-inspection-02` still converge under the environment-control model direction
- `FG-batch-ingredient-usage-requisition-02`, `FG-batch-ingredient-usage-change-control-03`, and `FG-batch-ingredient-usage-production-04` still converge under the ingredient-usage bridge direction
- `FG-governance-management-review-core-04`, `FG-governance-management-review-input-summary-02`, and `FG-governance-management-review-input-customer-03` still converge under the management-review governance direction

If a future split group requires a different model action than its parent direction, that divergence must be called out explicitly in Appendix C rather than inferred silently.

## Appendix C. Model Convergence Action List

This appendix is the direct bridge from source-form understanding into schema and implementation work.

### Appendix C.1 Field Definition

Each action row uses these fields:

- `动作 ID`
- `业务对象`
- `当前模型`
- `动作类型`
- `原因`
- `涉及表单子族`
- `后续实现提示`

### Appendix C.2 Reuse Existing Models

| 动作 ID | 业务对象 | 当前模型 | 动作类型 | 原因 | 涉及表单子族 | 后续实现提示 |
| --- | --- | --- | --- | --- | --- | --- |
| `ACT-reuse-product` | `Product` | `Product` | 复用 | 产品主数据边界清晰，是跨研发、生产、追溯共享事实源 | 产品主数据、产品开发关联、生产批次关联 | 补来源表单映射和版本/状态边界，不重建平行产品对象 |
| `ACT-reuse-material` | `Material` | `Material` | 复用 | 物料主数据已是共享基础对象 | 物料主数据、来料检验、配方、投料 | 补物料分类、启停、关联供应商语义 |
| `ACT-reuse-supplier` | `Supplier` | `Supplier` | 复用 | 供应商作为来源主体边界清晰 | 供应商主数据、供应商评价、来料检验、资质文件 | 与评价、资质、来料质量链加强关联 |
| `ACT-reuse-recipe` | `Recipe` | `Recipe` | 复用 | 配方主对象已存在，语义正确 | 产品配方、研发配方 | 关注版本和审批关系，不重建第二套配方主表 |
| `ACT-reuse-recipe-line` | `RecipeLine` | `RecipeLine` | 复用 | 配方明细对象明确 | 配方明细/BOM | 补物料约束、单位、顺序和标准用量映射 |
| `ACT-reuse-process-step` | `ProcessStep` | `ProcessStep` | 复用 | 工艺步骤已具备承接结构标准方向 | 工艺步骤、工艺流程 | 不要把实际过程记录混进步骤定义 |
| `ACT-reuse-material-lot` | `MaterialLot` | `MaterialBatch` | 复用 | 来料批次对象已存在，只是命名待统一解释 | 来料批次、库存、来料检验 | 文档统一业务名 `MaterialLot`，代码保留 `MaterialBatch` |
| `ACT-reuse-production-batch` | `ProductionBatch` | `ProductionBatch` | 复用 | 生产批次是主链锚点 | 生产批次、过程记录、成品链 | 围绕它挂接过程、放行、偏差、追溯 |
| `ACT-reuse-ingredient-usage` | `IngredientUsage` | `BatchMaterialUsage` | 复用 | 投料桥接对象已存在，且是追溯核心桥梁 | 投料/领料/配料桥接 | 不允许表单备注替代桥接关系 |
| `ACT-reuse-finished-goods-batch` | `FinishedGoodsBatch` | `FinishedGoodsBatch` | 复用 | 成品批次对象边界明确 | 成品批次、放行、发货前置 | 明确与生产批次、放行、出货关系 |
| `ACT-reuse-delivery-note` | `DeliveryNote` | `DeliveryNote` | 复用 | 发货对象是后链关键节点 | 发货/出货链路 | 与客户、投诉、召回链打通 |
| `ACT-reuse-sample` | `Sample` | `Sample` | 复用 | 留样对象已存在 | 留样/复检链路 | 作为批次链辅助对象接入 |
| `ACT-reuse-inventory-movement` | `InventoryMovement` | `InventoryMovement` | 复用 | 库存流转对象已存在 | 库存移动、出入库、移库 | 重点补批次级关系 |
| `ACT-reuse-supplier-evaluation` | `SupplierEvaluation` | `SupplierEvaluation` | 复用 | 治理对象已经存在 | 供应商评价 | 补评分证据、周期、关闭状态 |
| `ACT-reuse-supplier-document` | `SupplierDocument` | `SupplierDocument` | 复用 | 供应商资质证据对象已存在 | 供应商资质/外部文件 | 与供应商、评价、有效期协同 |
| `ACT-reuse-corrective-action` | `CorrectiveAction` | `CorrectiveAction` | 复用 | CAPA 对象边界明确 | 纠正预防措施、整改闭环 | 接问题来源和验证闭环，不再新建平行整改表 |

### Appendix C.3 Extend Existing Models

| 动作 ID | 业务对象 | 当前模型 | 动作类型 | 原因 | 涉及表单子族 | 后续实现提示 |
| --- | --- | --- | --- | --- | --- | --- |
| `ACT-extend-process-record` | `ProcessRecord` | `ProcessMonitorRecord` | 扩展 | 过程记录已存在，但不足以完整承接多类现场记录和参数语义 | 过程监控 | 补与批次、步骤、参数标准、异常的关系 |
| `ACT-extend-environment-record` | `EnvironmentRecord` | `EnvironmentRecord` | 扩展 | 环境记录通常需要监测点、区域、频次、结果类型等更强结构 | 环境与区域监测 | 考虑引入位置主数据引用 |
| `ACT-extend-incoming-inspection` | `IncomingInspection` | `IncomingInspection` | 扩展 | 对象已存在，但仍需更强的判定结果、批次、供应商、证据关联 | 来料检验 | 强化与 `MaterialBatch` 和 `Supplier` 的闭环关系 |
| `ACT-extend-rework-record` | `ReworkRecord` | `ReworkRecord` | 扩展 | 返工记录通常仍需覆盖影响批次、重入流程、处置结果 | 返工/返修记录 | 加强与批次状态和偏差对象联动 |
| `ACT-extend-product` | `Product` | `Product` | 扩展 | 吸收更多研发/版本/状态信息时主表需要受控扩展 | 产品主数据、产品开发版本 | 扩展不等于把版本逻辑全塞进 `Product` |
| `ACT-extend-process-step` | `ProcessStep` | `ProcessStep` | 扩展 | 若承接工艺参数标准，需要对步骤模型做受控扩展 | 工艺步骤、工艺参数标准 | 区分步骤定义与执行记录 |
| `ACT-extend-deviation-module` | `DeviationCase` | 当前 deviation 模块 | 扩展 | 已有 deviation 模块基础，但治理边界和批次联动可能仍不完整 | 偏差/异常记录 | 明确偏差对象与 CAPA、批次、放行的关系 |
| `ACT-extend-user-employee` | `Employee` | 现有用户/组织体系 | 扩展 | 身份可能存在，但岗位能力、签核资格、培训完成状态未必结构化 | 人员/岗位主数据、培训与能力评价 | 不复制第二套人员身份体系 |

### Appendix C.4 Add New Models

| 动作 ID | 业务对象 | 当前模型 | 动作类型 | 原因 | 涉及表单子族 | 后续实现提示 |
| --- | --- | --- | --- | --- | --- | --- |
| `ACT-add-customer` | `Customer` | `未建模` | 新增 | 客户是发货、投诉、召回后链的共享主体 | 客户主数据、投诉、召回 | 若已有 CRM 级对象可复用，再做整合判断；否则先确立食品安全侧客户主数据 |
| `ACT-add-location` | `Location` | `未建模/部分` | 新增 | 仓位、区域、监测点、取样点需要统一引用对象 | 位置/区域/仓位主数据、环境监测、库存 | 避免每张表单重复写自由文本地点 |
| `ACT-add-product-process-version` | `ProductProcessVersion` | `未建模` | 新增 | 配方、工艺、参数、版本受控需要上层聚合对象 | 产品开发版本 | 不要把版本聚合逻辑散落在多个表单和备注里 |
| `ACT-add-work-instruction-binding` | `WorkInstructionBinding` | `未建模` | 新增 | 产品/步骤/工艺与受控文件之间需要稳定绑定关系 | 作业指导绑定 | 文件本体仍可在文档系统，绑定关系需结构化 |
| `ACT-add-traceability-drill` | `TraceabilityDrill` | `未建模` | 新增 | 演练对象具有稳定治理语义，且需要结构化结果和闭环 | 正追演练、反追演练 | 与真实批次链和演练证据双向关联 |
| `ACT-add-product-recall` | `ProductRecall` | `未建模` | 新增 | 召回是高价值治理对象，不能只散落在记录里 | 召回/召回演练 | 连接客户、发货、成品批次、原因分析、处置闭环 |
| `ACT-add-release-decision` | `ReleaseDecision` | `未建模/部分` | 新增或独立扩展 | 放行决定是批次状态汇总对象，不宜只靠状态字段 | 放行判定 | 可作为独立对象或受控子表，但必须有结构边界 |
| `ACT-add-hold-disposition` | `HoldDisposition` | `未建模` | 新增 | 待判、隔离、让步接收、报废等处置动作需要闭环对象 | 待判/隔离/处置记录 | 避免关键处置动作只做批次状态变更备注 |
| `ACT-add-management-review` | `ManagementReview` | `未建模` | 新增 | 管理评审是聚合治理对象 | 管理评审 | 输入、会议、输出、跟踪建议围绕同一对象建模 |
| `ACT-add-audit-case` | `AuditCase` | `未建模` | 新增 | 审核/检查天然带发现项与整改闭环 | 内审/外审/检查 | 避免只用静态检查表承接全过程 |
| `ACT-add-risk-assessment` | `RiskAssessment` | `未建模` | 新增 | 风险、TACCP、VACCP 对象有版本、评分、复评、措施跟踪需求 | 风险评估/食品防护/脆弱性评估 | 保留表单证据，但需明确结构对象 |
| `ACT-add-food-safety-team-activity` | `FoodSafetyTeamActivity` | `未建模` | 新增 | 食品安全小组活动是治理运行对象，不只是普通会议纪要 | 食品安全小组与文化建设 | 可从活动、计划、评价三个层面建模 |
| `ACT-add-complaint-case` | `ComplaintCase` | `未建模/部分` | 新增 | 客户投诉需要连接客户、发货、批次、调查和措施闭环 | 客户投诉与后市场闭环 | 和召回、CAPA、发货链直接打通 |

### Appendix C.5 Mandatory Dual-Track Objects

The following objects are explicitly dual-track by default:

- `Employee`
- `ProcessParameterSpec`
- `ProductProcessVersion`
- `WorkInstructionBinding`
- `Sample`
- `TraceabilityDrill`
- `ProductRecall`
- `IncomingInspection`
- `ProcessRecord`
- `CCPRecord`
- `MetalDetectionLog`
- `EnvironmentRecord`
- `ReleaseDecision`
- `ReworkRecord`
- `DeviationCase`
- `HoldDisposition`
- `SupplierEvaluation`
- `SupplierDocument`
- `CorrectiveAction`
- `ManagementReview`
- `TrainingProgram`
- `AuditCase`
- `RiskAssessment`
- `FoodSafetyTeamActivity`
- `ComplaintCase`

### Appendix C.6 Dynamic-Form-Dominant Objects

At the current convergence level, the default dynamic-form-dominant scope should remain narrow.

The only explicitly allowed object family is:

- `DocumentControlException`

Any object not listed here may not be silently downgraded to dynamic-form-only.

### Appendix C.7 Frozen Execution-Group Action Inheritance Table

This table freezes how each of the 59 execution-level groups inherits or specializes the model actions defined above. Later implementation agents should read this table before interpreting the CSV attachment outputs.

| 执行层模板组 ID | 继承动作 ID | 动作类型 | 结构化模型方向 | 说明 | 当前表单数 |
| --- | --- | --- | --- | --- | --- |
| `FG-quality-environment-cleaning-02` | `ACT-extend-environment-record` | 扩展 | EnvironmentRecord | 环境清洁/消毒执行组 | `28` |
| `FG-batch-ingredient-usage-production-04` | `ACT-reuse-ingredient-usage` | 复用 | BatchMaterialUsage | 投料打料/配料执行组 | `18` |
| `FG-governance-maintenance-equipment-02` | `ACT-add-work-instruction-binding` | 动态表单继承 | MaintenanceSupport | 维护保养执行组 | `14` |
| `FG-governance-support-communications-02` | `ACT-add-work-instruction-binding` | 动态表单继承 | DocumentControlException | 沟通/支持运营执行组 | `12` |
| `FG-batch-production-01` | `ACT-reuse-production-batch` | 复用 | ProductionBatch | 生产批次执行主组 | `11` |
| `FG-governance-audit-01` | `ACT-add-audit-case` | 新增 | AuditCase | 审核检查主组 | `11` |
| `FG-quality-incoming-inspection-01` | `ACT-extend-incoming-inspection` | 扩展 | IncomingInspection | 来料检验主组 | `10` |
| `FG-quality-calibration-lab-01` | `ACT-extend-process-record` | 扩展 | ProcessMonitorRecord | 化验/校准/计量主组 | `10` |
| `FG-quality-product-inspection-finished-03` | `ACT-extend-process-record` | 扩展 | ProcessMonitorRecord | 成品/半成品检验组 | `10` |
| `FG-quality-environment-monitoring-03` | `ACT-extend-environment-record` | 扩展 | EnvironmentRecord | 环境监测/参数记录组 | `9` |
| `FG-quality-ccp-01` | `ACT-reuse-corrective-action` | 双轨继承 | CCPRecord | CCP 主组 | `8` |
| `FG-batch-inventory-support-02` | `ACT-reuse-inventory-movement` | 复用 | InventoryMovement | 支持类库存流转组 | `7` |
| `FG-governance-management-review-input-summary-02` | `ACT-add-management-review` | 新增 | ManagementReview | 管理评审部门总结输入组 | `7` |
| `FG-governance-visitor-access-02` | `ACT-add-work-instruction-binding` | 动态表单继承 | DocumentControlException | 访客/受控区域准入组 | `7` |
| `FG-governance-document-control-02` | `ACT-add-work-instruction-binding` | 动态表单继承 | DocumentControlException | 文控操作记录组 | `7` |
| `FG-governance-management-review-core-04` | `ACT-add-management-review` | 新增 | ManagementReview | 管理评审核心组 | `6` |
| `FG-trace-recall-01` | `ACT-add-product-recall` | 新增 | ProductRecall | 召回/召回演练主组 | `6` |
| `FG-governance-supplier-documents-01` | `ACT-reuse-supplier-document` | 复用 | SupplierDocument | 供应商资质主组 | `6` |
| `FG-process-version-product-development-02` | `ACT-add-product-process-version` | 新增 | ProductProcessVersion | 研发/开发变更组 | `5` |
| `FG-batch-inventory-warehouse-02` | `ACT-reuse-inventory-movement` | 复用 | InventoryMovement | 仓储库存流转组 | `5` |
| `FG-quality-process-monitoring-01` | `ACT-extend-process-record` | 扩展 | ProcessMonitorRecord | 一般过程监控主组 | `5` |
| `FG-quality-environment-inspection-02` | `ACT-extend-environment-record` | 扩展 | EnvironmentRecord | 卫生检查/健康检查组 | `5` |
| `FG-quality-product-inspection-process-02` | `ACT-extend-process-record` | 扩展 | ProcessMonitorRecord | 制程检验/在线检测组 | `5` |
| `FG-batch-finished-goods-01` | `ACT-reuse-finished-goods-batch` | 复用 | FinishedGoodsBatch | 成品批次主组 | `4` |
| `FG-quality-allergen-control-01` | `ACT-extend-environment-record` | 扩展 | EnvironmentRecord | 过敏原控制主组 | `4` |
| `FG-batch-sample-01` | `ACT-reuse-sample` | 复用 | Sample | 留样复检主组 | `4` |
| `FG-governance-food-safety-team-01` | `ACT-add-food-safety-team-activity` | 新增 | FoodSafetyTeamActivity | 食品安全小组主组 | `4` |
| `FG-governance-supplier-evaluation-01` | `ACT-reuse-supplier-evaluation` | 复用 | SupplierEvaluation | 供应商评价主组 | `4` |
| `FG-governance-training-01` | `ACT-add-customer` | 双轨继承 | TrainingProgram | 培训主组 | `4` |
| `FG-batch-delivery-sales-02` | `ACT-reuse-delivery-note` | 复用 | DeliveryNote | 销售出货支组 | `3` |
| `FG-governance-risk-assessment-01` | `ACT-add-risk-assessment` | 新增 | RiskAssessment | 风险评估主组 | `3` |
| `FG-quality-deviation-01` | `ACT-extend-deviation-module` | 扩展 | DeviationCase | 偏差异常主组 | `3` |
| `FG-process-version-system-verification-03` | `ACT-add-product-process-version` | 新增 | ProductProcessVersion | 体系验证/脆弱性验证组 | `3` |
| `FG-quality-process-monitoring-02` | `ACT-extend-process-record` | 扩展 | ProcessMonitorRecord | 设备/巡检过程监控支组 | `3` |
| `FG-master-product-01` | `ACT-reuse-product` | 复用 | Product | 产品主数据主组 | `2` |
| `FG-process-parameter-spec-01` | `ACT-extend-process-step` | 扩展 | ProcessStep 扩展或参数标准模型 | 工艺参数标准主组 | `2` |
| `FG-quality-release-decision-01` | `ACT-add-release-decision` | 新增或独立扩展 | ReleaseDecision | 放行判定主组 | `2` |
| `FG-process-version-engineering-change-04` | `ACT-add-product-process-version` | 新增 | ProductProcessVersion | 工程变更组 | `2` |
| `FG-governance-maintenance-asset-03` | `ACT-add-work-instruction-binding` | 动态表单继承 | MaintenanceAsset | 设备台账/验收支组 | `2` |
| `FG-governance-risk-assessment-02` | `ACT-add-risk-assessment` | 新增 | RiskAssessment | 环境因素/风险机遇支组 | `2` |
| `FG-governance-audit-02` | `ACT-add-audit-case` | 新增 | AuditCase | 应急演练/审核输入支组 | `2` |
| `FG-process-step-01` | `ACT-reuse-process-step` | 复用 | ProcessStep | 工艺步骤主组 | `1` |
| `FG-batch-ingredient-usage-requisition-02` | `ACT-reuse-ingredient-usage` | 复用 | BatchMaterialUsage | 领料/领用支组 | `1` |
| `FG-quality-hold-disposition-01` | `ACT-add-hold-disposition` | 新增 | HoldDisposition | 待判隔离主组 | `1` |
| `FG-quality-hold-disposition-02` | `ACT-add-hold-disposition` | 新增 | HoldDisposition | 不合格处置支组 | `1` |
| `FG-batch-ingredient-usage-change-control-03` | `ACT-reuse-ingredient-usage` | 复用 | BatchMaterialUsage | 配料变更控制支组 | `1` |
| `FG-quality-calibration-lab-02` | `ACT-extend-process-record` | 扩展 | ProcessMonitorRecord | 内部校准支组 | `1` |
| `FG-quality-metal-detection-01` | `ACT-reuse-corrective-action` | 双轨继承 | MetalDetectionLog | 金探主组 | `1` |
| `FG-governance-risk-assessment-03` | `ACT-add-risk-assessment` | 新增 | RiskAssessment | 产品风险区判定支组 | `1` |
| `FG-process-version-01` | `ACT-add-product-process-version` | 新增 | ProductProcessVersion | 通用变更申请遗留组 | `1` |
| `FG-governance-food-safety-team-02` | `ACT-add-food-safety-team-activity` | 新增 | FoodSafetyTeamActivity | 食品安全调度会议支组 | `1` |
| `FG-quality-allergen-control-02` | `ACT-extend-environment-record` | 扩展 | EnvironmentRecord | 过敏原趋势分析支组 | `1` |
| `FG-quality-rework-01` | `ACT-extend-rework-record` | 扩展 | ReworkRecord | 返工返修主组 | `1` |
| `FG-trace-backward-drill-01` | `ACT-add-traceability-drill` | 新增 | TraceabilityDrill | 反追演练主组 | `1` |
| `FG-trace-forward-drill-01` | `ACT-add-traceability-drill` | 新增 | TraceabilityDrill | 正追演练主组 | `1` |
| `FG-governance-management-review-input-customer-03` | `ACT-add-management-review` | 新增 | ManagementReview | 管理评审顾客满意度输入组 | `1` |
| `FG-governance-document-control-03` | `ACT-add-work-instruction-binding` | 动态表单继承 | DocumentControlException | 文控变更申请支组 | `1` |
| `FG-batch-material-lot-01` | `ACT-reuse-material-lot` | 复用 | MaterialBatch | 来料批次主组 | `1` |
| `FG-master-material-02` | `ACT-reuse-material` | 复用 | Material | 物料分类/明细变更支组 | `1` |

## Appendix D. Terminology Mapping Table

This appendix fixes the terminology that future agents should use across specs, schema work, and implementation planning.

### Appendix D.1 Field Definition

Each row uses these fields:

- `业务标准名`
- `当前代码模型名`
- `对象类别`
- `是否已存在于 schema`
- `说明`
- `相关表单族`
- `默认模型动作`

### Appendix D.2 Master Data Objects

| 业务标准名 | 当前代码模型名 | 对象类别 | 是否已存在于 schema | 说明 | 相关表单族 | 默认模型动作 |
| --- | --- | --- | --- | --- | --- | --- |
| `Product` | `Product` | 主数据 | 是 | 产品主数据是研发、生产、投料、成品批次、发货、追溯共享事实源 | 产品主数据、产品开发、配方、生产批次、成品批次、追溯 | 复用 |
| `Material` | `Material` | 主数据 | 是 | 物料主数据是采购、来料、仓储、配方、投料、追溯共享事实源 | 物料主数据、来料检验、库存、配方、投料、追溯 | 复用 |
| `Supplier` | `Supplier` | 主数据 | 是 | 供应商是物料来源、资质文件、评价、来料质量、纠正闭环的共享主体 | 供应商主数据、供应商评价、供应商资质、来料检验、纠正措施 | 复用 |
| `Customer` | `未建模` | 主数据 | 否 | 客户对象主要服务发货、投诉、召回、追溯后链 | 发货、客户投诉、召回、追溯后置 | 新增 |
| `Employee` | 用户/组织实现待核 | 主数据 | 部分 | 人员主体广泛出现在培训、签字、审批、岗位能力和操作记录中 | 培训、审批、签核、岗位资质、操作记录 | 扩展 |
| `Location` | 仓位/区域实现待核 | 主数据 | 否/部分 | 位置对象包括仓位、区域、车间、监测点、取样点等共享引用对象 | 库存、仓储、环境监测、区域检查、生产区域记录 | 新增 |

### Appendix D.3 Recipe And Process Objects

| 业务标准名 | 当前代码模型名 | 对象类别 | 是否已存在于 schema | 说明 | 相关表单族 | 默认模型动作 |
| --- | --- | --- | --- | --- | --- | --- |
| `Recipe` | `Recipe` | 配方/工艺 | 是 | 配方是产品与原辅料之间的理论结构关系 | 产品配方、产品开发、工艺参数、投料前置 | 复用 |
| `RecipeLine` | `RecipeLine` | 配方/工艺 | 是 | 配方明细承接单个配方下的物料构成、标准用量、单位和顺序 | 产品配方、配方明细、投料解释、物料关联 | 复用 |
| `ProcessStep` | `ProcessStep` | 配方/工艺 | 是 | 工艺步骤定义产品或过程执行时的步骤顺序、控制点和操作框架 | 工艺流程、工艺参数、过程控制、作业指导 | 复用 |
| `ProcessParameterSpec` | `未建模` 或 `ProcessStep` 扩展待定 | 配方/工艺 | 否/部分 | 表达工艺步骤上的标准参数、上下限和控制要求 | 工艺参数、工艺卡、过程标准、作业参数 | 扩展 |
| `ProductProcessVersion` | `未建模` | 配方/工艺 | 否 | 用于表达产品配方、工艺路线、参数标准的版本化聚合 | 产品开发、配方变更、工艺变更、版本受控 | 新增 |
| `WorkInstructionBinding` | `未建模` | 配方/工艺 | 否 | 表达工艺步骤、产品、配方与作业指导文件之间的受控绑定关系 | 作业指导、工艺步骤、产品开发、受控文件引用 | 双轨 |

### Appendix D.4 Batch And Traceability Objects

| 业务标准名 | 当前代码模型名 | 对象类别 | 是否已存在于 schema | 说明 | 相关表单族 | 默认模型动作 |
| --- | --- | --- | --- | --- | --- | --- |
| `MaterialLot` | `MaterialBatch` | 批次/追溯 | 是 | 原辅料批次是来料、库存、检验、投料、追溯起点对象 | 来料登记、原辅料检验、库存批次、投料、追溯 | 复用 |
| `ProductionBatch` | `ProductionBatch` | 批次/追溯 | 是 | 生产批次是投料、过程记录、成品形成、放行、追溯核心锚点 | 生产批次、投料记录、过程记录、成品记录、追溯 | 复用 |
| `IngredientUsage` | `BatchMaterialUsage` | 批次/追溯 | 是 | 投料桥接对象，把 `MaterialLot` 和 `ProductionBatch` 连接起来 | 投料记录、领料记录、配料记录、追溯 | 复用 |
| `FinishedGoodsBatch` | `FinishedGoodsBatch` | 批次/追溯 | 是 | 成品批次承接生产结果、放行状态、库存和出货前状态 | 成品批次、成品入库、放行、发货、追溯 | 复用 |
| `DeliveryNote` | `DeliveryNote` | 批次/追溯 | 是 | 发货对象把成品批次与客户后链连接起来 | 发货记录、出货记录、客户链路、召回、追溯 | 复用 |
| `Sample` | `Sample` | 批次/追溯 | 是 | 留样对象是批次追踪、复检、投诉调查的重要辅助节点 | 留样记录、检验复核、投诉调查、追溯辅助 | 复用 |
| `InventoryMovement` | `InventoryMovement` | 批次/追溯 | 是 | 库存移动连接来料、在库、领料、投料、成品流转 | 入库、出库、移库、库存台账、投料前置、追溯 | 复用 |
| `TraceabilityDrill` | `未建模` | 批次/追溯 | 否 | 追溯演练是对主链可用性的治理对象 | 正追演练、反追演练、召回演练、追溯分析 | 双轨 |
| `ProductRecall` | `未建模` | 批次/追溯 | 否 | 召回对象连接客户、发货、成品批次、原因分析和处置闭环 | 召回、投诉、发货后追溯、批次处置 | 双轨/新增 |

### Appendix D.5 Quality And Process-Control Objects

| 业务标准名 | 当前代码模型名 | 对象类别 | 是否已存在于 schema | 说明 | 相关表单族 | 默认模型动作 |
| --- | --- | --- | --- | --- | --- | --- |
| `IncomingInspection` | `IncomingInspection` | 质量/过程控制 | 是 | 连接 `MaterialLot`、供应商和入库前质量判断，是来料放行关键控制点 | 原辅料检验、包材检验、来料检验台账、入库前判定 | 复用 |
| `ProcessRecord` | `ProcessMonitorRecord` | 质量/过程控制 | 是 | 承接生产过程中的实际参数、检查结果、操作状态 | 生产过程记录、工艺监控、巡检、过程参数记录 | 复用/扩展 |
| `CCPRecord` | `CCPRecord` | 质量/过程控制 | 是 | 关键控制点记录属于食品安全控制核心记录 | CCP 监控、关键限值记录、关键控制点验证 | 复用 |
| `MetalDetectionLog` | `MetalDetectionLog` | 质量/过程控制 | 是 | 金探记录通常与批次放行和异常处置直接相关 | 金探记录、异物控制、设备检测记录 | 复用 |
| `EnvironmentRecord` | `EnvironmentRecord` | 质量/过程控制 | 是 | 环境监测记录涉及区域、监测点、频次和结果 | 环境监测、卫生检查、区域监测、水气表面记录 | 复用/扩展 |
| `ReworkRecord` | `ReworkRecord` | 质量/过程控制 | 是 | 涉及批次重入、处置方式、影响范围和后续状态 | 返工、返修、异常处置、重工记录 | 复用 |
| `ReleaseDecision` | `未建模` 或散落在批次/检验状态中 | 质量/过程控制 | 否/部分 | 把检验、过程控制和批次状态汇总成明确放行结论 | 放行记录、成品判定、批次放行、出货前判定 | 扩展/新增 |
| `DeviationCase` | 当前 deviation 模块待核 | 质量/过程控制 | 部分 | 承接过程异常、质量异常、调查、影响分析和纠正闭环 | 偏差记录、异常记录、不合格处置、调查分析 | 双轨/扩展 |
| `HoldDisposition` | `未建模` | 质量/过程控制 | 否 | 待判、隔离、冻结、让步接收、报废等处置动作 | 待处理品、不合格品、隔离品、处置审批 | 新增/双轨 |

### Appendix D.6 Governance And Closure Objects

| 业务标准名 | 当前代码模型名 | 对象类别 | 是否已存在于 schema | 说明 | 相关表单族 | 默认模型动作 |
| --- | --- | --- | --- | --- | --- | --- |
| `SupplierEvaluation` | `SupplierEvaluation` | 治理/闭环 | 是 | 连接供应商、来料质量、整改和准入管理 | 供应商评价、供应商考核、年度评审、准入复核 | 复用 |
| `SupplierDocument` | `SupplierDocument` | 治理/闭环 | 是 | 资质、证照、承诺书、检测报告等属于供应商治理证据层对象 | 供应商资质、外来证照、合规文件、供应商档案 | 复用/双轨 |
| `CorrectiveAction` | `CorrectiveAction` | 治理/闭环 | 是 | 承接问题、原因分析、责任、措施、验证和关闭 | 纠正措施、预防措施、不合格整改、审计整改、投诉整改 | 复用 |
| `ManagementReview` | `未建模` | 治理/闭环 | 否 | 管理评审是管理层定期审视体系运行、目标、资源、问题和改进方向的聚合治理对象 | 管理评审计划、输入、会议记录、输出、跟踪 | 双轨/新增 |
| `TrainingProgram` | `未建模` 或依赖 task/training 模块待核 | 治理/闭环 | 部分 | 涉及培训计划、对象、考试、能力验证、到期追踪 | 培训计划、培训签到、培训考试、培训效果评价、岗位能力 | 双轨 |
| `AuditCase` | `未建模` | 治理/闭环 | 否 | 内审、外审、客户审核、监管检查通常形成问题清单和整改闭环 | 内审、外审、检查、审核问题、整改跟踪 | 双轨/新增 |
| `RiskAssessment` | `未建模` | 治理/闭环 | 否 | 风险评估、食品防护、脆弱性评估需要版本化、复评和跟踪措施 | 风险评估、VACCP/TACCP、食品防护、脆弱性分析 | 双轨 |
| `FoodSafetyTeamActivity` | `未建模` | 治理/闭环 | 否 | 食品安全小组会议、行动、计划、评价和职责履行记录 | 食品安全小组、食品安全文化建设、活动记录、评价记录 | 双轨 |
| `ComplaintCase` | `未建模` 或客户问题模块待核 | 治理/闭环 | 否/部分 | 连接客户、批次、发货、原因分析、纠正措施和召回判断 | 客户投诉、投诉调查、原因分析、纠正措施、召回评估 | 双轨/新增 |
| `DocumentControlException` | `未建模` | 治理/闭环 | 否 | 受控文件偏差、失效版本、异常发放、外来文件异常等文控治理占位对象 | 文件控制异常、外来文件管理、版本失控、发放回收异常 | 动态表单/双轨 |
