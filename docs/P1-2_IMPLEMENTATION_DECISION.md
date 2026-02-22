# P1-2: 细粒度权限系统 - 实施决策文档

> **文档版本**: 1.0
> **创建时间**: 2026-02-15
> **作者**: p1-developer
> **状态**: 待决策

---

## 1. 背景

在实施 P1-2 细粒度权限系统（TASK-235 ~ TASK-252）时，发现项目中已存在一套基于角色的权限系统（RBAC），与待实施的细粒度权限系统（ABAC）存在设计冲突。

## 2. 现状分析

### 2.1 现有权限系统（RBAC）

**模型设计**：
```
User → Role → RolePermission → Permission
```

**Permission 表结构**（旧）：
```prisma
model Permission {
  id          String
  resource    String  // document, template, task, approval
  action      String  // create, read, update, delete, approve
  description String?

  roles       RolePermission[]
}
```

**使用场景**：
- 基础角色管理（admin、leader、user）
- 简单权限控制（resource + action 组合）
- 角色继承和分配

**API 路由**：
- `/permissions` - 权限定义管理
- `/roles` - 角色管理

### 2.2 待实施细粒度权限系统（ABAC）

**模型设计**：
```
User → UserPermission → Permission（细粒度）
```

**Permission 表结构**（新）：
```prisma
model Permission {
  id          String
  code        String  // 格式：{action}:{scope}:{resource}
  name        String
  category    String  // document, record, task, approval, system
  scope       String  // department, cross_department, global
  status      String  // active, inactive

  userPermissions UserPermission[]
}
```

**使用场景**：
- 跨部门权限管理
- 资源级权限（特定文档/记录）
- 权限过期管理
- 临时权限授予

**需要的 API 路由**：
- `/permission-definitions` - 细粒度权限定义管理
- `/user-permissions` - 用户权限授予/撤销

---

## 3. 设计冲突

### 3.1 核心问题

1. **表名冲突**：两套系统都需要 `Permission` 表
2. **字段冲突**：旧系统用 `resource + action`，新系统用 `code + category + scope`
3. **关系冲突**：旧系统通过 `RolePermission` 关联，新系统通过 `UserPermission` 关联

### 3.2 错误操作

在初步实施 TASK-235 时，直接修改了现有 `Permission` 表结构，导致：
- ❌ 旧的 RBAC 系统无法使用
- ❌ `RolePermission` 外键引用失效
- ❌ 现有权限数据无法兼容新结构

---

## 4. 解决方案对比

### 方案 A：两个独立 Permission 表（推荐）

#### 设计

```prisma
// 旧的 RBAC 权限（保留）
model Permission {
  id          String   @id @default(cuid())
  resource    String
  action      String
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  roles       RolePermission[]

  @@unique([resource, action])
  @@map("permissions")
}

// 新的 ABAC 权限
model FineGrainedPermission {
  id          String   @id @default(cuid())
  code        String   @unique
  name        String
  category    String
  scope       String
  status      String   @default("active")
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  userPermissions UserPermission[]

  @@index([code])
  @@index([category])
  @@index([scope])
  @@index([status])
  @@map("fine_grained_permissions")
}

// 用户权限授予记录
model UserPermission {
  id                      String    @id @default(cuid())
  userId                  String
  user                    User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  fineGrainedPermissionId String
  fineGrainedPermission   FineGrainedPermission @relation(fields: [fineGrainedPermissionId], references: [id], onDelete: Cascade)
  grantedBy               String
  grantedAt               DateTime  @default(now())
  expiresAt               DateTime?
  reason                  String
  resourceType            String?
  resourceId              String?

  @@index([userId])
  @@index([fineGrainedPermissionId])
  @@index([expiresAt])
  @@map("user_permissions")
}
```

#### 优点

✅ **清晰分离**：两套系统完全独立，职责明确
✅ **向后兼容**：不影响现有 RBAC 系统
✅ **易于维护**：代码逻辑清晰，不会混淆
✅ **易于测试**：独立测试两套系统
✅ **灵活扩展**：未来可以独立演进

#### 缺点

⚠️ **数据冗余**：两个权限表可能有部分重复定义
⚠️ **查询复杂**：需要联合查询两套权限
⚠️ **命名较长**：`FineGrainedPermission` 名称较长

#### 实施成本

- Schema 修改：回滚 `Permission` 表，创建 `FineGrainedPermission` 表
- 代码修改：新建 `/modules/user-permission/` 模块
- 迁移成本：低（旧系统无需迁移）
- 测试成本：中（需要独立测试两套系统）

---

### 方案 B：共用 Permission 表

#### 设计

```prisma
model Permission {
  id          String   @id @default(cuid())

  // 旧字段（RBAC 用，可选）
  resource    String?
  action      String?

  // 新字段（ABAC 用，可选）
  code        String?  @unique
  name        String?
  category    String?
  scope       String?
  status      String?  @default("active")

  description String?
  type        String   @default("rbac")  // rbac | abac
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // 关系
  roles           RolePermission[]
  userPermissions UserPermission[]

  @@unique([resource, action])
  @@index([code])
  @@index([category])
  @@index([scope])
  @@map("permissions")
}
```

#### 优点

✅ **统一管理**：一个表管理所有权限
✅ **避免重复**：不会有重复权限定义
✅ **查询简单**：单表查询即可

#### 缺点

❌ **逻辑混乱**：同一个表存储两种不同类型的权限
❌ **字段冗余**：大量可选字段（nullable），浪费存储空间
❌ **约束复杂**：需要通过 `type` 字段判断使用哪些字段
❌ **维护困难**：代码逻辑需要频繁判断权限类型
❌ **测试复杂**：需要测试所有字段组合情况
❌ **迁移风险高**：需要迁移现有权限数据

#### 实施成本

- Schema 修改：添加新字段，迁移现有数据
- 代码修改：修改所有权限相关代码，增加类型判断
- 迁移成本：高（需要迁移现有14条权限记录）
- 测试成本：高（需要测试所有字段组合）

---

## 5. 推荐方案

### 推荐：方案 A（两个独立 Permission 表）

#### 理由

1. **符合单一职责原则**：RBAC 和 ABAC 是两种不同的访问控制模型
2. **向后兼容**：不破坏现有系统
3. **易于维护和扩展**：代码清晰，职责明确
4. **符合 DESIGN.md 描述**：P1-2 是"补充"细粒度权限，不是"替换"

#### 实施步骤

**步骤 1：回滚 schema.prisma 修改**
```bash
# 恢复 Permission 表为旧结构
```

**步骤 2：创建 FineGrainedPermission 表**
```bash
# 添加新表定义
# 添加 UserPermission 表
```

**步骤 3：执行数据库迁移**
```bash
npm run prisma:reset
```

**步骤 4：创建新模块**
```bash
# /modules/user-permission/ - 用户权限管理
# /modules/fine-grained-permission/ - 细粒度权限定义管理
```

**步骤 5：实施后端 API（TASK-237 ~ TASK-244）**

**步骤 6：实施前端 UI（TASK-245 ~ TASK-249）**

**步骤 7：编写测试（TASK-250 ~ TASK-252）**

---

## 6. 待决策事项

### 6.1 Schema 设计方案

- [ ] 方案 A：两个独立 Permission 表（推荐）
- [ ] 方案 B：共用 Permission 表
- [ ] 其他方案：_________________

### 6.2 数据库重置确认

- [ ] 同意执行 `npm run prisma:reset`（会删除所有现有数据）
- [ ] 不同意，需要保留现有数据

### 6.3 命名约定

如果选择方案 A，表名和模块名约定：

- [ ] `FineGrainedPermission` 表 + `/user-permission/` 模块
- [ ] `AdvancedPermission` 表 + `/advanced-permission/` 模块
- [ ] 其他命名：_________________

---

## 7. 时间估算

### 方案 A 实施时间

| 阶段 | 任务 | 预计时间 |
|------|------|----------|
| Schema | 回滚 + 创建新表 | 2h |
| 后端 API | TASK-237 ~ TASK-244 | 80h |
| 前端 UI | TASK-245 ~ TASK-249 | 60h |
| 测试 | TASK-250 ~ TASK-252 | 24h |
| **总计** | | **166h** |

### 方案 B 实施时间

| 阶段 | 任务 | 预计时间 |
|------|------|----------|
| Schema | 修改表 + 迁移数据 | 8h |
| 后端 API | TASK-237 ~ TASK-244（含类型判断） | 100h |
| 前端 UI | TASK-245 ~ TASK-249 | 60h |
| 测试 | TASK-250 ~ TASK-252（含边界测试） | 36h |
| **总计** | | **204h** |

**结论**：方案 A 比方案 B 节省 38h 开发时间。

---

## 8. 风险分析

### 方案 A 风险

| 风险 | 等级 | 缓解措施 |
|------|------|----------|
| 数据库重置导致数据丢失 | 中 | 开发环境，可接受 |
| 两套系统权限检查性能 | 低 | 使用索引优化查询 |
| 命名冲突 | 低 | 使用明确的命名约定 |

### 方案 B 风险

| 风险 | 等级 | 缓解措施 |
|------|------|----------|
| 数据迁移失败 | 高 | 需要完善的迁移脚本 |
| 代码逻辑混乱 | 高 | 需要严格的代码审查 |
| 测试覆盖不足 | 中 | 需要大量边界测试 |
| 维护成本高 | 高 | 需要详细文档 |

---

## 9. 决策人签字

**决策人**: team-lead
**决策时间**: __________________
**选择方案**: __________________
**备注**: __________________

---

**文档状态**：等待决策
