# Agent 操作指南

> 本文档是 `noidear` 的项目特有补充协议中心。`AGENTS.md` 只负责根入口、阅读顺序和食品安全 hard gate；本文件承接运行时权威链、追溯协议、MCP/API/测试操作。

## 1. 文档优先级

1. `/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单`
2. `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`
3. `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思`
4. `server/src/prisma/schema.prisma`

## 2. Hard Gates

以下任务必须继续读取 `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`：

- 食品安全 SaaS
- 283 张源表单
- 主数据、批次、追溯、召回
- 仓储 / 制造 / 品质 / 质检 / 研发跨模块关系
- 决定 `RecordTemplate/Record` 和独立业务表如何取舍

## 3. Task Triggers

命中以下任一条件，视为食品安全领域任务：

- 食品安全 SaaS
- 表单 / 记录表单 / 模板 / 283 张源表单
- 产品 / 物料 / 供应商 / 客户 / 员工 / 位置
- 物料批次 / 生产批次 / 成品批次
- 正追 / 反追 / 物料平衡 / 召回 / 投诉 / 不合格 / 返工
- 决定 `RecordTemplate/Record` 和独立业务表如何取舍

## 4. Behavior Constraints

### 4.1 先判断对象类型

先判断当前任务处理的是：主数据、批次数据、桥接关系、过程/检验记录、治理记录、还是通用动态表单。

### 4.2 不得复制主数据

系统已有统一语义的 `Product`、`Material`、`Supplier`、`Employee`、`Location` 不能在下游模块再创建平行事实源。

### 4.3 批次问题必须回到主链

涉及投料、来料、放行、留样、发货、投诉、召回、正追、反追、物料平衡时，必须从以下链路出发：

`MaterialLot(MaterialBatch) <-> IngredientUsage(BatchMaterialUsage) <-> ProductionBatch`

### 4.4 表单不自动等于独立表

任何表单落表前，先判断它是核心业务对象、桥接记录、治理记录，还是动态表单表现层。

### 4.5 业务名和代码名分开用

讨论业务关系时使用业务标准名，例如 `MaterialLot`、`IngredientUsage`；查看代码和 schema 时使用实现名，例如 `MaterialBatch`、`BatchMaterialUsage`。

## 5. Conflict Handling

发现冲突时必须：

1. 说明冲突发生在哪两个层级之间
2. 区分命名差异还是语义差异
3. 命名差异保留双口径说明
4. 语义差异按高优先级文档处理
5. 会影响实现边界时，必须写进当前 spec 或 plan

## 6. Continue To Operational Tools

完成上述阅读和判断后，再使用下方 MCP、API、测试与运行说明。

## Model Landing Runtime Contract

当任务依赖冻结的 model-landing 映射时，以下三个文件为运行时真实来源：

- `docs/superpowers/specs/2026-04-24-model-landing-layer-design.md`
- `docs/superpowers/specs/2026-04-24-model-landing-layer-form-expansion.csv`
- `server/src/modules/model-landing/generated/model-landing.generated.ts`

在信任对 generated artifact 的任何修改前，先运行：

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npm run model-landing:verify
```

除非冻结 spec 显式更新，否则不得在实现工作中对 283 张表单重新分类。

## Traceability Query Layer

实现或修改 `/traceability` 时，必须将以下文件视为冻结权威链：

1. `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`
2. `docs/superpowers/specs/2026-04-24-model-landing-layer-design.md`
3. `docs/superpowers/specs/2026-04-24-model-landing-layer-form-expansion.csv`
4. `docs/superpowers/specs/2026-04-24-traceability-query-layer-design.md`

不得在客户端代码、报告构建器或导出处理器中构造平行的追溯链。所有查询必须经过 `TraceabilityQueryService`，合规联动必须经过 `TraceabilityLinkageService`，异步导出必须使用 `TraceabilityExportService` + `TraceabilitySnapshot` 模型。

验证命令：

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npm run traceability:test
```

### Traceability API Contract

修改追溯请求或响应字段时，必须遵循以下权威链：

1. `docs/superpowers/specs/2026-04-24-traceability-query-api-contract-design.md`
2. `packages/types/traceability.ts`（共享类型定义）
3. `server/src/modules/traceability/`（后端实现）
4. `client/src/api/traceability.ts`（前端适配器）

禁止在页面、导出处理器或 E2E 测试中使用临时字段（如旧的 `sourceQueryHash`）。所有追溯请求字段均以 `packages/types/traceability.ts` 为唯一真实来源。

## 7. MCP / API / 运行操作

---

## 快速开始

```bash
# 1. 确认 MCP 已连接
# 在 Claude Code 中执行 /mcp 查看 noidear-mcp 是否已连接

# 2. 确认服务正常
health_check()

# 3. 了解系统当前可用 API
discover()
# 或按模块过滤
discover({ module: 'process' })
```

## 常用操作最短路径

### 走一遍研发流程（9步）

```
1. call_api({ path: '/process/templates/default', method: 'GET' })
   → 返回 ProcessTemplate 对象，从 response.data.id 中取 templateId

2. call_api({ path: '/process/instances', method: 'POST', body: { templateId, productName: '产品名称' } })
   → 获取 instanceId（response.data.id）

3. call_api({ path: '/process/instances/<instanceId>/steps', method: 'POST', body: {
     stepNumber: 1,
     data: { productName: '产品名称', processType: '全蛋工艺', shelfLife: '30天' },
     saveAsDraft: false
   } })
   → currentStep 变为 2

4-9. 重复步骤3，stepNumber 递增，填入对应步骤数据
     Step7/8 提交后需额外调用 approve：
     call_api_as({ role: 'admin', path: '/process/instances/<id>/approve', method: 'POST', body: {
       stepNumber: 7, action: 'approve', comment: '审批通过'
     } })
```

### 查询仓库物料

```
call_api({ path: '/warehouse/materials', method: 'GET', query: { status: 'active', limit: 50 } })
```

### 查询研发流程列表

```
call_api({ path: '/process/instances', method: 'GET' })
```

### 运行系统自检

```
health_check()           # 检查所有服务
get_logs('server')       # 查看最近错误日志
run_tests('process')     # 跑研发流程 E2E 测试
```

---

## 系统账号说明

| 用途 | 说明 |
|------|------|
| Admin 账号 | 凭据通过环境变量配置，查阅部署文档获取 |
| HACCP 角色 | 使用 `call_api_as({ role: 'admin', ... })` 模拟（admin 有全部权限）|
| 测试数据 | 测试后记得清理，或使用带 `E2E-` 前缀的产品名便于识别 |

---

## 工具完整列表

| 工具 | 参数 | 说明 |
|------|------|------|
| `discover` | `{ module?: string }` | 读 Swagger，返回可用 API。注意：module 过滤基于 Swagger tag 的小写包含匹配，中文 tag 用英文关键词（如 'process'）过滤可能无效，建议先用 `discover()` 不带参数查看全部再过滤。 |
| `call_api` | `{ path, method, body?, query? }` | admin 身份调用 API。示例：`call_api({ path: '/warehouse/materials', method: 'GET', query: { status: 'active', limit: 50 } })` |
| `call_api_as` | `{ role, path, method, body? }` | 指定角色调用 API。示例：`call_api_as({ role: 'admin', path: '/process/instances/<id>/approve', method: 'POST', body: { stepNumber: 7, action: 'approve' } })` |
| `health_check` | 无 | 所有服务健康状态 |
| `get_logs` | `{ service, lines?, level? }` | Docker 容器日志 |
| `query_db` | `{ sql }` | 只读 SQL 查询（SELECT only）|
| `restart_service` | `{ service }` | 重启 Docker 容器 |
| `run_migration` | 无 | 执行 Prisma migrate deploy |
| `run_tests` | `{ flow? }` | 触发 Playwright E2E 测试 |
| `get_test_report` | 无 | 获取最近测试结果 |

---

## oh-my-opencode 使用说明

本项目已集成 [oh-my-opencode](https://github.com/oh-my-opencode/oh-my-opencode) 智能体框架：

```bash
# 安装
npm install -g oh-my-opencode

# 配置（支持 Kimi K2.6 和 GPT-5.4）
omp config set model kimi-k2.6    # 或 gpt-5.4
omp config set api_key <your_key>

# 常用命令
omp run                         # 启动交互式会话
omp run --task "修复登录页面的429错误"    # 单任务模式
omp status                      # 查看当前配置
```

**推荐工作流**：
1. 使用 `omp run --task` 执行明确的单任务
2. 复杂任务拆分为多个子任务，利用上下文保持连贯性
3. 使用 `call_api_as({ role: 'admin', ... })` 进行权限测试

## ultrawork 使用提示

**ultrawork** 是 oh-my-opencode 的增强插件，提供：
- 自动代码审查（每次提交前运行 ESLint + Prettier）
- 智能上下文管理（自动注入相关文件到 prompt）
- 批量重构支持（跨文件变量重命名、接口迁移）

```bash
# 启用 ultrawork 增强模式
omp run --ultrawork

# 批量重构示例
omp refactor --from OldComponent --to NewComponent --path client/src/views
```

---

## Convergence Authority

When a frozen traceability contract or traceability primary route exists, legacy routes, legacy pages, and legacy adapters may remain only as short-lived bridge layers. New work must land on the authoritative route, contract, and test baseline.

- **Authoritative route:** `/traceability` → `TraceabilityQuery.vue`
- **Authoritative adapter:** `client/src/api/traceability.ts`
- **Authoritative contract:** `packages/types/traceability.ts`
- **Authoritative server module:** `server/src/modules/traceability/`
- **Legacy bridges (deprecation only):** `/batch-trace/trace/*`, `/warehouse/traceability/*`
- **Execution register:** `docs/superpowers/reports/2026-04-25-contract-cleanup-convergence-register.md`

## Hard Cutover Rule

When the traceability primary surface has been established, legacy traceability pages, routes, adapters, and payload vocabularies may remain only as short-lived bridges or local-only functions. They may not continue to act as alternate primary traceability authorities.

**Gate checks before any new traceability work:**
1. Does the new work land on `/traceability` route and `client/src/api/traceability.ts`?
2. Does the new work use field names from `packages/types/traceability.ts` only?
3. Does the new work go through `server/src/modules/traceability/`?

If the answer to any of these is no, the work must be redirected to the authority path first.

## Internal Go-Live Gate

Internal formal trial operation requires zero known issues in release scope, one primary traceability authority, complete release evidence, and explicit sign-off. Monitoring and rollback readiness protect trial operation but do not substitute for remediation.

## 已知限制

- `query_db` 只支持 `SELECT`，写操作会被拒绝并返回错误
- `discover()` 需要后端服务运行才能读取 Swagger
- `run_tests` 超时设置为 120 秒，复杂流程可能需要更长时间
- Step7/8 审批在测试环境中使用 `call_api_as({ role: 'admin', ... })` 执行
