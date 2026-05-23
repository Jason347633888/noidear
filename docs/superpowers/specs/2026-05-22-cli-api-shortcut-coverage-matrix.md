# noidear-chat API 与业务闭环覆盖矩阵

**日期：** 2026-05-22
**状态：** 覆盖面基线，供 `noidear-chat` frontend-derived shortcut registry 和实现计划使用
**目标：** 让 CLI 覆盖现有所有后端 API，并把可替代页面操作的业务闭环尽可能封装成 shortcut。

---

## 结论

当前代码面说明：CLI 可以把“页面操作”拆成两层覆盖。

1. API 全覆盖：所有后端 REST API 进入 operation registry。Raw API 和 API Commands 覆盖全部 API 能力。
2. 闭环最大覆盖：以前端为主推导 shortcut registry。菜单、路由、前端 API 封装、页面按钮和页面方法调用是 shortcut 草稿的主来源；后端 controller 用来补全 operationId 和 schema。
3. 页面保留范围：复杂可视化、表单拖拽设计、文件预览、图表看板、打印预览这类视觉密集能力可以保留页面。录入、查询、提交、审批、导出、状态流转、批次追溯和例行检查应尽量走 CLI。

当前抽取结果：

| 来源 | 抽取结果 |
|---|---:|
| `client/src/navigation/menu.ts` | 11 个菜单组，64 个菜单入口 |
| `client/src/api/*.ts` | 61 个 API 适配文件，339 个前端请求调用 |
| `server/src/modules/**/*controller.ts` | 498 条 controller decorator 路由 |
| GitNexus `route_map` | 216 个 route node |

本矩阵以当前源码直接解析到的 498 条 controller 路由为 API 全覆盖基线。GitNexus `route_map` 用于辅助理解调用流，但这次覆盖统计以源码 decorator 为准。

---

## 覆盖口径

| 覆盖层 | 目标 | 替代页面程度 |
|---|---|---|
| Raw API | `noidear-chat api METHOD /path` 可调用全部后端 API | 覆盖所有开放 API，但用户体验偏底层 |
| API Commands | 从 operation registry 生成 `module action` 命令 | 覆盖大多数单接口操作 |
| Shortcut | 从前端页面操作推导业务闭环，再由后端 API/schema 校验 | 最大程度替代页面 |
| Skill | 告诉 Agent 何时用 shortcut，何时用 API Commands，何时必须确认 | 降低误操作和字段猜测 |

Frontend-derived shortcut 推导规则：

- 每个菜单入口默认至少推导一个 read/list shortcut 或 API command alias。
- 每个页面里的 `create`、`submit`、`approve`、`reject`、`complete`、`cancel`、`archive`、`publish`、`delete`、`export`、`upload` 等动作默认推导为 shortcut 候选。
- 页面方法调用顺序优先于主观业务猜测；例如页面先查详情再提交，shortcut 草稿也保留这两个 step。
- 前端 API 文件提供 operationId、参数名和路径别名；后端 controller 只负责确认 API 存在和补 schema。
- risk、确认门、审计、幂等和 E2E 字段必须生成，但不作为草稿生成阻塞项。推不出来就写 `inferred` 或 `needs-review`，由最后人工检查一次性处理。
- 不能在 CLI 内拼第二套业务事实链；如果页面本身有拼装逻辑，草稿必须把来源文件和代码位置标出来，后续实现时再决定是否需要后端补 API。

---

## 模块级覆盖矩阵

| 菜单组 | 页面入口 | API Commands 覆盖 | 前端推导 Shortcut 闭环 | 最后检查重点 |
|---|---:|---|---|---|
| 工作执行 | 4 | `todos`、`record-task`、`unified-approval`、`statistics` | `+workbench-digest`、`+todo-complete`、`+record-task-fill`、`+approval-decision` | 是否遗漏页面按钮动作 |
| 文控与审批 | 4 | `document`、`record-template`、`unified-approval` | `+document-create`、`+document-revise-submit`、`+document-publish`、`+record-form-land`、`+approval-history` | 上传、预览、发布、归档、修订动作是否完整 |
| 生产执行 | 6 | `record`、`record-task`、`warehouse/requisitions`、`warehouse/staging-area`、`deviation` | `+record-create-submit`、`+record-task-schedule`、`+material-requisition`、`+requisition-complete`、`+staging-transfer`、`+deviation-report` | 页面上的状态按钮是否都进入 registry |
| 产品研发 | 2 | `product`、`process`、`recipe`、`process-step`、`product-process-change` | `+product-create`、`+product-workbench-update`、`+rd-process-start`、`+rd-step-submit`、`+product-process-change` | 产品详情/工作台中的嵌套动作 |
| 质量与合规 | 7 | `ccp`、`non-conformance`、`corrective-action`、`customer-complaint`、`product-recall`、`supplier-evaluation`、`change-event` | `+ccp-record`、`+nonconformance-capa`、`+customer-complaint-trace`、`+product-recall`、`+supplier-evaluation`、`+change-event-closeout` | 列表页、详情页、抽屉里的二级动作 |
| 设备与现场 | 21 | `equipment`、`environment-record`、`process-record`、`metal-detection`、`cleaning-record`、`measuring-equipment`、`rework-record`、`visitor-record`、`waste` 等 | `+equipment-fault`、`+maintenance-plan-run`、`+environment-record`、`+process-record`、`+metal-detection`、`+cleaning-record`、`+calibration-record`、`+rework-record`、`+line-change-check`、`+visitor-register`、`+waste-record` | 单页表单字段是否完整抽取 |
| 追溯与批次 | 5 | `batch-trace`、`warehouse/batches`、`traceability`、`warehouse/material-balance`、`incoming-inspection` | `+production-batch-create`、`+batch-material-usage`、`+traceability-query`、`+material-balance-check`、`+incoming-inspection` | 历史 redirect 页面不应成为主入口 |
| 仓库管理 | 2 | `warehouse/materials`、`warehouse/suppliers`、`warehouse/inbound`、`returns`、`scraps` | `+material-master`、`+supplier-onboard`、`+material-inbound-complete`、`+material-return-complete`、`+material-scrap-complete` | 文件上传和完成类按钮 |
| 培训 | 1 | `training`、`training/questions`、`training/exam`、`training/archive` | `+training-plan-submit`、`+training-project-run`、`+training-question-import`、`+training-exam-submit`、`+training-archive-download` | 详情页中的 start/complete/cancel |
| 数据分析 | 3 | `statistics`、`deviation-analytics`、`audit`、`traceability/export` | `+stats-export`、`+deviation-analysis`、`+audit-export`、`+traceability-export` | 导出类动作和筛选参数 |
| 系统治理 | 9 | `user`、`department`、`role`、`permission`、`fine-grained-permission`、`user-permission`、`notification`、`search`、`audit` | `+user-provision`、`+role-permission-sync`、`+grant-permissions`、`+notification-read`、`+search-index`、`+audit-search` | 批量授权/撤销是否全部进入 registry |

---

## Shortcut Registry 候选清单

这些不是分阶段，而是同一个 shortcut registry 的候选全集。实现时可以按风险和样例完备度排序，但命名和边界应一次性定好。

### 工作执行

| Shortcut | 闭环 | 风险 |
|---|---|---|
| `+workbench-digest` | 汇总待办、待填任务、待审批、异常提醒 | read |
| `+todo-complete` | 查询待办并完成指定待办 | transition |
| `+record-task-fill` | 查询待填任务，填报记录，提交 | transition |
| `+approval-decision` | 查询审批任务，查看详情，同意或拒绝 | transition |

### 文控与审批

| Shortcut | 闭环 | 风险 |
|---|---|---|
| `+document-create` | 上传/创建文件草稿并建立引用关系 | write |
| `+document-revise-submit` | 新增修订，更新 Markdown 或附件，提交审批 | transition |
| `+document-publish` | 发布或归档受控文件 | transition |
| `+record-form-land` | 记录表单索引确认、字段覆盖检查、批量确认建议 | write |
| `+approval-history` | 查询文件或资源的审批历史 | read |

### 生产执行

| Shortcut | 闭环 | 风险 |
|---|---|---|
| `+record-create-submit` | 按模板创建记录并提交 | transition |
| `+record-task-schedule` | 创建、暂停、恢复、关闭定期填报任务 | transition |
| `+material-requisition` | 创建领料单并提交 | transition |
| `+requisition-complete` | 完成领料，触发库存扣减 | destructive |
| `+staging-transfer` | 车间暂存转移、发料、盘点 | transition |
| `+deviation-report` | 查询偏差、导出偏差、补录偏差说明 | write |

### 产品研发

| Shortcut | 闭环 | 风险 |
|---|---|---|
| `+product-create` | 创建产品主数据 | write |
| `+product-workbench-update` | 更新产品详情、报告、配方/工序工作台信息 | write |
| `+rd-process-start` | 基于流程模板创建研发流程实例 | write |
| `+rd-step-submit` | 提交流程步骤数据，触发必要审批 | transition |
| `+product-process-change` | 创建工艺变更、提交、重试或查询 | transition |

### 质量与合规

| Shortcut | 闭环 | 风险 |
|---|---|---|
| `+ccp-record` | 创建 CCP 记录，查询批次缺失 CCP | write |
| `+nonconformance-capa` | 创建不合格，处置，必要时创建 CAPA 并关闭 | transition |
| `+capa-closeout` | 创建纠正措施、添加验证、关闭 | transition |
| `+customer-complaint-trace` | 创建投诉，追溯相关批次，生成处理结论 | transition |
| `+product-recall` | 追溯、创建召回、提交通知、上传证据 | transition |
| `+supplier-evaluation` | 创建供应商评估并查询供应商历史 | write |
| `+change-event-closeout` | 创建变更、填关联表单、验证、关闭 | transition |

### 设备与现场

| Shortcut | 闭环 | 风险 |
|---|---|---|
| `+equipment-fault` | 报修、受理、完成或取消 | transition |
| `+maintenance-plan-run` | 查询计划，启动，完成或取消 | transition |
| `+maintenance-record-submit` | 创建维保记录并提交 | transition |
| `+environment-record` | 创建环境温湿度/压差记录 | write |
| `+process-record` | 创建过程参数记录 | write |
| `+metal-detection` | 创建金属探测记录并按批次查询 | write |
| `+cleaning-record` | 创建清洁消毒记录 | write |
| `+calibration-record` | 创建设备校准记录并查询超期设备 | write |
| `+rework-record` | 创建回料/返工记录 | write |
| `+fragile-item-inspection` | 创建玻璃硬塑检查记录 | write |
| `+line-change-check` | 创建换产前检查记录 | write |
| `+visitor-register` | 创建访客登记 | write |
| `+waste-record` | 创建废弃物记录和处置记录 | write |

### 追溯与批次

| Shortcut | 闭环 | 风险 |
|---|---|---|
| `+production-batch-create` | 创建生产批次，确认批次 | transition |
| `+batch-material-usage` | 维护生产批次投料关系 | transition |
| `+traceability-query` | 正追、反追、图谱、快照、导出 | read |
| `+material-balance-check` | 查询单批次或全量物料平衡 | read |
| `+incoming-inspection` | 基于 `MaterialBatch` 创建来料检验 | write |

### 仓库管理

| Shortcut | 闭环 | 风险 |
|---|---|---|
| `+material-master` | 创建/更新/停用物料主数据 | transition |
| `+supplier-onboard` | 创建供应商、上传资质、替换资质文件 | transition |
| `+material-inbound-complete` | 创建入库单，完成入库并生成物料批次 | transition |
| `+material-return-complete` | 创建退料单并完成 | transition |
| `+material-scrap-complete` | 创建报废单并完成 | destructive |

### 培训

| Shortcut | 闭环 | 风险 |
|---|---|---|
| `+training-plan-submit` | 创建培训计划并提交审批 | transition |
| `+training-project-run` | 创建项目、添加学员、启动、完成或取消 | transition |
| `+training-question-import` | 批量导入题目并调整顺序 | write |
| `+training-exam-submit` | 开始考试并提交答案 | transition |
| `+training-archive-download` | 创建/查询/下载培训档案 | read |

### 数据分析

| Shortcut | 闭环 | 风险 |
|---|---|---|
| `+stats-export` | 导出文档、任务、培训或统计报表 | read |
| `+deviation-analysis` | 查询偏差趋势、字段分布、部门/模板偏差率 | read |
| `+audit-export` | 查询并导出登录、权限、敏感操作日志 | read |
| `+traceability-export` | 导出追溯报告或快照结果 | read |

### 系统治理

| Shortcut | 闭环 | 风险 |
|---|---|---|
| `+user-provision` | 创建用户、重置密码、授予默认角色 | transition |
| `+role-permission-sync` | 创建角色并同步权限 | transition |
| `+grant-permissions` | 给用户批量授权或撤销权限 | transition |
| `+notification-read` | 查询未读、标记已读、全部已读 | write |
| `+search-index` | 建索引、查索引、删索引 | transition |
| `+audit-search` | 跨日志搜索、生成 BRCGS 报告 | read |

---

## 最后一次性检查口径

用户不需要在草稿生成前逐条补业务细节。实现计划应先从前端自动推导完整 shortcut registry 草稿，最后再交给用户一次性检查：

1. 是否遗漏页面上的按钮、批量动作、详情页动作、抽屉动作。
2. shortcut 名称是否符合业务人员说法。
3. 一句话触发语是否自然。
4. 自动步骤是否和前端页面顺序一致。
5. 被标记为 `needs-review` 的字段是否需要改名或拆分。
6. 页面里没有的业务闭环是否要额外补 shortcut。

草稿生成时允许字段不完美，但必须保留 `sourceEvidence`，让最终 review 能追回前端文件、API 文件和后端 route。

---

## 实现口径调整

`noidear-chat` 实现时需要新增一个显式 shortcut registry，而不是把 shortcut 写散：

```text
tools/noidear-chat/src/shortcuts/frontend-derived-shortcut-registry.json
tools/noidear-chat/src/shortcuts/domains/<domain>.ts
tools/noidear-chat/src/skills/noidear-*/SKILL.md
```

registry 中每个 shortcut 至少包含：

- name
- domain
- description
- triggerExamples
- startObject
- operationIds
- risk
- requiresConfirmation
- idempotency
- checkpointSteps
- dryRunFixture
- liveE2EFixture
- skillName
- sourceEvidence
- confidence
- reviewNotes

API 全覆盖由 operation registry 负责，业务闭环最大覆盖由 shortcut registry 负责。两者都必须从当前后端 API 和当前业务模型出发，不恢复旧 MCP，不创建平行业务事实源。
