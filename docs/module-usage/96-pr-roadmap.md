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
| 1 | supplier/GAP-105 | GAP-105 | 无 | 不需要 | `docs/superpowers/plans/2026-05-01-gap-105-supplier-evaluation-company-id-implementation.md` | `executing-plans` | 是 | 供应商评估 companyId 去硬编码；只改 supplier-evaluation 模块 |
| 2 | workflow/GAP-500 | GAP-500 | 无 | 不需要 | `docs/superpowers/plans/2026-05-01-gap-500-remove-legacy-approval-level-api-implementation.md` | `executing-plans` | 是 | 删除前端旧 level1/level2 approval 调用；不改后端统一审批 |
| 3 | equipment/GAP-601 | GAP-601 | 无 | 不需要 | `docs/superpowers/plans/2026-05-01-gap-601-equipment-controller-auth-guard-implementation.md` | `executing-plans` | 是 | 设备模块控制器加 JwtAuthGuard；不做权限细分 |
