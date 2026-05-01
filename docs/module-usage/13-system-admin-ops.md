# 系统管理与运维模块

---
module_id: system-admin-ops
business_chain:
  - 用户认证 → 角色分配 → 权限校验 → 操作审计
  - 系统指标采集 → 告警规则评估 → 告警通知
  - 定时备份 / 手动备份 → 备份历史 → 恢复操作
module_type:
  - 系统支撑型模块（非业务链核心）
source_of_truth:
  - schema: User, Role, Permission, RolePermission（RBAC 主权限模型）
  - schema: FineGrainedPermission, RoleFineGrainedPermission, UserPermission（ABAC 细粒度扩展）
  - schema: DepartmentPermission（部门边界隔离）
  - schema: PermissionLog, OperationLog, SensitiveLog, LoginLog（审计日志）
  - schema: SystemMetric, AlertRule, AlertHistory（监控指标与告警）
  - schema: BackupHistory（备份记录）
facts_or_projections:
  - Role/Permission/RolePermission：RBAC 事实源，admin/leader/user 三角色
  - FineGrainedPermission + UserPermission：ABAC 扩展事实源（P1-2）
  - DepartmentPermission：部门资源隔离策略事实源
  - PermissionLog：权限变更审计事实源
  - SystemMetric：监控指标事实源（持久化到数据库）
  - AlertRule：告警规则定义事实源
  - AlertHistory：已触发告警历史事实源
  - BackupHistory：备份操作历史事实源
downstream_consumers:
  - 所有业务模块（通过 JwtAuthGuard + RolesGuard + FineGrainedPermissionGuard 控制访问）
  - 部门模块（通过 DepartmentPermission 隔离部门数据）
  - 待办聚合（通过权限决定谁能看到哪些任务）
current_entrypoints:
  - /permissions (PermissionList.vue)
  - /permissions/fine-grained (FineGrainedPermission.vue)
  - /permissions/department (DepartmentPermission.vue)
  - /permissions/audit-log (PermissionAuditLog.vue)
  - /admin/user-permissions (UserPermissionsManager.vue)
  - /admin/permissions (PermissionDefinitions.vue)
  - /users/:id/permissions (UserPermissions.vue)
  - /monitoring/dashboard (Dashboard.vue)
  - /monitoring/metrics (MetricsPage.vue)
  - /monitoring/alerts/rules (AlertRuleList.vue)
  - /monitoring/alerts/history (AlertHistoryList.vue)
  - /backup/manage (BackupManage.vue)
last_verified_commit: 7bab98dc3ccd49e8e1d76b95b28a1b79207c483c
---

## 1. 模块定位

系统管理与运维模块承担以下三个职责：

| 职责 | 核心对象 | 管理范围 |
|------|---------|----------|
| **权限管理** | Role/Permission/FineGrainedPermission/UserPermission/DepartmentPermission | 用户-角色-权限三层 RBAC，叠加 ABAC 细粒度扩展和部门边界隔离 |
| **监控与告警** | SystemMetric/AlertRule/AlertHistory | 系统性能指标采集、告警规则评估、告警历史 |
| **备份管理** | BackupHistory | PostgreSQL 和 MinIO 的手动/定时备份记录 |

### 1.1 权限模型层次

当前系统存在四个权限事实层，优先级从高到低：

1. **角色（RBAC）**：`Role` → `RolePermission` → `Permission`；三个预置角色：`admin`/`leader`/`user`
2. **细粒度角色权限（ABAC-Role）**：`RoleFineGrainedPermission`；角色级别的 resource+action 白名单
3. **用户直接授权（ABAC-User）**：`UserPermission` → `FineGrainedPermission`；对特定用户的例外授权，支持有效期和资源范围
4. **部门边界（DepartmentPermission）**：`DepartmentPermission`；限制部门对特定资源的访问，是数据隔离层而非功能权限层

**关键结论**：`FineGrainedPermission` + `UserPermission` 是 ABAC 的细粒度定义源，`Permission` + `RolePermission` 是 RBAC 的粗粒度定义源。两者并存，由 `FineGrainedPermissionGuard` 在请求时联合评估。`DepartmentPermission` 是独立的数据边界层。

## 2. 使用角色

| 角色 | 使用目的 | 关键动作 |
|------|----------|----------|
| 系统管理员 (admin) | 管理角色/权限定义、分配用户权限、查看审计日志、触发备份、配置告警 | 所有 admin 路由 |
| 主管 (leader) | 查看部门级数据、部分审批权限 | 受 RolesGuard 保护的 leader 路由 |
| 运维人员 | 查看系统监控指标、管理告警规则、触发备份 | /monitoring/*, /backup/* |
| 普通用户 | 查看自身权限 | /users/:id/permissions |

## 3. 当前入口

| 入口 | 页面 | 前端 API | 后端 API | 后端模块 |
|------|------|----------|----------|----------|
| /permissions | PermissionList.vue | `GET /permissions` | `GET /permissions` | permission.controller |
| /permissions/fine-grained | FineGrainedPermission.vue | `GET /fine-grained-permissions` | `GET /fine-grained-permissions` | fine-grained-permission.controller |
| /permissions/department | DepartmentPermission.vue | `GET /department-permissions/:deptId` | `GET /department-permissions/:deptId` | department-permission.controller |
| /permissions/audit-log | PermissionAuditLog.vue | `GET /permission-logs` (待确认) | 需要确认 | 未知，见 GAP-7 |
| /admin/user-permissions | UserPermissionsManager.vue | `GET /user-permissions` | `GET /user-permissions` | user-permission.controller |
| /monitoring/dashboard | Dashboard.vue | 聚合多个指标接口 | 多个 monitoring 端点 | monitoring.controller |
| /monitoring/metrics | MetricsPage.vue | `GET /monitoring/metrics/query` | `POST /monitoring/metrics/query` | monitoring.controller（**方法不匹配**，见 GAP-8） |
| /monitoring/alerts/rules | AlertRuleList.vue | `GET /monitoring/alerts/rules` | `GET /monitoring/alerts/rules` | monitoring.controller |
| /monitoring/alerts/history | AlertHistoryList.vue | `GET /monitoring/alerts/history` | `POST /monitoring/alerts/history/query` | monitoring.controller（**路径+方法不匹配**，见 GAP-9） |
| /backup/manage | BackupManage.vue | `GET /backup/available`, `GET /backup/:id/status` | 这两个端点不存在 | backup.controller（**端点缺失**，见 GAP-10, GAP-11） |

## 4. 当前实现

| 对象 | 当前实现 | 说明 |
|------|----------|------|
| Role | `roles` 表，code 唯一 | 三个预置角色：admin/leader/user；User.role 字段已废弃，应使用 User.roleId |
| Permission | `permissions` 表，resource+action 唯一 | RBAC 粗粒度权限定义 |
| RolePermission | `role_permissions` 桥接表 | 角色-权限多对多 |
| FineGrainedPermission | `fine_grained_permissions` 表，code 唯一 | ABAC 细粒度权限定义，含 category/scope |
| RoleFineGrainedPermission | `role_fine_grained_permissions` 表 | 角色级 ABAC 权限配置 |
| UserPermission | `user_permissions` 表 | 用户例外授权，支持 expiresAt 和 resourceType/resourceId 范围 |
| DepartmentPermission | `department_permissions` 表 | 部门级资源访问策略 |
| PermissionLog | `permission_logs` 表 | 权限变更操作审计 |
| OperationLog | `operation_logs` 表 | 所有操作日志（module/action/objectId） |
| SensitiveLog | `sensitive_logs` 表 | 敏感操作专项记录（删除/导出/审批/驳回） |
| LoginLog | 通过 User 关联 | 登录历史 |
| SystemMetric | `system_metrics` 表（BigInt PK） | 持久化的性能指标，含 metricType（system/application/business） |
| AlertRule | `alert_rules` 表 | 告警规则定义，含阈值/条件/通知渠道 |
| AlertHistory | `alert_histories` 表 | 已触发告警，含 acknowledged/resolved 状态机 |
| BackupHistory | `backup_histories` 表 | 备份执行记录（postgres/minio 两类） |
| BackupService | 调用 docker exec 执行 pg_dump | 备份文件保存在容器内 /tmp，不是对象存储 |
| MetricsService | 使用 prom-client 生成 Prometheus 格式指标 | `GET /monitoring/metrics` 输出 Prometheus 文本 |
| AlertService | 权威路径：`/monitoring/alerts/*`（由 MonitoringController 提供）；`/alerts/*` 独立路由已停止注册（GAP-511 已修复） | AlertController 已从 AlertModule.controllers 移除，AlertService 仍由 AlertModule export 供 MonitoringModule 使用 |

## 5. 正确业务流程

### 5.1 权限配置流程

| 步骤 | 用户动作 | 系统结果 | 绑定模块 | 缺失后果 |
|------|----------|----------|----------|----------|
| 1 | 管理员定义 Permission（resource/action） | Permission 写入 | permission | 无法做 RBAC 权限分配 |
| 2 | 管理员将 Permission 绑定到 Role | RolePermission 写入 | permission | 角色无功能权限 |
| 3 | 管理员将 Role 分配给 User | User.roleId 更新 | user/role | 用户无角色，所有操作被拒绝 |
| 4 | 管理员可对特定用户授予细粒度权限 | UserPermission 写入 | user-permission | 无法做例外授权 |
| 5 | 系统在请求时通过 FineGrainedPermissionGuard 评估 | 拦截非法请求 | fine-grained-permission | 越权操作不被阻断 |
| 6 | 所有权限变更写入 PermissionLog | 审计记录 | permission | 无法追溯权限变更历史 |

### 5.2 监控告警流程

| 步骤 | 用户动作 | 系统结果 | 绑定模块 | 缺失后果 |
|------|----------|----------|----------|----------|
| 1 | 管理员创建告警规则 | AlertRule 写入 | alert | 无自动告警 |
| 2 | 系统按指标值评估告警规则 | AlertHistory 写入 | monitoring/alert | 告警不触发 |
| 3 | 运维人员确认告警 | AlertHistory.status → acknowledged | alert | 告警堆积无处理 |
| 4 | 问题解决后标记 resolve | AlertHistory.status → resolved | alert | 告警历史状态不完整 |

### 5.3 备份流程

| 步骤 | 用户动作 | 系统结果 | 绑定模块 | 缺失后果 |
|------|----------|----------|----------|----------|
| 1 | 管理员触发备份（手动或定时） | BackupService 执行 pg_dump/MinIO 备份 | backup | 无备份文件 |
| 2 | 备份记录写入 BackupHistory | BackupHistory.status = success/failed | backup | 无法查看历史 |
| 3 | 管理员查看备份历史 | `GET /backup/history` | backup.controller | 无法掌握备份状态 |

## 6. 上下游绑定关系

- **权限系统 → 所有业务模块**：`JwtAuthGuard` 验证 JWT，`RolesGuard` 按角色限制路由，`FineGrainedPermissionGuard` 按细粒度权限码限制操作。
- **DepartmentPermission → 数据隔离**：`DepartmentPermissionService.checkAccess` 用于限制跨部门数据访问，与功能权限独立。
- **PermissionLog → 审计**：记录 `assign_role`/`revoke_role`/`change_department` 三类变更，是权限合规审计的事实源。
- **AlertService 权威路径**：告警 API 权威路径为 `/monitoring/alerts/*`（由 monitoring.controller 提供）。`/alerts/*` 独立路由已于 GAP-511 修复中停止注册；`alert.controller.ts` 保留但不再挂载。
- **MetricsService → Prometheus**：`GET /monitoring/metrics` 输出 Prometheus 格式，可被外部监控系统抓取；数据库指标持久化由 `POST /monitoring/metrics` 写入 SystemMetric。

## 7. 当前系统差距

| GAP 编号 | 当前问题 | 根因 | 影响后果 | 严重级别 | 验证状态 | 证据 |
|----------|----------|------|----------|----------|----------|------|
| GAP-505 | `User.role`（String 字段）已被标注 `@deprecated` 应使用 `User.roleId`，但无法确认全部业务代码是否已迁移 | 向后兼容保留了双字段 | 如果仍有代码读取 `User.role` String，角色判断结果可能与 `User.roleId` 不一致 | P1（高） | 需要运行系统确认 | `schema.prisma:L110` 注释 `@deprecated`；`record-task.controller.ts:L36` 中 `req.user?.role === 'admin'` 仍在使用 String role |
| GAP-506 | `/permissions/audit-log` 页面（PermissionAuditLog.vue）调用的前端 API 端点未在前端 API 文件中找到明确定义，后端 permission-log 控制器是否存在需要确认 | 权限审计日志功能可能未完整实现 | 审计日志页面可能无法正常展示 | P2（中） | 未验证 | `client/src/views/permission/PermissionAuditLog.vue` 存在，但 `client/src/api/permission.ts` 无 permissionLog 方法 |
| GAP-507 | 前端 `queryMetrics` 调用 `GET /monitoring/metrics/query`，后端定义为 `@Post('metrics/query')` | 前端使用 GET，后端要求 POST + 请求体 | 指标查询返回 404/405，监控图表无数据 | P1（高） | 已验证 | `client/src/api/monitoring.ts:L76`；`server/src/modules/monitoring/monitoring.controller.ts:L56` |
| GAP-508 | 前端 `queryAlertHistory` 调用 `GET /monitoring/alerts/history`，后端路由为 `POST /monitoring/alerts/history/query` | 路径不同（history vs history/query）且方法不同（GET vs POST） | 告警历史列表无数据 | P1（高） | 已验证 | `client/src/api/monitoring.ts:L116`；`server/src/modules/monitoring/monitoring.controller.ts:L138` |
| GAP-509 | 前端 `getAvailableBackups` 调用 `GET /backup/available`，后端无此路由 | 前端实现了接口但后端未实现对应端点（现有 `POST /backup/restore` 返回可用备份列表） | 备份页面无法展示可用于恢复的备份列表 | P1（高） | 已验证 | `client/src/api/backup.ts:L36`；`server/src/modules/backup/backup.controller.ts` 无 `GET /backup/available` 路由 |
| GAP-510 | 前端 `getBackupStatus` 调用 `GET /backup/:id/status`，后端无此路由 | 前端实现了轮询状态接口但后端未实现 | 备份进度轮询失败，无法感知备份是否完成 | P2（中） | 已验证 | `client/src/api/backup.ts:L44`；`server/src/modules/backup/backup.controller.ts` 无 `:id/status` 路由 |
| GAP-511 | AlertService 的操作路由在 `/alerts/*`（alert.controller）和 `/monitoring/alerts/*`（monitoring.controller）均注册 | 系统同时注册了两套路由，未清理 | 文档混淆，客户端应调用哪个路径不明确；可能造成 API 版本冲突 | P2（中） | **已修复**（PR codex/gap-511-alert-route-dedup） | `AlertController` 已从 `AlertModule.controllers` 移除；权威路径收敛至 `/monitoring/alerts/*` |
| GAP-512 | 四个权限模型（Permission/FineGrainedPermission/UserPermission/DepartmentPermission）并存，文档未说明哪一个是管理员配置的"权威入口" | P1-2 阶段引入了 ABAC 叠加层 | 新开发者不清楚应该配置哪个模型，可能导致权限漏配或重复配置 | P2（中） | 已验证（权限层级已梳理，但文档缺失） | `schema.prisma:L595`（Role）, L641（FineGrainedPermission）, L2349（DepartmentPermission）；各自独立模块 |

## 8. 整改建议

| GAP 编号 | 建议整改 | 依赖模块 | 是否需要新设计 | 建议 PR | 是否可并行 |
|----------|----------|----------|----------------|---------|-----------|
| GAP-505 | 全局搜索 `req.user?.role === 'admin'` 等 String role 判断，统一改为基于 `req.user?.roleId` 和角色对象；完成后可删除 `User.role` 字符串字段 | auth, user | 否 | fix/migrate-user-role-string-to-roleid | 否（需全量扫描） |
| GAP-506 | 在后端补充 `/permission-logs` 路由（或确认现有路由路径），前端补充对应 API 适配器 | permission | 需要确认 | fix/permission-audit-log-endpoint | 是 |
| GAP-507 | 将前端 `queryMetrics` 改为 `POST /monitoring/metrics/query`，或后端新增 `GET /monitoring/metrics/query` 查询参数支持 | monitoring | 否 | fix/monitoring-metrics-query-method | 是 |
| GAP-508 | 将前端 `queryAlertHistory` 改为调用 `POST /monitoring/alerts/history/query`，并修改参数为请求体格式 | monitoring, alert | 否 | fix/monitoring-alert-history-path | 是 |
| GAP-509 | 在后端 backup.controller 新增 `GET /backup/available` 端点，调用现有 `listAvailableForRestore` service 方法 | backup | 否 | fix/backup-available-endpoint | 是 |
| GAP-510 | 在后端补充 `GET /backup/:id/status` 端点，按 BackupHistory 记录状态返回 | backup | 否 | fix/backup-status-endpoint | 是 |
| GAP-511 | 明确声明 `/monitoring/alerts/*` 为权威路径，废弃 `/alerts/*` 独立路由；或反之。更新前端 API 使用统一路径 | alert, monitoring | 否 | fix/alert-route-dedup | 是 |
| GAP-512 | 补充权限模型决策文档：何时用 Role+Permission（粗粒度功能控制），何时用 FineGrainedPermission（细粒度操作控制），何时用 DepartmentPermission（数据隔离） | permission | 否 | docs/permission-model-decision-guide | 是 |

## 9. 证据索引

- `server/src/modules/auth/auth.controller.ts`：认证接口，`@Post('profile')` HTTP 方法问题（见 12-task-approval-workflow GAP-501）
- `server/src/modules/permission/permission.controller.ts`：RBAC Permission CRUD
- `server/src/modules/fine-grained-permission/fine-grained-permission.controller.ts`：ABAC 细粒度权限管理
- `server/src/modules/user-permission/user-permission.controller.ts`：用户例外授权管理
- `server/src/modules/department-permission/department-permission.controller.ts`：部门权限隔离
- `server/src/modules/monitoring/monitoring.controller.ts`：监控指标 + 告警规则（双路径）
- `server/src/modules/alert/alert.controller.ts`：独立告警管理路由
- `server/src/modules/backup/backup.controller.ts`：备份管理（缺 available 和 status 端点）
- `server/src/modules/backup/backup.service.ts`：备份执行（docker exec pg_dump）
- `server/src/modules/scheduled-task/scheduled-task.service.ts`：定时任务调度
- `client/src/api/monitoring.ts`：前端监控 API 适配器（含多处方法/路径不匹配）
- `client/src/api/backup.ts`：前端备份 API 适配器（含不存在的端点调用）
- `client/src/api/permission.ts`：前端权限 API 适配器
- `server/src/prisma/schema.prisma:L595`：Role 模型
- `server/src/prisma/schema.prisma:L611`：Permission 模型
- `server/src/prisma/schema.prisma:L641`：FineGrainedPermission 模型
- `server/src/prisma/schema.prisma:L662`：UserPermission 模型
- `server/src/prisma/schema.prisma:L2332`：RoleFineGrainedPermission 模型
- `server/src/prisma/schema.prisma:L2349`：DepartmentPermission 模型
- `server/src/prisma/schema.prisma:L1824`：PermissionLog 模型
- `server/src/prisma/schema.prisma:L1877`：SystemMetric 模型
- `server/src/modules/record-task/record-task.controller.ts:L36`：`req.user?.role === 'admin'` String role 仍在使用

## 10. 禁止重复实现与事实源边界

| 对象 | 当前事实源 | 允许展示字段 | 禁止新增的平行事实源 | 旧字段或旧模块处理 |
|------|-----------|-------------|---------------------|-------------------|
| 用户角色 | `User.roleId` → `roles` | 角色名称/code 展示 | 禁止在业务代码中用 `User.role` String 新建角色判断逻辑 | `User.role` String 字段废弃，待全量迁移后删除 |
| 功能权限 | `permissions` + `role_permissions` | 权限描述展示 | 禁止在各业务模块自建权限枚举表 | 无旧版本 |
| 细粒度权限 | `fine_grained_permissions` + `user_permissions` | 权限码/分类/范围展示 | 禁止绕过 FineGrainedPermissionGuard 在 controller 层手动判断权限码 | 无旧版本 |
| 部门数据隔离 | `department_permissions` | 部门名称/允许操作展示 | 禁止在 service 层直接 hardcode 部门 ID 做数据过滤 | 无旧版本 |
| 监控指标（数据库） | `system_metrics` | 指标值/类型/时间戳展示 | 禁止在业务代码中直接写 system_metrics，应通过 MonitoringService | 无旧版本 |
| 告警规则 | `alert_rules` | 规则名/条件/阈值展示 | 禁止在代码层 hardcode 告警阈值 | 无旧版本 |
| 备份记录 | `backup_histories` | 备份类型/状态/时间展示 | 禁止绕过 BackupService 直接写 backup_histories | 无旧版本 |

## 11. 后续整改入口

| 优先级 | GAP 编号 | 推荐 PR | 前置依赖 | 可并行 | 验收命令 |
|--------|----------|---------|----------|--------|---------|
| P1 | GAP-507 | fix/monitoring-metrics-query-method | 无 | 是 | 前端监控页面指标图表有数据渲染 |
| P1 | GAP-508 | fix/monitoring-alert-history-path | 无 | 是 | 告警历史列表可以加载数据 |
| P1 | GAP-509 | fix/backup-available-endpoint | 无 | 是 | `GET /backup/available` 返回 200 + 列表 |
| P1 | GAP-505 | fix/migrate-user-role-string-to-roleid | 无 | 否 | 全局 `grep "req.user?.role"` 无 String 比较 |
| P2 | GAP-510 | fix/backup-status-endpoint | 无 | 是 | `GET /backup/:id/status` 返回 200 + BackupHistory |
| P2 | GAP-511 | fix/alert-route-dedup | GAP-508 前 | 是 | 确认唯一一套告警路由路径 |
| P2 | GAP-506 | fix/permission-audit-log-endpoint | 需确认 | 是 | `/permissions/audit-log` 页面可加载数据 |
| P2 | GAP-512 | docs/permission-model-decision-guide | 无 | 是 | 文档包含四层权限模型决策树 |
