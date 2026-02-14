# 权限管理（RBAC 基础权限） - Task 分解

> **来源**: docs/design/mvp/05_权限管理.md  
> **总工作量**: 160h  
> **优先级**: P0（MVP 核心功能）  
> **依赖**: 无

---

## Task 统计

| 类型 | 数量 | 工作量 |
|------|------|--------|
| 数据模型 | 3 | 24h |
| 后端 API | 4 | 64h |
| 前端 UI | 3 | 48h |
| 测试 | 3 | 24h |
| **总计** | **13** | **160h** |

---

## TASK-066: 创建角色数据模型

**类型**: 数据模型

**工作量**: 8h

**优先级**: P0（阻塞其他 Task）

**依赖**: 无

**描述**:
创建角色表，用于 RBAC 权限管理。

**验收标准**:
- [ ] Prisma Schema 编写完成（schema.prisma）
- [ ] roles 表包含所有字段（id, name, code, description, created_at, updated_at, deleted_at）
- [ ] 唯一索引配置正确（code 字段 @unique）
- [ ] 数据库迁移文件生成
- [ ] 软删除字段配置正确

**技术要点**:
- code 字段用于角色标识（admin, leader, member）
- name 字段用于显示名称（管理员、主管、普通成员）

**相关文件**:
- server/src/prisma/schema.prisma
- server/prisma/migrations/xxx_add_roles/

**后续 Task**: TASK-069（角色 API 依赖此表）

---

## TASK-067: 创建权限数据模型

**类型**: 数据模型

**工作量**: 8h

**优先级**: P0

**依赖**: 无

**描述**:
创建权限表，用于存储系统权限点。

**验收标准**:
- [ ] Prisma Schema 编写完成（schema.prisma）
- [ ] permissions 表包含所有字段（id, resource, action, description, created_at, updated_at）
- [ ] 复合唯一索引配置正确（@@unique([resource, action])）
- [ ] 数据库迁移文件生成

**技术要点**:
- resource 字段表示资源类型（document, template, task, approval）
- action 字段表示操作类型（create, read, update, delete, approve）

**相关文件**:
- server/src/prisma/schema.prisma
- server/prisma/migrations/xxx_add_permissions/

**后续 Task**: TASK-069（权限 API 依赖此表）

---

## TASK-068: 创建角色权限关联表

**类型**: 数据模型

**工作量**: 8h

**优先级**: P0

**依赖**: TASK-066, TASK-067

**描述**:
创建角色权限关联表，建立多对多关系。

**验收标准**:
- [ ] Prisma Schema 编写完成（schema.prisma）
- [ ] role_permissions 表包含字段（id, role_id, permission_id, created_at）
- [ ] 外键约束配置正确（role_id 引用 roles(id), permission_id 引用 permissions(id)）
- [ ] 复合唯一索引配置正确（@@unique([role_id, permission_id])）
- [ ] 数据库迁移文件生成

**相关文件**:
- server/src/prisma/schema.prisma
- server/prisma/migrations/xxx_add_role_permissions/

**后续 Task**: TASK-069（权限分配 API 依赖此表）

---

## TASK-069: 实现角色 CRUD API

**类型**: 后端 API

**工作量**: 16h

**优先级**: P0

**依赖**: TASK-066

**描述**:
实现角色的创建、读取、更新、删除 API。

**API 端点**:
- POST /api/v1/roles - 创建角色
- GET /api/v1/roles - 查询角色列表
- GET /api/v1/roles/:id - 查询角色详情
- PUT /api/v1/roles/:id - 更新角色
- DELETE /api/v1/roles/:id - 删除角色

**验收标准**:
- [ ] 所有端点实现完成
- [ ] 请求/响应格式符合设计文档
- [ ] 角色 code 唯一性校验
- [ ] 权限校验（只有 Admin 可操作）
- [ ] 异常处理
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] API 文档（Swagger）生成

**相关文件**:
- server/src/modules/role/role.controller.ts
- server/src/modules/role/role.service.ts
- server/test/role.e2e-spec.ts

**后续 Task**: TASK-073（前端角色管理页面依赖此 API）

---

## TASK-070: 实现权限 CRUD API

**类型**: 后端 API

**工作量**: 16h

**优先级**: P0

**依赖**: TASK-067

**描述**:
实现权限的创建、读取、更新、删除 API。

**API 端点**:
- POST /api/v1/permissions - 创建权限
- GET /api/v1/permissions - 查询权限列表
- GET /api/v1/permissions/:id - 查询权限详情
- PUT /api/v1/permissions/:id - 更新权限
- DELETE /api/v1/permissions/:id - 删除权限

**验收标准**:
- [ ] 所有端点实现完成
- [ ] 请求/响应格式符合设计文档
- [ ] 权限 (resource, action) 唯一性校验
- [ ] 权限校验（只有 Admin 可操作）
- [ ] 异常处理
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] API 文档（Swagger）生成

**相关文件**:
- server/src/modules/permission/permission.controller.ts
- server/src/modules/permission/permission.service.ts
- server/test/permission.e2e-spec.ts

**后续 Task**: TASK-074（前端权限管理页面依赖此 API）

---

## TASK-071: 实现角色权限分配 API

**类型**: 后端 API

**工作量**: 16h

**优先级**: P0

**依赖**: TASK-068

**描述**:
实现角色权限分配 API，支持批量分配和撤销权限。

**API 端点**:
- POST /api/v1/roles/:id/permissions - 分配权限
- DELETE /api/v1/roles/:id/permissions/:permissionId - 撤销权限
- GET /api/v1/roles/:id/permissions - 查询角色权限

**验收标准**:
- [ ] 所有端点实现完成
- [ ] 支持批量分配权限
- [ ] 支持撤销单个权限
- [ ] 查询角色权限列表正确
- [ ] 权限校验（只有 Admin 可操作）
- [ ] 异常处理
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] API 文档（Swagger）生成

**相关文件**:
- server/src/modules/role/role.controller.ts
- server/src/modules/role/role.service.ts
- server/test/role.e2e-spec.ts

**后续 Task**: TASK-075（前端权限分配组件依赖此 API）

---

## TASK-072: 实现权限校验中间件

**类型**: 后端 API

**工作量**: 16h

**优先级**: P0

**依赖**: TASK-068

**描述**:
实现权限校验中间件（Guard），用于 API 端点的权限控制。

**功能要求**:
- 检查用户是否具有指定权限（resource, action）
- 支持装饰器方式使用（@RequirePermissions('document', 'create')）
- Admin 角色拥有所有权限

**验收标准**:
- [ ] 权限校验逻辑正确
- [ ] 支持装饰器方式使用
- [ ] Admin 角色拥有所有权限
- [ ] 无权限时返回 403 错误
- [ ] 异常处理
- [ ] 单元测试覆盖率 ≥ 80%

**技术要点**:
- 使用 NestJS Guard 实现
- 使用自定义装饰器 @RequirePermissions

**相关文件**:
- server/src/guards/permission.guard.ts
- server/src/decorators/require-permissions.decorator.ts
- server/test/permission.guard.spec.ts

**后续 Task**: 无（此中间件在所有需要权限控制的 API 端点使用）

---

## TASK-073: 实现角色管理页面（前端）

**类型**: 前端 UI

**工作量**: 16h

**优先级**: P0

**依赖**: TASK-069

**描述**:
实现角色管理页面，支持创建、编辑、删除角色。

**页面路由**: `/roles`

**功能要求**:
- 角色列表展示（表格）
- 创建角色按钮
- 编辑/删除按钮
- 分页

**验收标准**:
- [ ] 页面布局符合设计稿
- [ ] 角色列表正确展示
- [ ] 创建角色功能正常
- [ ] 编辑角色功能正常
- [ ] 删除角色功能正常
- [ ] 权限校验（只有 Admin 可操作）
- [ ] 异常处理
- [ ] 响应式布局

**主要组件**:
- RoleList.vue - 角色列表组件
- RoleForm.vue - 角色表单组件

**相关文件**:
- client/src/views/role/RoleList.vue
- client/src/components/role/RoleForm.vue

**后续 Task**: TASK-075（权限分配组件）

---

## TASK-074: 实现权限管理页面（前端）

**类型**: 前端 UI

**工作量**: 16h

**优先级**: P0

**依赖**: TASK-070

**描述**:
实现权限管理页面，支持创建、编辑、删除权限。

**页面路由**: `/permissions`

**功能要求**:
- 权限列表展示（表格）
- 创建权限按钮
- 编辑/删除按钮
- 分页

**验收标准**:
- [ ] 页面布局符合设计稿
- [ ] 权限列表正确展示（resource, action, description）
- [ ] 创建权限功能正常
- [ ] 编辑权限功能正常
- [ ] 删除权限功能正常
- [ ] 权限校验（只有 Admin 可操作）
- [ ] 异常处理
- [ ] 响应式布局

**主要组件**:
- PermissionList.vue - 权限列表组件
- PermissionForm.vue - 权限表单组件

**相关文件**:
- client/src/views/permission/PermissionList.vue
- client/src/components/permission/PermissionForm.vue

**后续 Task**: 无

---

## TASK-075: 实现权限分配组件（前端）

**类型**: 前端 UI

**工作量**: 16h

**优先级**: P0

**依赖**: TASK-071

**描述**:
实现权限分配组件，支持为角色批量分配/撤销权限。

**功能要求**:
- 权限树展示（按 resource 分组）
- 复选框选择权限
- 批量分配/撤销按钮
- 保存按钮

**验收标准**:
- [ ] 权限树展示正确（按 resource 分组）
- [ ] 复选框选择功能正常
- [ ] 批量分配功能正常
- [ ] 撤销权限功能正常
- [ ] 保存成功后提示信息
- [ ] 权限校验（只有 Admin 可操作）
- [ ] 异常处理
- [ ] 响应式布局

**主要组件**:
- RolePermissions.vue - 权限分配组件

**相关文件**:
- client/src/components/role/RolePermissions.vue

**后续 Task**: 无

---

## TASK-076: 编写权限管理单元测试（后端）

**类型**: 测试

**工作量**: 8h

**优先级**: P1

**依赖**: TASK-069, TASK-070, TASK-071, TASK-072

**描述**:
编写权限管理模块的单元测试，覆盖核心业务逻辑。

**测试范围**:
- 角色 CRUD 逻辑
- 权限 CRUD 逻辑
- 角色权限分配逻辑
- 权限校验中间件逻辑

**验收标准**:
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] 所有核心业务规则有对应测试用例
- [ ] Mock 外部依赖
- [ ] 测试用例清晰、可读
- [ ] 所有测试通过

**相关文件**:
- server/test/role.service.spec.ts
- server/test/permission.service.spec.ts
- server/test/permission.guard.spec.ts

**后续 Task**: 无

---

## TASK-077: 编写权限管理集成测试（后端）

**类型**: 测试

**工作量**: 8h

**优先级**: P1

**依赖**: TASK-069, TASK-070, TASK-071

**描述**:
编写权限管理模块的集成测试，验证 API 端点。

**测试范围**:
- 角色 CRUD API
- 权限 CRUD API
- 角色权限分配 API

**验收标准**:
- [ ] 所有 API 端点有对应测试用例
- [ ] 测试覆盖正常流程和异常流程
- [ ] 测试覆盖权限校验
- [ ] 所有测试通过

**相关文件**:
- server/test/role.e2e-spec.ts
- server/test/permission.e2e-spec.ts

**后续 Task**: 无

---

## TASK-078: 编写前端组件单元测试

**类型**: 测试

**工作量**: 8h

**优先级**: P2

**依赖**: TASK-073, TASK-074, TASK-075

**描述**:
编写前端组件的单元测试，验证组件逻辑。

**测试范围**:
- RoleList.vue
- PermissionList.vue
- RolePermissions.vue

**验收标准**:
- [ ] 所有核心组件有对应测试用例
- [ ] 测试覆盖组件交互逻辑
- [ ] Mock API 请求
- [ ] 所有测试通过

**相关文件**:
- client/src/views/role/__tests__/RoleList.spec.ts
- client/src/views/permission/__tests__/PermissionList.spec.ts
- client/src/components/role/__tests__/RolePermissions.spec.ts

**后续 Task**: 无

---

**本文档完成 ✅**
