# GAP-304 多租户 company_id 隔离设计

## 1. 背景

`GAP-304` 来自模块使用审计：

- 模块：品质、质检、放行、追溯、投诉、召回、CAPA
- 严重级别：P0
- 当前问题：多个质量记录服务将 `company_id` 硬编码为 `'1'`
- 直接后果：SaaS 多公司场景下，不同公司的质量、投诉、CAPA、CCP 记录可能互相可见或写入同一个租户空间

本 spec 是主 agent 按 历史 Multica GAP 调度台入口 定义的流程生成：

```text
brainstorming -> grill-with-docs -> writing-plans
```

其中 `brainstorming` 阶段用于形成方案初稿；`grill-with-docs` 阶段已对照以下文件校准：

- `docs/AGENT_GUIDE.md`
- `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`
- 历史 Multica GAP 模块文档
- 历史 Multica GAP 模块文档
- 历史 Multica GAP 模块文档
- `server/src/modules/auth/auth.service.ts`
- `server/src/modules/auth/auth.strategy.ts`
- `server/src/prisma/schema.prisma`

## 2. 当前证据

### 2.1 GAP 记录

历史 Multica GAP 模块文档 中 `GAP-304` 记录：

```text
所有 QC 记录模块中 company_id 均硬编码为 '1'，不支持多租户
```

已登记证据文件包括：

- `server/src/modules/ccp/ccp.service.ts`
- `server/src/modules/non-conformance/non-conformance.service.ts`
- `server/src/modules/corrective-action/corrective-action.service.ts`
- `server/src/modules/customer-complaint/customer-complaint.service.ts`

历史 Multica GAP 模块文档 还将同类问题扩展到：

- `server/src/modules/rework-record/rework-record.service.ts`

### 2.2 代码现状

已确认当前代码存在以下硬编码：

```text
server/src/modules/ccp/ccp.service.ts
  company_id: '1'
  where: { company_id: '1' }

server/src/modules/non-conformance/non-conformance.service.ts
  company_id: '1'
  findAll(status) 未按 company_id 过滤
  dispose(id) 未按 company_id 校验记录归属

server/src/modules/corrective-action/corrective-action.service.ts
  company_id: '1'
  findAll(status) 未按 company_id 过滤
  findById/update/close 未按 company_id 校验记录归属

server/src/modules/corrective-action/verification-record.service.ts
  where: { id: capaId, company_id: '1' }
  company_id: '1'
  listVerifications(capaId) 未按 company_id 校验 CAPA 归属

server/src/modules/corrective-action/capa-analytics.service.ts
  where: { company_id: '1', ... }

server/src/modules/customer-complaint/customer-complaint.service.ts
  company_id: '1'
  findAll(status) 未按 company_id 过滤
  resolve(id) 未按 company_id 校验投诉归属
```

### 2.3 认证上下文冲突

历史 Multica GAP 模块文档 建议“从认证 JWT 中动态提取 company_id”，但当前认证代码不满足这个前提：

```text
AuthService.login() JWT payload:
  { sub, username, role, name }

JwtStrategy.validate() req.user:
  { id, username, role, name }

User model:
  当前无 company_id / companyId 字段
```

因此，GAP-304 不能只改服务层；必须先定义统一的认证租户口径。

## 3. 设计目标

1. 认证后的请求必须有统一 `companyId`。
2. 质量链路所有写入必须使用 `req.user.companyId` 写入 `company_id`。
3. 质量链路所有查询、详情、更新、关闭、验证、统计必须按 `company_id` 过滤。
4. 不能继续出现 `company_id: '1'` 作为业务代码路径。
5. 现有单租户数据必须保持可用，默认归属公司为 `'1'`。
6. 本次只修多租户隔离，不顺手实现 GAP-303、GAP-305、GAP-600 等下游功能。

## 4. 统一术语

### 公司 ID / companyId

当前实现层统一使用 `company_id` 字段表示租户边界。业务讨论中称为“公司 ID”。

本轮不引入新的 `Tenant` 模型，不新建平行事实源。实现层统一暴露为：

```ts
req.user.companyId
```

数据库仍沿用各业务表已有字段：

```text
company_id
```

## 5. 设计决策

### 5.1 认证上下文补齐 companyId

给 `User` 模型增加租户字段：

```prisma
company_id String @default("1")
```

原因：

- 当前没有 `Company` 模型。
- 当前大量业务表的 `company_id` 是 `String`。
- 现有单租户数据均使用 `'1'`。
- 加默认值可以让历史用户自然落入现有公司空间，不破坏登录。

登录和 SSO 生成 JWT 时必须写入：

```ts
{
  sub: user.id,
  username: user.username,
  role: user.role,
  name: user.name,
  companyId: user.company_id
}
```

`JwtStrategy.validate()` 必须返回：

```ts
{
  id: payload.sub,
  userId: payload.sub,
  username: payload.username,
  role: payload.role,
  name: payload.name,
  companyId: payload.companyId
}
```

为兼容旧 token，可在实现计划中使用安全兜底：

```ts
companyId: payload.companyId ?? "1"
```

但新 token 必须包含 `companyId`。

### 5.2 服务层接收 companyId，不自行猜测

Controller 从 `req.user.companyId` 取值并传入 service。

Service 方法签名必须显式包含 `companyId`：

```ts
create(dto, userId, companyId)
findAll(companyId, query)
findById(id, companyId)
updateStatus(id, status, companyId)
close(id, userId, companyId)
```

禁止 service 内部继续写：

```ts
company_id: "1"
```

也不允许 service 自己从全局变量、环境变量或固定默认值推断公司。

### 5.3 查询和变更必须同时校验 id + company_id

所有读取列表必须加：

```ts
where: { company_id: companyId, ... }
```

所有详情、更新、关闭、验证、处置类操作必须先用 `id + company_id` 找记录；找不到时返回原有“对象不存在”语义。

不要只用：

```ts
where: { id }
```

否则用户可以通过 ID 操作其他公司的记录。

### 5.3.1 ProductionBatch 归属不在本轮强行补齐

`grill-with-docs` 校准后确认：当前 `ProductionBatch` 模型没有 `company_id` 字段。它通过 `batchNumber`、`productId`、`recipeId`、`productionDate`、`team_id`、`shift_type_id` 等字段表达产品批次事实，但没有直接租户边界。

因此，本轮不能要求：

```ts
ProductionBatch.company_id === req.user.companyId
```

也不能让执行 agent 自行给 `ProductionBatch` 增加 `company_id`，因为这会改变生产批次主链 schema，已经超出 GAP-304。

本轮对 CCP 的处理边界是：

1. `CCPRecord.company_id` 必须来自 `req.user.companyId`。
2. `CCPPoint.company_id` 必须按 `req.user.companyId` 过滤。
3. `findByBatch(batchId)` 只能返回当前 `companyId` 下的 CCPRecord。
4. `findMissingCCPs(batchId)` 只能基于当前 `companyId` 下的 CCPPoint 和 CCPRecord 计算缺失项。
5. 不在本轮断言 `ProductionBatch` 属于哪个公司。

`ProductionBatch` 租户归属应单独进入后续分诊；它会影响生产、追溯、发货、投诉、召回的更大范围，不应塞进 GAP-304 的质量记录隔离 PR。

### 5.4 编号生成必须按公司隔离

当前 `NonConformance`、`CorrectiveAction`、`CustomerComplaint` 编号使用 `count()+1`。

本 spec 不解决高并发安全编号问题（已由 `GAP-314` 覆盖），但本轮必须将 count 范围限制到当前公司：

```ts
count({ where: { company_id: companyId } })
```

这样不同公司不会互相影响编号序列。

自动触发链路也必须遵守同一规则：`workflow-triggers` 在自动创建 `NonConformance` 时，如果沿用全局 `count()`，仍会跨公司污染编号序列。因此本轮允许同步修改 `WorkflowTriggersService` 中的 NonConformance 编号计数，使其按事件 payload 中的 `company_id` 过滤。

统计看板也必须遵守读侧隔离：`ManagementDashboardService` 会读取 `NonConformance` 和 `CorrectiveAction` 的汇总/列表数据，必须从 `StatisticsController` 的 `req.user.companyId` 传入服务层，并过滤这两类质量数据。文档统计暂不纳入本轮，因为 `Document` 当前没有 `company_id` 字段。

### 5.5 GAP-303 / GAP-305 不在本轮实现

`CcpService.findMissingCCPs()` 本轮只做租户隔离：

```ts
where: { company_id: companyId }
```

按产品/配方过滤 CCPPoint 属于 `GAP-303`，不在本轮做。

`CCPRecord.is_within_cl = false` 自动触发不合格属于 `GAP-305`，依赖本轮完成后再做。

### 5.6 GAP-600 单独执行，但依赖本轮认证上下文

计量器具模块 `GAP-600` 同样需要 `req.user.companyId`。本轮应完成认证上下文，使 `GAP-600` 后续可以直接复用；是否把 `GAP-600` 合并进同一实现 PR，由 implementation plan 决定。

## 6. 本轮范围

### 必须覆盖

- `server/src/prisma/schema.prisma`
- `server/src/modules/auth/auth.service.ts`
- `server/src/modules/auth/auth.strategy.ts`
- `server/src/modules/auth/sso.service.ts`
- `server/src/modules/ccp/ccp.controller.ts`
- `server/src/modules/ccp/ccp.service.ts`
- `server/src/modules/non-conformance/non-conformance.controller.ts`
- `server/src/modules/non-conformance/non-conformance.service.ts`
- `server/src/modules/workflow-triggers/workflow-triggers.service.ts`（仅限自动创建 NonConformance 时的公司内编号计数）
- `server/src/modules/corrective-action/corrective-action.controller.ts`
- `server/src/modules/corrective-action/corrective-action.service.ts`
- `server/src/modules/corrective-action/verification-record.service.ts`
- `server/src/modules/corrective-action/capa-analytics.service.ts`
- `server/src/modules/customer-complaint/customer-complaint.controller.ts`
- `server/src/modules/customer-complaint/customer-complaint.service.ts`
- `server/src/modules/statistics/statistics.controller.ts` 与 `management-dashboard.service.ts`（仅限 NC/CAPA 质量数据读侧过滤）

### 应在 implementation plan 中二次确认是否同 PR 覆盖

- `server/src/modules/rework-record/rework-record.service.ts`

原因：`09-nonconformance-capa.md` 已把它列入 GAP-304 复用范围；它与不合格处置链路高度相关。

### 不在本轮覆盖

- 全项目所有 `company_id: '1'` 一次性清理
- `GAP-303` CCP 缺失记录按产品/配方过滤
- `GAP-305` CCP 偏差自动触发不合格
- `GAP-314` 高并发编号生成机制
- `GAP-600` 计量器具模块多租户隔离
- `Company` 独立主数据模型、公司管理后台、租户开通流程

## 7. 数据迁移策略

需要新增 Prisma migration：

```prisma
model User {
  company_id String @default("1")
}
```

迁移要求：

1. 现有用户自动获得 `company_id = "1"`。
2. 现有 QC / CAPA / 投诉 / 不合格数据保持原有 `company_id = "1"`。
3. 不迁移历史业务记录的公司归属。
4. 不新建 `Company` 表。

## 8. 验收标准

### 8.1 认证验收

- 登录返回 token 后，`GET /auth/profile` 或等价受保护接口中的 `req.user` 应包含 `companyId`。
- 新 token 包含 `companyId`。
- 旧 token 在过渡期可按 `"1"` 兼容，但不得长期依赖旧 token。

### 8.2 隔离验收

至少建立两个测试用户：

```text
user A: companyId = "1"
user B: companyId = "2"
```

验证：

1. A 创建的 CCPRecord，B 查询同一 batch 下记录时不可见。
2. A 创建的 NonConformance，B 的列表不可见，B 也不能 dispose。
3. A 创建的 CorrectiveAction，B 的列表、详情、close、verification 不可操作。
4. A 创建的 CustomerComplaint，B 的列表不可见，B 也不能 resolve。
5. 编号 count 按 companyId 隔离。

### 8.3 静态验收

本轮覆盖文件中不得再出现业务路径硬编码：

```bash
rg "company_id:\\s*['\\\"]1['\\\"]|where:\\s*\\{ company_id:\\s*['\\\"]1['\\\"]" \
  server/src/modules/ccp \
  server/src/modules/non-conformance \
  server/src/modules/corrective-action \
  server/src/modules/customer-complaint
```

如 implementation plan 纳入 `rework-record`，则该目录也必须加入检查。

### 8.4 回归验收

必须运行：

```bash
npm run build:server
# 历史 Multica GAP 校验脚本已退役；当前不再运行此校验
```

如果已有相关测试，可追加：

```bash
npm test --workspace server -- --runInBand ccp non-conformance corrective-action customer-complaint
```

## 9. 风险与处理

| 风险 | 处理 |
|---|---|
| 当前无 `Company` 模型 | 本轮只补 `User.company_id`，公司主数据后台另行设计 |
| 旧 token 没有 companyId | 短期 fallback 到 `"1"`，新登录必须生成 companyId |
| 各业务表 `company_id` 类型不统一 | GAP-304 只覆盖 String company_id 的质量链路；Int 类型模块另行分诊 |
| 只改 create 不改 read/update | 禁止；所有 read/update/close/resolve/verify 都必须加 companyId |
| 编号 count 仍全局计算 | 禁止；本轮必须按 companyId count |
| ProductionBatch 无 company_id | 本轮不强行补 ProductionBatch 租户字段；只隔离质量记录自身，生产批次租户归属另行分诊 |

## 10. 后续进入 writing-plans 的前置条件

进入 implementation plan 前必须确认：

1. 是否将 `rework-record` 合并进本轮 PR。
2. 是否为 `AuthenticatedUser` 新增共享类型或局部接口。
3. 是否采用旧 token fallback `"1"`，以及 fallback 是否只用于过渡。
4. 测试是以 unit test 为主，还是补最小 e2e 覆盖两个 companyId。

确认后再生成：

```text
docs/superpowers/plans/2026-05-01-gap-304-company-id-from-jwt-implementation.md
```
