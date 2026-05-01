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
| 1 | documents/GAP-403 | GAP-403 | 无 | 不需要 | `docs/superpowers/plans/2026-05-01-gap-403-record-form-landing-batch-confirm-implementation.md` | `executing-plans` | 是 | PR #92 已打回修复：batchConfirmSuggested 类型错误导致后端测试编译失败 |
| 2 | equipment/GAP-600-602 | GAP-600, GAP-602 | GAP-304 | `docs/superpowers/specs/2026-05-01-gap-600-602-measuring-equipment-tenant-isolation-design.md` | `docs/superpowers/plans/2026-05-01-gap-600-602-measuring-equipment-tenant-isolation-implementation.md` | `executing-plans` | 否 | 计量器具与校准记录按 JWT companyId 隔离 |
| 3 | master-data/GAP-001-006 | GAP-001, GAP-006 | 无 | `docs/superpowers/specs/2026-05-01-gap-001-006-process-instance-product-link-design.md` | `docs/superpowers/plans/2026-05-01-gap-001-006-process-instance-product-link-implementation.md` | `executing-plans` | 是 | 研发流程绑定已有 Product，同时保留新产品研发自动建档路径 |
| 4 | master-data/GAP-002-003 | GAP-002, GAP-003 | 无 | `docs/superpowers/specs/2026-05-01-gap-002-003-production-batch-product-recipe-required-design.md` | `docs/superpowers/plans/2026-05-01-gap-002-003-production-batch-product-recipe-required-implementation.md` | `executing-plans` | 否 | ProductionBatch productId/recipeId 改数据库必填并补 FK，migration 先检查历史空值/orphan |
| 5 | master-data/GAP-004 | GAP-004 | 无 | 不需要 | `docs/superpowers/plans/2026-05-01-gap-004-legacy-product-route-redirect-notice-implementation.md` | `executing-plans` | 是 | 旧配方/工序 URL 跳转产品目录时给出迁移提示 |
| 6 | system/GAP-501 | GAP-501 | 无 | `docs/superpowers/specs/2026-05-01-gap-501-auth-profile-method-design.md` | `docs/superpowers/plans/2026-05-01-gap-501-auth-profile-method-implementation.md` | `executing-plans` | 是 | 修复登录态恢复时 GET /auth/profile 与后端 POST profile 不匹配 |
| 7 | audit/GAP-407 | GAP-407 | 无 | `docs/superpowers/specs/2026-05-01-gap-407-internal-audit-api-prefix-design.md` | `docs/superpowers/plans/2026-05-01-gap-407-internal-audit-api-prefix-implementation.md` | `executing-plans` | 是 | 修复内审前端 API 双 /api/v1 前缀 |
| 8 | training/GAP-408 | GAP-408 | 无 | `docs/superpowers/specs/2026-05-01-gap-408-training-archive-route-design.md` | `docs/superpowers/plans/2026-05-01-gap-408-training-archive-route-implementation.md` | `executing-plans` | 是 | 修复培训档案前端路径 archive/archives 与双前缀问题 |
| 9 | training/GAP-409 | GAP-409 | 无 | `docs/superpowers/specs/2026-05-01-gap-409-training-project-status-endpoints-design.md` | `docs/superpowers/plans/2026-05-01-gap-409-training-project-status-endpoints-implementation.md` | `executing-plans` | 是 | 补齐培训项目 start/complete/cancel 语义化端点 |
| 10 | master-data/GAP-007 | GAP-007 | GAP-002 | `docs/superpowers/specs/2026-05-01-gap-007-production-batch-product-snapshot-design.md` | `docs/superpowers/plans/2026-05-01-gap-007-production-batch-product-snapshot-implementation.md` | `executing-plans` | 是 | 锁定 ProductionBatch.productName 只能来自 Product.name 快照 |
| 11 | warehouse/GAP-102 | GAP-102 | 无 | `docs/superpowers/specs/2026-05-01-gap-102-inventory-movement-ledger-unification-design.md` | `docs/superpowers/plans/2026-05-01-gap-102-inventory-movement-ledger-unification-implementation.md` | `executing-plans` | 否 | 先建立 InventoryMovement 双写适配层，保留 StockRecord 兼容读取 |
| 12 | production/GAP-205 | GAP-205 | 无 | `docs/superpowers/specs/2026-05-01-gap-205-finished-goods-residual-cleanup-design.md` | `docs/superpowers/plans/2026-05-01-gap-205-finished-goods-residual-cleanup-implementation.md` | `executing-plans` | 是 | 清理 FinishedGoodsBatch 运行时代码残留，禁止新模板继续写 finished_goods |
| 13 | traceability/GAP-306 | GAP-306 | 无 | `docs/superpowers/specs/2026-05-01-gap-306-traceability-module-service-registration-design.md` | `docs/superpowers/plans/2026-05-01-gap-306-traceability-module-service-registration-implementation.md` | `executing-plans` | 是 | 注册 TraceabilityModule 四个子服务，解锁后续追溯链路 GAP |
