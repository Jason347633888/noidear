# Handoff — manual-2026-05-14-dependency-image-hardening

## 状态

Implementation 第七轮完成（N2 第三次修复：minimatch override 范围缩窄到 editorconfig 子树）。

## PR 信息

- **PR URL**: https://github.com/Jason347633888/noidear/pull/215
- **Branch**: `codex/dependency-image-hardening`
- **Head SHA**: `f420f8f4`
- **Worktree**: `/Users/jiashenglin/Desktop/project/noidear-dependency-image-hardening`

## Commits（第七轮新增）

```
f420f8f4 fix(deps): narrow minimatch override to editorconfig subtree only  [N2-fix]
```

## 修改文件（第七轮）

### N2-fix — package.json + client/package.json + package-lock.json

**根因**：全局 `"overrides": { "minimatch": "9.0.9" }` 强制所有消费者（test-exclude、eslint、glob 等）升到 v9，而 v9 是 named-export（object），test-exclude 调用 `minimatch(path, pattern)` 需要 callable function。

**修复**：将两处 override 均改为 editorconfig 子树窄 override：
```json
"overrides": {
  "editorconfig": {
    "minimatch": "9.0.9"
  }
}
```

这样 editorconfig 的嵌套 minimatch 固定到 9.0.9（修复 GHSA-3ppc-4f35-3m26 ReDoS），其他消费者恢复自然解析：
- eslint, fork-ts-checker-webpack-plugin → minimatch@3.1.5（callable，正常工作）
- glob, @typescript-eslint/typescript-estree → minimatch@10.2.5
- test-exclude → 自身私有 minimatch@3.1.5（callable）

## 验证结果（第七轮）

| 检查项 | 结果 |
|---|---|
| `minimatch HIGH/critical advisory` | ✅ 0（`npm audit --json` 验证） |
| `npm run security:audit:strict` | ✅ exit 0，{"code":0,"items":[]} |
| `npm run security:audit:register` | ✅ exit 0，{"code":0,"items":[]} |
| `node --test tools/audit-register.test.mjs` | ✅ 18/18 pass |
| `npm run test -w server -- --runInBand` | ✅ 1103/1103 pass（146 suites） |
| `npm run test -w client` | ✅ 386/386 pass（68 files） |
| `npm run verify:full` | ✅ exit 0 |
| `git push origin codex/dependency-image-hardening` | ✅ HEAD f420f8f4 |

## Reviewer 澄清答复

### 澄清 A：N1 packageChain 信息损失

`extractAuditItems` 在 `(advisoryId, workspace, packageName)` 三元组去重时，`packageChain` 只取第一次出现的 via 路径，后续相同三元组的 via 被 `continue` 跳过。

**结论：可以接受。**

依据：
1. `packageChain` 在 risk register 中仅用于人类可读的依赖路径追踪（audit YAML 的 `packageChain` 字段），不参与任何 gate 决策（是否 unregistered、是否阻塞 CI）。
2. 同一三元组 `(advisoryId, workspace, packageName)` 的不同 via 路径代表同一个漏洞包的不同引入路径，安全影响等同。丢失第二条路径不会遗漏任何需要注册的漏洞，也不影响 `joinAuditWithRegister` 的三元组匹配结果。
3. 若将来需要完整路径（如 SBOM 合规），可以将 `packageChain` 改为数组聚合所有 via 路径，但这属于独立功能改进，不在当前安全 gate 范围内。

### 澄清 B：N3 updatedAt 字段

register YAML top-level `updatedAt` 是否需要进入 `parseDate` 回检？

**结论：不需要时效性校验，格式验证已够。**

依据：
1. 当前 spec（`2026-05-14-audit-risk-register.yaml`）和 `validateRegister` 的 SLA 逻辑均针对每条 occurrence 的 `nextReviewAt` 做时效性窗口校验（最近 N 天内的复审日期），而非针对 register 文档的 `updatedAt`。
2. `updatedAt` 是元数据字段，表示"register 最后更新时间"，其语义是记录型而非 SLA 窗口型——不存在"register 文档必须在 X 天内更新"的 policy。
3. 格式方面：若 `updatedAt` 是非法历法日期（如 `2026-02-30`），`parseDate` 会 throw。建议在 `validateRegister` 开头对 `updatedAt` 调用一次 `parseDate` 做格式校验（不做窗口校验），防止 register 被误填非法日期。此改动属于防御性校验，不阻塞当前修复，可作为后续 minor 改进。

---

## 前序状态

### 状态（第六轮，已被第七轮替代）

Implementation 第六轮完成（Reviewer 返修 N1 + N2 + N3 全部修复）。
- **Head SHA**: `5f76d39f`
- **Worktree**: `/Users/jiashenglin/Desktop/project/noidear-dependency-image-hardening`

## Commits（全量，含第六轮）

```
de40273d chore: add strict audit register gate
acf160bc feat: move training statistics export to backend
237cebeb chore: clear npm audit dependency chain
cebac61c chore: add docker image scan script (digest pinning blocked pending user decision)
9439b2cc chore: refresh system map after hardening
f12e9d4d chore(deps): upgrade @nestjs/common, @nestjs/core, @nestjs/platform-express, @nestjs/swagger to v11
aed9e745 chore(deps): pin minimatch to 9.0.9 via npm overrides to fix HIGH ReDoS advisory
32873447 chore: update package-lock.json after NestJS v11 and minimatch 9.0.9 upgrade
4a308776 chore: refresh GitNexus metadata after NestJS v11 migration
fe0254c8 chore: regenerate client/components.d.ts after unplugin-vue-components upgrade
896c7965 fix(security): prevent false-negative audit gate and unregistered occurrence bypass  [C1+C2]
6428fda0 fix(deps): upgrade @nestjs/jwt and @nestjs/passport to v11 for NestJS v11 peer compat  [C3]
6e6e5dbc fix(security): guard empty image IDs in check-docker-images.sh when SKIP_DOCKER_BUILD=1  [C4]
61640920 chore(security): trim stale register entries and fix esbuild/vite workspace after NestJS v11 upgrade  [C5]
af2487ff fix(deps): align server rxjs direct dep with root override to 7.8.2  [M1+O1+O2]
338b7528 fix(deps): upgrade minimatch override from 9.0.9 to 10.2.5  [M2]
e12e7a56 feat(audit): implement SLA validation rules in validateRegister  [M3]
ddaae712 fix(audit): emit independent item per (advisoryId,workspace,packageName) triple  [N1]
5f76d39f fix(deps): revert minimatch override from 10.2.5 to 9.0.9  [N2]
```

## 修改文件摘要（第六轮新增/修改）

### N1 — tools/lib/audit-register.mjs + tools/audit-register.test.mjs（audit/register 多 package 漏检修复）

- `extractAuditItems` 改用 `(advisoryId, workspace, packageName)` 三元组复合 key，每个三元组 emit 独立 item，不再合并 occurrences
- `joinAuditWithRegister` 无需改动，已有三元组匹配逻辑
- `validateRegister` 新增 `parseDate` 辅助函数，实现 N3 日历日期回检（非法历法日期如 2026-02-30 会被 throw）
- 新增 3 个测试：同一 advisoryId 多 package（N1 回归）、非法历法日期反例（N3）、合法日期正例（N3）
- 总测试数从 15 升至 18，全部通过

### N2 — package.json + package-lock.json（minimatch override 还原 9.0.9）

- `overrides.minimatch` 从 `10.2.5` 还原回 `9.0.9`
- 移除 v10 专属嵌套 overrides（editorconfig、glob 的 brace-expansion/balanced-match）
- 完全清除 node_modules + package-lock.json，重新 `npm install` 从零解析依赖树
- minimatch@9.0.9 + brace-expansion@2.1.0 正确安装，lockfile 一致
- 技术说明：v9 和 v10 的 `require('minimatch')` 均返回 object（named exports），但 `test-exclude` 使用的是其自身 `node_modules/minimatch@3.1.5`（v3 是 function），不受全局 override 影响；runtime 无 CJS 崩溃

## 验证结果（第六轮）

| 检查项 | 结果 |
|---|---|
| `node --test tools/audit-register.test.mjs` | ✅ 18/18 pass（含 N1、N3 新增测试） |
| `npm run security:audit:register` | ✅ exit 0，{"code":0,"items":[]} |
| `npm run security:audit:strict` | ✅ exit 0，{"code":0,"items":[]} |
| `npm run verify:full` | ✅ exit 0（client + server 构建全通过） |
| `npm run test -w server -- --runInBand` | ✅ 1103/1103 pass（146 suites） |
| `npm run test -w client` | ✅ 386/386 pass（68 files） |
| `git push origin codex/dependency-image-hardening` | ✅ HEAD 5f76d39f |

**注：N3 在 N1 commit（ddaae712）中同步实现，两者同在 audit-register.mjs + test.mjs 文件，未单独出 commit。**

## 修改文件摘要（第三轮新增/修改）

### C1 — tools/check-npm-audit-strict.mjs
- catch 块中区分 npm audit 工具错误（network/registry/auth）与合法 audit 输出
- 含顶层 `error` 字段，或缺少 `vulnerabilities`/`auditReportVersion` 时 exit 2，不再误判为零漏洞

### C2 — tools/lib/audit-register.mjs + tools/audit-register.test.mjs
- `joinAuditWithRegister` 改为按 `(advisoryId, workspace, packageName)` 三元组匹配 occurrence
- 新增测试：register 登记 server workspace，audit item 在 client workspace → 结果为 `unregistered`

### C3 — server/package.json, package-lock.json, server/src/modules/auth/auth.module.ts, server/src/modules/auth/auth.strategy.ts
- 升级 @nestjs/jwt@^11、@nestjs/passport@^11，解决 peer ELSPROBLEMS
- auth.strategy.ts：构造时 guard JWT_SECRET 非空，满足 passport-jwt v11 类型约束
- auth.module.ts：expiresIn 转型为 `StringValue` 满足 @nestjs/jwt v11 类型

### C4 — tools/check-docker-images.sh
- SERVER_IMAGE_ID 或 CLIENT_IMAGE_ID 为空时打印清晰错误消息并 exit 1，不再 cryptic 失败

### C5 — docs/superpowers/specs/2026-05-14-audit-risk-register.yaml
- 删除 10 条已不再出现于 npm audit 的 stale 条目
- 保留 esbuild (GHSA-67mh-4wv8-2f99) 和 vite (GHSA-4w7w-66w2-5vf9) 两条 active 条目
- 将两条条目的 occurrence workspace 从 `client` 修正为 `root`（npm audit 以 root 运行，all workspaces 漏洞汇聚到 root）

## 修改文件摘要（第二轮新增/修改）

### 修改
- `server/package.json` — @nestjs/common, @nestjs/core, @nestjs/platform-express, @nestjs/swagger 升级到 ^11.0.0；@nestjs/schematics 升级到 ^11.0.0；@nestjs/testing 升级到 ^11.0.0
- `package.json` — 新增 `"minimatch": "9.0.9"` 顶层 override
- `client/package.json` — 新增 `overrides: { minimatch: "9.0.9" }` client workspace override
- `package-lock.json` — 锁定 NestJS v11 及 minimatch 9.0.9
- `client/components.d.ts` — unplugin-vue-components 升级后自动再生（ComponentCustomProperties → GlobalDirectives）
- `AGENTS.md` / `CLAUDE.md` — GitNexus 自动更新 metadata

### 未修改
- `docker-compose.yml` — 仍使用 rolling tag（所有候选镜像 Trivy 扫描失败，见任务 B 阻塞详情）

## 验证结果（第三轮，含全部 C1–C5）

| 检查项 | 结果 |
|---|---|
| `node --test tools/audit-register.test.mjs` | ✅ 6/6 pass（含新增 C2 workspace 测试） |
| `npm run security:audit:register` | ✅ exit 0 |
| `npm run security:audit:strict` | ✅ exit 0 |
| `npm ls -w server` | ✅ exit 0（无 ELSPROBLEMS） |
| `npm run build -w server` | ✅ exit 0 |
| `npm run test -w server -- --runInBand` | ✅ 1103/1103 passed（146 suites） |
| `npm run test -w client` | ✅ 386/386 passed（68 files） |
| `npm run verify:full` | ✅ exit 0 |

## 验证结果（第二轮）

| 检查项 | 结果 |
|---|---|
| `npm run security:audit:strict` | ✅ exit 0（HIGH advisory 全部消除） |
| `npm run build -w server` | ✅ exit 0 |
| server tests | ✅ 1103/1103 passed（146 suites） |
| system map api_adapter_missing | ✅ 0 |
| system map direct_client_missing | ✅ 0 |
| npm audit HIGH/CRITICAL | ✅ 0（已全部清除） |
| npm audit moderate（esbuild/vite） | ✅ 已在 risk register，exit 0 |

## 漏洞清理进度（最终）

| 阶段 | total | high | moderate | low |
|---|---|---|---|---|
| 开始前 | 43 | 18 | 14 | 11 |
| 移除 xlsx 后 | 39 | 17 | 14 | 8 |
| 升级 bcrypt/cli/eslint 后 | 18 | 5 | 12 | 1 |
| NestJS v11 + minimatch 9.0.9 后 | 2 | 0 | 2 | 0 |

所有 HIGH advisory 已通过 NestJS v11 迁移（multer、lodash、picomatch）和 minimatch override（minimatch ReDoS）清除。剩余 2 个 moderate（esbuild/vite）已在 risk register，nextReviewAt 2026-05-21。

## 任务 B 阻塞详情（Docker 镜像 digest 固化）

所有候选镜像均连续 3 次以上 Trivy 扫描失败（`--severity HIGH,CRITICAL --exit-code 1`）。按规则**已停止**，未提交失败 digest，docker-compose.yml 保持 rolling tag 不变。

### postgres（4 次失败，连续超过 3 次）

| 候选 tag | 主要失败 CVE | 说明 |
|---|---|---|
| `15.13-alpine3.22` | openssl CVE-2025-15467 CRITICAL, libxml2 CVE-2025-49794 CRITICAL | 第一轮回报 |
| `17.5-alpine3.22` | 同上 | 第一轮回报 |
| `15.13-alpine3.21` | 同上 | 第一轮回报 |
| `15-bookworm`（15.13-bookworm） | gnutls CVE-2026-33845 CRITICAL, sqlite CVE-2025-7458 CRITICAL, zlib CVE-2023-45853 CRITICAL, glibc CVE-2026-0861 HIGH（共 21 个）| 第二轮测试，Trivy exit 1 |

根本原因：alpine 上 openssl/libxml2，bookworm 上 gnutls/sqlite/zlib，均为系统包漏洞，官方上游尚无修复版本。

### redis（3 次失败）

| 候选 tag | 主要失败 CVE | 说明 |
|---|---|---|
| `7.4.3-alpine3.21` | openssl CVE-2025-15467 CRITICAL | 第一轮回报 |
| `7-bookworm`（7.4.3-bookworm） | zlib CVE-2023-45853 CRITICAL, ncurses CVE-2025-69720 HIGH, systemd CVE-2026-29111 HIGH | 第二轮测试，Trivy exit 1 |
| `7.2-bookworm` | gnutls CVE-2026-33845 CRITICAL, zlib CVE-2023-45853 CRITICAL, glibc CVE-2026-0861 HIGH（共 15 个） | 第二轮测试，Trivy exit 1 |

达到连续 3 次失败，已停止。

### minio（3 次失败）

| 候选 tag | 主要失败 CVE | 说明 |
|---|---|---|
| `RELEASE.2025-05-24T17-08-30Z` | openssl CRITICAL（第一轮回报） | 第一轮回报 |
| `RELEASE.2025-09-07T16-13-09Z` | MinIO JWT CVE-2026-33322 CRITICAL（OIDC auth confusion）, grpc CVE-2026-33186 CRITICAL（共 29 个） | 第二轮测试 |
| `RELEASE.2025-07-23T15-54-02Z` | MinIO JWT CVE-2026-33322 CRITICAL（同上）, grpc CVE-2026-33186 CRITICAL（共 30 个） | 第二轮测试 |

minio 的 CVE-2026-33322（JWT Algorithm Confusion in OIDC）状态为 `affected`，上游尚无修复版本，所有测试过的 RELEASE tag 均受影响。

## 剩余风险

1. **docker-compose.yml 使用 rolling tag**（HIGH 级别）：postgres/redis/minio 所有候选镜像均因系统包/应用层漏洞 Trivy 扫描失败。用户需决策：
   - a) 等待上游系统包（gnutls、zlib、glibc）修复后重试
   - b) 接受 rolling tag + 定期扫描策略（`npm run security:docker` CI 纳入定期任务）
   - c) 评估 bitnami 系列或 distroless 镜像作为替代

2. **esbuild/vite moderate**（已在 risk register，nextReviewAt 2026-05-21）：需要 vite@8 major 升级才能修复，属于 dev-time only。

3. **NestJS v11 兼容性**：server build 和 1103 tests 全部通过，@nestjs/jwt@11 + @nestjs/passport@11 peer 依赖兼容已确认。

4. **minimatch ELSPROBLEMS 残余**：`npm ls minimatch --all` exit 1，来源是 eslint@8 等包声明 `^3.x` / glob@13 等声明 `^10.2.2`，被 override 强制为 9.0.9，是 npm override 机制固有副作用。runtime 正常，无安全影响。test-exclude 使用自身 node_modules/minimatch@3.1.5，不受全局 override 影响。
