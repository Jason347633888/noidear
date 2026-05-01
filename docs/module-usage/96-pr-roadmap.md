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
> 4. plan 文件内必须包含 `Superpower 与 grill-me 校准记录`
> 5. plan 文件内必须明确要求执行 agent 使用独立 worktree 或 Multica 隔离工作目录，禁止写主 checkout
> 6. `triageStatus` 为 `ready_for_plan` 且 `planPath` 非空，或已升级为可执行状态
>
> **尚未有 implementation plan 的 GAP 由 `97-gap-triage.md` 管理，不在此表出现。**

| 顺序 | PR | GAP | 依赖 GAP | spec | plan | 推荐执行 superpower | 可并行 | 备注 |
|---|---|---|---|---|---|---|---|---|
| 1 | master-data/GAP-005 | GAP-005 | 无 | `docs/superpowers/specs/2026-05-01-gap-005-process-step-relation-validation-design.md` | `docs/superpowers/plans/2026-05-01-gap-005-process-step-relation-validation-implementation.md` | `executing-plans` | 是 | 阻止新增孤立工序；只改 process-step 服务和聚焦测试 |
| 2 | nonconformance/GAP-317 | GAP-317 | 无 | 不需要 | `docs/superpowers/plans/2026-05-01-gap-317-nonconformance-indexes-implementation.md` | `executing-plans` | 是 | NonConformance 添加查询索引；schema 性能改动，不改业务行为 |
| 3 | documents/GAP-402 | GAP-402 | 无 | 不需要 | `docs/superpowers/plans/2026-05-01-gap-402-training-need-ux-clarification-implementation.md` | `executing-plans` | 是 | 文控派生培训需求页面说明与关联培训项目入口 |
| 4 | documents/GAP-403 | GAP-403 | 无 | 不需要 | `docs/superpowers/plans/2026-05-01-gap-403-record-form-landing-batch-confirm-implementation.md` | `executing-plans` | 是 | 记录表单落地建议支持选中后批量确认 |
| 5 | documents/GAP-405-413 | GAP-405, GAP-413 | 无 | 不需要 | `docs/superpowers/plans/2026-05-01-gap-405-413-audit-report-document-boundary-implementation.md` | `executing-plans` | 是 | 内审报告归档 Document 打 AUDIT_REPORT 标签，默认不混入体系文件库 |
| 6 | equipment/GAP-600-602 | GAP-600, GAP-602 | GAP-304 | `docs/superpowers/specs/2026-05-01-gap-600-602-measuring-equipment-tenant-isolation-design.md` | `docs/superpowers/plans/2026-05-01-gap-600-602-measuring-equipment-tenant-isolation-implementation.md` | `executing-plans` | 否 | 计量器具与校准记录按 JWT companyId 隔离；等当前 5 个 agent 空出后派发 |
