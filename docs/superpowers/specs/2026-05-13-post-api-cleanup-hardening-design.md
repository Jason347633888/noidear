# Post API Cleanup Hardening — Design Spec

**Date:** 2026-05-13
**Scope:** API 契约清理后的真实缺口收口、统一审批残留清理、已删除模块残留剔除、测试体系修复、依赖安全审计、工程卫生收口
**Premise:** 当前项目没有历史业务数据，不需要保留旧错误接口或做历史数据搬迁；但 schema 变更仍必须生成 Prisma migration

**Prerequisite:** 本 spec 以前置 `2026-05-13-api-contract-gap-repair-design.md` 的实施结果为基础：系统地图脚本已合入并可复跑、第一轮已决议删除的产品面已清理、API adapter/direct client 缺口为 0。若执行分支尚未包含这些结果，必须先完成或同步前置 spec，不得跳过前置清理直接实施本 hardening spec。

---

## 背景

`2026-05-13-api-contract-gap-repair-design.md` 之后，最新系统地图已经能复跑，且前端调用到后端路由的契约缺口为 0：

```text
matched: 461
backend_only: 112
api_adapter_missing: 0
direct_client_missing: 0
deleted_scope_frontend_residue: 0
deleted_scope_backend_residue: 0
```

这说明“前端已调用但后端无对应实现”的 API 缺口已经不是当前主问题。继续看全项目后，剩余问题集中在五类：

1. 统一审批口径仍有残留：业务模块仍暴露 `approve/reject` 决策入口。
2. 已删除模块仍有运行时或测试引用：尤其是 `changeApproval`、`workflow`、`monitoring/alert`、`sso`、`internal-audit`。
3. Todo 类型和 action route 未与瘦身后的产品面同步。
4. 前端有少数请求绕过 baseURL 约定，存在 `/api/v1/api/v1/...` 风险。
5. 构建已绿，但前后端测试大量过期，不能作为回归 gate。

本 spec 的目标是把这些“系统地图不会直接报错，但会影响运行、测试和长期维护”的问题一次性收口。

---

## 当前验证事实

在当前 `master == origin/master @ dfc091bf` 基线上验证：

```bash
npx -y -p node@20 -p npm@10 npm ci
npx -y -p node@20 -p npm@10 npm run prisma:generate
npx -y -p node@20 -p npm@10 npm run verify:full
python3 tools/generate-system-map.py
```

结果：

- `verify:full` 通过：共享类型、MCP、后端 build、前端 build 都能通过。
- `tools/generate-system-map.py` 通过，API adapter 缺口、页面直连缺口、删除范围残留均为 0。
- 本机默认 Node 是 `v25.5.0`，不符合项目 `.nvmrc` 的 Node 20 约束；验证必须显式使用 Node 20。
- `npm ci` 后 `npm audit` 报 104 个漏洞，其中 53 个 high；不得盲跑 `audit fix --force`，但必须把依赖风险纳入本轮 implementation plan 的显式任务。

测试现状：

- 后端 `npm run test:server -- --runInBand`：160 个 suite 中 23 个失败，1322 个 tests 中 207 个失败。
- 前端 `npm run test:client`：69 个 files 中 5 个失败，411 个 tests 中 8 个失败。

测试失败主要是测试夹具和旧断言未随功能瘦身更新，不代表当前构建不可用；但它们已经使测试体系失去回归价值，必须修复。

---

## 目标

1. 正式审批只允许通过统一审批任务完成，业务模块不再暴露独立审批决策入口。
2. 删除已剔除模块的运行时残留、schema 残留、seed 残留、测试残留和前端展示残留。
3. 修复 Todo 类型、action route 和前端过滤器，使待办只指向真实存在的页面。
4. 修复前端请求前缀错误，确保 `request` 实例下不再传入 `/api/v1/...`。
5. 更新测试体系，使默认构建和默认单元测试能稳定反映当前产品边界。
6. 对 `npm audit` 的 high 风险做生产/开发依赖分层处置，不留下未分类的高风险依赖。
7. 保持系统地图作为 API 契约 gate，不把 `backend_only` 当成缺口，但要继续防止已删除范围回潮。

---

## 非目标

- 不重新实现旧 `workflow` 模块。
- 不恢复 `change-approval`、`asset-loan-record`、`internal-audit`、`management-review`、`monitoring`、`alert`、`sso` 产品面。
- 不保留用户侧 monitoring/alert controller、页面或 adapter；除非存在非 UI cron/job/provider、部署必需 metrics 端点或保留模块 DI 调用，否则 monitoring/alert 后端也默认删除。
- 不为了测试通过而恢复已删除 schema/model。
- 不处理移动端新能力。
- 不在本轮强制做破坏性大版本依赖升级；需要大版本升级时，implementation plan 必须列出影响包、原因和验证命令。
- 不在本 spec 中执行 implementation plan。

---

## 统一审批收口

### 原则

全项目只保留一个正式审批事实源：

- `ApprovalDefinition`
- `ApprovalInstance`
- `ApprovalTask`
- `ApprovalAction`

除以下两个统一审批动作外，其他业务模块不得暴露 `approve/reject` 决策入口：

- `POST /approval-tasks/:id/approve`
- `POST /approval-tasks/:id/reject`

业务模块可以保留非审批动作，但必须使用非审批命名，例如：

- `submit`：提交业务对象进入审批或执行流。
- `complete`：业务执行完成。
- `verify`：业务验收或核验。
- `close`：业务关闭。
- `archive`：归档。
- `confirm`：业务确认。

如果一个动作本质是“同意/驳回某个申请”，它必须迁到统一审批；如果它只是业务执行动作，必须改名为非审批动作，不能继续叫 `approve/reject`。

迁移业务模块本地 `approve/reject` 时必须拆清三类职责：

- 业务副作用进入统一审批 callback，在同一事务内推进业务状态或生成后续对象。
- 审批时填写的业务决策字段进入统一审批 action payload 的受控 `metadata`，并写入 `ApprovalAction.snapshot.businessDecision`；会影响后续业务状态的字段还必须由 callback 写回业务对象正式字段。
- 原 route DTO / class-validator 规则必须迁移为 `resourceType + triggerKey + stepKey` 级别的 action payload 校验。通用审批 DTO 只校验公共字段，不能让业务字段以任意 JSON 方式绕过校验。

当前统一审批 action DTO 只有 `comment`；如果某个待迁移 route 需要返修/报废、批准数量、有效期调整、附件等业务字段，implementation plan 必须先扩展 metadata schema、validator 和 callback context，再删除原 route。

### 必须收口的后端入口

以下入口当前仍存在，必须逐个处理：

| 入口 | 决策 |
|------|------|
| `POST /deviation-reports/:id/approve` | 迁到统一审批 callback；前端不再直接调用业务 approve |
| `POST /product-recalls/:id/approve`、`POST /product-recalls/:id/reject` | 当前 `ProductRecall` 没有 `ApprovalDefinition` seed，也没有 `approvalInstanceId` 回链；先补统一审批定义、回链字段、submit 发起审批和 callback，再删除业务 approve/reject route |
| `POST /training/plans/:id/approve` | 迁到统一审批 callback；培训计划提交后只产生 `ApprovalTask` |
| `POST /tasks/approve` | 删除旧审批语义；如确有任务验收，改名为 `POST /tasks/:id/verify` |
| `POST /maintenance-records/:id/approve`、`POST /maintenance-records/:id/reject` | 若为设备记录审批，迁到统一审批；若为验收，改名为 `verify` |
| `POST /warehouse/requisitions/:id/approve` | 迁到统一审批，领料/出库执行用 `complete` |
| `POST /returns/:id/approve`、`POST /scraps/:id/approve`、`POST /warehouse/inbound/:id/approve` | 按语义二选一：正式审批迁统一审批；操作确认改名为 `confirm` 或 `complete` |
| `POST /change-events/:id/approve` | 删除直接审批入口；变更状态只由统一审批 callback 推进 |

上表是当前验证到的真实清单，不是抽样。implementation plan 入口必须先运行以下 discovery 命令复核；如发现额外业务 approve/reject 入口，必须先补进本表或 plan 的收口清单，再开工：

```bash
rg -n "@Post\\([^)]*(approve|reject)" server/src/modules --glob '!**/unified-approval/**'
```

implementation plan 必须为每个保留的审批业务定义：

- `ApprovalDefinition.resourceType`
- `ApprovalDefinition.triggerKey`
- 业务提交点调用 `ApprovalEngineService.startApproval(...)` 的位置
- 业务模型上的 `approvalInstanceId` 回链字段
- `onApproved` / `onRejected` callback key
- callback 内最终更新的业务状态
- action payload metadata schema、校验器和 callback 写回字段

`ProductRecall` 是本轮显式补齐项：新增 `ProductRecall.approvalInstanceId` 与索引；`submit` 从 `draft` 推进到 `pending_review` 时调用 `ApprovalEngineService.startApproval(...)`；新增 `ApprovalDefinition` seed：`resourceType = 'product_recall'`、`triggerKey = 'submit'`、`stepKey = 'product-recall-review'`、`onApproved = 'productRecall.approvalApproved'`、`onRejected = 'productRecall.approvalRejected'`；callback 将 `review_note` 写入 `ProductRecall.review_note`，并更新 `reviewed_by`、`reviewed_at` 和 `status`。

删除 workflow 前还必须列出当前 workflow template、seed/demo seed 默认模板和 runtime 配置，并确认仍需保留的审批流都已经在 `ApprovalDefinition` seed 中有等价 `resourceType`、`triggerKey`、步骤、分配规则和 callback。没有等价定义的，先补 seed，再删除 workflow。

### ChangeEvent callback 修复

当前 `ChangeEventModule` 的 `changeEvent.approvalApproved` callback 仍写入已删除的 `changeApproval` delegate：

```ts
await (context.tx as any).changeApproval.updateMany(...)
```

这会在真实审批通过时运行时失败。必须删除该写入，callback 只做两件事：

1. 更新 `ChangeEvent` 自身状态和审批字段。
2. 调用 `ProductProcessChangeService.applyApprovedChange(...)` 落实已审批变更。

`seed.ts` 中 `stepKey: 'change-approval'` 必须改成不指向旧模块的名称，例如 `change-event-review`。保留的 callback key 可以是 `changeEvent.approvalApproved`，但 seed、测试名和注释不得再暗示独立 `ChangeApproval` 模块存在。

### Callback 覆盖校验

新增或更新测试时，不只测试 registry 抛错路径，还必须校验 seed 中保留的 callback key 全部已注册：

- 读取 `server/src/prisma/seed.ts` 和 `server/src/prisma/seed-e2e.ts` 中的 `ApprovalDefinition.steps[*].onApproved/onRejected`。
- 排除已删除模块对应的 seed，删除而不是跳过。
- 启动注册过业务模块 callback 的测试模块。
- 逐个断言 callback key 已注册。

验收时不得存在“审批定义能 seed 成功，但审批结束时找不到 callback”的状态。

### 物理隔离与字段位置确认

实施前必须确认旧 `approval` 模块与 `unified-approval` 的物理边界：

- 若 `server/src/modules/approval/**` 已不存在，记录为已删除，不再新增兼容目录。
- 若旧目录仍存在，先确认它没有被 `server/src/modules/unified-approval/**` import；如有共享 helper，先迁移到 `unified-approval` 或共享基础模块，再删除旧目录。

动态表单的 `approval-step` 当前是记录模板字段类型，不是 Prisma enum；至少需要扫描 `server/src/modules/record-template/types/fields-json.types.ts`、DTO 白名单、前端字段组件、seed/mock JSON。删除时要清掉代码配置和测试夹具；除非扫描发现 schema 字段，否则不按数据库 enum 迁移处理。

---

## Todo 与已删除模块残留

### 删除 `audit_rectification`

内审模块已经决议剔除，`audit_rectification` 不再有真实页面或业务来源。必须删除：

- Prisma enum `TodoType.audit_rectification`
- `TodoService.ACTION_ROUTE_MAP` 中 `/internal-audit/rectifications`
- `TodoService.ALL_TODO_TYPES`
- `QueryTodoDto` type filter
- `client/src/types/todo.ts`
- `client/src/utils/todoPresentation.ts`
- `client/src/views/my-todos/MyTodos.vue` 过滤选项
- seed、测试和 mock 数据中的内审整改待办

### 系统审计明细与审计驾驶舱

系统审计日志明细保留：登录日志、权限日志、敏感操作日志和审计搜索仍是系统治理证据。`/audit/dashboard` 属于驾驶舱汇总产品面，必须删除：

- `AuditController.getDashboard` route。
- 前端 `client/src/api/audit.ts` 中 `getDashboardStats` adapter。
- 审计驾驶舱页面/menu/test。
- 只服务 dashboard 的 `AuditService.getDashboard()` 聚合方法。

如果 `AuditService.getDashboard()` 内有明细查询复用的 helper，先拆出共享 helper，再删除 dashboard 聚合入口。

### DocumentReference 与审计链路

保留 `DocumentReference`、`MarkdownWikilinkService`、`DocumentReferenceHealthService`。删除文控 audit-chain/evidence-chain 时，必须先确认 `DocumentReference` 模型、DTO 和引用健康 service 没有复用 `auditChain*` / `evidenceChain*` 字段或方法；如有复用，只删除审计链路展示面，保留引用健康必须用到的关系字段。

删除 enum 属于 schema 变更，必须生成 Prisma migration。项目无历史业务数据，不需要迁移旧待办数据。

删除 `TodoType.audit_rectification` 时，migration 不能沉默丢弃审计证据：先把现有 `audit_rectification` 待办备份到迁移临时/归档表；若存在待处理记录，应中止迁移并要求人工归档或确认清空；只有在确认没有待处理记录时，才删除该 enum 值对应的记录并重建 enum。

### 补齐保留 Todo 类型

后端 schema 已有：

- `document_renewal`
- `change_execution_failed`

前端类型和展示必须补齐：

- `client/src/types/todo.ts`
- `client/src/utils/todoPresentation.ts`
- `client/src/views/my-todos/MyTodos.vue`
- Dashboard / TodoTable 中的标签展示

### 修复 `document_renewal` action route

当前 `document_renewal` action route 是 `/documents/business-links/:id`，但前端 router 没有这个页面。文控续期/复审任务应回到文件生命周期，因此改为：

- `DocumentExpiryService` 创建 `document_renewal` 待办时，`relatedId` 使用 `link.document.id`。
- `TodoService.ACTION_ROUTE_MAP.document_renewal` 返回 `/documents/${id}`。
- `title` 和 `description` 继续保留外来文件/业务链接上下文，避免丢失到期原因。

如果同一文件有多个到期链接，同一用户同一文件只保留一个待处理续期待办，文件详情页承接具体复审/修订动作。合并语义必须确定：`dueDate` 保留最早到期日期；`priority` 保留最高优先级；`description` 需要保留所有触发续期的业务链接摘要，不能被后到的低风险链接覆盖。

### 保留 `change_execution_failed`

`change_execution_failed` 是产品工序变更落库失败后的执行补救待办，不是审批待办，也不属于已删除模块。保留：

- 后端 `ProductProcessChangeTodoBridge`
- action route `/products/by-plan/:planId`
- 前端 `ProductByPlanRedirect.vue`

补齐前端类型和展示后，系统地图与测试都不得把它误判为 change-approval 残留。

---

## 前端请求约定

`client/src/api/request.ts` 已设置：

```ts
baseURL: '/api/v1'
```

因此使用 `request.get/post/...` 时不得传入 `/api/v1/...`。必须修复：

- `client/src/views/training/archives/ArchiveList.vue` 中 `request.get('/api/v1/departments')` 改为 `request.get('/departments')`，或收敛到 `client/src/api/department.ts` adapter。

允许保留完整 `/api/v1/...` 的场景：

- `window.open(...)`
- `<el-upload action="...">`
- 文件下载/预览 URL helper
- 原生 `fetch` 打开绝对下载地址

新增静态检查：

- `request.*('/api/v1/...')` 在 `client/src` 中必须为 0。
- `axios.post('/api/v1/upload/image', ...)` 暂可保留，但应在后续单独收敛到 upload adapter。

本轮必须把该检查固化为脚本并接入默认验证链，不能只依赖人工手动运行：

```bash
rg -n "request\\.(get|post|put|patch|delete|head|options)\\(\\s*['\\\"]/api/v1/" client/src
```

---

## 系统地图与 backend-only 口径

系统地图当前缺口为 0，应继续作为 API 契约 gate：

```bash
python3 tools/generate-system-map.py
```

验收要求：

- `api_adapter_missing == 0`
- `direct_client_missing == 0`
- `deleted_scope_frontend_residue == 0`
- `deleted_scope_backend_residue == 0`

`backend_only == 112` 不直接作为失败条件。原因：

- 有些后端 route 是内部管理、上传、导出、健康探针或预留 CRUD。
- “仅后端”不等于前端缺口。

但 implementation plan 必须抽样检查 backend-only 里的高风险项：

- 名称含 `approve/reject/workflow/monitoring/alert/sso/internal-audit/management-review/asset-loan/change-approval` 的 route 必须清零或有明确非审批解释。
- 已删除产品面的后端 route 不得以 backend-only 形式留下。
- 保留的健康探针 `/health*`、`/liveness` 不算运维 UI 残留。
- 来源文件未被 router、菜单、动态 import、普通 import 或测试入口引用的 direct client request，应归类为 orphan / 删除候选，而不是普通“待补后端 route”缺口。

`tools/generate-system-map.py` 当前已经是本轮 gate 的一部分。若执行 worktree 看不到该脚本，必须先同步/提交当前 prototype 或明确按上游 spec 重建；不得让系统地图逻辑只存在于本机未提交文件。

---

## 测试体系收口

### 后端测试

必须删除或更新以下过期测试：

| 失败来源 | 决策 |
|----------|------|
| `server/test/training-service.e2e-spec.ts` import `WorkflowInstanceService` | 删除 workflow 依赖；培训审批改测统一审批或只测培训服务本身 |
| `server/test/condition-parser.spec.ts` import `src/modules/workflow/condition-parser` | 删除旧 workflow 条件解析测试 |
| `server/test/workflow-advanced.e2e-spec.ts` | 删除旧 workflow runtime 测试 |
| `server/test/alert.e2e-spec.ts`、`server/test/monitoring.e2e-spec.ts`、`server/test/monitoring.load.spec.ts` | 删除已剔除 monitoring/alert 产品面测试；保留 `/health` 后端探针测试 |
| `audit.service.spec.ts` dashboard 断言 | 删除 `/audit/dashboard` 聚合断言；保留登录日志、权限日志、敏感操作日志和审计搜索明细测试 |
| `server/test/sso.service.spec.ts` | 删除 SSO 测试 |
| `statistics.service.spec.ts`、`statistics.integration.spec.ts` | 从旧 `workflowInstance` 统计改为 `approvalInstance` 统计，mock 必须包含 `approvalInstance` |
| 文控 `obsolete`、`confirmRead`、workbench、health、rollback 相关测试 | 按文控瘦身后能力更新或删除 |
| `DocumentService` 测试模块 provider 缺失 | 补 `DocumentControlMetadataService`、`NumberRuleService`、`ApprovalEngineService` mock |
| `model-landing-freeze.spec.ts` | 读取 `archive/superpowers/specs/2026-04-24-model-landing-layer-design.md`，不要读已删除的 `docs/superpowers/specs/...` |
| e2e 缺 `JWT_SECRET` / `DATABASE_URL` | 默认 unit test 不应依赖外部 DB；e2e 要么拆独立脚本并要求 env，要么在 env 缺失时显式 skip |
| `corrective-action.service.spec.ts` 内审 finding source | 删除 internal-audit source 校验，或改为当前保留 source 类型 |

业务审批迁移后的后端测试采用同一形态：不再调用业务模块自己的 approve/reject route，而是通过统一审批任务触发 callback，并断言业务副作用、metadata 快照和业务对象写回。示例形态：

```ts
const { instance, task } = await submitBusinessObjectAndFindApprovalTask();
await request(app.getHttpServer())
  .post(`/api/v1/approval-tasks/${task.id}/approve`)
  .send({ comment: '同意', metadata: { businessDecision: { result: 'approved' } } })
  .expect(201);
expect(await prisma.approvalAction.findFirst({ where: { taskId: task.id } }))
  .toMatchObject({ snapshot: expect.objectContaining({ businessDecision: { result: 'approved' } }) });
expect(await reloadBusinessObject(instance.resourceId)).toMatchObject({ status: 'approved' });
```

如果某模块只需要单测 callback，可以直接 invoke callback registry，但仍必须覆盖 metadata validator 和业务状态写回；不得只测 registry key 不存在时抛错。

后端验收命令：

```bash
npx -y -p node@20 -p npm@10 npm run prisma:generate
npx -y -p node@20 -p npm@10 npm run build:server
npx -y -p node@20 -p npm@10 npm run test:server -- --runInBand
```

如果仍保留需要真实数据库的 e2e，应新增明确脚本，例如 `test:e2e`，并在 README 或 AGENT guide 中写清需要 `DATABASE_URL`、`JWT_SECRET`、Postgres、Redis、MinIO。

### 前端测试

必须删除或更新以下过期测试：

| 失败来源 | 决策 |
|----------|------|
| `client/src/api/__tests__/document-control.spec.ts` 期望 `getWorkbench` | 删除 workbench 断言；改测保留的文件库、记录表单索引、引用健康 API |
| `client/src/router/__tests__/product-rnd-menu.spec.ts` 读取 `Layout.vue` | 改为读取 `client/src/navigation/menu.ts`，菜单事实源不在 Layout |
| `DocumentDetail.spec.ts` 期望 `作废`、`回滚`、admin 旧判断 | 改为当前保留动作：发起修订、停用文档、归档、预览/下载版本；不再期望作废/回滚 |
| `IncomingInspectionList.spec.ts` 查找原生 `select` | 按 Element Plus stub 或组件事件更新测试，不依赖真实 DOM select |
| `TemplateEdit.spec.ts` 直接调用 `handleExcelImport` | 如果该方法已不暴露，改为测试当前导入交互；若导入能力已删除，删断言 |
| Todo 相关测试 | 增加 `document_renewal`、`change_execution_failed` 展示；删除 `audit_rectification` |

前端验收命令：

```bash
npx -y -p node@20 -p npm@10 npm run build:client
npx -y -p node@20 -p npm@10 npm run test:client
```

### E2E 测试清理

已剔除的用户侧页面不得继续有 Playwright E2E：

- `/health` 用户页面
- `/documents/operations/health`
- monitoring / alert 页面
- workflow runtime / workflow task
- internal-audit / management-review
- asset-loan-record
- sso login

保留的后端 `/health` 探针测试可以在 server e2e 中存在，但不应对应用户侧菜单和页面。

---

## 依赖安全审计

`npm audit` 当前有 high 风险，implementation plan 必须包含依赖治理任务，但不能把它和业务边界修复混成一个 commit。

处理顺序：

1. 运行 `npm audit --json`，保存或摘录高风险条目的 package、severity、via、effects、fixAvailable。
2. 区分生产依赖与开发依赖：
   - 生产依赖 high：优先做非破坏性升级或替换，必须通过 `verify:full` 和相关测试。
   - 开发依赖 high：若只影响测试/构建链，也必须分类说明，不得无声忽略。
3. 可以运行不破坏锁文件语义的 `npm audit fix`，但不得运行 `npm audit fix --force`，除非 implementation plan 已列出大版本变化和验证范围。
4. 如果 high 风险来自当前技术栈暂时无法升级的传递依赖，必须留下 `docs/superpowers/specs` 或 plan 中的风险说明，包含包名、来源链、是否进入生产 bundle、下一步升级条件。

验收口径：

- 不允许存在“未阅读、未分类”的 high audit 项。
- 如果仍有 high audit 项，必须是已分类、已说明影响面、已确认不能在本轮安全升级的项。

---

## 工程卫生

当前工作区混有本地生成物和 agent 工具文件。implementation plan 必须明确分类，不得打包进业务提交：

| 路径 | 决策 |
|------|------|
| `client/e2e/.auth/admin.json` | 登录态文件，已被 git 跟踪；本轮应从提交中排除，并后续评估是否从仓库移除改为 `.gitignore` |
| `client/playwright-report/`、`client/playwright-results.json` | 测试产物，不提交 |
| `tools/noidear-mcp/dist/` | 构建产物，应加入 ignore 或确保不提交 |
| `.agents/skills/`、`.claude/skills/` | 项目内 agent 技能文件；若要保留，必须作为独立工具治理提交，不混入业务修复 |
| `.codex/hooks.json` | 本地 agent 配置；不应混入业务修复，除非明确作为项目配置纳入 |

提交前必须运行：

```bash
git status -sb
git diff --stat
git diff --check
```

并人工确认没有登录态、报告、dist、个人工具配置被误提交。

---

## 验收标准

最终实现完成后必须全部满足：

1. `python3 tools/generate-system-map.py` 输出：
   - `api_adapter_missing: 0`
   - `direct_client_missing: 0`
   - `deleted_scope_frontend_residue: 0`
   - `deleted_scope_backend_residue: 0`
2. `rg -n "@Post\\(':id/(approve|reject)'\\)|@Post\\('approve'\\)" server/src/modules` 只允许命中 `unified-approval`，或命中已明确改名后的非审批测试残留为 0。
3. `rg -n "changeApproval|WorkflowInstanceService|src/modules/workflow|monitoring/alerts|alertRule|alertHistory|SsoService|internal-audit|management-review|asset-loan|audit/dashboard|getDashboardStats" server/src client/src server/test client/e2e` 不得命中已删除产品面的运行时或默认测试引用。
4. `request.*('/api/v1/...')` 在 `client/src` 中为 0。
5. Todo 类型前后端一致：
   - 删除 `audit_rectification`
   - 保留并展示 `document_renewal`
   - 保留并展示 `change_execution_failed`
6. `document_renewal` 待办跳转到真实存在的文档详情页。
7. `npx -y -p node@20 -p npm@10 npm run verify:full` 通过。
8. `npx -y -p node@20 -p npm@10 npm run test:server -- --runInBand` 通过，或默认 test 脚本只跑不依赖外部 DB 的测试，DB e2e 拆成明确脚本。
9. `npx -y -p node@20 -p npm@10 npm run test:client` 通过。
10. `npm audit --json` 的 high 项已经完成生产/开发依赖分类；仍保留的 high 项必须有原因和下一步升级条件。
11. `git status -sb` 中不包含误提交候选：登录态、Playwright report、dist、个人 agent 配置。
12. 统一审批迁移后的 action metadata、业务 validator 和 callback 写回规则均有测试覆盖；不得只测试 registry 抛错路径。

---

## Implementation Plan 输入边界

后续 implementation plan 应拆成以下独立任务组：

1. 统一审批残留收口与 callback 修复。
2. Todo enum / route / frontend 类型同步。
3. 前端请求前缀修复和静态检查。
4. 后端过期测试删除/更新。
5. 前端过期测试删除/更新。
6. 依赖安全审计与可安全升级项处理。
7. 工程卫生和提交范围清理。

任务组可以分 commit，但不能把测试清理延后到另一个未定义阶段；本 spec 的完成定义包含测试 gate 恢复。

可以单 PR 完成，但必须按任务组设置 review checkpoint。若拆 PR，顺序必须是：系统地图 gate → 删除产品面/schema migration → 统一审批收敛 → Todo/前端前缀/保留能力修复 → 测试与依赖收口。不得先删除 workflow/旧审批再补 `ApprovalDefinition` seed、callback 校验和 action metadata 支持。
