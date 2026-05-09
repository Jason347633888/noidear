# 领域事实源与重复语义全面清理 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to execute this plan task-by-task. Start every execution reply with: `I'm using the executing-plans skill to implement this plan.`
> If current code conflicts with this plan, stop and report back instead of guessing.

**Goal:** 一次性清理当前 `master` 中仍然分散或双口径的四类领域语义：角色来源、部门层级、部门负责人、初始化状态，并删除不再需要的影子语义。本 PR 同时吸收 hotfix-pack Task 2（`req.user.id/userId` 收口），认证上下文一次性改干净。

**Spec:** [docs/superpowers/specs/2026-05-09-domain-source-of-truth-and-semantic-dedup-design.md](/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/2026-05-09-domain-source-of-truth-and-semantic-dedup-design.md)

**Business boundary:**

- 改代码、改 schema、改共享类型、改文档
- 不重做 RBAC 模型
- 不改 `ProcessStepApproval.role`
- 不改文档阅读范围里的 role 语义
- 不修改 JWT 载荷字段名；token 内部继续使用 `role`，`validate()` 输出层统一映射为 `roleCode`
- 不保留 `AuthenticatedUser.userId` 兼容字段，所有服务端消费统一使用 `req.user.id`
- MYL-536 认证上下文与 `process-step` 租户隔离残留并入本 PR 返修补丁，不拆单独 hotfix

---

## 执行前提

- 当前工作必须在独立 worktree / Multica 隔离目录中执行，不允许直接在主 checkout 上写代码
- 当前数据库可重建，不需要保留历史用户/部门层级数据
- 所有合并前验证都以空库重建 + 当前 `master` 运行验证为准

---

## File Map

### 角色正式来源与消费口径

- `server/src/modules/auth/auth.service.ts`
- `server/src/modules/auth/sso.service.ts`
- `server/src/modules/auth/authenticated-user.ts`
- `server/src/modules/auth/auth.strategy.ts`
- `server/src/common/guards/roles.guard.ts`
- `client/src/stores/user.ts`
- `packages/types/user.ts`
- `packages/types/api.ts`
- `server/src/modules/record-task/record-task.controller.ts`
- `server/src/modules/recycle-bin/recycle-bin.controller.ts`
- `server/src/modules/recycle-bin/recycle-bin.service.ts`
- `server/src/modules/document/document.controller.ts`
- `server/src/modules/document/document.service.ts`
- `server/src/modules/document/services/document-query.service.ts`
- `server/src/modules/document/services/file-preview.service.ts`
- `server/src/modules/unified-approval/approval-definition.controller.ts`
- `server/src/modules/import/import.service.ts`
- `server/src/modules/export/export.service.ts`
- `docs/module-usage/13-system-admin-ops.md`
- `docs/module-usage/97-gap-triage.md`
- `docs/module-usage/99-current-gap-register.md`

### 部门层级

- `server/src/prisma/schema.prisma`
- `server/src/prisma/migrations/<generated_remove_department_parent_id>/migration.sql`
- `server/src/modules/department/dto/create-department.dto.ts`
- `server/src/modules/department/dto/update-department.dto.ts`
- `server/src/modules/department/department.service.ts`
- `server/src/modules/department-permission/department-permission.service.ts`
- `packages/types/api.ts`
- `client/src/views/permission/DepartmentPermission.vue`
- `client/src/views/permission/__tests__/DepartmentPermission.spec.ts`

### 部门负责人

- `server/src/modules/department/department.service.ts`
- `server/src/modules/org-bootstrap/org-bootstrap.service.ts`
- `client/src/views/DepartmentList.vue`
- `client/src/views/UserList.vue`
- `packages/types/api.ts`
- `packages/types/user.ts`
- `docs/module-usage/13-system-admin-ops.md`

### 初始化状态

- `server/src/modules/org-bootstrap/dto/org-bootstrap-status.dto.ts`
- `server/src/modules/org-bootstrap/org-bootstrap.service.ts`
- `client/src/stores/bootstrap.ts`
- `client/src/router/index.ts`
- `client/src/views/bootstrap/OrganizationBootstrap.vue`

---

## Task 1: 统一角色正式来源与消费口径

**目标：**

- 删除影子 `role` 正式语义
- 前后端统一只消费正式角色对象或正式角色 code
- 导入导出中的角色文本降级为输入/展示格式

### Step 1.1: 收口共享类型

- [ ] 修改 `packages/types/user.ts`
  - 删除 `CurrentUser.role`
  - 增加正式角色消费字段（如 `roleCode` 或要求直接读取 `roleObj.code`）
  - `UserListParams.role` 重命名或注释明确为“按角色 code 筛选”
- [ ] 修改 `packages/types/api.ts`
  - 删除 `LoginResponse.user.role`
  - 用正式角色对象或正式角色 code 替代

**Acceptance:**

- 共享类型中不再保留影子 role 正式语义

### Step 1.2: 收口认证边界

- [ ] 检查并整理 `server/src/modules/auth/auth.service.ts`
- [ ] 检查并整理 `server/src/modules/auth/auth.strategy.ts`
- [ ] 检查并整理 `server/src/modules/auth/authenticated-user.ts`
- [ ] 检查并整理 `server/src/modules/auth/sso.service.ts`

要求：

- 认证返回不再保留影子 `role`
- 认证返回不再保留冗余 `userId`
- 认证边界只返回正式角色对象或正式角色 code
- 正式角色结果字段统一命名为 `roleCode`
- `AuthenticatedUser` 最终形态为：`id`、`username`、`roleCode`、`roleId`、`name`、`companyId`、`departmentId?`
- JWT 签发继续使用 `role: roleCode`；`auth.strategy.ts validate()` 读取 `payload.role`，输出 `roleCode: payload.role`
- `sso.service.ts` 签发 JWT 同样使用 `role: roleCode`（与 `auth.service.ts` 保持一致），输出层统一映射为 `roleCode: payload.role`
- 认证边界内不得再出现业务模块自行 fallback 的解释逻辑

**Acceptance:**

- 认证边界不再制造影子 `role` 事实源

### Step 1.3: 收口守卫与控制器消费方式

- [ ] 修改 `server/src/common/guards/roles.guard.ts`
- [ ] 修改仍直接消费角色结果字段的控制器 / 服务：
  - `record-task.controller.ts`
  - `recycle-bin.controller.ts`
  - `recycle-bin.service.ts`
  - `document.controller.ts`
  - `document.service.ts`
  - `document/services/document-query.service.ts`
  - `document/services/file-preview.service.ts`
  - `unified-approval/approval-definition.controller.ts`

要求：

- `@Roles(...)` 装饰器保留
- 守卫和业务模块改为统一读取正式角色对象或正式角色 code
- 不再保留 `req.user.role`
- 不再保留 `req.user.userId`
- 所有 `req.user.userId ?? req.user.id` 防御性写法必须改为直接 `req.user.id`
- 若有用户记录是从 DB 单独查出，则统一取 `roleObj.code`

**Acceptance:**

- 业务模块中不存在“角色来源解释逻辑散落”的情况

### Step 1.4: 收口前端 store 与显示

- [ ] 修改 `client/src/stores/user.ts`

要求：

- `isAdmin` / `isLeader` 改为基于正式角色对象或 `roleCode`
- 前端 store 不再保留 `CurrentUser.role`

**Acceptance:**

- 前端全局用户状态不再制造影子 role 语义

### Step 1.5: 收口导入/导出与测试

- [ ] 修改 `server/src/modules/import/import.service.ts`
- [ ] 修改 `server/src/modules/export/export.service.ts`
- [ ] 扫描并修改角色相关旧测试数据

要求：

- 导入模板中的 `role` 文本列保留，但文档与实现明确它只是“角色代码”输入格式
- 导出中的“角色”列保留，但来源只能是正式角色对象或正式角色 code
- 测试中不再用影子 `role` 持久化语义构造用户数据

**Acceptance:**

- 导入/导出与测试不再强化旧 role 影子语义

### Step 1.6: 修正文档漂移与旧计划失效声明

- [ ] 更新 `docs/module-usage/13-system-admin-ops.md`
- [ ] 更新 `docs/module-usage/97-gap-triage.md`
- [ ] 更新 `docs/module-usage/99-current-gap-register.md`
- [ ] 明确旧 `GAP-505` plan 已被这张总 plan supersede

要求：

- 不再把任何展示/输入格式写成正式角色来源
- `13-system-admin-ops.md` 改成当前权威口径，不再混挂过时风险说明
- GAP-505 的历史计划退出主执行入口

---

## Task 2: 单层部门正式收口

**目标：**

- 删除 `parentId`
- 不再保留树形部门业务语义

### Step 2.1: 删除 schema 中的层级语义

- [ ] 修改 `server/src/prisma/schema.prisma`
  - 删除 `Department.parentId`
  - 删除 `parent` / `children` 关系
- [ ] 生成 migration
  - 实际生成目录后，将真实 migration 路径补回 plan 执行记录
- [ ] 扫描 seed 与历史 migration：
```bash
rg -n "parentId|subdepartment|parent_id" server/src/prisma/seed.ts server/src/prisma/migrations/ --type ts --type sql
```

要求：

- `seed.ts` 中如有 `parentId: ...` 必须删除
- 历史 migration SQL 是历史快照，不因为本计划回改

**Acceptance:**

- schema 中 `Department` 不再有层级关系字段

### Step 2.2: 清理 DTO / service / shared types

- [ ] 修改 `server/src/modules/department/dto/create-department.dto.ts`
- [ ] 修改 `server/src/modules/department/dto/update-department.dto.ts`
- [ ] 修改 `server/src/modules/department/department.service.ts`
- [ ] 修改 `packages/types/api.ts`

要求：

- 创建/更新部门不再接受 `parentId`
- 返回类型不再暴露 `parentId`

**Acceptance:**

- API 契约正式变成单层部门

### Step 2.3: 清理树形权限页依赖

- [ ] 修改 `client/src/views/permission/DepartmentPermission.vue`
- [ ] 修改 `server/src/modules/department-permission/department-permission.service.ts`
- [ ] 修改 `client/src/views/permission/__tests__/DepartmentPermission.spec.ts`

要求：

- 去掉 `buildTree`
- 去掉 `children` 树形依赖
- 改成平铺部门列表与选择
- 删除 `subdepartment` 隔离语义
- 不把 `subdepartment` 退化兼容成 `department`
- 若数据库或旧代码中存在 `DepartmentPermission.isolationLevel` / `department_permissions.isolation_level`，删除 `subdepartment` 枚举值前先检查存量：
```sql
SELECT COUNT(*) FROM department_permissions WHERE isolation_level = 'subdepartment';
```
- 若 count > 0，migration 需先执行：
```sql
UPDATE department_permissions SET isolation_level = 'department' WHERE isolation_level = 'subdepartment';
```
- 如当前 schema 已无该列，则记录扫描结果，不新增任何兼容字段

**Acceptance:**

- 前端不再自行维持一套树形部门语义

---

## Task 3: 部门负责人事实源收口

**目标：**

- `managerId` 是唯一负责人事实源
- `leader` 是部门级治理权限角色，同时也是负责人候选资格

### Step 3.1: 收口后端负责人校验

- [ ] 修改 `server/src/modules/department/department.service.ts`
- [ ] 修改 `server/src/modules/org-bootstrap/org-bootstrap.service.ts`

要求：

- 后端统一通过 `managerId + manager.roleObj.code/status` 判断负责人有效性
- 写入层硬拦非 active leader 被设置为负责人；校验位置在 `department.service.ts` 的 `setManager` 或 `update` 处理 `managerId` 的分支，不下放到 controller / DTO
- 集中封装为 `assertManagerCandidate(tx, managerId)` 辅助方法，`create()` 和 `update()` 中凡是写入非空 `managerId` 前统一调用
- 读取层保留负责人异常识别
- 读取层返回 `managerStatus: 'invalid'` 等异常标记时，只标记、不自动写入 `managerId = null`
- 异常由人工介入修正，系统只负责识别和暴露，避免自动清空导致治理证据丢失
- 文档、注释、类型中不再把 `leader` 写成负责人事实源
- 不再让不同模块各自定义负责人语义

**必须补充的测试（针对 `assertManagerCandidate`）：**

- 非 active 用户（`status !== 'active'`）被指定为负责人 → 服务层抛出异常，部门不得写入
- 非 leader 角色（`roleObj.code !== 'leader'`）被指定为负责人 → 服务层抛出异常，部门不得写入
- 历史异常读取（managerId 指向已失效用户）→ 读取层返回 `managerStatus: 'invalid'` 标记，不触发 `department.update({ managerId: null })`

**Acceptance:**

- 后端关于”负责人是否有效”的判断来源一致

### Step 3.2: 收口前端负责人衍生逻辑

- [ ] 修改 `client/src/views/DepartmentList.vue`
- [ ] 修改 `client/src/views/UserList.vue`
- [ ] 如需要，补共享辅助函数到合适位置

要求：

- “是否为负责人”的判断一律从 `managerId` 派生
- 页面上的异常标签、限制、提示使用同一套语义

**Acceptance:**

- 前端不再各自拼负责人推导规则

---

## Task 4: 初始化状态权威来源收口

**目标：**

- 未完成时看动态进度
- 已完成后看持久化完成标记

### Step 4.1: 明确后端状态模型

- [ ] 修改 `server/src/modules/org-bootstrap/dto/org-bootstrap-status.dto.ts`
- [ ] 修改 `server/src/modules/org-bootstrap/org-bootstrap.service.ts`

要求：

- `getStatus()` 在未完成阶段返回动态步骤和原因
- `getStatus()` 入口处先读取 `org_permission_bootstrap_completed`；一旦为 `true`，直接返回 `completed=true`、`currentStep=null`、`missingItems=[]`，不得继续进入动态检查逻辑
- 不因日常治理异常自动回退到未完成
- 不提供正常流程内的“管理员手动重置完成状态”口子；未来如确需租户迁移/数据重置，应另建 admin-only reset 接口并带审计日志

**Acceptance:**

- 初始化状态不再处于“动态计算”和“持久化标记”竞争关系

### Step 4.2: 对齐前端路由守卫与工作台

- [ ] 修改 `client/src/stores/bootstrap.ts`
- [ ] 修改 `client/src/router/index.ts`
- [ ] 修改 `client/src/views/bootstrap/OrganizationBootstrap.vue`

要求：

- 登录后未完成初始化才进入 `/bootstrap/org`
- 初始化完成后访问 `/bootstrap/org` 直接跳正常首页
- 初始化完成后状态接口以持久化完成标记为准，不再重新动态回判完成性
- 工作台只展示当前动态步骤，不再把后续治理异常当成初始化未完成
- 初始化路由保留但隐藏，不作为常规菜单入口

### Step 4.3: 分离组织治理异常

- [ ] 设计独立的组织治理异常返回面

要求：

- 初始化状态接口只回答初始化是否完成及未完成步骤
- 负责人异常、用户未归属部门、用户挂停用部门等通过独立治理状态或治理统计暴露
- 不再混入 bootstrap status
- 本轮只要求后端能区分两个阶段；治理警告接口可以是 stub 或后续独立接口，不强制本轮交付新的治理页面

**Acceptance:**

- 初始化流程与日常治理彻底分层

### Step 4.4: 收口初始化入口

- [ ] 修改初始化路由与菜单暴露策略

要求：

- `/bootstrap/org` 仅在初始化未完成时可达
- 初始化完成后不再作为常规菜单入口
- 初始化完成后手工访问该路由直接回正常首页

---

## Task 5: 验证与文档收口

### Step 5.1: 静态验证

- [ ] 运行：
```bash
npm run build:client
npm run build:server
```

### Step 5.2: schema / contract 验证

- [ ] 确认 `schema.prisma` 中不存在 `Department.parentId`
- [ ] 确认共享类型中不存在把持久化角色来源写成旧 `User.role`
- [ ] 确认 `DepartmentPermission.vue` 不再构建树
- [ ] 确认 `subdepartment` 语义已删除
- [ ] 确认 `CurrentUser.role` / `req.user.role` 已删除
- [ ] 确认正式角色结果字段统一为 `roleCode`

### Step 5.2b: 旧语义全仓扫描

- [ ] 运行并清零以下扫描：
```bash
rg -n "\\bparentId\\b" server/src client/src packages docs -g '!**/dist/**'
rg -n "subdepartment" server/src client/src packages docs -g '!**/dist/**'
rg -n "CurrentUser\\.role|req\\.user\\.role\\b|req\\.user\\.userId\\b|AuthenticatedUser.*userId" server/src client/src packages docs -g '!**/dist/**'
rg -n "leader.*负责人|负责人.*leader" docs server/src client/src packages -g '!**/dist/**'
```

要求：

- 对应旧语义不得再残留在正式代码与现行文档中

### Step 5.3: 运行时验证

- [ ] 空库重建
- [ ] 重新跑 baseline / demo seed
- [ ] 登录验证：
  - 未完成初始化时进入 `/bootstrap/org`
  - 创建部门、设置负责人、分配业务用户
  - 初始化完成后重新登录回正常首页

### Step 5.4: 文档收口

- [ ] 确认 spec 与实现一致
- [ ] 确认 gap 文档不再提前或滞后描述这四条主线

---

## MYL-536 PR1 返修补丁：认证上下文与 process-step 租户隔离残留

本节按 [MYL-536](mention://issue/aec637e0-b698-4d90-8584-f3e0d26ee65d) / Orion Final Digest 并入 PR1 返修，不拆紧邻 hotfix。它是 PR1 “认证上下文字段一次性定死为 `id + roleCode`，不保留兼容字段”与租户隔离边界的未完成项。

### 返修边界

- `sub` 只允许存在于 JWT payload 与 `JwtStrategy.validate()` 映射层；业务 controller / service 只消费 `req.user.id`。
- `userId` / `sub` 不作为 `AuthenticatedUser` 或业务层兼容字段，不新增、不恢复、不 fallback。
- `companyId` 从 `AuthenticatedRequest.user.companyId` 取得，是业务租户隔离事实源；不得 fallback 到 `company_id: '1'`。
- 如需对缺失 `companyId` 做 runtime assertion，异常类型使用 `InternalServerErrorException`，表示认证上下文契约被破坏；不得使用 `BadRequestException`。
- 本 PR 只强制清除 `server/src/modules/process-step/process-step.service.ts` 的 `company_id: '1'`。测试 / seed 不纳入本轮；除 process-step 外的 29 个业务文件登记为后续 GAP / 专项 issue。
- `incoming-inspection.controller.ts` 与 `document.controller.ts` 中 Guard 到位后的 `|| 'system'` 死代码登记后续清理，不作为 PR1 blocker。
- `audit/interceptors/sensitive-log.interceptor.ts` 的 `user?.id || 'system'` 属于未认证请求审计占位设计，明确排除。

### 必须修改的代码范围

- `server/src/modules/workflow/workflow-advanced.controller.ts`
- `server/src/modules/import/import.controller.ts`
- `server/src/modules/process/process-instance.controller.ts`
- `server/src/modules/process-step/process-step.controller.ts`
- `server/src/modules/process-step/process-step.service.ts`
- `server/src/modules/unified-approval/approval-task.controller.ts`
- `server/src/modules/unified-approval/approval-instance.controller.ts`
- `server/src/modules/warehouse/inbound.controller.ts`

### 认证上下文返修要求

- 上述 controller 的请求类型必须收口为 `AuthenticatedRequest`；不得保留 `@Request() req: any` 或 `{ user: { sub: string } }`。
- `workflow-advanced.controller.ts` 的 delegate / rollback / transfer 均使用 `req.user.id`。
- `import.controller.ts` 的 document import 使用 `req.user.id`。
- `process-instance.controller.ts` 的 pending / create / submitStep / submitApproval 四处删除 `req.user?.sub || req.user?.id`，改为 `req.user.id`。
- `unified-approval/approval-task.controller.ts` 与 `approval-instance.controller.ts` 删除 `req.user?.id ?? req.user?.userId ?? req.user?.sub` 等兼容链，统一使用 `req.user.id`。
- `warehouse/inbound.controller.ts` 必须补 `JwtAuthGuard` 类级或等价保护；create / approve / complete 均使用 `AuthenticatedRequest` + `req.user.id`，删除 `userId/sub` fallback 与 `req.user?.id || 'system'` 静默降级。

### process-step 租户隔离返修要求

- `ProcessStepController` 的 findAll / findByProduct / findOne / create / update / remove 六个方法均从 `req.user.companyId` 读取 companyId，并显式传入 service。
- `ProcessStepService` public 方法签名必须要求 `companyId`。
- list / detail / create / update / remove 均按 `company_id: companyId` 过滤或写入，不能继续硬编码 `company_id: '1'`。
- `process-step.update/remove` 必须使用 scoped write：

```typescript
updateMany({
  where: { id, company_id: companyId, deleted_at: null },
  data,
})
```

- `updateMany().count === 0` 时抛 `NotFoundException`。不得采用先 `findOne(id, companyId)` 再 `update({ where: { id } })` 的两步归属校验。

### MYL-536 返修验收扫描

- [ ] 业务代码中不再读取 `req.user.sub` / `req.user.userId`：
```bash
rg "req\\.user\\.sub|req\\?\\.user\\?\\.sub|req\\.user\\.userId|req\\?\\.user\\?\\.userId" server/src
```

- [ ] 本轮业务身份兼容链命中为 0；非身份语义命中需人工说明：
```bash
rg "userId\\s*\\?\\?|sub\\s*\\|\\|" server/src
```

- [ ] 本轮纳入范围内不再用 `system` 作为认证缺失静默降级：
```bash
rg "req\\.user\\?\\.id \\|\\| 'system'|req\\.user\\?\\.id \\|\\| \\\"system\\\"" server/src/modules/warehouse server/src/modules/workflow server/src/modules/import server/src/modules/process server/src/modules/unified-approval server/src/modules/process-step
```

- [ ] `process-step` 不再硬编码租户：
```bash
rg "company_id:\\s*'1'|company_id:\\s*\\\"1\\\"" server/src/modules/process-step
```

- [ ] 本轮纳入 controller 不再保留 `req: any` 或错误的 `sub` 类型：
```bash
rg "@Request\\(\\) req: any|user: \\{ sub: string \\}" server/src/modules/workflow server/src/modules/import server/src/modules/process server/src/modules/unified-approval server/src/modules/warehouse server/src/modules/process-step
```

- [ ] 验证 `server/src/modules/warehouse/inbound.controller.ts` 存在 `JwtAuthGuard` 保护，且 create / approve / complete 均使用 `AuthenticatedRequest` + `req.user.id`。
- [ ] 验证 `process-step.update/remove` 使用 scoped `updateMany({ where: { id, company_id: companyId, deleted_at: null } })` 并检查 `count`，不是两步 `findOne` + `update({ where: { id } })`。

### MYL-536 返修测试要求

- [ ] workflow delegate / rollback / transfer 调 service 时使用 `req.user.id`。
- [ ] import controller 使用 `req.user.id`。
- [ ] process instance pending / create / submitStep / submitApproval 不再读取 `sub`。
- [ ] unified approval 相关 controller 不再读取 `userId/sub`。
- [ ] warehouse inbound 有 `JwtAuthGuard`，create / approve / complete 不写入 `system` 假用户。
- [ ] process-step 使用非 `'1'` companyId 覆盖 list / detail / create / update / remove 隔离；update / remove 覆盖 scoped `updateMany` 写入。

---

## 完成定义

本计划完成时，必须同时满足：

1. 角色持久化来源与运行时来源边界清晰
2. 影子 `role` 语义从运行时、前端 store、共享类型和测试中清除
3. 正式角色结果字段统一为 `roleCode`，JWT 内部字段名仍为 `role`
4. 部门正式变成单层模型
5. `subdepartment` 权限语义被删除
6. `managerId` 成为唯一负责人事实源
7. `leader` 被收口为部门级治理权限角色，不再被写成负责人事实源
8. 初始化状态改成“未完成看动态、已完成看持久化标记”
9. 组织治理异常与初始化状态彻底分层
10. `/bootstrap/org` 仅保留为未完成初始化时的受控入口
11. `AuthenticatedUser.userId` / `req.user.userId` 被删除，服务端统一消费 `req.user.id`
12. MYL-536 纳入范围内的 `req.user.sub`、`req.user.userId`、身份兼容链、`warehouse` 的 `|| 'system'` 静默降级、`process-step` 的 `company_id: '1'` 均按本计划清除
13. 文档、共享类型、后端、前端对这四点表述一致
