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
| 1 | training/GAP-408 | GAP-408 | 无 | `docs/superpowers/specs/2026-05-01-gap-408-training-archive-route-design.md` | `docs/superpowers/plans/2026-05-01-gap-408-training-archive-route-implementation.md` | `executing-plans` | 否 | PR #99 仍阻塞：前端 blob 下载合同与后端 `{ url }` 返回不一致，需执行 agent 修复后再 review |
| 2 | master-data/GAP-008 | GAP-008 | 无 | `docs/superpowers/specs/2026-05-01-gap-008-area-id-non-null-design.md` | `docs/superpowers/plans/2026-05-01-gap-008-area-id-non-null-implementation.md` | `executing-plans` | 是 | RecipeLine.area_id schema 非空，防止配方行缺失配料区域事实源 |
| 3 | warehouse/GAP-106 | GAP-106 | GAP-102 | `docs/superpowers/specs/2026-05-01-gap-106-requisition-stock-nonnegative-design.md` | `docs/superpowers/plans/2026-05-01-gap-106-requisition-stock-nonnegative-implementation.md` | `executing-plans` | 是 | 领料完成前校验物料批次库存，防止扣成负数 |
| 4 | warehouse/GAP-107 | GAP-107 | GAP-102 | `docs/superpowers/specs/2026-05-01-gap-107-material-balance-scrap-return-design.md` | `docs/superpowers/plans/2026-05-01-gap-107-material-balance-scrap-return-implementation.md` | `executing-plans` | 是 | 物料平衡公式纳入退料与报废 |
| 5 | warehouse/GAP-108 | GAP-108 | GAP-102 | `docs/superpowers/specs/2026-05-01-gap-108-batch-status-enum-sync-design.md` | `docs/superpowers/plans/2026-05-01-gap-108-batch-status-enum-sync-implementation.md` | `executing-plans` | 是 | 前端批次状态枚举同步后端 `normal/expired/locked` |
| 6 | traceability/GAP-312 | GAP-312 | GAP-306 | `docs/superpowers/specs/2026-05-01-gap-312-remove-deprecated-trace-endpoints-design.md` | `docs/superpowers/plans/2026-05-01-gap-312-remove-deprecated-trace-endpoints-implementation.md` | `executing-plans` | 是 | 移除 deprecated batch-trace backward/forward API，保留 PDF 导出 |
| 7 | supplier/GAP-103 | GAP-103 | 无 | `docs/superpowers/specs/2026-05-01-gap-103-supplier-status-gate-design.md` | `docs/superpowers/plans/2026-05-01-gap-103-supplier-status-gate-implementation.md` | `executing-plans` | 是 | 供应商禁用/淘汰后阻断来料、手工批次创建和领料完成 |
| 8 | quality/GAP-300 | GAP-300 | 无 | `docs/superpowers/specs/2026-05-01-gap-300-environment-record-batch-fk-design.md` | `docs/superpowers/plans/2026-05-01-gap-300-environment-record-batch-fk-implementation.md` | `executing-plans` | 是 | EnvironmentRecord 必须关联 ProductionBatch，防止环境放行证据脱离批次追溯链 |
| 9 | supplier/GAP-100 | GAP-100 | 无 | `docs/superpowers/specs/2026-05-01-gap-100-incoming-inspection-batch-selector-design.md` | `docs/superpowers/plans/2026-05-01-gap-100-incoming-inspection-batch-selector-implementation.md` | `executing-plans` | 是 | 来料检验新建表单使用 MaterialBatch 选择器，避免手填不存在批次 |
| 10 | production/GAP-202 | GAP-202 | 无 | `docs/superpowers/specs/2026-05-01-gap-202-batch-detail-material-batch-selector-design.md` | `docs/superpowers/plans/2026-05-01-gap-202-batch-detail-material-batch-selector-implementation.md` | `executing-plans` | 是 | BatchDetail 旧投料弹窗改为物料批次选择器，禁止普通手填 ID |
| 11 | supplier/GAP-101 | GAP-101 | 无 | `docs/superpowers/specs/2026-05-01-gap-101-material-batch-create-gate-design.md` | `docs/superpowers/plans/2026-05-01-gap-101-material-batch-create-gate-implementation.md` | `executing-plans` | 是 | 废弃 `POST /warehouse/batches` 直接建批次路径，确保新 MaterialBatch 只能来自 MaterialInbound.complete() |
| 12 | production/GAP-200 | GAP-200 | 无 | `docs/superpowers/specs/2026-05-01-gap-200-shift-instance-shift-type-fk-design.md` | `docs/superpowers/plans/2026-05-01-gap-200-shift-instance-shift-type-fk-implementation.md` | `executing-plans` | 是 | ShiftInstance 绑定 ShiftType 主数据，保留旧 `shift_type` 文本迁移窗口 |
| 13 | production/GAP-201 | GAP-201 | 无 | `docs/superpowers/specs/2026-05-01-gap-201-mixing-aggregation-many-to-many-design.md` | `docs/superpowers/plans/2026-05-01-gap-201-mixing-aggregation-many-to-many-implementation.md` | `executing-plans` | 否 | 恢复 BatchMixingAggregation 多对多归集，删除 `agg_exec_unique`，共享配料执行必须在追溯和批次详情中显式标识 |
