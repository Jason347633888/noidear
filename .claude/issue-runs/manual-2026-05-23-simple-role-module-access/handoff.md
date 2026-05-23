# Handoff

## PR 信息

- **PR URL**: https://github.com/Jason347633888/noidear/pull/217
- **Branch**: `feat/simple-role-module-access`
- **Head SHA**: `d565581a`（repair round 1 完成）
- **Worktree**: `/Users/jiashenglin/Desktop/project/noidear/.worktrees/feat-simple-role-module-access`

## 完成的 Tasks

全部 47 个原始 Task + Reviewer P0/P1 修复：

- **Tasks 1-47**: 已在前一会话提交
- **Repair Round 1**: 修复 Reviewer 返回的全部 P0（7 项）+ P1（1 项）阻塞

## Repair Round 1 修复清单

| 编号 | 修复内容 | Commit |
|------|----------|--------|
| P0-1 | 全局守卫顺序：新增 `@Public()` decorator，JwtAuthGuard 注册为首个全局 APP_GUARD，auth/login 和 liveness 标 @Public() | 8b2ead9a |
| P0-2 | role.service.ts：删除 assignPermissions、revokePermission、getRolePermissions 及 include:{permissions} 引用 | a4320db6 |
| P0-4 | role.controller.ts：仅保留 GET /roles 和 GET /roles/:id，删除 POST/PUT/DELETE 和权限路由 | a4320db6 |
| P0-3 | 前端：删除 permission.ts、RolePermissions.vue；role.ts 删除权限和 CUD 导出；RoleList.vue 删除创建/编辑/删除/权限入口；更新测试 | 631c995a |
| P0-5 | 4 个 controller 的 @Post() create 接入 createForOwnership(dto, ownership) | 8a6c7275 |
| P0-6 | GET /todos 恢复分页响应契约 {items,total,page,limit,hasMore}，ownership 范围过滤合并到 findAll | 4f9fe134 |
| P0-7 | NonConformance create/createFromCcpDeviation 补写 discoveredById FK | 8eb20558 |
| P1-1 | 10 个 @ModuleKey controller 补 @UseGuards(JwtAuthGuard) | d565581a |

## 验证结果

| 验证项 | 结果 |
|--------|------|
| `npx tsc --noEmit`（server） | **0 错误** |
| `npm run test -w server`（全量单元测试） | **144 suites, 1078 tests, 全部通过** |
| `npm run build:client`（前端构建） | **0 错误（构建成功）** |
| 所有 @ModuleKey controller 均有 JwtAuthGuard | **验证通过（rg 无缺漏）** |

## 修改文件摘要（Repair Round 1）

### 新增文件
- `server/src/shared/decorators/public.decorator.ts`

### 服务端修改
- `server/src/app.module.ts` — 注册 JwtAuthGuard 为全局首个 APP_GUARD
- `server/src/modules/auth/jwt-auth.guard.ts` — 支持 @Public() 跳过
- `server/src/modules/auth/auth.controller.ts` — /auth/login 加 @Public()
- `server/src/modules/health/liveness.controller.ts` — /liveness 加 @Public()
- `server/src/modules/role/role.service.ts` — 删除权限相关方法，删除 include:{permissions}
- `server/src/modules/role/role.controller.ts` — 仅保留 GET list/detail
- `server/src/modules/non-conformance/non-conformance.service.ts` — create/createFromCcpDeviation 补 discoveredById
- `server/src/modules/product/product.controller.ts` — create → createForOwnership
- `server/src/modules/recipe/recipe.controller.ts` — create → createForOwnership
- `server/src/modules/warehouse/material.controller.ts` — create → createForOwnership，补 JwtAuthGuard
- `server/src/modules/record-template/record-template.controller.ts` — create → createForOwnership
- `server/src/modules/todo/todo.service.ts` — findAll(query, ownership) 合并 ownership 过滤，返回分页对象
- `server/src/modules/todo/todo.controller.ts` — findAll 调用 service.findAll(query, ownership)
- 10 个 @ModuleKey controller 补 JwtAuthGuard（model-landing, shift-instance, production-run, warehouse/traceability, warehouse/batch, warehouse/material-balance, batch-trace x4）

### 前端修改
- `client/src/api/permission.ts` — 删除（整文件）
- `client/src/components/role/RolePermissions.vue` — 删除（整文件）
- `client/src/api/role.ts` — 删除权限和 CUD 相关导出
- `client/src/views/role/RoleList.vue` — 删除创建/编辑/删除/权限配置入口
- `client/src/views/role/__tests__/RoleList.spec.ts` — 更新测试
- `client/src/views/role/__tests__/RoleList-bootstrap.spec.ts` — 更新测试

## Repair Round 2 修复清单（2026-05-24）

| 编号 | 修复内容 |
|------|----------|
| P0-NEW-1 (todo) | todo.service.spec.ts 第一个 describe 修正为 `findAll(query, ownership)` 签名；第二个 describe 由 `listForUser(ownership)` 改为 `findAll(baseQuery, ownership)` |
| P0-NEW-1 (role) | role.service.spec.ts 删除 create/update/remove/assignPermissions/revokePermission/getRolePermissions 用例；修正 findOne 断言（无 include）；清理 unused imports |
| P0-NEW-2 | product/recipe/record-template/material controller 所有写路由（update/archive/remove/createLegacy/uploadReport/tolerance/fields/revisions/activate）加 admin guard，非 admin 返回 403 |
| P0-NEW-3 | workflow-triggers.service.ts 补 discoveredById/discovered_by；incoming-inspection.service.ts emit payload 补 inspector_id |
| P1-NEW-1 | ownership-context.ts 添加单租户注释说明 |
| chore | 删除 dead DTOs（create-role.dto.ts/update-role.dto.ts/assign-permissions.dto.ts）和 RoleForm.vue；清理 role.service.ts 未使用 imports |

**Head SHA**: `bd255c10`

## Round 2 验证结果

| 验证项 | 结果 |
|--------|------|
| `npx tsc --noEmit`（server） | **0 错误** |
| `npx jest --forceExit`（全量） | **174 suites, 1102 tests 通过；1 suite fail（coverage.spec.ts，需 DB，预期允许）** |
| `npm run build:client` | **0 错误（构建成功）** |

## Repair Round 3 修复清单（2026-05-24）

| 编号 | 修复内容 | 文件 |
|------|----------|------|
| P0-R3-1 | product.controller `replaceReport` 补 admin guard（`@Ownership() ownership` + ForbiddenException），补 controller spec | product.controller.ts, product.controller.spec.ts |
| P0-R3-2 | user/department/operation-log controller 加 `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('admin')`，补 admin-guard spec | user.controller.ts, department.controller.ts, operation-log.controller.ts |
| P0-R3-3 | 11 个 controller GET 列表路由接入 `listForOwnership(ownership)`（equipment, environment-record, corrective-action, rework-record, customer-complaint, deviation, training/record, warehouse/requisition, warehouse/inbound, mixing），补 equipment.controller.ownership.spec | 各 controller.ts |
| P1-R3-4 | task.service `listForUser` user 角色从 `creatorId` 改为 `departmentId` 过滤，更新旧断言，补 department-filter spec | task.service.ts, task.service.spec.ts |
| P2-R3-5 | @ModuleKey + registry-config + menu.ts 三方对齐：environment-records/metal-detections/rework-records/waste/fragile-item-inspections/violation-records/visitor-records/emergency-drills/food-safety-culture-records/measuring-equipment/medication-records/cleaning-records 从 quality_compliance → equipment_site；incoming-inspections 从 quality_compliance → traceability_batch；packaging-material-usages 在 menu 从 equipment_site → traceability_batch；补 menu-registry-consistency.spec | 13 个 controller.ts, registry-config.ts, menu.ts |

**Head SHA**: `5e71a8f5`

## Round 3 验证结果

| 验证项 | 结果 |
|--------|------|
| `npx tsc --noEmit`（server） | **0 错误** |
| `npx jest --forceExit`（全量） | **180 suites pass, 1121 tests 通过；1 suite fail（coverage.spec.ts，需 DB，预期允许）** |
| `npm run build:client` | **0 错误（构建成功）** |
| `@Roles('admin')` 验证 | user.controller.ts ✓, department.controller.ts ✓ |
| `listForOwnership` 验证 | equipment.controller.ts ✓ |

## Repair Round 4 修复清单（2026-05-24）

| 编号 | 修复内容 | 文件 |
|------|----------|------|
| P0-R4-1 | 11 个模块将 listForOwnership 合并进 findAll：ownership where 条件与 query 过滤叠加，保留分页契约 {data,total,page,limit}。equipment/inbound/requisition 返回分页对象，其余返回数组（原契约）。删除独立的 listForOwnership 方法 | equipment/environment-record/corrective-action/rework-record/non-conformance/customer-complaint/warehouse-inbound/warehouse-requisition/deviation/training-record 的 service.ts + controller.ts |
| P0-R4-2 | mixing.listExecutions 恢复 ListMixingExecutionsDto 的 productId/status 过滤和 include:{area,lines}，同时叠加 ownership 条件，修复食品安全数据归集错误 | mixing.service.ts, mixing.controller.ts |
| P1-R4-3 | DepartmentController 拆分 class-level @Roles('admin')：GET 方法仅 JwtAuthGuard，POST/PUT/DELETE 保持 admin-only，修复 leader 加载部门列表问题 | department.controller.ts |
| P1-R4-4 | UserController 同理拆分：GET/GET:id 仅 JwtAuthGuard，写操作保持 admin-only，修复 training 候选人加载问题 | user.controller.ts |
| chore | 更新全部 ownership spec 文件（equipment/environment-record/corrective-action/rework-record/non-conformance/customer-complaint/deviation/inbound/requisition/training/mixing）以匹配新接口签名 | 12 个 *.ownership.spec.ts |

**Head SHA**: `89308844`

## Round 4 验证结果

| 验证项 | 结果 |
|--------|------|
| `npx tsc --noEmit`（server） | **0 错误** |
| `npx jest --forceExit`（全量） | **180 suites pass, 1121 tests 通过；1 suite fail（coverage.spec.ts，需 DB，预期允许）** |
| `npm run build:client` | **0 错误（构建成功）** |
| 分页契约保留（equipment） | `total\|page\|limit` 存在于 equipment.service.ts ✓ |
| department GET 不再 admin-only | GET 无 @Roles 装饰器 ✓ |
| user GET 不再 admin-only | GET 无 @Roles 装饰器 ✓ |
| mixing include:{area,lines} 保留 | mixing.service.ts listExecutions 包含 include ✓ |

## Repair Round 6 修复清单（2026-05-24）

| 编号 | 修复内容 | 文件 |
|------|----------|------|
| P0-R6-1 | approval-task.controller.ts user/leader OR 分支增加 `{assigneeUserId: null, assigneeRoleCode}` 和 `{assigneeUserId: null, assigneeDepartmentId}` 条件；更新 approval-task.controller.spec.ts 旧断言；新增 approval-task.service.ownership.spec.ts（8 个 ownership-scope 测试） | approval-task.controller.ts, .spec.ts, .service.ownership.spec.ts |
| P1-R6-2 | http-exception.filter.ts：当 exceptionResponse.code 是字符串时直接透传，不覆盖为数字；透传 module 字段；新增 3 个 filter 集成测试验证 MODULE_DISABLED 路径 | http-exception.filter.ts, module-access.guard.spec.ts |
| P1-R6-3 | user.ts logout() 调用 useModuleAccessStore().reset()；login() 成功后调用 await useModuleAccessStore().refresh() | client/src/stores/user.ts |
| P1-R6-4 | 将 coverage.spec.ts 移至 server/test/module-access/coverage.e2e-spec.ts（e2e 套件），从单测中排除 | server/src/modules/module-access/coverage.spec.ts (删除), server/test/module-access/coverage.e2e-spec.ts (新增) |
| P3 | ownership-scope.e2e-spec.ts:390 软断言改为 expect(users.length).toBeGreaterThan(0) | server/test/module-access/ownership-scope.e2e-spec.ts |

**Head SHA**: `fbb23f0d`

## Round 6 验证结果

| 验证项 | 结果 |
|--------|------|
| `npx tsc --noEmit`（server） | **0 错误** |
| `npx jest --forceExit`（全量单元测试） | **184 suites, 1153 tests 全部通过；coverage.spec.ts 不再出现** |
| `npm run build:client` | **0 错误（构建成功）** |
| coverage.spec.ts 不在 unit test 列表中 | `npx jest --listTests | grep coverage` 仅见 approval-callback-coverage.spec.ts（无关文件）✓ |

## 剩余风险

### 1. migration 手动应用（原有）
- 迁移 `20260524000000_ownership_fk_fields` 通过 `prisma migrate resolve --applied` 标记
- 生产部署需确认在目标 DB 执行该迁移 SQL

### 2. E2E 测试覆盖
- ownership-scope.e2e-spec.ts 和 coverage.e2e-spec.ts 需要在真实 DB 环境下运行验证完整链路
- 建议 Reviewer 关注 POST /non-conformances → GET /non-conformances 链路是否完整

### 3. P0-NEW-2 admin guard 位置
- 本次选择在 controller 层添加 guard（vs service 层）以避免破坏现有 service 单元测试
- service 层 `createForOwnership` 保持 service-layer 风格，其他写方法的 guard 在 controller 层
- 如需统一风格，可后续重构将 guard 移至 service 层（非阻塞）

## Repair Round 9 修复清单（2026-05-24）

| 编号 | 修复内容 | 文件 |
|------|----------|------|
| P0-R9-1 | migration.sql 替换 DELETE 为 DO $$ RAISE EXCEPTION $$ preflight 块，migration 现在遇到自定义 role code 时失败抛错而非静默删除数据 | server/src/prisma/migrations/20260523100001_role_code_check_constraint/migration.sql |
| P1a-R9 | 从 OperationLogModule 移除 PermissionAuditLogController 注册，并删除重复文件；GET /permission-audit-logs 仅由 AuditModule 的 PermissionLogReadonlyController 处理（返回数组，与 AuditSearchPage.vue 一致） | server/src/modules/operation-log/operation-log.module.ts, permission-audit-log.controller.ts（已删除）|
| P1b-R9 | role.e2e-spec.ts 将 `prisma.role.create()` 改为 `upsert()`，唯一性断言改为直接对已有 seeded leader 重复创建来触发约束；移除可能污染 DB 的 afterAll delete | server/test/role.e2e-spec.ts |

**Head SHA**: `0c9accc8`

## Round 9 验证结果

| 验证项 | 结果 |
|--------|------|
| `npx tsc --noEmit`（server） | **0 错误** |
| `npx jest --forceExit`（全量单元测试） | **184 suites, 1157 tests 全部通过** |
| `npm run build:client` | **0 错误（构建成功）** |
| `grep -rn "permission-audit-logs" server/src --include="*.controller.ts"` | **仅 1 个结果（PermissionLogReadonlyController）** |
| migration SQL 包含 DO $$ RAISE EXCEPTION $$ | **验证通过** |

## Repair Round 11 修复清单（2026-05-24）

| 编号 | 修复内容 | 文件 |
|------|----------|------|
| P1-R11-1 | StepDto 新增 `onRejected?: string` 和 `dueHours?: number`，补 `IsNumber` import；补 dto spec 4 个用例（含边界值和负数拒绝） | approval-definition.dto.ts, approval-definition.dto.spec.ts |
| P2-R11-2 | record.service.ts `findAll` 增加 trainer 旁路逻辑（projectId 存在且 trainerId 匹配时绕过 ownership），通过 `fetchRecordsWithUser` 手动 userMap 方式补全 user 字段（LearningRecord 无 Prisma relation）；更新 ownership spec 覆盖 trainer bypass、user 字段补全、非 trainer 仍受 ownership 过滤 | record.service.ts, record.service.ownership.spec.ts |
| P2-R11-3 | MenuEntry 接口新增 `moduleKey?: string`；menu.ts `生产执行` 分组下 `/records` 设 `moduleKey: 'document_approval'`、`/record-tasks/manage` 设 `moduleKey: 'work_execution'`；Layout.vue 子菜单渲染改为 `v-for + template`，每个子项有独立 moduleKey 时优先用自身的判断 | menu.ts, Layout.vue |

**Head SHA**: `5fe7ea9f`

## Round 11 验证结果

| 验证项 | 结果 |
|--------|------|
| `npx tsc --noEmit`（server） | **0 错误** |
| `npx jest --forceExit`（全量单元测试） | **184 suites, 1166 tests 全部通过** |
| `npm run build:client` | **0 错误（构建成功）** |
| `grep -n "onRejected\|dueHours" approval-definition.dto.ts` | **第 53 和 58 行均存在** |
| `grep -n "user.*findMany\|fetchRecordsWithUser" record.service.ts` | **fetchRecordsWithUser 方法存在，user.findMany 被调用** |

## 剩余风险（Round 11 追加）

- `LearningRecord` 模型目前无 Prisma relation 指向 `User`，user 字段由手动 userMap 补全。若后续加 schema relation，可改回 Prisma include 方式（当前逻辑完全等价）。
- 子菜单 moduleKey 过滤仅针对已发现的两个跨模块路由，其余分组如仍有类似情况，需在 menu.ts 逐项标注。

## Repair Round 15 修复清单（2026-05-24）

| 编号 | 修复内容 | 文件 |
|------|----------|------|
| PR-NEW-1 | approval-instance.controller.ts 的 findByResource 和 findOne 添加 @Ownership()；admin 直通；user 只能访问自己的实例；leader 只能访问所属管理部门成员创建的实例；findOne 对无权限情况抛 ForbiddenException（非 NotFoundException）；提取 resolveAllowedCreatorIds 私有方法复用；新增 findByResource 和 findOne 三角色 ownership spec | approval-instance.controller.ts, approval-instance.controller.spec.ts |
| PR-NEW-2 | module-access.service.ts saveMatrix 的 upsert 循环包裹在 prisma.$transaction 中，改用 tx.moduleAccessConfig.upsert；新增事务成功提交测试 + 中途抛错时整体失败（模拟 rollback）测试；saveMatrix 未知 moduleKey 拒绝测试补充验证在事务之前校验 | module-access.service.ts, module-access.service.spec.ts |

**Head SHA**: `952a9215`

## Round 15 验证结果

| 验证项 | 结果 |
|--------|------|
| `npx tsc --noEmit`（server） | **0 错误** |
| `npx jest --forceExit`（全量单元测试） | **184 suites, 1179 tests 全部通过** |
| `npm run build:client` | **0 错误（构建成功）** |

## 剩余风险（Round 15 追加）

- `findByResource` 对 user/leader 返回过滤后数组（非 403），因为多实例 by-resource 是 list 语义，过滤后空数组是合法结果。
- saveMatrix 事务实际 rollback 语义由 Prisma 保证；单元测试验证错误传播，DB 级 rollback 依赖 Prisma 内部实现（已是标准行为）。
- `onApproved` 缺失契约是 master 既有问题，非本 PR 引入，已记入 closeout notes。
