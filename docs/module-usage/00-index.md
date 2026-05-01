# 模块使用逻辑与整改地图

## 文档定位

本目录是 noidear 后续业务整改的准入依据。它按业务链说明系统应该如何使用、当前代码如何实现、每一步执行后的数据结果、缺失步骤造成的后果，以及当前差距整改建议。

## 使用规则

- 后续涉及业务流程、字段绑定、追溯、主数据、审批、任务、文控、库存、检验、生产的整改 PR，必须引用本目录中的对应模块文档和 GAP 编号。
- 不允许新增绕开 Product、Material、Supplier、Employee、Location、MaterialBatch、ProductionBatch 的平行事实源。
- 不允许用自由文本字段替代可关联的主数据或批次数据。
- 动态表单只能承接不适合独立业务建模的记录，不替代核心业务对象。

## 标准执行流程

后续 agent 处理 GAP 时必须按以下顺序推进：

1. 在 `97-gap-triage.md` 确认 GAP 状态、依赖和是否需要 spec。
2. `needs_spec` 先调用 `brainstorming` 形成 spec 初稿。
3. 用 `grill-with-docs` 对照现有文档、术语、schema 和业务边界校准 spec。
4. 调用 `writing-plans` 生成 implementation plan。
5. 将真实 `specPath`、`planPath` 回写到 `module-usage.manifest.json` 和 `97-gap-triage.md`。
6. 只有 `planPath` 文件真实存在后，GAP 才能进入 `96-pr-roadmap.md`。
7. 执行 PR 时调用 `executing-plans`，并在完成后按本目录回写规则更新文档。

## 文档清单

| 文件 | 范围 |
|---|---|
| `01-business-chain-overview.md` | 全业务链总览 |
| `02-master-data-and-boundaries.md` | 主数据、产品、配方、工序边界 |
| `03-document-control-and-record-forms.md` | 文控、记录表单、动态表单落地 |
| `04-supplier-procurement-incoming.md` | 供应商、采购、来料、来料检验 |
| `05-warehouse-inventory.md` | 仓储、库存、批次、调拨、盘点 |
| `06-mixing-production-packaging.md` | 配料、生产、包装、产品批次 |
| `07-quality-qc-release.md` | 过程控制、质检、放行 |
| `08-traceability-complaint-recall.md` | 追溯、投诉、召回 |
| `09-nonconformance-capa.md` | 不合格、CAPA、整改验证 |
| `10-equipment-and-measuring.md` | 设备、计量器具、维保、校准 |
| `11-training-internal-audit.md` | 培训、内审 |
| `12-task-approval-workflow.md` | 任务、审批、工作流 |
| `13-system-admin-ops.md` | 权限、账号、通知、备份、监控、审计 |
| `module-usage.manifest.json` | 机器可读索引：文档、路由、模块、模型、GAP、依赖 |
| `96-pr-roadmap.md` | GAP 分诊后的 PR 排期路线图 |
| `97-gap-triage.md` | GAP 分诊、superpower gate、spec/plan 状态 |
| `98-coverage-matrix.md` | 前端路由、后端模块、Prisma 模型、API 覆盖证明 |
| `99-current-gap-register.md` | 当前差距整改总表 |

## 后续整改 PR 准入规则

每个涉及业务流程、字段绑定、追溯、主数据、审批、任务、文控、库存、检验、生产的整改 PR，必须说明：

1. 解决 `99-current-gap-register.md` 中哪个 GAP 编号。
2. 修改哪条业务链。
3. 是否新增或删除主数据、批次、桥接关系或动态表单承载。
4. 是否影响追溯、放行、库存、审批或任务闭环。
5. 是否同步更新对应模块使用逻辑文档。

## 后续整改完成后的回写规则

每个后续整改 PR 完成后必须回写：

1. 对应 `docs/module-usage/*.md` 的当前实现、差距和后续整改入口。
2. `docs/module-usage/99-current-gap-register.md` 的 GAP 状态、依赖和验收结果。
3. `docs/module-usage/98-coverage-matrix.md` 的路由、模块、模型或 API 覆盖状态。
4. `docs/module-usage/module-usage.manifest.json` 的文档、GAP、依赖和验证命令。
5. 如涉及术语、事实源或业务边界变化，同步更新 `CONTEXT.md`。
6. 运行 `node tools/check-module-usage-docs.mjs` 并保持通过。
