# GAP 分诊表

## 分诊规则

| 条件 | 处理方式 | 必须调用的 superpower |
|---|---|---|
| 影响事实源、schema、历史数据、追溯、库存、审批闭环 | 先用 brainstorming 写 spec 初稿，再用 grill-with-docs 校准，最后写 implementation plan | `brainstorming` -> `grill-with-docs` -> `writing-plans` |
| 影响跨模块业务链但不改 schema | 先用 brainstorming 写轻量 spec 或 decision note，再用 grill-with-docs 校准，最后写 implementation plan | `brainstorming` -> `grill-with-docs` -> `writing-plans` |
| 只改页面展示、入口、文案、低风险校验 | 可直接写小型 implementation plan | `writing-plans` |
| 证据不足 | 不排 PR，先补验证任务 | `grill-me` 或运行系统验证 |
| 需要业务判断 | 不排 PR，先业务确认 | `grill-with-docs` |

> **统一硬门槛：** 所有 implementation plan 不分大小，必须经过 superpower 计划流程，并在 plan 文件中写入 `Superpower 与 grill-me 校准记录` 后，才允许进入 `96-pr-roadmap.md`。执行 agent 只允许按 plan 使用 `superpowers:executing-plans`，并且必须在独立 worktree 或 Multica 隔离工作目录中执行，禁止直接写主 checkout。

## GAP 分诊总表

| GAP | 严重级别 | 验证状态 | 是否确认 | 是否需要 spec | 是否需要 implementation plan | 推荐 superpower | spec 路径 | plan 路径 | 分诊结论 |
|---|---|---|---|---|---|---|---|---|---|
| GAP-001 | P1 | 已验证 | 是 | 是 | 是 | `executing-plans` | docs/superpowers/specs/2026-05-01-gap-001-006-process-instance-product-link-design.md | docs/superpowers/plans/2026-05-01-gap-001-006-process-instance-product-link-implementation.md | 与 GAP-006 合并，spec 和 plan 已写完；执行时只使用 executing-plans |
| GAP-002 | P1 | 已验证 | 是 | 是 | 是 | `executing-plans` | docs/superpowers/specs/2026-05-01-gap-002-003-production-batch-product-recipe-required-design.md | docs/superpowers/plans/2026-05-01-gap-002-003-production-batch-product-recipe-required-implementation.md | 与 GAP-003 合并，schema/migration plan 已写完；执行时只使用 executing-plans |
| GAP-003 | P1 | 已验证 | 是 | 是 | 是 | `executing-plans` | docs/superpowers/specs/2026-05-01-gap-002-003-production-batch-product-recipe-required-design.md | docs/superpowers/plans/2026-05-01-gap-002-003-production-batch-product-recipe-required-implementation.md | 与 GAP-002 合并，schema/migration plan 已写完；执行时只使用 executing-plans |
| GAP-004 | P3 | 已验证 | 是 | 否 | 是 | `executing-plans` | 不需要 | docs/superpowers/plans/2026-05-01-gap-004-legacy-product-route-redirect-notice-implementation.md | plan 已写完，可进入 PR roadmap；执行时只使用 executing-plans |
| GAP-005 | P2 | 已验证 | 是 | 是 | 是 | `executing-plans` | docs/superpowers/specs/2026-05-01-gap-005-process-step-relation-validation-design.md | docs/superpowers/plans/2026-05-01-gap-005-process-step-relation-validation-implementation.md | spec 和 plan 已写完，可进入 PR roadmap；执行时只使用 executing-plans |
| GAP-006 | P1 | 已验证 | 是 | 是 | 是 | `executing-plans` | docs/superpowers/specs/2026-05-01-gap-001-006-process-instance-product-link-design.md | docs/superpowers/plans/2026-05-01-gap-001-006-process-instance-product-link-implementation.md | 与 GAP-001 合并，spec 和 plan 已写完；执行时只使用 executing-plans |
| GAP-007 | P2 | 已验证 | 是 | 是 | 是 | `executing-plans` | docs/superpowers/specs/2026-05-01-gap-007-production-batch-product-snapshot-design.md | docs/superpowers/plans/2026-05-01-gap-007-production-batch-product-snapshot-implementation.md | spec 和 plan 已写完；执行时只使用 executing-plans |
| GAP-008 | P2 | 已验证 | 是 | 是 | 是 | `executing-plans` | docs/superpowers/specs/2026-05-01-gap-008-area-id-non-null-design.md | docs/superpowers/plans/2026-05-01-gap-008-area-id-non-null-implementation.md | spec 和 plan 已写完；执行时只使用 executing-plans |
| GAP-100 | P1 | 已验证 | 是 | 是 | 是 | `executing-plans` | docs/superpowers/specs/2026-05-01-gap-100-incoming-inspection-batch-selector-design.md | docs/superpowers/plans/2026-05-01-gap-100-incoming-inspection-batch-selector-implementation.md | spec 和 plan 已写完，可进入 PR roadmap；执行时只使用 executing-plans |
| GAP-101 | P1 | 已验证 | 是 | 是 | 是 | `executing-plans` | docs/superpowers/specs/2026-05-01-gap-101-material-batch-create-gate-design.md | docs/superpowers/plans/2026-05-01-gap-101-material-batch-create-gate-implementation.md | spec 和 plan 已写完；执行时只使用 executing-plans，废弃 `POST /warehouse/batches` 直接建批次路径 |
| GAP-102 | P1 | 已验证 | 是 | 是 | 是 | `executing-plans` | docs/superpowers/specs/2026-05-01-gap-102-inventory-movement-ledger-unification-design.md | docs/superpowers/plans/2026-05-01-gap-102-inventory-movement-ledger-unification-implementation.md | spec 和 plan 已写完；执行时只使用 executing-plans |
| GAP-103 | P1 | 已验证 | 是 | 是 | 是 | `executing-plans` | docs/superpowers/specs/2026-05-01-gap-103-supplier-status-gate-design.md | docs/superpowers/plans/2026-05-01-gap-103-supplier-status-gate-implementation.md | spec 和 plan 已写完，可进入 PR roadmap；执行时只使用 executing-plans |
| GAP-104 | P2 | 需要运行系统确认 | 否 | 否 | 否 | `grill-me` | | | 先运行系统确认菜单可见性，待确认后重新分诊 |
| GAP-105 | P2 | 已验证 | 是 | 否 | 是 | `executing-plans` | 不需要 | `docs/superpowers/plans/2026-05-01-gap-105-supplier-evaluation-company-id-implementation.md` | plan 已写完，可进入 PR roadmap；执行时只使用 executing-plans |
| GAP-106 | P2 | 已验证 | 是 | 是 | 是 | `executing-plans` | docs/superpowers/specs/2026-05-01-gap-106-requisition-stock-nonnegative-design.md | docs/superpowers/plans/2026-05-01-gap-106-requisition-stock-nonnegative-implementation.md | spec 和 plan 已写完；执行时只使用 executing-plans |
| GAP-107 | P1 | 已验证 | 是 | 是 | 是 | `executing-plans` | docs/superpowers/specs/2026-05-01-gap-107-material-balance-scrap-return-design.md | docs/superpowers/plans/2026-05-01-gap-107-material-balance-scrap-return-implementation.md | spec 和 plan 已写完；执行时只使用 executing-plans |
| GAP-108 | P2 | 已验证 | 是 | 是 | 是 | `executing-plans` | docs/superpowers/specs/2026-05-01-gap-108-batch-status-enum-sync-design.md | docs/superpowers/plans/2026-05-01-gap-108-batch-status-enum-sync-implementation.md | spec 和 plan 已写完；执行时只使用 executing-plans |
| GAP-109 | P3 | 已验证 | 是 | 否 | 是 | `writing-plans` | | | P3 配置化优化，低优先级写 plan 后实现 |
| GAP-110 | P2 | 需要运行系统确认 | 否 | 否 | 否 | `grill-me` | | | 先运行系统确认 FIFO 推荐现状，待确认后重新分诊 |
| GAP-200 | P1 | 已验证 | 是 | 是 | 是 | `executing-plans` | docs/superpowers/specs/2026-05-01-gap-200-shift-instance-shift-type-fk-design.md | docs/superpowers/plans/2026-05-01-gap-200-shift-instance-shift-type-fk-implementation.md | spec 和 plan 已写完；执行时只使用 executing-plans |
| GAP-201 | P1 | 已验证 | 是 | 是 | 是 | `executing-plans` | docs/superpowers/specs/2026-05-01-gap-201-mixing-aggregation-many-to-many-design.md | docs/superpowers/plans/2026-05-01-gap-201-mixing-aggregation-many-to-many-implementation.md | spec 和 plan 已写完；执行时只使用 executing-plans，恢复 BatchMixingAggregation 多对多并显式标识共享配料投入池 |
| GAP-202 | P1 | 已验证 | 是 | 是 | 是 | `executing-plans` | docs/superpowers/specs/2026-05-01-gap-202-batch-detail-material-batch-selector-design.md | docs/superpowers/plans/2026-05-01-gap-202-batch-detail-material-batch-selector-implementation.md | spec 和 plan 已写完；执行时只使用 executing-plans |
| GAP-203 | P1 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | 先用 brainstorming 写 schema spec（PackagingMaterialUsage FK 到 ProductionBatch） |
| GAP-204 | P2 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | P2 schema FK，先用 brainstorming 写轻量 spec |
| GAP-205 | P2 | 已验证 | 是 | 是 | 是 | `executing-plans` | docs/superpowers/specs/2026-05-01-gap-205-finished-goods-residual-cleanup-design.md | docs/superpowers/plans/2026-05-01-gap-205-finished-goods-residual-cleanup-implementation.md | spec 和 plan 已写完；执行时只使用 executing-plans |
| GAP-206 | P2 | 需要运行系统确认 | 否 | 否 | 否 | `grill-me` | | | 先确认盘点校验是否已有实现，待确认后重新分诊 |
| GAP-207 | P2 | 已验证 | 是 | 否 | 是 | `writing-plans` | | | 依赖 GAP-200；GAP-200 spec 完成后写 plan |
| GAP-300 | P1 | 已验证 | 是 | 是 | 是 | `executing-plans` | docs/superpowers/specs/2026-05-01-gap-300-environment-record-batch-fk-design.md | docs/superpowers/plans/2026-05-01-gap-300-environment-record-batch-fk-implementation.md | spec 和 plan 已写完；执行时只使用 executing-plans |
| GAP-301 | P1 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | 先用 brainstorming 写 schema/业务 spec（FragileItemInspection batch FK，需确认哪些场景可无批次） |
| GAP-302 | P2 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | P2 schema FK，先用 brainstorming 写轻量 spec |
| GAP-303 | P1 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | 先用 brainstorming 写跨模块 spec（CCP missing 按产品过滤） |
| GAP-304 | P0 | 已验证 | 是 | 是 | 是 | - | docs/superpowers/specs/2026-05-01-gap-304-company-id-from-jwt-design.md | docs/superpowers/plans/2026-05-01-gap-304-company-id-from-jwt-implementation.md | 已执行：认证上下文补齐 companyId，CCP/不合格/CAPA/投诉/返工链路按 JWT companyId 写入与过滤；ProductionBatch 租户归属另行分诊 |
| GAP-305 | P1 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | 先用 brainstorming 写跨模块 spec（CCP 偏差自动触发 NonConformance） |
| GAP-306 | P0 | 已验证 | 是 | 是 | 是 | `executing-plans` | docs/superpowers/specs/2026-05-01-gap-306-traceability-module-service-registration-design.md | docs/superpowers/plans/2026-05-01-gap-306-traceability-module-service-registration-implementation.md | spec 和 plan 已写完；执行时只使用 executing-plans |
| GAP-307 | P0 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | P0 追溯查询完整链路，依赖 GAP-306，先用 brainstorming 写 spec |
| GAP-308 | P1 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | 依赖 GAP-306；先用 brainstorming 写跨模块 spec（快照持久化） |
| GAP-309 | P1 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | 先用 brainstorming 写 schema spec（CustomerComplaint customer FK） |
| GAP-310 | P1 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | 先用 brainstorming 写 schema/业务 spec（投诉必须关联批次） |
| GAP-311 | P0 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | P0 召回独立建模，先用 brainstorming 写架构 spec（状态机设计） |
| GAP-312 | P2 | 已验证 | 是 | 是 | 是 | `executing-plans` | docs/superpowers/specs/2026-05-01-gap-312-remove-deprecated-trace-endpoints-design.md | docs/superpowers/plans/2026-05-01-gap-312-remove-deprecated-trace-endpoints-implementation.md | spec 和 plan 已写完；执行时只使用 executing-plans |
| GAP-313 | P1 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | 先用 brainstorming 写 schema spec（NC 多态关联校验+索引） |
| GAP-314 | P1 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | 先用 brainstorming 写跨模块 spec（安全序列号生成机制） |
| GAP-315 | P1 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | 先用 brainstorming 写跨模块 spec（NC dispose→ReworkRecord 自动创建） |
| GAP-316 | P1 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | 先用 brainstorming 写跨模块 spec（CAPA 触发来源校验） |
| GAP-317 | P2 | 已验证 | 是 | 否 | 是 | `executing-plans` | 不需要 | docs/superpowers/plans/2026-05-01-gap-317-nonconformance-indexes-implementation.md | plan 已写完，可进入 PR roadmap；执行时只使用 executing-plans |
| GAP-318 | P2 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | P2 schema FK，先用 brainstorming 写轻量 spec（ReworkRecord→NC FK） |
| GAP-400 | P1 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | 先用 brainstorming 写 schema/migration spec（Document version 字段类型变更） |
| GAP-401 | P1 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | 先用 brainstorming 写 schema/migration spec（DocumentIssuance→Document FK） |
| GAP-402 | P2 | 已验证 | 是 | 否 | 是 | `executing-plans` | 不需要 | docs/superpowers/plans/2026-05-01-gap-402-training-need-ux-clarification-implementation.md | plan 已写完，可进入 PR roadmap；执行时只使用 executing-plans |
| GAP-403 | P2 | 已验证 | 是 | 否 | 是 | `executing-plans` | 不需要 | docs/superpowers/plans/2026-05-01-gap-403-record-form-landing-batch-confirm-implementation.md | plan 已写完，可进入 PR roadmap；执行时只使用 executing-plans |
| GAP-404 | P2 | 未验证（需运行系统确认） | 否 | 否 | 否 | `grill-me` | | | 先运行系统确认 updateFields 接口不一致问题，待确认后重新分诊 |
| GAP-405 | P2 | 已验证 | 是 | 否 | 是 | `executing-plans` | 不需要 | docs/superpowers/plans/2026-05-01-gap-405-413-audit-report-document-boundary-implementation.md | 与 GAP-413 合并，plan 已写完，可进入 PR roadmap；执行时只使用 executing-plans |
| GAP-406 | P2 | 已验证 | 是 | 否 | 是 | `writing-plans` | | | 依赖 GAP-400；GAP-400 完成后写 plan |
| GAP-407 | P0 | 已验证 | 是 | 是 | 是 | `executing-plans` | docs/superpowers/specs/2026-05-01-gap-407-internal-audit-api-prefix-design.md | docs/superpowers/plans/2026-05-01-gap-407-internal-audit-api-prefix-implementation.md | spec 和 plan 已写完；执行时只使用 executing-plans |
| GAP-408 | P0 | 已验证 | 是 | 是 | 是 | `executing-plans` | docs/superpowers/specs/2026-05-01-gap-408-training-archive-route-design.md | docs/superpowers/plans/2026-05-01-gap-408-training-archive-route-implementation.md | spec 和 plan 已写完；执行时只使用 executing-plans |
| GAP-409 | P0 | 已验证 | 是 | 是 | 是 | `executing-plans` | docs/superpowers/specs/2026-05-01-gap-409-training-project-status-endpoints-design.md | docs/superpowers/plans/2026-05-01-gap-409-training-project-status-endpoints-implementation.md | spec 和 plan 已写完；执行时只使用 executing-plans |
| GAP-410 | P1 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | 先用 brainstorming 写跨模块 spec（AuditFinding→CAPA 自动联动） |
| GAP-411 | P1 | 未验证（需要运行系统确认） | 否 | 否 | 否 | `grill-me` | | | 先运行系统确认路由冲突是否实际存在，待确认后重新分诊 |
| GAP-412 | P2 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | P2 schema 重构（trainees String[] → 桥接表），先用 brainstorming 写 spec |
| GAP-413 | P2 | 已验证 | 是 | 否 | 是 | `executing-plans` | 不需要 | docs/superpowers/plans/2026-05-01-gap-405-413-audit-report-document-boundary-implementation.md | 与 GAP-405 合并，plan 已写完，可进入 PR roadmap；执行时只使用 executing-plans |
| GAP-414 | P2 | 需要业务确认 | 否 | 否 | 否 | `grill-with-docs` | | | 先业务确认 ManagementReview 建模需求，待确认后重新分诊 |
| GAP-500 | P1 | 已验证 | 是 | 否 | 是 | `executing-plans` | 不需要 | `docs/superpowers/plans/2026-05-01-gap-500-remove-legacy-approval-level-api-implementation.md` | plan 已写完，可进入 PR roadmap；执行时只使用 executing-plans |
| GAP-501 | P0 | 已验证 | 是 | 是 | 是 | `executing-plans` | docs/superpowers/specs/2026-05-01-gap-501-auth-profile-method-design.md | docs/superpowers/plans/2026-05-01-gap-501-auth-profile-method-implementation.md | spec 和 plan 已写完；执行时只使用 executing-plans |
| GAP-502 | P1 | 已验证 | 是 | 否 | 是 | `executing-plans` | 不需要 | `docs/superpowers/plans/2026-05-01-gap-502-503-504-workflow-task-governance-docs-implementation.md` | plan 已写完，可进入 PR roadmap；与 GAP-503/504 合并输出边界指南，避免同文档冲突 |
| GAP-503 | P1 | 已验证 | 是 | 否 | 是 | `executing-plans` | 不需要 | `docs/superpowers/plans/2026-05-01-gap-502-503-504-workflow-task-governance-docs-implementation.md` | plan 已写完，可进入 PR roadmap；与 GAP-502/504 合并输出边界指南，避免同文档冲突 |
| GAP-504 | P2 | 已验证 | 是 | 否 | 是 | `executing-plans` | 不需要 | `docs/superpowers/plans/2026-05-01-gap-502-503-504-workflow-task-governance-docs-implementation.md` | plan 已写完，可进入 PR roadmap；与 GAP-502/503 合并输出边界指南，避免同文档冲突 |
| GAP-505 | P1 | 需要运行系统确认 | 否 | 否 | 否 | `grill-me` | | | 先运行系统确认 User.role String 使用残留范围，待确认后重新分诊 |
| GAP-506 | P2 | 未验证 | 否 | 否 | 否 | `grill-me` | | | 先运行系统验证权限审计日志端点，待确认后重新分诊 |
| GAP-507 | P1 | 已验证 | 是 | 否 | 是 | `executing-plans` | 不需要 | `docs/superpowers/plans/2026-05-01-gap-507-508-monitoring-api-contract-implementation.md` | plan 已写完，可进入 PR roadmap；与 GAP-508 合并执行以避免同文件冲突 |
| GAP-508 | P1 | 已验证 | 是 | 否 | 是 | `executing-plans` | 不需要 | `docs/superpowers/plans/2026-05-01-gap-507-508-monitoring-api-contract-implementation.md` | plan 已写完，可进入 PR roadmap；与 GAP-507 合并执行以避免同文件冲突 |
| GAP-509 | P1 | 已验证 | 是 | 否 | 是 | `executing-plans` | 不需要 | `docs/superpowers/plans/2026-05-01-gap-509-510-backup-endpoints-implementation.md` | plan 已写完，可进入 PR roadmap；与 GAP-510 合并补备份端点 |
| GAP-510 | P2 | 已验证 | 是 | 否 | 是 | `executing-plans` | 不需要 | `docs/superpowers/plans/2026-05-01-gap-509-510-backup-endpoints-implementation.md` | plan 已写完，可进入 PR roadmap；与 GAP-509 合并补备份端点 |
| GAP-511 | P2 | 已验证 | 是 | 否 | 是 | `executing-plans` | 不需要 | `docs/superpowers/plans/2026-05-01-gap-511-alert-route-dedup-implementation.md` | plan 已写完，可进入 PR roadmap；执行时只使用 executing-plans |
| GAP-512 | P2 | 已验证 | 是 | 否 | 是 | `executing-plans` | 不需要 | `docs/superpowers/plans/2026-05-01-gap-512-permission-model-decision-doc-implementation.md` | plan 已写完，可进入 PR roadmap；文档化权限模型决策树，不改运行时代码 |
| GAP-600 | P0 | 已验证 | 是 | 是 | 是 | `executing-plans` | docs/superpowers/specs/2026-05-01-gap-600-602-measuring-equipment-tenant-isolation-design.md | docs/superpowers/plans/2026-05-01-gap-600-602-measuring-equipment-tenant-isolation-implementation.md | 与 GAP-602 合并，spec 和 plan 已写完；执行时只使用 executing-plans |
| GAP-601 | P1 | 已验证 | 是 | 否 | 是 | `executing-plans` | 不需要 | `docs/superpowers/plans/2026-05-01-gap-601-equipment-controller-auth-guard-implementation.md` | plan 已写完，可进入 PR roadmap；执行时只使用 executing-plans |
| GAP-602 | P1 | 已验证 | 是 | 否 | 是 | `executing-plans` | 不需要 | docs/superpowers/plans/2026-05-01-gap-600-602-measuring-equipment-tenant-isolation-implementation.md | 与 GAP-600 合并，plan 已写完；执行时只使用 executing-plans |
| GAP-603 | P2 | 已验证（schema 层面） | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | P2 schema FK，先用 brainstorming 写轻量 spec |
| GAP-604 | P2 | 需要运行系统确认 | 否 | 否 | 否 | `grill-with-docs` | | | 先业务确认检验记录是否需要关联量器，待确认后重新分诊 |
| GAP-605 | P2 | 已验证（模块定义无审批） | 是 | 否 | 是 | `writing-plans` | | | P2 校准记录审批，先业务确认后写 plan |
