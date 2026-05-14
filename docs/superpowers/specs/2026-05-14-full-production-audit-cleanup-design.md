# Full Dependency Audit Cleanup — Design Spec

**Date:** 2026-05-14
**Scope:** 根项目全依赖安全审计清零、未设计 mobile/uni-app 交付面剔除、Web/H5 主系统保留、前端 Excel 依赖剔除、Server/MCP/工具链依赖链收口、Docker 镜像安全基线、应用内运维/横向工具瘦身
**Premise:** 当前项目没有历史业务数据；用户确认 `mobile/` 并非已设计或已启用的交付范围，可以直接剔除。当前 H5/浏览器主系统是 `client/`，必须保留。
**Revision 2026-05-14:** 用户确认应用内批量导入不是当前产品功能；旧 `/admin/import`、`client/src/api/import.ts`、`server/src/modules/import/**` 直接删除，不以后端模板/预览或 CLI 命令重建。历史“后端承接 Excel 导入模板/预览”的讨论不再作为本轮目标。

---

## 背景

在 `targeted-rework-1` 最新代码上运行全量依赖安全审计：

```bash
npm audit
```

当前失败结果为：

```text
95 vulnerabilities (17 low, 53 moderate, 25 high)
```

用户确认“全部清零”：本轮不再只修生产依赖 high 漏洞，而是以根目录 `npm audit` 无任何 vulnerability 为目标。`dependencies` 与 `devDependencies` 都在范围内，low / moderate / high 都必须纳入处理。

执行口径分层，避免工具链生态短期无稳定修复时让 agent 无限回旋：

- high / critical 必须清零，不允许豁免。
- low / moderate 也必须优先清零；只有在 npm advisory 当前没有稳定修复版本，且 7 日内无可采用的 stable release 时，才能登记到 `docs/superpowers/specs/2026-05-14-audit-risk-register.yaml`，列明 advisory id、所有受影响 occurrence（workspace、package、依赖链、是否触达本项目代码路径）、处置决策、下次复核日期和 owner。
- 登记风险不是“已清零”。若风险登记非空，implementation 不能声称 full audit cleanup 完成，只能回报“阻塞于上游无稳定修复”并等待用户决策。
- 不允许用 `--omit=dev`、`--audit-level=high` 或删除 audit 输出来伪装清零；这些参数只能用于本地快速 smoke，不是最终 gate。
- 第一次生成或更新 risk register 的责任属于 dependency-and-image-hardening 执行 PR；任何一次 strict audit 非零退出，执行 agent 必须在同一个 PR 中更新 YAML register 或修到 0。register 为空但 strict audit 非零必须 block。
- `docs/superpowers/specs/2026-05-14-audit-risk-register.yaml` 是唯一允许的残留登记格式，不再使用自由文本 markdown 表。每条 entry 必须包含 `advisoryId`、`severity`、`occurrences`、`currentBlocker`、`decision`、`discoveredAt`、`nextReviewAt`、`renewalCount`、`owner`、`notes`。`occurrences` 是数组，每个元素包含 `workspace`、`packageName`、`packageChain`、`reachedProjectCodePath`，用于表达同一 advisory 命中多个 workspace / package 的情况；不得用多条相同 `advisoryId` entry 表达多 workspace 命中。
- `tools/check-audit-register.mjs` 必须校验 YAML schema：`severity` 只允许 `low` / `moderate`；`occurrences[].workspace`、`occurrences[].reachedProjectCodePath`、`decision` 必须是白名单枚举，其中 `decision` 只允许 `override`、`wait_upstream`、`replace_dependency`、`remove_capability`；`owner` 必须是具体 GitHub handle、git author email 或 spec 明确列名责任人，不能是 `implementation-agent` 这类泛称；`nextReviewAt` 不得早于运行日；初次登记的 `nextReviewAt` 不得晚于 `discoveredAt + 7 天`。若上游仍无 stable fix，复核后可以把 `nextReviewAt` 再顺延最多 7 天，但必须更新 `notes` 里的证据并递增 `renewalCount`。同一 advisory 连续顺延超过 4 次后，必须改为 `replace_dependency` 或 `remove_capability` 决策，不允许无限续期；`renewalCount` 是上限不是配额，任何复核日发现上游已发 stable fix 都必须立即修复并清理条目，不允许故意走满 4 次。
- `tools/check-npm-audit-strict.mjs` 必须运行未省略 devDependency 的 `npm audit --json`，并把 advisory id 与 YAML register 对齐：新增 advisory 未登记则失败；登记条目过期则失败；severity 为 high / critical 的条目直接失败；register 里出现 high / critical 也直接失败。若 high / critical 当前确无上游修复，agent 必须停下回报，由用户在换依赖、删能力、或签字接受短期风险之间决策；该短期风险只能写在 PR 描述 / 用户决策记录里，不能写入 risk register，也不能让 strict gate 通过。

Audit checker 数据契约固定如下，implementation plan 不得另行发明：

- Advisory 主键取法：从 `npm audit --json` 的 `vulnerabilities[packageName].via[]` 中只把 object via 作为 advisory 记录；string via 只用于辅助构造依赖链，不生成新 advisory。object via 的 `url` 中若能提取 `GHSA-xxxx-xxxx-xxxx`，`advisoryId` 使用该 GHSA；否则 fallback 为 `npm:${source}:${name}`；若 `source` 缺失，fallback 为 `npm:${name}`。同一个 `advisoryId` 在多个 package / workspace 命中时合并为一条 policy item，并写入 register 的 `occurrences[]`。
- `npm audit` 与 register 联表状态：
  - strict 有、register 无：退出 1，状态 `unregistered`。
  - strict 有、register 有、未过期：low / moderate 允许通过；high / critical 仍退出 1，状态 `highCriticalNotRegisterable`。
  - strict 有、register 有、已过期：退出 1，状态 `expired`。
  - strict 无、register 有：退出 0，但 stderr JSON 中输出状态 `staleRegistered`，提示“已修复，请清理 register”。
- `decision: override` 只在 npm `overrides` 已经应用、但 strict audit 仍命中该 advisory 时登记；如果 override 真正把 transitive 版本升到 fixed、strict 不再命中该 advisory，register 条目必须立即删除，不允许长期保留 `decision: override`。
- `reachedProjectCodePath: unknown` 只允许作为一次性待调查状态；entry 的 `notes` 必须写明“需 code-path 调查 + 下次复核完成”，并点名对应 workspace/package。同一 `advisoryId` 连续两次复核后仍有 occurrence 为 `unknown` 时，`check-audit-register.mjs` 必须视为 schema 非法并失败。决策矩阵口径：任一 occurrence 为 `yes` 时，应优先 `replace_dependency` 或 `remove_capability`；全部为 `no` 且仅 dev-only / 构建期未触发时，才允许 `wait_upstream`。
- `renewalCount` 的真实性采用简单约束：脚本只校验数字、非负、且 `<= 4`；是否正确递增由 review 通过 `git diff` / `git log` 兜底。implementation plan 不需要让脚本回溯 git 历史。
- `check-audit-register.mjs` 与 `check-npm-audit-strict.mjs` 必须共享 `tools/lib/audit-register.mjs` 中的 YAML 解析、schema 校验、advisory id 提取和联表逻辑；禁止复制两套 schema 校验实现。
- `check-npm-audit-strict.mjs` 必须自己加载 YAML register 并完成联表，不通过 `npm run security:audit:register` 或 child process 间接调用 register checker；`security:audit:register` 只是给人工和 CI 单独验证 YAML schema 用。
- 退出码固定：0 表示通过；1 表示 audit policy 违规；2 表示 YAML schema 非法或 audit JSON 无法解析；3 表示 register 文件不存在或不可读。失败或 warning 时 stderr 最后一行必须是可解析单行 JSON，例如 `{"code":1,"items":[{"advisoryId":"GHSA-xxxx-xxxx-xxxx","status":"unregistered","severity":"moderate","package":"vite","workspace":"client"}]}`，供 CI 和 review 读取。

这些漏洞不是单一业务缺口，而是四条依赖链混在一起：

1. `client` 直接依赖 `xlsx@0.18.5`，该包存在 high 漏洞且 audit 显示无可用修复；历史直接用法包含批量导入和培训统计。批量导入中心本轮删除，剩余培训统计导出迁到后端生成。
2. `mobile` workspace 拉入整套 `@dcloudio/uni-*` 多端构建链，带出 `@intlify`、`jimp`、`postcss`、`esbuild` 等大量 transitive 漏洞。
3. `server` 和 `tools/noidear-mcp` 依赖链中存在 Nest / Express / Multer / bcrypt / tar 等可升级或可 override 的风险。
4. `devDependencies` 中的 Nest CLI / schematics、TypeScript ESLint、Vite / Vitest、Jest 等工具链依赖也会触发 audit 失败，需要升级、替换或收敛。
5. Docker 构建与部署基线仍有未收口项：`client/Dockerfile`、`server/Dockerfile` 还复制 `mobile/package.json`；`docker-compose.yml` 中 MinIO、Prometheus、Grafana、Alertmanager、Loki、Promtail 使用 `latest` 标签。
6. 用户确认继续瘦身：此前已删除监控 UI / API，本轮也删除 Docker Compose 中的 Prometheus / Grafana / Alertmanager / Loki / Promtail 观测栈和 `monitoring/` 配置目录。
7. 用户确认继续剔除应用内备份管理：当前 `BackupModule` 通过业务 API 和页面触发 PostgreSQL / MinIO 备份，但实现依赖 `docker exec` 和固定容器名，属于部署运维能力，不作为业务系统功能保留。
8. 用户确认继续剔除应用内健康管理：当前后端 `HealthController` 暴露依赖健康、磁盘和系统信息接口；前端没有健康管理页面。保留最小运行存活探针即可。
9. 用户确认继续剔除通用回收站：当前 `RecycleBinModule` 横跨 document、record-template、record 提供统一恢复/永久删除/自动清理入口；不再作为业务系统功能保留。
10. 用户确认继续剔除通用批量导出中心：当前 `/admin/export` 页面只提供用户导出，通用 `ExportModule` 又横跨 document、task、task-record、deviation、user；真实需要的导出应回到对应业务模块。
11. 用户确认应用内批量导入不要作为功能保留；如未来确需初始数据或批量数据修正，使用 seed、Prisma Studio、SQL 或一次性运维脚本，不在业务系统里长期保留导入页面、导入 API 或 CLI 导入替代品。

用户已确认：`mobile/` 不是当前已设计移动端能力，可以直接剔除；但需要确认当前 H5 页面模块仍在。经检查，当前主系统页面都在 `client/src/views`，路由由 `client/src/router/index.ts` 管理，菜单由 `client/src/navigation/menu.ts` 管理。`mobile/` 是独立 uni-app 草稿工程，不是当前 Web/H5 主系统。

---

## 目标

1. 根目录严格 `npm audit` 目标为 0 漏洞；若 low / moderate 因上游无稳定修复暂不能清零，必须进入 audit risk register，不能静默通过。
2. 直接剔除未设计的 `mobile/` uni-app workspace，包括 npm workspace、lockfile、Docker install 引用、文档说明和后端 mobile API/schema。
3. 保留当前 Web/H5 主系统 `client/`，不得删除 `client/src/views`、路由、菜单或当前浏览器端业务模块。
4. 删除 `client` 对 `xlsx` 的直接依赖，避免浏览器端生成或解析不可信 Excel；通过删除导入中心和把剩余培训统计导出迁到后端完成。
5. 修复或升级 `server`、`tools/noidear-mcp`、前后端测试构建工具链的依赖链，优先使用最小可验证升级；必要时使用 npm `overrides`。
6. 建立 Docker 镜像安全基线：自建 `server` / `client` 镜像必须无 high / critical 漏洞；保留的第三方服务镜像不得使用 `latest`，必须固定版本或 digest 并输出扫描结果。
7. 删除应用内备份管理页面、API、调度器、Prisma 模型和 seed 假数据；保留 MinIO 作为业务文件存储能力。
8. 删除应用内健康管理 API，只保留最小 `/liveness` 运行存活探针。
9. 删除通用回收站页面、API、cron 和 seed 假数据；保留业务对象自身归档、作废、撤销或软删除字段。
10. 删除通用批量导出中心页面、组件、API 和后端 `ExportModule`；保留业务场景内的具体导出。
11. 删除应用内批量导入中心页面、API adapter、后端 `ImportModule` 和相关测试；不新增 CLI 导入替代物。
12. 更新安全审计 gate，使后续 CI/本地验证能明确覆盖全依赖安全风险和运行镜像高危风险。

用户已确认：项目尚未正式使用，当前阶段优先把依赖安全审计清零。若某条依赖链无法在当前 major 内修复，允许进行 breaking major upgrade；这属于技术底座升级，不改变产品业务架构。每个 major upgrade 都必须绑定对应 build/test/runtime smoke 验证，不能只修改 `package-lock.json`。

---

## 非目标

- 不重新设计移动端 App、小程序或 uni-app H5。
- 不保留 `mobile/` 作为 workspace、构建目标或生产交付物。
- 不删除当前 `client/` Web/H5 主系统页面。
- 不为了 audit 清零恢复已经剔除的业务模块。
- 不为保留旧工具链而豁免 devDependencies 漏洞；本轮严格目标是根目录 `npm audit` 全量通过。
- 不把 Docker 镜像扫描误写成 npm audit 的替代品；它是单独部署基线 gate。
- 不保留未使用的观测栈作为“以后可能用”的部署负担；Prometheus / Grafana / Alertmanager / Loki / Promtail 本轮剔除。
- 不保留应用内备份管理页面或 `docker exec` 备份 API；数据库和对象存储备份由部署运维基线负责。
- 不删除 MinIO 文件存储、`StorageService`、文件上传、文件预览、文控附件、供应商文件、培训归档、来料检验报告或产品报告能力。
- 不保留依赖健康详情、磁盘信息或系统信息这类应用内健康管理 API；只保留部署平台可用的最小存活探针。
- 不删除文控“引用健康状态”、访客健康状态、用药健康影响、员工健康检查等业务语义。
- 不保留跨业务对象的通用回收站入口；不因此删除各业务对象自己的 `deletedAt`、归档、作废或撤销语义。
- 不保留跨业务对象的通用批量导出中心；不因此删除统计、审计日志、追溯、记录 PDF、批次 PDF、培训统计等业务场景内导出。
- 不保留应用内批量导入页面、导入 API 或导入模板/预览能力；本轮也不新增 CLI 导入替代命令。未来需要批量灌入数据时，按一次性运维任务处理，不进入长期产品面。
- 不用 `npm audit fix --force` 盲目改全仓依赖。每个 breaking upgrade 都必须有对应验证。
- 不把 audit risk register 当成长期豁免清单；它只用于记录上游暂时无稳定修复的 low / moderate 风险和复核责任。

---

## 当前 H5 / Web 页面边界

当前项目的浏览器端主系统是 `client` workspace：

- 页面：`client/src/views/**`
- 路由：`client/src/router/index.ts`
- 菜单：`client/src/navigation/menu.ts`
- API adapter：`client/src/api/**`
- 构建命令：`npm run build:client`

当前 `client` 中仍保留的主要模块包括：

- `/dashboard` 工作台
- 体系文件中心、模板管理、记录表单索引
- 统一审批待办与历史
- 记录管理、待填任务、任务配置
- 仓库、批次、追溯、物料平衡、来料检验
- 设备、现场记录、CCP、偏差、不合格、CAPA、投诉、召回、变更
- 产品、配方、研发流程、工序
- 培训、系统审计日志、统计、系统治理

这些属于当前 Web/H5 主系统，不属于 `mobile/` 剔除范围。实施时必须通过以下检查证明没有误删：

```bash
npm run build:client
npm run test -w client
rg -n "@/api/mobile|api/mobile|/mobile\\b|mobileApi|MobileUpload|mobileUpload|mobile/sync" client/src packages/types
```

`client/src/assets/styles/mobile.css`、`OfficePreview.vue` / `FilePreviewDialog.vue` 中的 `isMobile` 和 `mobile-hint` 是当前 Web/H5 主系统的响应式显示逻辑，不属于 `mobile/` workspace 或后端 `/mobile` API。实施不得因为文件名或 CSS class 含有 `mobile` 而删除这些 Web 响应式代码。

---

## Mobile 剔除设计

### 判定

`mobile/` 是独立 uni-app workspace，包含：

- `mobile/package.json`
- `mobile/src/pages/**`
- `@dcloudio/uni-*` 多端构建依赖
- uni-app H5/App/小程序脚本

它不是当前主 Web/H5 系统。用户确认该能力没有设计和使用，可以直接剔除。

### 删除范围

实施时必须删除：

- `mobile/` 目录。
- 根 `package.json` workspaces 中的 `"mobile"`。
- `package-lock.json` 中的 `mobile` workspace 和 `@dcloudio/uni-*` 依赖链。
- `client/Dockerfile`、`server/Dockerfile` 中所有 `COPY mobile/package.json` 安装引用；当前事实是 `client/Dockerfile` 1 处、`server/Dockerfile` 2 处。
- README、`docs/AGENT_GUIDE.md`、其它活文档中把 `mobile` 列为当前 workspace / 项目结构的描述。

### 后端 mobile 能力

当前后端也有 mobile 上传/同步 API：

- `server/src/modules/mobile/**`
- `MobileModule` 在 `server/src/app.module.ts` 中注册。
- Prisma schema 中存在 `MobileUpload` / `mobile_uploads` 和 `SyncSubmission` / `sync_submissions`。

代码核验结果：当前 `client` 没有调用 `/mobile` 或 `/mobile/sync`，也没有引用 `MobileUpload` / `SyncSubmission` 类型；`MobileModule` 只被 `server/src/app.module.ts` 注册。因此后端 mobile API 与当前 Web/H5 主系统无关。

实施前必须重新枚举 schema 和引用全集，不能假设 mobile schema 永远只有两张表。扫描必须限定 mobile workspace / mobile API / mobile-only schema 语义，不使用裸 `Mobile|Sync` 这类会命中 `Asynchronous`、同步队列或响应式 UI 的宽正则：

```bash
rg -n "MobileModule|MobileUpload|SyncSubmission|mobile_uploads|sync_submissions|@Controller\\('mobile|mobile/sync|class Mobile|class Sync|interface Mobile|interface Sync|enum Mobile|enum Sync|model Mobile|model Sync" server/src/prisma/schema.prisma server/src packages/types client/src --glob '!**/node_modules/**'
```

本次代码事实下 schema 命中为 `MobileUpload` 和 `SyncSubmission`；如果执行时出现新增 enum、relation 或字段，必须一并纳入删除计划或停下回报。

既然 mobile 交付面整体剔除，后端 mobile API 也必须一并删除：

- 删除 `server/src/modules/mobile/**`。
- 从 `server/src/app.module.ts` 移除 `MobileModule`。
- 从 Prisma schema 删除 `MobileUpload`、`SyncSubmission` 模型及相关 enum/relation。
- 生成 Prisma migration，包含 DROP TABLE / DROP INDEX 等 schema 变更。
- 删除 mobile controller/service/sync 相关测试。

当前项目没有历史业务数据，不需要迁移历史 mobile upload 或 sync submission 数据；但 schema 变更仍必须通过 Prisma migration 表达。

Schema 删除的执行顺序必须是：

1. 先删或迁移 `seed.ts` / `seed-dev.ts` / `seed-e2e.ts` 中对下线 model 的引用。
2. 再改 `server/src/prisma/schema.prisma` 删除 model / enum / relation。
3. 运行 `prisma generate`，确认 Prisma Client 不再暴露已删除 delegate。
4. 最后生成 migration，表达 DROP TABLE / DROP INDEX / DROP TYPE。

---

## Excel / xlsx 剔除设计

### 当前问题

`client/package.json` 直接依赖 `xlsx@0.18.5`。该包 high 漏洞无官方修复。历史直接用法包含：

- `client/src/views/admin/ImportPage.vue`：前端生成导入模板、前端读取上传 Excel 并预览。
- `client/src/views/training/statistics/StatisticsPage.vue`：前端生成培训统计 Excel。

用户已确认：应用内批量导入不是当前产品功能，不做“后端模板/预览替换”，也不新增 CLI 导入替代命令。因此旧 `ImportModule`、`ImportPage`、`client/src/api/import.ts` 和 `/import/*` API 直接删除，不能把 `ImportService.getUserTemplate()` 这类占位接口当成事实源继续补。

### 决策

本轮目标是“前端不再依赖 `xlsx`”，不是保留导入中心后重建一套 Excel 导入服务。

新的边界：

- 应用内批量导入中心删除，不保留模板下载、上传预览、确认导入、导入历史或 CLI 替代。
- 培训统计导出归属 `training` 模块，迁到后端 `exceljs` 生成，前端只下载 blob。
- 其他业务导出如果需要 Excel，必须归属具体业务模块，不回到通用导入/导出中心。
- 前端不得再本地解析 Excel，也不得用 `xlsx` 生成 Excel。

培训统计导出字段必须覆盖当前 `StatisticsPage.vue` 组装字段：

- `项目标题`
- `部门`
- `季度`
- `状态`
- `学员数`
- `讲师`
- `计划日期`
- `创建时间`

状态中文映射必须按 Prisma `TrainingProjectStatus` 枚举穷尽处理：`planned` 为 `计划中`，`ongoing` 为 `进行中`，`completed` 为 `已完成`，`cancelled` 为 `已取消`。当前前端 `StatisticsPage.vue` 的 fallback 能把未知状态显示成 `已取消`，但后端替换时不得保留这种隐式 fallback；如果导出时发现非枚举状态，后端必须抛出 `BadRequestException`，错误信息包含违规培训项目 id 和原始 status，例如 `training status out of contract` + `{ projectIds, statuses }`，前端展示错误并停止下载文件，不能静默留空、写“未知”或计入已取消。

验收要求：

```bash
rg -n "ImportPage|client/src/api/import|@Controller\\('import|ImportModule|ImportService|/admin/import|/import/(users|documents)|批量导入|importUsers|importDocuments" client/src server/src packages/types README.md docs/AGENT_GUIDE.md
rg -n "from ['\"]xlsx|import\\s+.*XLSX|require\\(['\"]xlsx|XLSX\\." client/src client/package.json
npm ls xlsx
```

期望：应用内批量导入中心无当前产品面残留；前端没有 `xlsx` 包导入，没有 `XLSX.*` 调用，`npm ls xlsx` 不再显示该依赖。`.xlsx` 文件名、accept 文案和后端 `exceljs` 方法名可以保留。

---

## 记录填写结果批量导出设计

通用导出中心删除后，填写后的动态记录仍然需要业务归属明确的批量导出。该能力归属 `record` 模块，不归属通用 `ExportModule`。

### 事实源与入口

- 事实源：`Record + RecordTemplate`。
- 后端入口：新增 `POST /records/export`。
- 前端入口：记录列表或记录管理页中的业务内“导出记录”操作。
- 旧入口：删除 `/export/task-records`，不保留别名。

### 产品决策

- 导出范围是“当前导出筛选条件命中的所有记录”，不是当前分页可见行。
- 前端不能只用一个状态筛选按钮直接导出全库。导出前必须让用户确认或补充筛选条件，至少覆盖 `templateId`、`status`、日期范围、填写人、关键字，或支持勾选 `recordIds` 后导出选中记录。
- 同步导出上限固定由后端控制，默认 10000 条。前端不得硬编码同一个上限作为事实源；前端只展示后端 `BadRequestException` 返回的业务错误并提示用户缩小筛选。
- 默认状态范围排除 `draft`，只导出 `submitted`、`signed`、`approved`、`rejected`。如果用户明确筛选 `draft`，允许导出草稿用于内部检查。
- 单模板导出返回 `.xlsx`；跨模板导出返回 `.zip`，zip 内按模板分一个 workbook。zip 只包含 Excel workbook，不打包源附件。
- 本轮默认导出模板中的全部字段，不上字段选择 UI。
- `file` / `image` / `photo` 字段导出为文件名和 URL；`signature` 导出为已签名/未签名，不写入 base64；`richtext` 去 HTML 后导出纯文本。
- “填写人”列优先使用用户展示名；展示名为空时允许 fallback 到用户名，但该口径必须在测试中固定。

### 审计与验收

`POST /records/export` 属于高敏批量数据导出，必须接入系统审计的敏感操作日志。若当前项目使用 `SensitiveLog` / `SensitiveLogInterceptor` 模式，则 route 必须标记为 `export_data` / `record`，并在测试或手工验证中证明导出成功与导出失败路径会留下可审计事件；若现有审计拦截器未全局启用，implementation 必须按当前 audit 模块模式补上，而不是静默跳过。

验收要求：

```bash
rg -n "records/export|RecordExportService|export_data.*record|SensitiveLog\\('export_data',\\s*'record'\\)" server/src client/src
rg -n "/export/task-records|task-records.*export|ExportModule|@Controller\\('export" server/src client/src packages/types
```

期望：记录批量导出只通过 `record` 模块暴露；旧通用导出入口没有当前产品面残留；敏感导出有审计日志覆盖。

---

## Server / MCP / 工具链依赖链设计

### Server

需要处理的 server 运行时依赖链包括：

- `@nestjs/core` / `@nestjs/platform-express` / `@nestjs/swagger`
- `express` / `body-parser` / `cookie` / `qs` / `path-to-regexp` / `serve-static`
- `multer`
- `bcrypt` / `@mapbox/node-pre-gyp` / `tar`
- `file-type`

实施原则：

1. 先尝试当前 major 范围内的安全 patch / minor。
2. patch/minor 不足时，可以使用 npm `overrides` 锁定 transitive 安全版本。
3. 若 audit 清零必须跨 major，允许升级；但 implementation plan 必须列出兼容点和验证命令。
4. bcrypt 可升级到 `6.x`，但必须验证密码 hash/compare 相关测试和登录流程。
5. Nest 10 到 11 是 breaking 范围；若为 audit 清零采用 Nest 11，需要同步升级 Nest 核心包、platform、testing、swagger、schematics，并验证启动、Swagger、upload、ValidationPipe、interceptor、单元测试和关键 API smoke。

### MCP

`tools/noidear-mcp` 通过 `@modelcontextprotocol/sdk` 引入 Express 相关链。实施时必须确认它在 `npm audit` 中是否仍产生漏洞，必要时升级 SDK 或使用 overrides。

验证命令：

```bash
npm run build:mcp
```

### 工具链 devDependencies

`devDependencies` 不再作为安全审计豁免区。需要处理的工具链包括但不限于：

- Nest CLI / schematics / testing 相关包。
- TypeScript ESLint 相关包。
- Vite / Vitest / Vue 测试构建链。
- Jest / ts-jest / supertest 等后端测试链。
- `glob`、`minimatch`、`tar`、`tmp`、`cross-spawn` 等 transitive 工具包。

实施原则：

1. 能用当前 major 的 patch/minor 修复时，不做无谓 major。
2. 若 audit 只能通过 major upgrade 解决，允许升级，但必须把 breaking change 纳入同阶段验证，不得只改 lockfile。
3. 测试工具链升级后必须跑对应测试命令，不能只跑 build。
4. 若某个包无修复版本且仅服务已剔除能力，优先删除该能力或依赖，而不是 suppress audit。

Vite / Vitest / ESLint / Jest 等升级属于工程底座变化。它们不应改变业务页面和 API 合同，但可能改变构建、mock、coverage、lint 规则或 dev server 行为；因此必须通过 `build:client`、client tests、server tests 和 system map 验证兜住。

此前监控业务 UI / API 已剔除；代码核验显示 `@willsoto/nestjs-prometheus` / `prom-client` 在当前 `server/src` 中没有实际 import，但 `server/package.json` 仍声明依赖。删除前必须再扫运行时残留：

```bash
rg -n "@willsoto/nestjs-prometheus|prom-client|metrics|Prometheus|PROMETHEUS|METRICS" server/src server/package.json docker-compose.yml client server --glob '!**/coverage/**' --glob '!**/dist/**' --glob '!**/node_modules/**'
```

若只剩 package 依赖和已删除模块的测试/coverage 残留，应删除 `@willsoto/nestjs-prometheus` / `prom-client`。如果仍存在 `/metrics` endpoint、AppModule 注册、compose 端口、ENV 或运行时注入，必须先拆掉这些观测栈残留，再删依赖。注意不要把食品安全业务里的 `monitoring_method`、过程监控、环境监控、模型落地模板中的 monitoring 文案当作部署观测栈删除。

---

## Docker 镜像安全基线设计

Docker 镜像扫描与 `npm audit` 是两套不同 gate：

- `npm audit` 扫 npm package graph。
- Docker 镜像扫描扫最终镜像层，包括基础镜像、Linux 系统包、Node / Nginx runtime、系统库和复制进镜像的应用依赖。

本轮纳入 Docker，但口径分层：

1. **自建镜像**：`server`、`client` 构建镜像必须 high / critical 清零。
2. **保留的第三方镜像**：`postgres`、`redis`、`minio` 不得使用 `latest` 或 rolling tag；必须固定到 immutable digest，并用扫描结果证明当前风险。
3. **不可修复项**：若第三方官方镜像在固定版本下仍有不可修复 high / critical，implementation 必须停下回报，选择升级 tag、换镜像或调整 gate；不得静默豁免。

继续瘦身决策：

- 删除 `docker-compose.yml` 中 Prometheus、Grafana、Alertmanager、Loki、Promtail 服务。
- 删除对应 volumes、networks 依赖和 `monitoring/` 配置目录。
- 更新 README、`docs/AGENT_GUIDE.md` 等文档，不再把 monitoring 列为当前项目结构、运行服务或启动命令。
- 保留 PostgreSQL、Redis、MinIO 作为当前后端运行基础服务；它们也必须固定到 immutable digest 并参与 Docker 扫描。

实施要求：

- 删除 `client/Dockerfile`、`server/Dockerfile` 中对 `mobile/package.json` 的复制。
- `docker-compose.yml` 中所有保留第三方镜像必须使用 immutable digest 引用，例如 `postgres@sha256:<digest>`、`redis@sha256:<digest>`、`minio/minio@sha256:<digest>`；`postgres:15-alpine`、`redis:7-alpine` 这类 floating alpine tag 只能作为候选发现入口，不能作为最终 compose 引用。
- 第三方镜像候选选择方法统一适用于 PostgreSQL、Redis、MinIO：从官方镜像最近 60 天内的稳定 tag 选候选，用 Trivy 扫描 high / critical 通过后，解析出对应 manifest digest，并把 digest ref 写回 `docker-compose.yml` 和扫描脚本。若最近 60 天内没有稳定 tag 通过扫描，必须停下回报并选择更换 tag 策略、换镜像来源或调整部署基线，不得回退到 `latest` 或 rolling tag。
- 删除 compose 中观测栈后，`docker compose up -d postgres redis minio server client` 应仍能启动主系统。
- Docker 扫描工具固定为 Trivy，不在 implementation plan 中再二选一。
- 新增脚本，例如：

```json
{
  "security:docker": "bash tools/check-docker-images.sh"
}
```

脚本至少应覆盖：

```bash
docker compose build server client
docker image tag "$(docker compose images -q server)" noidear-server:audit-local
docker image tag "$(docker compose images -q client)" noidear-client:audit-local
trivy image --severity HIGH,CRITICAL --exit-code 1 noidear-server:audit-local
trivy image --severity HIGH,CRITICAL --exit-code 1 noidear-client:audit-local
trivy image --severity HIGH,CRITICAL --exit-code 1 "${POSTGRES_IMAGE_REF}"
trivy image --severity HIGH,CRITICAL --exit-code 1 "${REDIS_IMAGE_REF}"
trivy image --severity HIGH,CRITICAL --exit-code 1 "${MINIO_IMAGE_REF}"
```

自建镜像在本地扫描时可以使用 `noidear-server:audit-local` / `noidear-client:audit-local` 这种短 tag；禁止 `latest` 的规则针对 compose 中保留的第三方镜像引用，以及交付文档中的部署镜像引用。若脚本实际使用 compose 默认生成的本地 tag，必须在脚本里显式解释该 tag 只用于本地扫描。

`tools/check-docker-images.sh` 的行为必须固定：

- 默认自己执行 `docker compose build server client`；允许通过 `SKIP_DOCKER_BUILD=1` 跳过构建，但 CI 不得使用该跳过模式。
- 若本地没有 `trivy`，退出码为 2，并输出安装提示；不得静默跳过 Docker gate。
- 扫描所有目标后汇总失败项再退出 1；不要 fail-fast，否则 review 看不到完整镜像风险。
- 第三方镜像清单必须从 `docker-compose.yml` 的 digest ref 同步；若 compose digest 变更，脚本也必须同 PR 更新。
- 脚本中 `POSTGRES_IMAGE_REF`、`REDIS_IMAGE_REF`、`MINIO_IMAGE_REF` 必须是 implementation 已选定并写回 `docker-compose.yml` 的实际 immutable digest ref；不得保留空值、`latest`、rolling tag 或 `<placeholder>`。

---

## 应用内备份管理剔除设计

当前代码存在应用内备份管理：

- 前端：`client/src/views/backup/BackupManage.vue`、`client/src/api/backup.ts`、路由 `/backup/manage`、菜单“备份管理”。
- 后端：`server/src/modules/backup/**`、`BackupModule` 在 `AppModule` 中注册。
- 数据模型：Prisma `BackupHistory` / `backup_history`。
- Seed：`server/src/prisma/seed-dev.ts` 中有备份历史假数据。

当前实现直接在业务服务里执行容器命令：

```text
docker exec noidear-postgres-1 ...
docker exec noidear-minio-1 ...
```

这与当前 `docker-compose.yml` 中的 `container_name: noidear-postgres` / `noidear-minio` 不一致，也把部署运维动作放进了业务 API。用户确认继续瘦身：应用内备份管理本轮删除。

执行顺序必须先删 seed，再删 schema：

1. 先删除 `seed-dev.ts` / `seed.ts` / `seed-e2e.ts` 中 `backupHistory` 相关写入。
2. 再删除 `BackupHistory` Prisma model。
3. 运行 Prisma generate。
4. 生成 migration。

删除范围：

- 删除 `client/src/views/backup/BackupManage.vue`。
- 删除 `client/src/api/backup.ts`。
- 删除路由和菜单中的 `/backup/manage`。
- 删除 `server/src/modules/backup/**`。
- 从 `server/src/app.module.ts` 移除 `BackupModule`。
- 从 Prisma schema 删除 `BackupHistory` 模型，生成 migration。
- 删除 seed 中的 backup history 假数据。
- README / `docs/AGENT_GUIDE.md` 不再把备份管理列为当前功能。

保留范围：

- 保留 MinIO 作为业务文件存储服务。
- 保留 `StorageService`。
- 保留文控文件、文件预览、设备照片/签名、供应商文件、来料检验报告、产品报告、培训归档、审计日志归档等业务文件能力。

数据库和对象存储备份转为部署运维基线，不由 Web/H5 主系统页面触发。后续如需要备份治理，应在部署脚本、基础设施配置或独立运维 runbook 中设计，不在业务应用内通过 `docker exec` 实现。

---

## 应用内健康管理剔除设计

当前代码存在后端健康管理能力：

- `server/src/modules/health/health.controller.ts`：鉴权后的 `/health`、`/health/postgres`、`/health/redis`、`/health/minio`、`/health/disk`、`/health/dependencies`、`/health/system-info`。
- `server/src/modules/health/health.service.ts`：检查 PostgreSQL、Redis、MinIO、磁盘和系统信息。
- `server/src/modules/health/liveness.controller.ts`：无鉴权 `/liveness`，供 Docker / 部署平台探活。
- 当前前端没有健康管理页面，也没有 `client/src/api/health.ts` 当前调用。

用户确认继续瘦身：依赖健康详情、磁盘信息和系统信息属于运维面，不作为业务系统功能保留。本轮删除应用内健康管理 API，只保留最小运行存活探针。

删除范围：

- 删除 `HealthController`。
- 删除 `HealthService`。
- 调整 `HealthModule`，只注册 `LivenessController`；或将 `LivenessController` 移到独立最小模块后删除原 `health` service/controller。
- 删除与 `HealthService` 相关测试和 Swagger 描述。
- README / `docs/AGENT_GUIDE.md` 不再把健康检查或健康管理列为业务功能。

保留范围：

- 保留无鉴权 `/liveness`。
- 可在 `server` Dockerfile / compose 中使用 `/liveness` 做 server healthcheck。
- 保留文控引用健康、记录表单落地健康、访客健康状态、用药健康影响、员工健康检查等业务字段和业务页面。

残留扫描命中 `health` 时必须人工分辨：`DocumentReferenceHealthService`、`ReferenceHealthStatus`、`health_status`、`health_impact` 等属于业务语义，不是本轮删除目标。

---

## 通用回收站剔除设计

当前代码存在跨业务对象通用回收站：

- 前端：`client/src/views/RecycleBin.vue`、`client/src/views/recycle-bin/__tests__/RecycleBin.spec.ts`、`client/src/api/recycle-bin.ts`、路由 `/recycle-bin`、菜单“回收站”。
- 后端：`server/src/modules/recycle-bin/**`、`RecycleBinModule` 在 `AppModule` 中注册。
- Seed：`server/src/prisma/seed-dev.ts` 中有回收站假数据。
- Cron：`RecycleBinCron` 每天清理超过 30 天的已删除 document、record-template、record。

用户确认继续瘦身：通用回收站本轮删除。业务对象的退出、归档、作废、撤销、软删除和恢复规则应留在各自业务模块中，不再由一个跨域入口统一恢复。

执行顺序必须先删 seed，再删 schema 或 service：

1. 先删除 seed 中的回收站假数据和对通用回收站 service 的测试依赖。
2. 再删除 RecycleBin controller/service/cron/module。
3. 若 schema 中存在只服务通用回收站的 model / enum / relation，最后再删 schema 并生成 migration。
4. 不得为了删除通用回收站而删除业务对象自己的 `deletedAt` 字段。

删除范围：

- 删除 `client/src/views/RecycleBin.vue`。
- 删除 `client/src/views/recycle-bin/**`。
- 删除 `client/src/api/recycle-bin.ts`。
- 删除路由和菜单中的 `/recycle-bin`。
- 删除 `server/src/modules/recycle-bin/**`。
- 从 `server/src/app.module.ts` 移除 `RecycleBinModule`。
- 删除 seed 中的回收站假数据。
- README / `docs/AGENT_GUIDE.md` 不再把回收站列为当前功能。

保留范围：

- 不删除业务表已有 `deletedAt` 字段。
- 不删除文控文件归档、作废、修订生命周期。
- 不删除产品/配方归档、记录模板停用、记录撤销或其它业务对象自己的退出状态。
- 不删除审计日志、操作日志或业务对象自身的删除记录。

后续若某个业务对象确实需要恢复能力，应在该业务模块内按其权限、编号冲突、文件存储和审计规则单独设计，不恢复通用回收站。

---

## 通用批量导出中心剔除设计

当前代码存在横向批量导出中心：

- 前端：`client/src/views/admin/ExportPage.vue`、路由 `/admin/export`、菜单“批量导出”。
- 前端通用适配器：`client/src/api/export.ts` 暴露 `exportTasks`、`exportTaskRecords`、`exportDeviationReports`、`exportUsers`、`exportStatistics`。
- 前端通用组件：`client/src/components/ExportDialog.vue`、`client/src/components/ExportButton.vue` 主要作为通用导出抽象存在。
- 后端：`server/src/modules/export/**` 和 `ExportModule`，集中提供 `/export/documents`、`/export/tasks`、`/export/task-records`、`/export/deviation-reports`、`/export/users`。
- 当前真实页面使用呈现不均衡：`/admin/export` 只使用用户导出；统计页通过通用 adapter 调用统计导出；部分通用导出组件没有当前页面引用。

用户确认继续瘦身：本轮删除通用批量导出中心。导出不再作为后台横向工具中心存在；如果某个业务场景需要导出，必须留在对应业务页面和业务后端模块中。

删除范围：

- 删除 `client/src/views/admin/ExportPage.vue`。
- 删除路由和菜单中的 `/admin/export`。
- 删除未被业务页面引用的 `ExportDialog.vue` / `ExportButton.vue` 及其测试。
- 删除 `client/src/api/export.ts` 中通用 `/export/*` adapter；保留场景内导出时应迁入对应业务 adapter，例如 `statistics.ts`、`audit.ts`、`traceability.ts`、`record.ts`。
- 删除 `server/src/modules/export/**` 和 `ExportModule` 在 `AppModule`、`DocumentModule`、`StatisticsModule`、`DeviationModule` 等处的横向依赖。
- 删除 `/export/documents`、`/export/tasks`、`/export/task-records`、`/export/deviation-reports`、`/export/users` 这类通用入口。

保留范围：

- 保留系统审计日志导出，归属 `audit` 模块。
- 保留普通统计页面导出，归属 `statistics` 模块，不再通过通用 `exportApi` 暴露。
- 保留追溯导出和追溯快照，归属 `traceability` / `batch-trace` 模块。
- 保留记录 PDF、批次追溯 PDF、文控附件、培训统计导出等业务页面内真实使用的导出能力。
- 若偏差、任务、记录任务后续确有可见页面导出需求，应在对应模块重新建立业务内 endpoint；本轮不保留无页面入口的通用导出。
- 当前 `/admin/export` 的唯一真实动作是用户导出。用户已选择 B：本轮随通用批量导出中心一起彻底删除用户导出，不迁到 `/admin/users`，也不新增 `user` 模块导出 endpoint。未来若需要用户导出，再按用户管理业务需求重建。

实施前必须先跑引用扫描，避免误删业务内导出：

```bash
rg -n "ExportPage|ExportDialog|ExportButton|exportApi|/admin/export|/export/" client/src server/src packages/types --glob '!**/node_modules/**'
rg -n "ExportModule|ExportService|@Controller\\('export" server/src --glob '!**/node_modules/**'
```

实施后，`client/src/api/export.ts` 和 `server/src/modules/export/**` 不应继续存在。若仍有业务页面导出，必须能从对应业务 adapter 和后端模块直接读出归属，不能再依赖通用导出中心。

---

## 安全 Gate 设计

新增或更新根脚本：

```json
{
  "security:audit:prod": "npm audit --omit=dev",
  "security:audit:raw": "npm audit",
  "security:audit:register": "node tools/check-audit-register.mjs docs/superpowers/specs/2026-05-14-audit-risk-register.yaml",
  "security:audit:strict": "node tools/check-npm-audit-strict.mjs",
  "security:docker": "bash tools/check-docker-images.sh",
  "verify:full:ci": "npm run verify:full && npm run security:audit:strict && npm run test -w server -- --runInBand && npm run test -w client && python3 tools/generate-system-map.py"
}
```

本地和 CI gate 分层：

- `verify:full` 可以串入 `security:audit:prod`，用于本地开发快速发现生产依赖风险。
- 不提供无后缀 `security:audit` alias；调用方必须显式选择 `security:audit:prod`、`security:audit:raw` 或 `security:audit:strict`，避免本地和 CI 语义混淆。
- 新增 `verify:full:ci`，定义如上；CI/release gate 必须使用该脚本或更严格的等价命令。
- `security:audit:strict` 不能使用 `--omit=dev` 或 `--audit-level`；若出现上游无稳定修复的 low / moderate，必须更新 audit risk register，并在 PR / 回报中明确说明 full cleanup 仍被上游 stable fix 阻塞。
- `security:audit:strict` 必须在自身脚本内执行与 `security:audit:register` 相同的 YAML schema 校验和联表逻辑：YAML 过期、schema 非法、登记 high / critical、strict audit 中出现未登记 low / moderate 都必须失败。
- Docker 镜像扫描作为单独 gate 运行，避免所有本地开发验证都强制构建镜像；最终验收必须显式运行。

最终验收必须显式运行：

```bash
npm run security:audit:strict
npm run security:docker
npm run verify:full
npm run verify:full:ci
npm run test -w server -- --runInBand
npm run test -w client
python3 tools/generate-system-map.py
```

---

## Implementation Plan 边界

这份文件是总设计，不要求一个 implementation plan 或一个 PR 一次落完。本 spec 的两条执行轨道应在 `post-api-cleanup-hardening` 合并到 `master` 后启动；若不得不并行，system map 验证必须以后者合入后的 `master` 为基线，避免两条线同时改残留计数和删除范围。

后续必须拆成两个独立执行轨道；若创建子 spec 或 plan，建议使用下列命名：

1. `2026-05-14-app-feature-strip-design.md` / 对应 implementation plan：`mobile`、Backup、Health、RecycleBin、Import/Export 这些结构同质的产品面和横向工具剔除，并把确认保留的记录批量导出迁回 `record` 模块。
2. `2026-05-14-dependency-and-image-hardening-design.md` / 对应 implementation plan：删除前端 `xlsx` 直接依赖、迁移剩余培训统计 Excel 导出、依赖升级、Docker 镜像安全基线、安全 gate。

若不另建两个 spec 文件，implementation plan 也必须按上述两个轨道拆成两个 PR；不得把产品面剔除、培训统计 Excel 迁移、依赖 major upgrade、Docker gate 混成一个 PR。合并顺序必须是 feature-strip 先合，dependency-and-image-hardening 基于 feature-strip 合并后的 `master` 新建分支；原因是先缩小产品面后再跑 audit，剩余 advisory 才能准确归类。

建议执行顺序：

1. **移动端剔除**：删除 `mobile/`、workspace、Docker 引用、后端 mobile module/schema/test，并生成 Prisma migration。
2. **应用内备份管理剔除**：删除备份页面、API、调度器、BackupHistory schema/seed，并保留 MinIO 业务文件存储。
3. **应用内健康管理剔除**：删除 HealthController / HealthService，只保留 `/liveness` 最小探针。
4. **通用回收站剔除**：删除 RecycleBin 页面/API/module/cron/seed，但保留业务对象自身状态字段。
5. **通用导入/导出中心剔除**：删除 `/admin/import`、`/admin/export`、通用导入/导出组件/API/ImportModule/ExportModule，把真实保留的导出迁回业务模块；记录填写结果批量导出归入 `record` 模块。
6. **Excel 依赖剔除**：删除前端 `xlsx`，不重建导入模板/预览；只把剩余培训统计 Excel 导出迁到后端 `exceljs`。
7. **Server/MCP/工具链依赖修复**：在产品面缩小后，用 patch/minor/overrides/必要 major 升级处理所有 audit 残留。
8. **Docker 镜像安全基线**：删除 compose 观测栈，固定保留第三方镜像 tag / digest，补 `security:docker`，自建镜像 high / critical 清零。
9. **安全 gate**：新增 `security:audit:prod`、`security:audit:strict`、`security:docker` 和 CI gate，更新验证文档。
10. **全量验证**：运行 audit、docker scan、build、unit tests、system map、残留扫描。

每个阶段都应单独 commit；两个执行轨道应分别 review，避免把移动端删除、培训统计 Excel 迁移、横向工具剔除和依赖升级混成一个不可 review 的大 diff。

依赖升级阶段不得把“业务架构调整”混入安全清理。允许的改动是 package 版本、lockfile、必要配置、因框架升级触发的兼容性修复、测试适配和安全 gate；若发现需要改变业务流程或页面信息架构，必须停下另开决策。

---

## 验收标准

必须满足：

```bash
npm ci
npm run security:audit:strict
npm run security:docker
npm run verify:full
npm run verify:full:ci
npm run test -w server -- --runInBand
npm run test -w client
python3 tools/generate-system-map.py
```

代码字面残留扫描：

```bash
rg -n "\"mobile\"|noidear-mobile|@dcloudio|uni-app|vite-plugin-uni" package.json package-lock.json client server packages tools README.md docs --glob '!**/node_modules/**'
rg -n "from ['\"]xlsx|import\\s+.*XLSX|require\\(['\"]xlsx|XLSX\\." client/src client/package.json
npm ls xlsx
rg -n "MobileModule|MobileUpload|SyncSubmission|mobile_uploads|sync_submissions|@Controller\\('mobile|mobile/sync|class Mobile|class Sync|interface Mobile|interface Sync|enum Mobile|enum Sync|model Mobile|model Sync" server/src server/src/prisma/schema.prisma packages/types client/src --glob '!**/coverage/**' --glob '!**/dist/**'
rg -n "image: .*:latest|mobile/package.json|prometheus|grafana|alertmanager|loki|promtail|@willsoto/nestjs-prometheus|prom-client" docker-compose.yml client/Dockerfile server/Dockerfile server/package.json README.md docs/AGENT_GUIDE.md monitoring server/src --glob '!**/coverage/**' --glob '!**/dist/**'
rg -n "BackupModule|BackupHistory|backup_history|BackupManage|client/src/api/backup|/backup/manage|@Controller\\('backup|triggerMinIOBackup|triggerPostgresBackup|docker exec noidear-(postgres-1|minio-1|postgres|minio)" server/src client/src README.md docs/AGENT_GUIDE.md
rg -n "HealthController|HealthService|/health/(postgres|redis|minio|disk|dependencies|system-info)|client/src/api/health|健康管理" server/src client/src README.md docs/AGENT_GUIDE.md
rg -n "RecycleBinModule|RecycleBin|recycle-bin|/recycle-bin|回收站|RecycleBinCron" server/src client/src README.md docs/AGENT_GUIDE.md
rg -n "ImportPage|client/src/api/import|/admin/import|@Controller\\('import|ImportModule|ImportService|/import/(users|documents)|批量导入|importUsers|importDocuments" server/src client/src packages/types README.md docs/AGENT_GUIDE.md
rg -n "ExportPage|ExportDialog|ExportButton|client/src/api/export|/admin/export|@Controller\\('export|ExportModule|ExportService|/export/(documents|tasks|task-records|deviation-reports|users)|批量导出" server/src client/src packages/types README.md docs/AGENT_GUIDE.md
```

文档同义词扫描用于人工评估，不要求所有命中为 0；命中时必须判断是否是历史说明、业务语义还是应删除的当前功能描述：

```bash
rg -n "观测栈|监控部署|Loki 日志栈|备份历史|PostgreSQL 备份|MinIO 备份|健康检查|统一恢复入口|软删除回收站|批量导出|通用导出" README.md docs CONTEXT.md --glob '!docs/superpowers/specs/**'
```

期望：

- 根目录严格 `npm audit` 默认无任何漏洞。若 low / moderate 因上游无稳定修复暂不能清零，必须在 audit risk register 中登记，且 implementation 不能声称 full cleanup 已完成。
- `server` / `client` 自建镜像无 high / critical 漏洞。
- `docker-compose.yml` 只保留 PostgreSQL、Redis、MinIO、server、client；第三方镜像不使用 `latest`。
- `monitoring/` 配置目录被删除，README / agent guide 不再列出观测栈。
- 应用内备份管理被删除；`BackupHistory` schema 和 seed 假数据被 migration / seed 清理覆盖。
- MinIO 业务文件存储能力仍可用。
- 应用内健康管理 API 被删除；`/liveness` 最小存活探针仍可用。
- 通用回收站被删除；业务对象自身 `deletedAt`、归档、作废、撤销等状态保留。
- 应用内批量导入中心被删除；不保留导入页面、导入 API、导入模板/预览或 CLI 导入替代命令。
- 通用批量导出中心被删除；统计、审计、追溯、PDF、记录批量导出等业务内导出仍可用且归属清晰。
- `mobile/` 不再作为 workspace 或交付面存在。
- 当前 `client` Web/H5 页面仍能 build/test。
- 系统地图 `api_adapter_missing`、`direct_client_missing`、`deleted_scope_*_residue` 仍为 0。
- Prisma migration 明确表达 mobile schema 删除。

---

## 风险与处理

1. **误删当前 Web/H5 页面**
   `mobile/` 和 `client/` 是两个工程。实施必须只删除 `mobile/`，不能删除 `client/src/views` 或 `client/src/router/index.ts` 中的当前业务页面。

2. **后端 mobile schema 删除漏 migration**
   删除 `MobileUpload` / `SyncSubmission` 或任何执行期枚举出的 mobile-only schema 必须生成 migration，不允许只改 Prisma schema。执行前必须跑限定版 mobile 残留扫描列全集，不得使用裸 `Mobile|Sync` 宽正则。

3. **Nest / Vite / Vitest 等 major upgrade 破坏运行时**
   优先 patch/minor/overrides；若必须 major，implementation plan 必须单独列出 controller、interceptor、Swagger、upload、ValidationPipe、client build、unit tests、E2E 可用性验证。

4. **旧导入预览被误当成保留体验**
   应用内批量导入中心已决议删除，旧 Excel 预览也随之删除。本轮不得为了“保留体验”重建后端 preview endpoint；未来若重新需要批量导入，必须作为新需求单独设计。

5. **lockfile 残留 mobile 依赖**
   删除 workspace 后必须重新 `npm install` / `npm ci` 生成干净 lockfile，并用残留扫描确认 `@dcloudio/uni-*` 不再存在。

6. **dev 工具链 major upgrade 带来测试行为变化**
   devDependencies 已纳入清零 gate。若升级测试工具链导致 snapshot、mock、transform 或 Node 版本行为变化，必须修测试或代码事实，不能用 audit 豁免绕过。

7. **第三方 Docker 镜像无法 high / critical 清零**
   第三方镜像不由本项目构建，清零依赖官方 tag 状态。若固定版本仍有不可修复 high / critical，implementation 必须回报并选择换 tag、换镜像或调整部署基线；不得保留 `latest` 或跳过扫描。

8. **误删业务监控字段**
   本轮删除的是部署观测栈和此前已剔除的监控 UI / API，不是食品安全业务里的过程监控、环境监控或 `monitoring_method` 字段。实施残留扫描命中这些业务词时必须人工分辨，不得批量删除。

9. **误删业务文件存储能力**
   删除应用内备份管理不等于删除 MinIO。`StorageService`、上传、预览、附件、归档和报告文件仍是业务能力；implementation 只能删除 backup module 与 `BackupHistory`，不能删除文件存储调用链。

10. **误删业务健康语义**
    删除应用内健康管理不等于删除业务里的健康概念。文控引用健康、记录表单落地健康、访客健康状态、用药健康影响和员工健康检查都属于业务语义，不能被健康管理残留扫描误删。

11. **误删业务对象状态字段**
    删除通用回收站不等于删除 `deletedAt` 或归档/作废/撤销状态。实施不得批量移除业务表的软删除字段；只删除回收站入口、service、controller、cron、API adapter 和相关测试/seed。

12. **误删业务内导出**
    删除通用批量导出中心不等于删除所有导出。实施必须先区分后台横向 `/export/*` 工具入口和业务页面内导出；统计、系统审计日志、追溯、记录 PDF、批次 PDF、培训统计等有明确业务场景的导出应迁回对应模块或保留在对应模块。

13. **audit gate 被生态短期 advisory 卡死**
    清零是目标，但 agent 不应在上游无稳定修复时无限升级或盲目 `--force`。high / critical 必须清零；若确无修复，必须停下回报，等待用户在换依赖、删能力或签字接受短期风险之间决策；该短期风险不进入 risk register，也不能让 strict gate 通过。low / moderate 若无稳定修复，必须记录 audit risk register；同一 advisory 连续顺延超过 4 次后，必须改为替换依赖或删除能力。

14. **先删 schema 后删 seed 导致 Prisma Client 编译失败**
    删除 Backup / Mobile / RecycleBin 相关 model 前，必须先删 seed 和测试里对对应 delegate 的引用，再改 schema、generate、migrate。不得先 DROP model 再让 seed 编译失败。
