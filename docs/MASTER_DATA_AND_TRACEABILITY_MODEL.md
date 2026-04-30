---
title: 主数据与追溯模型总说明
---

# 主数据与追溯模型总说明

## 1. 文档定位

本文件是 `noidear` 食品安全 SaaS 的统一业务数据口径。目标不是重复字段映射表，而是把“283 张源表单、SaaS 产品构思、当前 noidear 代码实现”收敛为一份可以直接指导继续开发的总说明。

使用对象：

- 继续开发 `noidear` 的 agent / 开发者
- 需要理解现有表单如何串联成完整追溯链的业务人员
- 后续要做接口、建表、查询、报表、追溯、召回、审批的人

如果业务文件、产品构思、代码实现三者冲突，统一按以下优先级处理：

1. `/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单`：真实业务事实源
2. `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思`：实体边界、字段映射、追溯语义参考层
3. `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/prisma/schema.prisma`：当前代码实现层

本次收敛覆盖：

- 源四级表单：**283 张**
- 其中通过字段映射直接或归一化匹配覆盖：**268 张**
- 人工补齐分类：**15 张**
- 最终关系覆盖：**283/283 张，无未归类表单**

## 2. 核心结论

整个系统应坚持四条硬规则：

1. **主数据和业务记录分离**：产品、物料、供应商、客户、员工、位置是主数据；批次、检验、投料、库存移动、发货、投诉、召回是业务记录。
2. **名称只展示，ID 才关联**：下游表单允许显示“产品名称/物料名称/供应商名称”，但数据库关联必须落在 `product_id / material_id / material_lot_id / production_batch_id` 等主键上。
3. **追溯依赖桥接表，不依赖备注**：正追/反追的核心不是表单备注，而是 `ProductionBatch <-> IngredientUsage <-> MaterialLot`。
4. **所有跨模块查询最终都要回到批次级别**：凡是会影响追溯、召回、放行、物料平衡的记录，必须能够回到原料批次或生产批次。

## 3. 分层模型

| 层级 | 定义 | 典型对象 | 设计要求 |
| --- | --- | --- | --- |
| 主数据层 | 定义“是什么” | Product, Material, Supplier, Location, Employee | 稳定、可版本化、下游引用，不允许重复录入同义对象 |
| 台账层 | 定义“发生了什么” | MaterialLot, ProductionBatch, IncomingInspection, InventoryMovement, DeliveryNote | 按事件持续产生，可查询，可追溯 |
| 桥接层 | 定义“谁和谁发生了关系” | IngredientUsage, RecipeLine, DeliveryNote, BatchMaterialUsage | 是整个追溯系统的骨架 |
| 评估/治理层 | 定义“有没有问题、是否持续改进” | SupplierEvaluation, CorrectiveAction, TraceabilityDrill, ManagementReview, ProductRecall | 支撑审核、管理评审、持续改进 |

## 4. 统一实体口径

### 4.1 业务标准名 vs `noidear` 当前实现名

| 业务标准名 | `noidear` 当前模型 | 状态 | 说明 |
| --- | --- | --- | --- |
| Product / 产品 | Product | 已实现 | 产品主数据；下游由配方、生产批次、检验、销售共同引用 |
| Recipe / 产品配方 | Recipe + RecipeLine | 已实现 | 版本化配方；理论用量来源 |
| ProcessStep / 工序步骤 | ProcessStep | 已实现 | 挂在 Recipe 下；CCP、过程参数都依附工序 |
| Material / 物料 | Material | 已实现 | 原料/辅料/包材统一主数据 |
| MaterialLot / 物料批次 | MaterialBatch | 已实现，命名不同 | 业务口径用 MaterialLot；代码里当前名为 MaterialBatch |
| Supplier / 供应商 | Supplier | 已实现 | 与物料、来料批次、资质、评估关联 |
| IncomingInspection / 来料检验 | IncomingInspection | 已实现 | 承接 MaterialLot 入厂放行 |
| InventoryMovement / 库存移动 | InventoryMovement + StockRecord | 部分实现，双轨并存 | 业务口径统一用 InventoryMovement；当前代码既有 InventoryMovement 也有 StockRecord |
| StockCount / 库存盘点 | StockCount | 已实现 | 物料平衡和账实差异来源 |
| ProductionBatch / 生产批次 | ProductionBatch | 已实现 | 追溯链核心节点 |
| IngredientUsage / 投料记录 | BatchMaterialUsage | 已实现，命名不同 | 业务口径用 IngredientUsage；代码里当前名为 BatchMaterialUsage |
| CCPRecord / CCP 监控 | CCPRecord | 已实现 | 关键控制点记录，挂生产批次 |
| EnvironmentRecord / 环境记录 | EnvironmentRecord | 已实现 | 温湿度/压差等前提方案监控 |
| ProcessRecord / 过程记录 | ProcessMonitorRecord | 部分实现，命名收敛中 | 建议未来统一命名为 ProcessRecord |
| MetalDetectionLog / 金检记录 | MetalDetectionLog | 已实现 | 属于过程/CCP 特化记录 |
| ReworkRecord / 返工记录 | ReworkRecord | 已实现 | 关联生产批次和不合格 |
| NonConformance / 不合格 | NonConformance or related record models | 业务口径已定义，代码口径分散 | 建议后续收敛为统一不合格主表 |
| DeliveryNote / 发货记录 | DeliveryNote | 已实现 | 连接生产批次与客户/运输 |
| Sample / 留样 | Sample | 已实现 | 生产批次留样生命周期 |
| CorrectiveAction / CAPA | CorrectiveAction | 已实现 | 不合格、投诉、审核发现项的整改闭环 |
| SupplierDocument / 供应商资质 | SupplierDocument | 已实现 | 资质到期和合规管理 |
| SupplierEvaluation / 供应商评估 | SupplierEvaluation | 已实现 | 采购绩效/准入评价 |
| TraceabilityDrill / 追溯演练 | 未独立建模，当前更适合 RecordTemplate/Record | 待收敛 | 业务上是高优先级对象，建议独立查询口径 |
| ProductRecall / 召回 | 未独立建模，当前更适合 RecordTemplate/Record | 待收敛 | 业务上需独立状态机和客户通知链 |
| ManagementReview / 管理评审 | 未独立建模，当前更适合 RecordTemplate/Record | 待收敛 | 是管理层输入汇总，不宜只当普通文档 |

### 4.2 最高共享实体

这些实体跨部门复用最频繁，任何后续功能设计都应优先复用，而不是重新建平行表：

| 实体 | 关联表单数 | 涉及部门代码 | 说明 |
| --- | --- | --- | --- |
| Employee | 218 | CC, CG, GC, KF, PZ, XZ, YX, ZJ, ZZ | 高复用基础实体 |
| Document | 97 | CC, CG, KF, PZ, XZ, YX | 高复用基础实体 |
| Location | 97 | CC, CG, GC, KF, PZ, XZ, YX, ZJ, ZZ | 高复用基础实体 |
| ProductionBatch | 97 | CC, KF, PZ, YX, ZJ, ZZ | 高复用基础实体 |
| Product | 60 | CC, KF, PZ, YX, ZJ, ZZ | 高复用基础实体 |
| Inspection | 42 | CG, KF, PZ, XZ, YX, ZJ | 高复用基础实体 |
| Material | 42 | CC, CG, KF, PZ, XZ, ZZ | 高复用基础实体 |
| MeasuringEquipment | 35 | PZ, ZJ, ZZ | 高复用基础实体 |
| NonConformance | 30 | CC, GC, KF, PZ, XZ, YX, ZJ, ZZ | 高复用基础实体 |
| Supplier | 30 | CC, CG, GC, KF, PZ, XZ, YX | 高复用基础实体 |
| CalibrationRecord | 29 | PZ, ZJ, ZZ | 高复用基础实体 |
| MaterialLot | 27 | CC, CG, KF, PZ, XZ, ZZ | 高复用基础实体 |
| CorrectiveAction | 25 | CC, GC, PZ, XZ, YX, ZZ | 高复用基础实体 |
| IngredientUsage | 22 | ZZ | 高复用基础实体 |
| MaintenanceRecord | 22 | CC, GC, PZ, XZ, ZZ | 高复用基础实体 |

## 5. 跨模块关系总图

### 5.1 主追溯链

```text
Supplier
  -> Material
  -> MaterialLot
  -> IncomingInspection
  -> InventoryMovement / StockCount
  -> IngredientUsage (BatchMaterialUsage)
  -> ProductionBatch
  -> BatchMixingAggregation -> MixingExecution
  -> DeliveryNote
  -> Customer / 市场 / 投诉 / 召回
```

### 5.2 关键关系解释

- **产品主数据链**：Product -> Recipe -> RecipeLine -> ProcessStep -> CCPPoint/Inspection 标准；研发新增产品后，生产、检验、销售均通过 Product 或 Recipe 复用，不允许下游手工重新维护产品名称。
- **物料主数据链**：Material -> MaterialLot -> IncomingInspection -> InventoryMovement/StockCount；仓库新增物料后，研发配方、采购、来料检验、领料、投料全部引用同一 Material。
- **采购到来料链**：Supplier -> MaterialInbound -> MaterialInboundItem -> MaterialLot -> IncomingInspection；这是原料进入系统的起点，供应商、供应商批号、到货日期、有效期必须在这一段固化。
- **仓储与移动链**：MaterialLot -> InventoryMovement / StockRecord -> Requisition / Return / Scrap / StockCount；任何进入车间、退库、报废、盘点都必须回到批次级别。
- **生产投料链**：ProductionBatch -> IngredientUsage(BatchMaterialUsage) -> MaterialLot；正追和反追都依赖这张桥接表，这是整个项目最关键的关系表。
- **过程与放行链**：ProductionBatch -> CCPRecord / EnvironmentRecord / ProcessMonitorRecord / MetalDetectionLog / ReworkRecord / Sample；这些记录共同决定批次是否可放行。
- **成品与发货链**：ProductionBatch -> DeliveryNote -> Customer/运输商；FinishedGoodsBatch 已作为独立模型移除（TASK-9），ProductionBatch 现为终端批次节点，历史数据保留在 `finished_goods_batches` 表。
- **投诉召回链**：CustomerComplaint / ProductRecall -> ProductionBatch -> IngredientUsage -> MaterialLot -> Supplier；这段链路支持反向调查问题来源。
- **变更控制链**：ChangeEvent -> Recipe / ProcessStep / CCPPoint / Inspection 标准 -> ChangeVerificationRecord；任何配方、工艺、设备、原料变更都不应直接覆盖历史，而要产生新版本或新验证记录。
- **管理评审链**：ManagementReview 汇总 ProductRecall、TraceabilityDrill、SupplierEvaluation、CorrectiveAction、FoodSafetyObjective、各部门年度总结；管理评审不是孤立文档，而是跨模块输入汇编。

## 6. 业务场景如何落到关系上

### 6.1 研发新增新品后，为什么投料表能选到产品

不是因为投料表自己维护了一份产品名，而是因为：

1. `Product` 先创建新品主数据
2. `Recipe/RecipeLine` 维护理论配方
3. 生产建 `ProductionBatch` 时引用 `product_id + recipe_id`
4. 投料记录 `IngredientUsage` 只记录“这个生产批次用了哪些物料批次”

### 6.2 仓库新增物料后，为什么研发/生产都能选到

1. 仓库先维护 `Material`
2. 来货后形成 `MaterialLot`
3. 研发配方引用 `Material`
4. 生产投料引用 `MaterialLot`

所以：**研发配方选物料主数据，生产投料选物料批次数据。**

### 6.3 正追、反追、物料平衡如何查询

- **正向追溯**：`ProductionBatch -> IngredientUsage -> MaterialLot -> Supplier`
- **反向追溯**：`MaterialLot -> IngredientUsage -> ProductionBatch -> DeliveryNote -> Customer`
- **物料平衡**：`MaterialLot/StockCount/InventoryMovement/IngredientUsage/ProductionBatch.output_qty/loss_qty/sample_qty/waste_qty` 联合核算

## 7. 开发规则

### 7.1 下游模块禁止自行维护的字段

以下字段可以展示，但不应在下游模块各自维护为新的事实源：

- 产品名称、产品规格
- 物料名称、物料规格、物料类别
- 供应商名称
- 生产批号、物料批号
- 部门名称、位置名称

这些都必须从主数据或批次主表带出。

### 7.2 新功能开发时的主键使用规则

| 功能场景 | 必须引用的主键 | 不能只存什么 |
| --- | --- | --- |
| 产品研发/规格/标签 | `product_id` | 不能只存产品名称 |
| 配方明细 | `recipe_id`, `material_id` | 不能只存物料名称 |
| 来料/检验/放行 | `material_lot_id` | 不能只存供应商批号 |
| 投料/生产 | `production_batch_id`, `material_lot_id` | 不能只存“本批用了白砂糖” |
| 发货/投诉/召回 | `production_batch_id` | 不能只存客户口述批号文本；finished_goods_batch_id 已从 Prisma 模型中移除（TASK-9） |
| CAPA/不合格/返工 | `source_type + source_id` | 不能只存备注描述 |

### 7.3 命名收敛建议

为了减少 agent 理解成本，后续开发建议优先收敛这些命名差异：

- `MaterialBatch` 统一对应业务名 `MaterialLot`
- `BatchMaterialUsage` 统一对应业务名 `IngredientUsage`
- `ProcessMonitorRecord` 统一归入 `ProcessRecord` 语义域
- `InventoryMovement` 与 `StockRecord` 需要明确谁是统一库存流水事实表，避免双事实源
- `TraceabilityDrill`、`ProductRecall`、`ManagementReview` 后续建议从普通动态表单中抽出为独立业务对象

## 8. 跨部门共享实体矩阵

| 实体 | 涉及部门代码 | 共享度 | 说明 |
| --- | --- | --- | --- |
| Employee | CC, CG, GC, KF, PZ, XZ, YX, ZJ, ZZ | 9 | 跨模块共享实体 |
| Location | CC, CG, GC, KF, PZ, XZ, YX, ZJ, ZZ | 9 | 跨模块共享实体 |
| NonConformance | CC, GC, KF, PZ, XZ, YX, ZJ, ZZ | 8 | 跨模块共享实体 |
| Supplier | CC, CG, GC, KF, PZ, XZ, YX | 7 | 跨模块共享实体 |
| ChangeEvent | CG, GC, KF, PZ, XZ, ZZ | 6 | 跨模块共享实体 |
| CorrectiveAction | CC, GC, PZ, XZ, YX, ZZ | 6 | 跨模块共享实体 |
| Document | CC, CG, KF, PZ, XZ, YX | 6 | 跨模块共享实体 |
| Inspection | CG, KF, PZ, XZ, YX, ZJ | 6 | 跨模块共享实体 |
| Material | CC, CG, KF, PZ, XZ, ZZ | 6 | 跨模块共享实体 |
| MaterialLot | CC, CG, KF, PZ, XZ, ZZ | 6 | 跨模块共享实体 |
| Product | CC, KF, PZ, YX, ZJ, ZZ | 6 | 跨模块共享实体 |
| ProductionBatch | CC, KF, PZ, YX, ZJ, ZZ | 6 | 跨模块共享实体 |
| CleaningRecord | CC, PZ, XZ, ZJ, ZZ | 5 | 跨模块共享实体 |
| InventoryMovement | CC, PZ, XZ, YX, ZZ | 5 | 跨模块共享实体 |
| MaintenanceRecord | CC, GC, PZ, XZ, ZZ | 5 | 跨模块共享实体 |
| EnvironmentRecord | CC, KF, PZ, ZJ | 4 | 跨模块共享实体 |
| HazardAssessment | KF, PZ, XZ, ZZ | 4 | 跨模块共享实体 |
| MaterialInspection | CC, CG, PZ, XZ | 4 | 跨模块共享实体 |
| ProcessRecord | GC, KF, PZ, ZJ | 4 | 跨模块共享实体 |
| ProcessStep | CC, KF, PZ, ZZ | 4 | 跨模块共享实体 |

部门代码：`KF` 产品开发部，`CG` 采购部，`CC` 仓储组，`ZZ` 制造部，`PZ` 品质部，`ZJ` 质检组，`YX` 营销部，`GC` 工程部，`XZ` 行政人事部。

## 9. 源表单覆盖统计

| 部门 | 表单数 |
| --- | ---: |
| 产品开发部 | 11 |
| 采购部 | 12 |
| 仓储组 | 13 |
| 制造部 | 74 |
| 品质部 | 75 |
| 质检组 | 21 |
| 营销部 | 10 |
| 工程部 | 16 |
| 行政人事部 | 51 |
| 合计 | 283 |

## 10. 283 张源表单的关系附录

说明：

- “主要实体”表示这张表单承载的核心业务对象，不等于其全部字段。
- “链路定位”表示它主要处于哪一段业务链中，用于快速理解其上下游。
- “归类方式”分为：`direct-mapping`、`code-mapping`、`name-normalized-mapping`、`manual-classification`。

### 10.1 产品开发部

| 编号 | 表单 | 主要实体 | 链路定位 | 归类方式 |
| --- | --- | --- | --- | --- |
| GRSS-KF-JL-01 | 产品开发评审记录 | ChangeEvent, ChangeVerificationRecord, Document, Employee, HazardAssessment, Inspection, Material, NonConformance, ProcessRecord, ProcessStep, Product | 研发/变更 | direct-mapping |
| GRSS-KF-JL-02 | 产品操作规程 | CCPPoint, Document, Employee, Inspection, ProcessStep, Product, Recipe | 研发/变更 | direct-mapping |
| GRSS-KF-JL-03 | 产品更改申请表 | ChangeApproval, ChangeEvent, Document, Employee, Product | 研发/变更 | direct-mapping |
| GRSS-KF-JL-04 | 产品标签信息记录 | Document, Employee, HazardAssessment, Product, Recipe | 研发/变更 | direct-mapping |
| GRSS-KF-JL-05 | 产品规格书 | Document, Employee, Inspection, Product, Recipe | 研发/变更 | direct-mapping |
| GRSS-KF-JL-06 | 产品配方以及工艺参数 | Document, Employee, Material, ProcessStep, Product, Recipe | 研发/变更 | direct-mapping |
| GRSS-KF-JL-07 | 产品验证记录表 | ChangeVerificationRecord, Document, Employee, HazardAssessment, Inspection, Material, ProcessStep, Product, Supplier | 研发/变更 | direct-mapping |
| GRSS-KF-JL-08 | 工艺流程图确认记录 | ChangeVerificationRecord, Document, Employee, Location, Product, ProductionBatch | 研发/变更 | direct-mapping |
| GRSS-KF-JL-09 | 新产品开发申请书 | Document, Employee, HazardAssessment, ProcessStep, Product | 主数据/基础档案 | direct-mapping |
| GRSS-KF-JL-10 | 新产品开发计划书 | CCPPoint, Document, HazardAssessment, Inspection, ProcessStep, Product, Recipe | 研发/变更 | direct-mapping |
| GRSS-KF-JL-11 | 研发实验记录 | Document, Employee, EnvironmentRecord, Inspection, MaterialLot, ProcessRecord, ProcessStep, Recipe | 研发/变更 | direct-mapping |

### 10.2 采购部

| 编号 | 表单 | 主要实体 | 链路定位 | 归类方式 |
| --- | --- | --- | --- | --- |
| GRSS-CG-JL-01 | 供应商台账 | Supplier | 采购/来料 | direct-mapping |
| GRSS-CG-JL-02 | 供应商现场审核报告 | AuditRecord, Document, Employee, Supplier | 采购/来料 | direct-mapping |
| GRSS-CG-JL-03 | 供应商绩效评估表 | Document, Employee, Inspection, Material, Supplier | 品质/检验 | direct-mapping |
| GRSS-CG-JL-04 | 供应商评价表 | Document, Employee, Inspection, Material, Supplier | 品质/检验 | direct-mapping |
| GRSS-CG-JL-05 | 供应商调查问卷表 | Document, Employee, Material, Supplier | 采购/来料 | direct-mapping |
| GRSS-CG-JL-06 | 原辅料验收台账 | Document, Employee, Material, MaterialInspection, MaterialLot, Supplier | 品质/检验 | direct-mapping |
| GRSS-CG-JL-07 | 合格供应方资料台账 | Document, Material, Supplier | 采购/来料 | direct-mapping |
| GRSS-CG-JL-08 | 新准入供应商评价表 | Document, Employee, Inspection, Material, Supplier | 品质/检验 | direct-mapping |
| GRSS-CG-JL-09 | 物资采购计划单 | Document, Employee, Material, MaterialLot, Supplier | 采购/来料 | direct-mapping |
| GRSS-CG-JL-10 | 紧急采购申请单 | Document, Employee, Material, MaterialInspection, MaterialLot, Supplier | 品质/检验 | direct-mapping |
| GRSS-CG-JL-11 | 采购合同 | Document, Material, MaterialLot, Supplier | 采购/来料 | direct-mapping |
| GRSS-CG-JL-12 | 采购物资分类明细表 | ChangeEvent, Document, Employee, Location, Material | 研发/变更 | direct-mapping |

### 10.3 仓储组

| 编号 | 表单 | 主要实体 | 链路定位 | 归类方式 |
| --- | --- | --- | --- | --- |
| GRSS-CC-JL-01 | 上车单 | Document, Employee, InventoryMovement, Product, ProductionBatch | 仓储/库存 | direct-mapping |
| GRSS-CC-JL-02 | 仓库单体空调内置过滤网清洗记录 | Document, Employee, MaintenanceRecord | 通用支撑 | direct-mapping |
| GRSS-CC-JL-03 | 仓库日常巡查表 | CorrectiveAction, Document, Employee, EnvironmentRecord | 通用支撑 | direct-mapping |
| GRSS-CC-JL-04 | 仓库领料单 | Document, Employee, InventoryMovement, Material, MaterialLot | 仓储/库存 | direct-mapping |
| GRSS-CC-JL-05 | 化学品仓登记领用表 | Document, Employee, InventoryMovement, Material, StockCount | 仓储/库存 | direct-mapping |
| GRSS-CC-JL-06 | 原料标识卡 | Document, Employee, InventoryMovement, Location, Material, MaterialInspection, MaterialLot, Supplier | 仓储/库存 | direct-mapping |
| GRSS-CC-JL-07 | 原材料验收单 | Document, Employee, Material, MaterialInspection, MaterialLot, Supplier | 品质/检验 | direct-mapping |
| GRSS-CC-JL-08 | 废品出入库记录 | CorrectiveAction, Employee, InventoryMovement, WasteRecord | 仓储/库存 | manual-classification |
| GRSS-CC-JL-09 | 成品入库单 | Document, Employee, InventoryMovement, Location, ProcessStep, Product, ProductionBatch | 仓储/库存 | direct-mapping |
| GRSS-CC-JL-10 | 成品入库卡 | Document, Employee, InventoryMovement, Location, ProcessStep, Product, ProductionBatch, StockCount | 仓储/库存 | direct-mapping |
| GRSS-CC-JL-11 | 报废申请单 | CorrectiveAction, Document, Employee, NonConformance, Product, ProductionBatch | 品质/检验 | direct-mapping |
| GRSS-CC-JL-12 | 车间易耗品库登记领用表 | Document, Employee, InventoryMovement, Material, StockCount | 仓储/库存 | direct-mapping |
| GRSS-CC-JL-13 | 运输车辆清洁消毒记录表 | CleaningRecord, Document, Employee | 通用支撑 | direct-mapping |

### 10.4 制造部

| 编号 | 表单 | 主要实体 | 链路定位 | 归类方式 |
| --- | --- | --- | --- | --- |
| GRSS-ZZ-JL-01 | 不合格品评审处置记录 | Employee, Location, NonConformance, Product, ProductionBatch | 品质/检验 | name-normalized-mapping |
| GRSS-ZZ-JL-02 | 工器具设施设备清洗消毒记录表 | CleaningRecord, Employee, Equipment, Location, ProductionBatch | 生产执行 | direct-mapping |
| GRSS-ZZ-JL-03 | 工艺、配料变更、复称、评估、验证记录 | ChangeEvent, Employee, Material, Product, ProductionBatch | 研发/变更 | code-mapping |
| GRSS-ZZ-JL-04 | 带标签废弃物处理记录表 | CorrectiveAction, Employee | 通用支撑 | name-normalized-mapping |
| GRSS-ZZ-JL-05 | 废蛋糕出入库记录表 | Employee, InventoryMovement | 仓储/库存 | name-normalized-mapping |
| GRSS-ZZ-JL-06 | 投料打料记录-坚果牛奶咸蛋糕 | CalibrationRecord, Employee, IngredientUsage, MeasuringEquipment, ProductionBatch | 生产执行 | direct-mapping |
| GRSS-ZZ-JL-07 | 投料打料记录-提拉米苏小蛋糕 | CalibrationRecord, Employee, IngredientUsage, MeasuringEquipment, ProductionBatch | 生产执行 | direct-mapping |
| GRSS-ZZ-JL-08 | 投料打料记录-椰丝 | CalibrationRecord, Employee, IngredientUsage, MeasuringEquipment, ProductionBatch | 生产执行 | direct-mapping |
| GRSS-ZZ-JL-09 | 投料打料记录-椰奶 | CalibrationRecord, Employee, IngredientUsage, MeasuringEquipment, ProductionBatch | 生产执行 | direct-mapping |
| GRSS-ZZ-JL-10 | 投料打料记录-老华侨蛋糕 | CalibrationRecord, Employee, IngredientUsage, MeasuringEquipment, ProductionBatch | 生产执行 | direct-mapping |
| GRSS-ZZ-JL-11 | 投料打料记录-肉松 | CalibrationRecord, Employee, IngredientUsage, MeasuringEquipment, ProductionBatch | 生产执行 | direct-mapping |
| GRSS-ZZ-JL-12 | 投料打料记录-肉松鸡蛋糕 | CalibrationRecord, Employee, IngredientUsage, MeasuringEquipment, ProductionBatch | 生产执行 | direct-mapping |
| GRSS-ZZ-JL-13 | 投料打料记录-芝士咸蛋糕 | CalibrationRecord, Employee, IngredientUsage, MeasuringEquipment, ProductionBatch | 生产执行 | direct-mapping |
| GRSS-ZZ-JL-14 | 投料打料记录-钙奶棒 | CalibrationRecord, Employee, IngredientUsage, MeasuringEquipment, ProductionBatch | 生产执行 | direct-mapping |
| GRSS-ZZ-JL-15 | 投料打料记录-香蕉蒸蛋糕（原味） | CalibrationRecord, Employee, IngredientUsage, MeasuringEquipment, ProductionBatch | 生产执行 | direct-mapping |
| GRSS-ZZ-JL-16 | 投料打料记录-香蕉蒸蛋糕（香蕉味） | CalibrationRecord, Employee, IngredientUsage, MeasuringEquipment, ProductionBatch | 生产执行 | direct-mapping |
| GRSS-ZZ-JL-17 | 投料打料记录-鸡蛋糕 | CalibrationRecord, Employee, IngredientUsage, MeasuringEquipment, ProductionBatch | 生产执行 | direct-mapping |
| GRSS-ZZ-JL-18 | 报表领用记录登记表 | Employee | 通用支撑 | direct-mapping |
| GRSS-ZZ-JL-19 | 日常清洁记录表（中段） | Employee, Location, ProductionBatch, 元数据 | 通用支撑 | direct-mapping |
| GRSS-ZZ-JL-20 | 日常清洁记录表（出炉间） | Employee, Location, ProductionBatch, 元数据 | 通用支撑 | direct-mapping |
| GRSS-ZZ-JL-21 | 日常清洁记录表（化学储藏间） | CleaningRecord, Employee, Location, ProductionBatch | 生产执行 | direct-mapping |
| GRSS-ZZ-JL-22 | 日常清洁记录表（小料房） | Employee, Location, ProductionBatch, 元数据 | 通用支撑 | direct-mapping |
| GRSS-ZZ-JL-23 | 日常清洁记录表（投料搅料间） | CleaningRecord, Employee, Location, ProductionBatch, 元数据 | 生产执行 | direct-mapping |
| GRSS-ZZ-JL-24 | 日常清洁记录表（晾桶间） | Employee, Location, ProductionBatch, 元数据 | 通用支撑 | direct-mapping |
| GRSS-ZZ-JL-25 | 日常清洁记录表（果酱房） | Employee, Location, ProductionBatch, 元数据 | 通用支撑 | direct-mapping |
| GRSS-ZZ-JL-26 | 日常清洁记录表（烤蛋糕后段） | CleaningRecord, Employee, Location, ProductionBatch, 元数据 | 生产执行 | direct-mapping |
| GRSS-ZZ-JL-27 | 日常清洁记录表（物料暂存间） | CleaningRecord, Employee, Location, ProductionBatch, 元数据 | 生产执行 | direct-mapping |
| GRSS-ZZ-JL-28 | 日常清洁记录表（称油间） | Employee, Location, ProductionBatch, 元数据 | 通用支撑 | direct-mapping |
| GRSS-ZZ-JL-29 | 日常清洁记录表（筛粉间） | Employee, Location, ProductionBatch, 元数据 | 通用支撑 | direct-mapping |
| GRSS-ZZ-JL-30 | 日常清洁记录表（蒸蛋糕后段） | CleaningRecord, Employee, Location, ProductionBatch, 元数据 | 生产执行 | direct-mapping |
| GRSS-ZZ-JL-31 | 日常清洁记录表（进炉间） | Employee, Location, ProductionBatch, 元数据 | 通用支撑 | direct-mapping |
| GRSS-ZZ-JL-32 | 日常清洁记录表（通用） | Employee, Location, ProductionBatch, 元数据 | 通用支撑 | direct-mapping |
| GRSS-ZZ-JL-33 | 日常清洁记录表（酒精房） | Employee, ProductionBatch, 元数据 | 通用支撑 | direct-mapping |
| GRSS-ZZ-JL-34 | 日常清洁记录表（鸡蛋房） | Employee, Location, ProductionBatch, 元数据 | 通用支撑 | direct-mapping |
| GRSS-ZZ-JL-35 | 果酱房半成品入库记录表 | Employee, InventoryMovement, Location, MeasuringEquipment, Product, ProductionBatch | 仓储/库存 | direct-mapping |
| GRSS-ZZ-JL-36 | 果酱房果酱投料打料过程记录表（原味） | CalibrationRecord, Employee, IngredientUsage, MeasuringEquipment, ProductionBatch | 生产执行 | direct-mapping |
| GRSS-ZZ-JL-37 | 果酱房果酱投料打料过程记录表（香蕉味） | CalibrationRecord, Employee, IngredientUsage, MeasuringEquipment, ProductionBatch | 生产执行 | name-normalized-mapping |
| GRSS-ZZ-JL-38 | 每日库存盘点记录表 | InventoryMovement, Location, Material, MaterialLot, ProductionBatch, StockCount | 仓储/库存 | name-normalized-mapping |
| GRSS-ZZ-JL-39 | 每日鸡蛋车间表 | Employee, IngredientUsage, InventoryMovement, Location, Material, MaterialLot, ProductionBatch, StockCount | 生产执行 | direct-mapping |
| GRSS-ZZ-JL-40 | 烤炉过程记录表 | CCPRecord, ProcessStep, Product, ProductionBatch | 生产执行 | direct-mapping |
| GRSS-ZZ-JL-41 | 烤蛋糕车间紫外线灯状态日常检查表 | Employee, Equipment, Location, MaintenanceRecord, ProductionBatch | 通用支撑 | direct-mapping |
| GRSS-ZZ-JL-42 | 特殊材料使用风险评估及审批记录 | Employee, HazardAssessment, IngredientUsage, Location, MaintenanceRecord, Material, MaterialLot, NonConformance, ProductionBatch | 生产执行 | direct-mapping |
| GRSS-ZZ-JL-43 | 玻璃及硬塑制品检查表 | Employee, Location, NonConformance, ProductionBatch | 品质/检验 | direct-mapping |
| GRSS-ZZ-JL-44 | 班后检查表 | Employee, Equipment, ProductionBatch | 通用支撑 | name-normalized-mapping |
| GRSS-ZZ-JL-45 | 生产斗数记录表 | Product, ProductionBatch | 主数据/基础档案 | name-normalized-mapping |
| GRSS-ZZ-JL-46 | 生产清场记录表 | CorrectiveAction, Employee | 通用支撑 | code-mapping |
| GRSS-ZZ-JL-47 | 生产线换产启动前检查确认记录 | ChangeEvent, CleaningRecord, Employee, Equipment, NonConformance, Product, ProductionBatch | 研发/变更 | direct-mapping |
| GRSS-ZZ-JL-48 | 生产计划 | Product, ProductionBatch | 主数据/基础档案 | name-normalized-mapping |
| GRSS-ZZ-JL-49 | 筛粉间排风口过滤布及电机更换记录表 | ChangeEvent, Employee, Equipment, MaintenanceRecord | 研发/变更 | name-normalized-mapping |
| GRSS-ZZ-JL-50 | 筛网、过滤器清洁记录 | Employee, Location, ProductionBatch | 通用支撑 | name-normalized-mapping |
| GRSS-ZZ-JL-51 | 纠正与整改记录 | CorrectiveAction, Employee, Product, ProductionBatch | 主数据/基础档案 | direct-mapping |
| GRSS-ZZ-JL-52 | 脚底清洁池消毒记录表 | Employee, Location, 元数据 | 通用支撑 | code-mapping |
| GRSS-ZZ-JL-53 | 臭氧机启动关停与浓度记录表 | CalibrationRecord, Employee, Location, MaintenanceRecord | 通用支撑 | direct-mapping |
| GRSS-ZZ-JL-54 | 蒸炉过程记录表 | Product, ProductionBatch | 主数据/基础档案 | direct-mapping |
| GRSS-ZZ-JL-55 | 蒸蛋糕-面浆打发成型记录表 | CCPRecord, CalibrationRecord, Employee, IngredientUsage, Material, MaterialLot, MeasuringEquipment, Product, ProductionBatch | 生产执行 | direct-mapping |
| GRSS-ZZ-JL-56 | 蒸蛋糕车间紫外线灯状态日常检查表 | Employee, Equipment, Location, MaintenanceRecord, ProductionBatch | 通用支撑 | direct-mapping |
| GRSS-ZZ-JL-57 | 蛋糕包装机用膜跟进记录表 | CalibrationRecord, Employee, Equipment, Location, MeasuringEquipment, NonConformance, PackagingMaterialUsage, Product, ProductionBatch | 品质/检验 | direct-mapping |
| GRSS-ZZ-JL-58 | 计量器具内部校正记录表 | ChangeEvent | 研发/变更 | code-mapping |
| GRSS-ZZ-JL-59 | 车间人员一次性物品领用使用记录表 | Employee, IngredientUsage, Location, Material, NonConformance, ProductionBatch | 生产执行 | name-normalized-mapping |
| GRSS-ZZ-JL-60 | 车间人员用药登记表 | Employee, Location, ProductionBatch | 通用支撑 | name-normalized-mapping |
| GRSS-ZZ-JL-61 | 车间内包膜间消毒记录表 | Employee, Location, ProductionBatch | 通用支撑 | name-normalized-mapping |
| GRSS-ZZ-JL-62 | 车间冰柜温控记录表 | Employee, Location, MeasuringEquipment, 元数据 | 通用支撑 | direct-mapping |
| GRSS-ZZ-JL-63 | 车间参数配方修改记录表 | ChangeEvent | 研发/变更 | name-normalized-mapping |
| GRSS-ZZ-JL-64 | 车间员工违规处理表 | CorrectiveAction, Employee, NonConformance, ProductionBatch | 品质/检验 | direct-mapping |
| GRSS-ZZ-JL-65 | 车间废纸托登记记录表 | Employee, InventoryMovement | 仓储/库存 | code-mapping |
| GRSS-ZZ-JL-66 | 车间成品产出入库表 | Employee, InventoryMovement, Location, MeasuringEquipment, Product, ProductionBatch | 仓储/库存 | name-normalized-mapping |
| GRSS-ZZ-JL-67 | 车间新风口过滤布更换记录 | ChangeEvent, Employee, Location | 研发/变更 | name-normalized-mapping |
| GRSS-ZZ-JL-68 | 配料记录表（小料） | CalibrationRecord, Employee, EnvironmentRecord, IngredientUsage, Material, ProductionBatch | 生产执行 | manual-classification |
| GRSS-ZZ-JL-69 | 配料记录表（果酱房） | CalibrationRecord, Employee, IngredientUsage, MeasuringEquipment, Product, ProductionBatch | 生产执行 | direct-mapping |
| GRSS-ZZ-JL-70 | 配料记录表（筛粉） | CalibrationRecord, Employee, EnvironmentRecord, IngredientUsage, Material, ProductionBatch | 生产执行 | manual-classification |
| GRSS-ZZ-JL-71 | 配料记录表（配油） | CalibrationRecord, Employee, EnvironmentRecord, IngredientUsage, Material, ProductionBatch | 生产执行 | manual-classification |
| GRSS-ZZ-JL-72 | 金属探测机检测记录表 | CorrectiveAction, Employee, Location, MeasuringEquipment, NonConformance, Product, ProductionBatch | 品质/检验 | name-normalized-mapping |
| GRSS-ZZ-JL-73 | 面浆打发成型记录表 | CalibrationRecord, Employee, IngredientUsage, Material, MaterialLot, MeasuringEquipment, Product, ProductionBatch | 生产执行 | direct-mapping |
| GRSS-ZZ-JL-74 | 风箱过滤布更换记录表 | Employee, Location, 元数据 | 通用支撑 | name-normalized-mapping |

### 10.5 品质部

| 编号 | 表单 | 主要实体 | 链路定位 | 归类方式 |
| --- | --- | --- | --- | --- |
| GRSS-PZ-JL-01 | BRCGS产品风险区判定记录 | Employee, HazardAssessment, Product | 主数据/基础档案 | direct-mapping |
| GRSS-PZ-JL-02 | 一般原辅料检验报告 | Employee, Material, MaterialInspection, MaterialLot, Supplier | 品质/检验 | direct-mapping |
| GRSS-PZ-JL-03 | 临界点分析报告 | CorrectiveAction, Employee, NonConformance, Product, ProductionBatch | 品质/检验 | direct-mapping |
| GRSS-PZ-JL-04 | 产品放行授权书 | Document, DocumentIssuance, Employee | 通用支撑 | name-normalized-mapping |
| GRSS-PZ-JL-05 | 产品检验报告 | Document, Employee, Inspection, Product, ProductionBatch | 品质/检验 | direct-mapping |
| GRSS-PZ-JL-06 | 产品过敏原清单 | AuditRecord, CorrectiveAction, NonConformance | 品质/检验 | code-mapping |
| GRSS-PZ-JL-07 | 保质期实验记录 | Document, Employee, EnvironmentRecord, Inspection, Product, ProductionBatch | 生产执行 | direct-mapping |
| GRSS-PZ-JL-08 | 保质期检验记录 | Document, Employee, EnvironmentRecord, Inspection, Product, ProductionBatch | 生产执行 | direct-mapping |
| GRSS-PZ-JL-09 | 内包装材料检验报告 | Employee, Material, MaterialInspection, MaterialLot, Supplier | 品质/检验 | direct-mapping |
| GRSS-PZ-JL-10 | 内审实施计划表 | AuditRecord, Document, Employee | 通用支撑 | direct-mapping |
| GRSS-PZ-JL-11 | 内审检查表 | AuditRecord, Document, Employee | 通用支撑 | direct-mapping |
| GRSS-PZ-JL-12 | 内部审核报告 | AuditRecord, Document, Employee | 通用支撑 | direct-mapping |
| GRSS-PZ-JL-13 | 创可贴批次检测记录表 | Document, Inspection, Material, MaterialLot, MeasuringEquipment | 品质/检验 | direct-mapping |
| GRSS-PZ-JL-14 | 前提方案（PRP）验证记录 | ChangeVerificationRecord, CorrectiveAction, Document, Employee | 研发/变更 | direct-mapping |
| GRSS-PZ-JL-15 | 化学品使用记录 | Employee, InventoryMovement, Location, Material, ProcessRecord | 仓储/库存 | direct-mapping |
| GRSS-PZ-JL-16 | 化验室仪器使用记录 | Employee, MaterialLot, MeasuringEquipment, ProcessRecord | 采购/来料 | direct-mapping |
| GRSS-PZ-JL-17 | 化验室仪器设备检定表 | CalibrationRecord, Document, MeasuringEquipment | 通用支撑 | direct-mapping |
| GRSS-PZ-JL-18 | 化验室及车间仪器设备检定记录表（外检报告） | CalibrationRecord, Document, MeasuringEquipment | 通用支撑 | direct-mapping |
| GRSS-PZ-JL-19 | 化验室日报表 | Document, Employee, Inspection, Product, ProductionBatch | 品质/检验 | direct-mapping |
| GRSS-PZ-JL-20 | 化验室设备运行一览表 | Document, MaintenanceRecord, MeasuringEquipment | 通用支撑 | direct-mapping |
| GRSS-PZ-JL-21 | 半成品检验报告 | Employee, Inspection, NonConformance, ProcessRecord, Product, ProductionBatch | 生产执行 | direct-mapping |
| GRSS-PZ-JL-22 | 卫生月检表 | CleaningRecord, CorrectiveAction, Document, Employee, EnvironmentRecord | 通用支撑 | direct-mapping |
| GRSS-PZ-JL-23 | 危害分析工作单 | CCPPoint, Document, Employee, HazardAssessment, Material, ProcessStep | 主数据/基础档案 | direct-mapping |
| GRSS-PZ-JL-24 | 危害控制计划确认、验证记录 | CCPRecord, ChangeVerificationRecord, CorrectiveAction, Document, HazardAssessment, NonConformance | 研发/变更 | direct-mapping |
| GRSS-PZ-JL-25 | 原料包装留样记录 | Employee, Material, MaterialLot | 采购/来料 | direct-mapping |
| GRSS-PZ-JL-26 | 原料过敏原分析 | Document, Employee, Material | 主数据/基础档案 | direct-mapping |
| GRSS-PZ-JL-27 | 原料风险评估记录 | Document, Employee, HazardAssessment | 通用支撑 | name-normalized-mapping |
| GRSS-PZ-JL-28 | 原辅料原始检验台账 | Employee, Material, MaterialInspection, MaterialLot, Supplier | 品质/检验 | direct-mapping |
| GRSS-PZ-JL-29 | 变更申请表 | ChangeApproval, ChangeEvent, Document, Employee | 研发/变更 | direct-mapping |
| GRSS-PZ-JL-30 | 外包装材料检验报告 | Employee, Material, MaterialInspection, MaterialLot, NonConformance, Supplier | 品质/检验 | direct-mapping |
| GRSS-PZ-JL-31 | 微检室温湿度记录 | Employee, EnvironmentRecord | 通用支撑 | direct-mapping |
| GRSS-PZ-JL-32 | 意外事故调查报告 | CorrectiveAction, Employee, Location, NonConformance | 品质/检验 | direct-mapping |
| GRSS-PZ-JL-33 | 承诺声明完整性控制记录表 | ChangeVerificationRecord, CorrectiveAction, Document, Inspection, Product, ProductionBatch, Supplier | 研发/变更 | direct-mapping |
| GRSS-PZ-JL-34 | 样品留样检测及处理记录表 | Document, Inspection, Product, ProductionBatch, WasteRecord | 品质/检验 | direct-mapping |
| GRSS-PZ-JL-35 | 每周食品安全排查治理表 | AuditRecord, CorrectiveAction, NonConformance | 品质/检验 | name-normalized-mapping |
| GRSS-PZ-JL-36 | 每日食品安全检查表 | CCPRecord, Employee, Inspection, NonConformance | 品质/检验 | name-normalized-mapping |
| GRSS-PZ-JL-37 | 每月食品安全调度会议纪要 | AuditRecord, CorrectiveAction, Employee, NonConformance | 品质/检验 | name-normalized-mapping |
| GRSS-PZ-JL-38 | 油脂类来料检验报告 | Employee, Material, MaterialInspection, MaterialLot, Supplier | 品质/检验 | direct-mapping |
| GRSS-PZ-JL-39 | 消毒水余氯测试记录表 | CleaningRecord, Document, Location | 通用支撑 | direct-mapping |
| GRSS-PZ-JL-40 | 温度、湿度记录 | Employee, EnvironmentRecord, Location | 通用支撑 | direct-mapping |
| GRSS-PZ-JL-41 | 生产用水内检原始记录 | Document, Inspection | 品质/检验 | direct-mapping |
| GRSS-PZ-JL-42 | 留样记录 | CleaningRecord, Document, Employee, EnvironmentRecord, Inspection, Product, ProductionBatch, WasteRecord | 生产执行 | direct-mapping |
| GRSS-PZ-JL-43 | 百分之一天平使用校准记录 | CalibrationRecord, Document | 通用支撑 | direct-mapping |
| GRSS-PZ-JL-44 | 监视测量设施校准计划表 | CalibrationRecord, Document, Location, MeasuringEquipment | 通用支撑 | direct-mapping |
| GRSS-PZ-JL-45 | 监视设备台账表 | CalibrationRecord, Employee, Location, MeasuringEquipment | 通用支撑 | direct-mapping |
| GRSS-PZ-JL-46 | 产品开发部工作总结 | ChangeEvent, ManagementReview, Product, Recipe | 管理与支持 | manual-classification |
| GRSS-PZ-JL-47 | 公司工作总结 | InventoryMovement, ManagementReview, Material, NonConformance, Product, ProductionBatch, Supplier | 管理与支持 | manual-classification |
| GRSS-PZ-JL-48 | 制造部、仓储组、工程部工作总结 | InventoryMovement, MaintenanceRecord, ManagementReview, NonConformance, ProductionBatch | 管理与支持 | manual-classification |
| GRSS-PZ-JL-49 | 品质部工作总结 | Document, ManagementReview | 管理与支持 | name-normalized-mapping |
| GRSS-PZ-JL-50 | 管理评审 | CorrectiveAction, InternalAudit, ManagementReview, ProductRecall, TraceabilityDrill | 追溯演练 | manual-classification |
| GRSS-PZ-JL-51 | 管理评审会议纪要 | AuditRecord, Document, Employee, ManagementReview | 管理与支持 | name-normalized-mapping |
| GRSS-PZ-JL-52 | 管理评审报告 | AuditRecord, CorrectiveAction, Document, Employee, ManagementReview | 管理与支持 | name-normalized-mapping |
| GRSS-PZ-JL-53 | 管理评审计划 | Document, Employee, ManagementReview | 管理与支持 | name-normalized-mapping |
| GRSS-PZ-JL-54 | 营销部工作总结 | Complaint, InventoryMovement, ManagementReview, ProductRecall | 销售/投诉/召回 | manual-classification |
| GRSS-PZ-JL-55 | 行政人事部工作总结 | Employee, ManagementReview, Regulation, TrainingRecord | 管理与支持 | manual-classification |
| GRSS-PZ-JL-56 | 采购部工作总结 | ManagementReview, Material, MaterialInspection, Supplier | 管理与支持 | manual-classification |
| GRSS-PZ-JL-57 | 糖类检验报告 | Document, Employee, Material, MaterialInspection, MaterialLot, Supplier | 品质/检验 | direct-mapping |
| GRSS-PZ-JL-58 | 紧急采购物资使用评估放行审批表 | ChangeApproval, Material, MaterialInspection, MaterialLot, Supplier | 品质/检验 | direct-mapping |
| GRSS-PZ-JL-59 | 自来水余氯检查表 | Employee, Location, ProcessRecord | 通用支撑 | direct-mapping |
| GRSS-PZ-JL-60 | 药品出入库记录 | Employee, InventoryMovement, Material | 仓储/库存 | direct-mapping |
| GRSS-PZ-JL-61 | 虫鼠害检查记录表 | CorrectiveAction, Employee, Inspection, Location | 品质/检验 | direct-mapping |
| GRSS-PZ-JL-62 | 蛋与蛋制品检验报告 | Employee, Material, MaterialInspection, MaterialLot, Supplier | 品质/检验 | direct-mapping |
| GRSS-PZ-JL-63 | 蛋糕油脱模占比核算表 | Employee, Inspection, ProcessRecord | 品质/检验 | manual-classification |
| GRSS-PZ-JL-64 | 车间布局变更HACCP风险评估确认、验证记录 | ChangeEvent, ChangeVerificationRecord, Employee, HazardAssessment, Location | 研发/变更 | direct-mapping |
| GRSS-PZ-JL-65 | 车间测量设备台账表 | CalibrationRecord, Location, MeasuringEquipment | 通用支撑 | direct-mapping |
| GRSS-PZ-JL-66 | 车间环境微生物检验报告 | Document, EnvironmentRecord, Location | 通用支撑 | direct-mapping |
| GRSS-PZ-JL-67 | 过敏原控制措施验证记录 | ChangeVerificationRecord, Document | 研发/变更 | direct-mapping |
| GRSS-PZ-JL-68 | 过敏原测试记录 | CleaningRecord, Employee, Location | 通用支撑 | direct-mapping |
| GRSS-PZ-JL-69 | 过敏源趋势分析 | CleaningRecord, CorrectiveAction, Employee, Location | 通用支撑 | direct-mapping |
| GRSS-PZ-JL-70 | 返工评估、过程记录表 | Document, Product, ProductionBatch, ReworkRecord | 主数据/基础档案 | direct-mapping |
| GRSS-PZ-JL-71 | 追溯演练记录（反追）2025年 | Document, Employee, TraceabilityDrill | 追溯演练 | direct-mapping |
| GRSS-PZ-JL-72 | 追溯演练记录（正追）2025年 | Document, Employee, TraceabilityDrill | 追溯演练 | direct-mapping |
| GRSS-PZ-JL-73 | 面粉来料检验报告 | Employee, Material, MaterialInspection, MaterialLot, Supplier | 品质/检验 | direct-mapping |
| GRSS-PZ-JL-74 | 食品安全目标及考核表 | CorrectiveAction, Document, FoodSafetyObjective | 通用支撑 | direct-mapping |
| GRSS-PZ-JL-75 | 食品欺诈脆弱性验证记录表 | ChangeVerificationRecord, Document | 研发/变更 | direct-mapping |

### 10.6 质检组

| 编号 | 表单 | 主要实体 | 链路定位 | 归类方式 |
| --- | --- | --- | --- | --- |
| GRSS-ZJ-JL-01 | 下料单个重量记录表-质检 | Employee, Location, ProcessRecord | 通用支撑 | code-mapping |
| GRSS-ZJ-JL-02 | 中后段车间成品首检记录表-质检 | Employee, Inspection, MeasuringEquipment, NonConformance, Product, ProductionBatch | 品质/检验 | code-mapping |
| GRSS-ZJ-JL-03 | 产品中心温度记录表-质检 | CCPRecord, Employee, Location, NonConformance, ProductionBatch | 生产执行 | code-mapping |
| GRSS-ZJ-JL-04 | 产品品评记录-质检 | Employee, Inspection, Location, ProductionBatch | 品质/检验 | code-mapping |
| GRSS-ZJ-JL-05 | 产品质量抽查表-质检 | Employee, Inspection, Location, ProductionBatch | 品质/检验 | code-mapping |
| GRSS-ZJ-JL-06 | 仓库成品抽检记录表-质检 | Employee, Inspection, Product, ProductionBatch, ReworkRecord | 品质/检验 | code-mapping |
| GRSS-ZJ-JL-07 | 后段成品抽检记录表-质检 | Employee, Inspection, Location, Product, ProductionBatch | 品质/检验 | code-mapping |
| GRSS-ZJ-JL-08 | 后段车间净含量检验记录表-质检 | Employee, Inspection, Location, Product | 品质/检验 | code-mapping |
| GRSS-ZJ-JL-09 | 员工每日健康卫生检查记录-质检 | CleaningRecord, Employee, Location, NonConformance | 品质/检验 | code-mapping |
| GRSS-ZJ-JL-10 | 巡检过程异常记录表-质检 | Employee, NonConformance | 品质/检验 | code-mapping |
| GRSS-ZJ-JL-11 | 机头浆料比重、料温、纸托跟进表-质检 | Employee, Location, ProcessRecord | 通用支撑 | code-mapping |
| GRSS-ZJ-JL-12 | 每日卫生检查记录表-质检 | Employee, Location, ProcessRecord | 通用支撑 | code-mapping |
| GRSS-ZJ-JL-13 | 氮气机、干燥机、除水过滤跟进表-质检 | Employee, EnvironmentRecord, Location | 通用支撑 | code-mapping |
| GRSS-ZJ-JL-14 | 氮气记录表-质检 | CleaningRecord, Employee, Location | 通用支撑 | code-mapping |
| GRSS-ZJ-JL-15 | 洁净车间正负压跟进表-质检 | EnvironmentRecord, Location | 通用支撑 | code-mapping |
| GRSS-ZJ-JL-16 | 温湿度记录表-质检 | CCPRecord, Employee, Location, NonConformance, ProductionBatch | 生产执行 | code-mapping |
| GRSS-ZJ-JL-17 | 烤炉过程巡检表-质检 | Employee, Inspection, Location, ProductionBatch | 品质/检验 | code-mapping |
| GRSS-ZJ-JL-18 | 车间内包膜间消毒检查表-质检 | Employee, Inspection, Location | 品质/检验 | code-mapping |
| GRSS-ZJ-JL-19 | 车间环境监控检验记录-质检 | Employee, Inspection, Location, Product | 品质/检验 | code-mapping |
| GRSS-ZJ-JL-20 | 酒精房抽检记录表-质检 | Employee, Location, ProcessRecord | 通用支撑 | code-mapping |
| GRSS-ZJ-JL-21 | 鸡蛋房消毒池抽检记录-质检 | Employee, Inspection, Product, ProductionBatch, ReworkRecord | 品质/检验 | code-mapping |

### 10.7 营销部

| 编号 | 表单 | 主要实体 | 链路定位 | 归类方式 |
| --- | --- | --- | --- | --- |
| GRSS-YX-JL-01 | 产品销售登记表 | Document, Employee, InventoryMovement, Location, Product, ProductionBatch | 仓储/库存 | direct-mapping |
| GRSS-YX-JL-02 | 产品召回申请单 | Document, Employee, Product, ProductRecall, ProductionBatch | 销售/投诉/召回 | direct-mapping |
| GRSS-YX-JL-03 | 产品召回计划 | Document, Employee, Product, ProductRecall, ProductionBatch | 销售/投诉/召回 | direct-mapping |
| GRSS-YX-JL-04 | 产品召回通知单 | Document, Employee, Product, ProductRecall, ProductionBatch | 销售/投诉/召回 | direct-mapping |
| GRSS-YX-JL-05 | 召回演练记录与报告 | CorrectiveAction, Document, Employee, ProductRecall | 销售/投诉/召回 | direct-mapping |
| GRSS-YX-JL-06 | 投诉趋势分析 | Complaint, Document, Employee | 销售/投诉/召回 | direct-mapping |
| GRSS-YX-JL-07 | 运输商的定期考核表 | Document, Inspection, NonConformance, Supplier | 品质/检验 | direct-mapping |
| GRSS-YX-JL-08 | 销售出库单 | Document, Employee, InventoryMovement, Location, Product | 仓储/库存 | direct-mapping |
| GRSS-YX-JL-09 | 顾客投诉处理报告单 | Complaint, CorrectiveAction, Document, Employee, Product, ProductionBatch | 销售/投诉/召回 | direct-mapping |
| GRSS-YX-JL-10 | 顾客满意度调查表 | CorrectiveAction, Document, Employee, Inspection, Product | 品质/检验 | direct-mapping |

### 10.8 工程部

| 编号 | 表单 | 主要实体 | 链路定位 | 归类方式 |
| --- | --- | --- | --- | --- |
| GRSS-GC-JL-01 | 临时性维修卡 | Employee, Location, MaintenanceRecord | 通用支撑 | direct-mapping |
| GRSS-GC-JL-02 | 压缩空气精密过滤器更换记录 | Employee, Location, MaintenanceRecord | 通用支撑 | direct-mapping |
| GRSS-GC-JL-03 | 年度维护保养计划 | Employee, Location, MaintenanceRecord | 通用支撑 | direct-mapping |
| GRSS-GC-JL-04 | 新设备试行不合格评审处置记录 | ChangeVerificationRecord, CorrectiveAction, Employee, Location, NonConformance, Supplier | 研发/变更 | direct-mapping |
| GRSS-GC-JL-05 | 润滑油点检记录表 | Employee, Location, MaintenanceRecord | 通用支撑 | direct-mapping |
| GRSS-GC-JL-06 | 生活水池维护保养记录表 | Employee, MaintenanceRecord | 通用支撑 | direct-mapping |
| GRSS-GC-JL-07 | 电工每日巡查记录 | Employee, MaintenanceRecord | 通用支撑 | direct-mapping |
| GRSS-GC-JL-08 | 纯水机系统维护保养记录 | Employee, MaintenanceRecord | 通用支撑 | direct-mapping |
| GRSS-GC-JL-09 | 维修申请单 | Employee, MaintenanceRecord, ProcessRecord | 通用支撑 | direct-mapping |
| GRSS-GC-JL-10 | 维护保养记录 | Employee, Location, MaintenanceRecord | 通用支撑 | direct-mapping |
| GRSS-GC-JL-11 | 蒸炉维护保养记录表 | Employee, MaintenanceRecord | 通用支撑 | direct-mapping |
| GRSS-GC-JL-12 | 设备变更申请、评估记录 | ChangeApproval, ChangeEvent, ChangeVerificationRecord, Employee, Location | 研发/变更 | direct-mapping |
| GRSS-GC-JL-13 | 设备台账 | Location, MaintenanceRecord | 通用支撑 | direct-mapping |
| GRSS-GC-JL-14 | 设备巡检记录表 | Employee, Location, MaintenanceRecord | 通用支撑 | direct-mapping |
| GRSS-GC-JL-15 | 设施设备验收记录 | Employee, Location, MaintenanceRecord, Supplier | 采购/来料 | direct-mapping |
| GRSS-GC-JL-16 | 金属探测机维修保养记录表 | Employee, Location, MaintenanceRecord | 通用支撑 | direct-mapping |

### 10.9 行政人事部

| 编号 | 表单 | 主要实体 | 链路定位 | 归类方式 |
| --- | --- | --- | --- | --- |
| GRSS-XZ-JL-01 | 人员管制区域 | Employee, Location | 通用支撑 | direct-mapping |
| GRSS-XZ-JL-02 | 体系文件收发记录表 | DocumentIssuance | 通用支撑 | direct-mapping |
| GRSS-XZ-JL-03 | 供方沟通交流存档表 | Supplier | 采购/来料 | direct-mapping |
| GRSS-XZ-JL-04 | 信息沟通工作单 | Document, Employee | 通用支撑 | direct-mapping |
| GRSS-XZ-JL-05 | 内外部环境与风险机遇应对措施表 | HazardAssessment | 通用支撑 | direct-mapping |
| GRSS-XZ-JL-06 | 内部审核首（末）次会议签到表 | AuditRecord | 通用支撑 | direct-mapping |
| GRSS-XZ-JL-07 | 内部报告登记表 | CorrectiveAction, Employee, NonConformance | 品质/检验 | direct-mapping |
| GRSS-XZ-JL-08 | 卫生大比拼检查表 | CorrectiveAction, Inspection, Location | 品质/检验 | direct-mapping |
| GRSS-XZ-JL-09 | 厂区绿化维护记录 | Employee, Location, MaintenanceRecord | 通用支撑 | direct-mapping |
| GRSS-XZ-JL-10 | 厕所消毒记录表 | CleaningRecord, Employee, Location | 通用支撑 | direct-mapping |
| GRSS-XZ-JL-11 | 厨余垃圾统计表 | Employee, WasteRecord | 通用支撑 | direct-mapping |
| GRSS-XZ-JL-12 | 后门外来车辆人员出入登记表 | Visitor | 管理与支持 | direct-mapping |
| GRSS-XZ-JL-13 | 员工外出放行条 | Employee | 通用支撑 | direct-mapping |
| GRSS-XZ-JL-14 | 培训记录评价表（在职） | TrainingRecord | 管理与支持 | direct-mapping |
| GRSS-XZ-JL-15 | 培训需求申请单 | Employee, TrainingRecord | 管理与支持 | direct-mapping |
| GRSS-XZ-JL-16 | 外包服务食品安全风险评估、评价表 | HazardAssessment, Supplier | 采购/来料 | direct-mapping |
| GRSS-XZ-JL-17 | 外来文件清单 | Document, Employee | 通用支撑 | direct-mapping |
| GRSS-XZ-JL-18 | 工作联系单 | Document, Employee | 通用支撑 | direct-mapping |
| GRSS-XZ-JL-19 | 工厂钥匙每月盘点记录表 | StockCount | 仓储/库存 | direct-mapping |
| GRSS-XZ-JL-20 | 年度应急演练计划 | AuditRecord, Employee | 通用支撑 | direct-mapping |
| GRSS-XZ-JL-21 | 应急预案演练和评审记录 | CorrectiveAction | 通用支撑 | direct-mapping |
| GRSS-XZ-JL-22 | 文件借阅复制记录 | Document, Employee | 通用支撑 | name-normalized-mapping |
| GRSS-XZ-JL-23 | 文件发放（领用）登记表 | DocumentIssuance | 通用支撑 | direct-mapping |
| GRSS-XZ-JL-24 | 文件归档登记表 | Document, DocumentIssuance, Employee | 通用支撑 | direct-mapping |
| GRSS-XZ-JL-25 | 文件收发记录表 | Document, DocumentIssuance, Employee | 通用支撑 | direct-mapping |
| GRSS-XZ-JL-26 | 文件更改申请表 | ChangeEvent, Document, Employee | 研发/变更 | direct-mapping |
| GRSS-XZ-JL-27 | 文件销毁审批表 | Document, Employee | 通用支撑 | direct-mapping |
| GRSS-XZ-JL-28 | 新员工入职培训记录档案 | TrainingRecord | 管理与支持 | direct-mapping |
| GRSS-XZ-JL-29 | 日常卫生打扫记录表 | CleaningRecord | 通用支撑 | direct-mapping |
| GRSS-XZ-JL-30 | 来宾进入车间健康及保密声明 | Visitor | 管理与支持 | name-normalized-mapping |
| GRSS-XZ-JL-31 | 来访人员登记表 | Employee, Visitor | 管理与支持 | direct-mapping |
| GRSS-XZ-JL-32 | 样品接收单 | Employee, Material, MaterialInspection, MaterialLot, Supplier | 品质/检验 | direct-mapping |
| GRSS-XZ-JL-33 | 法律法规清单 | Document, Regulation | 管理与支持 | direct-mapping |
| GRSS-XZ-JL-34 | 洗衣房工作记录表 | CleaningRecord | 通用支撑 | direct-mapping |
| GRSS-XZ-JL-35 | 洗衣房工衣库存明细 | StockCount | 仓储/库存 | direct-mapping |
| GRSS-XZ-JL-36 | 礼品出入库登记表 | InventoryMovement | 仓储/库存 | direct-mapping |
| GRSS-XZ-JL-37 | 礼品领用记录 | Employee | 通用支撑 | direct-mapping |
| GRSS-XZ-JL-38 | 管理评审会议纪要 | AuditRecord, Document, Employee, ManagementReview | 管理与支持 | direct-mapping |
| GRSS-XZ-JL-39 | 管理评审报告 | AuditRecord, CorrectiveAction, Document, Employee, ManagementReview | 管理与支持 | direct-mapping |
| GRSS-XZ-JL-40 | 组织架构图 | Department, Document | 通用支撑 | direct-mapping |
| GRSS-XZ-JL-41 | 组织环境因素及相关方需求和期望识别表 | Document, HazardAssessment | 通用支撑 | direct-mapping |
| GRSS-XZ-JL-42 | 记录处理审批单 | Document, Employee | 通用支撑 | direct-mapping |
| GRSS-XZ-JL-43 | 记录汇总清单 | Document | 通用支撑 | direct-mapping |
| GRSS-XZ-JL-44 | 货物放行条 | Employee, InventoryMovement, MaterialLot | 仓储/库存 | direct-mapping |
| GRSS-XZ-JL-45 | 质检大抽检检查记录表 | Inspection | 品质/检验 | direct-mapping |
| GRSS-XZ-JL-46 | 车间人员操作情况检查考核表 | Inspection | 品质/检验 | direct-mapping |
| GRSS-XZ-JL-47 | 邮件包裹检查记录表 | Inspection | 品质/检验 | name-normalized-mapping |
| GRSS-XZ-JL-48 | 钥匙借用登记录表 | AssetLoanRecord, Employee | 管理与支持 | manual-classification |
| GRSS-XZ-JL-49 | 食品安全小组 | Employee, Organization | 管理与支持 | manual-classification |
| GRSS-XZ-JL-50 | 食品安全文化建设计划执行及评价情况 | Employee, FoodSafetyCultureRecord, TrainingRecord | 管理与支持 | manual-classification |
| GRSS-XZ-JL-51 | 食堂卫生及食品安全检查记录 | Inspection, NonConformance | 品质/检验 | direct-mapping |

## 11. 给后续 agent 的工作约束

后续任何 agent 在 `noidear` 内继续开发时，都应先遵守这组判断顺序：

1. 先判断要处理的是 **主数据**、**批次**、**桥接关系** 还是 **治理记录**。
2. 如果要做下拉选择，先找主数据表，不要在业务表里新建文本枚举。
3. 如果要支持追溯，必须回到 `ProductionBatch` 和 `MaterialLot(MaterialBatch)`。
4. 如果一个功能同时涉及研发、仓储、制造、品质，优先检查是否已经有共享实体，而不是跨模块复制字段。
5. 如果代码模型名与业务模型名不同，以本文件的“业务标准名”做讨论口径，以 schema 实际模型名做实现口径。
6. 如果新增表单或新模块，先决定它归属于哪条主链，再决定建表方式。

## 12. 后续建议

建议后续把这份总说明继续演进成三个配套文档：

- `docs/MASTER_DATA_DICTIONARY.md`：实体级字段字典
- `docs/TRACEABILITY_QUERY_PLAYBOOK.md`：正追/反追/物料平衡的 API 与 SQL 查询剧本
- `docs/FORM_TO_MODEL_IMPLEMENTATION_MAP.md`：283 张表单到 `RecordTemplate` / 独立业务表的最终落表策略
