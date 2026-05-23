# Agent 操作指南

本文档是 `noidear` 唯一的顶层项目操作协议。`AGENTS.md` 是短入口；本文件承接当前代码事实、运行方式、食品安全 hard gate、追溯与 model-landing 约束。

## 1. 当前权威链

处理任务时按以下顺序判断事实来源：

1. 当前代码：`server/src/`、`client/src/`、`packages/types/`、`server/src/prisma/schema.prisma`。
2. 项目协议：`AGENTS.md`、`docs/AGENT_GUIDE.md`。
3. 食品安全主数据与追溯：`docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`。
4. 稳定语义与决策：`CONTEXT.md`、`docs/decisions/`。
5. 历史执行资料：`archive/superpowers/`。这些只作背景，不能覆盖当前代码。

已退役的 Multica GAP 调度台不再是事实源，不再更新其索引、排期或校验脚本。

## 2. 食品安全 Hard Gate

任务涉及以下内容时，必须先读 `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`，再做设计、实现或 schema 决策：

- 食品安全 SaaS、283 张源表单、记录表单、模板。
- 产品、物料、供应商、客户、员工、位置。
- 物料批次、生产批次、投料、配方、工序、CCP。
- 正追、反追、物料平衡、召回、投诉、不合格、返工、CAPA。
- 仓储、制造、QA/QC、研发跨模块链路。
- 判断 `RecordTemplate/Record` 与独立业务表的边界。

## 3. 业务对象判断

开始实现前先判断对象类型：

- 主数据：`Product`、`Material`、`Supplier`、`ExternalParty`、`User`、`Department`、`WorkshopArea`、`Role`。
- 批次数据：`MaterialBatch`、`ProductionBatch`。
- 桥接关系：`BatchMaterialUsage`、`RecipeLine`、`PackagingMaterialUsage`、`BusinessDocumentLink`。
- 过程/检验记录：`IncomingInspection`、`CCPRecord`、`EnvironmentRecord`、`ProcessMonitorRecord`、`MetalDetectionLog`。
- 治理记录：`NonConformance`、`CorrectiveAction`、`CustomerComplaint`、`ProductRecall`、`ManagementReview`。
- 动态表单：`RecordTemplate`、`Record`、`RecordTaskAssignment`、`RecordTaskInstance`。

不得为已有主数据或批次链路创建平行事实源。

## 4. 命名口径

业务讨论使用标准名，代码实现使用当前模型名：

| 业务名 | 当前代码名 |
|---|---|
| MaterialLot | `MaterialBatch` |
| IngredientUsage | `BatchMaterialUsage` |
| ProcessRecord | `ProcessMonitorRecord` / `ProcessRecord` 相关模块 |
| ProductRecall | `ProductRecall`、`ProductRecallBatch`、`ProductRecallNotification`、`ProductRecallEvidence` |
| DocumentApproval | 当前项目无历史业务数据；旧 `Approval` 不再保留兼容。文档审批统一走 `ApprovalInstance` / `ApprovalTask` / `ApprovalAction` |

## 5. 运行环境

项目是 npm workspaces：

- `client`：Vue 3 + Vite + Element Plus。
- `server`：NestJS + Prisma。
- `packages/types`：共享类型。

Node 要求来自 `package.json` 和 `.nvmrc`：

```bash
nvm use
npm ci
```

不要使用 Node 25 安装后端依赖；`bcrypt` 在该版本可能安装失败。

常用根命令：

```bash
npm run build:server
npm run build:client
npm run typecheck:types
npm run verify
npm run verify:full
```

## 6. 后端运行合同

代码事实来自 `server/src/main.ts`：

- 全局 API 前缀：`/api/v1`。
- Swagger：`/api/docs`，生产环境仅在 `SWAGGER_ENABLED=true` 时启用。
- 响应由 `ResponseInterceptor` 包装。
- 异常由 `HttpExceptionFilter` 处理。
- 全局 `ValidationPipe` 开启 `whitelist`、`transform`、`forbidNonWhitelisted`。
- 启用 Helmet、CORS、静态 `/uploads/`。

认证事实来自 `server/src/modules/auth`：

- 登录：`POST /api/v1/auth/login`。
- 当前用户：`GET /api/v1/auth/profile`。
- 改密码：`PATCH /api/v1/auth/change-password`。
- JWT payload 必须包含 `companyId`，缺失视为认证上下文错误。
- 前端请求封装在 `client/src/api/request.ts`，默认 baseURL 为 `/api/v1`，响应拦截器会解包 `data`。

## 7. Docker 服务

`docker-compose.yml` 当前定义：

| 服务 | 端口 |
|---|---|
| PostgreSQL | 5432 |
| Redis | 6379 |
| MinIO API | 9000 |
| MinIO Console | 9001 |
| Server | 3000 |
| Client nginx | 80 |

本地开发只需要基础依赖时可先启动：

```bash
docker compose up -d postgres redis minio
```

## 8. 隔离要求

执行实现计划时不要在主 checkout 直接写业务代码。执行 agent 应从最新 `origin/master` 创建独立 worktree，或使用 Multica 隔离目录。

```bash
git fetch origin master
git worktree add /Users/jiashenglin/Desktop/好玩的项目/noidear-<task> -b codex/<task> origin/master
git worktree list --porcelain
pwd
git branch --show-current
```

主 checkout 可以用于阅读、规划、文档整理和 review；实现 PR 在隔离 worktree 完成。

## 9. Traceability 合同

修改 `/traceability` 时必须遵守：

1. `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`
2. `archive/superpowers/specs/2026-04-24-traceability-query-layer-design.md`
3. `archive/superpowers/specs/2026-04-24-traceability-query-api-contract-design.md`
4. `packages/types/traceability.ts`
5. `server/src/modules/traceability/`
6. `client/src/api/traceability.ts`

页面、导出和测试不得构造平行追溯链。查询走 `TraceabilityQueryService`，联动走 `TraceabilityLinkageService`，导出和快照走 `TraceabilityExportService` + `TraceabilitySnapshot`。

验证命令：

```bash
npm run traceability:test -w server
npm run traceability:verify -w server
```

## 10. Model Landing 合同

当任务依赖 283 张表单落地映射时，当前运行时真实来源为：

- `archive/superpowers/specs/2026-04-24-model-landing-layer-design.md`
- `archive/superpowers/specs/2026-04-24-model-landing-layer-form-expansion.csv`
- `server/src/modules/model-landing/generated/model-landing.generated.ts`

在信任 generated artifact 前运行：

```bash
npm run model-landing:verify -w server
```

除非冻结 spec 显式更新，不要重新分类 283 张表单。

## 11. 项目结构速查

```text
noidear/
├── client/              # Vue 3 + Vite + Element Plus
├── server/              # NestJS + Prisma
├── packages/types/      # 共享类型
├── docs/                # Agent 协议、食品安全 hard gate
└── archive/             # 历史执行资料和旧导入材料
```

当前 npm workspaces：

- `client`
- `server`
- `packages/types`

前端信息架构以 `client/src/navigation/menu.ts` 为准。新增页面必须同时检查路由、菜单、API 适配、登录态和权限。

后台业务页使用操作工具风格：列表、筛选、详情、抽屉、对话框、状态反馈。不要新增营销式首页或装饰性长页面。

## 12. 常用定位

| 任务 | 优先查看 |
|---|---|
| API 路由 | `server/src/modules/**/**.controller.ts` |
| 业务事务 | `server/src/modules/**/**.service.ts` |
| 数据模型 | `server/src/prisma/schema.prisma` |
| 前端 API | `client/src/api/*.ts` |
| 前端路由 | `client/src/router/index.ts` |
| 侧边菜单 | `client/src/navigation/menu.ts` |
| 当前用户 | `client/src/stores/user.ts` |
| 共享合同 | `packages/types/*.ts` |

## 13. 文档收敛规则

- 文档更新必须能追到当前代码事实；不要用旧设计文档覆盖代码。
- 顶层 `docs/` 只保留本文件和 `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`。
- README 负责面向人的项目总览；SECURITY 负责安全说明；llms.txt 负责短索引。
- 需求、设计、交互、结构、业务规则不要再拆成平行顶层文档。
- 新的稳定决策放 `docs/decisions/`，执行过程资料放 `archive/superpowers/`。
- 历史执行资料只能作背景，不能作为当前完成度、排期或代码事实源。
