# noidear 食品安全与质量管理平台

> 面向食品生产企业的质量、文控、研发、仓储、追溯、培训、内审与运营管理系统。

[![Node](https://img.shields.io/badge/node-20.x-brightgreen.svg)](.nvmrc)
[![Frontend](https://img.shields.io/badge/frontend-Vue%203%20%2B%20Element%20Plus-409eff.svg)](client)
[![Backend](https://img.shields.io/badge/backend-NestJS%2010%20%2B%20Prisma-e0234e.svg)](server)
[![Deploy](https://img.shields.io/badge/deploy-Docker%20Compose-2496ed.svg)](docker-compose.yml)

---

## 项目概览

`noidear` 是一个食品安全与质量管理 SaaS 原型/平台，覆盖从体系文件、记录表单、产品研发、仓储批次到追溯查询的完整业务链路。当前事实以代码为准；283 张四级记录表单的落地映射由 `server/src/modules/model-landing/generated/model-landing.generated.ts` 和相关 spec artifact 表达。

当前代码库包含：

- `client/`：Vue 3 + TypeScript + Element Plus 前端应用
- `server/`：NestJS + Prisma 后端 API
- `packages/types/`：前后端共享 TypeScript 类型
- `tools/noidear-mcp/`：面向 Agent 的 MCP 工具服务
- `mobile/`：移动端/同步相关能力
- `monitoring/`：Prometheus、Grafana、Loki、Alertmanager 配置
- `docs/`：Agent 协议、食品安全主数据与追溯 hard gate
- `archive/`：历史执行资料和旧导入材料，不作为当前事实源

---

## 核心能力

### 文控与记录表单

- 体系文件管理、版本控制、审批、归档、作废、回收站
- 记录表单索引、编号规则、文控工作台、阅读确认、培训需求、影响分析
- 动态表单、字段组件、记录填报、任务派发、逾期与锁定控制

### 食品安全主链路

- 产品、物料、供应商、外部方、仓库、批次、生产批次等主数据
- 仓库物料、批次、领料、FIFO、配料区库存、物料平衡
- 统一追溯查询入口 `/traceability`，收敛旧批次追溯与仓库追溯路径
- 来料检验、不合格品、纠正措施、顾客投诉、返工/回料、召回相关链路基础

### 研发、生产与质量过程

- 产品研发流程，含模板化审批、步骤顺序推进、打印视图
- 配方管理、工序步骤/CCP、配料执行、车间暂存、班次看板
- 环境温湿度、过程参数、金属探测、清洁消毒、换产检查、玻璃及硬塑完整性检查
- 偏差检测、偏差报告、统计分析、数据导出

### 组织、权限与工作流

- 用户、角色、部门、RBAC、细粒度权限、部门权限、权限审计
- 通用审批、统一审批、工作流模板、工作流实例、我的待办
- 登录日志、权限日志、敏感操作日志、全局搜索、导入导出

### 培训、内审与运营

- 培训计划、培训项目、题库、考试、档案、统计
- 内审计划、审核执行、整改、复审验证、报告
- 设备台账、维保计划、故障报修、测量设备校准
- 健康检查、备份管理、系统监控、告警规则、告警历史

### Agent 与自动化

- `AGENTS.md` 作为根入口，`docs/AGENT_GUIDE.md` 承接项目操作协议
- `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 作为食品安全主数据与追溯 hard gate
- `llms.txt` 提供系统能力、API、认证和 MCP 入口摘要
- `tools/noidear-mcp/` 提供 API 发现、调用、运维和测试类工具

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3.4+、TypeScript、Vite 5、Element Plus、Pinia、Vue Router、ECharts、Vitest、Playwright |
| 后端 | Node.js 20、NestJS 10、TypeScript、Prisma 5、Jest、Swagger |
| 数据 | PostgreSQL 15、Redis 7、MinIO |
| 监控 | Prometheus、Grafana、Alertmanager、Loki、Promtail |
| 部署 | Docker、Docker Compose、Nginx |
| 自动化 | npm workspaces、MCP server、共享类型包 |

---

## 快速开始

### 环境要求

- Node.js 20.x（见 `.nvmrc`）
- npm 10+
- Docker 与 Docker Compose

不要使用 Node 25 安装后端依赖，`bcrypt` 在该版本下可能安装失败。

### 本地开发

```bash
# 1. 切换 Node 版本并安装依赖
nvm use
npm ci

# 2. 启动基础服务与监控组件
docker compose up -d postgres redis minio prometheus grafana alertmanager loki promtail

# 3. 配置后端环境变量（匹配 docker-compose.yml 的本地账号和端口）
cat > server/.env <<'EOF'
DATABASE_URL="postgresql://noidear:noidear123@localhost:5432/document_system"
JWT_SECRET="change-me-local-dev-secret-at-least-32-characters"
JWT_EXPIRES_IN="7d"
REDIS_URL="redis://localhost:6379"
MINIO_ENDPOINT="localhost"
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY="admin"
MINIO_SECRET_KEY="noidear123"
CORS_ORIGIN="http://localhost:5173"
EOF

# 4. 初始化 Prisma
npm run prisma:generate
cd server
npx prisma db push --schema=src/prisma/schema.prisma
cd ..

# 5. 启动后端
npm run start:dev -w server

# 6. 新终端启动前端
npm run dev -w client
```

### Docker 运行

```bash
docker compose up -d
```

### 访问地址

| 服务 | 地址 |
|------|------|
| 前端开发服务 | http://localhost:5173 |
| Docker 前端 | http://localhost |
| 后端 API | http://localhost:3000/api/v1 |
| Swagger UI | http://localhost:3000/api/docs |
| Swagger JSON | http://localhost:3000/api/docs-json |
| MinIO 控制台 | http://localhost:9001 |
| Grafana | http://localhost:3001 |
| Prometheus | http://localhost:9090 |
| Alertmanager | http://localhost:9093 |

默认登录账号：

```text
用户名: admin
密码: ChangeMe123!
```

---

## 常用命令

在仓库根目录优先使用 npm workspaces：

```bash
# 安装
npm ci

# 构建
npm run build:server
npm run build:client
npm run build:mcp
npm run verify
npm run typecheck:types

# Prisma
npm run prisma:generate
npm run prisma:migrate -w server
npm run prisma:seed -w server

# 测试
npm run test:server
npm run test:client
npm run test:e2e -w client

# 追溯专项验证
npm run traceability:test -w server
npm run traceability:verify -w server

# Model Landing artifact 验证
npm run model-landing:verify -w server
```

---

## 项目结构

```text
noidear/
├── AGENTS.md                    # Agent 根入口：阅读顺序与 hard gate
├── CLAUDE.md                    # Claude 入口代理
├── llms.txt                     # Agent/LLM 快速入口
├── docker-compose.yml           # 本地与部署编排
├── client/                      # Vue 3 前端
│   ├── src/api/                 # API 适配层
│   ├── src/components/          # 通用组件与字段组件
│   ├── src/router/              # 路由表
│   ├── src/stores/              # Pinia stores
│   ├── src/views/               # 业务页面
│   └── e2e/                     # Playwright E2E
├── server/                      # NestJS 后端
│   ├── src/common/              # 公共装饰器、过滤器、拦截器、管道
│   ├── src/modules/             # 业务模块
│   ├── src/prisma/              # Prisma schema、migrations、seed
│   └── test/                    # 后端 E2E 测试
├── packages/types/              # 共享类型定义
├── tools/noidear-mcp/           # MCP 工具服务
├── monitoring/                  # Prometheus/Grafana/Loki/Alertmanager
├── mobile/                      # 移动端相关能力
├── docs/                        # Agent 协议、食品安全 hard gate
└── archive/                     # 历史执行资料和旧导入材料
```

---

## 关键文档

| 文档 | 说明 |
|------|------|
| [AGENTS.md](AGENTS.md) | Agent 根入口，定义阅读顺序和食品安全 hard gate |
| [docs/AGENT_GUIDE.md](docs/AGENT_GUIDE.md) | 项目操作协议、代码定位、运行合同和文档收敛规则 |
| [docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md](docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md) | 食品安全主数据、批次、记录表单与追溯 hard gate |
| [llms.txt](llms.txt) | LLM/Agent 系统能力入口 |
| [SECURITY.md](SECURITY.md) | 安全说明 |

---

## 开发约束

- 保持 Vue 3 + Element Plus + NestJS + Prisma 的既有技术路线
- 涉及食品安全、主数据、批次、追溯、召回、投诉、不合格、返工等任务时，先阅读 `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`
- 不要复制主数据事实源；产品、物料、供应商、员工、位置等统一从既有主数据模型出发
- 追溯查询统一走 `server/src/modules/traceability/` 与 `packages/types/traceability.ts`
- 敏感配置必须使用环境变量，不要硬编码密钥

---

## 许可证

MIT License
