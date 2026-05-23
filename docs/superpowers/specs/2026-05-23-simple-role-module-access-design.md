# 简化角色与模块开关权限设计

**日期：** 2026-05-23
**状态：** 设计已确认，待 implementation plan 执行
**目标：** 用一套最简单、可快速上线的权限制度替换当前多套权限定义、角色权限、用户授权和细粒度权限并存的实现。

---

## 一句话说明

系统只保留 `admin / leader / user` 三种身份。`admin` 永远全开；`leader` 和 `user` 通过模块开关决定能进入哪些业务模块；模块内的数据范围再由部门、任务、记录、负责人等业务归属规则决定。

上线默认所有业务模块对 `leader` 和 `user` 全部开启，后续由 `admin` 在模块开关页面逐步关闭。

---

## 当前问题

当前权限管理同时存在多套抽象：

1. `Role` 是用户角色来源。
2. `Permission / RolePermission` 提供旧的角色权限。
3. `FineGrainedPermission / UserPermission` 提供用户级细粒度授权。
4. `RoleFineGrainedPermission` 提供另一套角色细粒度权限。
5. 前端暴露了权限管理、用户权限授予、权限定义、细粒度权限、部门权限等多个入口。

这些能力会让业务管理员面对太多概念，也让后续开发继续在权限码、用户授权、角色矩阵和部门权限之间选择。为了快速上线，需要把权限制度收口成一条线。

---

## 核心决策

1. 采用方案 B：三角色 + 极小模块开关。
2. 系统只承认 `Role.code` 中的 `admin / leader / user`。
3. 用户只能拥有一个角色。
4. 不支持给单个账号单独配置权限。
5. 不支持权限码定义。
6. 不支持角色权限矩阵。
7. 不支持用户单独授权。
8. 不支持按钮级、字段级、动作级权限配置。
9. 系统治理区固定 `admin-only`，不进入模块开关。
10. 模块开关只决定业务模块入口是否可见、可访问。
11. 模块内数据由业务归属过滤，不由权限码过滤。
12. `admin` 不入模块开关配置表，代码里永远全开。

最终权限链路：

```text
用户 -> 角色 admin/leader/user -> 模块开关 -> 数据归属规则
```

不再使用：

```text
用户 -> 角色 -> 角色权限 -> 权限定义 -> 细粒度权限 -> 用户单独授权 -> 部门权限
```

---

## 角色制度

| 角色 | 定义 | 权限来源 |
|---|---|---|
| `admin` | 系统管理员 | 永远全开 |
| `leader` | 部门负责人 | 模块开关 + 本部门数据 |
| `user` | 普通员工 | 模块开关 + 本人任务/记录 |

角色规则：

1. `admin` 可以进入系统治理区。
2. `leader/user` 不能进入系统治理区。
3. `leader/user` 的业务模块入口由模块开关决定。
4. 不同 `user` 的模块入口按角色一致。
5. 不同 `user` 的模块内数据可以不同，因为数据按任务、记录、部门或负责人归属过滤。
6. 如果某个普通员工需要更多管理能力，只能调整角色、部门关系或业务分配，不走单独授权。

---

## 模块开关

模块开关只控制模块入口：

```text
moduleKey + roleCode -> enabled
```

只允许配置 `leader` 和 `user`。`admin` 永远全开。

第一版模块 key 沿用当前左侧菜单大类：

| 模块 key | 模块名 |
|---|---|
| `work_execution` | 工作执行 |
| `document_approval` | 文控与审批 |
| `production_execution` | 生产执行 |
| `product_rd` | 产品研发 |
| `quality_compliance` | 质量与合规 |
| `equipment_site` | 设备与现场 |
| `traceability_batch` | 追溯与批次 |
| `warehouse` | 仓库管理 |
| `training` | 培训 |

上线默认值：

| 模块 | leader | user |
|---|---:|---:|
| 工作执行 | 开 | 开 |
| 文控与审批 | 开 | 开 |
| 生产执行 | 开 | 开 |
| 产品研发 | 开 | 开 |
| 质量与合规 | 开 | 开 |
| 设备与现场 | 开 | 开 |
| 追溯与批次 | 开 | 开 |
| 仓库管理 | 开 | 开 |
| 培训 | 开 | 开 |

系统治理区不在表内：

```text
系统治理 = admin-only
```

模块开关页面只给 `admin`，页面是一张矩阵：

| 模块 | leader | user |
|---|---:|---:|
| 工作执行 | 开 | 开 |
| 文控与审批 | 开 | 开 |
| 仓库管理 | 开 | 开 |

模块 key 固定在代码常量里，`admin` 不能新建模块 key。

---

## 后端设计

后端统一权限判断：

```text
是否登录 -> 是否 admin -> 是否系统治理 -> 模块是否开启 -> 数据归属过滤
```

规则：

1. 所有接口先过登录认证。
2. `admin` 永远放行。
3. 系统治理接口只允许 `admin`。
4. 非系统治理接口判断当前角色对应模块是否开启。
5. `leader/user` 进入模块后，由业务服务按数据归属限制结果。
6. `user` 默认只能看本人任务、本人记录、分配给自己的待办。
7. `leader` 默认能看本部门数据、本部门人员相关任务。
8. `admin` 默认能看全量数据。
9. 后端不再读取权限码。
10. 后端不再读取用户单独授权。
11. 后端不再读取角色权限矩阵。

建议新增：

1. `ModuleAccessConfig` 数据模型。
2. `ModuleAccessService` 查询和保存模块开关。
3. `ModuleAccessGuard` 或统一模块访问函数。
4. 后端模块到 URL/API 的静态映射常量。

第一版模块映射可以写在代码里，例如：

```text
warehouse -> /warehouse/*
traceability_batch -> /traceability, /batch-trace, /warehouse/batches
quality_compliance -> /non-conformances, /corrective-actions, /product-recalls
document_approval -> /documents, /templates, /approvals/history
work_execution -> /dashboard, /my-todos, /record-tasks/my, /approvals/pending
```

---

## 前端设计

前端只做两层控制：

```text
角色控制系统治理区
模块开关控制业务模块
```

系统治理区固定 `admin-only`。

系统治理区保留：

1. 用户管理
2. 部门管理
3. 角色管理
4. 模块开关
5. 审计日志

删除或退役前端入口：

1. 权限管理
2. 用户权限授予
3. 权限定义
4. 细粒度权限
5. 部门权限配置
6. 权限审计日志，如果只是权限变更日志，则并入审计日志或退役

业务菜单按模块 key 过滤：

| 菜单组 | 模块 key |
|---|---|
| 工作执行 | `work_execution` |
| 文控与审批 | `document_approval` |
| 生产执行 | `production_execution` |
| 产品研发 | `product_rd` |
| 质量与合规 | `quality_compliance` |
| 设备与现场 | `equipment_site` |
| 追溯与批次 | `traceability_batch` |
| 仓库管理 | `warehouse` |
| 培训 | `training` |

前端加载顺序：

```text
currentUser -> roleCode -> enabledModules -> filter menu
```

直接访问 URL 时：

1. 未登录跳登录页。
2. 非 `admin` 访问系统治理页跳无权限页。
3. 访问已关闭模块跳无权限页。
4. 后端仍需做同样校验，前端隐藏菜单不能作为安全边界。

---

## 数据模型

保留：

```text
User
Role
Department
```

删除权限来源模型：

```text
Permission
RolePermission
FineGrainedPermission
RoleFineGrainedPermission
UserPermission
```

`DepartmentPermission` 如果只服务旧权限系统，也应退役。

新增：

```text
ModuleAccessConfig {
  id
  moduleKey
  roleCode
  enabled
  createdAt
  updatedAt

  unique(moduleKey, roleCode)
}
```

约束：

1. `roleCode` 只允许 `leader` 和 `user`。
2. `moduleKey` 只允许系统内置模块 key。
3. `admin` 不写入配置表。
4. seed 初始化 `leader/user` 对全部业务模块 `enabled = true`。

---

## API 设计

只保留三个模块开关接口：

```text
GET /module-access
```

返回当前用户可访问模块，用于菜单过滤。

```text
GET /admin/module-access
```

`admin` 查看完整模块开关矩阵。

```text
PUT /admin/module-access
```

`admin` 保存模块开关矩阵。

不再提供：

1. 创建权限。
2. 删除权限。
3. 给用户授权。
4. 给角色绑定权限。
5. 检查某个 `permissionCode`。
6. 权限定义列表。

当前用户接口示例：

```json
{
  "roleCode": "user",
  "enabledModules": [
    "work_execution",
    "document_approval",
    "production_execution",
    "product_rd",
    "quality_compliance",
    "equipment_site",
    "traceability_batch",
    "warehouse",
    "training"
  ]
}
```

`admin` 配置接口示例：

```json
{
  "modules": [
    {
      "moduleKey": "warehouse",
      "moduleName": "仓库管理",
      "leader": true,
      "user": true
    }
  ]
}
```

---

## 替换范围

保留或改造：

1. 登录认证。
2. `User.roleId -> Role`。
3. `Role.code = admin / leader / user`。
4. `RolesGuard` 或统一角色判断。
5. 部门归属字段。
6. 审计日志。

删除或退役：

1. `PermissionModule`。
2. `FineGrainedPermissionModule`。
3. `UserPermissionModule`。
4. 只服务旧权限系统的 `DepartmentPermissionModule`。
5. 权限定义页面。
6. 用户权限授予页面。
7. 细粒度权限页面。
8. 权限码式判断，例如 `document:control_manage`。
9. 权限 seed 和 E2E 造出的权限测试数据。

---

## 验收标准

后端验收：

1. `admin` 可以访问系统治理 API。
2. `leader/user` 访问系统治理 API 返回 403。
3. `admin` 访问所有业务模块 API 放行。
4. `leader/user` 访问已开启模块 API 放行。
5. `leader/user` 访问已关闭模块 API 返回 403。
6. 系统不再依赖 `permissionCode` 判断权限。
7. 删除旧权限表后，后端能正常启动。
8. seed 后只生成三类角色和模块开关默认配置。

前端验收：

1. `admin` 左侧菜单能看到系统治理区。
2. `leader/user` 看不到系统治理区。
3. 默认所有业务模块对 `leader/user` 可见。
4. `admin` 关闭某个模块后，对应角色菜单消失。
5. 直接访问关闭模块 URL，进入无权限页。
6. 权限管理、权限定义、用户权限授予、细粒度权限相关入口全部消失。
7. 用户管理页只配置角色，不配置权限。

数据验收：

1. 数据库不再有业务使用的 `Permission / RolePermission / FineGrainedPermission / RoleFineGrainedPermission / UserPermission`。
2. 业务权限来源只剩 `User.roleId -> Role` 和 `ModuleAccessConfig`。

上线说明：

```text
系统只有管理员、部门负责人、普通员工三种身份；管理员可配置每种身份能进入哪些业务模块，模块内看到的数据由部门和任务归属决定。
```

---

## 明确不做

1. 单用户权限。
2. 按钮级权限。
3. 字段级权限。
4. 权限码配置。
5. 角色权限矩阵。
6. 临时授权。
7. 复杂 ABAC。
8. 让 `admin` 新建模块 key。
9. 把系统治理区纳入模块开关。

---

## 后续实施计划要求

implementation plan 必须把这次改造当作“权限子系统替换”，不是旧系统修补。

推荐顺序：

1. 新增模块 key 常量、模块开关模型、seed 默认全开。
2. 新增模块开关 API 和 admin 页面。
3. 前端菜单接入模块开关，并删除旧权限入口。
4. 后端系统治理接口统一收口为 `admin-only`。
5. 后端业务模块接入模块开关校验。
6. 删除旧权限模块、旧页面、旧 seed、旧测试。
7. 清理 schema 和迁移。
8. 补齐前后端验收测试。

实施前必须对将要修改的服务、Guard、Controller 和页面执行 GitNexus impact analysis。
