# GAP-106 领料扣减库存非负校验设计

## 背景

仓库领料单 `RequisitionService.complete()` 当前会在事务中直接对 `MaterialBatch.quantity` 做 `decrement`。如果领料数量大于当前批次库存，数据库不会自动阻止数量变成负数，后续配料区库存、库存流水和物料平衡都会基于错误库存继续计算。

GAP-102 已经补上 `InventoryMovement` 双写，本 GAP 只处理扣减前的库存保护，不改变库存事实源决策。

## 设计结论

在 `RequisitionService.complete()` 的同一个 Prisma transaction 内，每个领料明细扣减前先读取对应 `MaterialBatch.quantity`：

1. 批次不存在时抛 `BadRequestException`。
2. 当前库存小于领料数量时抛 `BadRequestException`。
3. 校验通过后再执行原有 `materialBatch.update({ decrement })`。
4. 仍保留原有 `StagingAreaStock` 增加、`StockRecord` 写入、`InventoryMovement` 写入。

不新增 schema，不迁移历史数据，不改变审批状态机。

## 边界

- 本设计不处理并发锁升级；当前 Prisma 原子 decrement 仍在同一事务内执行。
- 本设计不处理配料区库存扣减，那属于后续配料执行链路。
- 本设计不禁止管理员修正库存；修正库存应走盘点/调整流水，而不是领料接口。

## 验收标准

- 领料数量超过批次库存时，`complete()` 返回 400。
- 超量失败时，不写 `StockRecord`，不写 `InventoryMovement`，不增加 `StagingAreaStock`。
- 正常库存足够时，原有完成流程不变。
