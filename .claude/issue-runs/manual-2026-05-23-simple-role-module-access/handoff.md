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
