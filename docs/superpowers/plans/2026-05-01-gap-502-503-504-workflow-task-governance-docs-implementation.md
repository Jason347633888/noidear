# GAP-502/503/504 审批、工作流、任务边界文档实施计划

> **给执行 agent：** 必须使用 `superpowers:executing-plans` 按本计划逐项执行。这是文档型实施计划，不允许改 schema、后端控制器、前端页面或运行时逻辑。如果发现实际代码与本计划的前提不一致，停止并回报主 agent。

**目标：** 给旧审批、统一审批、工作流、任务、记录任务写清楚使用边界，减少后续 agent 重复造审批/任务机制。

**GAP：** `GAP-502`, `GAP-503`, `GAP-504`

**Spec：** 不需要。本任务产出的是决策说明和模块文档链接，不改变业务事实源。

**业务边界：**

- 旧 `Approval` 只作为历史/文档模块遗留审批记录口径，不允许新业务继续接入。
- `UnifiedApproval` 是后续审批定义、审批实例、审批任务的权威方向。
- `Workflow` 是通用流程编排能力，不能和审批平台互相替代。
- `Task` 是一次性事项/待办，`RecordTaskAssignment` 是周期性记录表单派发配置。

**非目标：**

- 不删除旧 `Approval` 模型或接口。
- 不迁移历史审批数据。
- 不修改 workflow 或 unified-approval 运行时代码。
- 不修改任务模型字段。
- 不调整菜单。

---

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** 主 agent 已按项目文档和 superpowers 写计划要求完成上下文核对、范围收敛和 implementation plan 编写。
- **grill-me 校准结论：** 主 agent 已按 grill-me 方式质询本计划的必要性、事实源边界、schema/历史数据影响、可并行性和验收方式；能通过代码和文档确认的问题已直接核对，未发现需要用户额外确认的阻塞问题。
- **执行限制：** Multica 执行 agent 只能使用 `superpowers:executing-plans` 执行本计划；不得自行扩展范围、补写新 spec、重排 GAP 或改动未列入文件。
- **执行隔离：** 执行本计划前必须从最新 `origin/master` 创建独立 worktree，或使用 Multica 隔离工作目录；不得在主 checkout `/Users/jiashenglin/Desktop/好玩的项目/noidear` 直接修改、提交或 push。如发现当前目录是主 checkout，必须停止并回报主 agent。
- **停止条件：** 如果执行 agent 发现本计划与当前代码、AGENTS.md、docs/AGENT_GUIDE.md 或 docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md 冲突，必须停止并回报主 agent，不得猜测实现。

## 文件范围

- 新增：`docs/superpowers/specs/2026-05-01-approval-workflow-task-boundary-guide.md`
- 修改：`docs/module-usage/12-task-approval-workflow.md`
- 可选修改：`docs/module-usage/98-coverage-matrix.md`（只加链接，不重写）

---

## 任务 1：核对当前代码事实

只读检查：

- `server/src/prisma/schema.prisma`
- `server/src/modules/approval/`
- `server/src/modules/unified-approval/`
- `server/src/modules/workflow/`
- `server/src/modules/task/`
- `server/src/modules/record-task/`
- `client/src/api/approval.ts`
- `client/src/api/workflow*.ts`
- `client/src/api/task*.ts`
- `client/src/api/record-task*.ts`

- [ ] 确认旧 `Approval`、`ApprovalDefinition/ApprovalInstance/ApprovalTask`、`WorkflowTemplate/WorkflowInstance/WorkflowTask`、`Task`、`RecordTaskAssignment` 的当前用途。
- [ ] 不确定的行为写成“需要后续验证”，不要编造。

**验收：**

- 新文档中的每个边界判断都有源文件依据。

---

## 任务 2：新增边界指南

**文件：**

- `docs/superpowers/specs/2026-05-01-approval-workflow-task-boundary-guide.md`

- [ ] 用中文写。
- [ ] 包含“结论先行”。
- [ ] 包含五类机制的定义：
  - 旧 `Approval`
  - `UnifiedApproval`
  - `Workflow`
  - `Task`
  - `RecordTaskAssignment`
- [ ] 写清楚“新业务应该选哪一个”的决策树。
- [ ] 写清楚禁止事项：
  - 不允许新增业务直接接旧 `Approval`。
  - 不允许把 `Workflow` 当审批平台替代品。
  - 不允许把周期性记录表单派发塞进一次性 `Task`。
  - 不允许在业务模块里重新建一套审批状态字段来替代统一审批。
- [ ] 写清楚后续迁移建议，但不要承诺本 PR 会迁移。

**验收：**

- 一个新 agent 不读 schema，也能判断“审批/工作流/任务/记录表单派发”该接哪套机制。

---

## 任务 3：链接模块使用文档

**文件：**

- `docs/module-usage/12-task-approval-workflow.md`
- `docs/module-usage/98-coverage-matrix.md`（可选）

- [ ] 在 `12-task-approval-workflow.md` 中加入新指南链接。
- [ ] 对 `GAP-502/503/504` 所在段落补一句“边界说明见新指南”。
- [ ] 保持原 GAP 证据不变，不大段重写模块审计结果。

**验收：**

- 从模块使用文档能跳到边界指南。

---

## 任务 4：验证

运行：

```bash
rg -n "approval-workflow-task-boundary-guide|UnifiedApproval|RecordTaskAssignment|旧 Approval|Workflow" docs/superpowers/specs docs/module-usage/12-task-approval-workflow.md docs/module-usage/98-coverage-matrix.md
node tools/check-module-usage-docs.mjs
git diff --check
```

**最终回报必须包含：**

- 已确认使用 `superpowers:executing-plans`。
- 修改的文件列表。
- 确认没有改源码/schema。
- 验证命令结果。
- 仍需后续业务确认或迁移的点。
