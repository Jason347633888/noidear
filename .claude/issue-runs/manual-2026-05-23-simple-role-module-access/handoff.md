# Handoff: simple-role-module-access (Round 23 Repairs — 已更新)

## Branch
`feat/simple-role-module-access`

## Head SHA
`c4d70af6`

## PR
#217

## Round 23 修复摘要

### F1-R23 material-usage controller 补 C1 batch ownership 验证
- `material-usage.controller.ts`：`create` handler 注入 `@Ownership() ownership: OwnershipContext`，传给 service
- `material-usage.service.ts`：`create(dto, ownership?)` — 非 admin 用户先调用 `visibleProductionBatchIds()`，不在可见集内则在 transaction 前抛 `ForbiddenException`（防止 materialBatch.update 被执行）
- `material-usage.service.spec.ts`：新增 2 个测试用例（non-admin 访问他人 batch → ForbiddenException，materialBatch.update 未调用；admin 任意 batch → 成功）

### F2-R23 equipment PUT/:id 非 admin 不能改 responsiblePersonId
- `equipment.service.ts`：`update(id, dto, ownership?)` — 非 admin 时在调用 `mapDtoToData` 前将 `dto.responsiblePersonId` 置 undefined（immutable 模式，原 dto 不变）
- `equipment.controller.ts`：`update` handler 传递 `ownership` 给 `service.update`
- `equipment.service.ownership.spec.ts`：新增 3 个测试（admin 可改 responsiblePersonId → 成功写入；user 尝试改 → 字段被剥离；leader 尝试改 → 字段被剥离）

## 验证结果
- `npx tsc --noEmit`：0 errors
- `npx jest --forceExit`：1241 passed, 0 failed (↑5 新测试)
- `client npm run build`：✓ built in 5.78s, 0 errors

## 剩余风险
- 无新增风险

---

# Handoff: simple-role-module-access (Round 22 Repairs — 已更新)

## Branch
`feat/simple-role-module-access`

## Head SHA
`9ac93949`

## PR
#217

## Round 22 修复摘要

### H1-a corrective-action
- `corrective-action.service.ts`：`create` 方法始终写 `responsible_id: userId`，不再允许 `dto.responsible_id` 覆盖
- `corrective-action.service.ownership.spec.ts`：更新 "preserves dto" 断言为 "always overrides dto" 断言

### H1-b rework-record
- `rework-record.service.ts`：`create` 方法始终写 `operator_id: creatorId`，不再允许 `dto.operator_id` 覆盖
- `rework-record.service.ownership.spec.ts`：同步更新测试断言

### H1-c equipment
- `equipment.service.ts`：`create` 方法中 `responsiblePersonId: creatorId ?? dto.responsiblePersonId`（creatorId 优先）
- `equipment.service.ownership.spec.ts`：重写 create 测试，验证 dto 被忽略；新增无 creatorId 时 fallback 测试

### H1-d equipment/record (MaintenanceRecord)
- `record.service.ts`：`applyOptionalFields` 中始终写 `performerId = creatorId`（当 creatorId 存在时）
- `record.service.ownership.spec.ts`：更新 "preserves dto.performerId" 为 "overrides dto.performerId"

### C1 batch-material-usage
- `batch-material-usage.controller.ts`：inject `@Ownership()` 并传入 service
- `batch-material-usage.service.ts`：`create(dto, ownership?)` — 非 admin 用户先调用 `visibleProductionBatchIds`，不在可见集内则抛 `ForbiddenException`
- `batch-material-usage.service.ownership.spec.ts`：完整重写，含 admin/user/leader 正反 6 个测试用例

### H2 training controller
- `training.controller.ts`：`createProject` 注入 `@Ownership()`，调用 `createProjectForOwnership(dto, ownership)` 代替 `createProject(dto, userId)`
- `training.controller.spec.ts`：新增 createProject 路由测试 2 个（admin 成功路径 + user 403 路径）

## 验证结果
- `npx tsc --noEmit`：0 errors
- `npx jest --forceExit`：1236 passed, 0 failed
- `client npm run build`：✓ built in 6.01s, 0 errors

## 剩余风险
- 无已知风险

---

# Handoff: simple-role-module-access (Round 8 Repairs)

## Branch
`feat/simple-role-module-access`

## Head SHA
`5e040496`

## PR
#217

## Round 8 修复摘要

### P0 — Registry 启动崩溃（无 base path 控制器）

**RecordTaskController 拆分：**
- 新增 `server/src/modules/record-task/record-task-assignment.controller.ts`（`@Controller('record-task-assignments')`，`@ModuleKey('work_execution')`）
- 新增 `server/src/modules/record-task/record-task-instance.controller.ts`（`@Controller('record-task-instances')`，`@ModuleKey('work_execution')`）
- `record-task.module.ts` 改为注册这两个新控制器，移除旧 `RecordTaskController`
- `registry-config.ts` 的 `work_execution` 添加 `record-task-assignments` 和 `record-task-instances`

**ProductProcessChangeController 路径统一：**
- `@Controller()` → `@Controller('product-process-changes')`
- `createDraft` 路由从 `POST /products/:productId/process-changes` 改为 `POST /product-process-changes/:productId/draft`
- `submit/retry/getByPlanId` 路由去掉 `/product-process-changes` 前缀，变为相对路径
- 前端 `client/src/api/product-process-change.ts` 更新 `createDraft` URL
- `registry-config.ts` 的 `product_rd` 添加 `product-process-changes`

### P1 — role.e2e-spec.ts 移除已删除表引用

- 完全重写 `server/test/role.e2e-spec.ts`
- 删除所有 `prisma.permission`、`prisma.rolePermission` 引用（TASK-067、TASK-068、Role Permissions API 三个 describe 块全部移除）
- 修正所有 role.code 使用有效枚举值（`'admin'`/`'leader'`/`'user'`），不再使用 `'test_admin_role'` 等无效值
- 修正 `afterAll` 清理逻辑

### P2 — migration preflight DELETE

- `20260523100001_role_code_check_constraint/migration.sql` 在 `ADD CONSTRAINT` 前添加 `DELETE FROM roles WHERE code NOT IN ('admin', 'leader', 'user')` 及说明注释

## Round 7 修复摘要

### P1-R7-1 — coverage.e2e-spec.ts import 路径修正
- 文件：`server/test/module-access/coverage.e2e-spec.ts`
- 修正 3 处 import：`../../app.module`、`../../src/modules/module-access/module-route-registry`、`../../src/modules/module-access/registry-config`
- 验证：`jest --config=jest.e2e.config.js coverage.e2e-spec.ts` 不再报 "Cannot find module"，失败原因变为 DB 连接未配置（预期）

### P1-R7-2 — @ModuleKey 补充到无 base path 控制器
- `RecordTaskController` 加 `@ModuleKey('work_execution')`
- `ProductProcessChangeController` 加 `@ModuleKey('product_rd')`
- `registry-config.ts` 移除 `{ path: '', mode: 'exact' }` hack

### P2-R7-3 — customer-complaint create 写 createdById
- `CustomerComplaintService.create(dto, companyId, userId?)` 加第三参数，写入 `createdById`
- `CustomerComplaintController.create` 传 `req.user.id`
- 测试：`customer-complaint.service.ownership.spec.ts` 新增 `create writes createdById` 场景

### P2-R7-4 — equipment responsiblePersonId FK 写入
- `CreateEquipmentDto` / `UpdateEquipmentDto` 新增 `responsiblePersonId?: string`
- `mapDtoToData()` 的 `directFields` 加入 `responsiblePersonId`
- 测试：`equipment.service.ownership.spec.ts` 新增 `create with responsiblePersonId` 场景

### P2-R7-5 — 维保计划自动生成写 responsiblePersonId
- `generatePlansForEquipment` / `generateNextPlan` 写 `equipment.responsiblePersonId`
- 测试：`plan.service.ownership.spec.ts` 新增 2 个自动生成场景

## 验证结果（Round 8）

| 检查项 | 结果 |
|--------|------|
| `npx tsc --noEmit` | 0 错误 |
| `npx jest --forceExit` | 1157 tests passed, 184 suites |
| `npm run build:client` | 构建成功，0 errors |
| `grep @Controller() server/src` | 只剩未注册的旧 record-task.controller.ts 文件（不在任何模块中） |

## 剩余风险

- `server/src/modules/record-task/record-task.controller.ts` 旧文件仍存在（已从模块中移除，不会被 Nest 加载），可以安全删除，但不影响 startup
- `createDraft` API URL 变更（`/products/:id/process-changes` → `/product-process-changes/:id/draft`），前端已同步更新，但需确认没有其他客户端（移动端/第三方）使用旧 URL
- e2e 测试需要真实 DB 才能完整运行，CI 中需 DATABASE_URL 配置
- P3（Optional）：`client/src/stores/user.ts` 中 `fetchUser()` 恢复 session 后调用 `moduleAccessStore.refresh()` 未实现，不影响正确性，仅影响 page refresh 后菜单短暂 stale
