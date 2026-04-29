# 产品主数据建档与生产链路收敛设计

## 1. 背景

当前系统已经有 `Product`、`Recipe`、`RecipeLine`、`ProductionRun`、`ProductionBatch`、`FinishedGoodsBatch`、`DeliveryNote`、`CustomerComplaint` 等模型。产品研发流程审批通过后，也会创建产品和配方。

但真实上线场景中，很多客户的产品研发已经在线下纸质流程中完成。用户只是要把既有产品补进系统，然后继续做生产、入库、检验、出库、投诉和追溯。如果系统强迫这些既有产品重新走一遍研发流程，会明显不符合业务。

同时，现有代码里存在两类问题：

- 有些模块已经通过 `product_id` 或 `production_batch_id` 接入主链路。
- 有些模块仍然让用户手填产品名称、生产批次 ID 或批次号，存在填错、追溯断链和多事实源风险。

本设计目标是把产品档案定位为所有后续业务链路的前置主数据，并把历史产品建档、配方建档、配料区域分配和下游主数据引用规则一次性定清楚。

## 2. 现有实现梳理

### 2.1 已有产品与配方基础

系统已有：

- `Product`
- `Recipe`
- `RecipeLine`
- `ProductService`
- `RecipeService`
- 产品目录页面 `ProductList.vue`
- 配方管理页面 `RecipeList.vue`、`RecipeEdit.vue`

现状：

- `Product.code` 现在由用户手填。
- `Product.name` 是展示名称。
- `Recipe.product_id` 已经关联 `Product`。
- `RecipeLine.material_id` 已经关联物料。
- `RecipeService.create()` 会把同产品旧 active 配方归档，并创建新的 active 配方。

当前缺口：

- 产品目录没有“历史产品建档”正式入口。
- 产品和配方不能一次性事务建档。
- 产品编号还不是系统自动生成。
- 产品名称可修改时，历史业务记录缺少统一快照规则。

### 2.2 已有研发流程路径

系统已有研发流程：

```text
Step1 审批后创建 Product(draft)
Step6 审批后创建 Recipe/RecipeLine
Step7 审批后激活 Product
```

这条路径适合新产品从 0 到 1 开发，不适合既有产品补录。

### 2.3 已有生产链路基础

系统已有：

- `ProductionRun.product_id`
- `ProductionRun.recipe_id`
- `ProductionBatch.productId`
- `ProductionBatch.recipeId`
- `FinishedGoodsBatch.productionBatchId`
- `DeliveryNote.production_batch_id`
- `CustomerComplaint.production_batch_id`
- 过程记录、CCP、金检、返工、废弃物等多处 `production_batch_id`

现状：

- `ProductionRun` 已经强制 `product_id`，方向正确。
- `ProductionRun.recipe_id` 目前可选，需要改为业务必选。
- `ProductionBatch.productId`、`ProductionBatch.recipeId` 目前可选。
- `ProductionBatch.productName` 当前是必填，更像事实源，而不是快照。
- 旧批次追溯页面 `BatchList.vue` 仍通过输入框手填产品名称和产品代码。
- 很多过程记录页面仍手填生产批次 ID 或批次号。

### 2.4 已有配料区域基础

系统已有车间暂存区和区域概念：

- `MaterialRequisition.targetZone`
- `StagingAreaStock.location`
- `StagingAreaTransfer.fromZone`
- `StagingAreaTransfer.toZone`
- `StagingAreaService.WORKSHOP_ZONES`

现有区域曾写死为：

```text
筛粉间
称油间
小料房
```

源记录表单里也存在明确配料区域：

- 配料记录表（小料）
- 配料记录表（果酱房）
- 配料记录表（筛粉）
- 配料记录表（配油）
- 每日鸡蛋车间表

当前缺口：

- 车间区域还不是公司级主数据。
- 配方明细没有区域归属。
- 生产执行还不能按配方区域拆分配料单。

### 2.5 现有可复用对象复核

本设计不允许因为新闭环再造一套平行字段。实现前必须先复用下表已有对象；只有“缺口字段”才新增。

| 设计模块 | 现有可复用位置 | 不重复新增 | 允许新增或改造 |
| --- | --- | --- | --- |
| 产品档案 | `Product.id/code/name/status`、`ProductService`、`ProductList.vue` | 不建 `HistoricalProduct`、`LegacyProduct`、`ProductArchive` | `Product.source` 可新增，用于区分 `rd_process / legacy_import / manual_admin` |
| 产品编号 | `Product.code`、`SystemConfig` 的配置式编号思路、`BatchNumberGeneratorService` 的生成器模式 | 不建第二个“产品编号字段” | 新增 `ProductCodeGeneratorService`，编号规则从 `SystemConfig` 读取，例如 `product.code.format` |
| 新产品研发路径 | `ProcessInstance.productId/productName`、研发审批回调里创建 `Product/Recipe/RecipeLine` | 不建“研发产品表” | 把研发路径创建产品的编号生成改为同一套产品编号服务 |
| 历史产品建档 | `Product + Recipe + RecipeLine` | 不建“历史产品建档表”承载产品事实 | 新增一个建档事务 API，但落表仍是 `Product/Recipe/RecipeLine` |
| 配方 | `Recipe.product_id`、`Recipe.version/status`、`RecipeLine.material_id/qty_per_batch/unit/is_critical/notes` | 不新增 `Formula/FormulaLine` | 只在 `RecipeLine` 上补区域归属字段 |
| 物料选择 | `Material.id/materialCode/name/unit/categoryId`、仓库物料 API | 不在配方行、包装材料用量、废弃物记录里手填物料事实源 | 需要引用物料时存 `material_id` 或 `material_batch_id`，名称和编码只做快照 |
| 配料区域 | 现有 `MaterialRequisition.targetZone`、`StagingAreaStock.location`、`StagingAreaTransfer.fromZone/toZone`、`WORKSHOP_ZONES` | 不再继续散落写死 `筛粉间/称油间/小料房` 字符串 | 新增公司级 `WorkshopArea` 是对现有区域概念正规化；现有区域字符串逐步迁移为 `areaId + areaNameSnapshot` |
| 生产开工 | `ProductionRun.product_id`、`ProductionRun.recipe_id`、`OpenRunDialog.vue` | 不在 `ProductionRun` 另存产品名称事实源 | `recipe_id` 改业务必填，并校验 active 产品和 active 配方 |
| 生产批次 | `ProductionBatch.productId/recipeId/productName/recipeName`、`production_run_id`、`ProductionBatchService` | 不新增另一张“产品生产批次表” | 将 `productName/recipeName` 明确为快照；`productId/recipeId` 改业务必填 |
| 区域配料单 | `RecipeLine`、`BatchMaterialUsage`、`StagingAreaStock` | 不建独立投料事实源替代 `BatchMaterialUsage` | 可新增区域配料单状态表，但最终投料事实必须汇总到 `BatchMaterialUsage` |
| 投料记录 | `BatchMaterialUsage.productionBatchId/materialBatchId/quantity` | 不新建 `IngredientUsage` 平行表；`IngredientUsage` 只作为业务名 | `BatchMaterialUsage` 补 `recipeLineId/areaId/areaNameSnapshot` |
| 成品批次 | `FinishedGoodsBatch.productionBatchId` | 不在成品批次重复保存产品字段 | 通过 `ProductionBatch` 追到产品，需要报表展示时生成快照 |
| 发货 | `DeliveryNote.production_batch_id` | 不给发货单直接新增 `productId` | 当前 `customer_name` 是客户快照；若客户主数据完善后再补 `customer_id` |
| 投诉 | `CustomerComplaint.production_batch_id` | 不给投诉单直接新增 `productId` | 页面从手填批次改为批次选择；当前 `customer_name` 是客户快照，后续可接 `ExternalParty` 客户主数据 |
| 过程/CCP/金检/返工 | `production_batch_id` 已在 `CCPRecord`、`ProcessMonitorRecord`、`MetalDetectionLog`、`ReworkRecord` 中存在 | 不重复加 `productId` | 前端把手填生产批次 ID 改为批次选择器 |
| 动态记录表单 | `RecordTemplate.batchLinkEnabled/batchLinkType/batchLinkField`、`Record.productionBatchId/finishedGoodsBatchId` | 不把动态表单里的产品名当主数据事实源 | 模板字段可显示名称，但批次关联必须落到已有批次外键 |
| 供应商资质/产品外检 PDF | `SupplierDocument`、`SupplierQualification`、`BusinessDocumentLink`、`ProductService.uploadReport()` | 不纳入本次产品建档模块，也不在产品档案里重复证照字段 | 保持在供应商、检验、产品报告附件场景里维护有效期和替换 |
| 部门/人员 | `Department`、`User` | 不新增 `Employee` 平行用户表 | 表单里操作人/审核人应优先用 `User.id`，名称只做展示或快照 |

结论：

- 本设计的主线是“补齐现有模型缺口”，不是新建一套产品、配方、生产、投料模型。
- 新增字段只允许出现在现有事实源上，例如 `Product.source`、`RecipeLine.areaId`、`BatchMaterialUsage.recipeLineId`。
- 如果一个模块已经能通过 `production_batch_id` 或 `finishedGoodsBatchId` 追到产品，就不能为了方便再直接加 `productId`。
- 如果当前只是页面手填，但 schema 已有外键，应优先修页面和 DTO，不优先改 schema。

## 3. 核心设计原则

### 3.1 产品档案是主数据事实源

产品档案是后续所有业务链路的前置主数据：

```text
Product
→ Recipe
→ ProductionRun / ProductionBatch
→ FinishedGoodsBatch
→ DeliveryNote / CustomerComplaint / Traceability
```

后续模块不能把产品名称作为事实源。产品名称只能作为展示字段或历史快照。

### 3.2 两条建档路径落到同一套表

系统有两条产品建档路径：

```text
新产品研发流程
→ 审批通过
→ 自动生成或更新 Product + Recipe

历史产品建档
→ 一次性录入产品名称 + 配方 + 区域分配
→ 直接生成 active Product + active Recipe
```

两条路径都落到同一套表：

```text
Product
Recipe
RecipeLine
```

不新建“历史产品表”，不新建“研发产品表”。

### 3.3 产品编号系统自动生成

产品编号由系统生成，用户不手填最终编号。

建议规则：

```text
CP-000001
CP-000002
CP-000003
```

后续可扩展为公司级配置规则，但本次不做复杂编号平台。

字段语义：

```text
Product.id：系统内部主键，数据库关联和追溯使用
Product.code：系统生成产品编号，用户可见、可搜索、可打印
Product.name：产品名称，可修改
Product.status：active / inactive / discontinued
Product.source：rd_process / legacy_import / manual_admin
```

实现要求：

```text
Product.code 仍使用现有字段，不新增 productNo / productNumber。
编号生成服务复用 batch number 的生成器思路，但独立成 ProductCodeGeneratorService。
编号规则配置复用 SystemConfig，不另建孤立编号规则表。
NumberRule / PendingNumber 当前绑定文件级别和部门编号，不直接挪作产品编号事实源。
```

产品名称允许修改，但历史业务记录必须保留当时的产品名称快照。

### 3.4 不要规格和净含量

历史产品建档不采集以下字段：

```text
规格
净含量
附件
```

原因：

- 当前业务目标是让既有产品进入生产和追溯主链路。
- 规格、净含量不是本次建档闭环的关键前置条件。
- 纸质研发资料不作为系统建档阻塞项。

## 4. 历史产品建档闭环

### 4.1 页面入口

产品目录页面保留两个入口：

```text
历史产品建档
发起新产品研发
```

`发起新产品研发` 继续进入现有研发流程。

`历史产品建档` 打开独立页面或右侧抽屉，不使用小弹窗。

### 4.2 建档必填内容

历史产品建档只要求：

```text
产品名称
配方明细
每条配方物料的配料区域
```

系统自动生成：

```text
Product.id
Product.code
Product.status = active
Product.source = legacy_import
Recipe.version = 1
Recipe.status = active
Recipe.version_note = 历史产品建档
RecipeLine[]
```

### 4.3 事务规则

保存历史产品建档必须在同一个事务中完成：

```text
创建 Product
创建 Recipe
创建 RecipeLine
```

任何一步失败，全部回滚。

### 4.4 建档后可用范围

保存成功后，该产品直接可用于：

```text
生产开工
生产批次
成品批次
成品入库
过程记录
检验记录
出库发货
投诉召回
追溯查询
```

实际是否直接选择产品，取决于模块链路层级。比如发货可以选择生产批次或成品批次，不需要再选产品。

## 5. 配方与配料区域

### 5.1 区域设计

配料区域采用公司级区域清单 + 配方内分配。

```text
WorkshopArea
```

示例区域：

```text
筛粉间
称油间
小料房
果酱房
鸡蛋房
搅料间
```

区域清单统一维护，避免出现同义区域：

```text
筛粉间
筛粉房
前段筛粉
粉房
```

都被用户写成不同名称。

### 5.2 区域不是物料固定属性

同一种物料在不同配方、不同工艺下，可能分配到不同配料区域。

因此区域不能挂在 `Material` 上作为硬规则。

正确位置是：

```text
RecipeLine.areaId
RecipeLine.areaNameSnapshot
```

即在某一个配方版本里，这条物料由哪个区域配。

`WorkshopArea` 是对现有 `targetZone/location/fromZone/toZone` 字符串的正规化，不是另一套区域语义。迁移完成后：

```text
RecipeLine.areaId -> WorkshopArea.id
RecipeLine.areaNameSnapshot -> 当时区域名称快照
StagingAreaStock.location / StagingAreaTransfer.fromZone/toZone -> 可保留为快照或逐步补 areaId
```

### 5.3 暂定一条物料只属于一个区域

当前阶段暂定：

```text
同一物料在同一配方版本中只能出现一次
每条 RecipeLine 只能选择一个配料区域
```

不做同一物料拆分到多个区域的复杂结构。

这样可以避免立刻引入：

```text
RecipeLineAreaAllocation
```

未来如果真的遇到“同一物料拆到多个区域且用量不同”，再从 `RecipeLine.areaId` 平滑升级为区域分摊表。

### 5.4 区域选择不做强制物料范围限制

系统可以根据物料分类或历史习惯给默认建议，但不能阻止用户把某物料分配到某区域。

原因：

- 实际工艺优先。
- 同一种物料在不同产品、不同工艺下可能进入不同区域。
- 区域允许物料范围只能用于推荐、筛选、排序，不能作为拦截校验。

### 5.5 配方建档页面规则

配方明细每行字段：

```text
物料
用量
单位
是否关键物料
配料区域
备注
```

物料必须从 `Material` 主数据选择，不能手填物料名。

配料区域必须从 `WorkshopArea` 选择，不能手填区域名。

## 6. 生产执行与区域配料单

### 6.1 生产开工

生产开工必须选择：

```text
Product
Recipe
```

后端校验：

```text
Product.status = active
Recipe.status = active
Recipe.product_id = Product.id
```

没有 active 配方的产品不能开工。

### 6.2 生产批次

`ProductionBatch` 应收敛为：

```text
productId：必填
recipeId：必填
productNameSnapshot：必填
recipeVersionSnapshot：必填
```

现有 `productName`、`recipeName` 可以兼容保留，但语义改为快照，不再作为事实源。

前端创建生产批次时：

- 不能手填产品名称。
- 必须从 active 产品中选择。
- 选择产品后加载 active 配方。
- 生产批次保存 `productId`、`recipeId` 和快照。

### 6.3 区域配料单

生产开工或创建生产批次后，系统按配方区域生成配料单：

```text
筛粉间配料单
小料房配料单
称油间配料单
果酱房配料单
鸡蛋房配料单
```

每个区域只显示分配给该区域的 `RecipeLine`。

区域人员填写：

```text
实际使用物料批次
实际用量
操作人
操作时间
异常说明
```

最终汇总到：

```text
BatchMaterialUsage / IngredientUsage
```

建议为投料记录补充：

```text
areaId
areaNameSnapshot
recipeLineId
```

用于追溯每条投料来自哪个配料区域和哪条配方明细。

这里的投料记录仍然是现有 `BatchMaterialUsage`。不新增平行的 `IngredientUsage` 数据表；`IngredientUsage` 只作为业务标准名。

### 6.4 区域完成规则

生产批次进入后续放行或汇总前，应检查：

```text
所有必需区域配料单已完成
所有 RecipeLine 都有对应物料批次使用记录
实际用量偏差在允许范围内，或已有偏差说明
```

本设计先定义规则，不要求一次性实现复杂偏差审批。

## 7. 下游链路收敛规则

### 7.1 不需要每张表都加 productId

不是所有模块都直接存 `productId`。

正确规则：

```text
如果记录直接描述产品或配方，必须存 productId / recipeId。
如果记录描述生产批次、成品批次、发货或投诉，应通过 production_batch_id 或 finished_goods_batch_id 追到产品。
```

避免每张表重复保存产品字段，造成不一致。

### 7.2 各模块目标状态

| 模块 | 目标关联方式 | 当前状态 | 整改方向 |
| --- | --- | --- | --- |
| 产品目录 | `Product.id` | 已有 | 增加历史产品建档，产品编号自动生成 |
| 配方管理 | `Recipe.product_id`、`RecipeLine.material_id` | 已有 | 增加配料区域 |
| 研发流程 | `ProcessInstance.productId` | 已有 | 保持新产品路径，不承接历史老产品补录 |
| 生产开工 `ProductionRun` | `product_id`、`recipe_id` | 已部分实现 | `recipe_id` 业务必选，强校验 active 产品和 active 配方 |
| 旧生产批次 `ProductionBatch` | `productId`、`recipeId` | 字段已有但可选，前端仍手填产品名 | 改为选择产品和配方，产品名变快照 |
| 成品批次 | `productionBatchId` | 已有 | 通过生产批次追产品，不重复选产品 |
| 成品入库/出库 | `finishedGoodsBatchId` 或 `productionBatchId` | 部分通过 `InventoryMovement.object_type/object_id` | 保持批次链路，避免手填产品 |
| 发货 | `production_batch_id` | 已有 | 页面改为选择生产批次或成品批次 |
| 投诉 | `production_batch_id` | 已有 | 页面改为选择生产批次，不能手填批次号 |
| CCP/过程/金检/返工 | `production_batch_id` | 已有 | 页面改为批次选择器 |
| 来料检验 | `material_batch_id` | 已有 | 属于原料链，不直接挂产品 |
| 包材用量 | 应引用 `material_id/material_batch_id` + `production_batch_id` | 当前手填 `material_name/material_code` | 物料事实源改为 Material/MaterialBatch，名称编码保留为快照 |
| 废料统计 | `production_batch_id`，必要时引用 `material_batch_id` | 当前手填批次号、操作人、部分物料信息 | 批次和人员改选择器；不要直接补 `productId` |
| 客户/运输方 | `ExternalParty` 可承接 customer/carrier/waste_collector | 当前 `customer_name/transporter_name` 多为快照 | 先把现有字段定义为快照，后续补 `external_party_id` 类外键 |
| 人员字段 | `User.id` | 多个页面手填 `operator_id/inspector_id/verifier_id` | 改用户选择器；不要新增 Employee 平行表 |
| 位置/区域 | 暂无通用 `Location` 模型；已有部门、设备位置、暂存区位置字符串 | 不把 `WorkshopArea` 当全系统 Location | 配料区域先做 `WorkshopArea`，设备/清洁/环境位置后续再决定是否收敛为通用位置主数据 |

### 7.3 历史快照规则

业务记录需要报表展示时，保存快照字段：

```text
productNameSnapshot
productCodeSnapshot
recipeVersionSnapshot
areaNameSnapshot
materialNameSnapshot
materialCodeSnapshot
```

快照用于历史展示，不作为关联事实源。

事实源必须是：

```text
productId
recipeId
materialId
materialBatchId
productionBatchId
finishedGoodsBatchId
```

## 8. 其他主数据手填扫描

本次设计不只看产品，还要检查其他主数据是否存在手填事实源。

扫描对象：

```text
Product
Recipe
Material
Supplier
Customer
Employee
Location / WorkshopArea
ProductionBatch
MaterialLot / MaterialBatch
FinishedGoodsBatch
```

判断规则：

```text
如果字段只是历史快照，可以保留。
如果字段决定业务关联，必须改为 ID。
如果当前已有主数据表，必须选择主数据。
如果当前没有主数据表，不能在新功能里继续扩大手填范围，应记录为待建主数据。
```

已发现的重点问题：

- `BatchList.vue` 创建生产批次手填产品名称和产品代码。
- 多个过程记录页面手填生产批次 ID 或批次号。
- 投诉页面手填生产批次号。
- `PackagingMaterialUsage`、`Waste` 等模块存在物料名称手填，必须按本章规则判定为快照、事实源或待整改项。
- 区域名称当前有写死字符串，需要收敛到 `WorkshopArea`。

## 9. 非目标

本设计不做：

- 不要求历史产品重跑研发流程。
- 不把产品名称当产品 ID。
- 不把区域挂死到物料主数据。
- 不做同一配方物料拆多个区域的复杂分摊。
- 不要求在同一个提交里重构所有低风险页面；但必须完成主数据手填扫描，并把关键生产、批次、投料、发货、投诉链路纳入整改计划。
- 不把所有记录表单都改成动态表单。
- 不做复杂产品版本管理。
- 不要求上传纸质研发附件。

## 10. 验证重点

必须验证：

- 历史产品建档一次性创建 active 产品和 active 配方。
- 产品编号由系统自动生成，用户不能手填最终编号。
- 产品名称可修改。
- 修改产品名称后，历史生产批次和报表仍显示当时快照。
- 没有 active 配方的产品不能开工或创建生产批次。
- 生产批次不能手填产品名称作为事实源。
- 生产批次必须保存 `productId` 和 `recipeId`。
- 配方明细物料必须从 `Material` 主数据选择。
- 每条配方明细必须选择一个配料区域。
- 区域来自公司级区域清单，不能手填。
- 区域选择不受物料分类强制限制。
- 区域配料单只显示该区域的物料。
- 配料完成后能汇总为生产批次投料记录。
- 发货、投诉、过程记录等通过批次链路追到产品。
- 主数据手填扫描能输出整改清单。

## 11. 决策总结

最终设计决策：

- 采用“产品主数据收敛”方案，而不是只做历史产品建档。
- 历史产品建档是产品档案的补录入口，不是研发流程的替代流程。
- 新产品研发和历史产品建档最终都写入同一套 `Product + Recipe + RecipeLine`。
- 产品编号系统自动生成。
- 产品名称允许修改。
- 业务链路用 `productId` 追溯，展示用名称快照。
- 配方建立后，每条物料必须分配到一个配料区域。
- 配料区域采用公司级清单，配方按实际工艺选择。
- 同一物料暂定在同一配方版本中只属于一个区域。
- 区域物料范围只做建议，不做拦截。
- 下游模块要逐步从手填名称/批次号收敛为选择主数据或批次对象。

## 12. 实施状态

- 产品编号：已接入 `ProductCodeGeneratorService` 和 `SystemConfig.product.code.format`。
- 历史产品建档：已通过 `POST /products/legacy` 写入 `Product + Recipe + RecipeLine`。
- 配料区域：已通过 `WorkshopArea` 统一维护，配方行保存 `area_id + area_name_snapshot`。
- 生产开工：已强制 active 产品和 active 配方。
- 生产批次：已改为选择产品和配方，名称字段作为快照。
- 投料记录：已通过 `BatchMaterialUsage.recipeLineId` 关联配方明细和区域快照。
- 手填收敛：生产批次、投诉、过程记录、金检、返工、包材用量、废料统计已完成第一轮选择器替换。
