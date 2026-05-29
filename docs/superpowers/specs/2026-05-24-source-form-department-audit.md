# 源记录表单部门逐表落地审计

**日期：** 2026-05-24  
**状态：** 制造部、品质部、质检组、工程部、仓储组、采购部、产品开发部、营销部、行政人事部首轮审计已建立  
**目标：** 在执行 `source-form-business-page-landing` 前，逐部门逐表确认已有轮子、落地动作和落地后的业务效果，避免重复新建模型、API 或页面。

本文件是 `docs/superpowers/specs/2026-05-24-source-form-business-page-landing-design.md` 的前置审计材料。它不是运行时索引，不得被 server/client import。

如果你是业务复核人，不要先看本文件。请先看短版复核入口：

`docs/superpowers/specs/2026-05-24-source-form-department-review-guide.md`

本文件保留给实现前的技术核对使用，主要用于确认已有轮子、主数据字段、模型边界和不要重复造的功能。

**2026-05-24 业务反馈覆盖说明：**

- “不新增独立页面/不按每张表造模型”在本文中只表示不为每张表创建独立领域模型或重复主数据；不表示用户看不到这张表的填写入口。
- 第一阶段目标改为：每张仍在使用的源表都要有可填写入口；重复表和同类表可以共用页面家族。
- 动态表单模块后续不存在；不能把动态表单作为过渡运行时方案。
- 制造早期投料、配料、过程参数记录时可能没有成品批次；应先按日期、时间、线别、产品、工序、班次或生产会话记录，后续再关联包装/入库生成的批次。
- 清洁、检验、现场检查、供应商评价等是否合并，必须逐张表判断，不能先按大模块强制合并。
- 采购计划、紧急采购、采购合同、顾客满意度、钥匙借用、员工外出放行、邮件包裹检查等，第一阶段按“可填写记录表”落地，不默认升级成复杂正式业务系统。

---

## 审计顺序

按源目录和业务风险排序：

1. 制造部
2. 品质部
3. 质检组
4. 工程部
5. 仓储组
6. 采购部
7. 产品开发部
8. 营销部
9. 行政人事部

每个部门必须逐表过一遍，不允许只按大模块合并。

---

## 判定规则

| 判定 | 说明 |
|---|---|
| 直接复用 | 已有 Prisma model、后端 API、前端页面基本齐全，只需接入源表单场景或补筛选 |
| 复用并补字段 | 已有业务对象正确，但主数据 FK、批次 FK、明细项、快照或状态字段不足 |
| 复用并补页面 | 已有模型/API，但缺少详情页、快捷创建、批次详情入口或导出视图 |
| 复用并拆分 | 一张源表单包含多个业务事实，必须拆到多个已有模块 |
| 新增领域模型 | 当前没有明确业务对象，且不能塞进已有模型；新增前必须说明为什么不是已有轮子 |
| 文控附件 | 空白表单、制度文件、报告扫描件、证书等只作为 `Document / BusinessDocumentLink`，不建业务事实表 |

---

## 当前已确认的可复用轮子

| 业务能力 | 已有轮子 |
|---|---|
| 生产批次 | `ProductionBatch`、`ProductionRun`、`client/src/views/batch-trace/BatchList.vue`、`client/src/views/batch-trace/BatchDetail.vue` |
| 投料与追溯 | `BatchMaterialUsage`、`MaterialBatch`、`Material`、`MaterialBalance`、`TraceabilityQueryService` |
| 混料/投料工作台 | `server/src/modules/mixing/`、`client/src/views/mixing/MixingWorkbench.vue` |
| 环境记录 | `EnvironmentRecord`、`server/src/modules/environment-record/`、`client/src/views/environment-record/EnvironmentRecordList.vue` |
| 过程参数 | `ProcessMonitorRecord`、`server/src/modules/process-record/`、`client/src/views/process-record/ProcessRecordList.vue` |
| 清洁消毒 | `CleaningRecord`、`server/src/modules/cleaning-record/`、`client/src/views/cleaning-record/CleaningRecordList.vue` |
| 金属探测 | `MetalDetectionLog`、`server/src/modules/metal-detection/`、`client/src/views/metal-detection/MetalDetectionList.vue` |
| 换产检查 | `LineChangeCheckRecord`、`server/src/modules/line-change-check-record/`、`client/src/views/line-change-check-record/LineChangeCheckRecordList.vue` |
| 易碎品检查 | `FragileItemInspection`、`server/src/modules/fragile-item-inspection/`、`client/src/views/fragile-item-inspection/FragileItemInspectionList.vue` |
| 回料/返工 | `ReworkRecord`、`server/src/modules/rework-record/`、`client/src/views/rework-record/ReworkRecordList.vue` |
| 废弃物 | `WasteDisposalRecord`、`WasteRecord`、`server/src/modules/waste/`、`client/src/views/waste/WasteManagement.vue` |
| 包装材料用量 | `PackagingMaterialUsage`、`server/src/modules/packaging-material-usage/`、`client/src/views/packaging-material-usage/PackagingMaterialUsageList.vue` |
| 员工用药 | `MedicationRecord`、`server/src/modules/medication-record/`、`client/src/views/medication-record/MedicationRecordList.vue` |
| 员工违规 | `ViolationRecord`、`server/src/modules/violation-record/`、`client/src/views/violation-record/ViolationRecordList.vue` |
| 不合格 | `NonConformance`、`server/src/modules/non-conformance/`、`client/src/views/non-conformance/NonConformanceList.vue` |
| CAPA | `CorrectiveAction`、`server/src/modules/corrective-action/`、`client/src/views/corrective-action/CorrectiveActionList.vue` |
| 变更 | `ChangeEvent`、`ChangeVerificationRecord`、`ChangeComplianceRecord`、`ProductProcessChangePlan` |
| 设备维保 | `Equipment`、`MaintenancePlan`、`MaintenanceRecord`、`EquipmentFault`、`client/src/views/equipment/*` |
| 测量设备/校准 | `MeasuringEquipment`、`CalibrationRecord`、`server/src/modules/measuring-equipment/` |
| 文控 | `Document`、`DocumentVersion`、`BusinessDocumentLink`、`SystemDocumentCenter.vue` |
| 审批/待办 | `ApprovalInstance`、`ApprovalTask`、`TodoTask` |
| 来料检验 | `IncomingInspection`、`IncomingInspectionResult`、`server/src/modules/incoming-inspection/`、`client/src/views/incoming-inspection/IncomingInspectionList.vue` |
| 检验标准 | `InspectionStandard`、`InspectionItem`，当前仅 Prisma model，缺业务 API 和页面 |
| 产品/批次留样 | `Sample`，当前仅 Prisma model，缺业务 API 和页面 |
| 产品、配方与 HACCP | `Product`、`Recipe`、`RecipeLine`、`ProcessStep`、`CCPPoint`、`CCPRecord` |
| 偏差报告 | `DeviationReport`、`server/src/modules/deviation/`、`client/src/views/deviation/*` |
| 追溯查询与快照 | `TraceabilityQueryService`、`TraceabilitySnapshot`、`TraceabilityExportService`、`client/src/views/traceability/TraceabilityQuery.vue` |
| 供应商与资质 | `Supplier`、`SupplierQualification`、`SupplierDocument`、`client/src/views/warehouse/SupplierList.vue` |
| 供应商评价 | `SupplierEvaluation`、`server/src/modules/supplier-evaluation/`、`client/src/views/supplier-evaluation/EvaluationList.vue` |
| 外部方/客户/承运商 | `ExternalParty`、`server/src/modules/external-party/`、`client/src/views/external-party/ExternalPartyList.vue` |
| 顾客投诉 | `CustomerComplaint`、`server/src/modules/customer-complaint/`、`client/src/views/customer-complaint/CustomerComplaintList.vue` |
| 产品召回 | `ProductRecall`、`ProductRecallBatch`、`ProductRecallNotification`、`ProductRecallEvidence` |
| 发货/销售出库追溯 | `DeliveryNote`，当前主要作为 Prisma model 和追溯查询节点，缺独立 CRUD/API/页面 |
| 用户、部门与权限 | `User`、`Department`、`Role`、`client/src/views/user/UserList.vue`、`client/src/views/department/DepartmentList.vue` |
| 培训 | `TrainingPlan`、`TrainingProject`、`server/src/modules/training/`、`client/src/views/training/*` |
| 来访与应急 | `VisitorRecord`、`EmergencyDrillRecord`、`client/src/views/visitor-record/VisitorRecordList.vue`、`client/src/views/emergency-drill/EmergencyDrillList.vue` |
| 食品安全文化 | `FoodSafetyCultureRecord`、`client/src/views/food-safety-culture-record/FoodSafetyCultureRecordList.vue` |

---

## 制造部逐表审计

源目录：`/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单/制造部`  
当前源 Markdown 数：74。

| # | 源表单 | 已有轮子 | 判定 | 落地动作 | 落地后的效果 |
|---:|---|---|---|---|---|
| 1 | 不合格品评审处置记录 | `NonConformance`、`ReworkRecord`、`CorrectiveAction`、`Product`、`ProductionBatch` | 复用并补字段 | 不新建评审处置模型；补处置意见、多部门会签、返工后检验结论；批次和产品走 FK | 不合格可进入处置、返工、CAPA 和追溯链 |
| 2 | 工器具设施设备清洗消毒记录表 | `CleaningRecord`、`Equipment`、`WorkshopArea`、`User` | 复用并补字段 | `CleaningRecord` 增加目标对象 FK、明细项、执行/核验人 | 设备/工器具清洁可按区域、设备、责任人查询 |
| 3 | 工艺、配料变更、复称、评估、验证记录 | `ChangeEvent`、`ProductProcessChangePlan`、`ChangeVerificationRecord`、`ChangeComplianceRecord`、`ApprovalInstance` | 直接复用为主，补页面 | 不新增变更评审表；变更申请、复称、验证分别进入已有变更链 | 审核时从一个 ChangeEvent 看申请、审批、执行、验证和附件 |
| 4 | 带标签废弃物处理记录表 | `WasteDisposalRecord`、`Material`、`MaterialBatch`、`ExternalParty` | 复用并补字段 | 废弃物物料和批次走 FK，收运单位走 `ExternalParty` | 废弃物处理可追到批次、物料和收运方 |
| 5 | 废蛋糕出入库记录表 | `WasteRecord`、`InventoryMovement`、`ProductionBatch` | 复用并拆分 | 废蛋糕数量进 `WasteRecord`；入出库动作进 `InventoryMovement` | 废料不再是孤立台账，可参与损耗和物料平衡 |
| 6 | 投料打料记录-坚果牛奶咸蛋糕 | `ProductionBatch`、`BatchMaterialUsage`、`MaterialBatch`、`EnvironmentRecord`、`CalibrationRecord`、`MixingWorkbench` | 复用并拆分 | 投料进批次投料；温湿度进环境；称量校准进校准；人员用 `User` | 投料、环境、校准、人员责任全部结构化 |
| 7 | 投料打料记录-提拉米苏小蛋糕 | 同 #6 | 复用并拆分 | 同 #6，按产品预设配方和物料项 | 同 #6 |
| 8 | 投料打料记录-椰丝 | 同 #6 | 复用并拆分 | 同 #6 | 同 #6 |
| 9 | 投料打料记录-椰奶 | 同 #6 | 复用并拆分 | 同 #6 | 同 #6 |
| 10 | 投料打料记录-老华侨蛋糕 | 同 #6 | 复用并拆分 | 同 #6 | 同 #6 |
| 11 | 投料打料记录-肉松 | 同 #6 | 复用并拆分 | 同 #6 | 同 #6 |
| 12 | 投料打料记录-肉松鸡蛋糕 | 同 #6 | 复用并拆分 | 同 #6 | 同 #6 |
| 13 | 投料打料记录-芝士咸蛋糕 | 同 #6 | 复用并拆分 | 同 #6 | 同 #6 |
| 14 | 投料打料记录-钙奶棒 | 同 #6 | 复用并拆分 | 同 #6 | 同 #6 |
| 15 | 投料打料记录-香蕉蒸蛋糕（原味） | 同 #6 | 复用并拆分 | 同 #6，注意蒸蛋糕产品线和回料字段 | 同 #6，回料能进入返工链 |
| 16 | 投料打料记录-香蕉蒸蛋糕（香蕉味） | 同 #6 | 复用并拆分 | 同 #15 | 同 #15 |
| 17 | 投料打料记录-鸡蛋糕 | 同 #6 | 复用并拆分 | 同 #6 | 同 #6 |
| 18 | 报表领用记录登记表 | `Document` 已有；文控操作台账缺口 | 新增领域模型或补文控子表 | 不建动态表单；新增 `DocumentOperation`/发放记录能力，关联受控文件版本和领用人 | 空白记录表领用可审计、可按文件版本追踪 |
| 19 | 日常清洁记录表（中段） | `CleaningRecord` | 复用并补字段 | 增加清洁项目明细、区域 FK、班次/责任人 | 中段清洁结果可按项目和日期追踪 |
| 20 | 日常清洁记录表（出炉间） | `CleaningRecord`、`Equipment` | 复用并补字段 | 清洁项目可关联设备或区域 | 出炉间设备和环境清洁形成同一清洁台账 |
| 21 | 日常清洁记录表（化学储藏间） | `CleaningRecord`、`WorkshopArea` | 复用并补字段 | 门锁检查作为清洁/合规明细项，不新建温控/安全表 | 化学储藏间清洁和安全检查一起留痕 |
| 22 | 日常清洁记录表（小料房） | `CleaningRecord` | 复用并补字段 | 用清洁明细项承接 20+ 项检查 | 小料房高频检查不需要专页 |
| 23 | 日常清洁记录表（投料搅料间） | `CleaningRecord` | 复用并补字段 | 同 #22 | 投料搅料间清洁按区域统计 |
| 24 | 日常清洁记录表（晾桶间） | `CleaningRecord` | 复用并补字段 | Part A/Part B 都作为清洁明细，紫外线消毒为明细类型 | 清洁与 UV 消毒同一入口查询 |
| 25 | 日常清洁记录表（果酱房） | `CleaningRecord`、`Equipment` | 复用并补字段 | 三区域结构落为明细分组，抽料泵等目标可关联设备 | 果酱房专属清洁不需要单独页面 |
| 26 | 日常清洁记录表（烤蛋糕后段） | `CleaningRecord`、`Equipment` | 复用并补字段 | 传送带、金探仪、包装机等作为目标对象 | 后段设备清洁可与设备台账联动 |
| 27 | 日常清洁记录表（物料暂存间） | `CleaningRecord`、`WorkshopArea` | 复用并补字段 | 区域固定/可选，清洁项明细化 | 物料暂存间清洁可审计 |
| 28 | 日常清洁记录表（称油间） | `CleaningRecord` | 复用并补字段 | 同清洁明细策略 | 称油间清洁复用统一清洁页 |
| 29 | 日常清洁记录表（筛粉间） | `CleaningRecord`、`Equipment` | 复用并补字段 | 排风口、过滤器、筛网相关项关联设备或目标名 | 筛粉间清洁和设备维护可互相跳转 |
| 30 | 日常清洁记录表（蒸蛋糕后段） | `CleaningRecord`、`Equipment` | 复用并补字段 | 同 #26 | 蒸蛋糕后段清洁不单独造页 |
| 31 | 日常清洁记录表（进炉间） | `CleaningRecord` | 复用并补字段 | 同清洁明细策略 | 进炉间清洁统一查询 |
| 32 | 日常清洁记录表（通用） | `CleaningRecord`、`WorkshopArea` | 复用并补字段 | 作为通用清洁模板/预设，不建动态模板运行时 | 未设专页区域也能用统一清洁记录 |
| 33 | 日常清洁记录表（酒精房） | `CleaningRecord` | 复用并补字段 | 酒精房作为区域预设 | 酒精房清洁统一纳入现场清洁台账 |
| 34 | 日常清洁记录表（鸡蛋房） | `CleaningRecord`、`EnvironmentRecord` | 复用并拆分 | 清洁进 `CleaningRecord`，温度等环境项进 `EnvironmentRecord` | 鸡蛋房清洁和温控分别统计 |
| 35 | 果酱房半成品入库记录表 | `ProductionBatch`、`InventoryMovement`、`MaterialBalance` | 复用并补页面 | 半成品作为生产批次/产出移动；不要新建果酱入库表 | 半成品入库进入库存移动和物料平衡 |
| 36 | 果酱房果酱投料打料过程记录表（原味） | `BatchMaterialUsage`、`ProcessMonitorRecord`、`EnvironmentRecord` | 复用并拆分 | 投料、加热温度、包装温度、环境分别落已有记录 | 果酱工序可追批次和过程参数 |
| 37 | 果酱房果酱投料打料过程记录表（香蕉味） | 同 #36 | 复用并拆分 | 同 #36 | 同 #36 |
| 38 | 每日库存盘点记录表 | `StockCount`、`InventoryMovement`、`MaterialBatch` | 复用并补页面 | 使用数量/领取数量进库存移动，盘点进 `StockCount` | 每日库存能进入账实差异和物料平衡 |
| 39 | 每日鸡蛋车间表 | `MaterialBatch`、`InventoryMovement`、`StockCount`、`EnvironmentRecord`、`CleaningRecord`、`WasteRecord` | 复用并拆分 | 鸡蛋批次、领用、消毒、温控、蛋壳废料拆到已有模块 | 鸡蛋流转、消毒、温控、废料可分别统计 |
| 40 | 烤炉过程记录表 | `ProcessMonitorRecord`、`CCPRecord`、`ProductionBatch`、`Equipment` | 复用并补字段 | 炉速、风机速度、炉区温度作为过程参数或 CCP 点 | 烤炉参数可趋势分析，超限可触发异常 |
| 41 | 烤蛋糕车间紫外线灯状态日常检查表 | `Equipment`、`MaintenanceRecord`、`EquipmentFault` | 复用并补页面 | UV 灯作为设备，检查作为维保/巡检记录，异常生成报修 | UV 灯状态进入设备台账和维修闭环 |
| 42 | 特殊材料使用风险评估及审批记录 | `Material`、`FragileItemInspection`、`ApprovalInstance`、`NonConformance` | 复用为主，必要时新增合规评估 | 不新增 HazardAssessment；优先作为合规检查/特殊材料风险评估，关联物料和审批 | 特殊材料从申请、评估、审批、使用、报废形成闭环 |
| 43 | 玻璃及硬塑制品检查表 | `FragileItemInspection`、`WorkshopArea`、`User` | 直接复用，补字段 | 补风险等级、检查方式、预设数量、破损处置 | 易碎品完整性检查符合 BRCGS 证据链 |
| 44 | 班后检查表 | `CleaningRecord`、`ViolationRecord`、`WasteRecord`、`Equipment`、`EmergencyDrillRecord` | 复用并拆分 | 班后检查不是单表；各项拆进清洁、违规、废弃物、设备异常、紧急事件 | 班后检查变成班次收尾工作台，而不是平行记录 |
| 45 | 生产斗数记录表 | `ProductionBatch`、`ProductionRun`、`InventoryMovement` | 复用并补字段 | 斗数、实际产出、入库量进入生产批次/生产运行 | 产量可关联计划、批次和成品入库 |
| 46 | 生产清场记录表 | `CleaningRecord`、`LineChangeCheckRecord` | 复用并补字段 | 清场检查项进入清洁明细，换产前关联 `LineChangeCheckRecord` | 清场成为换产/启动前检查证据 |
| 47 | 生产线换产启动前检查确认记录 | `LineChangeCheckRecord`、`Product`、`ProductionRun`、`CleaningRecord`、`MetalDetectionLog` | 直接复用，补字段 | 补人员到位、物料准备、首件确认、过敏原清洁等字段 | 换产检查从产品切换、清洁、金检到首件确认可追 |
| 48 | 生产计划 | `ProductionRun`、`ProductionBatch`、`Product`、`Recipe` | 复用并补页面 | 不新增生产计划表；用生产运行/批次计划字段承接 | 计划可推进到批次、投料、产出 |
| 49 | 筛粉间排风口过滤布及电机更换记录表 | `Equipment`、`MaintenanceRecord` | 直接复用，补设备预设 | 排风口过滤袋/电机作为设备或维护对象 | 更换记录进入设备维保历史 |
| 50 | 筛网、过滤器清洁记录 | `CleaningRecord`、`Equipment`、`NonConformance` | 复用并补字段 | 筛网目数、是否破损、筛上物异常作为清洁/异常明细 | 过滤器清洁和异物异常可关联 CAPA |
| 51 | 纠正与整改记录 | `CorrectiveAction`、`NonConformance`、`Product`、`ProductionBatch` | 直接复用，补关联 | 相关产品/批次必须 FK，效果验证走 verification records | 整改闭环进入 CAPA，不另建整改表 |
| 52 | 脚底清洁池消毒记录表 | `CleaningRecord`、`WorkshopArea` | 复用并补字段 | 浓度、更换时间、首次使用时间作为清洁/消毒明细 | 脚底池消毒可按区域和浓度查询 |
| 53 | 臭氧机启动关停与浓度记录表 | `Equipment`、`CleaningRecord`、`CalibrationRecord`、`MaintenanceRecord` | 复用并拆分 | 启停/消毒进清洁记录，浓度测量进校准/测量，设备状态进维保 | 臭氧消毒和浓度确认可审计 |
| 54 | 蒸炉过程记录表 | `ProcessMonitorRecord`、`CCPRecord`、`ProductionBatch`、`Equipment` | 复用并补字段 | 十二区温度、炉速、风机速度作为过程参数 | 蒸炉参数趋势和超限处理可统计 |
| 55 | 蒸蛋糕-面浆打发成型记录表 | `ProcessMonitorRecord`、`BatchMaterialUsage`、`PackagingMaterialUsage`、`ReworkRecord`、`EnvironmentRecord`、`CalibrationRecord` | 复用并拆分 | 不建面浆表；按过程、投料、包材、回料、环境、校准拆分 | 面浆工序数据进入批次追溯和过程监控 |
| 56 | 蒸蛋糕车间紫外线灯状态日常检查表 | `Equipment`、`MaintenanceRecord`、`EquipmentFault` | 复用并补页面 | 同 #41，按蒸蛋糕车间设备预设 | UV 灯异常进入设备闭环 |
| 57 | 蛋糕包装机用膜跟进记录表 | `PackagingMaterialUsage`、`Equipment`、`CalibrationRecord`、`ProcessMonitorRecord`、`NonConformance` | 复用并补字段 | 膜用量进包材用量，包装机温度进过程参数，漏气/废品进不合格 | 包材消耗、设备参数、包装异常可统计 |
| 58 | 计量器具内部校正记录表 | `MeasuringEquipment`、`CalibrationRecord` | 直接复用，补字段 | 五点读数和砝码规格进入校准记录明细 | 计量器具校正可到期提醒和历史查询 |
| 59 | 车间人员一次性物品领用使用记录表 | `Material`、`InventoryMovement`、`ViolationRecord`、`User` | 复用并补字段 | 一次性用品作为物料，领用使用进入库存移动；异常更换可生成违规/异常 | 一次性物品消耗可统计，不混入投料 |
| 60 | 车间人员用药登记表 | `MedicationRecord`、`User`、`WorkshopArea` | 直接复用，补字段 | 药名、原因、服药时间、适岗评估进入用药记录 | 用药与上岗适宜性可查 |
| 61 | 车间内包膜间消毒记录表 | `CleaningRecord`、`WorkshopArea` | 复用并补字段 | 消毒方式、起止时间、执行/监督人进入清洁明细 | 内包膜间消毒统一进清洁台账 |
| 62 | 车间冰柜温控记录表 | `EnvironmentRecord`、`Equipment`、`MeasuringEquipment` | 复用并补字段 | 不新增 TemperatureLog；让 `EnvironmentRecord` 支持设备/区域温控和非批次记录 | 冷柜温控可按设备趋势分析 |
| 63 | 车间参数配方修改记录表 | `ChangeEvent`、`ProductProcessChangePlan`、`Recipe`、`ProcessStep` | 直接复用，补页面 | 参数/配方修改走变更事件和变更执行 | 参数变更不再散落在记录表 |
| 64 | 车间员工违规处理表 | `ViolationRecord`、`CorrectiveAction`、`User` | 直接复用，补字段 | 违规级别、员工确认、整改验证进入违规记录 | 员工违规可跟踪整改和复发 |
| 65 | 车间废纸托登记记录表 | `WasteRecord`、`PackagingMaterialUsage`、`Material` | 复用并补字段 | 纸托作为包材物料，废弃重量进废料记录/包材废弃量 | 包材损耗进入成本和废弃统计 |
| 66 | 车间成品产出入库表 | `ProductionBatch`、`InventoryMovement`、`MaterialBalance` | 复用并补页面 | 产出量进批次，入库动作进库存移动 | 成品产出和入库进入物料平衡 |
| 67 | 车间新风口过滤布更换记录 | `Equipment`、`MaintenanceRecord`、`WorkshopArea` | 直接复用，补设备预设 | 新风口位置作为设备/区域，更换记录进维保 | 新风口过滤布可按设备维护周期管理 |
| 68 | 配料记录表（小料） | `BatchMaterialUsage`、`MaterialBatch`、`EnvironmentRecord`、`CalibrationRecord`、`ProductionBatch` | 复用并拆分 | 配料、性状检查、环境、校准拆分；性状可补投料检查字段 | 小料配料参与批次追溯 |
| 69 | 配料记录表（果酱房） | 同 #68 + `ProcessMonitorRecord` | 复用并拆分 | 果酱过程参数进入过程记录 | 果酱配料和过程可追 |
| 70 | 配料记录表（筛粉） | 同 #68 | 复用并拆分 | 筛粉用量、性状、环境拆分 | 筛粉原料批次参与追溯 |
| 71 | 配料记录表（配油） | 同 #68 | 复用并拆分 | 油脂/固体辅料按物料批次投料 | 配油消耗进入追溯和库存 |
| 72 | 金属探测机检测记录表 | `MetalDetectionLog`、`Equipment`、`CalibrationRecord`、`NonConformance`、`CorrectiveAction` | 直接复用，补字段 | 测试块校准、首末检、异物异常分别落金检、校准、不合格/CAPA | 金检证据链完整，异常能闭环 |
| 73 | 面浆打发成型记录表 | `ProcessMonitorRecord`、`PackagingMaterialUsage`、`BatchMaterialUsage`、`ReworkRecord`、`EnvironmentRecord`、`CalibrationRecord` | 复用并拆分 | 同 #55，按业务事实拆开 | 打发成型从过程、投料、包材、回料四条链路沉淀 |
| 74 | 风箱过滤布更换记录表 | `Equipment`、`MaintenanceRecord`、`CleaningRecord` | 直接复用，补设备预设 | 过滤布作为设备维护对象，更换记录进维保 | 风箱过滤布纳入设备维护周期 |

---

## 制造部首轮结论

1. 制造部不需要新增大而全的 `ManufacturingForm`、`ProductionRecord` 或动态记录表。
2. 74 张表里大部分可以复用已建模块，核心动作是补字段、补 FK、补明细项、补详情入口。
3. 必须新增或补强的不是“表单模型”，而是少数领域能力：
   - 文控操作台账：承接报表/空白表单领用。
   - 清洁明细项：承接大量日常清洁检查项。
   - 投料/混料明细增强：承接性状检查、锅次、复核、称量校准联动。
   - 环境记录非批次场景：承接冷柜、区域温湿度、消毒空间温控。
   - 特殊材料风险评估：优先作为合规检查/审批能力，不新增 `HazardAssessment`，除非后续品质部也证明该对象有独立生命周期。
4. 制造部落地后的效果不是“多 74 个页面”，而是现有生产、投料、环境、过程、清洁、设备、变更、不合格、CAPA、废弃物、包材模块变得能覆盖这些源表单。

---

## 品质部逐表审计

源目录：`/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单/品质部`  
当前源 Markdown 数：75；另有 1 个外检报告 `.docx`，作为 `BusinessDocumentLink` 附件处理，不作为独立业务表。  
字段映射来源：`03-字段映射表-品质部1.md` 到 `03-字段映射表-品质部4.md`。

代码事实补充：

1. 当前存在并可复用：`IncomingInspection`、`Sample`、`InspectionStandard`、`NonConformance`、`CorrectiveAction`、`DeviationReport`、`ProductRecall`、`ReworkRecord`、`EnvironmentRecord`、`CleaningRecord`、`ProcessMonitorRecord`、`MeasuringEquipment`、`CalibrationRecord`、`Product`、`Recipe`、`CCPPoint`、`CCPRecord`、`ChangeEvent`、`ChangeVerificationRecord`、`ChangeComplianceRecord`、`FoodSafetyCultureRecord`、`Document`、`BusinessDocumentLink`、`TraceabilitySnapshot`。
2. 当前不存在或已在 API contract cleanup 中删除：`ManagementReview`、`InternalAudit`、`AuditRecord`、`TraceabilityDrill`、`FoodSafetyObjective`、`HazardAssessment`、`MaterialInspection`、通用 `Inspection`。
3. 因此品质部不能按旧 model-landing 的 `HazardAssessment / AuditRecord / Inspection / MaterialInspection` 直接造表；必须先复用现有轮子，再用少数共享业务能力补空缺。

| # | 源表单 | 已有轮子 | 判定 | 落地动作 | 落地后的效果 |
|---:|---|---|---|---|---|
| 1 | BRCGS产品风险区判定记录 | `Product`、`WorkshopArea`、`User`；无当前 `HazardAssessment` | 新增共享合规评估能力 | 不新增 `HazardAssessment`；产品基础字段进 `Product`，风险区问卷和结论进入共享食品安全评估对象 | 产品风险区有版本化判定证据，且能回到产品主数据 |
| 2 | 一般原辅料检验报告 | `IncomingInspection`、`IncomingInspectionResult`、`MaterialBatch`、`Material`、`Supplier`、`InspectionStandard` | 复用并补字段 | 来料检验结果进 `IncomingInspection`；补检验类型、标准、规格、供应商快照和报告附件 | 普通原辅料检验不新建报告表，能关联物料批次和供应商 |
| 3 | 临界点分析报告 | `CCPRecord`、`DeviationReport`、`NonConformance`、`CorrectiveAction`、`ProductionBatch` | 复用并拆分 | 临界值偏离先进 `DeviationReport`/`CCPRecord`；达到不合格条件再生成 `NonConformance` 和 CAPA | 临界点异常从监控、偏差、NC 到 CAPA 串起来 |
| 4 | 产品放行授权书 | `ProductionBatch.released_by/released_at`、`ApprovalInstance`、`User`、`BusinessDocumentLink` | 复用并补页面 | 批次放行状态使用批次字段；授权书作为人员授权或受控文件附件；补放行授权入口 | 批次放行不是孤立文档，能直接约束出库和销售 |
| 5 | 产品检验报告 | `Product`、`ProductionBatch`、`Sample`、`InspectionStandard`、`NonConformance`；无成品检验运行表 | 新增共享检验能力 | 新增一个共享 `QualityInspection` 类能力承接成品/半成品/水分/微生物检验；失败生成 NC/CAPA | 成品检验报告成为批次质量判定来源，不复用来料检验模型硬塞 |
| 6 | 产品过敏原清单 | `Product.label_allergens`、`RecipeLine`、`Material`、`BusinessDocumentLink` | 复用并补字段 | 过敏原结论归 `Product`；原料过敏原从 `Material`/配方行汇总；清单附件挂产品 | 产品详情可直接看到过敏原来源和标签声明 |
| 7 | 保质期实验记录 | `Product`、`Sample`、`EnvironmentRecord`、共享 `QualityInspection` 缺口 | 复用并补共享检验能力 | 样品生命周期进 `Sample`；储存环境进 `EnvironmentRecord`；实验结果进共享检验能力 | 保质期实验能按产品、批次、样品和储存条件追踪 |
| 8 | 保质期检验记录 | `Product`、`Sample`、共享 `QualityInspection` 缺口 | 复用并补共享检验能力 | 周期检验记录挂样品和产品；不合格进入 NC/CAPA | 保质期到期前后的检验结论可沉淀为产品质量证据 |
| 9 | 内包装材料检验报告 | `IncomingInspection`、`MaterialBatch`、`Material`、`Supplier` | 复用并补字段 | 作为包材来料检验类型；补卷/箱单位、外观/色泽明细、标准附件 | 内包装检验与入库批次联动 |
| 10 | 内审实施计划表 | `CorrectiveAction.trigger_type='internal_audit'`；当前无 `InternalAudit` | 新增领域模型 | 新增一个合规审核能力承接计划、检查、报告；不得直接恢复旧 `InternalAudit` 表结构；发现项转 NC/CAPA | 内审计划、检查表、报告形成同一审计闭环 |
| 11 | 内审检查表 | 同 #10、`Department`、`User`、`CorrectiveAction` | 新增领域模型 | 检查条款和证据进入审计明细；不符合项生成 NC/CAPA | 审核证据可按部门、条款、整改状态查询 |
| 12 | 内部审核报告 | 同 #10、`CorrectiveAction` | 新增领域模型 | 报告汇总审计计划、检查项和发现项；整改措施进 CAPA | 内审报告不再是孤立文档，能追踪整改闭环 |
| 13 | 创可贴批次检测记录表 | `Material`、`MaterialBatch`、`IncomingInspection`、`MeasuringEquipment` | 复用并补字段 | 创可贴作为物料批次；金检机作为测量设备引用；多次测试结果用检验明细承接 | 创可贴批次和检测设备都可追 |
| 14 | 前提方案（PRP）验证记录 | `ChangeVerificationRecord`、`CorrectiveAction`；周期性 PRP 无独立轮子 | 新增共享合规验证能力 | 变更触发的 PRP 验证走 `ChangeVerificationRecord`；周期性验证进入共享合规评估/验证对象 | PRP 验证与整改闭环统一，不按每张表造模型 |
| 15 | 化学品使用记录 | `Material`、`InventoryMovement`、`WasteRecord`、`User` | 复用并补字段 | 化学品作为受控物料；领用/退回走库存移动；废弃进废弃物模块 | 化学品出入和使用有库存与责任人记录 |
| 16 | 化验室仪器使用记录 | `MeasuringEquipment`、`CalibrationRecord`；缺使用日志 | 复用并补测量设备子能力 | 在测量设备模块补使用/清洁/异常日志，不新建化验室仪器表 | 仪器使用、校准、异常能在同一设备详情查看 |
| 17 | 化验室仪器设备检定表 | `MeasuringEquipment`、`CalibrationRecord` | 直接复用，补字段 | 检定周期、机构、证书号、到期日进入校准记录 | 化验室设备到期检定可提醒 |
| 18 | 化验室及车间仪器设备检定记录表（外检报告） | `MeasuringEquipment`、`CalibrationRecord`、`BusinessDocumentLink` | 直接复用，补附件 | 外检报告 `.docx`/扫描件作为校准证书附件 | 外检证据跟随设备和校准记录 |
| 19 | 化验室日报表 | `Sample`、`Product`、`ProductionBatch`、共享 `QualityInspection` 缺口 | 新增共享检验能力 | 把日报表拆成检验批次/样品结果汇总；日报视图由检验结果派生 | 日报可由检验数据汇总，不维护第二套结果 |
| 20 | 化验室设备运行一览表 | `MeasuringEquipment`、`MaintenanceRecord`、`CalibrationRecord` | 复用并补页面 | 每日运行状态作为测量设备巡检/维护记录；异常生成维修或 CAPA | 化验室设备运行状态进入设备闭环 |
| 21 | 半成品检验报告 | `ProductionBatch`、`Sample`、共享 `QualityInspection` 缺口 | 新增共享检验能力 | 半成品作为生产批次阶段或样品；检验项进入共享检验能力 | 半成品检验可影响后续放行和返工 |
| 22 | 卫生月检表 | `CleaningRecord`、`EnvironmentRecord`、`CorrectiveAction` | 复用并拆分 | 清洁/卫生检查进 `CleaningRecord`；水质/微生物进环境或检验；问题进 CAPA | 月检从一张表拆成现场、环境和整改证据 |
| 23 | 危害分析工作单 | `Product`、`Recipe`、`ProcessStep`、`CCPPoint`、`ProductProcessChangePlan` | 复用并补页面 | 危害分析不进 `HazardAssessment`；通过产品工艺/CCP 配置承接 | HACCP 危害分析能直接生成或校验 CCP 点 |
| 24 | 危害控制计划确认、验证记录 | `CCPPoint`、`CCPRecord`、`ChangeVerificationRecord`、`ChangeComplianceRecord` | 复用并补字段 | 控制计划本体落 CCP；确认/验证结论落变更验证或合规验证 | CCP 控制计划和验证证据互相可追 |
| 25 | 原料包装留样记录 | `MaterialBatch`、`IncomingInspection`、`BusinessDocumentLink`；`Sample` 仅支持生产批次 | 复用并补字段 | 包装留样先挂物料批次/来料检验附件；必要时扩展 `Sample` 支持 material_batch | 原料包装照片和批次入厂检验绑定 |
| 26 | 原料过敏原分析 | `Material`、`SupplierDocument`、`Product.label_allergens`、共享合规评估缺口 | 复用并补共享评估 | 原料过敏原属性归 `Material`；分析证据作为评估记录或供应商文件 | 过敏原从原料到产品标签可汇总 |
| 27 | 原料风险评估记录 | `Material`、`SupplierEvaluation`、`SupplierDocument`；无当前 `HazardAssessment` | 新增共享合规评估能力 | 建共享食品安全评估对象承接原料风险、食品欺诈、控制措施；关联物料和供应商 | 原料风险评级可影响来料检验频率和供应商准入 |
| 28 | 原辅料原始检验台账 | `IncomingInspection`、`MaterialBatch`、`Material`、`Supplier` | 直接复用，补列表视图 | 用来料检验列表按原辅料、供应商、日期汇总；不建台账表 | 台账成为检验数据的查询视图 |
| 29 | 变更申请表 | `ChangeEvent`、`ApprovalInstance`、`ChangeVerificationRecord` | 直接复用，补字段 | 变更类型、原因、影响、相关部门意见走 `ChangeEvent` 和审批 | 品质变更进入统一变更链 |
| 30 | 外包装材料检验报告 | `IncomingInspection`、`MaterialBatch`、`Material`、`Supplier` | 复用并补字段 | 作为包材来料检验类型；补外观、色泽、规格明细 | 外包装检验与供应商和物料批次关联 |
| 31 | 微检室温湿度记录 | `EnvironmentRecord`、`WorkshopArea` | 复用并补字段 | 让 `EnvironmentRecord` 支持非生产批次、实验室区域和多时段记录 | 微检室温湿度可按区域趋势查询 |
| 32 | 意外事故调查报告 | `NonConformance`、`CorrectiveAction`、`EmergencyDrillRecord`、`ProductionBatch`、`MaterialBatch` | 复用并拆分 | 事故主体进 `NonConformance`；整改进 CAPA；涉及演练或应急复盘时关联应急演练 | 意外事故能影响批次隔离、风险评估和整改 |
| 33 | 承诺声明完整性控制记录表 | `Product`、`Supplier`、`Document`、`BusinessDocumentLink`、`ChangeVerificationRecord`、`CorrectiveAction` | 复用并补共享评估 | 声明文件走文控链接；验证和供应链风险走共享合规评估；整改进 CAPA | 原产地、过敏原、有机等声明有文件和验证证据 |
| 34 | 样品留样检测及处理记录表 | `Sample`、共享 `QualityInspection`、`WasteRecord` | 复用并补页面 | 留样生命周期进 `Sample`；阶段检测进共享检验；到期处理进废弃物 | 留样从留存、复检到销毁可追踪 |
| 35 | 每周食品安全排查治理表 | `NonConformance`、`CorrectiveAction`、`FoodSafetyCultureRecord`；无 `AuditRecord` | 新增共享现场/合规检查能力 | 周排查清单作为 `ComplianceAudit`/现场检查类型；问题转 NC/CAPA | 周排查不散落在记录表，能看整改状态 |
| 36 | 每日食品安全检查表 | `CleaningRecord`、`EnvironmentRecord`、`ProcessMonitorRecord`、`NonConformance`、`CorrectiveAction` | 复用并拆分 | 清洁、环境、过程、异常分别落已有模块；需要一个日检查工作台汇总 | 每日检查成为聚合入口，而不是第二套事实表 |
| 37 | 每月食品安全调度会议纪要 | `FoodSafetyCultureRecord`、`NonConformance`、`CorrectiveAction`、`User` | 复用并补字段 | 会议作为食品安全文化/会议活动；风险和措施分别关联 NC/CAPA | 月度会议能看到风险、措施和责任闭环 |
| 38 | 油脂类来料检验报告 | `IncomingInspection`、`MaterialBatch`、`Material`、`Supplier` | 复用并补字段 | 作为油脂物料的来料检验类型；酸价/过氧化值等为检验明细 | 油脂检验与物料批次和供应商联动 |
| 39 | 消毒水余氯测试记录表 | `CleaningRecord`、`WorkshopArea`、`CorrectiveAction` | 复用并补字段 | 消毒水浓度、检测点、标准范围进清洁/消毒明细 | 消毒水浓度异常可触发 CAPA |
| 40 | 温度、湿度记录 | `EnvironmentRecord`、`WorkshopArea` | 复用并补字段 | 支持非生产批次和多区域多时段；班别/班次作为记录属性 | 环境温湿度按区域、班次趋势分析 |
| 41 | 生产用水内检原始记录 | `EnvironmentRecord`、`ProcessMonitorRecord`、共享 `QualityInspection` 缺口 | 新增共享检验能力 | 水质理化/微生物检测进共享检验；采样点进区域/点位 | 生产用水检测可按点位和项目追踪 |
| 42 | 留样记录 | `Sample`、`Product`、`ProductionBatch`、`EnvironmentRecord`、`WasteRecord` | 复用并补页面 | 留样数量、期限、存放环境进 `Sample` 和环境记录；处理进废弃物 | 留样台账成为样品生命周期视图 |
| 43 | 百分之一天平使用校准记录 | `MeasuringEquipment`、`CalibrationRecord` | 直接复用，补字段 | 使用前校准和使用记录进入校准/设备使用明细 | 天平使用与校准证据合并查看 |
| 44 | 监视测量设施校准计划表 | `MeasuringEquipment`、`CalibrationRecord` | 直接复用，补计划视图 | 校准频率、计划日期、实际日期和结果进测量设备模块 | 校准计划和实际记录形成到期提醒 |
| 45 | 监视设备台账表 | `MeasuringEquipment`、`CalibrationRecord` | 直接复用，补统计 | 台账字段进入测量设备；购置金额和数量可作为扩展字段或统计视图 | 测量设备台账、校准、状态统一管理 |
| 46 | 产品开发部工作总结 | `Document`、`CorrectiveAction`；当前无 `ManagementReview` | 新增管理评审能力 | 作为管理评审输入，不建部门总结表；链接到管理评审年度包 | 部门总结进入年度管理评审证据包 |
| 47 | 公司工作总结 | 同 #46 | 新增管理评审能力 | 同 #46 | 公司总结成为管理评审输入 |
| 48 | 制造部、仓储组、工程部工作总结 | 同 #46、`Department` | 新增管理评审能力 | 按部门输入挂到同一年度管理评审 | 多部门输入统一汇总 |
| 49 | 品质部工作总结 | 同 #46 | 新增管理评审能力 | 同 #46 | 品质部年度质量表现可进入评审报告 |
| 50 | 管理评审 | `Document`；当前 `ManagementReview` 已删除 | 新增管理评审能力 | 用新的管理评审域对象承接年度、会议、输入、输出、整改；不得直接恢复旧 `ManagementReview` 表结构；附件走文控 | 管理评审从文件包升级为可追踪业务流程 |
| 51 | 管理评审会议纪要 | `Document`、`User`、`Department`；无当前 `ManagementReview` | 新增管理评审能力 | 会议纪要作为管理评审会议节点；参会人员用 `User`/部门 | 会议结论和后续措施可追踪 |
| 52 | 管理评审报告 | `CorrectiveAction`、`Document`；无当前 `ManagementReview` | 新增管理评审能力 | 报告输出挂管理评审；改进措施生成 CAPA | 管理评审输出直接进入整改闭环 |
| 53 | 管理评审计划 | `Document`、`User`；无当前 `ManagementReview` | 新增管理评审能力 | 计划、时间、提交截止日和评审项进入管理评审对象 | 管理评审有计划、输入、会议、报告完整生命周期 |
| 54 | 营销部工作总结 | `Document`、`Department`；无当前 `ManagementReview` | 新增管理评审能力 | 作为管理评审部门输入 | 营销输入能与投诉、客户反馈关联 |
| 55 | 行政人事部工作总结 | 同 #54 | 新增管理评审能力 | 作为管理评审部门输入 | 人员、培训和资源输入纳入评审 |
| 56 | 采购部工作总结 | 同 #54、`SupplierEvaluation` | 新增管理评审能力 | 作为管理评审部门输入，可引用供应商评估 | 采购输入能追到供应商表现 |
| 57 | 糖类检验报告 | `IncomingInspection`、`MaterialBatch`、`Material`、`Supplier` | 复用并补字段 | 糖类检验作为来料检验类型；组织形态、色泽等为明细项 | 糖类检验纳入来料检验台账 |
| 58 | 紧急采购物资使用评估放行审批表 | `MaterialBatch`、`IncomingInspection`、`ApprovalInstance`、`SupplierEvaluation`、`NonConformance` | 复用并补页面 | 紧急采购走物料批次状态和审批；检验不充分时标记条件放行 | 紧急物资可审批放行并保留后续风险跟踪 |
| 59 | 自来水余氯检查表 | `EnvironmentRecord`、`ProcessMonitorRecord`、`WorkshopArea` | 复用并补字段 | 水点 pH/余氯作为非批次环境/过程监测；异常转 NC/CAPA | 自来水监测可按点位和班次追踪 |
| 60 | 药品出入库记录 | `Material`、`InventoryMovement`、`User` | 复用并补字段 | 药品/试剂作为受控物料；入库/出库走库存移动 | 药品库存和领用责任清晰 |
| 61 | 虫鼠害检查记录表 | `CleaningRecord`、`CorrectiveAction`、`ExternalParty`；无专用虫害检查模型 | 新增共享现场检查能力 | 虫鼠害作为现场检查类型；点位、工具、发现、整改统一到 `ComplianceAudit`/现场检查 | 虫鼠害点位检查可统计并触发整改 |
| 62 | 蛋与蛋制品检验报告 | `IncomingInspection`、`MaterialBatch`、`Material`、`Supplier` | 复用并补字段 | 蛋与蛋制品作为来料检验类型；感官/批号/保质期为明细 | 鸡蛋来料检验与批次入库联动 |
| 63 | 蛋糕油脱模占比核算表 | `ProcessMonitorRecord`、`BatchMaterialUsage`、`BusinessDocumentLink` | 复用并补字段 | 脱模占比作为过程参数/核算结果；称重照片为附件 | 蛋糕油消耗和脱模效果能按批次分析 |
| 64 | 车间布局变更HACCP风险评估确认、验证记录 | `ChangeEvent`、`ProductProcessChangePlan`、`ChangeVerificationRecord`、`ChangeComplianceRecord`、`CCPPoint` | 复用并补字段 | 布局变更走 `ChangeEvent`；HACCP 风险评估作为变更合规评估；CCP 影响同步到 CCP 配置 | 车间布局变更和 HACCP 影响在同一变更链 |
| 65 | 车间测量设备台账表 | `MeasuringEquipment`、`CalibrationRecord` | 直接复用，补字段 | 使用位置和设备状态进入测量设备台账 | 车间测量设备与实验室设备统一管理 |
| 66 | 车间环境微生物检验报告 | `EnvironmentRecord`、`WorkshopArea`、共享 `QualityInspection` 缺口 | 复用并补字段 | 空气/平板菌落可作为环境记录扩展；若需检验报告格式，复用共享检验能力 | 环境微生物结果能按区域趋势分析 |
| 67 | 过敏原控制措施验证记录 | `ChangeVerificationRecord`、`CleaningRecord`、`CorrectiveAction` | 复用并补字段 | 控制措施验证作为变更/合规验证；现场测试结果关联清洁记录 | 过敏原控制措施有执行和验证证据 |
| 68 | 过敏原测试记录 | `CleaningRecord`、`WorkshopArea`、`CorrectiveAction` | 复用并补字段 | 擦拭点、试纸颜色、判定进清洁验证明细；失败转 CAPA | 过敏原清洁验证能按区域和点位查询 |
| 69 | 过敏源趋势分析 | `CleaningRecord`、`CorrectiveAction` | 复用并补页面 | 趋势分析由过敏原测试记录派生；不建趋势分析表 | 年/月趋势由真实测试数据生成 |
| 70 | 返工评估、过程记录表 | `ReworkRecord`、`NonConformance`、`Product`、`ProductionBatch` | 直接复用，补字段 | 返工申请、食品安全评估、过程和结果都进返工记录；源头必须关联 NC | 返工从不合格到处理结果完整闭环 |
| 71 | 追溯演练记录（反追）2025年 | `TraceabilityQueryService`、`TraceabilitySnapshot`、`TraceabilityExportService`、`CorrectiveAction`；无 `TraceabilityDrill` | 复用追溯服务并新增演练壳 | 不重建追溯链；新增轻量追溯演练域对象只保存演练元数据、快照引用、结论和 CAPA；不得复制旧 model-landing 实体 | 反追演练可复用真实追溯查询结果 |
| 72 | 追溯演练记录（正追）2025年 | 同 #71 | 复用追溯服务并新增演练壳 | 同 #71，演练类型为正追 | 正追演练不复制批次关系，只引用追溯快照 |
| 73 | 面粉来料检验报告 | `IncomingInspection`、`MaterialBatch`、`Material`、`Supplier` | 复用并补字段 | 面粉检验作为来料检验类型；形态、色泽等为明细项 | 面粉来料检验进入统一来料质量台账 |
| 74 | 食品安全目标及考核表 | `CorrectiveAction`、`Department`；当前无 `FoodSafetyObjective` | 新增治理模型 | 新增食品安全目标治理能力承接年度目标、季度实际、达成判定；不得直接恢复旧 `FoodSafetyObjective`；未达标生成 CAPA | 食品安全目标能季度跟踪并驱动整改 |
| 75 | 食品欺诈脆弱性验证记录表 | `SupplierEvaluation`、`Material`、`SupplierDocument`、`ChangeVerificationRecord`、`CorrectiveAction` | 新增共享合规评估能力 | 食品欺诈评估进共享食品安全评估；供应商证据挂 `SupplierDocument`；问题进 CAPA | 食品欺诈验证与供应商、物料和整改联动 |

---

## 品质部首轮结论

1. 品质部不能按旧映射直接恢复 `HazardAssessment`、`AuditRecord`、`Inspection`、`MaterialInspection`、`ManagementReview`、`TraceabilityDrill`、`FoodSafetyObjective` 这些 model-landing 名称；其中多个在当前 schema 中不存在，部分还在 API contract cleanup 中明确删除过。
2. 已有轮子覆盖得比较好的区域是来料检验、NC/CAPA、变更验证、召回、返工、环境、清洁、测量设备、校准、产品/配方/CCP、追溯查询。
3. 真正需要补的是少数共享能力，而不是 75 个页面：
   - 共享检验能力：承接产品检验、半成品检验、保质期检验、化验室日报、水质/微生物原始检验；必须关联 `Product`、`ProductionBatch`、`Sample`、`InspectionStandard`，失败进入 `NonConformance`/`CorrectiveAction`。
   - 共享食品安全评估/合规验证能力：承接 BRCGS 风险区、原料风险、食品欺诈、过敏原、PRP/HACCP 验证；不要命名为旧 `HazardAssessment`，避免恢复 model-landing 影子模型。
   - 内审/现场合规检查能力：承接内审计划、检查表、审核报告、周排查、虫鼠害检查；发现项进入 NC/CAPA。
   - 管理评审能力：承接管理评审计划、输入汇编、会议纪要、报告和各部门工作总结；输出措施进入 CAPA。
   - 追溯演练壳：只保存演练元数据、正追/反追类型、追溯快照引用、结论和整改，不复制追溯链。
   - 食品安全目标治理：承接年度目标、季度实际、达成判定和未达标 CAPA。
4. 品质部落地后的效果不是新增 75 个业务页面，而是形成几个真实工作台：来料检验台账、产品/样品检验台账、合规评估与验证、内审/现场检查、管理评审、追溯演练、食品安全目标；这些页面全部引用主数据和批次，不使用 `Record.data` 作为事实源。

---

## 质检组逐表审计

源目录：`/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单/质检组`  
当前源 Markdown 数：21。字段映射覆盖 21/21；其中源表单 `产品质量抽查表-质检` 在映射表中以 `质检产品质量抽查表` 表达，属于命名差异，不是覆盖缺口。

| # | 源表单 | 已有轮子 | 判定 | 落地动作 | 落地后的效果 |
|---:|---|---|---|---|---|
| 1 | 下料单个重量记录表-质检 | `ProcessMonitorRecord`、`ProductionBatch`、`Product`、`User` | 复用并补字段 | 单个重量、下料人、复核人、标准范围落过程参数；批次和产品必须 FK | 重量偏差能按产品、批次、班次追踪 |
| 2 | 中后段车间成品首检记录表-质检 | `Product`、`ProductionBatch`、`Sample`、`InspectionStandard`；缺共享检验运行能力 | 新增共享检验能力 | 首检作为产品/成品检验类型，引用批次、样品、检验标准；失败转 NC/CAPA | 首检结果影响批次放行，不成为孤立表 |
| 3 | 产品中心温度记录表-质检 | `CCPRecord`、`ProcessMonitorRecord`、`ProductionBatch` | 直接复用 | 中心温度作为 CCP 或过程参数，关联产品批次和工序 | 中心温度超限可触发异常处置 |
| 4 | 产品品评记录-质检 | `Product`、`ProductionBatch`、`Sample`、`InspectionStandard`；缺共享检验运行能力 | 新增共享检验能力 | 感官品评作为检验项目组，保存样品、评分、结论和评审人 | 品评趋势可按产品/批次统计 |
| 5 | 产品质量抽查表-质检 | 同 #4 | 新增共享检验能力 | 抽查项目进入共享检验结果；异常进入 `NonConformance` | 质量抽查与批次、产品、CAPA 串联 |
| 6 | 仓库成品抽检记录表-质检 | `Product`、`ProductionBatch`、`InventoryMovement`、共享检验能力 | 新增共享检验能力 | 成品在库抽检引用成品批次和货位/库存节点；结果落检验 | 在库质量问题可反查批次和库存流向 |
| 7 | 后段成品抽检记录表-质检 | `Product`、`ProductionBatch`、共享检验能力 | 新增共享检验能力 | 后段抽检作为成品过程/放行前检验 | 后段问题能及时阻断放行 |
| 8 | 后段车间净含量检验记录表-质检 | `Product`、`ProductionBatch`、`MetalDetectionLog`、共享检验能力 | 复用并拆分 | 净含量检验进共享检验；金探相关项仍走 `MetalDetectionLog` | 净含量与金探证据边界清楚 |
| 9 | 员工每日健康卫生检查记录-质检 | `User`、`ViolationRecord`、`CleaningRecord` | 复用并补共享人员卫生检查 | 人员健康/着装/卫生作为人员现场检查；违规进 `ViolationRecord`，清洁项进 `CleaningRecord` | 人员卫生异常可追到责任人和整改 |
| 10 | 巡检过程异常记录表-质检 | `NonConformance`、`CorrectiveAction`、`ProductionBatch`、`ProcessMonitorRecord` | 直接复用，补来源字段 | 异常作为 NC；巡检来源、批次、工序、处置和验证进入 NC/CAPA | 巡检异常直接进入整改闭环 |
| 11 | 机头浆料比重、料温、纸托跟进表-质检 | `ProcessMonitorRecord`、`ProductionBatch`、`MaterialBatch`、`PackagingMaterialUsage` | 复用并补字段 | 比重、料温落过程参数；纸托用量/状态关联包材和批次 | 浆料参数和包材跟进能按批次分析 |
| 12 | 每日卫生检查记录表-质检 | `CleaningRecord`、`ViolationRecord`、`NonConformance`、`CorrectiveAction` | 复用并拆分 | 卫生项落清洁/现场检查；违规落违规；严重问题转 NC/CAPA | 每日卫生问题不散在表单文本里 |
| 13 | 氮气机、干燥机、除水过滤跟进表-质检 | `Equipment`、`MaintenanceRecord`、`ProcessMonitorRecord` | 复用并补字段 | 设备状态进维保/巡检；氮气/干燥参数进过程记录 | 设备状态和过程参数可相互校验 |
| 14 | 氮气记录表-质检 | `ProcessMonitorRecord`、`Equipment`、`ProductionBatch` | 直接复用，补字段 | 氮气压力/纯度/时间等进入过程参数 | 氮气使用和批次生产过程可追 |
| 15 | 洁净车间正负压跟进表-质检 | `EnvironmentRecord`、`WorkshopArea` | 直接复用，补字段 | 正负压点位、标准范围、班次进入环境记录 | 洁净区压差可趋势分析 |
| 16 | 温湿度记录表-质检 | `EnvironmentRecord`、`WorkshopArea` | 直接复用 | 区域、温湿度、班次、记录人落环境记录 | 温湿度统一进入环境趋势 |
| 17 | 烤炉过程巡检表-质检 | `ProcessMonitorRecord`、`CCPRecord`、`Equipment`、`ProductionBatch` | 复用并补字段 | 炉速、炉区温度、中心温度按过程/CCP 拆分 | 烤炉巡检与批次和 CCP 联动 |
| 18 | 车间内包膜间消毒检查表-质检 | `CleaningRecord`、`WorkshopArea` | 直接复用，补字段 | 消毒方式、浓度、起止时间、监督人进清洁明细 | 内包膜间消毒证据统一查询 |
| 19 | 车间环境监控检验记录-质检 | `EnvironmentRecord`、`WorkshopArea`、共享检验能力 | 复用并补共享检验 | 温湿度/压差进环境记录；微生物等检验结果进共享检验 | 环境监控和检验报告互相可追 |
| 20 | 酒精房抽检记录表-质检 | `CleaningRecord`、`Material`、`NonConformance`、`CorrectiveAction` | 复用并补字段 | 酒精浓度/领用检查作为消毒或受控物料检查；异常进 NC/CAPA | 酒精房检查与消毒和物料管理联动 |
| 21 | 鸡蛋房消毒池抽检记录-质检 | `CleaningRecord`、`WorkshopArea` | 直接复用，补字段 | 消毒池浓度、更换时间、抽检结论进清洁消毒明细 | 鸡蛋房消毒池异常能触发整改 |

## 质检组首轮结论

1. 质检组多数表单应复用 `EnvironmentRecord`、`ProcessMonitorRecord`、`CleaningRecord`、`CCPRecord`、`NonConformance`、`CorrectiveAction`，不用恢复 model-landing 影子实体。
2. 主要缺口是共享检验运行能力：成品首检、抽检、品评、净含量、环境微生物等不能落到 `IncomingInspection`，也不能只落文档。
3. `InspectionStandard` 和 `Sample` 已有模型但缺 API/页面，应该作为共享检验能力的基础轮子补齐。
4. 人员健康卫生检查不要单独造质检表；人员异常走 `ViolationRecord`，清洁/消毒走 `CleaningRecord`，严重问题进 NC/CAPA。

---

## 工程部逐表审计

源目录：`/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单/工程部`  
当前源 Markdown 数：16。字段映射覆盖 16/16，但映射表有 `Location`、`Employee`、`ChangeApproval` 等旧口径；当前应改为 `WorkshopArea`、`User`、`ApprovalInstance/ApprovalTask`。

| # | 源表单 | 已有轮子 | 判定 | 落地动作 | 落地后的效果 |
|---:|---|---|---|---|---|
| 1 | 临时性维修卡 | `Equipment`、`EquipmentFault`、`MaintenanceRecord`、`ApprovalInstance` | 复用并补字段 | 临时维修原因、食品级材料、计划正式完成日、品控确认、区域主管审批、验收确认补到设备报修/维保链 | 临时维修从报修、临时处置到永久修复闭环 |
| 2 | 压缩空气精密过滤器更换记录 | `Equipment`、`MaintenanceRecord`、`Material`、`InventoryMovement` | 复用并拆分 | 过滤器/压缩空气系统作为设备或部件；滤芯若控库存，作为物料消耗 | 更换周期、状态和滤芯消耗同时可追 |
| 3 | 年度维护保养计划 | `MaintenancePlan`、`Equipment`、`TodoTask` | 直接复用，补批量计划能力 | 年度矩阵拆成多条计划；按设备、级别、计划日期生成 | 年度计划能驱动待办、日历和维保执行 |
| 4 | 新设备试行不合格评审处置记录 | `Equipment`、`NonConformance`、`CorrectiveAction`、`ApprovalInstance`、`BusinessDocumentLink` | 复用并补字段 | 不合格主体关联设备；评审、处置、验证进 NC/CAPA 和审批；资料走文控 | 新设备试行异常能追到设备、供应商、整改和验证 |
| 5 | 润滑油点检记录表 | `Equipment`、`MaintenanceRecord`、`Material`、`InventoryMovement` | 复用并补字段 | 润滑部位、油品型号、食品级属性结构化；油品消耗走库存移动 | 食品级润滑和设备保养历史可查 |
| 6 | 生活水池维护保养记录表 | `Equipment`、`MaintenanceRecord`、`CleaningRecord` | 复用并拆分 | 水池维护进维保记录；卫生/消毒检查进清洁记录 | 水池维护和卫生检查按各自模块查询 |
| 7 | 电工每日巡查记录 | `Equipment`、`MaintenanceRecord`、`EquipmentFault` | 复用并补字段 | 电房、配电箱、漏保等作为设备/设施；异常生成设备报修 | 电气巡检异常进入维修闭环 |
| 8 | 纯水机系统维护保养记录 | `Equipment`、`MaintenancePlan`、`MaintenanceRecord` | 直接复用，补计划视图 | 部件作为保养部位；年度勾选拆成计划和实际记录 | 纯水机保养能从计划推进到实际执行 |
| 9 | 维修申请单 | `EquipmentFault`、`MaintenanceRecord`、`InventoryMovement`、`ApprovalInstance` | 复用并补字段 | 报修主体用 `EquipmentFault`；到场/完工时间、配件/外援/售后、SLA 补字段；配件领用走库存 | 维修申请变成报修、接单、维修、配件、确认闭环 |
| 10 | 维护保养记录 | `Equipment`、`MaintenancePlan`、`MaintenanceRecord` | 直接复用，补字段 | 补保养部位、停用设备未来维护时间、结构化设备情况 | 通用维保记录直接进入设备维保页 |
| 11 | 蒸炉维护保养记录表 | `Equipment`、`MaintenanceRecord`、`EquipmentFault` | 直接复用，补设备预设 | 蒸汽隧道炉和部件作为设备/保养部位；缺陷转报修 | 蒸炉专用保养进入设备详情历史 |
| 12 | 设备变更申请、评估记录 | `ChangeEvent`、`ChangeVerificationRecord`、`ApprovalInstance`、`Equipment`、`BusinessDocumentLink` | 复用并补流程字段 | 设备变更用 `ChangeEvent.change_type='equipment'`；审批走统一审批；CCP 设备评估进变更验证 | 设备变更从申请、审批、评估、验证到状态更新形成统一链 |
| 13 | 设备台账 | `Equipment` | 直接复用，补字段 | 每台设备拆成一条 `Equipment`；台账分组/表编号可作扩展字段或 metadata | 设备成为维保、报修、变更、领料的统一主数据 |
| 14 | 设备巡检记录表 | `Equipment`、`MaintenanceRecord`、`EquipmentFault` | 复用并补字段 | 巡检年月、结果、异常描述、巡检人作为巡检型维保记录；异常关联报修 | 月度巡检可按设备、区域和异常状态统计 |
| 15 | 设施设备验收记录 | `Equipment`、`ApprovalInstance`、`Document`、`BusinessDocumentLink`、`Supplier`、`ExternalParty` | 复用并补设备验收能力 | 新设备建待验收状态；随机文件挂文控；多部门签字走审批；补验收检查项 | 设备从采购、验收、资料归档到启用状态可追 |
| 16 | 金属探测机维修保养记录表 | `Equipment`、`MaintenanceRecord`、`EquipmentFault`、`MetalDetectionLog` | 直接复用，补字段 | 金探机作为设备；保养进维保记录；生产金探验证仍走 `MetalDetectionLog` | 金探维护和生产金检记录边界清楚 |

## 工程部首轮结论

1. 工程部 16 张表的主体轮子已经存在，核心是 `Equipment / MaintenancePlan / MaintenanceRecord / EquipmentFault / ChangeEvent / NonConformance / CorrectiveAction / ApprovalInstance`。
2. 字段映射必须纠偏：设备台账落 `Equipment`，维修申请落 `EquipmentFault`，审批意见走统一审批，不恢复 `ChangeApproval`。
3. 需要补字段最多的是设备模块：巡检明细、保养部位、食品级材料、SLA、外援/售后/配件、验收检查项、设备变更封存/报废/标签协作。
4. 新增边界应收敛在设备模块内的“验收/投用”和“结构化巡检/维保明细”，不是新增 16 张动态表单。

---

## 仓储组逐表审计

源目录：`/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单/仓储组`  
当前源 Markdown 数：13。字段映射覆盖 13/13；映射表中的 `MaterialLot`、`MaterialInspection`、`Employee`、`Location` 应分别改为 `MaterialBatch`、`IncomingInspection`、`User`、`WorkshopArea` 或业务对象位置字段。

| # | 源表单 | 已有轮子 | 判定 | 落地动作 | 落地后的效果 |
|---:|---|---|---|---|---|
| 1 | 上车单 | `Product`、`ProductionBatch`、`InventoryMovement`、`ExternalParty`、`CleaningRecord` | 复用并补字段/页面 | 发货出库进 `InventoryMovement` 或发货节点；客户用 `ExternalParty`；车辆检查关联运输车辆清洁记录；补车牌、分线数量、司机/记数/仓管签名 | 成品出库可回到生产批次、客户、车辆检查和库存流水 |
| 2 | 仓库单体空调内置过滤网清洗记录 | `Equipment`、`MaintenancePlan`、`MaintenanceRecord` | 直接复用，补设备预设 | 仓库空调过滤网建为设备或部件；周期走维护计划，清洗结果走维保记录 | 过滤网清洗进入设备维保闭环 |
| 3 | 仓库日常巡查表 | `EnvironmentRecord`、`CleaningRecord`、`CorrectiveAction`、`WorkshopArea` | 复用并拆分 | 温湿度进环境；清洁、堆放、虫害、污染进清洁/现场检查；整改进 CAPA | 仓库巡查可按区域、日期、异常和整改闭环查询 |
| 4 | 仓库领料单 | `MaterialRequisition`、`MaterialRequisitionItem`、`MaterialBatch`、`StockRecord`、`InventoryMovement` | 直接复用，补字段 | 领料走 `MaterialRequisition`；完成后扣批次库存并写库存流水；补生产线/领班/发料人签名 | 领料单直接驱动库存扣减和生产追溯 |
| 5 | 化学品仓登记领用表 | `Material`、`MaterialInbound`、`MaterialRequisition`、`InventoryMovement`、`StockCount` | 复用并补字段 | 化学品作为受控物料；来货走入库，领用走领料/库存移动，剩余由库存流水派生 | 化学品库存、领用人、余量和异常处置进入统一库存账 |
| 6 | 原料标识卡 | `Material`、`Supplier`、`MaterialInbound`、`MaterialBatch`、`IncomingInspection` | 复用并补页面 | 标识卡由物料批次详情/打印标签派生；检验状态来自来料检验和批次状态 | 原料货堆标识不成为第二套批次事实 |
| 7 | 原材料验收单 | `IncomingInspection`、`IncomingInspectionResult`、`MaterialBatch`、`Supplier`、`SupplierDocument`、`BusinessDocumentLink` | 复用并补字段 | 包装、车辆、清洁证明等检查项进来料检验明细；报告走文控附件 | 来料验收与批次、供应商、报告附件形成证据链 |
| 8 | 废品出入库记录 | `WasteRecord`、`WasteDisposalRecord`、`InventoryMovement`、`ExternalParty` | 复用并补字段 | 废品产生/入库进 `WasteRecord`；处置出库进 `WasteDisposalRecord`；回收单位用外部方 | 废品可按来源、类别、重量和处置单位统计 |
| 9 | 成品入库单 | `ProductionBatch`、`Product`、`InventoryMovement`、`MaterialBalance` | 复用并补页面 | 成品入库作为 `InventoryMovement(object_type=production_batch)`；引用生产批次和产品 | 成品入库进入批次库存流水和产量核算 |
| 10 | 成品入库卡 | `ProductionBatch`、`InventoryMovement`、`StockCount` | 新增能力边界：补成品批次货位结存 | 当前 `StockCount` 偏物料批次；应扩展盘点/结存支持 `production_batch`，由入库/出库流水派生结存 | 成品货位卡成为批次库存视图 |
| 11 | 报废申请单 | `NonConformance`、`CorrectiveAction`、`ApprovalInstance`、`ProductionBatch`、`InventoryMovement`、`MaterialScrap` | 复用并拆分 | 成品报废先进入 NC 或审批；批准后写批次报废库存移动；物料报废才用 `MaterialScrap` | 报废原因、审批、批次扣减、整改分析串起来 |
| 12 | 车间易耗品库登记领用表 | `Material`、`MaterialInbound`、`MaterialRequisition`、`InventoryMovement`、`StockCount` | 复用并补字段 | 易耗品作为物料分类；来货/领用复用入库和领料；剩余数量由库存流水派生 | 易耗品消耗可月度汇总并驱动补货 |
| 13 | 运输车辆清洁消毒记录表 | `CleaningRecord`、`InventoryMovement`、`ExternalParty` | 复用并补字段 | 车辆作为清洁目标或运输对象快照；检查项补入清洁记录明细；与上车单按日期车牌关联 | 发货前车辆卫生检查可约束装车并留整改证据 |

## 仓储组首轮结论

1. 仓储组 13 张表不需要恢复旧 `model-landing` 影子实体，也不应让动态 `RecordTemplate/Record` 成为库存、批次、检验或追溯事实源。
2. 物料入库、批次、领料、库存流水、物料平衡、供应商、来料检验这些核心轮子已存在；首轮重点是补字段、详情、打印、汇总页面。
3. 真正新增边界主要是成品批次库存/货位结存：`InventoryMovement` 支持 `production_batch`，但盘点/结存视图偏物料批次。
4. 仓库巡查、车辆检查、过滤网清洗、废品出入库都已有通用模块承接，只应补检查明细、目标对象、异常整改关联。

---

## 采购部逐表审计

源目录：`/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单/采购部`  
当前源 Markdown 数：12。字段映射覆盖 12/12；映射表里的 `MaterialLot`、`MaterialInspection`、`Inspection`、`AuditRecord` 不是当前权威模型，应收敛到 `MaterialBatch`、`IncomingInspection`、`SupplierEvaluation` 或新的受控供应商审核能力。

| # | 源表单 | 已有轮子 | 判定 | 落地动作 | 落地后的效果 |
|---:|---|---|---|---|---|
| 1 | 供应商台账 | `Supplier`、`SupplierQualification`、`SupplierDocument`、`SupplierEvaluation`、`BusinessDocumentLink` | 复用并补字段 | 供应商编号、名称、联系人、电话、地址、状态进 `Supplier`；证照进资质/供应商文档；最新评价回写状态 | 供应商只有一份主数据，资质、准入、绩效、暂停/淘汰都在档案里查看 |
| 2 | 供应商现场审核报告 | `Supplier`、`SupplierEvaluation`、`SupplierDocument`、`NonConformance`、`CorrectiveAction`、`BusinessDocumentLink` | 复用并新增供应商审核子能力 | 不恢复 `AuditRecord`；用 `SupplierEvaluation(evaluationType=site_audit)` 承接结论/总分/审核项；不符合项生成 NC/CAPA | 现场/远程审核成为供应商评价链的一种类型 |
| 3 | 供应商绩效评估表 | `SupplierEvaluation`、`IncomingInspection`、`MaterialInbound`、`Supplier`、`CorrectiveAction` | 复用并补字段 | 补价格得分、季度/年度、所供物资、质量细分扣分、签核字段；质量数据优先由检验和入库派生 | 季度/年度绩效用真实来料质量、交付和整改数据支撑 |
| 4 | 供应商评价表 | `SupplierEvaluation`、`Supplier`、`Material`、`ApprovalInstance` | 复用并补字段 | 补资料/样品/价格得分、供应商等级、结论、审批人/审批日期；审批走统一审批 | 准入/复评用同一评价历史，结论约束后续采购 |
| 5 | 供应商调查问卷表 | `Supplier`、`Material`、`SupplierDocument`、`BusinessDocumentLink`、`SupplierEvaluation` | 复用并拆分 | 基本信息进供应商；拟供产品进物料或供货范围；附件进供应商文档；问卷作为调查快照，结论进评价 | 供应商档案保持干净，问卷作为准入证据沉淀 |
| 6 | 原辅料验收台账 | `MaterialInbound`、`MaterialBatch`、`IncomingInspection`、`Supplier`、`Material`、`BusinessDocumentLink` | 复用并拆分 | 日期、数量、供应商批号、生产/到期日期进入库和批次；验货方式、包装、三证、结论进来料检验 | 验收台账由批次和检验列表派生 |
| 7 | 合格供应方资料台账 | `Supplier`、`SupplierDocument`、`BusinessDocumentLink`、`Material`、`SupplierEvaluation` | 复用并补页面 | 状态/评估状态来自供应商；营业执照、许可证、外检报告、MSDS、检疫证明等作为受控文档 | 合格名录成为供应商档案筛选视图，证照有效期可预警 |
| 8 | 新准入供应商评价表 | `SupplierEvaluation`、`Supplier`、`Material`、`ApprovalInstance`、`SupplierDocument` | 复用并补字段 | 与供应商评价共用模型，增加 `evaluationType=new_admission`；资料、样品、质量、价格、交付、服务评分结构化 | 新供应商准入和后续复评连续可查 |
| 9 | 物资采购计划单 | `Material`、`Supplier`、`ApprovalInstance`、`Document`；当前无采购计划/采购订单模型 | 新增轻量采购单据能力 | 新增采购计划/采购申请和行项目，引用物料、供应商、用户，审批走统一审批；原件作附件 | 采购计划可审批、按物料/金额/供应商统计，并作为合同和入库上游 |
| 10 | 紧急采购申请单 | `Material`、`Supplier`、`ApprovalInstance`、`MaterialInbound`、`IncomingInspection`、`NonConformance` | 复用并补采购单据字段 | 基于采购单据补紧急级别、紧急原因、特殊授权；到货入库和检验仍走既有链路 | 紧急采购可快速审批，但不绕过资质、入库、检验和不合格链 |
| 11 | 采购合同 | `Document`、`BusinessDocumentLink`、`Supplier`、`Material`、`ApprovalInstance`；当前无采购合同履约模型 | 新增采购合同子能力或采购单据合同类型 | 文件本体进文控；合同头/行、金额、交期、结算、违约条款落结构化合同对象；行项目引用物料，乙方引用供应商 | 合同可支撑到货核对、价格/数量统计、履约和供应商绩效输入 |
| 12 | 采购物资分类明细表 | `Material`、`MaterialCategory`、`WorkshopArea`、`ChangeEvent` | 复用并补字段 | 物料名称、品类进物料/分类；存储区域落仓储区域/位置字段；更新原因走变更事件或物料变更 | 采购、仓储、来料检验使用同一物料分类和存储区域 |

## 采购部首轮结论

1. 供应商主数据、证照、评价、绩效、来料入库、批次、来料检验、文控附件、不合格和 CAPA 都已有轮子，不应恢复 `Inspection/AuditRecord/MaterialInspection/MaterialLot` 旧影子实体。
2. `SupplierEvaluation` 是评价类表单核心落点，但需补 `evaluationType`、价格/资料/样品得分、评分明细、签核和审核项快照。
3. 供应商资料类台账不要建平行台账表；`Supplier` 管事实，`SupplierDocument/BusinessDocumentLink` 管证照和报告，台账是筛选/汇总视图。
4. 真正缺口在采购执行单据：物资采购计划、紧急采购申请、采购合同。`Document` 不能作为金额、行项目、候选供应商、履约状态的事实源。

---

## 产品开发部逐表审计

源目录：`/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单/产品开发部`  
当前源 Markdown 数：11（一级目录 10 + `产品规格书/` 子目录 1）。字段映射覆盖 11/11。旧口径 `Inspection`、`HazardAssessment`、`ChangeApproval`、`MaterialLot`、`ProcessRecord` 应分别收敛到检验标准/共享检验、产品/配方/工艺/CCP/变更验证、统一审批、物料批次、过程记录或研发步骤数据。

| # | 源表单 | 已有轮子 | 判定 | 落地动作 | 落地后的效果 |
|---:|---|---|---|---|---|
| 1 | 产品开发评审记录 | `ProcessInstance`、`ProcessStepData`、`Product`、`Recipe`、`ProcessStep`、`CCPPoint`、`ChangeVerificationRecord`、`ApprovalInstance`、`BusinessDocumentLink` | 复用并补字段 | 不建评审记录独立表；按研发流程阶段写入 `ProcessStepData`；评审结论/量产建议走阶段数据或变更验证；签核走统一审批 | 新品从评审、小试、中试、大试到量产结论挂在同一研发流程 |
| 2 | 产品操作规程 | `Document`、`BusinessDocumentLink`、`Product`、`Recipe`、`RecipeLine`、`ProcessStep`、`CCPPoint`、`InspectionStandard`、`ApprovalInstance` | 文控附件为主，复用业务对象 | 规程本体作为受控文件；原料清单引用配方，控制参数/流程引用工序，危害控制点引用 CCP，内控标准引用检验标准或文控文件 | 操作规程成为产品受控文件入口，业务事实仍是产品、配方、工序和 CCP |
| 3 | 产品更改申请表 | `ChangeEvent`、`ProductProcessChangePlan`、`Product`、`Recipe`、`ProcessStep`、`CCPPoint`、`ChangeVerificationRecord`、`ApprovalInstance` | 直接复用，补部门意见/原因枚举 | 更改申请落 `ChangeEvent`；范围和配方/工艺/HACCP 改动落变更计划；部门意见走审批 action 或变更关系字段 | 产品变更从申请、审批、执行、验证到产品详情全链可追 |
| 4 | 产品标签信息记录 | `Product`、`Recipe`、`RecipeLine`、`Document`、`BusinessDocumentLink`、`ApprovalInstance` | 复用并补字段/页面 | 标签、保质期、营养成分、声称、标准代号、食用/储藏方法、致敏物质优先落产品；配料从配方行汇总；会签走审批 | 产品详情可直接生成标签信息，避免标签表和主数据不一致 |
| 5 | 产品配方以及工艺参数 | `Product`、`Recipe`、`RecipeLine`、`Material`、`ProcessStep`、`CCPPoint`、`ChangeEvent`、`ProductProcessChangePlan`、`ApprovalInstance` | 复用并补字段 | 配方落配方/配方行；炉速、SG、重量、温度、炉温区间落工序参数；参数不足时补 JSON/明细 | 配方与工艺参数成为可版本化、可审批、可变更执行的核心配置 |
| 6 | 产品验证记录表 | `ProcessInstance`、`ProcessStepData`、`ChangeVerificationRecord`、`Product`、`Supplier`、`Material`、`IncomingInspection`、`InspectionStandard`、`ProcessStep`、`BusinessDocumentLink` | 复用并补共享检验/验证字段 | 小试/中试/大试挂研发流程；变更触发验证落变更验证；供应商证照、标准、批次检验报告引用供应商/来料检验/文控；成品理化安全检验走共享检验能力 | 产品验证能同时看到原辅料可靠性、工艺验证、检验结论和跨部门签核 |
| 7 | 工艺流程图确认记录 | `Product`、`ProductionBatch`、`WorkshopArea`、`ProcessStep`、`Document`、`BusinessDocumentLink`、`ChangeVerificationRecord`、`CCPPoint` | 复用并补页面/验证字段 | 确认对象是受控流程图文件和 `ProcessStep`；现场确认结论落变更验证或流程步骤数据；区域引用 `WorkshopArea` | 流程图确认可回到真实工艺、区域、批次和文控版本 |
| 8 | 新产品开发申请书 | `ProcessTemplate`、`ProcessInstance`、`ProcessStepData`、`Product`、`ApprovalInstance`、`Document` | 直接复用研发流程，补立项字段 | 作为研发流程立项输入；开发数量、工艺要求、产品特性、包装要求、法规要求、危害初筛、可行性分析写入步骤数据 | 新品申请直接启动研发流程并衔接计划、实验、配方和试产 |
| 9 | 新产品开发计划书 | `ProcessInstance`、`ProcessStepData`、`Product`、`Recipe`、`RecipeLine`、`ProcessStep`、`CCPPoint`、`InspectionStandard`、`Document`、`ApprovalInstance` | 复用并拆分 | 设计输入和部门意见落研发步骤数据；输出引用或生成配方、工序、CCP、检验标准；附件走文控 | 计划书成为研发流程聚合视图，输出能驱动配方、工艺、CCP 和检验标准 |
| 10 | 研发实验记录 | `ProcessInstance`、`ProcessStepData`、`Recipe`、`ProcessStep`、`Sample`、`EnvironmentRecord`、`InspectionStandard`、`NonConformance`、`CorrectiveAction`、`BusinessDocumentLink` | 复用并补能力 | 实验材料/配方/参数引用或沉淀到配方/工序；保质期实验引用 `Sample` 和储存条件；检测结果走共享检验能力；异常转 NC/CAPA | 研发实验可沉淀为产品配方、工艺参数、样品留样、检验和整改证据 |
| 11 | 产品规格书 | `Product`、`Recipe`、`RecipeLine`、`ProcessStep`、`InspectionStandard`、`Document`、`BusinessDocumentLink`、`ApprovalInstance` | 文控附件为主，复用业务对象 | 规格书本体作为受控 `Document`；产品规格、配方、工艺、检验标准引用业务对象；审批走统一审批 | 规格书可从产品详情和文控中心双向查看，不复制产品主数据 |

## 产品开发部首轮结论

1. 产品开发部 11 张源表单大部分不用新增领域模型；核心落点是 `Product`、`Recipe/RecipeLine`、`ProcessStep`、`ProcessInstance/ProcessStepData`、`ChangeEvent/ProductProcessChangePlan`、`CCPPoint`、`Document/BusinessDocumentLink`、`ApprovalInstance`。
2. 不能恢复旧 `HazardAssessment`、通用 `Inspection`、`ChangeApproval`、`MaterialLot`；这些不是当前权威轮子。
3. 需要补的是产品标签/营养/固定标签声明、工序参数结构、变更部门意见/影响范围呈现、研发步骤字段，以及产品详情/工作台聚合入口。
4. 共享检验运行能力和 `Sample` API/页面是跨产品开发部、品质部、质检组的共同缺口。

---

## 营销部逐表审计

源目录：`/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单/营销部`  
当前源 Markdown 数：10（一级目录 6 + `召回演练/` 子目录 4）。字段映射覆盖 10/10；召回类表单直接复用产品召回模块，不恢复旧 model-landing 召回影子实体。

| # | 源表单 | 已有轮子 | 判定 | 落地动作 | 落地后的效果 |
|---:|---|---|---|---|---|
| 1 | 产品销售登记表 | `Product`、`ProductionBatch`、`DeliveryNote`、`ExternalParty`、`TraceabilityQueryService` | 复用并补字段/页面 | 以 `DeliveryNote` 承接出货批次、客户、数量、发货信息；客户用 `ExternalParty(party_type='customer')`；补销售渠道、金额、业务员、审核状态 | 销售登记成为成品批次出货事实，可从客户、产品、批次、出库单反查 |
| 2 | 投诉趋势分析 | `CustomerComplaint`、`CorrectiveAction`、`CapaAnalyticsService`、`Document` | 复用并补页面 | 趋势由投诉和 CAPA 数据聚合；报告导出/归档走文控 | 趋势分析由真实投诉记录派生，不维护第二套汇总 |
| 3 | 运输商的定期考核表 | `ExternalParty(party_type='carrier')`、`DeliveryNote`、`NonConformance`、`CorrectiveAction` | 复用并补字段/必要新增轻量评价能力 | 承运商档案落外部方；准时率、回单状态由发货单派生；货损/丢失/拒运进入 NC/CAPA；季度考核结论可新增外部方评价 | 运输商考核回到实际出库/签收/异常记录，整改进入 CAPA |
| 4 | 销售出库单 | `DeliveryNote`、`ProductionBatch`、`Product`、`ExternalParty`、`TraceabilityQueryService`、`TraceabilitySnapshot`、`Document` | 复用并补字段/页面 | 以 `DeliveryNote` 为主；补客户/承运商引用、到货日期、司机签名/签收附件、金额、目的地、复核人、作废/重开状态 | 出库单成为批次流向节点，支持投诉、召回和运输商考核 |
| 5 | 顾客投诉处理报告单 | `CustomerComplaint`、`ExternalParty`、`ProductionBatch`、`Product`、`CorrectiveAction`、`NonConformance` | 直接复用为主，补字段 | 落到 `CustomerComplaint`；补购买渠道、地区、问题个数、处理结果/赔付类型、CAPA 关联；客户走外部方，批号走生产批次 FK | 投诉可按客户、渠道、产品、批次、问题类型统计并触发 CAPA/召回 |
| 6 | 顾客满意度调查表 | `ExternalParty`、`Product`、`CorrectiveAction`、`Document/BusinessDocumentLink` | 新增领域模型边界清晰 | 客户和产品复用外部方/产品；低分整改复用 CAPA；新增轻量满意度调查和评分明细模型，附件走文控 | 满意度可按客户、产品、维度、年度趋势统计，低分项进入整改 |
| 7 | 产品召回申请单 | `ProductRecall`、`ProductRecallBatch`、`TraceabilitySnapshot`、`ApprovalInstance`、`CustomerComplaint`、`NonConformance` | 直接复用，补字段 | 召回申请落 `ProductRecall`；批次范围落召回批次；触发来源关联投诉/不合格；审批走统一审批 | 召回申请从问题来源、批次范围、审批到执行链可追 |
| 8 | 产品召回计划 | `ProductRecall`、`ProductRecallBatch`、`ProductRecallNotification`、`TodoTask`、`Document` | 直接复用，补计划字段 | 召回等级、范围、责任人、时间节点、通知对象和执行任务落召回模块；计划原件走文控 | 召回计划能驱动通知、批次隔离、回收和进度跟踪 |
| 9 | 产品召回通知单 | `ProductRecallNotification`、`ExternalParty`、`Document`、`BusinessDocumentLink` | 直接复用，补模板/送达字段 | 通知客户、承运商、监管或内部部门用通知记录；送达凭证和通知文件走文控附件 | 召回通知可按对象、送达状态和证据查询 |
| 10 | 召回演练记录与报告 | `ProductRecall`、`TraceabilitySnapshot`、`TraceabilityQueryService`、`CorrectiveAction`、`Document` | 复用召回模块并补演练场景 | 不复制追溯链；演练保存场景、批次、快照、响应时长、结论和整改；报告走文控 | 召回演练能使用真实追溯结果并沉淀整改 |

## 营销部首轮结论

1. 营销部 10 张源表单应围绕 `ExternalParty + Product + ProductionBatch + DeliveryNote + CustomerComplaint + CorrectiveAction + TraceabilityQueryService + ProductRecall` 收敛。
2. `DeliveryNote` 是销售出库和批次流向关键轮子，但当前主要是 Prisma model 和追溯节点，缺独立业务 CRUD/API/页面；首轮应补发货单入口，而不是新增销售出库表。
3. 客户、承运商都用 `ExternalParty`，司机签名/签收件作为 `DeliveryNote` 字段或文控附件。
4. 顾客满意度调查是明确的新能力边界：不能污染投诉模型，也不能让 `Record.data` 成为管理指标事实源。
5. 召回申请、计划、通知和演练应复用 `ProductRecall`、召回批次、召回通知、追溯快照和 CAPA；只需要补演练场景和通知送达细节。

---

## 行政人事部逐表审计

源目录：`/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单/行政人事部`  
当前源 Markdown 数：51。字段映射覆盖 50/51；源目录中的 `食品安全小组` 未在两个行政人事字段映射表中形成独立映射。行政人事部已有可复用轮子包括 `User`、`Department`、`Role`、培训模块、`VisitorRecord`、`EmergencyDrillRecord`、`FoodSafetyCultureRecord`、文控、清洁、废弃物、库存、供应商/外部方、NC/CAPA 和统一审批。

| # | 源表单 | 已有轮子 | 判定 | 落地动作 | 落地后的效果 |
|---:|---|---|---|---|---|
| 1 | 人员管制区域 | `User`、`Department`、`Role`、`WorkshopArea` | 复用并新增区域授权能力 | 不恢复旧 `Location`；用区域和人员/角色关系承接授权、岗位、有效期和进出限制 | 管制区域人员清单可从人员、岗位、区域权限派生 |
| 2 | 体系文件收发记录表 | `Document`、`BusinessDocumentLink` | 复用并补文控操作台账 | 文件收发、版本、接收人、回收状态进入文控操作记录，不建动态表 | 体系文件分发、回收和版本责任可审计 |
| 3 | 供方沟通交流存档表 | `Supplier`、`SupplierEvaluation`、`SupplierDocument`、`Document` | 复用并补字段 | 供方沟通作为供应商档案事件或附件；重要结论进入评价/整改 | 供方沟通可回到供应商、证照、评价和整改 |
| 4 | 信息沟通工作单 | `Document`、`TodoTask`、`Department`、`User`、`ApprovalInstance` | 复用并补沟通工单能力 | 跨部门沟通形成任务/审批；原件作为文控附件；责任部门和完成状态结构化 | 沟通事项可跟踪责任、状态和闭环 |
| 5 | 内外部环境与风险机遇应对措施表 | `ExternalParty`、`Department`、`CorrectiveAction` | 新增共享合规/风险评估能力 | 不恢复 `HazardAssessment`；用共享食品安全评估承接内外部因素、机会风险、措施和责任 | 环境风险能进入整改和管理评审输入 |
| 6 | 内部审核首（末）次会议签到表 | `User`、`Department`、`Document` | 复用内审/现场合规检查能力 | 作为内审会议节点和签到明细，不单独造签到表 | 内审会议、参会人、审核计划和整改关联 |
| 7 | 内部报告登记表 | `NonConformance`、`CorrectiveAction`、`User`、`Department` | 复用并补字段 | 内部报告按异常/问题进入 NC 或任务；处理和验证进 CAPA | 内部报告不再只是登记台账，能进入整改闭环 |
| 8 | 卫生大比拼检查表 | `CleaningRecord`、`CorrectiveAction`、`Department` | 复用并补现场检查能力 | 卫生评分作为现场/清洁检查；问题转 CAPA | 卫生评比可按部门、区域、问题统计 |
| 9 | 厂区绿化维护记录 | `Equipment`、`MaintenanceRecord`、`WorkshopArea` | 复用并补字段 | 绿化区域作为设施/区域，维护记录进维保或行政设施维护 | 厂区绿化维护可按区域和周期查询 |
| 10 | 厕所消毒记录表 | `CleaningRecord`、`WorkshopArea` | 直接复用，补字段 | 厕所区域、消毒方式、执行人、核验人进入清洁记录 | 厕所消毒进入统一清洁台账 |
| 11 | 厨余垃圾统计表 | `WasteRecord`、`WasteDisposalRecord`、`ExternalParty` | 复用并补字段 | 厨余产生量和清运进入废弃物模块；清运方用外部方 | 厨余垃圾可按日期、重量、去向统计 |
| 12 | 后门外来车辆人员出入登记表 | `VisitorRecord`、`ExternalParty` | 复用并补字段 | 在来访记录补车辆、车牌、进出时间、携带物、门岗检查项 | 外来车辆人员出入可与门岗、车辆和来访目的关联 |
| 13 | 员工外出放行条 | `User`、`Department`、`ApprovalInstance` | 新增轻量人员放行能力 | 员工、部门、外出原因、时间和审批走独立 HR/门岗放行对象，审批走统一审批 | 员工外出不混入来访记录，可按人员和审批状态查询 |
| 14 | 培训记录评价表（在职） | `TrainingProject`、`TrainingPlan`、培训档案、`User` | 直接复用，补签到/评价字段 | 培训主题、讲师、人员、成绩、评价进入培训项目和档案 | 在职培训记录可按人员、课程、效果统计 |
| 15 | 培训需求申请单 | `TrainingPlan`、`TrainingProject`、`ApprovalInstance`、`Department` | 复用并补字段 | 需求来源、对象、计划时间和审批进入培训计划或项目立项 | 培训需求能转年度计划和执行项目 |
| 16 | 外包服务食品安全风险评估、评价表 | `Supplier`、`ExternalParty`、`SupplierEvaluation`、`SupplierDocument`、`CorrectiveAction` | 复用并补共享评估 | 外包服务方按供应商或外部方建档；风险评价进入供应商评价/共享评估；问题进 CAPA | 外包服务食品安全风险能约束准入和复评 |
| 17 | 外来文件清单 | `Document`、`BusinessDocumentLink` | 直接复用，补分类视图 | 外来标准、法规、客户文件作为受控文档分类 | 外来文件版本、来源和适用范围可查 |
| 18 | 工作联系单 | `Document`、`TodoTask`、`Department`、`User` | 复用并补沟通工单能力 | 联系事项形成任务流；附件走文控；责任人和完成结果结构化 | 工作联系可跟踪状态和责任部门 |
| 19 | 工厂钥匙每月盘点记录表 | `User`、`Department`、`ApprovalInstance` | 新增钥匙管理能力 | 建钥匙台账/借用/盘点轻量能力；盘点差异可触发审批或整改 | 钥匙数量、持有人、借还和盘点差异可追 |
| 20 | 年度应急演练计划 | `EmergencyDrillRecord`、`TodoTask`、`Department` | 复用并补计划能力 | 当前应急模块偏执行记录；补年度计划、演练类型、预计时间、责任部门 | 年度演练计划能生成待办并关联实际演练 |
| 21 | 应急预案演练和评审记录 | `EmergencyDrillRecord`、`CorrectiveAction`、`Document` | 复用并补字段 | 演练日期、人员、过程、问题、改进和评审结论进入应急演练；问题转 CAPA | 演练和评审形成计划、执行、整改闭环 |
| 22 | 文件借阅复制记录 | `Document`、`User` | 复用并补文控操作台账 | 借阅、复制、归还、批准人进入文控操作记录 | 文件外借复制可按文档版本和人员审计 |
| 23 | 文件发放（领用）登记表 | `Document`、`User`、`Department` | 复用并补文控操作台账 | 发放对象、份数、版本、签收、回收状态结构化 | 文件领用不再依赖纸面台账 |
| 24 | 文件归档登记表 | `Document`、`DocumentVersion` | 复用并补生命周期/归档操作 | 归档日期、保管期限、归档位置、责任人进入文控生命周期 | 文件归档状态和版本留痕可查 |
| 25 | 文件收发记录表 | `Document`、`User`、`Department` | 复用并补文控操作台账 | 收文/发文、来源/去向、接收人、版本和附件进入文控操作 | 文件收发可按来源、部门、版本追踪 |
| 26 | 文件更改申请表 | `ChangeEvent`、`Document`、`ApprovalInstance` | 直接复用，补字段 | 文件更改作为变更事件；受影响文档引用 `Document`；审批走统一审批 | 文件更改从申请、审批、版本发布到回收形成闭环 |
| 27 | 文件销毁审批表 | `Document`、`ApprovalInstance` | 复用并补文控操作台账 | 销毁对象、版本、原因、审批、销毁执行/见证进入文控操作 | 文件销毁有审批和执行证据 |
| 28 | 新员工入职培训记录档案 | `User`、`Department`、`TrainingProject`、培训档案 | 直接复用，补入职场景 | 新员工绑定培训项目、考核结果和档案；岗位和部门引用人员主数据 | 入职培训能纳入人员培训档案 |
| 29 | 日常卫生打扫记录表 | `CleaningRecord`、`WorkshopArea` | 直接复用，补字段 | 区域、项目、责任人、核验人进入清洁记录 | 日常卫生打扫进入统一清洁台账 |
| 30 | 来宾进入车间健康及保密声明 | `VisitorRecord`、`Document`、`BusinessDocumentLink` | 复用并补字段 | 来宾健康声明、保密承诺、进入区域和陪同人作为来访记录扩展；签名件走文控附件 | 来宾进车间可同时满足健康、保密和区域管控 |
| 31 | 来访人员登记表 | `VisitorRecord` | 直接复用，补字段 | 补身份证/电话、进出时间、来访单位、目的、陪同人等字段 | 来访人员统一在来访记录页查询 |
| 32 | 样品接收单 | `Sample`、`MaterialBatch`、`IncomingInspection`、`Document` | 复用并补样品接收能力 | 样品主体落 `Sample`；若为来料样品关联物料批次/来料检验；附件走文控 | 样品接收可进入检验、留样和追溯 |
| 33 | 法律法规清单 | `Document`、`BusinessDocumentLink` | 新增合规要求清单能力 | 法规文件作为外来受控文档；法规条款、适用范围、更新责任和符合性状态需要结构化清单 | 法规变更能触发评估、培训和文件更新 |
| 34 | 洗衣房工作记录表 | `CleaningRecord`、`Material`、`InventoryMovement` | 复用并补字段 | 洗涤、消毒、发放、异常作为清洁/行政物品流转记录；耗材可走库存 | 工衣清洗和发放可按日期、数量、责任人查询 |
| 35 | 洗衣房工衣库存明细 | `Material`、`StockCount`、`InventoryMovement`、`User` | 复用并补字段 | 工衣作为行政受控物品/物料；尺码、数量、领用人和库存移动结构化 | 工衣库存和领用不再靠手工余额表 |
| 36 | 礼品出入库登记表 | `Material`、`InventoryMovement`、`StockCount` | 复用并补行政物品分类 | 礼品作为非生产物料/行政物品；入库、出库、盘点走库存移动 | 礼品库存可按数量、去向和责任人统计 |
| 37 | 礼品领用记录 | `InventoryMovement`、`User`、`Department` | 复用并补字段 | 领用人、部门、用途、数量和审批进入库存移动或行政物品领用 | 礼品领用能与库存余额联动 |
| 38 | 管理评审会议纪要 | `Document`、`User`、`Department`、`CorrectiveAction` | 新增管理评审能力 | 作为管理评审会议节点；参会人、议题、结论、措施结构化，附件走文控 | 会议结论和后续措施可进入 CAPA |
| 39 | 管理评审报告 | `Document`、`CorrectiveAction` | 新增管理评审能力 | 报告输出挂管理评审对象；改进措施生成 CAPA | 管理评审输出能驱动整改闭环 |
| 40 | 组织架构图 | `Department`、`User`、`Role`、`Document` | 直接复用，补文控附件 | 组织关系来自部门/用户/角色；正式组织架构图作为文控文件 | 组织架构图不成为第二套人员组织事实 |
| 41 | 组织环境因素及相关方需求和期望识别表 | `ExternalParty`、`Department`、`CorrectiveAction` | 新增共享合规/风险评估能力 | 相关方用外部方/部门；需求、风险、措施进入共享评估；问题进 CAPA | 相关方需求能进入管理评审和整改 |
| 42 | 记录处理审批单 | `Document`、`ApprovalInstance` | 复用并补文控/记录生命周期 | 记录保留、转移、销毁、审批和责任人进入文控操作台账 | 记录处理有审批、执行和版本证据 |
| 43 | 记录汇总清单 | `Document`、`BusinessDocumentLink` | 复用并补清单视图 | 记录清单由受控文件/记录类型和业务链接派生；不恢复动态记录索引 | 记录汇总清单成为文控视图，不是运行时事实源 |
| 44 | 货物放行条 | `InventoryMovement`、`ProductionBatch`、`MaterialBatch`、`ExternalParty`、`ApprovalInstance` | 复用并补字段 | 放行对象引用成品批次或物料批次；客户/承运方用外部方；审批走统一审批 | 货物放行和库存移动、批次流向、审批关联 |
| 45 | 质检大抽检检查记录表 | `User`、`Department`、`NonConformance`、`CorrectiveAction` | 复用并补现场/人员检查能力 | 行政主导的大抽检作为现场检查；问题转 NC/CAPA；责任部门结构化 | 抽检问题能按部门、人员、整改状态统计 |
| 46 | 车间人员操作情况检查考核表 | `User`、`Department`、`ViolationRecord`、`TrainingProject`、`CorrectiveAction` | 复用并补现场/人员检查能力 | 操作问题进人员检查或违规；培训改进进培训项目；严重问题进 CAPA | 人员操作问题可联动培训和整改 |
| 47 | 邮件包裹检查记录表 | `User`、`Department`、`Document` | 新增轻量门岗/包裹检查能力 | 邮包来源、收件人、检查项目、异常和处置结构化；附件/照片走文控 | 邮件包裹安全检查可按人员、异常和日期查询 |
| 48 | 钥匙借用登记录表 | `User`、`Department`、`ApprovalInstance` | 新增钥匙管理能力 | 钥匙编号、借用人、借出/归还时间、批准人、逾期状态结构化 | 钥匙借还和月度盘点使用同一事实源 |
| 49 | 食品安全小组 | `User`、`Department`、`Role`、`Document` | 复用并补小组成员视图 | 小组成员由用户、部门、角色/岗位派生；任命文件走文控；字段映射需补齐 | 食品安全小组不单独造人员表，成员变更能跟组织主数据一致 |
| 50 | 食品安全文化建设计划执行及评价情况 | `FoodSafetyCultureRecord`、`CorrectiveAction`、`Department` | 直接复用，补字段 | 活动计划、执行、评价、问题和改进进入食品安全文化记录 | 食品安全文化活动和评价进入现有模块 |
| 51 | 食堂卫生及食品安全检查记录 | `CleaningRecord`、`NonConformance`、`CorrectiveAction`、`WorkshopArea` | 复用并补现场检查能力 | 食堂清洁项进清洁记录；食品安全检查项作为现场检查；问题转 NC/CAPA | 食堂卫生和食品安全问题可追到整改闭环 |

## 行政人事部首轮结论

1. 行政人事部不是“杂表集中营”，不能用动态 `RecordTemplate/Record` 承接所有行政表；其中人员、培训、来访、应急、文控、清洁、废弃物、库存和食品安全文化都有现成轮子。
2. 两个字段映射表覆盖 50/51，缺 `食品安全小组`；后续主数据字段对齐时必须补上它的人员、部门、角色、任命文件关系。
3. 文控类表单占比高，核心缺口是文控操作台账：收发、借阅、复制、发放、归档、销毁、记录处理审批都应复用 `Document`，但需要结构化操作记录。
4. 行政人事部明确新增边界包括区域授权、员工外出放行、钥匙管理、邮件包裹检查、合规要求清单；这些都有独立查询和责任闭环，不能只当附件。
5. 管理评审、共享合规/风险评估、现场/人员检查能力与品质部高度重叠，应做成跨部门能力，不要按行政人事单独造表。
