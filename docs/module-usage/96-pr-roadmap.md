# PR 排期路线图

## 排期规则

- 上游事实源先于下游页面和统计。
- schema/migration 单独 PR。
- 历史数据迁移单独 PR 或在 schema PR 中显式列出迁移方案。
- 前后端字段绑定必须等后端合同稳定后再排。
- 残留模块入口删除单独 PR。
- 每个 PR 必须引用 GAP、spec、implementation plan。

## PR 路线图

> **进入条件（硬规则）：** 每一行 PR 必须同时满足以下条件，否则不得出现在此表。
>
> 1. GAP 已确认（验证状态 = `已验证`）
> 2. 如需 spec：`specPath` 文件已存在
> 3. `planPath` 文件已存在（implementation plan 已写完）
> 4. `triageStatus` 为 `ready_for_plan` 且 `planPath` 非空，或已升级为可执行状态
>
> **尚未有 implementation plan 的 GAP 由 `97-gap-triage.md` 管理，不在此表出现。**

| 顺序 | PR | GAP | 依赖 GAP | spec | plan | 推荐执行 superpower | 可并行 | 备注 |
|---|---|---|---|---|---|---|---|---|
_当前无可执行 PR。GAP 必须先完成 spec/plan 并回写 manifest 后，才能进入此表。_
