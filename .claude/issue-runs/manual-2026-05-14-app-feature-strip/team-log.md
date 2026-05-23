# Team Log

## 2026-05-14

- IssueLead: intake 分类 → Implementation Plan 直接执行
- IssueLead: 确认 post-api-cleanup-hardening 分支引用不作为硬阻塞，以 master 代码事实为准
- IssueLead: 创建 issue-run，启动 Implementer

## 2026-05-14 Implementer 执行记录

### Task 1: Preflight Snapshot - 完成
- Worktree 创建于 `/Users/jiashenglin/Desktop/project/noidear-app-feature-strip`，分支 `codex/app-feature-strip`
- npm ci 成功（Node 20 通过 npx wrapper）
- 预扫描确认：Mobile/Backup/HealthController/RecycleBin/Import/Export 模块均已存在，符合 plan 描述
- Baseline server build 成功（exit 0）
- 发现：`StatisticsExportService` 在 statistics 模块内，不在通用 export 模块中（符合预期）
- 发现：`ExportModule` 被 deviation/statistics 模块 import，需按 plan 迁移

### Task 2: Remove Mobile Workspace - 完成
- 删除 `mobile/**`（uni-app 工作区）
- 删除 `server/src/modules/mobile/**`
- 移除 `package.json` workspaces 中的 `mobile`
- 移除 `client/Dockerfile`、`server/Dockerfile` 中的 `COPY mobile/package.json`
- 移除 `server/src/app.module.ts` 中 `MobileModule` 注册
- 删除 schema 中 `MobileUpload`、`SyncSubmission` 模型
- 手动创建迁移 `20260514000001_remove_mobile_workspace`
- commit: `721b1f8e`

### Task 3: Remove In-App Backup Management - 完成
- 删除 `client/src/views/backup/BackupManage.vue`、`client/src/api/backup.ts`
- 删除 `server/src/modules/backup/**`
- 移除路由 `/backup/manage`、菜单"备份管理"
- 移除 seed-dev.ts 中 backupHistory 创建块
- 删除 schema `BackupHistory` 模型
- 创建迁移 `20260514000002_remove_backup_management`
- commit: `afde1d2e`

### Task 4: Keep Liveness, Remove Health Management - 完成
- 删除 `server/src/modules/health/health.controller.ts`、`health.service.ts`
- 精简 `health.module.ts` 仅保留 `LivenessController`
- Server build 验证通过
- commit: `f1af0088`

### Task 5: Remove Generic Recycle Bin - 完成
- 删除 `client/src/views/RecycleBin.vue`、`recycle-bin/**`、`api/recycle-bin.ts`
- 删除 `server/src/modules/recycle-bin/**`
- 移除路由 `/recycle-bin`、菜单"回收站"
- 移除 `RecycleBinModule` 注册
- 确认业务 `deletedAt` 等字段保留完好
- commit: `8fb26479`

### Task 6: Remove Generic Import/Export Center - 完成
- 迁移 `deviation-export.service.ts` 进 deviation 模块（自包含）
- 新增 `RecordExportService`（`POST /records/export`，xlsx/zip，10000 行限制，sensitive audit log）
- 新增 6 个测试全部通过
- 迁移 statistics 页面导出从 `exportApi` 到 `statisticsApi`
- 删除 approvals export 死代码分支
- 删除 `server/src/modules/export/**`、`server/src/modules/import/**`
- 删除前端 ExportPage、ImportPage、ExportDialog、ExportButton、api/export、api/import
- 移除路由、菜单
- commit: `516d3be0`

### Task 7: Remove Deployment Observability Stack - 完成
- docker-compose.yml 删除 prometheus/grafana/alertmanager/loki/promtail 及相关 volumes
- 删除 `monitoring/**` 目录（14 文件）
- 从 server/package.json 删除 `@willsoto/nestjs-prometheus`、`prom-client`
- 更新 README、docs/AGENT_GUIDE.md 移除监控栈条目
- commit: `2d5976d8`

### Task 8: Final Validation - 完成
- npm ci 成功
- server build 成功（exit 0）
- client build 成功（exit 0）
- server tests: 145 套件，1087 个测试，全部通过
- client tests: 67 文件，383 个测试，全部通过
- system-map: api_adapter_missing=0, direct_client_missing=0, deleted_scope_*_residue=0
- branch pushed: `codex/app-feature-strip`
- HEAD commit: `ae18860b`

## 2026-05-14 Implementer Repair Round 1

Reviewer 识别 5 个阻塞问题（3 HIGH + 2 MEDIUM），全部在本轮修复。

### HIGH-1 — request.ts blob 拦截器短路
- 修改 `client/src/api/request.ts`：在响应成功拦截器中加 responseType blob/arraybuffer 短路
- 新建 `client/src/api/__tests__/request.spec.ts`：3 个测试验证短路行为

### HIGH-2 — POST /records/export 权限与范围
- 修改 `record.controller.ts`：加 `@Roles('admin','leader','user')`，注入 `@Req()`
- 修改 `record-export.service.ts`：接收 user，对 `roleCode==='user'` 加 `createdBy` 过滤
- `record-export.service.spec.ts`：新增 3 个角色范围单测

### HIGH-3 — SensitiveLog 审计字段
- 修改 `sensitive-log.decorator.ts`：扩展 SensitiveLogOptions（bodyFields/resourceIdField）
- 修改 `sensitive-log.interceptor.ts`：从 req.body 读取允许字段并写入 details
- 修改 `record.controller.ts`：@SensitiveLog 传 bodyFields 配置

### MEDIUM-1 — zip entry 名称碰撞
- 修改 `record-export.service.ts`：entry 命名改为 `${safeName}-${safeId}.xlsx`
- 更新现有测试断言，新增同名模板回归测试

### MEDIUM-2 — 失效 e2e spec
- 修改 `server/jest.e2e.config.js`：追加 backup/health e2e spec 到 ignore 列表

### 验证结果
- server build: exit 0
- client build: exit 0
- server tests: 145 套件，1091 个测试，全部通过
- client tests: 68 文件，386 个测试，全部通过
- Commit: `da3af2d9`，已推送 `origin/codex/app-feature-strip`

## 2026-05-14 Implementer Repair Round 2

### NEW-HIGH-1 — submitterId 越权回归
- `record-export.service.ts` `buildWhere`：user 角色路径先检查 `dto.submitterId !== user.id` → 抛 `ForbiddenException`；再强制 `where.createdBy = user.id`（不可被 dto.submitterId 覆盖）
- admin/leader 路径：仅当非 user 角色且 dto.submitterId 存在时才设 `where.createdBy = dto.submitterId`
- 新增 3 条单测（TDD 红绿）：user 传他人 submitterId → Forbidden；user 传自己 → 通过；admin 传他人 → 通过

### HIGH-3 残余 — service 层写 audit
- 注入 `AuditService` 到 `RecordExportService`
- 在 records 拿到后调用 `auditService.createSensitiveLog`：单模板写 resourceId=templateId/resourceName=模板名；跨模板写 resourceId='cross-template'/resourceName='多模板记录导出'；details 含 exportedCount=records.length/recordIds.length
- 失败走 logger.error，不阻断业务
- `record.controller.ts` bodyFields 追加 'recordIds'
- 新增 3 条 audit 单测（TDD 红绿）

### LOW-NEW-4 — MCP /health → /liveness
- `tools/noidear-mcp/src/tools/devops.ts`：endpoint 改为 `/liveness`，移除 token 认证；非 2xx 状态码返回 'unhealthy'（修正假阳性判断）

### 验证结果
- server build: exit 0
- client build: exit 0
- server tests: 145 套件，1097 个测试，全部通过
- client tests: 68 文件，386 个测试，全部通过
- Commit: `c6777f19`，已推送 `origin/codex/app-feature-strip`

## 2026-05-14 Reviewer Verification Round 1

- Reviewer 针对 commit `da3af2d9` 做定向修复验证（非全 PR 重审）
- HIGH-1 / MEDIUM-1 / MEDIUM-2：已解除
- HIGH-2：主体修复正确，但被 NEW-HIGH-1 推翻（见下）
- HIGH-3：仅部分修复，仍阻塞（@Res() 模式 recordCount 永拿不到 / 跨模板 resourceId 落 'unknown' / bodyFields 漏 recordIds / 拦截器零测试）
- **NEW-HIGH-1（Repair Round 1 引入的越权回归）**：`record-export.service.ts:106` `if (dto.submitterId) where.createdBy = dto.submitterId;` 无条件覆盖前面针对 user 角色设的 `where.createdBy = user.id`；DTO + RecordList.vue 把 submitterId 暴露给前端 + `@Roles(...,'user')` 允许 user 角色进入 = 任意已登录 user 可传他人 submitterId 越权导出
- codex adversarial-review 独立命中 NEW-HIGH-1（P1）+ MCP devops.ts 仍打 /health（LOW-NEW-4）+ endDate 漏当天（LOW-3 重复）
- codex `--base` 与自定义 PROMPT 互斥，本次未能注入 Reviewer 初步结论作为 focus，已在 handoff.md 验证缺口章节诚实说明
- Verdict：Request changes，存在 2 项阻塞（NEW-HIGH-1 + HIGH-3 残余），不进入 closeout
- 详情写入 handoff.md "Reviewer Verification Round 1 — 2026-05-14"
- 进入 standby，等待 IssueLead 下一步指令

## 2026-05-14 Reviewer Verification Round 2

- Reviewer 针对 commit `c6777f19` 做定向修复验证（gitnexus-pr-review + requesting-code-review + /codex:adversarial-review --wait --base master 实际执行，thread `019e265e-540c-7272-898f-7903e1755454`）
- Fix 1（NEW-HIGH-1 submitterId 越权）：解除。ForbiddenException 先于 createdBy 覆盖；admin/leader 路径正确；3 个新测试通过；jest 16/16 PASS；tsc PASS
- Fix 2（HIGH-3 审计 details）：service 侧逻辑（注入、签名、resourceId、resourceName、exportedCount）正确，但 controller `@SensitiveLog` + `@UseInterceptors(SensitiveLogInterceptor)` 未拆 → 双重落库（interceptor 行可能 resourceId='unknown' 无 exportedCount；service 行 IP/UA='service-layer'）→ HIGH 阻塞未解除
- Fix 3（LOW-NEW-4 MCP /liveness）：解除。LivenessController 存在；globalPrefix=api/v1 无 exclude；catch 分支返回 unhealthy
- 新发现 HIGH（前端构建失败）：`client/src/views/record/RecordList.vue:186` 写入 `keyword` 但 `ExportRecordsPayload`/`RecordListParams` 未声明该字段；`npx vue-tsc --noEmit -p client/tsconfig.json` 报 TS2353（Codex 命中，Reviewer 复跑确认）
- 新发现 MEDIUM（审计字段不全）：admin/leader 用 submitterId 导出他人记录时，service 审计 `details` 未含 `submitterId`，controller `bodyFields` 也未含
- codex adversarial-review 这次成功用 focus 注入 Reviewer 初步结论（上一轮的 `--base` 与 PROMPT 互斥问题已通过把 focus 直接拼到 `$ARGUMENTS` 字符串里规避）
- Verdict：Request changes，2 HIGH + 1 MEDIUM 阻塞，不进入 closeout
- 详情写入 handoff.md "Reviewer Verification Round 2 — 2026-05-14"
- 进入 standby，等待 IssueLead 下一步指令

## Repair Round 3 — 2026-05-14 Implementer 执行记录

### 修复项

1. **HIGH 双重审计日志消除**
   - 删除 `record.controller.ts` 上的 `@SensitiveLog` 装饰器 + `@UseInterceptors(SensitiveLogInterceptor)` + 两者的 import
   - `RecordExportService.writeAuditLog` 保留为单一审计写入点
   - 新增测试：`createSensitiveLog` 在成功导出后被调用**恰好一次**（防回归）

2. **HIGH 失败路径审计**
   - `exportRecords` 中用 try/catch 包裹 `buildWhere`
   - `ForbiddenException` 路径：先写 `action='export_data_denied'` 审计，再重新抛出
   - 新增测试：user 传他人 submitterId 时触发 ForbiddenException + export_data_denied 审计

3. **HIGH 前端 TS2353 修复**
   - `client/src/api/record.ts` `ExportRecordsPayload` 新增 `keyword?: string`
   - `vue-tsc --noEmit` 无 TS2353

4. **MEDIUM submitterId 加入审计 details**
   - `writeAuditLog` `details` 加 `submitterId: dto.submitterId`
   - 新增测试：admin 带 submitterId 导出时 details 含该字段

### 验证

- server 1100 个测试全部通过
- client 386 个测试全部通过
- `npm run build:server` / `npm run build:client` 均成功
- `npx vue-tsc --noEmit` 无 TS2353

### Commit

`ffb43b49` 已推送到 `origin/codex/app-feature-strip`

### 进入 standby

Repair Round 3 完成。等待 IssueLead 下一步指令（Reviewer 验证 / stand down / 进一步修复）。

## 2026-05-14 Reviewer Verification Round 3

- Reviewer 针对 commit `ffb43b49` 做定向修复验证（gitnexus-pr-review + requesting-code-review + `/codex:adversarial-review --wait` 实际执行；focus 通过 stdin 注入 Reviewer 初步结论成功）
- Fix 1（HIGH 双重审计去重）：解除。`record.controller.ts` `@SensitiveLog` + `@UseInterceptors(SensitiveLogInterceptor)` 与对应 import 全部移除；`sensitive-log.interceptor.ts:27-35` metadata-driven 无 metadata 直接 next.handle()；`main.ts:54` 仅注册 ResponseInterceptor，全仓 grep 无任何 SensitiveLogInterceptor 全局注册；ForbiddenException try/catch 顺序正确（先写 export_data_denied 再 throw）；spec 用 `toHaveBeenCalledTimes(1)` 强断言
- Fix 2（HIGH vue-tsc TS2353）：解除。`ExportRecordsPayload.keyword?: string` 已加；`ExportRecordsDto` 服务端同名字段已存在；vue-tsc 跑通无 record/keyword 相关 TS2353；剩余 37 条错误全部预存与本 PR 无关
- Fix 3（MEDIUM submitterId 入审计 details）：解除。`writeAuditLog` details 含 `submitterId`，user/admin/leader 三路径覆盖；spec 断言通过
- 静态/运行时：server tsc PASS；jest 145 套件 1100 测试全部 PASS；record-export.service.spec.ts 19/19 PASS
- Codex adversarial-review 给出 2 条 P2，无 P1：(1) LOW-3 endDate 漏当天数据（既有项目惯例，维持 LOW）；(2) LOW-NEW-5 `client/e2e/export.spec.ts/audit-system.spec.ts/document-lifecycle.spec.ts/health.spec.ts` 仍引用已删除路由，Reviewer 补充确认 `health.spec.ts` 也属同类残留——与 server `jest.e2e.config.js` ignore 对称的配置卫生问题，当前 noidear 工作流 E2E 非 merge gate，**不阻塞**，建议 closeout 前或独立 PR 一并处理
- Codex 未反驳本轮三项放行（双重审计 / vue-tsc / submitterId details），事实层默认确认
- Verdict：**Approved，无 P1/P2 blocker，PR merge-ready**。三轮历史阻塞全部清零
- LOW/NIT 跟进项（7 条）：LOW-NEW-5 client e2e 残留 / LOW-NEW-1 request.spec.ts 测试质量 / LOW-NEW-2 leader 部门范围 / LOW-NEW-3 server e2e 删除而非 ignore / LOW-3 endDate 漏当天 / NIT-1 zip 文件名 fallback / NIT-2 sensitive-log.interceptor.spec.ts 缺失分支测试
- 详情写入 handoff.md "Reviewer Verification Round 3 — 2026-05-14"
- 进入 standby，等待 IssueLead 下一步指令

## Repair Round 4 — 2026-05-14 Implementer 执行记录

### 修复项：LOW-NEW-5 — client e2e specs 仍引用已删除路由

**删除整个文件（所有测试均针对已删除路由）：**
- `client/e2e/export.spec.ts`：所有测试均导航 `/admin/export`、`/admin/import`（路由已删除）
- `client/e2e/health.spec.ts`：所有测试均导航 `/health` 及 PostgreSQL/Redis/MinIO/Disk 详细健康端点（路由已删除，仅 `/liveness` 保留）

**保留文件，删除相关 test blocks（文件同时含有效路由测试）：**
- `client/e2e/audit-system.spec.ts`：删除 BCK-*(备份 `/backup/*`) 和 RBN-*(回收站 `/recycle-bin/*`) 两个 describe 块；移除无用的 `createDocument`/`softDelete` 帮助函数；更新文件头注释
- `client/e2e/document-lifecycle.spec.ts`：删除 DOC-005（`page.goto('/recycle-bin')`）和 RBN-003（调用 `/recycle-bin` 永久删除接口）两个 test 块

### 验证

- `rg` 扫描确认 e2e 目录内无 `/admin/export|/admin/import|/backup|/recycle-bin|/health/postgres` 等已删除路由引用（仅有历史注释一处）
- `npm run build:client`：exit 0，构建成功
- `npm run test -w client`：68 个测试文件，386 个测试，全部通过
- `playwright.config.ts` 无 testIgnore 列表，无需同步

### Commit

`979ff4f7` 已推送到 `origin/codex/app-feature-strip`

### 进入 standby

Repair Round 4 完成。等待 IssueLead 下一步指令。

---

## Reviewer Verification Round 4 — 2026-05-14

**Target**：commit `979ff4f7`（Repair Round 4，分支 `codex/app-feature-strip`）。
**Skills used**：`gitnexus-pr-review`、`requesting-code-review`、`/codex:adversarial-review --wait --base master`（已实跑）。

### 验证

- 删除：`export.spec.ts`、`health.spec.ts` 已从 worktree 消失，`git show 979ff4f7 --stat` 与 Implementer 报告一致（5 insertions / 827 deletions）。
- 局部编辑 `audit-system.spec.ts`：4 个 describe 完好；BCK/RBN/createDocument/softDelete 全部 dropped；仅 L16-17 注释主动记录了删除。`tsc --noEmit` 单文件零错误。
- 局部编辑 `document-lifecycle.spec.ts`：6 个 describe 完好；DOC-005 / RBN-003 test 体已删；runtime 无 `/recycle-bin` 调用。文件头 L15 BDD 列表仍提到 DOC-005，是注释级 NIT。
- 残留扫描（仅 `client/e2e/`）：除一条说明性注释外零匹配。
- `playwright test --list`：263 tests / 26 files。Implementer 报告的 386 是 vitest 计数，口径不同但内部一致。
- `playwright.config.ts` 无 `testIgnore`，无需修改。
- 校验缺口：vitest 因 Node v25 / vitest 4 / vite 5 兼容失败（与 PR 无关）；`vue-tsc` 未在 client root 安装；Playwright 实测未跑。

### Codex 对抗复审

Verdict = **needs-attention**。一条 medium 级发现 Reviewer 漏掉：本分支删除了 backup / recycle-bin / health / monitoring / alert 的运行时代码，但 `docs/BDD_SPEC.md`（L25/27/22/23 目录；L258、L788+、L834+、L938+、L1016+ 章节）仍以"当前能力"声明这些功能，且 `README.md:31` `README.md:60` 仍列回收站/备份管理/健康检查/系统监控/告警规则。

Reviewer 二次复核：Codex 引用的行号/章节全部真实存在；`git log origin/master..HEAD -- docs/BDD_SPEC.md` 为空，本分支 8 个 commit 无一触及 BDD_SPEC。计划文件残留扫描列了 README.md / AGENT_GUIDE.md 但**未列 BDD_SPEC.md**，这是同源遗漏。

### 合并判断

**Request changes — 存在 1 项 P2 文档合同未退役**：

- P2：`docs/BDD_SPEC.md` 退役 BACKUP / RECYCLE-BIN / MONITORING / ALERT 章节 + DOC-005 改写；`README.md:31, 60` 同步移除回收站/备份/健康/监控/告警的当前能力描述。
- LOW/NIT：`document-lifecycle.spec.ts:15` 文件头 BDD 清单同步去掉 DOC-005；Round 3 已记录的 6 项 LOW/NIT 维持不变。

LOW-NEW-5 在 e2e 文件层面已解决，但 LOW-NEW-5 的同源问题（已删除功能的"声明面"）覆盖不全。建议 IssueLead 决定：补一次纯文档 Round 5 commit、或把 P2 降级为 closeout 后处理。

### Standby

Verification Round 4 完成，进入 standby，等待 IssueLead 指令。

## Repair Round 5 — 2026-05-14 Implementer

**任务**：P2 文档修复——退役 BDD_SPEC.md / README.md / e2e 注释中已删除功能的当前能力声明

**执行**：
- `docs/BDD_SPEC.md`：删除目录条目 ALERT/MONITORING/BACKUP/RECYCLE-BIN；删除对应 4 章全部 scenario（BDD-ALT-*、BDD-MON-*、BDD-BCK-*、BDD-RBN-*）；DOC-005 改写去掉回收站断言
- `README.md`：移除"回收站"（L31）；将"健康检查、备份管理、系统监控、告警规则、告警历史"替换为"活跃度检查（GET /liveness）"（L60）
- `client/e2e/document-lifecycle.spec.ts`：移除文件头 DOC-005 注释行

**验证**：残留扫描零有效匹配（唯一匹配为 DOC-005 标题的说明性括注）

**Commit**：`678b5789` — docs: retire BDD spec and README declarations for deleted surfaces
**Push**：`979ff4f7..678b5789` → `origin/codex/app-feature-strip`

**状态**：Round 5 完成，进入 standby，等待 IssueLead 指令

## Reviewer Verification Round 5 — 2026-05-14

**对象**：commit `678b5789`（Repair Round 5，纯文档退役）。
**Head 一致性**：worktree 当前 HEAD = `678b5789`，分支 `codex/app-feature-strip` 与 `origin` 同步。

**校核结果**（逐项）：
1. BDD_SPEC.md TOC 仅 14 章，ALERT/MONITORING/BACKUP/RECYCLE-BIN 4 条全删。
2. `rg BCK-|RBN-|BDD-ALT|BDD-MON|BACKUP|RECYCLE.BIN|MONITORING|ALERT docs/BDD_SPEC.md`：0 命中。
3. DOC-005 第 254-259 行重写准确：仅保留 deletedAt + 列表/搜索不可见，删除回收站 UI 断言。
4. README L30 删"回收站"；L60 替换为"活跃度检查（GET /liveness）"；`server/src/modules/health/liveness.controller.ts` 真实存在 `@Controller('liveness')`，非死文档。
5. spec.ts 头注释删除 DOC-005；正文 `rg DOC-005|recycle` 0 命中。
6. 终极扫描三文件仅 1 命中 = DOC-005 标题合法括注。
7. 无 over-deletion；存活业务面描述完整保留。

**Codex adversarial-review**：bash 调用 `/codex:adversarial-review --wait` 返回 exit code 127；slash command 在本环境未配置。按 standing order 列为验证缺口，已用独立 adversarial 视角自检（同源残留、死文档、over-deletion）补偿。

**Verdict**：**Approved — PR fully merge-ready**。无 P1/P2 blocker。

**遗留 LOW/NIT（不阻塞 merge）**：Round 3 已记录 6 项 + `client/coverage/` 报告产物 tracked + 实测套件缺口 + Codex 命令未配置。建议 closeout 跟进。

**状态**：Reviewer 进入 standby，等待 IssueLead 指令。
