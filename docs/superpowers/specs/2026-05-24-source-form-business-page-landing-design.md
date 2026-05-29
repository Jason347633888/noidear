# 源记录表单业务页面落地设计

**日期：** 2026-05-24  
**状态：** 方案 B 需要按 2026-05-24 业务反馈修正后再执行  
**目标：** 将 `/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单` 中的 283 份 Markdown 源记录表单，按业务对象落入现有或新增的功能页面，同时强制对齐主数据、批次、追溯、审批、文控和待办能力。

本 spec 是 `docs/superpowers/specs/2026-05-23-dynamic-form-retirement-design.md` 的后续产品落地设计。它不恢复动态表单，不恢复 model-landing，不恢复 04 记录表单索引。

---

## 一句话说明

源表单不再驱动动态运行时模型；每张仍在使用的源表必须有可填写入口。填写入口可以是独立记录页、同类页面家族、主数据/台账视图或附件页，但核心主数据、批次和追溯关系必须引用权威业务对象。

---

## 2026-05-24 业务反馈修正

以下反馈覆盖本文早先“按大模块合并”的表达，后续 implementation plan 必须按这里执行：

1. 动态表单模块后续不存在，不能作为运行时方案或过渡方案。
2. 每张仍在使用的源表都要先有可填写入口；但这不等于每张表都创建独立领域模型。
3. 重复表、产品变体表、区域变体表可以共用同一个页面家族。例如不同产品的投料/配料表，应由产品和配方版本生成填写行。
4. 配方变更后，新记录使用新配方版本；旧记录保存当时的配方快照，不跟随主数据变化。
5. 投料、配料、过程参数发生时可能还没有成品批次。早期记录先按日期、时间、线别、产品、工序、班次或生产会话保存，包装或入库生成批次后再关联。
6. 清洁、检验、现场检查、供应商评价等不先强制合并。先逐张表判断：保留独立填写、同类共用页面、自动生成视图、只当附件、暂缓或不要做。
7. 不合格、整改、CAPA 第一阶段不作为业务复核前提；源表里已有的异常、处理、复核字段先保留，后续再判断是否升级为正式整改流程。
8. 管理评审、追溯演练等复杂治理能力第一阶段暂缓，除非逐张表复核后明确要做。
9. 采购计划、紧急采购、采购合同第一阶段只按记录表单落地，不默认做完整采购流程、合同履约、付款或订单系统。
10. 顾客满意度第一阶段是一张调查表，不默认做复杂独立功能。
11. 承运商可以作为供应商体系的一类，不默认排除到供应商之外。
12. 产品标签信息需要单独维护，可以引用产品和配方，但不能完全自动从产品和配方生成。

---

## 前置依赖

执行本设计前必须满足：

1. `simple-role-module-access` plan 至少完成到 dynamic-form retirement spec 要求的 Task 33 边界。
2. `dynamic-form-retirement` implementation 已删除 `RecordTemplate / Record / RecordTaskAssignment / RecordTaskInstance / Task / TaskRecord / ChangeEventFormTask / RecordFormLandingEntry` 以及 model-landing 运行时模块。
3. 顶层协议文档已不再把 `model-landing.generated.ts`、283 表单 CSV、记录表单索引视为当前事实源。
4. 实现工作必须在独立 worktree 完成，主 checkout 只允许继续做规划和 review。

如果目标分支还保留动态填报平台，本设计不能直接执行；否则会把新业务模块和待退役的动态模块叠在一起。

---

## 选择方案

本设计采用修正版方案 B：

```text
源记录表单
  -> 逐张判断是否保留
  -> 保留的表必须有可填写入口
  -> 主数据选择 / 当时快照 / 业务记录 / 附件
  -> 独立记录页、同类页面家族、台账视图或附件页
```

不采用：

- 旧方案 A：每张源表单一个独立领域模型和一套独立 CRUD。它会制造大量重复字段。
- 纯方案 C：部门工作台作为主事实源。部门入口可以存在，但只能做待办、筛选和快捷入口，不能承载第二套业务数据。

最终系统可以有部门工作台，但工作台只能路由到具体填写入口、同类页面家族、主数据页或附件页。

---

## 设计原则

### 0. 先审计已有轮子

每个部门必须先按 `docs/superpowers/specs/2026-05-24-source-form-department-audit.md` 做逐表审计，再进入 implementation plan。审计顺序是：

```text
源表单
  -> 已有 Prisma model
  -> 已有后端 module/controller/service
  -> 已有前端 route/menu/view
  -> 现有页面落地效果
  -> 是否只需补字段/补详情/补入口
  -> 最后才判断是否新增领域模型
```

不允许因为某张纸质表单名称独立，就直接新增同名 model、API 或页面。

### 1. 主数据字段必须归一化

任何源表单中的主数据字段都不得只保存自由文本。

| 源字段语义 | 当前代码模型 | 录入方式 | 审计快照 |
|---|---|---|---|
| 物料、原辅料、包材 | `Material` | 选择物料主数据 | 名称、编码、规格、单位 |
| 原辅料批次 | `MaterialBatch` | 选择或由入库流程创建批次 | 批号、供应商批号、到期日 |
| 供应商 | `Supplier` | 选择供应商主数据 | 名称、统一编号、状态 |
| 产品、成品 | `Product` | 选择产品主数据 | 名称、规格、标签声明 |
| 配方 | `Recipe` / `RecipeLine` | 选择正式配方版本 | 配方名、版本号 |
| 生产批次 | `ProductionBatch` | 选择生产批次 | 批号、产品名、生产日期 |
| 投料关系 | `BatchMaterialUsage` | 从生产批次内登记投料 | 物料批号、实投量、单位 |
| 客户、承运方、收运单位 | `ExternalParty` | 按 `party_type` 选择外部方 | 名称、联系人、车牌/电话等 |
| 设备 | `Equipment` | 选择设备台账 | 编号、名称、位置 |
| 计量/测量设备 | `MeasuringEquipment` | 选择测量设备台账 | 编号、名称、检定状态 |
| 车间、区域、库位 | `WorkshopArea` 或仓储位置字段 | 选择受控区域 | 区域名、用途 |
| 部门 | `Department` | 选择部门 | 部门名 |
| 人员、审核人、复核人、操作人 | `User` | 选择用户 | 姓名、岗位/部门快照 |
| 体系文件、空白表单、外部文件 | `Document` / `BusinessDocumentLink` | 选择受控文件 | 文件编号、版本 |

快照字段只服务审计展示和历史打印，不得替代外键。

### 2. 批次字段必须进入追溯链

凡是源表单出现以下字段，必须判断是否参与追溯：

- 原辅料批号、供应商批号、入库批号。
- 生产批号、产品批号、成品批号。
- 发货批号、召回批号、投诉批号。
- 投料量、产出量、损耗量、留样量、废弃量。

参与追溯的字段必须落到 `MaterialBatch`、`ProductionBatch`、`BatchMaterialUsage`、`InventoryMovement`、`DeliveryNote`、`ProductRecallBatch` 等结构化模型；不能落到备注、JSON 或孤立文本。

### 3. 源表单不是运行时索引

允许在开发文档、测试用例、页面帮助文案和导出标题中引用源表单名称；不允许新建运行时 283 表单目录、落地状态页、表单 backlog 页或 `/model-landing` 兼容 API。

### 4. 允许领域内通用模型，不允许全局动态模型

可以新增领域模型，例如：

- `QualityInspection`：承接产品检验、包材检验、原辅料检验补充、净含量、品评、保质期检验等质量检验记录。
- `ComplianceInspection`：承接每日食品安全检查、卫生月检、PRP 验证、虫鼠害检查、承诺声明完整性检查等合规检查。
- `InternalAudit`：承接内审计划、检查表、报告和发现项。
- `ManagementReview`：承接管理评审计划、输入材料、会议纪要、报告和行动项。
- `TraceabilityDrill`：承接正追、反追、召回演练记录。
- `DocumentOperation`：承接文件发放、借阅、归档、销毁、记录处理等文控操作。

这些模型必须有明确业务语义、状态、责任人、统计口径和权限边界。它们不能退化成 `formName + dataJson`。

---

## 字段归属算法

每张源表单按以下顺序处理：

1. 找业务事件：这张表是在记录什么事件，而不是这张纸叫什么。
2. 找主对象：事件围绕哪个主对象发生，如物料批次、生产批次、设备、供应商、客户、文件、员工。
3. 拆字段：主数据字段、批次字段、业务记录字段、快照字段分开。
4. 找已有模块：优先落入当前已有的 module、controller、service、view。
5. 判断缺口：已有模型字段不足时补字段；没有业务对象时新增领域模型。
6. 接入审批/待办：需要流转的记录走 `ApprovalInstance / ApprovalTask` 或 `TodoTask`，不新建记录填报任务。
7. 接入文控：空白表单、制度、外部证书、检验报告扫描件走 `Document / BusinessDocumentLink`。
8. 接入追溯：所有批次、投料、发货、投诉、召回关系必须能被追溯查询服务读到。

---

## 当前代码可复用模块

| 业务域 | 已有模型/模块 | 承接能力 |
|---|---|---|
| 仓储与物料 | `Material`、`MaterialBatch`、`MaterialInbound`、`StockRecord`、`InventoryMovement`、`StockCount`、`MaterialRequisition` | 原辅料档案、批次、入库、领料、库存移动、盘点 |
| 供应商 | `Supplier`、`SupplierQualification`、`SupplierDocument`、`SupplierEvaluation` | 供应商档案、资质、评价 |
| 产品与配方 | `Product`、`Recipe`、`RecipeLine`、`ProcessStep`、`ProcessTemplate`、`ProcessInstance` | 产品档案、配方、工序、研发流程 |
| 生产与追溯 | `ProductionBatch`、`ProductionRun`、`BatchMaterialUsage`、`MaterialBalance`、`TraceabilitySnapshot` | 生产批次、投料、物料平衡、追溯快照 |
| 过程记录 | `EnvironmentRecord`、`ProcessMonitorRecord`、`CleaningRecord`、`MetalDetectionLog`、`LineChangeCheckRecord`、`PackagingMaterialUsage` | 环境、过程参数、清洁、金检、换产、包材 |
| 质量治理 | `CCPPoint`、`CCPRecord`、`IncomingInspection`、`NonConformance`、`CorrectiveAction`、`CustomerComplaint`、`ProductRecall`、`ReworkRecord` | CCP、来料检验、不合格、CAPA、投诉、召回、返工 |
| 设备 | `Equipment`、`MaintenancePlan`、`MaintenanceRecord`、`EquipmentFault`、`MeasuringEquipment`、`CalibrationRecord` | 设备台账、维保、报修、测量设备、校准 |
| 人员与现场 | `ViolationRecord`、`MedicationRecord`、`VisitorRecord`、`EmergencyDrillRecord`、`FoodSafetyCultureRecord` | 违规、用药、访客、应急演练、食品安全文化 |
| 文控审批 | `Document`、`DocumentVersion`、`BusinessDocumentLink`、`ApprovalDefinition`、`ApprovalInstance`、`ApprovalTask`、`TodoTask` | 文件版本、业务对象关联、审批、普通待办 |

---

## 需要新增或补强的业务模块

| 模块 | 原因 | 覆盖表单类型 |
|---|---|---|
| `QualityInspection` | 当前只有 `IncomingInspection`，不能覆盖成品、半成品、包材、净含量、品评、保质期、微生物等质量检验 | 品质部、质检组的大部分检验报告 |
| `ComplianceInspection` | 当前合规检查散落在清洁、环境、文化等模型，缺少统一的现场合规检查对象 | 每日食品安全检查、卫生月检、虫鼠害、PRP、承诺声明、风险区检查 |
| `InternalAudit` | 内审计划、检查表、报告、会议签到和发现项需要闭环到 CAPA | 品质部内审、行政内审会议 |
| `ManagementReview` | 管理评审是独立治理过程，不应只做文档附件 | 管理评审计划、会议纪要、报告、部门输入总结 |
| `TraceabilityDrill` | 正追/反追/召回演练需要记录演练目标、耗时、结论、快照和改进项 | 品质部追溯演练、营销部召回演练 |
| `FoodSafetyObjective` | 食品安全目标与考核不是普通文化活动，需要年度指标和达成评价 | 食品安全目标及考核表 |
| `Regulation` | 法律法规清单需要有效期、适用范围、外部文件和评审状态 | 法律法规清单、外来文件清单 |
| `DocumentOperation` | 文件收发、发放、借阅、归档、销毁、记录处理需要结构化台账 | 行政人事部文件与记录管理表单 |
| `Procurement` | 当前没有采购计划、合同、紧急采购申请的业务对象 | 采购部采购计划、合同、紧急采购 |
| `ExternalPartyEvaluation` | 运输商、外包服务、废弃物收运方等外部方评价不能混入供应商评价 | 营销运输商考核、行政外包服务风险评估 |

---

## 283 表单落地矩阵

### 制造部：74 份

| 表单组 | 目标业务页面 | 主数据对齐 |
|---|---|---|
| 投料打料记录系列、配料记录系列、果酱房投料打料、每日鸡蛋车间表 | 生产批次详情、投料记录、`/process-records`、`/environment-records` | `Product`、`Recipe`、`ProductionBatch`、`MaterialBatch`、`BatchMaterialUsage`、`WorkshopArea`、`User` |
| 烤炉过程记录、蒸炉过程记录、面浆打发成型、生产斗数记录 | `/process-records` + 生产批次详情 | `ProductionBatch`、`Product`、`Equipment`、`WorkshopArea`、`User` |
| 金属探测机检测记录 | `/metal-detections` | `ProductionBatch`、`Equipment`、`User` |
| 日常清洁记录、生产清场、筛网过滤器清洁、脚底清洁池、臭氧、过滤布更换、工器具清洗消毒 | `/cleaning-records` | `WorkshopArea`、`Equipment`、`User` |
| 生产线换产启动前检查 | `/line-change-check-records` | `ProductionRun`、`Product`、`WorkshopArea`、`User` |
| 工艺、配料变更、复称、评估、验证记录；车间参数配方修改记录 | `/change-events`、`/change-verification-records`、产品工艺变更计划 | `Product`、`Recipe`、`ProcessStep`、`User`、`Department` |
| 不合格品评审处置、纠正与整改、特殊材料使用风险评估 | `/non-conformances`、`/corrective-actions`、`/compliance-inspections` | `MaterialBatch`、`ProductionBatch`、`Product`、`User` |
| 回料、废蛋糕、带标签废弃物、车间废纸托 | `/rework-records`、`/waste`、`/packaging-material-usages` | `ProductionBatch`、`Material`、`MaterialBatch`、`ExternalParty` |
| 车间用药、违规、一次性物品领用、班后检查 | `/medication-records`、`/violation-records`、`/compliance-inspections` | `User`、`Department`、`WorkshopArea` |
| 计量器具内部校正、紫外线灯状态、设备过滤布、电机更换 | `/measuring-equipment`、`/equipment/records`、`/calibration-records` | `Equipment`、`MeasuringEquipment`、`WorkshopArea`、`User` |

### 品质部：75 份

| 表单组 | 目标业务页面 | 主数据对齐 |
|---|---|---|
| 一般原辅料、面粉、糖类、油脂、蛋与蛋制品、包装材料检验报告 | `/incoming-inspections` + `QualityInspection` | `Material`、`MaterialBatch`、`Supplier`、`User` |
| 产品检验、半成品检验、保质期检验、保质期实验、留样、样品留样检测 | `QualityInspection`、`Sample` | `Product`、`ProductionBatch`、`Sample`、`User` |
| 化验室日报、仪器使用、仪器设备检定、设备运行、百分之一天平 | `QualityInspection`、`MeasuringEquipment`、`CalibrationRecord` | `MeasuringEquipment`、`Equipment`、`User` |
| 温度湿度、微检室温湿度、生产用水、自来水余氯、车间环境微生物 | `/environment-records` + `QualityInspection` | `WorkshopArea`、`ProductionBatch`、`User` |
| 过敏原清单、原料过敏原分析、过敏原测试、控制措施验证、趋势分析 | `ComplianceInspection` + `Product` / `Material` 扩展 | `Product`、`Material`、`ProductionBatch`、`User` |
| 危害分析、危害控制计划确认、临界点分析、PRP 验证 | `ComplianceInspection`、`CCPPoint`、`CCPRecord` | `ProcessStep`、`CCPPoint`、`Product`、`User` |
| 每日食品安全检查、每周排查、卫生月检、虫鼠害、风险区判定 | `ComplianceInspection` | `WorkshopArea`、`Department`、`User` |
| 变更申请、车间布局变更 HACCP 风险评估 | `/change-events`、`ChangeComplianceRecord`、`ChangeVerificationRecord` | `Product`、`ProcessStep`、`WorkshopArea`、`User` |
| 内审实施计划、内审检查表、内部审核报告 | `InternalAudit` | `Department`、`User`、`CorrectiveAction` |
| 管理评审汇总 11 份 | `ManagementReview` | `Department`、`User`、`Document` |
| 追溯演练正追/反追 | `TraceabilityDrill` + `/traceability` | `MaterialBatch`、`ProductionBatch`、`TraceabilitySnapshot`、`User` |
| 食品安全目标及考核、食品欺诈脆弱性验证、承诺声明完整性 | `FoodSafetyObjective`、`ComplianceInspection` | `Department`、`User`、`Product`、`Material` |

### 质检组：21 份

| 表单组 | 目标业务页面 | 主数据对齐 |
|---|---|---|
| 下料重量、首件、产品中心温度、净含量、成品抽检、质量抽查、产品品评 | `QualityInspection` | `Product`、`ProductionBatch`、`User` |
| 机头浆料比重、烤炉过程巡检、氮气、正负压、温湿度、环境监控 | `/process-records`、`/environment-records`、`QualityInspection` | `ProductionBatch`、`Equipment`、`WorkshopArea`、`User` |
| 每日卫生、员工健康卫生、消毒检查、酒精房、消毒池 | `ComplianceInspection`、`/cleaning-records` | `WorkshopArea`、`User`、`Department` |
| 巡检过程异常 | `/non-conformances`、`/corrective-actions` | `ProductionBatch`、`Product`、`User` |

### 工程部：16 份

| 表单组 | 目标业务页面 | 主数据对齐 |
|---|---|---|
| 设备台账、设施设备验收 | `/equipment` | `Equipment`、`Department`、`User` |
| 年度维护保养计划、维护保养记录、蒸炉维护、压缩空气过滤器、纯水机、生活水池、润滑油点检、巡检 | `/equipment/plans`、`/equipment/records` | `Equipment`、`WorkshopArea`、`User` |
| 维修申请、临时维修卡、金属探测机维修保养 | `/equipment/faults`、`/equipment/records` | `Equipment`、`User`、`Department` |
| 设备变更申请、评估记录 | `/change-events` | `Equipment`、`User`、`Department` |
| 新设备试行不合格评审处置 | `/non-conformances`、`/equipment` | `Equipment`、`User` |

### 仓储组：13 份

| 表单组 | 目标业务页面 | 主数据对齐 |
|---|---|---|
| 原材料验收单、原料标识卡 | `MaterialInbound`、`MaterialBatch`、`IncomingInspection` | `Material`、`MaterialBatch`、`Supplier`、`User` |
| 仓库领料单、上车单、成品入库单、成品入库卡 | `/warehouse/requisitions`、`InventoryMovement`、`ProductionBatch` | `MaterialBatch`、`ProductionBatch`、`ExternalParty`、`User` |
| 仓库日常巡查、过滤网清洗、运输车辆清洁消毒 | `ComplianceInspection`、`/cleaning-records` | `WorkshopArea`、`Equipment`、`ExternalParty`、`User` |
| 化学品、易耗品、废品出入库、报废申请 | `InventoryMovement`、`WasteRecord`、`WasteDisposalRecord` | `Material`、`MaterialBatch`、`ExternalParty`、`User` |

### 采购部：12 份

| 表单组 | 目标业务页面 | 主数据对齐 |
|---|---|---|
| 供应商台账、合格供应方资料台账 | `/warehouse/suppliers`、`SupplierDocument` | `Supplier`、`Material`、`Document` |
| 新准入评价、调查问卷、现场审核、供应商评价、绩效评估 | `/supplier-evaluations` | `Supplier`、`User`、`Document` |
| 物资采购计划、采购合同、紧急采购申请、采购物资分类明细 | `Procurement`、`Material`、`Supplier`、`Document` | `Material`、`Supplier`、`User`、`ApprovalInstance` |
| 原辅料验收台账 | `MaterialInbound`、`MaterialBatch`、`IncomingInspection` | `Material`、`MaterialBatch`、`Supplier` |

### 产品开发部：11 份 Markdown 源表单

| 表单组 | 目标业务页面 | 主数据对齐 |
|---|---|---|
| 新产品开发申请书、计划书、评审记录、研发实验记录 | `/process` 研发流程 | `Product`、`ProcessInstance`、`User`、`Department` |
| 产品规格书、标签信息、产品操作规程 | `/products`、`Document`、`BusinessDocumentLink` | `Product`、`Document` |
| 产品配方以及工艺参数、工艺流程图确认 | `/recipes`、`/process-steps`、`CCPPoint` | `Product`、`Recipe`、`ProcessStep` |
| 产品更改申请、产品验证记录 | `/change-events`、`ChangeVerificationRecord` | `Product`、`Recipe`、`User` |

### 营销部：10 份

| 表单组 | 目标业务页面 | 主数据对齐 |
|---|---|---|
| 产品销售登记、销售出库单 | `DeliveryNote`、`ExternalParty` | `ProductionBatch`、`Product`、`ExternalParty`、`User` |
| 顾客投诉处理报告、投诉趋势分析 | `/customer-complaints`、`/corrective-actions` | `ExternalParty`、`ProductionBatch`、`User` |
| 运输商定期考核 | `ExternalPartyEvaluation` | `ExternalParty(party_type=carrier)`、`User` |
| 产品召回申请、计划、通知、演练记录报告 | `/product-recalls`、`TraceabilityDrill` | `ProductRecall`、`ProductionBatch`、`ExternalParty`、`TraceabilitySnapshot` |

### 行政人事部：51 份

| 表单组 | 目标业务页面 | 主数据对齐 |
|---|---|---|
| 组织架构、食品安全小组、人员管制区域 | `Department`、`User`、`Role`、`WorkshopArea` | `Department`、`User`、`WorkshopArea` |
| 培训需求、培训记录评价、新员工入职培训档案 | `/training/projects`、`LearningRecord`、`TrainingArchive` | `User`、`Department`、`Document` |
| 来访、后门车辆人员、健康保密声明 | `/visitor-records`、`ExternalParty` | `ExternalParty`、`User`、`WorkshopArea` |
| 应急演练计划、演练和评审记录 | `/emergency-drills` | `User`、`Department`、`Document` |
| 食品安全文化建设计划执行及评价 | `/food-safety-culture-records` | `User`、`Department` |
| 厕所消毒、日常卫生、食堂卫生、卫生大比拼、车间操作检查、质检抽检 | `ComplianceInspection`、`/cleaning-records` | `WorkshopArea`、`User`、`Department` |
| 文件收发、体系文件收发、发放、借阅复制、归档、销毁、外来文件、记录汇总、记录处理 | `DocumentOperation`、`Document` | `Document`、`User`、`Department` |
| 法律法规清单、风险机遇、组织环境、外包服务评估、供方沟通 | `Regulation`、`ComplianceInspection`、`ExternalPartyEvaluation` | `ExternalParty`、`Department`、`Document` |
| 钥匙、工衣、礼品、邮件包裹、货物放行、员工外出、厨余垃圾、绿化维护、洗衣房 | `ComplianceInspection`、`WasteDisposalRecord`、`ExternalParty` | `User`、`ExternalParty`、`WorkshopArea` |
| 管理评审报告、会议纪要、内部审核首末次会议签到 | `ManagementReview`、`InternalAudit` | `Department`、`User`、`Document` |

---

## 页面策略

### 列表页

每个业务模块列表页至少支持：

- 按日期、状态、部门、责任人筛选。
- 按主对象筛选，例如物料、供应商、产品、批次、设备、区域。
- 按异常状态筛选，例如不合格、超限、待整改、待审批、逾期。
- 展示关联主数据快照，但点击进入主数据详情。

### 详情页

业务详情页必须展示：

- 主对象信息区。
- 业务记录字段区。
- 附件和受控文件关联区。
- 审批/待办/整改区。
- 追溯关系区；只有参与追溯的记录才展示。
- 审计快照区；仅用于说明当时记录值。

### 快捷创建

允许从部门工作台、生产批次详情、供应商详情、设备详情、产品详情里快捷创建记录，但创建出来的记录仍属于业务模块。

---

## 主数据字段缺口处理

实现中如果发现现有模型只有字符串字段，按以下规则修正：

1. 增加 FK 字段，保留或新增 snapshot 字段。
2. 新建记录必须选择 FK。
3. 快照由后端根据 FK 自动填充，前端不得让用户手填快照。
4. 列表和详情展示快照，但操作、筛选、统计使用 FK。
5. 旧字段若无历史数据可直接重命名或删除；本项目当前按无历史业务数据处理。

优先修正：

- `CleaningRecord.target_name` 需要能指向 `WorkshopArea` 或 `Equipment`。
- `WasteDisposalRecord.material_name / lot_no` 需要能指向 `Material` / `MaterialBatch`。
- `ViolationRecord.employee_id`、`MedicationRecord.employee_id`、各类 `operator_id` 需要统一到 `User`。
- `LineChangeCheckRecord.product_from / product_to` 需要能指向 `Product`。
- `ChangeComplianceRecord.change_event_id` 需要显式 relation。
- `DocumentOperation`、`QualityInspection`、`ComplianceInspection` 等新增模块必须从第一版就按 FK + snapshot 建模。

---

## 与文控的关系

源表单对应的空白表单、制度文件、外部证书、检验报告扫描件属于文控对象：

```text
Document / DocumentVersion / BusinessDocumentLink
```

业务记录只保存结构化事实和附件关系，不保存“这张表单的字段 JSON”。业务记录可以链接到受控文件版本，表示该记录按哪个版本的表单或规程执行。

---

## 与审批和待办的关系

1. 审批统一使用 `ApprovalDefinition / ApprovalInstance / ApprovalTask / ApprovalAction`。
2. 普通提醒和执行任务使用 `TodoTask`。
3. 不恢复 `RecordTaskAssignment / RecordTaskInstance`。
4. 周期性任务按业务模块生成，例如设备维保由设备模块生成、文件到期由文控模块生成、校准到期由测量设备模块生成。

---

## 验收标准

### 结构验收

1. 不存在新的动态表单模型、表单 JSON 记录模型或 283 表单运行时索引。
2. 大部分源表单在业务矩阵里有明确落点：已有模块、补字段模块、新增领域模块、或文控附件。
3. 所有参与追溯的表单字段都能落到结构化批次链。
4. 所有主数据字段都能落到 FK，快照只服务审计展示。

### 行为验收

1. 制造部、品质部、质检组、仓储组、采购部、营销部、产品开发部、工程部、行政人事部均有对应业务入口。
2. 生产、检验、清洁、设备、供应商、投诉、召回、追溯演练、内审、管理评审、文控操作不再依赖动态填报。
3. 业务页面可以从主对象详情进入，也可以从菜单进入。
4. 审计时能从业务记录追到：主数据、批次、责任人、审批、文控版本、附件。

### 验证命令

实现完成后至少运行：

```bash
npm run prisma:generate -w server
npm run build:server
npm run build:client
npm run typecheck:types
npm run traceability:verify -w server
```

触碰追溯服务时追加：

```bash
npm run traceability:test -w server
```

触碰前端关键页面时追加对应 Vitest：

```bash
npm test -w client -- --run
```

---

## 后续实施计划要求

implementation plan 必须一次性覆盖大部分源表单，但任务仍要按“部门逐表审计 -> 复用已有轮子 -> 补缺口”的顺序推进。执行顺序：

1. 建立独立 worktree，确认 dynamic-form retirement 已完成。
2. 按部门顺序逐表审计已有模型、API、页面和落地效果。
3. 建立非运行时源表单归宿矩阵，用于开发追踪和验收。
4. 先补主数据选择与 FK/snapshot 基础能力。
5. 对已有轮子优先补字段、补明细项、补详情页和补入口。
6. 只有当逐表审计证明没有合适业务对象时，才新增领域模型。
7. 最后做部门工作台快捷入口、搜索、报表、导出和验证。

执行完成后，系统应体现：

```text
源表单的业务事实 -> 独立业务模块
源表单的空白文件 -> Document
源表单的执行任务 -> TodoTask 或业务模块自己的计划
源表单的审批 -> ApprovalInstance
源表单的批次关系 -> Traceability 链
```

不再存在：

```text
动态表单
动态字段设计器
动态填报任务
04 记录表单索引
model-landing 运行时清单
```
