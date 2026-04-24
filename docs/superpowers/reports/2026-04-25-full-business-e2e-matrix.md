# Full Business E2E Matrix

**Date:** 2026-04-25

## Coverage Rule

Every business domain in release scope must list:
- primary flow
- critical branch
- permission flow
- export/result flow where applicable
- current execution status

## E2E Coverage Matrix

| Business Domain | Primary Flow | Critical Branch | Permission Flow | Export/Result Flow | Test File | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 追溯查询 | /traceability object query | graph/ledger toggle | permission-limited result view | simple export + full-package export | e2e/traceability-query.spec.ts | Pending |
| 批次追溯 | batch list and detail | material balance check | restricted batch action | trace result view | e2e/batch-trace-flow.spec.ts | Pending (deprecated bridge) |
| 偏差检测 | deviation create and view | severity branch transitions | role-limited action | export deviation report | e2e/deviation-detection.spec.ts | Pending |
| 导出功能 | document/task export | failed export handling | export permission check | download result | e2e/export.spec.ts | Pending |
| 监控 | health check and metrics | degraded state | admin-only ops | monitoring report | e2e/monitoring.spec.ts | Pending |
| 权限流程 | role assignment and check | cross-role permission | restricted actions | permission audit log | e2e/permissions-flow.spec.ts | Pending |
| 工作流 | workflow create and advance | step transitions | approver-only actions | final result state | e2e/workflow.spec.ts | Pending |
| 培训项目 | training project create/complete | exam flow | role-restricted training | exam result | e2e/training-project-flow.spec.ts, e2e/training-exam-flow.spec.ts | Pending |
| 审计 | audit trail view | filter by actor/type | admin-only audit access | audit export | e2e/audit.spec.ts | Pending |
| 告警 | alert trigger and view | severity escalation | alert permission | alert log | e2e/alert.spec.ts | Pending |
| 搜索 | full-text search | empty/error state | scoped search | search result export | e2e/search.spec.ts | Pending |
| SSO | SSO login flow | auth failure branch | role mapping | session state | e2e/sso.spec.ts | Pending |
| 统计 | statistics dashboard | data range filter | role-scoped view | statistics export | e2e/statistics.spec.ts | Pending |
| 备份 | backup trigger and restore | restore conflict | admin-only backup | backup manifest | e2e/backup.spec.ts | Pending |
| 推荐 | recommendation view | empty state | user-scoped | recommendation result | e2e/recommendation.spec.ts | Pending |

## Unit Test Coverage

| Layer | Test Count | Files |
| --- | --- | --- |
| Client unit tests | 41 files | client/src/**/__tests__/*.spec.ts |
| Server unit tests | 20+ files | server/src/modules/**/*.spec.ts |
| Traceability contract tests | 3 files | traceability-contract.spec.ts, traceability-convergence.spec.ts, traceability.spec.ts |
