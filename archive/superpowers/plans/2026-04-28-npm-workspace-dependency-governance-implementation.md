# NPM Workspace Dependency Governance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将项目迁移到根级 npm workspaces，固定 Node 20 口径，修复 `echarts` 与 `echarts-wordcloud` 冲突，并让本地、worktree、Docker 使用同一套依赖规则。

**Architecture:** 根目录成为唯一 npm 入口，保留现有 `client`、`server`、`mobile`、`miniprogram`、`packages/types`、`tools/noidear-mcp` 子项目边界。根 `package-lock.json` 成为唯一锁文件，Docker build context 提升到仓库根目录，server/client Dockerfile 通过 `npm ci --workspace <name>` 安装各自 workspace 依赖。

**Tech Stack:** npm workspaces、Node 20 LTS、Vue/Vite、NestJS、Docker Compose、ECharts 5.6、echarts-wordcloud 2.1。

---

## 前置要求

- 在隔离 worktree 中执行本计划，不在主工作区直接改依赖。
- 使用 Node 20 执行依赖安装和验证。
- 不提交 `node_modules`、`.env`、测试报告、覆盖率报告、构建产物。
- 不改业务代码，不改数据库 schema。

## 文件结构

- Create: `.nvmrc`
  - 固定默认 Node 版本为 20。
- Create: `package.json`
  - 根级 npm workspace 入口和统一脚本。
- Create: `package-lock.json`
  - 根级唯一 lockfile，由 `npm install` 生成。
- Modify: `client/package.json`
  - 增加 engines。
  - 将 `echarts` 从 `^6.0.0` 降为 `^5.6.0`。
- Modify: `server/package.json`
  - 增加 engines。
- Modify: `mobile/package.json`
  - 增加 engines。
- Modify: `miniprogram/package.json`
  - 增加 engines。
- Modify: `packages/types/package.json`
  - 增加 private、engines、devDependency `typescript`，确保根验证可运行。
- Modify: `tools/noidear-mcp/package.json`
  - 增加 engines。
- Delete: `client/package-lock.json`
- Delete: `server/package-lock.json`
- Delete: `mobile/package-lock.json`
- Delete: `miniprogram/package-lock.json`
- Delete: `tools/noidear-mcp/package-lock.json`
- Modify: `client/Dockerfile`
  - 使用仓库根 build context 和 workspace 安装。
- Modify: `server/Dockerfile`
  - 使用仓库根 build context 和 workspace 安装。
- Modify: `docker-compose.yml`
  - server/client build context 改为仓库根目录。
- Modify: `docs/superpowers/specs/2026-04-28-npm-workspace-dependency-governance-design.md`
  - 追加实施状态。
- Modify: `docs/AGENT_GUIDE.md`
  - 增加依赖安装和 Node 版本入口说明。

---

## Task 1: 基线冲突确认

**Files:**
- Read: `client/package.json`
- Read: `server/package.json`
- Read: `client/Dockerfile`
- Read: `server/Dockerfile`
- Read: `docker-compose.yml`

- [ ] **Step 1: 确认当前 Node 和 npm 版本**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
node -v
npm -v
```

Expected when still using the current problematic local environment:

```text
v25.5.0
11.8.0
```

If Node is already 20.x or 22.x, continue; the later `npm ci` verification still proves the migration.

- [ ] **Step 2: 确认 client 版本冲突来源**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
node -e "const p=require('./client/package.json'); console.log({echarts:p.dependencies.echarts, wordcloud:p.dependencies['echarts-wordcloud']})"
npm view echarts-wordcloud@2.1.0 peerDependencies --json
```

Expected:

```text
{ echarts: '^6.0.0', wordcloud: '^2.1.0' }
{
  "echarts": "^5.0.1"
}
```

- [ ] **Step 3: 确认 server 运行口径是 Node 20**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
rg -n "FROM node:" server/Dockerfile client/Dockerfile
```

Expected:

```text
client/Dockerfile:2:FROM node:18-alpine AS builder
server/Dockerfile:2:FROM node:20-alpine AS builder
server/Dockerfile:18:FROM node:20-alpine
```

- [ ] **Step 4: 提交基线不需要改文件**

No commit for this task.

---

## Task 2: 根级 workspace 入口和 Node 版本口径

**Files:**
- Create: `.nvmrc`
- Create: `package.json`

- [ ] **Step 1: 新增 `.nvmrc`**

Create `.nvmrc`:

```text
20
```

- [ ] **Step 2: 新增根 `package.json`**

Create `package.json`:

```json
{
  "name": "noidear",
  "version": "1.0.0",
  "private": true,
  "description": "noidear food safety and quality management platform",
  "workspaces": [
    "client",
    "server",
    "mobile",
    "miniprogram",
    "packages/types",
    "tools/noidear-mcp"
  ],
  "engines": {
    "node": ">=20 <23",
    "npm": ">=10"
  },
  "scripts": {
    "install:all": "npm install",
    "build:client": "npm run build -w client",
    "build:server": "npm run build -w server",
    "build:mcp": "npm run build -w tools/noidear-mcp",
    "typecheck:types": "npm run typecheck -w packages/types",
    "test:client": "npm run test -w client",
    "test:server": "npm run test -w server",
    "prisma:generate": "npm run prisma:generate -w server",
    "verify": "npm run build:server && npm run build:client",
    "verify:full": "npm run typecheck:types && npm run build:mcp && npm run build:server && npm run build:client"
  }
}
```

- [ ] **Step 3: 校验 JSON**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); JSON.parse(require('fs').readFileSync('.nvmrc','utf8').trim().replace(/^(.+)$/, '\"$1\"')); console.log('root workspace files valid')"
```

Expected:

```text
root workspace files valid
```

- [ ] **Step 4: 提交根入口**

```bash
git add .nvmrc package.json
git commit -m "chore: add root npm workspace entry"
```

---

## Task 3: 子项目 engines 和 ECharts 冲突修复

**Files:**
- Modify: `client/package.json`
- Modify: `server/package.json`
- Modify: `mobile/package.json`
- Modify: `miniprogram/package.json`
- Modify: `packages/types/package.json`
- Modify: `tools/noidear-mcp/package.json`

- [ ] **Step 1: 用结构化脚本更新 package.json**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
node <<'NODE'
const fs = require('fs');

const files = [
  'client/package.json',
  'server/package.json',
  'mobile/package.json',
  'miniprogram/package.json',
  'packages/types/package.json',
  'tools/noidear-mcp/package.json',
];

for (const file of files) {
  const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
  pkg.engines = {
    node: '>=20 <23',
    npm: '>=10',
  };

  if (file === 'client/package.json') {
    pkg.dependencies.echarts = '^5.6.0';
  }

  if (file === 'packages/types/package.json') {
    pkg.private = true;
    pkg.devDependencies = {
      ...(pkg.devDependencies || {}),
      typescript: '^5.3.0',
    };
  }

  fs.writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`);
}
NODE
```

- [ ] **Step 2: 确认关键字段**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
node <<'NODE'
for (const file of ['client/package.json','server/package.json','mobile/package.json','miniprogram/package.json','packages/types/package.json','tools/noidear-mcp/package.json']) {
  const pkg = require(`./${file}`);
  console.log(file, pkg.engines);
}
console.log('client echarts', require('./client/package.json').dependencies.echarts);
console.log('types private', require('./packages/types/package.json').private);
console.log('types typescript', require('./packages/types/package.json').devDependencies.typescript);
NODE
```

Expected:

```text
client/package.json { node: '>=20 <23', npm: '>=10' }
server/package.json { node: '>=20 <23', npm: '>=10' }
mobile/package.json { node: '>=20 <23', npm: '>=10' }
miniprogram/package.json { node: '>=20 <23', npm: '>=10' }
packages/types/package.json { node: '>=20 <23', npm: '>=10' }
tools/noidear-mcp/package.json { node: '>=20 <23', npm: '>=10' }
client echarts ^5.6.0
types private true
types typescript ^5.3.0
```

- [ ] **Step 3: 提交子项目 package 更新**

```bash
git add client/package.json server/package.json mobile/package.json miniprogram/package.json packages/types/package.json tools/noidear-mcp/package.json
git commit -m "chore: align workspace node engines and chart deps"
```

---

## Task 4: 生成根 lockfile 并删除子项目 lockfile

**Files:**
- Create: `package-lock.json`
- Delete: `client/package-lock.json`
- Delete: `server/package-lock.json`
- Delete: `mobile/package-lock.json`
- Delete: `miniprogram/package-lock.json`
- Delete: `tools/noidear-mcp/package-lock.json`

- [ ] **Step 1: 切换到 Node 20**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
nvm use 20
node -v
npm -v
```

Expected:

```text
Now using node v20
v20.
10.
```

If `nvm` is unavailable, use the local Node manager already installed on the machine to activate Node 20, then re-run:

```bash
node -v
npm -v
```

Expected:

```text
v20.
10.
```

- [ ] **Step 2: 清理旧安装产物**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
rm -rf node_modules client/node_modules server/node_modules mobile/node_modules miniprogram/node_modules packages/types/node_modules tools/noidear-mcp/node_modules
```

Expected:

```text
```

命令无输出且退出码为 0。

- [ ] **Step 3: 生成根 workspace lockfile**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
npm install
```

Expected:

```text
added
```

The command must not require `--legacy-peer-deps`.

- [ ] **Step 4: 删除子项目 lockfile**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git rm client/package-lock.json server/package-lock.json mobile/package-lock.json miniprogram/package-lock.json tools/noidear-mcp/package-lock.json
```

Expected:

```text
rm 'client/package-lock.json'
rm 'server/package-lock.json'
rm 'mobile/package-lock.json'
rm 'miniprogram/package-lock.json'
rm 'tools/noidear-mcp/package-lock.json'
```

- [ ] **Step 5: 验证根 lockfile 包含 workspace**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
node <<'NODE'
const lock = require('./package-lock.json');
const required = [
  '',
  'client',
  'server',
  'mobile',
  'miniprogram',
  'packages/types',
  'tools/noidear-mcp',
];
for (const key of required) {
  const lockKey = key ? key : '';
  if (!lock.packages[lockKey]) {
    throw new Error(`missing lock package ${lockKey || '<root>'}`);
  }
}
console.log('workspace lockfile valid');
NODE
```

Expected:

```text
workspace lockfile valid
```

- [ ] **Step 6: 干净重装验证**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
rm -rf node_modules client/node_modules server/node_modules mobile/node_modules miniprogram/node_modules packages/types/node_modules tools/noidear-mcp/node_modules
npm ci
```

Expected:

```text
added
```

The command must not show an `ERESOLVE` error for `echarts` and `echarts-wordcloud`.

- [ ] **Step 7: 提交 lockfile 迁移**

```bash
git add package-lock.json
git add -u client/package-lock.json server/package-lock.json mobile/package-lock.json miniprogram/package-lock.json tools/noidear-mcp/package-lock.json
git commit -m "chore: migrate to root npm lockfile"
```

---

## Task 5: Docker workspace 适配

**Files:**
- Modify: `client/Dockerfile`
- Modify: `server/Dockerfile`
- Modify: `docker-compose.yml`

- [ ] **Step 1: 替换 `client/Dockerfile`**

Replace `client/Dockerfile` with:

```dockerfile
# ---- Stage 1: Build ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY client/package.json ./client/package.json
RUN npm ci --workspace client --include-workspace-root=false

COPY client ./client
WORKDIR /app/client
RUN npm run build

# ---- Stage 2: Runtime ----
FROM nginx:alpine

COPY --from=builder /app/client/dist /usr/share/nginx/html
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

- [ ] **Step 2: 替换 `server/Dockerfile`**

Replace `server/Dockerfile` with:

```dockerfile
# ---- Stage 1: Build ----
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json ./server/package.json
RUN npm ci --workspace server --include-workspace-root=false

COPY server ./server
WORKDIR /app/server
RUN npx prisma generate --schema=src/prisma/schema.prisma
RUN npm run build

# ---- Stage 2: Runtime ----
FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json ./server/package.json
RUN npm ci --workspace server --include-workspace-root=false --omit=dev

COPY server/src/prisma ./server/src/prisma
WORKDIR /app/server
RUN npx prisma generate --schema=src/prisma/schema.prisma

COPY --from=builder /app/server/dist ./dist

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/main"]
```

- [ ] **Step 3: 修改 `docker-compose.yml` build context**

Change the `server` build section from:

```yaml
    build:
      context: ./server
      dockerfile: Dockerfile
```

to:

```yaml
    build:
      context: .
      dockerfile: server/Dockerfile
```

Change the `client` build section from:

```yaml
    build:
      context: ./client
      dockerfile: Dockerfile
```

to:

```yaml
    build:
      context: .
      dockerfile: client/Dockerfile
```

- [ ] **Step 4: Dockerfile 静态检查**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
rg -n "context: ./server|context: ./client|FROM node:18" docker-compose.yml client/Dockerfile server/Dockerfile
```

Expected:

```text
```

命令无输出，退出码为 1。

- [ ] **Step 5: 提交 Docker 适配**

```bash
git add client/Dockerfile server/Dockerfile docker-compose.yml
git commit -m "chore: adapt docker builds to npm workspaces"
```

---

## Task 6: 文档入口更新

**Files:**
- Modify: `docs/AGENT_GUIDE.md`
- Modify: `docs/superpowers/specs/2026-04-28-npm-workspace-dependency-governance-design.md`

- [ ] **Step 1: 在 `docs/AGENT_GUIDE.md` 增加依赖治理入口**

Insert after `## 快速开始`:

````markdown
## 依赖与 Node 版本

本项目使用根级 npm workspaces。进入任意 worktree 后，优先在仓库根目录执行：

```bash
nvm use
npm ci
```

项目默认 Node 版本为 `.nvmrc` 中的 `20`。不要使用 Node 25 安装后端依赖；`bcrypt` 在该版本下可能无法安装。

常用根命令：

```bash
npm run build:server
npm run build:client
npm run verify
```

如只处理单个子项目：

```bash
npm ci --workspace server --include-workspace-root=false
npm ci --workspace client --include-workspace-root=false
```
````

- [ ] **Step 2: 在设计文档追加实施状态**

Append to `docs/superpowers/specs/2026-04-28-npm-workspace-dependency-governance-design.md`:

```markdown
## 实施状态

- 已新增根级 npm workspace 入口。
- 已固定 Node 20 默认版本口径。
- 已将 `echarts` 降到 `^5.6.0`，与 `echarts-wordcloud@^2.1.0` 匹配。
- 已迁移为根级 `package-lock.json`。
- 已删除子项目 lockfile。
- 已将 server/client Docker build context 适配为仓库根目录。
- 已通过根级安装、server/client 构建和 Docker build 验证。
```

- [ ] **Step 3: Markdown 代码块检查**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
node <<'NODE'
const fs = require('fs');
for (const file of ['docs/AGENT_GUIDE.md','docs/superpowers/specs/2026-04-28-npm-workspace-dependency-governance-design.md']) {
  const text = fs.readFileSync(file, 'utf8');
  const fences = (text.match(/```/g) || []).length;
  if (fences % 2 !== 0) throw new Error(`${file} has unbalanced code fences`);
  console.log(`${file} fences ok`);
}
NODE
```

Expected:

```text
docs/AGENT_GUIDE.md fences ok
docs/superpowers/specs/2026-04-28-npm-workspace-dependency-governance-design.md fences ok
```

- [ ] **Step 4: 提交文档更新**

```bash
git add docs/AGENT_GUIDE.md docs/superpowers/specs/2026-04-28-npm-workspace-dependency-governance-design.md
git commit -m "docs: document npm workspace workflow"
```

---

## Task 7: 最终验证

**Files:**
- Verify only

- [ ] **Step 1: 确认 Node 版本**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
nvm use
node -v
npm -v
```

Expected:

```text
v20.
10.
```

- [ ] **Step 2: 干净安装**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
rm -rf node_modules client/node_modules server/node_modules mobile/node_modules miniprogram/node_modules packages/types/node_modules tools/noidear-mcp/node_modules
npm ci
```

Expected:

```text
added
```

No `ERESOLVE` output for `echarts` and `echarts-wordcloud`.

- [ ] **Step 3: 生成 Prisma Client**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
npm run prisma:generate
```

Expected:

```text
Generated Prisma Client
```

- [ ] **Step 4: 后端构建**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
npm run build:server
```

Expected:

```text
Found 0 errors.
```

- [ ] **Step 5: 前端构建**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
npm run build:client
```

Expected:

```text
built in
```

- [ ] **Step 6: 根级 verify**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
npm run verify
```

Expected:

```text
Found 0 errors.
built in
```

- [ ] **Step 7: Docker build**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
docker compose build server client
```

Expected:

```text
noidear-server
noidear-client
```

The command exits with code 0.

- [ ] **Step 8: Git 检查**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git status --short
git diff --check
```

Expected:

```text
```

`git diff --check` 无输出。`git status --short` 不包含 `.env`、`node_modules`、coverage、playwright report 或 dist 产物。

- [ ] **Step 9: 最终提交**

If Task 7 produced tracked verification-only changes, commit them:

```bash
git add .
git commit -m "chore: verify npm workspace migration"
```

If Task 7 produced no tracked changes:

```bash
git status --short
```

Expected:

```text
```

No commit is needed.

---

## 验收标准

- 根目录存在 `.nvmrc`，内容为 `20`。
- 根目录存在 `package.json`，并声明全部 workspace。
- 根目录存在唯一 `package-lock.json`。
- 子项目 lockfile 已删除。
- `client/package.json` 中 `echarts` 为 `^5.6.0`。
- `echarts-wordcloud` 保持 `^2.1.0`。
- 所有 workspace `package.json` 声明 `engines.node: >=20 <23`。
- `npm ci` 在根目录不需要 `--legacy-peer-deps`。
- server 不再因为 Node 25 的 `bcrypt` 编译问题阻断；执行时使用 Node 20。
- `npm run build:server` 成功。
- `npm run build:client` 成功。
- `docker compose build server client` 成功。

## 自检记录

- 规格覆盖：Node 版本、ECharts 冲突、根 workspace、唯一 lockfile、Docker context、文档入口、验证命令均有对应任务。
- 内容完整性扫描：所有改文件步骤包含具体文件、具体命令或完整文件内容。
- 类型一致性：workspace 名称在根 `package.json`、`npm run -w`、Dockerfile 和验证命令中保持一致。
