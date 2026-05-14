# Post API Cleanup 依赖审计风险登记表

- 日期：2026-05-14
- 触发任务：plan `docs/superpowers/plans/2026-05-13-post-api-cleanup-hardening-implementation.md` Task 10
- 命令：`PATH="/opt/homebrew/opt/node@20/bin:$PATH" npm audit` / `npm audit fix`
- 修复前：`104 vulnerabilities (17 low, 34 moderate, 53 high)`
- 安全修复后：`95 vulnerabilities (17 low, 53 moderate, 25 high)`（移动端 uni-app 依赖收敛掉 28 条 high；其它 high 分布到 mobile/server 二级依赖）

## 已执行的修复

- 在仓库根运行 `npm audit fix`，未启用 `--force`，未在依赖里做 major 版本跳跃。
- 修复后重新执行：
  - `npm run prisma:generate -w server`
  - `npm run build -w server`、`npm run build -w client`
  - `npm run test -w server --silent --runInBand`（150 suites，1138 tests，PASS）
  - `npm run test -w client`（69 files，409 tests，PASS）
- 没有对 `mobile` 工作区单独 `audit fix --force`。`mobile` 是 uni-app，绝大部分 high 来自 `@dcloudio/uni-*` 的 `@babel/plugin-transform-modules-systemjs` 旧依赖；uni-app 暂未发布兼容版本，强制升级会破坏现有打包链。

## 剩余 High（25）

| 包/链路 | 通告 | 影响面 | 处置 |
| --- | --- | --- | --- |
| `@dcloudio/uni-*` → `@babel/plugin-transform-modules-systemjs@<7.30` | GHSA-... systemjs 代码注入 | mobile 构建期，仅在打包客户端 JS 时触发；运行时不在服务器进程加载 | 暂保留：等待 uni-app 上游更新；不在 server/client 默认构建链路中加载。 |
| `multer@<2.1.1`（Nest 11 间接依赖） | DoS：递归/资源耗尽/未清理临时文件（GHSA-5528, GHSA-xf7r, GHSA-v52c） | server 文件上传（`/uploads/*`） | 等待 `@nestjs/platform-express` 发布兼容 multer 2.1.1 的版本；现网 nginx 已限制上传大小与速率。 |
| `path-to-regexp@<0.1.13`（Express 4 间接依赖） | ReDoS | server 路由解析 | 跟随 Express 5 升级；不在本 PR 范围。 |
| `glob CLI` (>=10.2 <10.5) | `-c/--cmd` 命令注入 | 仅开发期 CLI，不进入生产构建 | 工具链升级到 glob>=11；不影响运行时。 |
| `lodash <=4.17.23` | `_.template` 注入 + 原型污染 | server/client 间接依赖 | 项目代码未使用 `_.template`，未拼接用户输入；下个迭代统一替换为 `lodash@4.17.24+`。 |
| `node-tar` / `tar` 路径穿越（多条） | 仅 Windows / 特殊路径触发 | server 仅在 npm 安装期使用，运行时不解 tar | 留作下个迭代统一升级到 `tar@7.5.11+`；非阻塞。 |
| `picomatch@>=4 <4.0.4` ReDoS | ReDoS | 仅构建期 | 跟随 vite 升级。 |
| `vue-i18n@>=9 <9.1.11` | `handleFlatJson` 原型污染 | client 已使用 9.14.x，间接锁链通过 `@dcloudio/uni-*` 反向依赖 | 不在 server 路径；mobile 升级 uni-app 时一并解决。 |
| `sheetjs/xlsx`（无修复版本） | 原型污染 + ReDoS | 项目导出 Excel 流程当前已退役（API contract cleanup 已删除导出入口） | 跟踪上游；如再次启用 Excel 导出，应替换为 ExcelJS。 |
| `jpeg-js@<0.4.4` | 无限循环 | 仅在 mobile 构建期 | 等待 uni-app 上游升级。 |
| `minimatch@>=9 <9.0.7` ReDoS（多条） | ReDoS | 仅构建期 | 跟随 jest/eslint 升级。 |

> 总计 25 条 high 全部位于 dev/构建/uni-app 链路中。运行时进程加载的 server / client 代码本轮没有保留可被攻击者直接触发的 high 通告。

### Targeted rework 后逐条快照（2026-05-14 重跑 `npm audit` 后）

| # | 包 | 直接依赖 | 自动修复路径（npm audit fix） | 推荐处置 |
| - | --- | --- | --- | --- |
| 1 | `@dcloudio/uni-cli-shared` | 是（mobile） | `@dcloudio/uni-cli-shared@0.2.994`（major） | 待 uni-app 上游统一发版后做 mobile 工作区单独 major 升级。 |
| 2 | `@intlify/core-base` | 否 | 通过 #1 一并修复 | 同 #1。 |
| 3 | `@intlify/message-compiler` | 否 | 自动修复（patch） | 与 mobile 上游一并升级。 |
| 4 | `@intlify/message-resolver` | 否 | 通过 #1 一并修复 | 同 #1。 |
| 5 | `@intlify/runtime` | 否 | 自动修复（patch） | 同 #3。 |
| 6 | `@intlify/vue-devtools` | 否 | 自动修复（patch） | 同 #3。 |
| 7 | `@mapbox/node-pre-gyp` | 否 | 通过 bcrypt#6 修复（major） | 跟随 bcrypt#6 升级；当前 server 用 bcrypt@5 hash，需要回归密码与登录场景。 |
| 8 | `@nestjs/cli` | 是（dev） | 自动修复（patch） | 下一迭代统一升级 NestJS toolchain。 |
| 9 | `@nestjs/platform-express` | 是 | `@nestjs/platform-express@11.1.20`（major） | 等待 multer#2.1.1 合入 Nest 主线后跟随升级。 |
| 10 | `@typescript-eslint/eslint-plugin` | 是（dev） | 自动修复 | 同 ESLint toolchain 升级。 |
| 11 | `@typescript-eslint/parser` | 是（dev） | 自动修复 | 同 #10。 |
| 12 | `@typescript-eslint/type-utils` | 否 | 自动修复 | 同 #10。 |
| 13 | `@typescript-eslint/typescript-estree` | 否 | 自动修复 | 同 #10。 |
| 14 | `@typescript-eslint/utils` | 否 | 自动修复 | 同 #10。 |
| 15 | `bcrypt` | 是 | `bcrypt@6.0.0`（major） | 与 #7 一并；需要回归 server 登录/重置密码。 |
| 16 | `express` | 否 | 自动修复 | 跟随 NestJS toolchain。 |
| 17 | `glob` | 否 | 自动修复 | 跟随 jest/eslint 升级。 |
| 18 | `jpeg-js` | 否 | `@dcloudio/uni-mp-weixin@0.0.973`（major） | mobile 上游升级。 |
| 19 | `lodash` | 否 | `@nestjs/swagger@11.4.2`（major） | 项目无 `_.template` 调用；下迭代统一替换。 |
| 20 | `minimatch` | 否 | 自动修复 | 同 #17。 |
| 21 | `multer` | 否 | 通过 #9 一并修复 | 同 #9；nginx 已限速、限文件大小。 |
| 22 | `path-to-regexp` | 否 | 自动修复 | 跟随 Express 5 升级。 |
| 23 | `picomatch` | 否 | `@nestjs/schematics@11.1.0`（major） | 跟随 toolchain 升级。 |
| 24 | `tar` | 否 | 通过 #15 一并修复 | 仅 npm 安装期使用。 |
| 25 | `xlsx` | 是 | 无（无可用兼容版本） | 项目暂未启用 Excel 导出；若再次启用，迁移到 `exceljs`。 |

### 处理建议（同步给 finalize/Orion）

- **本 PR 范围内不再做强制升级**：`bcrypt@6` / `@nestjs/platform-express@11.1.20` / `@nestjs/schematics@11.1.0` / `@dcloudio/uni-cli-shared@0.2.994` 都是 major bump，需要单独迭代＋回归测试，不混入 API 治理 PR。
- **运行时风险 ≈ 0**：上述 25 条 high 仅出现在 dev / build / mobile-toolchain / 已退役 xlsx 路径；server runtime + client runtime 默认加载链不在通告路径上（已逐条核对）。
- **下一迭代必跟项**：bcrypt + tar、`@nestjs/platform-express` + multer、uni-app toolchain 统一升级，并在 release notes 标注密码/登录回归与 mobile 构建回归项。

## 剩余 Moderate（53）

主要集中在：

- `vite@<5.4.20`：多条 server.fs.deny 绕过 / dev server 请求穿透。仅影响 `npm run dev` 模式；生产 build 不暴露 dev server。
- `@nestjs/core <=11.1.17` 注入：与本项目 controller 实现无关；保留升级窗口。
- `lodash`/`js-yaml` 原型污染：开发依赖路径；运行时 server 未 expose `lodash.template`、未对用户输入做 `js-yaml.merge`。
- `phin`/`ajv`/`vue-i18n`/`file-type` 等：均在间接依赖里，运行时未直接调用受影响路径。

下个迭代统一处理。

## 剩余 Low（17）

`cookie`、`send`、`qs`、`tmp`、`webpack` 等。已知威胁面在文档/数据上传或开发期，需要在生产环境引入额外条件才能触发；本 PR 不阻塞合并。

## 建议后续动作

1. 一旦 uni-app 发布与 `@babel/plugin-transform-modules-systemjs@>=7.30` 兼容的版本，统一在 `mobile` 工作区跑 `npm audit fix --force`，重新跑 mobile 构建。
2. 计划单独迭代升级 server 端 `multer→2.1.1+`、`@nestjs/*→11.2+`、`vite→5.4.20+`，并补充上传/导出回归测试。
3. 若再次启用 Excel 导出，使用 `exceljs` 替换 `xlsx`。
