# P1-2: 细粒度权限系统 - TASKS.md

> **来源**: docs/design/technical_debt/P1-2_细粒度权限.md
> **模块分类**: Technical Debt（P1 高优先级）
> **实现状态**: ⏳ 未实现（完整技术方案已完成）
> **优先级**: ⭐⭐⭐ 高（Phase 10 跨部门权限功能的基础）
> **依赖**: 无

---

## 任务统计

| 统计项 | 数量 |
|--------|------|
| **总任务数** | 18 |
| **数据模型任务** | 2 |
| **后端 API 任务** | 6 |
| **权限守卫任务** | 2 |
| **前端 UI 任务** | 5 |
| **测试任务** | 3 |
| **预计总工时** | 128h |

---

## 任务列表

### 一、数据模型（2 个任务，24h）

#### TASK-235: Permission 表设计（12h）

**任务描述**:
- 创建 Permission 表（权限定义）
- 定义权限属性：code（权限编码）、name（权限名称）、category（权限类别）、scope（权限范围）
- 权限编码格式：`{action}:{scope}:{resource}`（如 `view:cross_department:document`）
- 权限类别：document、record、task、approval、system
- 权限范围：department、cross_department、global
- 添加索引：code、category、scope

**验收标准**:
- [ ] Prisma Schema 定义完成
- [ ] 权限编码唯一约束（@unique）
- [ ] 索引创建成功（code、category、scope）
- [ ] 初始化 12+ 权限定义（种子数据）
- [ ] 支持权限停用（status: active | inactive）

**依赖**: 无

**权限定义示例**:
```typescript
// 文档权限
view:department:document - 查看本部门文档
view:cross_department:document - 跨部门查看文档
create:department:document - 创建本部门文档
edit:department:document - 编辑本部门文档
delete:department:document - 删除本部门文档

// 记录权限
view:cross_department:record - 跨部门查看记录
fill:cross_department:record - 跨部门填写记录

// 任务权限
assign:cross_department:task - 跨部门分配任务

// 审批权限
approve:cross_department:approval - 跨部门审批

// 系统权限
manage:global:user - 全局用户管理
manage:global:role - 全局角色管理
```

**相关文件**:
- `server/src/prisma/schema.prisma`
- `server/src/prisma/seed.ts`

---

#### TASK-236: UserPermission 表设计（12h）

**任务描述**:
- 创建 UserPermission 表（用户权限授予记录）
- 定义授权属性：userId、permissionId、grantedBy、grantedAt、expiresAt、reason、resourceType、resourceId
- 支持权限过期时间（expiresAt）
- 支持资源级权限（resourceType、resourceId）
- 添加索引：userId、permissionId、expiresAt

**验收标准**:
- [ ] Prisma Schema 定义完成
- [ ] 外键约束：userId → User、permissionId → Permission（onDelete: Cascade）
- [ ] 索引创建成功（userId、permissionId、expiresAt）
- [ ] 支持权限过期检查
- [ ] 支持资源级权限

**依赖**: TASK-235

**技术要点**:
- expiresAt 为 null 表示永久权限
- resourceType 为 null 表示全局权限
- 资源级权限优先于全局权限

**相关文件**:
- `server/src/prisma/schema.prisma`

---

### 二、后端 API（6 个任务，60h）

#### TASK-237: 权限定义 API（8h）

**任务描述**:
- 实现权限定义查询 API
- 实现权限定义创建、更新、停用 API

**验收标准**:
- [ ] GET /api/v1/permissions - 查询所有权限定义
- [ ] GET /api/v1/permissions/:id - 查询权限详情
- [ ] POST /api/v1/permissions - 创建权限定义（管理员）
- [ ] PUT /api/v1/permissions/:id - 更新权限定义（管理员）
- [ ] PUT /api/v1/permissions/:id/disable - 停用权限（管理员）
- [ ] 所有 API 有异常处理

**依赖**: TASK-235

**相关文件**:
- `server/src/modules/permission/permission.controller.ts`
- `server/src/modules/permission/permission.service.ts`
- `server/src/modules/permission/dto/permission.dto.ts`

---

#### TASK-238: 权限授予 API（12h）

**任务描述**:
- 实现权限授予 API
- 实现权限授予时的权限检查（仅管理员或部门主管可授予）
- 实现授权原因强制填写
- 实现授权通知

**验收标准**:
- [ ] POST /api/v1/user-permissions - 授予权限
- [ ] 权限检查：仅管理员或部门主管可授予
- [ ] 授权原因必填
- [ ] 支持权限过期时间（可选）
- [ ] 支持资源级权限（可选）
- [ ] 授权后发送通知给被授权用户

**依赖**: TASK-236

**技术要点**:
- 权限授予时创建 UserPermission 记录
- 授权通知集成通知系统

**相关文件**:
- `server/src/modules/permission/user-permission.controller.ts`
- `server/src/modules/permission/user-permission.service.ts`

---

#### TASK-239: 权限撤销 API（8h）

**任务描述**:
- 实现权限撤销 API
- 实现权限撤销时的权限检查（仅管理员或原授权人可撤销）
- 实现撤销通知

**验收标准**:
- [ ] DELETE /api/v1/user-permissions/:id - 撤销权限
- [ ] 权限检查：仅管理员或原授权人可撤销
- [ ] 撤销后立即生效
- [ ] 撤销后发送通知给被撤销用户

**依赖**: TASK-236

**相关文件**:
- `server/src/modules/permission/user-permission.controller.ts`
- `server/src/modules/permission/user-permission.service.ts`

---

#### TASK-240: 用户权限查询 API（8h）

**任务描述**:
- 实现用户权限列表查询 API
- 实现权限检查 API

**验收标准**:
- [ ] GET /api/v1/user-permissions?userId=xxx - 查询用户权限列表
- [ ] GET /api/v1/user-permissions/check?userId=xxx&permissionCode=xxx - 检查用户是否有特定权限
- [ ] 权限查询时自动过滤过期权限
- [ ] 权限检查时考虑资源级权限

**依赖**: TASK-236

**技术要点**:
- 权限检查逻辑：
  1. 检查全局权限（resourceType = null）
  2. 检查资源级权限（resourceType + resourceId）
  3. 资源级权限优先于全局权限

**相关文件**:
- `server/src/modules/permission/user-permission.controller.ts`
- `server/src/modules/permission/user-permission.service.ts`

---

#### TASK-241: 权限过期检查定时任务（12h）

**任务描述**:
- 实现每日检查过期权限定时任务
- 实现过期权限自动撤销
- 实现过期前 3 天通知

**验收标准**:
- [ ] 定时任务：每日凌晨 1 点检查过期权限
- [ ] 过期权限自动撤销（软删除）
- [ ] 过期前 3 天发送通知给用户和授权人
- [ ] 定时任务日志记录正确

**依赖**: TASK-236

**技术要点**:
- 使用 @nestjs/schedule 实现定时任务
- 过期检查逻辑：expiresAt < NOW()
- 过期前提醒：expiresAt BETWEEN NOW() AND NOW() + 3 DAYS

**相关文件**:
- `server/src/modules/permission/permission.scheduler.ts`

---

#### TASK-242: 权限批量授予 API（12h）

**任务描述**:
- 实现权限批量授予 API
- 实现批量授予时的事务处理

**验收标准**:
- [ ] POST /api/v1/user-permissions/batch - 批量授予权限
- [ ] 批量授予使用 Prisma Transaction
- [ ] 批量授予失败时回滚
- [ ] 批量授予成功后发送通知

**依赖**: TASK-238

**技术要点**:
- 使用 Prisma Transaction 保证原子性
- 批量授予时逐个检查权限

**相关文件**:
- `server/src/modules/permission/user-permission.controller.ts`
- `server/src/modules/permission/user-permission.service.ts`

---

### 三、权限守卫（2 个任务，20h）

#### TASK-243: PermissionGuard 实现（12h）

**任务描述**:
- 实现 PermissionGuard（权限守卫）
- 实现权限校验逻辑（含过期检查）
- 实现资源级权限校验

**验收标准**:
- [ ] PermissionGuard 实现完成
- [ ] 权限校验逻辑正确（含过期检查）
- [ ] 资源级权限校验正确
- [ ] 权限不足时返回 403 Forbidden
- [ ] 权限守卫可复用

**依赖**: TASK-236

**技术要点**:
- 权限校验流程：
  1. 从 JWT 中获取 userId
  2. 查询用户权限列表（包含资源级权限）
  3. 检查权限是否过期
  4. 检查资源级权限（如有）
  5. 检查全局权限

**相关文件**:
- `server/src/modules/permission/guards/permission.guard.ts`

---

#### TASK-244: @RequirePermission 装饰器实现（8h）

**任务描述**:
- 实现 @RequirePermission() 装饰器
- 实现装饰器参数解析
- 实现装饰器与 PermissionGuard 集成

**验收标准**:
- [ ] @RequirePermission() 装饰器实现完成
- [ ] 装饰器支持单个权限
- [ ] 装饰器支持多个权限（OR 逻辑）
- [ ] 装饰器支持资源级权限
- [ ] 装饰器与 PermissionGuard 集成正确

**依赖**: TASK-243

**使用示例**:
```typescript
@Post('/documents/:id/publish')
@RequirePermission('edit:department:document')
async publishDocument(@Param('id') id: string) {
  // ...
}

@Get('/documents')
@RequirePermission('view:cross_department:document')
async listAllDocuments() {
  // ...
}
```

**相关文件**:
- `server/src/modules/permission/decorators/require-permission.decorator.ts`

---

### 四、前端 UI（5 个任务，60h）

#### TASK-245: 用户权限管理页面（16h）

**任务描述**:
- 实现用户权限管理页面（路由：/users/:id/permissions）
- 实现权限列表显示
- 实现授予权限按钮
- 实现撤销权限按钮

**验收标准**:
- [ ] 用户权限列表显示：权限名称、范围、授予人、过期时间、状态
- [ ] 过期权限标红显示
- [ ] 授予权限按钮点击打开授予对话框
- [ ] 撤销权限按钮点击显示确认对话框
- [ ] 撤销成功后刷新列表

**依赖**: TASK-240

**相关文件**:
- `client/src/views/user/UserPermissions.vue`
- `client/src/api/permission.ts`

---

#### TASK-246: 授予权限对话框（16h）

**任务描述**:
- 实现授予权限对话框
- 实现权限类别筛选
- 实现权限过期时间选择
- 实现资源级权限配置

**验收标准**:
- [ ] 对话框显示：权限类别下拉、权限名称下拉、授权原因输入、过期时间选择
- [ ] 权限类别选择后过滤权限名称
- [ ] 资源级权限配置（可选）
- [ ] 表单验证正确（授权原因必填）
- [ ] 授予成功后关闭对话框并刷新列表

**依赖**: TASK-238

**相关文件**:
- `client/src/views/user/components/GrantPermissionDialog.vue`

---

#### TASK-247: 权限定义管理页面（12h）

**任务描述**:
- 实现权限定义管理页面（路由：/admin/permissions）
- 实现权限定义列表显示
- 实现权限定义创建、编辑、停用

**验收标准**:
- [ ] 权限定义列表显示：编码、名称、类别、范围、状态
- [ ] 支持按类别/范围筛选
- [ ] 创建/编辑对话框表单验证正确
- [ ] 停用权限时显示确认对话框
- [ ] 仅管理员可访问

**依赖**: TASK-237

**相关文件**:
- `client/src/views/admin/PermissionList.vue`
- `client/src/views/admin/components/PermissionForm.vue`

---

#### TASK-248: 权限图标和标签组件（8h）

**任务描述**:
- 实现权限范围标签组件
- 实现权限状态标签组件
- 实现权限过期状态显示

**验收标准**:
- [ ] 权限范围标签：department（蓝色）、cross_department（橙色）、global（红色）
- [ ] 权限状态标签：active（绿色）、expired（灰色）
- [ ] 过期权限显示倒计时（如"3天后过期"）
- [ ] 组件可复用

**依赖**: 无

**相关文件**:
- `client/src/components/PermissionTag.vue`

---

#### TASK-249: 权限使用统计页面（8h）

**任务描述**:
- 实现权限使用统计页面
- 实现权限授予趋势图表
- 实现权限过期提醒列表

**验收标准**:
- [ ] 权限统计概览：总权限数、已授予数、过期数
- [ ] 权限授予趋势图表（按月）
- [ ] 权限过期提醒列表（过期前 7 天）
- [ ] 支持日期范围筛选

**依赖**: TASK-240

**技术要点**:
- 使用 ECharts 绘制图表

**相关文件**:
- `client/src/views/admin/PermissionStats.vue`

---

### 五、测试（3 个任务，24h）

#### TASK-250: 权限校验单元测试（8h）

**任务描述**:
- 测试 PermissionGuard 权限校验逻辑
- 测试权限过期检查
- 测试资源级权限校验

**验收标准**:
- [ ] 权限校验正确测试
- [ ] 权限过期检查测试
- [ ] 资源级权限优先级测试
- [ ] 权限不足返回 403 测试
- [ ] 单元测试覆盖率 > 85%

**依赖**: TASK-243

**相关文件**:
- `server/src/modules/permission/guards/permission.guard.spec.ts`

---

#### TASK-251: 权限授予集成测试（8h）

**任务描述**:
- 测试权限授予 → 使用 → 撤销完整流程
- 测试权限过期自动撤销
- 测试批量授予事务

**验收标准**:
- [ ] 权限授予流程测试（授予 → 使用 → 撤销）
- [ ] 权限过期自动撤销测试
- [ ] 批量授予事务成功测试
- [ ] 批量授予事务失败回滚测试
- [ ] 集成测试覆盖率 > 80%

**依赖**: TASK-238, TASK-239, TASK-242

**相关文件**:
- `server/src/modules/permission/permission.service.spec.ts`

---

#### TASK-252: 权限系统 E2E 测试（8h）

**任务描述**:
- 测试权限定义管理完整流程
- 测试用户权限管理完整流程
- 测试权限过期提醒流程

**验收标准**:
- [ ] 权限定义管理 E2E 测试通过
- [ ] 用户权限授予 E2E 测试通过
- [ ] 权限撤销 E2E 测试通过
- [ ] 权限过期提醒 E2E 测试通过

**依赖**: TASK-245~249

**相关文件**:
- `e2e/permission.spec.ts`

---

## 实施说明

### 关键技术点

1. **权限编码规范**:
   - 格式：`{action}:{scope}:{resource}`
   - action: view | create | edit | delete | approve | manage
   - scope: department | cross_department | global
   - resource: document | record | task | approval | user | role

2. **权限过期机制**:
   - expiresAt 为 null 表示永久权限
   - 定时任务每日检查过期权限
   - 过期前 3 天提醒用户和授权人

3. **资源级权限**:
   - resourceType + resourceId 确定资源
   - 资源级权限优先于全局权限
   - 资源删除时自动删除资源级权限

4. **权限校验流程**:
   1. 从 JWT 中获取 userId
   2. 查询用户权限列表
   3. 检查权限是否过期
   4. 检查资源级权限（如有）
   5. 检查全局权限

5. **批量授予事务**:
   - 使用 Prisma Transaction 保证原子性
   - 批量授予失败时回滚

### 依赖关系

```
TASK-235 (Permission 表) → TASK-236 (UserPermission 表)
                         → TASK-237 (权限定义 API)

TASK-236 → TASK-238 (权限授予 API) → TASK-242 (批量授予 API)
        → TASK-239 (权限撤销 API)
        → TASK-240 (权限查询 API)
        → TASK-241 (定时任务)
        → TASK-243 (PermissionGuard) → TASK-244 (@RequirePermission 装饰器)

TASK-237 ~ TASK-244 (后端 + 权限守卫) → TASK-245 ~ TASK-249 (前端 UI) → TASK-250 ~ TASK-252 (测试)
```

### 实施顺序建议

1. **Phase 1 - 数据模型**（24h）: TASK-235 ~ TASK-236
2. **Phase 2 - 核心 API**（60h）: TASK-237 ~ TASK-242
3. **Phase 3 - 权限守卫**（20h）: TASK-243 ~ TASK-244
4. **Phase 4 - 前端界面**（60h）: TASK-245 ~ TASK-249
5. **Phase 5 - 测试验证**（24h）: TASK-250 ~ TASK-252

---

**文档版本**: 1.0
**最后更新**: 2026-02-14
**任务总数**: 18
**预计总工时**: 128h
