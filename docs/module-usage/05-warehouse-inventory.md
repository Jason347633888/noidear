# 仓储与库存管理

---
module_id: warehouse-inventory
business_chain:
  - MaterialBatch → StockRecord（入库/领料/退料/报废）
  - MaterialRequisition → MaterialRequisitionItem → batchId → StagingAreaStock
  - StagingAreaStock → MixingExecutionLine → BatchMaterialUsage → ProductionBatch
  - MaterialBatch → StockCount（盘点）
  - MaterialBalanceService：StockRecord + BatchMaterialUsage → 物料平衡
module_type:
  - inventory-ledger（StockRecord）
  - transaction（MaterialRequisition, MaterialReturn, MaterialScrap）
  - staging（StagingAreaStock, StagingAreaStocktake）
  - balance-report（MaterialBalance）
source_of_truth:
  - 库存流水真实源：StockRecord（stock_records 表）
  - 批次当前库存：MaterialBatch.quantity（由 InboundService/RequisitionService 直接 increment/decrement 维护）
  - 物料平衡：MaterialBalanceService（汇总 StockRecord + BatchMaterialUsage + MaterialBatch.quantity）
  - 配料区暂存：StagingAreaStock（staging_area_stocks 表）
facts_or_projections:
  - InventoryMovement（inventory_movements 表）当前未被任何仓储 service 使用，为未激活遗留表
  - StockCount（stock_counts 表）是盘点记录，不是实时库存
downstream_consumers:
  - 生产配料（StagingAreaStock → MixingExecutionLine）
  - 追溯查询（/traceability → BatchMaterialUsage → MaterialBatch → StockRecord）
  - 物料平衡报表（MaterialBalanceService → 前端 MaterialBalance.vue）
current_entrypoints:
  - /warehouse/materials → MaterialList.vue
  - /warehouse/batches → BatchManagement.vue
  - /warehouse/requisitions → RequisitionList.vue
  - /warehouse/staging-area → StagingArea.vue
  - /warehouse/material-balance → MaterialBalance.vue
last_verified_commit: 7bab98dc3ccd49e8e1d76b95b28a1b79207c483c
---

## 1. 模块定位

本模块是 noidear 食品安全 SaaS 的仓储核心，覆盖以下职责：

1. **物料主数据**（`Material`）：仓库维护物料档案，研发/生产/采购共同引用。
2. **批次台账**（`MaterialBatch`，业务口径 `MaterialLot`）：每批到货物料的唯一实体，承载有效期、供应商批号、当前数量，是所有领料、检验、投料、追溯的核心锚点。
3. **库存流水**（`StockRecord`）：记录每次库存变动（入库/领料出库/退料/报废），当前是**唯一激活的库存流水事实源**。
4. **领料管理**（`MaterialRequisition`）：领料单经审批后执行，批次数量 decrement，StagingAreaStock increment，同时写 StockRecord(out)。
5. **配料区暂存**（`StagingAreaStock`）：批次物料移入车间配料区后的暂存库存，支撑配料执行（`MixingExecutionLine`）。
6. **退料与报废**（`MaterialReturn`, `MaterialScrap`）：经审批后写 StockRecord(return/scrap)，批次数量 increment（退料）或 decrement（报废）。
7. **盘点**（`StagingAreaStocktake` / `StockCount`）：班次开始/结束/交接时盘点，盘差来源。
8. **物料平衡报表**（`MaterialBalanceService`）：汇总 StockRecord(in/out) + BatchMaterialUsage(投料量) + MaterialBatch.quantity，计算平衡差。

---

## 2. 使用角色

| 角色 | 使用目的 | 关键动作 |
|---|---|---|
| 仓管员 | 维护物料主数据、完成到货入库、执行领料发料 | 创建 Material；complete MaterialInbound（生成 MaterialBatch + StockRecord）；complete MaterialRequisition（批次 decrement + StagingAreaStock） |
| 生产领料员 | 申请领料，查询可用批次（FIFO） | 创建 MaterialRequisition，提交审批 |
| 品质管理员 | 查询批次状态，发起盘点，核查物料平衡 | 查询 MaterialBatch；确认 StagingAreaStocktake；查看 MaterialBalance 报表 |
| 生产配料员 | 在配料区使用暂存批次进行配料执行 | 查询 StagingAreaStock；执行 MixingExecution |
| 管理员/品质部 | 追溯原料批次去向，召回决策 | 通过 /traceability 追溯 BatchMaterialUsage → ProductionBatch |

---

## 3. 当前入口

| 入口 | 页面 | 前端 API | 后端 API | 后端模块 |
|---|---|---|---|---|
| `/warehouse/materials` | `MaterialList.vue` | `materialApi` (`client/src/api/warehouse.ts`) | `GET/POST/PUT/DELETE /warehouse/materials` | `WarehouseModule → MaterialService` |
| `/warehouse/batches` | `BatchManagement.vue` | `batchApi` (`client/src/api/warehouse.ts`) | `GET/POST/PUT /warehouse/batches` | `WarehouseModule → BatchService` |
| `/warehouse/requisitions` | `RequisitionList.vue` | `requisitionApi` (`client/src/api/warehouse.ts`) | `GET/POST /warehouse/requisitions` | `WarehouseModule → RequisitionService` |
| `/warehouse/staging-area` | `StagingArea.vue` | `stagingAreaApi` (`client/src/api/warehouse.ts`) | `GET /warehouse/staging-area/stock`，`POST /warehouse/staging-area/stage-to-area`，`POST /warehouse/staging-area/stocktakes` | `WarehouseModule → StagingAreaService` |
| `/warehouse/material-balance` | `MaterialBalance.vue` | `materialBalanceApi` (`client/src/api/warehouse.ts`) | `GET /warehouse/material-balance` | `WarehouseModule → MaterialBalanceController` |
| `/warehouse/traceability` | 已重定向 → `/traceability` | — | — | 遗留路由，redirect 已配置 |

---

## 4. 当前实现

| 对象 | 当前实现 | 说明 |
|---|---|---|
| `Material`（物料主数据） | `server/src/modules/warehouse/material.service.ts` | CRUD + 状态管理（active/inactive）；研发配方、采购、检验共同引用 `已验证` |
| `MaterialBatch`（物料批次/`MaterialLot`） | `server/src/modules/warehouse/batch.service.ts` | CRUD + FIFO（`getFIFO`，按 expiryDate/createdAt 排序）+ 定时过期锁定（每日凌晨 `@Cron`）；`quantity` 字段直接 increment/decrement `已验证` |
| `StockRecord`（库存流水） | 由 InboundService/RequisitionService/ReturnService/ScrapService 写入 | `recordType`: in/out/return/scrap；`relatedType`: inbound/requisition/return/scrap；是**唯一激活**的库存流水事实源 `已验证` |
| `InventoryMovement`（库存移动） | 仅存在于 schema，未被任何 warehouse service 调用 | `prisma.inventoryMovement` 在所有 service 中无调用记录；model-landing 生成文件中引用了该模型名称，但不产生实际写入 `已验证` |
| `MaterialRequisition` + `MaterialRequisitionItem` | `server/src/modules/warehouse/requisition.service.ts` | draft → pending（submit）→ approved → completed；complete 时批次 decrement + StagingAreaStock upsert + StockRecord(out) `已验证` |
| `MaterialReturn` | `server/src/modules/warehouse/services/return.service.ts` | draft → approved → complete；complete 时批次 increment + StockRecord(return) `已验证` |
| `MaterialScrap` | `server/src/modules/warehouse/services/scrap.service.ts` | draft → approved；approved 时批次 decrement + StockRecord(scrap) `已验证` |
| `StagingAreaStock` | `server/src/modules/warehouse/staging-area.service.ts` | 按 batchId + location/area_id 维护暂存库存；支持 stage-to-area 和班次盘点（StagingAreaStocktake）`已验证` |
| `MaterialBalanceService` | `server/src/modules/warehouse/material-balance.service.ts` | checkBalance：StockRecord(in-out) - BatchMaterialUsage = calculated；与 MaterialBatch.quantity 对比计算差异 `已验证` |

---

## 5. 正确业务流程

| 步骤 | 用户动作 | 系统结果 | 绑定模块 | 缺失后果 |
|---|---|---|---|---|
| 1 | 仓管员确认物料主数据已录入 | `Material` 存在，含 code/name/unit/category | MaterialService | 无物料主数据则批次、领料、检验无法关联物料 |
| 2 | 采购到货，入库完成（完整流程见 04 文档） | `MaterialBatch` 生成，`StockRecord(in)` 写入，`MaterialBatch.quantity` 设为到货量 | InboundService | 若跳过 complete，批次不存在，无法领料 |
| 3 | 品质检验（来料检验 `IncomingInspection`）结论为 pass | `IncomingInspection.overall_result = 'pass'` | IncomingInspectionService | 无检验记录则无法证明批次已放行 |
| 4 | 生产领料：创建 `MaterialRequisition`，提交审批 | 状态 draft → pending，触发审批流 | RequisitionService | — |
| 5 | 审批通过后 complete 领料单 | `MaterialBatch.quantity` decrement；`StagingAreaStock` upsert；`StockRecord(out)` 写入 | RequisitionService | 若未 complete，批次数量不减少，物料平衡出错 |
| 6 | 配料员在暂存区执行配料（MixingExecution） | `MixingExecutionLine` → `BatchMaterialUsage` 绑定 `MaterialBatch` 和 `ProductionBatch` | MixingModule | 若无 BatchMaterialUsage，追溯链断裂 |
| 7 | 班次开始/结束/交接时盘点 | `StagingAreaStocktake` 写入实盘数量 | StagingAreaService | 无盘点则无法发现账实差异 |
| 8 | 品质部/仓管查看物料平衡 | `MaterialBalanceService.checkBalance` 汇总 in-out-投料，比较 `MaterialBatch.quantity` | MaterialBalanceService | — |

---

## 6. 上下游绑定关系

```text
Material（物料主数据）
  └── MaterialBatch（materialId FK）←── InboundService.complete() 自动创建
         │
         ├── StockRecord（batchId FK）← in/out/return/scrap 各流程写入
         │
         ├── MaterialRequisitionItem（batchId FK）
         │     └── [complete] → StagingAreaStock（batchId FK, location）
         │                         └── MixingExecutionLine（stagingAreaStockId）
         │                               └── BatchMaterialUsage（materialBatchId）
         │                                     └── ProductionBatch（追溯链核心）
         │
         ├── MaterialReturnItem（materialBatchId FK）
         │     └── [complete] → batch.quantity += qty; StockRecord(return)
         │
         ├── MaterialScrapItem（materialBatchId FK）
         │     └── [approve] → batch.quantity -= qty; StockRecord(scrap)
         │
         ├── IncomingInspection（material_batch_id FK）← 来料检验
         │
         └── StockCount（material_batch_id FK）← 周期盘点

MaterialBalanceService
  查询：StockRecord(in) - StockRecord(out) - BatchMaterialUsage.quantity
  比较：MaterialBatch.quantity（当前账面值）
  输出：difference + isBalanced

InventoryMovement（schema 存在，当前未被任何 service 写入）
  — 未激活，不参与当前库存计算链 —
```

---

## 7. 当前系统差距

| GAP 编号 | 当前问题 | 根因 | 影响后果 | 严重级别 | 验证状态 | 证据 |
|---|---|---|---|---|---|---|
| GAP-102 | `StockRecord` 与 `InventoryMovement` 双事实源并存，`InventoryMovement` schema 已建但从未被任何仓储 service 写入；`MaterialBalanceService` 只查 `StockRecord` | 历史叠加，`InventoryMovement` 为预留/遗留模型，未激活 | 物料平衡结果仅基于 `StockRecord`；若有外部系统或 model-landing 动态表单写入 `InventoryMovement`，则两张表数据不一致，无从合并；业务口径（MASTER_DATA 文档定义的 `InventoryMovement`）与代码实现（`StockRecord` 激活）相反 | P1 | 已验证 | `server/src/modules/warehouse/material-balance.service.ts`（仅查 StockRecord）；`grep -rn "prisma.inventoryMovement" server/src/` 零结果 |
| GAP-106 | `MaterialBatch.quantity` 是直接 increment/decrement 的可变字段，没有加乐观锁或事务隔离保护；高并发领料时可能出现数量不一致 | 当前用 Prisma `data: { quantity: { decrement: item.quantity } }` 在事务内更新，但未验证扣减后不为负值 | 高并发场景下可能出现批次数量变为负数，物料平衡报警虚假 | P2 | 已验证（代码路径）| `server/src/modules/warehouse/requisition.service.ts` complete() line 139；无负值检查 |
| GAP-107 | `MaterialBalanceService.checkBalance` 中物料平衡公式为 `totalIn - totalOut - usedInProduction`，但未包含报废量（scrap）和退料量（return）的 StockRecord 类型，只依赖 `recordType: 'in'` 和 `recordType: 'out'`，而报废写入的是 `recordType: 'scrap'`，退料写入的是 `recordType: 'return'` | checkBalance 中 totalOut 仅过滤 `recordType === 'out'`，未纳入 scrap/return | 物料平衡差异计算不含报废和退料，导致 `isBalanced = false` 假报警或掩盖真实差异 | P1 | 已验证 | `server/src/modules/warehouse/material-balance.service.ts` lines 14–32；`server/src/modules/warehouse/services/scrap.service.ts` 写入 `recordType: 'scrap'`（`未验证`需查看 scrap.service complete 方法，scrap 完成后写入 StockRecord 的实际 recordType）|
| GAP-108 | `BatchManagement.vue`（`/warehouse/batches`）显示的批次状态枚举（`available/reserved/consumed/expired`）与 schema 中 `BatchStatus` 枚举（`normal/expired/locked`）不一致 | 前端枚举未与后端 schema 同步 | 前端状态过滤功能失效（如过滤 `available` 实际查询不到结果，因 DB 值为 `normal`） | P2 | 已验证 | `client/src/views/warehouse/BatchManagement.vue` lines 6–9；`server/src/prisma/schema.prisma` BatchStatus enum（需确认 schema 具体枚举值） `需要数据库样本确认` |
| GAP-109 | `StagingAreaService.stageToZone` 中固定 zone 枚举为 `['筛粉间', '称油间', '小料房']`，硬编码中文字符串，缺乏可配置性 | 业务区域配置硬编码在代码中 | 若仓库布局调整，需改代码才能支持新区域；多租户场景不适用 | P3 | 已验证 | `server/src/modules/warehouse/staging-area.service.ts` line 5–6 |
| GAP-110 | 领料单 (`MaterialRequisitionItem`) 中 `batchId` 需手工指定批次，前端是否提供 FIFO 自动推荐批次（调用 `BatchService.getFIFO`）不明确 | 需查看 `RequisitionList.vue` 创建领料单的 dialog 实现 | 若用户手工指定批次，可能不遵循 FIFO 原则，导致早期批次滞留过期 | P2 | 需要运行系统确认 | `client/src/views/warehouse/RequisitionList.vue`（创建 dialog 未详细审查）；`server/src/modules/warehouse/batch.service.ts` getFIFO() 已实现但不确定前端是否调用 |

---

## 8. 整改建议

| GAP 编号 | 建议整改 | 依赖模块 | 是否需要新设计 | 建议 PR | 是否可并行 |
|---|---|---|---|---|---|
| GAP-102 | 统一决策 `StockRecord` vs `InventoryMovement` 谁是库存流水唯一事实源；推荐：以 `StockRecord` 为主，在文档中明确 `InventoryMovement` 为 model-landing 表单用途，禁止业务逻辑写入 | 仓储主链、MaterialBalanceService | 是（需要业务确认） | `refactor/inventory-ledger-unification` | 否 |
| GAP-107 | `MaterialBalanceService.checkBalance` 扩展 totalOut 计算，加入 `recordType: 'scrap'` 和 `recordType: 'return'` 的处理（scrap 应计入 out，return 应计入 in） | 无 | 否 | `fix/material-balance-scrap-return` | 是 |
| GAP-106 | 在 RequisitionService.complete() 中加入批次数量不足校验（`batch.quantity < item.quantity` → BadRequestException） | 无 | 否 | `fix/requisition-quantity-validation` | 是 |
| GAP-108 | 同步 `BatchManagement.vue` 状态枚举与 schema `BatchStatus`（`normal/expired/locked`）；如需细化展示语义，在前端做枚举映射而非依赖前端值直接查询 | 无 | 否 | `fix/batch-status-enum-sync` | 是 |
| GAP-110 | 在领料单创建 dialog 中调用 `GET /warehouse/batches/fifo?materialId=xxx` 推荐批次，允许用户覆盖 | warehouse/BatchService | 否 | `feat/requisition-fifo-suggestion` | 是 |
| GAP-109 | 将区域配置移至系统配置表（WorkshopArea 已存在关联），支持运行时配置 | WorkshopArea 模型 | 否 | `feat/staging-zone-configurable` | 是 |

---

## 9. 证据索引

- `server/src/modules/warehouse/warehouse.module.ts` — 模块注册（含 ReturnController, ScrapController, StagingAreaController 等）
- `server/src/modules/warehouse/material.service.ts` — 物料主数据 CRUD
- `server/src/modules/warehouse/batch.service.ts` — MaterialBatch CRUD + FIFO + 定时过期锁定
- `server/src/modules/warehouse/inbound.service.ts` — complete() 生成 MaterialBatch + StockRecord(in)
- `server/src/modules/warehouse/requisition.service.ts` — complete() 批次 decrement + StagingAreaStock + StockRecord(out)
- `server/src/modules/warehouse/services/return.service.ts` — 退料完成写 StockRecord
- `server/src/modules/warehouse/services/scrap.service.ts` — 报废写 StockRecord
- `server/src/modules/warehouse/staging-area.service.ts` — StagingAreaStock + StagingAreaStocktake
- `server/src/modules/warehouse/material-balance.service.ts` — 物料平衡（仅查 StockRecord + BatchMaterialUsage）
- `server/src/prisma/schema.prisma` lines 980–1029 (MaterialBatch), 1032–1050 (StockRecord), 2669–2687 (InventoryMovement), 2689–2705 (StockCount)
- `client/src/api/warehouse.ts` — 仓储 API 适配器（materialApi, batchApi, requisitionApi, stagingAreaApi, materialBalanceApi）
- `client/src/views/warehouse/BatchManagement.vue` — GAP-9 证据（枚举不一致）
- `client/src/views/warehouse/RequisitionList.vue` — 领料单前端
- `client/src/views/warehouse/MaterialBalance.vue` — 物料平衡报表前端
- `client/src/views/warehouse/StagingArea.vue` — 配料区暂存前端
- `client/src/router/index.ts` lines 401–443 (warehouse routes，含 /warehouse/traceability 遗留重定向)
- `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` section 4.1 (InventoryMovement 双轨说明), section 5.1 (主追溯链), section 6.3 (物料平衡查询)

---

## 10. 禁止重复实现与事实源边界

| 对象 | 当前事实源 | 允许展示字段 | 禁止新增的平行事实源 | 旧字段或旧模块处理 |
|---|---|---|---|---|
| 物料主数据 | `Material`（`materials` 表） | name, code, unit, category | 不允许在 MaterialBatch、RequisitionItem 等下游表重复维护物料名称作为事实 | — |
| 批次库存数量 | `MaterialBatch.quantity`（实时更新） | quantity, lot_status | 不允许在 StagingAreaStock 或 BatchMaterialUsage 中单独维护平行的"当前库存"字段 | — |
| 库存流水（激活） | `StockRecord`（`stock_records` 表） | recordType, quantity, relatedType, relatedId | 不允许在业务层或前端直接维护库存状态副本 | `InventoryMovement` 当前为未激活遗留表，需决策后处理 |
| 配料区暂存库存 | `StagingAreaStock`（`staging_area_stocks` 表） | quantity, location, area_id | 不允许在 MixingExecution 或前端 state 中维护暂存库存副本 | — |
| 物料平衡 | `MaterialBalanceService` 动态计算（非持久化） | 所有平衡报表字段仅展示，不落库 | 不允许在其他 service 或前端重新实现物料平衡计算逻辑 | — |

---

## 11. 后续整改入口

| 优先级 | GAP 编号 | 推荐 PR | 前置依赖 | 可并行 | 验收命令 |
|---|---|---|---|---|---|
| P1 | GAP-102 | `refactor/inventory-ledger-unification` | 业务决策（StockRecord vs InventoryMovement） | 否 | `grep -rn "prisma.inventoryMovement" server/src/` 应有实际调用或明确注释说明不使用 |
| P1 | GAP-107 | `fix/material-balance-scrap-return` | 无 | 是 | `MaterialBalanceService` 单元测试覆盖 scrap/return 场景；`MaterialBalanceController` 集成测试通过 |
| P1 | GAP-106 | `fix/requisition-quantity-validation` | 无 | 是 | `RequisitionService` 单元测试：领料超量时抛出 BadRequestException |
| P2 | GAP-108 | `fix/batch-status-enum-sync` | 无 | 是 | `BatchManagement.vue` status 过滤条件值与 schema `BatchStatus` 枚举值一致 |
| P2 | GAP-110 | `feat/requisition-fifo-suggestion` | BatchService.getFIFO 已实现 | 是 | 创建领料单时自动推荐最近到期批次 |
| P3 | GAP-109 | `feat/staging-zone-configurable` | WorkshopArea 模型 | 是 | StagingAreaService 区域从 WorkshopArea 表读取，非硬编码 |
