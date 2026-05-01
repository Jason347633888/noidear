# GAP-005 工序关联校验设计

## 背景

`ProcessStep` 允许 `product_id` 与 `recipe_id` 同时为空。这样会产生孤立工序：既不属于产品，也不属于配方，后续产品归档、配方版本、产品工作台聚合都无法稳定追踪它。

## 目标

创建工序时必须至少提供 `product_id` 或 `recipe_id` 之一。现有历史数据不在本次 PR 中迁移；本次只阻止新增孤立工序。

## 决策

- 不改 Prisma schema，因为 `product_id` 和 `recipe_id` 仍需支持单独为空：
  - 产品级工序可以只有 `product_id`
  - 配方快照工序可以只有 `recipe_id`
  - 两者都提供时仍保留
- 校验放在 `ProcessStepService.create()`，因为这是业务规则，不是单字段格式规则。
- DTO 继续保留字段级 `@IsOptional()`，避免误伤只传其中一个字段的合法请求。
- 更新只影响创建，不强制改 `update()`，避免历史孤立工序被编辑时立即被阻断。历史数据清理应单独做数据治理任务。

## 验收

- `ProcessStepService.create()` 收到 `product_id` 和 `recipe_id` 都为空、空字符串或只含空格时抛 `BadRequestException`。
- 只传 `product_id` 可以创建。
- 只传 `recipe_id` 可以创建。
- 同时传两者可以创建。
- 不新增平行事实源，不修改产品、配方、工序 schema。

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** GAP-005 在 manifest 中标记为 `needs_spec`，因此先用 brainstorming 形成本轻量 spec，再进入 writing-plans。
- **grill-me 校准结论：** 已质询是否需要 schema 非空约束、是否会破坏产品级/配方级两种工序模式、是否需要历史数据迁移。结论是不改 schema、不迁移历史，只在新增入口阻止孤立工序。
- **执行边界：** 后续 implementation plan 只允许修改 process-step 服务和聚焦测试，不触碰产品归档、配方变更、产品工作台聚合逻辑。
