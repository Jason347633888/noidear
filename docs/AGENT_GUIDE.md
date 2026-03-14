# Agent 操作指南

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
1. call_api('/process/templates/default', 'GET')
   → 获取 templateId

2. call_api('/process/instances', 'POST', { templateId, productName: '产品名称' })
   → 获取 instanceId

3. call_api('/process/instances/<instanceId>/steps', 'POST', {
     stepNumber: 1,
     data: { productName: '产品名称', processType: '全蛋工艺', shelfLife: '30天' },
     saveAsDraft: false
   })
   → currentStep 变为 2

4-9. 重复步骤3，stepNumber 递增，填入对应步骤数据
     Step7/8 提交后需额外调用 approve：
     call_api_as('admin', '/process/instances/<id>/approve', 'POST', {
       stepNumber: 7, action: 'approve', comment: '审批通过'
     })
```

### 查询仓库物料

```
call_api('/warehouse/materials', 'GET', null, { status: 'active', limit: 50 })
```

### 查询研发流程列表

```
call_api('/process/instances', 'GET')
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
| HACCP 角色 | 使用 `call_api_as('admin', ...)` 模拟（admin 有全部权限）|
| 测试数据 | 测试后记得清理，或使用带 `E2E-` 前缀的产品名便于识别 |

---

## 工具完整列表

| 工具 | 参数 | 说明 |
|------|------|------|
| `discover` | `{ module?: string }` | 读 Swagger，返回可用 API |
| `call_api` | `{ path, method, body?, query? }` | admin 身份调用 API |
| `call_api_as` | `{ role, path, method, body? }` | 指定角色调用 API |
| `health_check` | 无 | 所有服务健康状态 |
| `get_logs` | `{ service, lines?, level? }` | Docker 容器日志 |
| `query_db` | `{ sql }` | 只读 SQL 查询（SELECT only）|
| `restart_service` | `{ service }` | 重启 Docker 容器 |
| `run_migration` | 无 | 执行 Prisma migrate deploy |
| `run_tests` | `{ flow? }` | 触发 Playwright E2E 测试 |
| `get_test_report` | 无 | 获取最近测试结果 |

---

## 已知限制

- `query_db` 只支持 `SELECT`，写操作会被拒绝并返回错误
- `discover()` 需要后端服务运行才能读取 Swagger
- `run_tests` 超时设置为 120 秒，复杂流程可能需要更长时间
- Step7/8 审批在测试环境中使用 `call_api_as('admin', ...)` 执行
