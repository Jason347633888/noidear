# E2E Skip 全量修复设计

## Goal

将 E2E 测试套件的 101 个跳过（skip）全部修复，最终达到 0 skip、241+ passed。

## Architecture

方案 A：四个阶段串行推进，每阶段结束后跑 E2E 验证，skip 数量线性下降。

```
阶段一：Seed 数据修复        → 解锁 ~30 个 skip
阶段二：审计日志 GET 端点     → 解锁 ~7 个 skip
阶段三：ApprovalDefinition   → 解锁 ~16 个 skip
阶段四：新功能全量实现        → 解锁 ~48 个 skip
```

**核心原则**：复用已有 service 层，不重复实现业务逻辑；只在 controller 层补 GET 端点或在 seed 层补数据。

## Tech Stack

NestJS + Prisma + PostgreSQL（后端）；`seed-e2e.ts`（seed）；Playwright（E2E）

---

## 阶段一：Seed 数据修复

**目标**：让所有"运行时查不到数据就 skip"的测试找到数据。

### 1.1 批次数据（解锁 BT-001~003, BT-010, BT-020, BT-030, BT-04, BT-06）

**文件**：`server/src/prisma/seed-e2e.ts`

现有 `seedMaterialBatches()` 创建 3 条 `MaterialBatch`，但 `batch-trace.spec.ts` 的 `beforeAll` 调 `GET /warehouse/batches`，查到 0 条就 skip。需要：

- 检查 `MaterialBatch` schema 字段（`batchNumber`, `materialId`, `warehouseLocation`, `quantity`, `unit`, `expiryDate`, `status`）与 `batch.controller.ts` 查询字段是否完全对齐，若有字段名不匹配则修正
- 新增 `seedProductionBatches()` 函数，插入 2 条 `BatchTrace`（生产批次）记录，关联已有物料批次
- `main()` 中在 `seedMaterialBatches()` 之后调用 `seedProductionBatches()`

### 1.2 文档数据（解锁 DOC-003~005, DOC-020~022, BDD-DOC-011, RBN-002, RBN-004）

**文件**：`server/src/prisma/seed-e2e.ts`，函数 `seedDocuments()`

当前：`draft × 2`、`effective × 2`。

问题：DOC-005（软删除）、DOC-020（版本发布）、DOC-021（归档）、DOC-022（archived 不可提审）的测试会**消耗**文档，导致后续测试找不到数据。

修法：扩充为 `draft × 5`、`effective × 4`、`archived × 2`，id 命名规范：
- `e2e-doc-draft-001` ~ `e2e-doc-draft-005`
- `e2e-doc-effective-001` ~ `e2e-doc-effective-004`
- `e2e-doc-archived-001` ~ `e2e-doc-archived-002`

全部用 `upsert`（已有模式），确保重跑 seed 后状态正确。

### 1.3 登录日志（解锁 AUD-001~003）

**文件**：`server/src/prisma/seed-e2e.ts`

新增 `seedLoginLogs(adminId)` 函数，向 `LoginLog` 表写入至少 5 条记录：

```typescript
// 3 条 action='login' result='success'
// 2 条 action='login' result='failed'
// 字段：userId, action, result, ipAddress, userAgent, createdAt
```

在 `main()` 末尾调用。

### 1.4 设备与地点数据（解锁 SITE-001, SITE-004）

**文件**：`server/src/prisma/seed-e2e.ts`

新增 `seedEquipmentAndLocations()` 函数：
- 插入 1 条 `ProductionLine` 或 `Location`（字段视 schema 而定）供 SITE-001 的 `location_id` 使用
- 插入 1 条 `Equipment` 供 SITE-004 使用
- 用 `upsert`，id 固定为 `e2e-location-001`、`e2e-equipment-001`

在 `main()` 中调用。

### 1.5 ApprovalDefinition（解锁 APPR-001~013，阶段三前置）

**文件**：`server/src/prisma/seed-e2e.ts`

`approval-engine.service.ts` 的 `startApproval()` 调用 `approvalDefinition.findFirst({ where: { resourceType, triggerKey, status: 'active' } })`，找不到就抛 404。`seedCountersignApprovals()` 和 `seedSequentialApprovals()` 已在 `main()` 中被调用，但它们依赖 `ApprovalDefinition` 记录存在。

新增 `seedApprovalDefinitions()` 函数，插入：

```typescript
// 会签定义
{
  id: 'e2e-def-countersign',
  module: 'document',
  resourceType: 'document',
  triggerKey: 'countersign_review',
  name: 'E2E 会签审批',
  version: 1,
  status: 'active',
  steps: [{ stepKey: 'step1', stepName: '会签', mode: 'COUNTERSIGN', assignments: [{ type: 'USER', userId: adminId }] }]
}
// 顺签定义
{
  id: 'e2e-def-sequential',
  module: 'document',
  resourceType: 'document',
  triggerKey: 'sequential_review',
  name: 'E2E 顺签审批',
  version: 1,
  status: 'active',
  steps: [{ stepKey: 'step1', stepName: '顺签第一级', mode: 'SEQUENTIAL', assignments: [{ type: 'USER', userId: adminId }] }]
}
```

`main()` 调用顺序：`seedApprovalDefinitions()` → `seedCountersignApprovals()` → `seedSequentialApprovals()`。

---

## 阶段二：审计日志 GET 端点

**目标**：让测试能用 `GET` + query string 查询日志。

**文件**：`server/src/modules/audit/audit.controller.ts`

后端现有 `queryLoginLogs(dto: QueryLoginLogDto)`、`queryPermissionLogs()`、`querySensitiveLogs()` 三个 service 方法，接受 DTO 对象。只需在 controller 新增三个 GET 端点，用 `@Query()` 接收参数再转发。

### 新增端点

```typescript
@Get('login-logs')
@ApiOperation({ summary: '查询登录日志（GET）' })
async getLoginLogs(
  @Query('action') action?: string,
  @Query('userId') userId?: string,
  @Query('result') result?: string,
  @Query('page') page?: string,
  @Query('limit') limit?: string,
) {
  return this.auditService.queryLoginLogs({
    action, userId, result,
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 20,
  });
}

@Get('permission-logs')   // 必须注册在 @Get('permission-logs/:userId') 之前
@ApiOperation({ summary: '查询权限变更日志（GET）' })
async getPermissionLogs(
  @Query('page') page?: string,
  @Query('limit') limit?: string,
  @Query('username') username?: string,
) {
  return this.auditService.queryPermissionLogs({
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 20,
    username,
  });
}

@Get('sensitive-logs')
@ApiOperation({ summary: '查询敏感操作日志（GET）' })
async getSensitiveLogs(
  @Query('resourceType') resourceType?: string,
  @Query('action') action?: string,
  @Query('page') page?: string,
  @Query('limit') limit?: string,
) {
  return this.auditService.querySensitiveLogs({
    resourceType, action,
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 20,
  });
}
```

`@Get('permission-logs')` 必须放在已有的 `@Get('permission-logs/:userId')` **之前**，否则 NestJS 路由匹配会把无参路径当成 `userId=undefined`。

---

## 阶段三：ApprovalDefinition 审批流配置

**目标**：让会签/顺签审批流测试能找到 pending 的审批任务。

**文件**：`server/src/prisma/seed-e2e.ts`

阶段一已插入 `ApprovalDefinition` 记录。阶段三验证并修复现有 `seedCountersignApprovals()` 和 `seedSequentialApprovals()` 的问题：

1. 确认这两个函数调用 `approvalInstance.create()` 时使用的 `definitionId` 等于 `e2e-def-countersign` / `e2e-def-sequential`（阶段一插入的 id）
2. 确认 `approvalTask` 的 `assigneeUserId` 等于 adminId（APPR-002/005/012/013 要求 admin 是 designated approver）
3. 若有字段不匹配则修正；若函数逻辑本身完整则直接依赖阶段一的 seed 数据

APPR-006（非指定审批人被拒）：需要第二个用户。检查 `seed-e2e.ts` 是否有 member 用户；若没有则新增 `e2e-user-member`，在 APPR-006 相关 seed 里用这个账号发起非授权审批。

---

## 阶段四：新功能全量实现

### 4.1 告警规则 CRUD 500 修复（解锁 ALT-002~005, ALT-HIS-002）

**文件**：`server/src/modules/monitoring/monitoring.service.ts`，`server/src/modules/monitoring/monitoring.controller.ts`

`POST /monitoring/metrics` 返回 500，导致所有告警规则测试连带 skip。

步骤：
1. 直接调用 `POST /monitoring/metrics` 查看实际 500 错误原因（可能是 `SystemMetric` 表缺少字段或 DTO 校验失败）
2. 修复 `recordMetric()` 中的 500，确保 `POST /monitoring/metrics` 返回 201
3. `GET /monitoring/alerts/rules` 已存在；`POST/PUT/DELETE` 已存在——确认这些端点能正常工作
4. 新增 `GET /monitoring/alerts/history` 端点（当前只有 `POST /alerts/history/query`）：

```typescript
@Get('alerts/history')
async getAlertHistory(
  @Query('ruleId') ruleId?: string,
  @Query('page') page?: string,
  @Query('limit') limit?: string,
) {
  return this.alertService.queryAlertHistory({
    ruleId: ruleId ? BigInt(ruleId) : undefined,
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 20,
  });
}
```

### 4.2 账号锁定测试修复（解锁 AUTH-LOCK-001）

**文件**：`client/e2e/auth.spec.ts`

`auth.service.ts` 已实现锁定逻辑（5次失败 → 锁定1分钟）。测试里有硬编码 `test.skip(true, '后端尚未实现账号锁定...')`。

修法：移除该 `test.skip`，改为实际测试逻辑：
1. 用已知存在的用户（admin）连续发送 5 次错误密码登录请求
2. 第 6 次请求应收到 `429` 或含 "账号已锁定" 的 `401`
3. 测试结束后通过 API 解锁（直接调 DB 或 admin API 重置 `loginAttempts`）

`AUTH-004`（锁定到期）：该测试已明确标注不适合 CI——保持 skip，但改为更清晰的注释。

### 4.3 无角色用户登录 401/403（解锁 AUTH-006）

**文件**：`client/e2e/auth.spec.ts`，`server/src/modules/auth/`

测试跳过原因是"Cannot create roleless user"。检查：
1. `POST /users` 是否允许创建 `roleId=null` 的用户——若不允许则改为创建后再 API 解除角色
2. 确认 `jwt.strategy.ts` 或 `roles.guard.ts` 对 `role=null` 用户返回 403，而非直接允许访问

### 4.4 物料使用记录接口（解锁 BT-012）

**文件**：`server/src/modules/warehouse/batch.controller.ts`，`server/src/modules/warehouse/batch.service.ts`

BT-012 调 `GET /warehouse/batches/:id/material-usage`。

在 `batch.service.ts` 新增：
```typescript
async getMaterialUsage(batchId: string) {
  return this.prisma.materialUsage.findMany({
    where: { batchId },
    include: { material: { select: { id: true, name: true } } },
  });
}
```

在 `batch.controller.ts` 新增：
```typescript
@Get(':id/material-usage')
getMaterialUsage(@Param('id') id: string) {
  return this.batchService.getMaterialUsage(id);
}
```

若 `MaterialUsage` 模型不存在，检查 schema 确认实际模型名称（可能是 `WarehouseUsageRecord` 等），以实际模型名为准。

### 4.5 正向追溯报告导出（解锁 BT-031）

**文件**：`server/src/modules/warehouse/traceability.controller.ts`，`traceability.service.ts`

BT-031 调 `GET /traceability/forward/:batchId/export`（或类似路径）。

复用已有 `GET /traceability/forward/:batchId` 的查询逻辑，用 `exceljs` 或 `xlsx`（项目已用）生成 Excel：
```typescript
@Get('forward/:batchId/export')
async exportForwardTrace(@Param('batchId') batchId: string, @Res() res: Response) {
  const data = await this.traceabilityService.getForwardTrace(batchId);
  const buffer = await this.generateTraceExcel(data);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=forward-trace-${batchId}.xlsx`);
  res.end(buffer);
}
```

### 4.6 全链路食品安全测试数据（解锁 BDD-E2E-001）

**文件**：`server/src/prisma/seed-e2e.ts`

BDD-E2E-001 需要：物料批次 → 生产批次 → CCP 偏差 → NC 自动创建 → 召回。

在阶段一批次 seed 的基础上新增 `seedFoodSafetyChain()` 函数：
- 1 条 `CCPRecord`（CCP 偏差，关联生产批次）
- 1 条 `NonConformance`（NC，关联 CCPRecord，`autoCreated=true`）
- 1 条 `RecallRecord`（关联 NC 或批次，status='pending'）

### 4.7 文档审批发布搜索（解锁 BDD-E2E-003）

**文件**：`server/src/prisma/seed-e2e.ts`

BDD-E2E-003 需要：draft 文档 → 提审 → 批准 → publish → 搜索可见。

此测试依赖完整审批流（阶段三），以及搜索接口 `GET /search/query`。

检查：
1. 搜索接口是否存在——若 `GET /search/query` 返回 404，则需新增；若返回结果但搜索不到，检查全文搜索/索引逻辑
2. 若搜索接口完全缺失，实现 `search.controller.ts` + `search.service.ts`，对 `Document` 表做 `title ILIKE` 查询

---

## 错误处理

- 所有新端点沿用已有 `JwtAuthGuard` + `PermissionGuard` 或 `RolesGuard`（与同模块其他端点保持一致）
- Seed 失败时打印具体错误并继续（`try/catch` 包裹每个 seed 函数，不中断整体流程）
- 新接口若 service 层方法不存在则报 500——实现前先确认 service 方法存在

## Testing

每个阶段结束后在 Docker 环境中：
1. 重新运行 seed：`docker exec <server> npx ts-node src/prisma/seed-e2e.ts`
2. 跑对应 spec：`npx playwright test <spec-file> --reporter=line`
3. 验证该阶段目标 skip 数降为 0

最终目标：全套 `npx playwright test` 0 skip，≥241 passed。
