# GAP-512 权限模型决策指南

> **本文档用途**：让新 agent 或开发者在不阅读 schema 的前提下，能决定「新功能的权限检查应该用哪一层」。
>
> **本文档范围**：仅描述现有权限层的职责和使用规则，不改变任何 schema、guard、seed 或运行时行为。

---

## 结论先行

| 你要做的事 | 应该用哪一层 |
|-----------|-------------|
| 新功能的菜单/路由/接口能不能进 | `Role + Permission`（RBAC 粗粒度） |
| 某角色能不能执行某个操作（resource+action） | `RoleFineGrainedPermission`（ABAC-Role） |
| 给某个具体用户开临时例外权限（可选有效期、资源范围） | `UserPermission + FineGrainedPermission`（ABAC-User） |
| 限制某个部门能看哪些数据资源 | `DepartmentPermission`（数据边界层） |
| 记录谁改了谁的权限 | `PermissionLog`（审计事实源） |

**运行时行为不变**：本文档是描述文档，不触发任何 guard、decorator、seed 或 schema 变更。

---

## 1. 权限层定义

### 层 1：Role + Permission（RBAC 粗粒度）

**职责**：控制用户是否有权访问某个功能入口（菜单/路由/API endpoint）。

**Schema 来源**：
- `server/src/prisma/schema.prisma` — `Role`、`Permission`、`RolePermission`

**关键字段**：
- `Role.code`：`"admin"` / `"leader"` / `"user"`（三个预置角色）
- `Permission.resource`：如 `"document"`、`"template"`、`"task"`、`"approval"`
- `Permission.action`：如 `"create"`、`"read"`、`"update"`、`"delete"`、`"approve"`
- `RolePermission`：多对多桥接，绑定角色和权限

**Guard/Decorator**：
- Guard：`RolesGuard`（`server/src/common/guards/roles.guard.ts`）
- Decorator：`@Roles(...roles: string[])`（`server/src/common/decorators/roles.decorator.ts`）
- 当前读取 `User.role` 字符串字段（该字段已废弃，待迁移到 `User.roleId`，见"已知未解决问题"）

**使用时机**：
- 新 API endpoint 需要限制只有 `admin` 或 `leader` 能访问时，使用 `@Roles('admin', 'leader')`
- 新功能菜单需要按角色控制显示时，查 `Role + Permission`

---

### 层 2：RoleFineGrainedPermission（ABAC-Role，角色级细粒度）

**职责**：在角色维度配置 resource+action 粒度的白名单，是对 RBAC 粗粒度的操作级别补充。

**Schema 来源**：
- `server/src/prisma/schema.prisma` — `RoleFineGrainedPermission`

**关键字段**：
- `roleId`：绑定到哪个角色
- `resource`：资源名称
- `action`：操作名称
- `allowed`：是否允许（布尔值）

**管理接口**：
- `PUT /fine-grained-permissions/role/:roleId`（`fine-grained-permission.controller.ts`）

**使用时机**：
- 需要在角色层面配置操作级别权限时（不针对单个用户）

---

### 层 3：UserPermission + FineGrainedPermission（ABAC-User，用户例外授权）

**职责**：对特定用户进行例外授权，支持有效期和资源范围限制。这是最细粒度的权限控制。

**Schema 来源**：
- `server/src/prisma/schema.prisma` — `FineGrainedPermission`、`UserPermission`

**关键字段**（`FineGrainedPermission`）：
- `code`：唯一权限代码，如 `"view:department:document"`
- `category`：如 `"document"`、`"record"`、`"task"`
- `scope`：`"global"` / `"cross_department"` / `"department"`

**关键字段**（`UserPermission`）：
- `userId`：被授权用户
- `fineGrainedPermissionId`：绑定的细粒度权限
- `grantedBy`：授权人 userId
- `expiresAt`：可选有效期（为 null 则永久有效）
- `resourceType`：可选资源类型（如 `"document"`）
- `resourceId`：可选资源 ID（精确到单条记录的授权）

**Guard/Decorator**：
- Guard：`PermissionGuard`（`server/src/common/guards/permission.guard.ts`）
- 支持缓存（Redis，TTL 300 秒，key：`user_permissions:{userId}`）
- Decorator：
  - `@CheckPermission(code)` — 检查单个权限
  - `@CheckPermissions(codes[])` — 检查多个权限（AND 逻辑）
  - `@CheckAnyPermission(codes[])` — 检查多个权限（OR 逻辑）
  - `@Resource(type, idParam)` — 资源级别权限范围

**管理接口**：
- `POST /user-permissions/grant` — 授权
- `DELETE /user-permissions/:id/revoke` — 撤销
- `GET /user-permissions/:userId/effective` — 查看有效权限

**运行时行为**：
- 过期权限（`expiresAt < now`）在检查时自动跳过（BR-354）
- Admin 用户绕过所有权限检查（`if (user.role === 'admin') return true`）

**使用时机**：
- 需要对某个用户临时开放权限时
- 需要针对单条资源（如某份文件）授权时
- 需要设置有效期的权限时

---

### 层 4：DepartmentPermission（数据边界层）

**职责**：限制部门对特定资源的访问范围，是数据隔离层，不是功能权限层。

**Schema 来源**：
- `server/src/prisma/schema.prisma` — `DepartmentPermission`

**关键字段**：
- `departmentId`：哪个部门
- `resource`：资源类型
- `action`：操作
- `allowed`：是否允许

**Service**：`DepartmentPermissionService`（`server/src/modules/department-permission/`）

**核心方法**：
- `canAccessDepartmentResource(userId, departmentId, action, resourceType)` — 检查用户是否能访问某部门数据（BR-356）
- `hasCrossDepartmentPermission(userId, permissionCode)` — 检查是否有跨部门权限（BR-357）
- `getAccessibleDepartments(userId, resourceType)` — 列出用户可访问的部门列表

**运行时行为**：
- 默认：用户只能访问自己部门的数据
- 例外：如果用户在 `UserPermission` 中有 `scope = "cross_department"` 或 `"global"` 的权限，可跨部门访问

**使用时机**：
- 新功能需要按部门隔离数据时，调用 `DepartmentPermissionService`
- 不要在 DepartmentPermission 中存储功能权限（功能权限归层 1/2/3）

---

### 层 5：PermissionLog（审计事实源）

**职责**：记录权限变更操作，是权限审计的事实源。

**Schema 来源**：
- `server/src/prisma/schema.prisma` — `PermissionLog`

**关键字段**：
- `operatorId` / `operatorName`：操作人
- `targetUserId` / `targetUsername`：被操作对象
- `action`：`"assign_role"` / `"revoke_role"` / `"change_department"`
- `beforeValue` / `afterValue`：变更前后值（JSON）
- `reason`：变更原因
- `ipAddress`：来源 IP

**注意**：当前未发现独立的 `PermissionLog` controller，日志写入集成在 `UserPermissionService` 中。权限审计查询端点尚未确认（见 GAP-506，已知未解决问题）。

---

## 2. 决策树：新功能应该用哪一层？

```
新功能需要权限控制
│
├─► 控制「谁能进这个菜单/路由/API」？
│   └─► 用层 1：@Roles('admin') 或 @Roles('leader', 'admin')
│
├─► 控制「某个角色能否执行某 resource+action」？
│   └─► 用层 2：RoleFineGrainedPermission
│       通过 /fine-grained-permissions/role/:roleId 配置
│
├─► 控制「某个具体用户的例外权限」？
│   ├─► 需要有效期或资源范围？
│   │   └─► 用层 3：UserPermission（带 expiresAt / resourceType / resourceId）
│   └─► 永久全局例外？
│       └─► 用层 3：UserPermission（expiresAt = null）
│
├─► 控制「某部门能看哪些数据」（数据隔离）？
│   └─► 用层 4：DepartmentPermission
│       调用 DepartmentPermissionService.canAccessDepartmentResource()
│
└─► 记录「谁改了谁的权限」？
    └─► 用层 5：PermissionLog（在 UserPermissionService 中写入）
```

---

## 3. 禁止重复实现规则

1. **禁止在业务模块中自建权限表**：不得在除 `permission`、`fine-grained-permission`、`user-permission`、`department-permission` 以外的模块中新建平行权限存储。
2. **禁止在 controller 中直接读 User.role 字段做权限判断**：应使用 `@Roles()` decorator + `RolesGuard`，或 `@CheckPermission()` + `PermissionGuard`。
3. **禁止绕过 Guard 直接查 UserPermission 表**：业务逻辑中如需检查权限，调用 `UserPermissionService.hasPermission(userId, permissionCode)`。
4. **禁止在 DepartmentPermission 中存储功能权限**：部门层只用于数据边界隔离，功能访问控制归层 1/2/3。
5. **禁止直接写 PermissionLog**：权限变更日志由 `UserPermissionService` 统一写入，不得在其他服务中直接创建 `PermissionLog` 记录。

---

## 4. 已知未解决问题

以下问题不在本计划修复范围内，留作后续跟进：

| 编号 | 问题 | 当前状态 | 影响 |
|------|------|----------|------|
| GAP-505 | `User.role` 字符串字段仍被 `RolesGuard` 读取，未完成向 `User.roleId` 外键的迁移 | schema 中两个字段并存，`role` 字段标注 `@deprecated` | Guard 行为依赖已废弃字段，迁移后需同步更新 `RolesGuard` |
| GAP-506 | 权限审计日志查询端点（`GET /permission-logs`）未确认是否存在 | `PermissionLog` 模型存在于 schema，但未找到独立 controller | 前端 `/permissions/audit-log` 页面可能无法正常工作 |

---

## 5. 文件引用索引

| 概念 | 权威文件 |
|------|---------|
| 权限模型层次总览 | `docs/module-usage/13-system-admin-ops.md` § 1.1 |
| Schema 定义 | `server/src/prisma/schema.prisma`（Role L596, Permission L612, RolePermission L627, FineGrainedPermission L642, UserPermission L663, RoleFineGrainedPermission L2333, DepartmentPermission L2350, PermissionLog L1825） |
| RBAC Guard | `server/src/common/guards/roles.guard.ts` |
| ABAC Guard | `server/src/common/guards/permission.guard.ts` |
| RBAC Decorator | `server/src/common/decorators/roles.decorator.ts` |
| ABAC Decorator | `server/src/common/decorators/permission.decorator.ts` |
| 用户授权管理 | `server/src/modules/user-permission/` |
| 部门数据边界 | `server/src/modules/department-permission/` |
| 细粒度权限定义 | `server/src/modules/fine-grained-permission/` |
| 业务规则参考 | BR-352, BR-354, BR-355, BR-356, BR-357, BR-358, P1-2, P1-10, P1-12, P1-13, P2-20 |
