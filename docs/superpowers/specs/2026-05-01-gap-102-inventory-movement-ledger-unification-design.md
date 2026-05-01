# GAP-102 库存流水事实源统一设计

## 背景

当前系统同时存在 `StockRecord` 和 `InventoryMovement`：

- `StockRecord` 是仓库模块实际写入和物料平衡实际读取的表。
- `InventoryMovement` 已在 schema 中存在，并在业务总说明中被定义为长期统一库存移动口径，但当前没有 service 写入。

用户已确认长期方向：统一到 `InventoryMovement`。但不能粗暴删除 `StockRecord`，因为仓储入库、领料、退料、报废、物料平衡目前依赖它。

## 设计决策

1. `InventoryMovement` 是长期库存移动事实源。
2. 本 GAP 的第一步不是删除 `StockRecord`，而是建立统一写入适配层，让新发生的仓库业务同时写入 `StockRecord` 和 `InventoryMovement`。
3. 现有 `MaterialBalanceService` 暂时继续读取 `StockRecord`，避免一次性改动计算口径。
4. 后续 GAP 再把物料平衡读取切换到 `InventoryMovement`，最后再评估 `StockRecord` 是否降级为兼容表。

## 统一映射

| StockRecord.recordType | InventoryMovement.movement_type | object_type | 说明 |
|---|---|---|---|
| `in` | `receive` | `material_batch` | 来料入库产生物料批次 |
| `out` | `issue_to_production` | `material_batch` | 领料到生产/配料区 |
| `return` | `return_to_warehouse` | `material_batch` | 退料回仓 |
| `scrap` | `scrap` | `material_batch` | 报废扣减 |

## 实施边界

本次只做统一写入入口和仓储核心服务双写，不改历史数据，不删除字段，不把所有读取立即切换到 `InventoryMovement`。

必须覆盖的服务：

- `server/src/modules/warehouse/inbound.service.ts`
- `server/src/modules/warehouse/requisition.service.ts`
- `server/src/modules/warehouse/services/return.service.ts`
- `server/src/modules/warehouse/services/scrap.service.ts`

## 不做什么

- 不删除 `StockRecord`。
- 不迁移历史 `StockRecord`。
- 不重写 `MaterialBalanceService` 公式。
- 不修改 model-landing 生成文件。

## 验收标准

- 新增 `InventoryMovementLedgerService` 或等效适配层。
- 入库/领料/退料/报废完成时仍写 `StockRecord`，同时写 `InventoryMovement`。
- focused tests 能断言至少入库和领料路径会调用统一适配层。
- `rg "prisma.inventoryMovement" server/src/modules/warehouse` 能看到真实 service 调用。

## Superpower 与 grill-me 校准记录

- `brainstorming`：确认长期方向为 `InventoryMovement`，但实施必须分阶段，避免破坏当前仓储计算。
- `grill-with-docs`：与 `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 对齐，业务标准名使用 `InventoryMovement`，当前兼容表为 `StockRecord`。
- `grill-me`：用代码核对发现仓库业务只写 `stockRecord`，`inventoryMovement` 当前无 service 调用，因此第一步必须是双写适配层。
- `writing-plans`：后续 plan 拆为新增适配层、接入核心服务、补测试，不做历史迁移。
