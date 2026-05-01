# GAP-108 物料批次状态枚举同步设计

## 背景

前端 `BatchManagement.vue` 和 `client/src/api/warehouse.ts` 使用 `available/reserved/consumed/expired` 作为物料批次状态枚举，但 Prisma `BatchStatus` 实际为 `normal/expired/locked`。这会导致前端过滤条件和后端数据库值不一致，用户选择“可用”时实际传 `available`，后端无法匹配 `normal`。

## 设计结论

前端批次管理页面直接使用后端枚举：

- `normal`：正常
- `expired`：已过期
- `locked`：已锁定

`MaterialBatch.status` 类型同步改为 `'normal' | 'expired' | 'locked'`。不做后端兼容映射，不保留旧前端枚举。

## 边界

- 本设计只改物料批次管理页，不改供应商资质状态。
- 本设计不新增批次状态机。
- 如果未来要表达“预留/消耗”，应另建库存占用或投料/消耗记录，不应复用 `MaterialBatch.status`。

## 验收标准

- 批次状态筛选传给后端的值只可能是 `normal/expired/locked`。
- 表格展示能把 `normal/expired/locked` 映射为中文标签。
- `client/src/api/warehouse.ts` 中 `MaterialBatch.status` 类型与 schema 一致。
