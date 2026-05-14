# Full Production Audit Cleanup — Design Spec

**Date:** 2026-05-14
**Scope:** 根项目生产依赖安全审计清零、未设计 mobile/uni-app 交付面剔除、Web/H5 主系统保留、Excel 解析风险替换、Server/MCP 依赖链收口
**Premise:** 当前项目没有历史业务数据；用户确认 `mobile/` 并非已设计或已启用的交付范围，可以直接剔除。当前 H5/浏览器主系统是 `client/`，必须保留。

---

## 背景

在 `targeted-rework-1` 最新代码上运行：

```bash
npm audit --audit-level=high --omit=dev
```

当前失败结果为：

```text
61 vulnerabilities (4 low, 41 moderate, 16 high)
```

这些漏洞不是单一业务缺口，而是三条依赖链混在一起：

1. `client` 直接依赖 `xlsx@0.18.5`，该包存在 high 漏洞且 audit 显示无可用修复。
2. `mobile` workspace 拉入整套 `@dcloudio/uni-*` 多端构建链，带出 `@intlify`、`jimp`、`postcss`、`esbuild` 等大量 transitive 漏洞。
3. `server` 和 `tools/noidear-mcp` 依赖链中存在 Nest / Express / Multer / bcrypt / tar 等可升级或可 override 的风险。

用户已确认：`mobile/` 不是当前已设计移动端能力，可以直接剔除；但需要确认当前 H5 页面模块仍在。经检查，当前主系统页面都在 `client/src/views`，路由由 `client/src/router/index.ts` 管理，菜单由 `client/src/navigation/menu.ts` 管理。`mobile/` 是独立 uni-app 草稿工程，不是当前 Web/H5 主系统。

---

## 目标

1. 根目录 `npm audit --audit-level=high --omit=dev` 必须通过，不能再有 high 级生产依赖漏洞。
2. 直接剔除未设计的 `mobile/` uni-app workspace，包括 npm workspace、lockfile、Docker install 引用、文档说明和后端 mobile API/schema。
3. 保留当前 Web/H5 主系统 `client/`，不得删除 `client/src/views`、路由、菜单或当前浏览器端业务模块。
4. 删除 `client` 对 `xlsx` 的直接依赖，避免浏览器端解析不可信 Excel。
5. 修复或升级 `server` 与 `tools/noidear-mcp` 的生产依赖链，优先使用最小可验证升级；必要时使用 npm `overrides`。
6. 更新安全审计 gate，使后续 CI/本地验证能明确覆盖生产依赖安全风险。

---

## 非目标

- 不重新设计移动端 App、小程序或 uni-app H5。
- 不保留 `mobile/` 作为 workspace、构建目标或生产交付物。
- 不删除当前 `client/` Web/H5 主系统页面。
- 不为了 audit 清零恢复已经剔除的业务模块。
- 不把 devDependencies 漏洞强行混入生产阻塞项；dev audit 可以单独报告，但本轮验收目标是 `--omit=dev` 生产依赖。
- 不用 `npm audit fix --force` 盲目改全仓依赖。每个 breaking upgrade 都必须有对应验证。

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
rg -n "from ['\"]@/api/|request\\." client/src
```

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
- `client/Dockerfile`、`server/Dockerfile` 中 `COPY mobile/package.json` 之类的安装引用。
- README、`docs/AGENT_GUIDE.md`、其它活文档中把 `mobile` 列为当前 workspace / 项目结构的描述。

### 后端 mobile 能力

当前后端也有 mobile 上传/同步 API：

- `server/src/modules/mobile/**`
- `MobileModule` 在 `server/src/app.module.ts` 中注册。
- Prisma schema 中存在 `MobileUpload` / `mobile_uploads`。

既然 mobile 交付面整体剔除，后端 mobile API 也必须一并删除：

- 删除 `server/src/modules/mobile/**`。
- 从 `server/src/app.module.ts` 移除 `MobileModule`。
- 从 Prisma schema 删除 `MobileUpload` 模型及相关 enum/relation。
- 生成 Prisma migration，包含 DROP TABLE / DROP INDEX 等 schema 变更。
- 删除 mobile controller/service 相关测试。

当前项目没有历史业务数据，不需要迁移历史 mobile upload 数据；但 schema 变更仍必须通过 Prisma migration 表达。

---

## Excel / xlsx 替换设计

### 当前问题

`client/package.json` 直接依赖 `xlsx@0.18.5`。该包 high 漏洞无官方修复。当前直接用法在：

- `client/src/views/admin/ImportPage.vue`

该页面使用 `xlsx` 做两件事：

1. 前端生成导入模板。
2. 前端读取上传 Excel 并预览。

### 决策

删除浏览器端 `xlsx`。Excel 解析和模板生成不放在前端做。

新的边界：

- 模板下载走后端已存在的 `import/export` 或 `exceljs` 能力。
- 文件预览走后端 preview endpoint，用 `exceljs` 解析前 10 行返回预览。
- 前端只负责上传文件、展示后端返回的预览和导入结果，不再本地解析 Excel。

选择后端 preview endpoint 是正式决策，不作为可选项延后。当前页面已有“数据预览”步骤，用户体验应保留；后端已有 `ExcelParserService` / `exceljs` 基础能力，复用成本低于保留高危 `xlsx`。

验收要求：

```bash
rg -n "from ['\"]xlsx|import\\s+.*xlsx|require\\(['\"]xlsx|XLSX|xlsx" client/src client/package.json
```

除下载文件名、文案或后端 `exceljs` 方法名外，不得再有前端 `xlsx` 包导入或依赖。

---

## Server / MCP 依赖链设计

### Server

需要处理的生产依赖链包括：

- `@nestjs/core` / `@nestjs/platform-express` / `@nestjs/swagger`
- `express` / `body-parser` / `cookie` / `qs` / `path-to-regexp` / `serve-static`
- `multer`
- `bcrypt` / `@mapbox/node-pre-gyp` / `tar`
- `file-type`

实施原则：

1. 先尝试当前 major 范围内的安全 patch / minor。
2. patch/minor 不足时，使用 npm `overrides` 锁定 transitive 安全版本。
3. 只有无法用 overrides 安全解决时，才做 major upgrade，并必须跑完整 server build/test。
4. bcrypt 可升级到 `6.x`，但必须验证密码 hash/compare 相关测试和登录流程。
5. Nest 10 到 11 是 breaking 范围，除非确实无法通过 Nest 10 patch/override 解决，否则不作为首选。

### MCP

`tools/noidear-mcp` 通过 `@modelcontextprotocol/sdk` 引入 Express 相关链。实施时必须确认它在 `npm audit --omit=dev` 中是否仍产生 high，必要时升级 SDK 或使用 overrides。

验证命令：

```bash
npm run build:mcp
```

---

## 安全 Gate 设计

新增或更新根脚本：

```json
{
  "security:audit:prod": "npm audit --audit-level=high --omit=dev"
}
```

`verify:full` 必须串入该脚本，使生产依赖安全审计成为默认完整验证的一部分。最终验收必须显式运行：

```bash
npm run security:audit:prod
npm run verify:full
npm test -w server -- --runInBand
npm run test -w client
python3 tools/generate-system-map.py
```

如果 devDependencies 仍有漏洞，必须另写风险说明，但不得影响 `security:audit:prod` 通过。

---

## Implementation Plan 边界

后续 implementation plan 建议拆成以下阶段：

1. **移动端剔除**：删除 `mobile/`、workspace、Docker 引用、后端 mobile module/schema/test，并生成 Prisma migration。
2. **Excel 替换**：删除前端 `xlsx`，改为后端 `exceljs` 模板/预览/导入路径。
3. **Server/MCP 依赖修复**：用 patch/minor/overrides/必要 major 升级处理剩余 high。
4. **安全 gate**：新增 `security:audit:prod`，并串入 `verify:full`，更新验证文档。
5. **全量验证**：运行 audit、build、unit tests、system map、残留扫描。

每个阶段都应单独 commit，避免把移动端删除、Excel 行为变化和依赖升级混成一个不可 review 的大 diff。

---

## 验收标准

必须满足：

```bash
npm ci
npm run security:audit:prod
npm run verify:full
npm test -w server -- --runInBand
npm run test -w client
python3 tools/generate-system-map.py
```

残留扫描：

```bash
rg -n "\"mobile\"|noidear-mobile|@dcloudio|uni-app|vite-plugin-uni" package.json package-lock.json client server packages tools README.md docs --glob '!**/node_modules/**'
rg -n "from ['\"]xlsx|import\\s+.*xlsx|require\\(['\"]xlsx|XLSX" client/src client/package.json
rg -n "MobileModule|mobile_uploads|model MobileUpload|@Controller\\('mobile" server/src server/src/prisma/schema.prisma
```

期望：

- 根生产 audit 无 high 漏洞。
- `mobile/` 不再作为 workspace 或交付面存在。
- 当前 `client` Web/H5 页面仍能 build/test。
- 系统地图 `api_adapter_missing`、`direct_client_missing`、`deleted_scope_*_residue` 仍为 0。
- Prisma migration 明确表达 mobile schema 删除。

---

## 风险与处理

1. **误删当前 Web/H5 页面**
   `mobile/` 和 `client/` 是两个工程。实施必须只删除 `mobile/`，不能删除 `client/src/views` 或 `client/src/router/index.ts` 中的当前业务页面。

2. **后端 mobile schema 删除漏 migration**
   删除 `MobileUpload` 模型必须生成 migration，不允许只改 Prisma schema。

3. **Nest major upgrade 破坏运行时**
   优先 patch/minor/overrides；若必须 major，implementation plan 必须单独列出 controller、interceptor、Swagger、upload、ValidationPipe 验证。

4. **Excel 预览行为变化**
   若选择删除前端本地预览，需明确页面步骤变化；推荐后端 preview endpoint 保留用户体验。

5. **lockfile 残留 mobile 依赖**
   删除 workspace 后必须重新 `npm install` / `npm ci` 生成干净 lockfile，并用残留扫描确认 `@dcloudio/uni-*` 不再存在。

6. **dev audit 仍有漏洞**
   本轮 gate 是 production audit。若 dev audit 仍失败，必须记录到后续风险，不得伪装成 production audit 已覆盖。
