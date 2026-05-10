# GAP-107 物料平衡纳入退料与报废设计

## 背景

`MaterialBalanceService.checkBalance()` 当前只把 `StockRecord.recordType === 'in'` 计入入库，只把 `recordType === 'out'` 计入出库。实际仓储服务里，退料写入 `recordType: 'return'`，报废写入 `recordType: 'scrap'`。因此物料平衡结果会漏算退料和报废，导致假报警或掩盖真实差异。

## 设计结论

物料平衡仍以现有 `StockRecord` 兼容读取口径为准，但计算公式要显式纳入四类移动：

```text
totalIn = in + return
totalOut = out + scrap
calculated = totalIn - totalOut - usedInProduction
```

同时返回拆分字段，方便后续页面或接口解释差异：

- `returnedToWarehouse`
- `scrapped`

## 边界

- 本设计不把读取口径改成 `InventoryMovement`，因为 GAP-102 只建立了双写适配层，读取迁移要另起计划。
- 本设计不处理配料区盘点差异。
- 本设计不改变 `BatchMaterialUsage` 的含义，仍表示生产实际用量。

## 验收标准

- `return` 记录计入 `totalIn`。
- `scrap` 记录计入 `totalOut`。
- 返回结果包含 `returnedToWarehouse` 和 `scrapped`。
- 原有 `in/out/usedInProduction/currentStock/isBalanced` 字段继续保留。
