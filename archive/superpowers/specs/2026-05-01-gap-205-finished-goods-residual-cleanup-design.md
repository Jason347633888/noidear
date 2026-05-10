# GAP-205 FinishedGoodsBatch 残留清理设计

## 背景

`FinishedGoodsBatch` 已不再作为独立业务批次概念。当前口径统一为：

`ProductionBatch` = 产品批次 / 喷码批次 / 成品追溯终端节点。

但代码中仍有少量兼容文本残留：

- `Record.batchLinkType` 注释仍写 `"production" | "finished_goods"`。
- `Record.relatedBatchType` 注释仍写 `"production" | "finished_goods"`。
- `RecordTemplate` DTO 仍允许 `batchLinkType = "finished_goods"`。
- `record.service.ts` 仍把 `finished_goods` 当成生产批次兼容输入。
- `InventoryMovement.movement_type` 注释仍写 `finished_goods_in/out`。

这些不会立即造成运行错误，但会让后续 agent 和用户误以为系统仍有独立成品批次层。

## 设计决策

1. 新写入路径只允许 `batchLinkType = "production"`。
2. `finished_goods` 只作为历史兼容值存在于数据库旧数据中，不再允许 API 新增或更新。
3. `record.service.ts` 可继续读取历史 `finished_goods` 并映射到 `productionBatchId`，但注释必须说明这是历史兼容。
4. `InventoryMovement.movement_type` 注释改为 `production_in/out` 或更准确的生产批次语义，不再出现 `finished_goods_in/out`。

## 不做什么

- 不删除历史数据库值。
- 不删除 `finished_goods_batches` 历史表。
- 不做 schema destructive migration。
- 不修改旧文档 `docs/DESIGN.md` 中的大段历史方案。

## 验收标准

- 新增/更新 RecordTemplate DTO 不再允许 `finished_goods`。
- `server/src` 内运行 `rg "finished_goods"` 后，只剩历史兼容注释或迁移文件中允许出现。
- `record.service.ts` 对历史 `finished_goods` 的兼容分支有明确注释。
- focused tests 覆盖 DTO 枚举或 service 行为。

## Superpower 与 grill-me 校准记录

- `brainstorming`：确认本 GAP 是兼容清理，不是 schema 删除。
- `grill-with-docs`：与 `MASTER_DATA_AND_TRACEABILITY_MODEL.md` 对齐，终端批次统一到 `ProductionBatch`。
- `grill-me`：通过 `rg finished_goods` 确认运行时代码残留集中在 DTO、schema 注释和 record service，不需要碰历史文档。
- `writing-plans`：后续 plan 聚焦 DTO、注释、兼容测试，禁止 destructive migration。
