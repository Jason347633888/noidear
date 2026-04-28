# npm Workspace 与依赖版本治理设计

## 背景

当前 `noidear` 是多子项目结构，但没有根级统一依赖入口：

- `client/package.json`
- `server/package.json`
- `mobile/package.json`
- `miniprogram/package.json`
- `packages/types/package.json`
- `tools/noidear-mcp/package.json`

这导致本地开发、worktree、Docker、CI 的 Node 版本和安装命令不统一。新建 worktree 后，如果要跑前后端测试或构建，需要分别进入 `client`、`server` 安装依赖；如果本机 Node 版本过新，还会触发原生依赖安装失败。

这次要解决的是依赖治理问题，不涉及业务功能改造。

## 已确认的问题

### 1. server 安装失败

现象：

- 本机 Node 是 `v25.5.0`。
- `server` 使用 `bcrypt@^5.1.0`。
- `bcrypt@5.1.1` 在 Node 25 下没有匹配的预编译包，回退本地编译失败。

项目真实运行环境：

- `server/Dockerfile` 使用 `node:20-alpine`。

结论：

server 的问题不是 `bcrypt` 本身坏了，而是本机 Node 版本超出了项目当前稳定运行口径。项目应该明确 Node 20 为默认开发和构建版本。

### 2. client 需要 `--legacy-peer-deps`

现象：

- `client/package.json` 使用 `echarts@^6.0.0`。
- `client/package.json` 使用 `echarts-wordcloud@^2.1.0`。
- `echarts-wordcloud@2.1.0` 最新版本仍声明 peer dependency：`echarts@^5.0.1`。

结论：

这是前端图表库版本不匹配。`--legacy-peer-deps` 只是绕过 npm 检查，不是根治。当前项目里 `echarts-wordcloud` 只用于偏差分析原因词云，`echarts` 用于多个统计、监控、文档依赖、设备统计页面，所以不能直接删除 `echarts`。更稳的做法是把 `echarts` 降到 ECharts 5 的稳定版本，让它与词云插件匹配。

### 3. 根级依赖入口缺失

现象：

- 根目录没有 `package.json`。
- 每个子项目有自己的 `package-lock.json`。
- 没有统一 `install`、`build`、`test`、`verify` 命令。
- 没有根级 Node 版本声明。

结论：

这会让不同 worktree、不同终端、不同 agent、不同 CI 命令跑出不一致结果。需要建立根级 npm workspace，把项目依赖入口和脚本入口统一起来。

## 目标

1. 固定项目 Node 版本口径，避免 Node 25 这类过新版本破坏原生依赖安装。
2. 修复 `echarts` 与 `echarts-wordcloud` 的 peer dependency 冲突。
3. 建立根级 npm workspace，统一安装、测试、构建、验证入口。
4. 保留现有子项目目录结构，不做业务代码重构。
5. 让 Docker、CI、本地开发、worktree 使用同一套依赖规则。

## 非目标

- 不迁移到 pnpm 或 yarn。
- 不重写前端图表页面。
- 不移除词云功能。
- 不改变业务 API、数据库 schema 或运行时业务逻辑。
- 不把 `node_modules` 提交到 GitHub。
- 不处理所有 npm audit 漏洞；安全依赖升级另开任务处理。

## 设计决策

### 决策 1：使用 npm workspaces

根目录新增 `package.json`：

```json
{
  "name": "noidear",
  "private": true,
  "workspaces": [
    "client",
    "server",
    "mobile",
    "miniprogram",
    "packages/types",
    "tools/noidear-mcp"
  ]
}
```

理由：

- 当前项目已经使用 npm 和 `package-lock.json`。
- npm workspace 迁移成本低于 pnpm workspace。
- 可以先统一入口，不引入新的包管理器学习和 CI 变量。

### 决策 2：Node 默认固定为 20 LTS

根目录新增 `.nvmrc`：

```text
20
```

根目录 `package.json` 增加：

```json
{
  "engines": {
    "node": ">=20 <23",
    "npm": ">=10"
  }
}
```

各 workspace 子项目也增加同样的 `engines.node`，避免单独进入子目录安装时绕开根规则。

理由：

- `server/Dockerfile` 当前已经使用 `node:20-alpine`。
- Node 20 是 LTS，兼容 `bcrypt@5.1.1` 的稳定安装路径。
- `>=20 <23` 允许 Node 20 和 22，排除当前已确认有问题的 Node 25。
- `.nvmrc` 明确推荐默认版本为 Node 20，保证本地与 server Docker 对齐。

### 决策 3：client 降级到 ECharts 5.6

`client/package.json` 改为：

```json
{
  "dependencies": {
    "echarts": "^5.6.0",
    "echarts-wordcloud": "^2.1.0"
  }
}
```

理由：

- `echarts-wordcloud@2.1.0` 最新版仍要求 `echarts@^5.0.1`。
- 降到 `echarts@^5.6.0` 后，npm 可以正常解析 peer dependency。
- 当前项目的 ECharts 使用主要是常规图表能力，ECharts 5.6 足够覆盖。
- 这比继续使用 `--legacy-peer-deps` 更可控。

### 决策 4：统一根 lockfile

实施完成后：

- 保留根目录 `package-lock.json`。
- 删除子项目 `client/package-lock.json`、`server/package-lock.json`、`mobile/package-lock.json`、`miniprogram/package-lock.json`、`tools/noidear-mcp/package-lock.json`。
- 后续统一从根目录执行 `npm install` 或 `npm ci`。

理由：

- npm workspace 的正确用法是根 lockfile 作为唯一依赖锁定来源。
- 多 lockfile 会造成依赖版本漂移，尤其在 worktree 和 CI 中很容易装出不同结果。

### 决策 5：根目录提供统一脚本

根目录 `package.json` 提供这些脚本：

```json
{
  "scripts": {
    "install:all": "npm install",
    "build:client": "npm run build -w client",
    "build:server": "npm run build -w server",
    "test:client": "npm run test -w client",
    "test:server": "npm run test -w server",
    "prisma:generate": "npm run prisma:generate -w server",
    "verify": "npm run build:server && npm run build:client"
  }
}
```

理由：

- 用户和 agent 不需要再判断应该进入哪个子目录。
- 后续 GitHub Actions 和部署脚本可以统一调用根目录命令。
- `verify` 第一版先覆盖 server/client 构建；更重的测试套件后续按模块补充。

### 决策 6：Dockerfile 适配 workspace

Docker build context 需要从子目录提升到仓库根目录。

当前：

```yaml
server:
  build:
    context: ./server
    dockerfile: Dockerfile

client:
  build:
    context: ./client
    dockerfile: Dockerfile
```

目标：

```yaml
server:
  build:
    context: .
    dockerfile: server/Dockerfile

client:
  build:
    context: .
    dockerfile: client/Dockerfile
```

理由：

- workspace 安装依赖需要读取根 `package.json` 和根 `package-lock.json`。
- Dockerfile 仍然分别位于 `server/Dockerfile` 和 `client/Dockerfile`，边界不变。

server Dockerfile 使用：

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json ./server/package.json
RUN npm ci --workspace server --include-workspace-root=false
COPY server ./server
WORKDIR /app/server
RUN npx prisma generate --schema=src/prisma/schema.prisma
RUN npm run build
```

client Dockerfile 使用：

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json ./client/package.json
RUN npm ci --workspace client --include-workspace-root=false
COPY client ./client
WORKDIR /app/client
RUN npm run build
```

说明：

- client 从 Node 18 升到 Node 20，和根版本口径一致。
- server 保持 Node 20。
- production runtime 仍然由 nginx 承载 client 静态文件，server runtime 仍然是 Node 20。

## 目标目录结构

```text
noidear/
  .nvmrc
  package.json
  package-lock.json
  client/
    package.json
  server/
    package.json
  mobile/
    package.json
  miniprogram/
    package.json
  packages/
    types/
      package.json
  tools/
    noidear-mcp/
      package.json
```

## 数据流和执行流

### 本地开发

```bash
nvm use
npm ci
npm run build:server
npm run build:client
```

### worktree 初始化

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/.worktrees/<branch>
nvm use
npm ci
```

如果只改前端：

```bash
npm ci --workspace client --include-workspace-root=false
npm run build:client
```

如果只改后端：

```bash
npm ci --workspace server --include-workspace-root=false
npm run build:server
```

### Docker

```bash
docker compose build server client
docker compose up -d server client
```

Docker 使用根 workspace lockfile，和本地安装解析一致。

## 错误处理

### Node 版本错误

如果用户使用 Node 25 执行：

```bash
npm ci
```

npm 会根据 `engines.node` 给出版本不匹配警告。若团队希望强制阻断，可以在后续增加根目录 `.npmrc`：

```text
engine-strict=true
```

第一版不启用 `engine-strict`，避免立即影响已有开发环境；但文档和 `.nvmrc` 明确要求 Node 20。

### peer dependency 冲突

`echarts` 降到 5.6 后，`npm ci` 不应再需要 `--legacy-peer-deps`。如果仍出现 peer dependency 错误，视为依赖治理失败，需要在实施阶段停止并重新审查 lockfile。

### Docker build 失败

Docker build 失败时优先检查：

1. build context 是否已经改为仓库根目录。
2. Dockerfile 是否复制了根 `package.json` 和根 `package-lock.json`。
3. 是否使用了 `npm ci --workspace <name>`。
4. 对应 workspace 的 `package.json` 是否已被复制到正确路径。

## 验证标准

本地验证：

```bash
node -v
npm -v
npm ci
npm run build:server
npm run build:client
npm run verify
```

预期：

- Node 版本为 20.x 或 22.x。
- `npm ci` 不需要 `--legacy-peer-deps`。
- `server` 不再因为 `bcrypt` 在 Node 25 下编译失败。
- `client` 不再出现 `echarts@6` 与 `echarts-wordcloud@2.1.0` 的 peer dependency 冲突。
- `npm run build:server` 成功。
- `npm run build:client` 成功。

Docker 验证：

```bash
docker compose build server client
```

预期：

- server 镜像使用 Node 20 安装 workspace 依赖并构建成功。
- client 镜像使用 Node 20 安装 workspace 依赖并构建成功。

Git 验证：

```bash
git status --short
git diff --check
```

预期：

- 只包含 workspace 迁移相关文件。
- 无空白错误。

## 迁移风险

### 风险 1：workspace 安装改变依赖树

缓解：

- 使用 npm workspace，避免切换包管理器。
- 一次性生成根 `package-lock.json`。
- 执行 server/client 构建验证。

### 风险 2：ECharts 6 降级到 5.6 影响图表页面

缓解：

- 当前项目主要使用常规 `echarts.init`、`setOption`、`graphic.LinearGradient`、graph/chart 基础能力，ECharts 5.6 支持这些能力。
- 对偏差分析、统计、设备、监控、文档依赖图执行前端构建验证。
- 若发现运行时图表异常，再针对具体页面修复 option 配置。

### 风险 3：Dockerfile context 改动影响部署

缓解：

- 只调整 build context 和 COPY 路径，不改变容器端口、环境变量、volume、服务名。
- 用 `docker compose build server client` 作为硬验证。

### 风险 4：子项目 lockfile 删除后回滚成本

缓解：

- 迁移提交独立成一个 commit。
- 如需回滚，可直接 revert 该 commit 恢复原 lockfile。

## 实施顺序

1. 新增根 `.nvmrc` 和根 `package.json`。
2. 给各 workspace 子项目增加 `engines.node`。
3. 将 `client` 的 `echarts` 降到 `^5.6.0`。
4. 在根目录执行 `npm install` 生成根 `package-lock.json`。
5. 删除子项目 lockfile。
6. 调整 `client/Dockerfile`、`server/Dockerfile`、`docker-compose.yml`。
7. 执行本地 `npm ci`、server/client build。
8. 执行 `docker compose build server client`。
9. 提交 workspace 迁移。

## 验收结论

这个方案是当前选择 npm workspace 前提下的最优方案。它正面处理了两个真实冲突：

- 用 Node 20 口径解决 server `bcrypt` 在 Node 25 下安装失败的问题。
- 用 ECharts 5.6 解决 `echarts` 与 `echarts-wordcloud` 的 peer dependency 冲突。

同时，它把项目从分散子项目依赖管理推进到根级 npm workspace，降低后续 worktree、CI、Docker 和 agent 操作的不一致风险。

## 自检

- 无业务功能改造。
- 无数据库 schema 改造。
- 无未定义的包管理器切换。
- Node、ECharts、Docker、workspace、lockfile 的决策互相一致。
- 方案可回滚，迁移提交可独立 revert。
