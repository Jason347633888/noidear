# 供应商管理、采购来料与来料检验

---
module_id: supplier-procurement-incoming
business_chain:
  - Supplier → MaterialInbound → MaterialBatch → IncomingInspection
  - SupplierEvaluation → Supplier.supplier_status
  - ExternalParty（客户/承运商，与 Supplier 不重叠）
module_type:
  - master-data（Supplier）
  - inbound-transaction（MaterialInbound / MaterialBatch）
  - quality-record（IncomingInspection）
  - governance（SupplierEvaluation, SupplierDocument）
source_of_truth:
  - Supplier：server/src/modules/warehouse/supplier.service.ts
  - MaterialBatch：由 InboundService.complete() 创建，server/src/modules/warehouse/inbound.service.ts
  - IncomingInspection：server/src/modules/incoming-inspection/incoming-inspection.service.ts
  - SupplierEvaluation：server/src/modules/supplier-evaluation/supplier-evaluation.service.ts
facts_or_projections:
  - Supplier、MaterialBatch、IncomingInspection 均为独立事实表，不允许在下游模块重复维护
downstream_consumers:
  - 仓储/领料（MaterialRequisition → batchId 引用 MaterialBatch）
  - 追溯（/traceability → MaterialBatch → BatchMaterialUsage → ProductionBatch）
  - 物料平衡（MaterialBalanceService 汇总 StockRecord + BatchMaterialUsage）
current_entrypoints:
  - /warehouse/suppliers → SupplierList.vue
  - /incoming-inspections → IncomingInspectionList.vue
  - /supplier-evaluations → EvaluationList.vue
  - /warehouse/batches（可访问 BatchManagement.vue，但导航未必明确）
last_verified_commit: 7bab98dc3ccd49e8e1d76b95b28a1b79207c483c
---

## 1. 模块定位

本模块覆盖食品安全 SaaS 的采购入口链路，包含三个子域：

1. **供应商主数据管理**：创建/维护 `Supplier`（含资质 `SupplierQualification`、受控文件 `SupplierDocument`）。
2. **采购到来料**：从 `MaterialInbound`（到货单）经审批流后完成（`complete`），自动生成 `MaterialBatch`（物料批次/业务口径 `MaterialLot`）并写入 `StockRecord`。
3. **来料检验**：`IncomingInspection` 绑定 `material_batch_id`，记录抽检结论和处置方式，支持上传外部检验报告（`BusinessDocumentLink`）。
4. **供应商评估**：`SupplierEvaluation` 定期评分，联动更新 `Supplier.supplier_status`。

**边界说明**：`ExternalParty`（客户/承运商/废品回收商）与 `Supplier`（原辅料/包材供应商）是独立模型，`party_type` 枚举为 `customer | carrier | waste_collector`，不应与 `Supplier` 混用。

---

## 2. 使用角色

| 角色 | 使用目的 | 关键动作 |
|---|---|---|
| 采购员 | 维护供应商台账，录入采购到货单 | 创建 Supplier、创建 MaterialInbound、提交审批 |
| 仓管员 | 确认到货并完成入库，生成批次 | complete MaterialInbound → 生成 MaterialBatch + StockRecord |
| 品质检验员 | 对新到批次执行来料检验，记录结论 | 创建 IncomingInspection，绑定 material_batch_id |
| 品质管理员 | 维护供应商资质，进行绩效评估 | 上传 SupplierDocument，提交 SupplierEvaluation |
| 仓储/生产管理 | 查询可用批次，追溯批次来源 | 查询 MaterialBatch，通过 /traceability 追溯 |

---

## 3. 当前入口

| 入口 | 页面 | 前端 API | 后端 API | 后端模块 |
|---|---|---|---|---|
| `/warehouse/suppliers` | `SupplierList.vue` | `supplierApi` (`client/src/api/warehouse.ts`) | `GET/POST /warehouse/suppliers` | `WarehouseModule → SupplierService` |
| `/warehouse/batches` | `BatchManagement.vue` | `batchApi` (`client/src/api/warehouse.ts`) | `GET/POST /warehouse/batches` | `WarehouseModule → BatchService` |
| `/incoming-inspections` | `IncomingInspectionList.vue` | `incomingInspectionApi` (`client/src/api/incoming-inspection.ts`) | `GET/POST /incoming-inspections` | `IncomingInspectionModule` |
| `/supplier-evaluations` | `EvaluationList.vue` | `supplierEvaluationApi` (`client/src/api/supplier-evaluation.ts`) | `GET/POST /supplier-evaluations` | `SupplierEvaluationModule` |

---

## 4. 当前实现

| 对象 | 当前实现 | 说明 |
|---|---|---|
| `Supplier` | `server/src/modules/warehouse/supplier.service.ts` | CRUD + SupplierQualification + SupplierDocument（BusinessDocumentLink 双写）已实现 `已验证` |
| `MaterialInbound` / `MaterialInboundItem` | `server/src/modules/warehouse/inbound.service.ts` | 到货单创建、审批、完成；完成时生成 `MaterialBatch` + `StockRecord`（`recordType: 'in'`）`已验证` |
| `MaterialBatch`（业务口径 `MaterialLot`） | `server/src/modules/warehouse/batch.service.ts` | CRUD + FIFO 查询 + 定时过期锁定（每日凌晨）；支持直接手工创建（绕过入库单流程） `已验证` |
| `IncomingInspection` | `server/src/modules/incoming-inspection/incoming-inspection.service.ts` | 绑定 `material_batch_id`（外键），`already verifiedField`；支持外部报告上传（PDF 预签名 URL） `已验证` |
| `SupplierEvaluation` | `server/src/modules/supplier-evaluation/supplier-evaluation.service.ts` | 评分后联动写 `Supplier.supplier_status` `已验证` |
| `ExternalParty` | `server/src/modules/external-party/external-party.service.ts` | 独立模型，`party_type: customer/carrier/waste_collector`；与 `Supplier` 无 FK 关联 `已验证` |

---

## 5. 正确业务流程

| 步骤 | 用户动作 | 系统结果 | 绑定模块 | 缺失后果 |
|---|---|---|---|---|
| 1 | 采购员确认供应商已在台账中 | `Supplier` 存在，含有效 `supplier_status: approved` | SupplierService | 无供应商主数据则入库单无法关联溯源 |
| 2 | 采购员录入到货单 `MaterialInbound` + `MaterialInboundItem` | 状态 `draft`，触发审批流（可选） | InboundService | — |
| 3 | 仓管员审批并完成（`complete`）入库单 | 每个 `MaterialInboundItem` 生成一个 `MaterialBatch`，同时写 `StockRecord(recordType: in)` | InboundService | 若跳过 complete 步骤，批次不会生成，后续无法检验、领料、追溯 |
| 4 | 品质检验员对新批次创建 `IncomingInspection` | 记录 `overall_result`、抽检项目，可上传外部报告 | IncomingInspectionService | 无检验记录则无法证明批次已放行，追溯链缺失 |
| 5 | 仓管员或系统查询批次状态 | `MaterialBatch.lot_status` 反映库存状态 | BatchService | — |
| 6 | 品质管理员按周期提交 `SupplierEvaluation` | `Supplier.supplier_status` 更新为 `approved/suspended/eliminated` | SupplierEvaluationService | 无评估则供应商准入状态不更新，无法支持再评价管理 |

---

## 6. 上下游绑定关系

```text
Supplier（主数据）
  ├── MaterialBatch（supplierId FK）
  ├── MaterialInbound（supplierId FK）
  ├── SupplierDocument（BusinessDocumentLink）
  └── SupplierEvaluation（supplier_id FK → 联动更新 Supplier.supplier_status）

MaterialInbound
  └── MaterialInboundItem
        └── [complete] → MaterialBatch（自动生成）
                          └── StockRecord（recordType: in）
                          └── IncomingInspection（material_batch_id FK）
                          └── MaterialRequisitionItem（batchId FK）→ StockRecord(out)
                          └── BatchMaterialUsage（materialBatchId FK）→ ProductionBatch

ExternalParty（独立模型，party_type: customer/carrier/waste_collector）
  — 与 Supplier 无 FK 关联，不参与追溯主链 —
```

---

## 7. 当前系统差距

| GAP 编号 | 当前问题 | 根因 | 影响后果 | 严重级别 | 验证状态 | 证据 |
|---|---|---|---|---|---|---|
| GAP-100 | `IncomingInspectionList.vue` 中"物料批次ID"字段为自由输入文本框（`<el-input>`），不是 MaterialBatch 选择器 | 前端表单未绑定 BatchSelector 组件 | 用户可输入不存在的 batch_id；如果输入错误，IncomingInspection 与 MaterialBatch 外键虽有数据库约束会报错，但用户体验很差；追溯链质量依赖手工正确输入 | P1 | 已验证 | `client/src/views/incoming-inspection/IncomingInspectionList.vue` 第 91–93 行 |
| GAP-101 | `BatchService.create()` 允许手工直接创建 `MaterialBatch`，绕过 `MaterialInbound` 完成流程 | BatchController 暴露 POST /warehouse/batches 接口，无入库单前置校验 | 手工创建的批次缺少到货单来源，`supplierId`/`supplierBatchNo`/入厂日期可能不完整，导致追溯链断裂 | P1 | 已验证 | `server/src/modules/warehouse/batch.service.ts` create() 方法；`client/src/api/warehouse.ts` batchApi.create() |
| GAP-102 | `InventoryMovement` 模型存在于 schema 中，但整个仓库模块的业务逻辑（入库、领料、退料、报废）均只写 `StockRecord`，`InventoryMovement` 从未被任何 Prisma service 调用 | 双模型并存，`InventoryMovement` 是遗留/预留模型，实际未激活 | 物料平衡 (`MaterialBalanceService`) 仅查 `StockRecord`，未查 `InventoryMovement`；如果有其他路径写入 `InventoryMovement`（如 model-landing 表单），数据将不一致；两模型作用无明确文档说明 | P1 | 已验证 | `server/src/modules/warehouse/material-balance.service.ts`；`grep -rn "prisma.inventoryMovement"` 无输出；schema line 2669 |
| GAP-103 | `Supplier` 有两个状态字段：`status`（`active/disabled`，通用 CRUD 控制）和 `supplier_status`（`approved/suspended/eliminated/pending`，食品安全准入控制）；两个字段语义重叠但未互相联动 | 历史叠加字段，未做统一状态机 | 供应商被禁用（`status: disabled`）但 `supplier_status` 仍为 `approved`，可被领料/入库选中；反之 `supplier_status: eliminated` 但 `status: active`，下游未做准入门禁 | P1 | 已验证 | `server/src/prisma/schema.prisma` Supplier model line 1097–1126；`supplier-evaluation.service.ts` 只更新 `supplier_status` |
| GAP-104 | `/warehouse/batches` 路由和 `BatchManagement.vue` 已注册并可访问，但在导航菜单/侧边栏中是否可见未知（无菜单配置文件可查） | 路由存在但入口可见性未经验证 | 如果隐藏，批次管理功能入口不明确，运营人员无法直接访问；如果可见，用户可绕过入库单直接创建批次（见 GAP-2） | P2 | 需要运行系统确认 | `client/src/router/index.ts` line 406–409 |
| GAP-105 | `SupplierEvaluation.company_id` 硬编码为字符串 `'1'`，无多租户隔离 | service 实现中未接收动态 companyId | 多租户场景下评估数据会跨公司共享 | P2 | 已验证 | `server/src/modules/supplier-evaluation/supplier-evaluation.service.ts` line 20 |

---

## 8. 整改建议

| GAP 编号 | 建议整改 | 依赖模块 | 是否需要新设计 | 建议 PR | 是否可并行 |
|---|---|---|---|---|---|
| GAP-100 | 将来料检验创建表单中的"物料批次ID"文本框替换为 MaterialBatch 选择器（支持批次号/物料名搜索） | warehouse/BatchService（提供候选批次接口） | 否（复用已有 `/warehouse/batches` API） | `fix/incoming-inspection-batch-selector` | 可 |
| GAP-101 | 在 `POST /warehouse/batches` 加业务注释或权限门禁；推荐路径：仅允许通过 `MaterialInbound.complete()` 创建批次，手工创建接口加管理员权限或废弃 | warehouse | 否 | `fix/batch-create-gate` | 可 |
| GAP-102 | 明确 `InventoryMovement` 与 `StockRecord` 的职责边界：若 `InventoryMovement` 是仓储业务口径的标准库存移动表，则将 StockRecord 的写入逻辑迁移至此并废弃 StockRecord；若 `InventoryMovement` 仅用于 model-landing 的 283 张表单，则在文档中明确并防止业务逻辑写入 | 仓储主链、MaterialBalanceService | 是（需要统一决策） | `refactor/inventory-ledger-unification` | 否，需先决策 |
| GAP-103 | 明确 `status` 与 `supplier_status` 的职责边界；推荐：`status` 管理软删除/激活，`supplier_status` 管准入状态；在入库、领料前加门禁检查 `supplier_status !== 'eliminated'` | warehouse/InboundService, RequisitionService | 否 | `fix/supplier-status-gate` | 可 |
| GAP-105 | `SupplierEvaluationService` 接收动态 `companyId`，与其他 service 保持一致 | 认证/租户中间件 | 否 | `fix/supplier-eval-company-id` | 可 |

---

## 9. 证据索引

- `server/src/modules/warehouse/warehouse.module.ts` — 模块注册
- `server/src/modules/warehouse/supplier.service.ts` — Supplier CRUD + 资质 + 受控文件
- `server/src/modules/warehouse/inbound.service.ts` — MaterialInbound 创建/审批/完成（生成 MaterialBatch + StockRecord）
- `server/src/modules/warehouse/batch.service.ts` — MaterialBatch CRUD + FIFO + 定时过期
- `server/src/modules/warehouse/material-balance.service.ts` — 物料平衡：仅查 StockRecord 和 BatchMaterialUsage
- `server/src/modules/incoming-inspection/incoming-inspection.service.ts` — IncomingInspection + 报告上传
- `server/src/modules/supplier-evaluation/supplier-evaluation.service.ts` — 评估 + 联动 supplier_status
- `server/src/modules/external-party/external-party.service.ts` — ExternalParty（独立模型）
- `server/src/prisma/schema.prisma` lines 1097–1126 (Supplier), 980–1029 (MaterialBatch), 1032–1050 (StockRecord), 2638–2667 (IncomingInspection), 2669–2687 (InventoryMovement), 3468–3483 (SupplierEvaluation), 3603–3619 (ExternalParty)
- `client/src/api/warehouse.ts` — 仓库 API 适配器
- `client/src/api/incoming-inspection.ts` — 来料检验 API 适配器
- `client/src/api/supplier-evaluation.ts` — 供应商评估 API 适配器
- `client/src/views/incoming-inspection/IncomingInspectionList.vue` — 来料检验前端（GAP-1 证据）
- `client/src/router/index.ts` lines 401–419 (warehouse routes), 775 (supplier-evaluations), 823 (incoming-inspections)
- `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` section 4.1 (Supplier/IncomingInspection/InventoryMovement)

---

## 10. 禁止重复实现与事实源边界

| 对象 | 当前事实源 | 允许展示字段 | 禁止新增的平行事实源 | 旧字段或旧模块处理 |
|---|---|---|---|---|
| 供应商主数据 | `Supplier`（`suppliers` 表） | name, supplierCode, supplier_status | 不允许在 MaterialBatch、IncomingInspection 等下游表重新维护供应商名称 | `ExternalParty` 不得承接供应商功能 |
| 物料批次 | `MaterialBatch`（`material_batches` 表）| batchNumber, lot_status, quantity, expiryDate | 不允许在 IncomingInspection 或 BatchMaterialUsage 中维护批次数量副本 | — |
| 库存流水（当前激活） | `StockRecord`（`stock_records` 表）| recordType, quantity, relatedType | 不允许在独立表单或前端状态中单独维护库存数量（须回 StockRecord 查询） | `InventoryMovement` 当前未被任何 service 使用，需决策后再处理 |
| 来料检验结论 | `IncomingInspection.overall_result` | overall_result, disposition | 不允许在 MaterialBatch 字段中冗余存储检验结论文本 | — |
| 供应商评估结论 | `SupplierEvaluation.verdict` | verdict, total_score | 供应商台账仅展示 `last_evaluated_at`，不重新维护评分 | — |

---

## 11. 后续整改入口

| 优先级 | GAP 编号 | 推荐 PR | 前置依赖 | 可并行 | 验收命令 |
|---|---|---|---|---|---|
| P1 | GAP-102 | `refactor/inventory-ledger-unification` | 业务决策：StockRecord vs InventoryMovement 谁是主账 | 否 | `grep -rn "prisma.inventoryMovement" server/src/` 应有实际调用；MaterialBalanceService 测试通过 |
| P1 | GAP-100 | `fix/incoming-inspection-batch-selector` | 无 | 是 | `IncomingInspectionList.vue` 新建表单中 `material_batch_id` 使用 el-select / 选择器组件 |
| P1 | GAP-103 | `fix/supplier-status-gate` | 无 | 是 | InboundService、RequisitionService 在操作前验证 `supplier_status !== 'eliminated'` |
| P1 | GAP-101 | `fix/batch-create-gate` | 无 | 是 | POST /warehouse/batches 需管理员权限或移除公开接口 |
| P2 | GAP-104 | 无需 PR（导航配置） | 无 | 是 | 需要运行系统确认菜单配置 |
| P2 | GAP-105 | `fix/supplier-eval-company-id` | 无 | 是 | SupplierEvaluationService 使用动态 companyId 参数 |
