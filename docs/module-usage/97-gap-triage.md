# GAP 分诊表

## 分诊规则

| 条件 | 处理方式 | 必须调用的 superpower |
|---|---|---|
| 影响事实源、schema、历史数据、追溯、库存、审批闭环 | 先写 spec，再写 implementation plan | `grill-with-docs` + `writing-plans` |
| 影响跨模块业务链但不改 schema | 先写轻量 spec 或 decision note，再写 implementation plan | `grill-with-docs` + `writing-plans` |
| 只改页面展示、入口、文案、低风险校验 | 可直接写小型 implementation plan | `writing-plans` |
| 证据不足 | 不排 PR，先补验证任务 | `grill-me` 或运行系统验证 |
| 需要业务判断 | 不排 PR，先业务确认 | `grill-with-docs` |

## GAP 分诊总表

| GAP | 严重级别 | 验证状态 | 是否确认 | 是否需要 spec | 是否需要 implementation plan | 推荐 superpower | spec 路径 | plan 路径 | 分诊结论 |
|---|---|---|---|---|---|---|---|---|---|
