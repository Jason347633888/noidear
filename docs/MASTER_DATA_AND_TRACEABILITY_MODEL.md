# 主数据与追溯模型

本文档是食品安全、主数据、批次、追溯、召回、投诉、不合格、返工、仓储、制造、QA/QC、研发跨模块链路的 hard gate。执行相关任务前必须阅读本文件，并用当前代码确认具体字段和接口。

## 1. 权威来源

当前代码事实源：

- `server/src/prisma/schema.prisma`
- `server/src/modules/traceability/`
- `server/src/modules/warehouse/`
- `server/src/modules/product/`
- `server/src/modules/process/`
- `server/src/modules/recipe/`
- `server/src/modules/model-landing/`
- `packages/types/traceability.ts`
- `client/src/api/traceability.ts`

283 张源表单的落地映射当前由 model-landing artifact 表达：

- `archive/superpowers/specs/2026-04-24-model-landing-layer-design.md`
- `archive/superpowers/specs/2026-04-24-model-landing-layer-form-expansion.csv`
- `server/src/modules/model-landing/generated/model-landing.generated.ts`

验证命令：

```bash
npm run model-landing:verify -w server
npm run traceability:verify -w server
```

## 2. 建模原则

1. 主数据只建一份事实源。
2. 批次数据必须能回到主数据。
3. 过程记录可以引用主数据和批次，但不能复制主数据事实。
4. 追溯链路使用桥接表表达，不在页面、导出或 JSON 字段中手写第二套关系。
5. `RecordTemplate` / `Record` 用于动态记录表单，不替代核心主数据和批次账。
6. 新审批默认使用 `ApprovalInstance` / `ApprovalTask`。

## 3. 对象分类

### 主数据

| 业务对象 | 当前模型 |
|---|---|
| 产品 | `Product` |
| 物料 | `Material` |
| 供应商 | `Supplier` |
| 外部客户、承运方等 | `ExternalParty` |
| 用户 | `User` |
| 部门 | `Department` |
| 角色 | `Role` |
| 区域/工段 | `WorkshopArea` |
| 设备 | `Equipment` |
| 测量设备 | `MeasuringEquipment` |

### 批次与库存

| 业务对象 | 当前模型 |
|---|---|
| 物料批次 | `MaterialBatch` |
| 生产批次 | `ProductionBatch` |
| 投料关系 | `BatchMaterialUsage` |
| 库存记录 | `StockRecord` |
| 库存移动流水 | `InventoryMovement` |
| 车间暂存 | `StagingAreaStocktake` 等 staging 相关模型 |
| 入库 | `MaterialInbound` |
| 退料/报废 | `MaterialReturn`、`MaterialScrap` |

### 研发、配方与工序

| 业务对象 | 当前模型 |
|---|---|
| 研发流程模板 | `ProcessTemplate` |
| 研发流程实例 | `ProcessInstance` |
| 步骤数据 | `ProcessStepData` |
| 配方 | `Recipe` |
| 配方行 | `RecipeLine` |
| 工序步骤 | `ProcessStep` |
| CCP 点 | `CCPPoint` |
| CCP 记录 | `CCPRecord` |

### 质量治理

| 业务对象 | 当前模型 |
|---|---|
| 来料检验 | `IncomingInspection` |
| 不合格 | `NonConformance` |
| 纠正措施 | `CorrectiveAction` |
| 顾客投诉 | `CustomerComplaint` |
| 召回 | `ProductRecall` |
| 召回批次 | `ProductRecallBatch` |
| 召回通知 | `ProductRecallNotification` |
| 召回证据 | `ProductRecallEvidence` |
| 返工 | `ReworkRecord` |
| 变更 | `ChangeEvent`；审批运行由 `ApprovalInstance` / `ApprovalTask` 承载 |
| 废弃物 | waste 模块模型 |

### 过程记录

| 业务对象 | 当前模型 |
|---|---|
| 环境记录 | `EnvironmentRecord` |
| 过程监控 | `ProcessMonitorRecord` |
| 金属探测 | `MetalDetectionLog` |
| 清洁消毒 | `CleaningRecord` |
| 违规 | `ViolationRecord` |
| 用药 | `MedicationRecord` |
| 访客 | `VisitorRecord` |
| 应急演练 | `EmergencyDrillRecord` |
| 玻璃/硬塑完整性 | `FragileItemInspection` |
| 换产检查 | `LineChangeCheckRecord` |
| 食品安全文化 | `FoodSafetyCultureRecord` |

## 4. 主追溯链路

当前追溯链路应围绕以下关系组织：

```text
Supplier
  -> Material
  -> MaterialBatch
  -> BatchMaterialUsage
  -> ProductionBatch
  -> DeliveryNote / CustomerComplaint / ProductRecall
```

关键边界：

- `Supplier` 不能替代 `ExternalParty`。
- `MaterialBatch` 不能替代 `Material`。
- `ProductionBatch` 不能替代 `Product`。
- `BatchMaterialUsage` 是投料桥接关系，不是普通记录备注。
- 召回、投诉、不合格、返工应引用可追溯对象，而不是复制批次文本。

## 5. 仓储规则

当前代码规则来自 `server/src/modules/warehouse/`：

- 物料批次直接创建已关闭，新批次由入库流程产生。
- `MaterialBatch.batchNumber` 不允许修改。
- FIFO 查询只返回正常且有库存批次，排序为 `expiryDate asc`、`createdAt asc`。
- 过期批次由定时任务更新状态。
- 领料完成会扣减批次库存，写入 `StockRecord` 和 `InventoryMovement`。
- 维修领料必须关联在用设备，非维修领料不能关联设备。

## 6. 产品研发规则

当前代码规则来自 `server/src/modules/process/`：

- 研发流程可绑定现有 `Product`。
- 步骤数据写入 `ProcessStepData`。
- 审批需求来自流程模板步骤配置的 `requiredApprovals`。
- Step1 可创建或绑定产品。
- Step5 可写回产品属性。
- Step6 可创建首版配方。
- 最后一步通过后，流程和产品状态推进。

设计或修改产品研发链路时，不要把旧文档中的固定步骤审批写法当成当前事实。

## 7. Record 与独立业务表边界

使用独立业务表的情况：

- 对象会被多模块引用。
- 对象参与追溯、库存、审批、召回、投诉或不合格链路。
- 对象需要查询、统计、权限控制或生命周期状态。
- 对象字段会参与业务规则。

使用 `RecordTemplate` / `Record` 的情况：

- 表单结构变化频繁。
- 主要用途是填报、归档、检查或留痕。
- 不作为主数据、批次、库存或追溯事实源。

若一张源表单包含主数据字段和检查记录，应拆分：主数据进入独立模型，检查项进入记录表单或业务记录模型。

## 8. 文控与业务对象

当前边界：

- 受控文件：`Document`
- 版本：`DocumentVersion`
- 发放：`DocumentIssuance`
- 业务对象与文件关系：`BusinessDocumentLink`
- 记录模板：`RecordTemplate`
- 填报记录：`Record`

体系文件可以说明业务要求，但不能替代运行时业务事实。运行时事实应落在对应业务模型中。

## 9. 追溯查询实现边界

当前追溯模块：

- controller/service：`server/src/modules/traceability/`
- 前端 API：`client/src/api/traceability.ts`
- 前端页面：`client/src/views/traceability/TraceabilityQuery.vue`
- 类型合同：`packages/types/traceability.ts`

修改追溯时必须保持：

- 前后端类型一致。
- 查询、导出、快照使用同一套链路服务。
- 页面不自行拼装业务链路。
- 历史 batch-trace 页面不能重新成为主入口。

## 10. 命名对齐

| 旧/业务叫法 | 当前代码名 |
|---|---|
| MaterialLot | `MaterialBatch` |
| IngredientUsage | `BatchMaterialUsage` |
| Customer | `ExternalParty`，当对象是外部方时使用 |
| DocumentApproval | `ApprovalInstance` / `ApprovalTask` / `ApprovalAction`；当前项目无历史业务数据，旧 `Approval` 不再保留兼容 |
| ProcessRecord | `ProcessMonitorRecord` 或 process-record 模块，按代码确认 |

新增文档、API、页面和测试时应使用当前代码名，除非专门解释历史术语。

## 11. 变更检查清单

涉及食品安全链路的改动，提交前至少检查：

- 是否新增了平行主数据。
- 是否复制了批次编号但没有外键或稳定引用。
- 是否绕过 `BatchMaterialUsage` 构造投料关系。
- 是否让 `Record.data` 成为库存、批次或追溯事实源。
- 是否破坏 `packages/types/traceability.ts`。
- 是否需要更新 `model-landing.generated.ts` 并运行验证。
- 是否需要补充迁移、seed 或兼容脚本。
