# PR 排期路线图

## 排期规则

- 上游事实源先于下游页面和统计。
- schema/migration 单独 PR。
- 历史数据迁移单独 PR 或在 schema PR 中显式列出迁移方案。
- 前后端字段绑定必须等后端合同稳定后再排。
- 残留模块入口删除单独 PR。
- 每个 PR 必须引用 GAP、spec、implementation plan。

## PR 路线图

| 顺序 | PR | GAP | 依赖 GAP | spec | plan | 推荐执行 superpower | 可并行 | 备注 |
|---|---|---|---|---|---|---|---|---|
| 1 | fix/auth-profile-method-get | GAP-501 | — | 不需要 | 待写 | `writing-plans` → `executing-plans` | 是 | P0；auth GET/POST 方法不匹配，系统初始化失败；最高优先级 |
| 2 | fix/internal-audit-api-prefix | GAP-407 | — | 不需要 | 待写 | `writing-plans` → `executing-plans` | 是 | P0；内审所有 API 调用失败；修复方向明确（移除硬编码前缀） |
| 3 | fix/training-archive-route-mismatch | GAP-408 | — | 不需要 | 待写 | `writing-plans` → `executing-plans` | 是 | P0；培训档案列表无法加载；修复方向明确（对齐路由路径） |
| 4 | fix/training-project-status-endpoints | GAP-409 | — | 不需要 | 待写 | `writing-plans` → `executing-plans` | 是 | P0；培训项目状态变更全部 404；修复方向明确（补全端点） |
| 5 | fix/approval-remove-legacy-level-calls | GAP-500 | — | 不需要 | 待写 | `writing-plans` → `executing-plans` | 是 | P1；删除前端旧审批接口调用，无 schema 变更 |
| 6 | fix/monitoring-metrics-query-method | GAP-507 | — | 不需要 | 待写 | `writing-plans` → `executing-plans` | 是 | P1；前端 GET→POST，无 schema 变更 |
| 7 | fix/monitoring-alert-history-path | GAP-508 | — | 不需要 | 待写 | `writing-plans` → `executing-plans` | 是 | P1；前端路径修正，无 schema 变更 |
| 8 | fix/backup-available-endpoint | GAP-509 | — | 不需要 | 待写 | `writing-plans` → `executing-plans` | 是 | P1；后端补充 GET /backup/available 端点 |
| 9 | fix/equipment-controller-auth-guard | GAP-601 | — | 不需要 | 待写 | `writing-plans` → `executing-plans` | 是 | P1；设备模块控制器加 JwtAuthGuard，无 schema 变更 |
| 10 | fix/material-balance-scrap-return | GAP-107 | — | 不需要 | 待写 | `writing-plans` → `executing-plans` | 是 | P1；物料平衡公式补 scrap/return，纯逻辑修复无 schema |
| 11 | fix/supplier-eval-company-id | GAP-105 | — | 不需要 | 待写 | `writing-plans` → `executing-plans` | 是 | P2；SupplierEvaluationService 动态 companyId，无 schema |
| 12 | fix/batch-status-enum-sync | GAP-108 | — | 不需要 | 待写 | `writing-plans` → `executing-plans` | 是 | P2；前端 BatchStatus 枚举同步，无 schema |
| 13 | chore/remove-deprecated-trace-endpoints | GAP-312 | GAP-306 | 不需要 | 待写 | `writing-plans` → `executing-plans` | 否 | P2；依赖 GAP-306 追溯模块先修复后再清理旧端点 |
| 14 | fix/nc-add-indexes | GAP-317 | — | 不需要 | 待写 | `writing-plans` → `executing-plans` | 是 | P2；NonConformance 表添加索引，schema migration 低风险 |
| 15 | fix/backup-status-endpoint | GAP-510 | — | 不需要 | 待写 | `writing-plans` → `executing-plans` | 是 | P2；后端补充备份状态查询端点 |
| 16 | fix/alert-route-dedup | GAP-511 | — | 不需要 | 待写 | `writing-plans` → `executing-plans` | 是 | P2；告警路由去重，明确权威路径 |
| 17 | fix/training-need-ux-clarification | GAP-402 | — | 不需要 | 待写 | `writing-plans` → `executing-plans` | 是 | P2；培训需求中心 UX 优化，无 schema |
| 18 | feat/record-form-landing-batch-confirm | GAP-403 | — | 不需要 | 待写 | `writing-plans` → `executing-plans` | 是 | P2；表单落地批量确认，无 schema |
| 19 | fix/audit-report-document-type-tag | GAP-405, GAP-413 | — | 不需要 | 待写 | `writing-plans` → `executing-plans` | 是 | P2；内审报告文档类型标签，GAP-413 合并至此 PR |
| 20 | docs/approval-migration-plan | GAP-502 | — | 不需要 | 待写 | `writing-plans` → `executing-plans` | 是 | P1；旧审批废弃计划文档 |
| 21 | docs/workflow-vs-unified-approval-decision | GAP-503 | — | 不需要 | 待写 | `writing-plans` → `executing-plans` | 是 | P1；Workflow vs UnifiedApproval 决策树文档 |
| 22 | docs/task-vs-record-task-guide | GAP-504 | — | 不需要 | 待写 | `writing-plans` → `executing-plans` | 是 | P2；Task vs RecordTask 使用场景文档 |
| 23 | docs/permission-model-decision-guide | GAP-512 | — | 不需要 | 待写 | `writing-plans` → `executing-plans` | 是 | P2；四层权限模型决策文档 |
| 24 | chore/add-redirect-notice-for-legacy-routes | GAP-004 | — | 不需要 | 待写 | `writing-plans` → `executing-plans` | 是 | P3；重定向提示，最低优先级 |

> **注意：** GAP-103（Supplier 双状态门禁）和 GAP-005（ProcessStep 产品字段约束）仍在 `97-gap-triage.md` 分诊中，需先完成 spec 再排期。
