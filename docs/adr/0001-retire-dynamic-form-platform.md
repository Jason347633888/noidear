# ADR 0001: 退役动态表单平台

**日期:** 2026-05-24
**状态:** 已接受
**决策者:** noidear 工程团队

---

## 背景

noidear 早期使用动态表单引擎（RecordTemplate / Record / RecordTaskAssignment / RecordTaskInstance / Task / TaskRecord / ChangeEventFormTask / RecordFormLandingEntry / ModelLanding）来承载 283 张源表单的填写和任务分发。

该平台存在以下问题：

1. **数据模型重复**：每个业务领域（环境记录、清洁记录、偏差报告等）都有各自的独立业务表，与 Record 表形成平行事实源。
2. **追溯链路割裂**：Record 与 ProductionBatch、ShiftInstance、ProductionRun 的关联需要通过动态模型层中转，链路复杂、易断裂。
3. **维护负担**：model-landing 生成脚本、冻结 spec、283 张表单分类、RecordFormLandingEntry 落地状态需持续维护。
4. **已实际弃用**：独立业务 `*Record` 模型已承接绝大多数源表单的实际采集需求；动态表单引擎路由在生产环境中无活跃流量。

## 决策

完全退役动态表单平台，从代码库中删除以下内容：

**后端删除：**
- `server/src/modules/model-landing/`（含 generated artifact）
- `server/src/modules/record-template/`
- `server/src/modules/record/`
- `server/src/modules/record-task/`
- `server/src/modules/task/`
- `server/src/modules/scheduled-task/`
- `server/src/modules/document/services/record-form-landing.service.ts`
- `server/scripts/generate-model-landing-artifacts.ts`
- `server/scripts/verify-model-landing-artifacts.ts`
- `server/test/model-landing-freeze.spec.ts`
- ChangeEventFormTaskService 和相关规则文件

**Schema 删除（9 个模型）：**
- `RecordTemplate`、`Record`、`RecordChangeLog`、`RecordTaskAssignment`、`RecordTaskInstance`、`Task`、`TaskRecord`、`ChangeEventFormTask`、`RecordFormLandingEntry`

**前端删除：**
- `client/src/views/templates/`、`client/src/views/records/`、`client/src/views/record/`、`client/src/views/record-tasks/`、`client/src/views/tasks/`
- `client/src/views/documents/RecordFormLandingIndex.vue`
- `client/src/api/record-template.ts`、`record-task.ts`、`record.ts`、`task.ts`
- 对应路由和菜单条目

**保留：**
- `archive/superpowers/` 历史资料（只读背景参考，不作为当前实现合同）
- 独立业务 `*Record` 模型（EnvironmentRecord、CleaningRecord、ViolationRecord 等）
- `ApprovalInstance`、`ApprovalTask`、`ApprovalAction`（统一审批平台）
- `TodoTask`、`ProcessTemplate`、`ProcessInstance`（研发流程）
- `DeviationReport`（独立偏差报告，已移除 recordId/templateId 外键）

## 后果

**正面影响：**
- 消除平行事实源，追溯链路单一化
- 减少约 6 500 行运行时代码和 9 个数据库表
- 后续独立业务记录模块可直接对接追溯主链，无需动态模型层中转

**风险与缓解：**
- 历史动态表单数据（records 表）将因 DROP TABLE 而不可查询。已通过 CASCADE 迁移 SQL 处理，历史数据需提前导出备份（由 ops 负责）。
- DeviationReport 的 recordId/templateId 字段已删除，历史偏差报告将失去与原始表单的 FK 关联；业务接受该历史断链（偏差报告本身字段数据完整保留）。
- 偏离率（部门/模板）面板已从本次 PR 同步下线（`/deviation-analytics` 页面中"偏离率（部门）"和"偏离率（模板）"两张面板及对应的 `rate-by-department` / `rate-by-template` API 端点已移除）。该功能依赖已退役的 task_records / record_templates 表，等独立业务模型重建后恢复。

## 实现

分支：`codex/retire-dynamic-forms`
实现计划：`docs/superpowers/plans/2026-05-23-dynamic-form-retirement.md`（主 checkout）
