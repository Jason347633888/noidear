# Agent 操作指南

> 本文档是 `noidear` 的 agent 操作协议中心。所有 agent 在进入实现、改 schema、改接口、改行为前，必须先读完本文件要求的前置文档和硬规则。

## 1. 文档优先级

1. `/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单`
2. `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`
3. `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思`
4. `server/src/prisma/schema.prisma`

## 2. Mandatory Reading

所有 agent 必须先读：

1. `AGENTS.md`
2. `docs/AGENT_GUIDE.md`

如果任务涉及食品安全、283 张表单、主数据、批次、追溯、召回、仓储/制造/品质跨模块关系，必须继续读：

3. `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`

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

## 7. MCP / API / 运行操作

> **源表单口径**: 当前四级记录表单口径以 `/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单` 为唯一事实源；截至2026-04-23，源表单为283张。`SaaS产品构思` 是字段映射和产品语义参考层，项目实现以 `noidear` 为落地点。
>
> 本文档为 Claude Code 通过 noidear-mcp 操作系统提供最短路径指引。

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

## 已知限制

- `query_db` 只支持 `SELECT`，写操作会被拒绝并返回错误
- `discover()` 需要后端服务运行才能读取 Swagger
- `run_tests` 超时设置为 120 秒，复杂流程可能需要更长时间
- Step7/8 审批在测试环境中使用 `call_api_as({ role: 'admin', ... })` 执行
