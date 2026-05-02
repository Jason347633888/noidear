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
| 6 | traceability/GAP-307 | GAP-307 | GAP-306 | `docs/superpowers/specs/2026-05-01-gap-307-traceability-full-query-chain-design.md` | `docs/superpowers/plans/2026-05-01-gap-307-traceability-full-query-chain-implementation.md` | `executing-plans` | 否 | 补齐 materialLot 正追、productionBatch 双向、deliveryNote 反追和场景工作台查询链路 |
| 7 | traceability/GAP-312 | GAP-312 | GAP-306 | `docs/superpowers/specs/2026-05-01-gap-312-remove-deprecated-trace-endpoints-design.md` | `docs/superpowers/plans/2026-05-01-gap-312-remove-deprecated-trace-endpoints-implementation.md` | `executing-plans` | 是 | 移除 deprecated batch-trace backward/forward API，保留 PDF 导出 |
| 8 | supplier/GAP-103 | GAP-103 | 无 | `docs/superpowers/specs/2026-05-01-gap-103-supplier-status-gate-design.md` | `docs/superpowers/plans/2026-05-01-gap-103-supplier-status-gate-implementation.md` | `executing-plans` | 是 | 供应商禁用/淘汰后阻断来料、手工批次创建和领料完成 |
| 9 | quality/GAP-300 | GAP-300 | 无 | `docs/superpowers/specs/2026-05-01-gap-300-environment-record-batch-fk-design.md` | `docs/superpowers/plans/2026-05-01-gap-300-environment-record-batch-fk-implementation.md` | `executing-plans` | 是 | EnvironmentRecord 必须关联 ProductionBatch，防止环境放行证据脱离批次追溯链 |
| 10 | supplier/GAP-100 | GAP-100 | 无 | `docs/superpowers/specs/2026-05-01-gap-100-incoming-inspection-batch-selector-design.md` | `docs/superpowers/plans/2026-05-01-gap-100-incoming-inspection-batch-selector-implementation.md` | `executing-plans` | 是 | 来料检验新建表单使用 MaterialBatch 选择器，避免手填不存在批次 |
| 11 | production/GAP-202 | GAP-202 | 无 | `docs/superpowers/specs/2026-05-01-gap-202-batch-detail-material-batch-selector-design.md` | `docs/superpowers/plans/2026-05-01-gap-202-batch-detail-material-batch-selector-implementation.md` | `executing-plans` | 是 | BatchDetail 旧投料弹窗改为物料批次选择器，禁止普通手填 ID |
| 12 | supplier/GAP-101 | GAP-101 | 无 | `docs/superpowers/specs/2026-05-01-gap-101-material-batch-create-gate-design.md` | `docs/superpowers/plans/2026-05-01-gap-101-material-batch-create-gate-implementation.md` | `executing-plans` | 是 | 废弃 `POST /warehouse/batches` 直接建批次路径，确保新 MaterialBatch 只能来自 MaterialInbound.complete() |
| 13 | production/GAP-200 | GAP-200 | 无 | `docs/superpowers/specs/2026-05-01-gap-200-shift-instance-shift-type-fk-design.md` | `docs/superpowers/plans/2026-05-01-gap-200-shift-instance-shift-type-fk-implementation.md` | `executing-plans` | 是 | ShiftInstance 绑定 ShiftType 主数据，保留旧 `shift_type` 文本迁移窗口 |
| 14 | production/GAP-201 | GAP-201 | 无 | `docs/superpowers/specs/2026-05-01-gap-201-mixing-aggregation-many-to-many-design.md` | `docs/superpowers/plans/2026-05-01-gap-201-mixing-aggregation-many-to-many-implementation.md` | `executing-plans` | 否 | 恢复 BatchMixingAggregation 多对多归集，删除 `agg_exec_unique`，共享配料执行必须在追溯和批次详情中显式标识 |
| 15 | quality/GAP-303 | GAP-303 | 无 | `docs/superpowers/specs/2026-05-01-gap-303-ccp-missing-product-filter-design.md` | `docs/superpowers/plans/2026-05-01-gap-303-ccp-missing-product-filter-implementation.md` | `executing-plans` | 是 | CCP missing 查询按生产批次产品/配方过滤，避免跨产品误报缺失 CCP |
| 16 | production/GAP-203 | GAP-203 | 无 | `docs/superpowers/specs/2026-05-01-gap-203-packaging-material-usage-batch-fk-design.md` | `docs/superpowers/plans/2026-05-01-gap-203-packaging-material-usage-batch-fk-implementation.md` | `executing-plans` | 是 | PackagingMaterialUsage 必须 FK 到 ProductionBatch，防止包材用量记录脱离批次追溯链 |
| 17 | quality/GAP-301 | GAP-301 | 无 | `docs/superpowers/specs/2026-05-01-gap-301-fragile-item-inspection-batch-fk-design.md` | `docs/superpowers/plans/2026-05-01-gap-301-fragile-item-inspection-batch-fk-implementation.md` | `executing-plans` | 是 | FragileItemInspection 必须关联 ProductionBatch，防止异物控制记录脱离批次放行和召回证据链 |
| 18 | traceability/GAP-308 | GAP-308 | GAP-306 | `docs/superpowers/specs/2026-05-01-gap-308-traceability-snapshot-persistence-design.md` | `docs/superpowers/plans/2026-05-01-gap-308-traceability-snapshot-persistence-implementation.md` | `executing-plans` | 否 | 持久化 TraceabilitySnapshot，支撑导出、复核和审计证据链；不得实现 GAP-307 完整查询链 |
| 19 | traceability/GAP-310 | GAP-310 | GAP-306 | `docs/superpowers/specs/2026-05-02-gap-310-customer-complaint-production-batch-fk-design.md` | `docs/superpowers/plans/2026-05-02-gap-310-customer-complaint-production-batch-fk-implementation.md` | `executing-plans` | 否 | CustomerComplaint 必须 FK 到 ProductionBatch，防止投诉反追和召回证据链断裂 |
| 20 | nonconformance/GAP-314 | GAP-314 | 无 | `docs/superpowers/specs/2026-05-02-gap-314-safe-sequence-number-generation-design.md` | `docs/superpowers/plans/2026-05-02-gap-314-safe-sequence-number-generation-implementation.md` | `executing-plans` | 是 | NC/CAPA 编号新增数据库序列表，覆盖手工 NC、CCP 偏差自动 NC、来料检验失败自动 NC、CAPA，替代 count()+1，避免高并发重复编号；建议先于会自动创建 NonConformance 的 GAP-305 执行 |
| 21 | quality/GAP-305 | GAP-305 | GAP-304 | `docs/superpowers/specs/2026-05-01-gap-305-ccp-deviation-nonconformance-design.md` | `docs/superpowers/plans/2026-05-01-gap-305-ccp-deviation-nonconformance-implementation.md` | `executing-plans` | 否 | CCPRecord 偏差提交时事务内自动创建 NonConformance，形成质量异常闭环 |
| 22 | traceability/GAP-311 | GAP-311 | GAP-306 | `docs/superpowers/specs/2026-05-02-gap-311-product-recall-independent-model-design.md` | `docs/superpowers/plans/2026-05-02-gap-311-product-recall-independent-model-implementation.md` | `executing-plans` | 否 | ProductRecall 独立建模，增加状态机、客户通知、批次范围和动态表单历史证据迁移 |
| 23 | nonconformance/GAP-316 | GAP-316 | GAP-304（已完成） | `docs/superpowers/specs/2026-05-02-gap-316-capa-trigger-source-validation-design.md` | `docs/superpowers/plans/2026-05-02-gap-316-capa-trigger-source-validation-implementation.md` | `executing-plans` | 是 | CAPA 创建时按 trigger_type 校验 NonConformance/CustomerComplaint/AuditFinding 来源，并提供 trigger_type + trigger_id 反查接口 |
