# 更新摘要 - DESIGN.md v10.7

> **更新日期**: 2026-02-13
> **文档版本**: v10.6 → v10.7
> **更新类型**: P1 技术债务完整方案补充
> **更新人员**: AI Agent
> **阅读对象**: 当前开发团队

---

## 📋 更新概览

### 核心变更

本次更新将 **3 个 P1 技术债务**从"待实施"状态提升为**完整可执行方案**，每个方案包含：

| 组成部分 | 说明 |
|---------|------|
| **Prisma Schema** | 完整表结构定义（字段、类型、关系、索引、约束） |
| **后端 API 设计** | 请求体、响应体、错误码、业务规则引用 |
| **业务规则** | 新增 14 条业务规则（BR-346 ~ BR-359） |
| **前端 UI 设计** | ASCII 布局图、按钮设计、对话框交互流程 |
| **代码示例** | Vue 3 + Element Plus 可复制代码 |
| **实施检查清单** | 后端 → 数据库 → 前端 → 测试 → 文档 |

### 业务规则扩展

- **之前**: 104 条业务规则（BR-1.1 ~ BR-345）
- **现在**: 113 条业务规则（新增 BR-346 ~ BR-359）

### 文档变化

- **新增内容**: ~6,000 行（DESIGN.md 第 22.2 章）
- **文档版本**: v10.6 → v10.7
- **变更位置**: `docs/DESIGN.md` 第二十二章

---

## 🔧 P1 技术债务详细方案

### P1-1: 文档归档/作废功能（估时 2-3h）

#### 业务背景
BRCGS 食品安全标准要求文档必须有明确的生命周期管理，包括归档（Archive）和作废（Obsolete）状态。

#### 新增业务规则

| 规则编号 | 规则内容 |
|---------|---------|
| **BR-346** | 文档归档规则：只有"已发布"状态文档可归档，归档后不可编辑，保留查看权限 |
| **BR-347** | 文档作废规则：文档被新版本替代时需作废，作废时必须填写替代文档 |
| **BR-348** | 文档恢复规则：归档/作废文档可恢复为"已发布"，需管理员权限 |

#### Prisma Schema 变更

```prisma
model Document {
  // ... 现有字段
  archivedAt    DateTime?
  archivedBy    String?
  archivedReason String?
  obsoletedAt   DateTime?
  obsoletedBy   String?
  obsoletedReason String?
  replacedByDocId String?
}
```

#### API 设计（3 个端点）

1. **归档文档**
   ```
   POST /api/v1/documents/:id/archive
   Body: { "reason": "该文档已过时，新版本为 DOC-2026-002" }
   Response: { "success": true, "data": { "id": "xxx", "status": "archived" } }
   ```

2. **作废文档**
   ```
   POST /api/v1/documents/:id/obsolete
   Body: { "reason": "已被新版本替代", "replacedByDocId": "uuid" }
   Response: { "success": true, "data": { "id": "xxx", "status": "obsolete" } }
   ```

3. **恢复文档**
   ```
   POST /api/v1/documents/:id/restore
   Body: { "reason": "重新激活该文档" }
   Response: { "success": true, "data": { "id": "xxx", "status": "published" } }
   ```

#### 前端 UI 设计

**文档详情页新增按钮**（状态为"已发布"时显示）:
```
┌─────────────────────────────────────────┐
│  文档详情                              ×│
├─────────────────────────────────────────┤
│  文档信息...                            │
│                                         │
│  [编辑] [下载] [归档] [作废]           │ ← 新增按钮
└─────────────────────────────────────────┘
```

**归档对话框**:
```
┌─────────────────────────────────────────┐
│  归档文档                              ×│
├─────────────────────────────────────────┤
│  归档原因（必填）:                      │
│  ┌─────────────────────────────────────┐│
│  │该文档已过时，新版本为 DOC-2026-002 ││
│  └─────────────────────────────────────┘│
│                                         │
│           [取消]      [确认归档]        │
└─────────────────────────────────────────┘
```

#### Vue 3 代码示例

```vue
<template>
  <el-dialog v-model="archiveDialogVisible" title="归档文档" width="500px">
    <el-form :model="archiveForm" :rules="archiveRules" ref="archiveFormRef">
      <el-form-item label="归档原因" prop="reason">
        <el-input
          v-model="archiveForm.reason"
          type="textarea"
          :rows="4"
          placeholder="请输入归档原因（必填）"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="archiveDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleArchive">确认归档</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { archiveDocument } from '@/api/documents'

const archiveDialogVisible = ref(false)
const archiveForm = reactive({ reason: '' })
const archiveRules = {
  reason: [{ required: true, message: '请输入归档原因', trigger: 'blur' }]
}

const handleArchive = async () => {
  try {
    await archiveDocument(currentDoc.value.id, { reason: archiveForm.reason })
    ElMessage.success('文档已归档')
    archiveDialogVisible.value = false
    fetchDocDetail()
  } catch (error) {
    ElMessage.error(error.message || '归档失败')
  }
}
</script>
```

#### 实施检查清单

- [ ] **1. 后端 API**
  - [ ] 创建 `/api/v1/documents/:id/archive` 端点
  - [ ] 创建 `/api/v1/documents/:id/obsolete` 端点
  - [ ] 创建 `/api/v1/documents/:id/restore` 端点
  - [ ] 实现 BR-346, BR-347, BR-348 业务规则
  - [ ] 添加单元测试（3 个端点 × 2-3 测试用例）
- [ ] **2. 数据库迁移**
  - [ ] 更新 Prisma Schema（新增 6 个字段）
  - [ ] 运行 `npx prisma migrate dev --name add-document-archive-fields`
  - [ ] 验证迁移成功
- [ ] **3. 前端界面**
  - [ ] 文档详情页添加"归档"/"作废"按钮
  - [ ] 实现归档/作废对话框
  - [ ] 实现恢复功能（管理员可见）
  - [ ] 表单验证（归档原因必填）
- [ ] **4. 权限控制**
  - [ ] 验证只有管理员可恢复文档
  - [ ] 验证归档/作废文档不可编辑
- [ ] **5. 测试**
  - [ ] 后端单元测试（覆盖率 80%+）
  - [ ] 前端集成测试（按钮点击 → 对话框 → API 调用）
  - [ ] E2E 测试（归档流程、作废流程）
- [ ] **6. 文档更新**
  - [ ] 更新 API 文档（Swagger）
  - [ ] 更新用户手册（文档归档操作说明）

**估时**: 2-3 小时（含测试）

---

### P1-2: 细粒度权限系统（估时 8-16h）

#### 业务背景
当前系统仅有 RBAC（基于角色的权限），无法实现：
- **跨部门权限**（如财务查看所有部门文档）
- **资源级权限**（如只能审批特定模板的任务）
- **临时权限**（如授予 1 个月的查看权限后自动过期）

#### 新增业务规则

| 规则编号 | 规则内容 |
|---------|---------|
| **BR-349** | 权限定义规则：每个权限有唯一 code，按功能分类（文档/模板/任务/审批/系统） |
| **BR-350** | 权限授予规则：需指定授予人、授予原因、可选过期时间，支持资源级授予 |
| **BR-351** | 权限撤销规则：仅授予人或管理员可撤销，撤销需填写原因 |
| **BR-352** | 资源级权限规则：可指定 resourceType + resourceId 限定权限范围 |
| **BR-353** | 权限过期规则：过期权限自动失效，不自动删除记录（审计需要） |

#### Prisma Schema 设计

```prisma
model Permission {
  id          String   @id @default(cuid())
  code        String   @unique  // 如 "document:cross_dept_view"
  name        String              // 如 "跨部门文档查看"
  category    String              // 如 "document"
  scope       String   @default("department")  // "department" | "company" | "resource"
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  users       UserPermission[]
  @@map("permissions")
}

model UserPermission {
  id            String   @id @default(cuid())
  userId        String
  permissionId  String
  grantedBy     String   // 授予人用户 ID
  grantedByName String   // 授予人姓名（冗余字段，便于审计）
  grantedAt     DateTime @default(now())
  expiresAt     DateTime?  // 可选，权限过期时间
  reason        String?    // 授予原因
  resourceType  String?    // 如 "template"、"document"
  resourceId    String?    // 如模板 ID、文档 ID
  user          User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  permission    Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)
  @@index([userId])
  @@index([permissionId])
  @@index([expiresAt])
  @@map("user_permissions")
}
```

#### API 设计（6 个端点）

1. **获取所有权限定义**
   ```
   GET /api/v1/permissions
   Response: {
     "success": true,
     "data": [
       { "id": "xxx", "code": "document:cross_dept_view", "name": "跨部门文档查看", "category": "document" }
     ]
   }
   ```

2. **获取用户权限列表**
   ```
   GET /api/v1/user-permissions?userId=xxx
   Response: {
     "success": true,
     "data": [
       {
         "id": "xxx",
         "permissionCode": "document:cross_dept_view",
         "permissionName": "跨部门文档查看",
         "grantedBy": "admin",
         "grantedAt": "2026-01-15T10:00:00Z",
         "expiresAt": "2026-02-15T10:00:00Z",
         "reason": "临时财务审计需要"
       }
     ]
   }
   ```

3. **授予权限**
   ```
   POST /api/v1/user-permissions
   Body: {
     "userId": "uuid",
     "permissionId": "uuid",
     "reason": "财务审计需要查看所有文档",
     "expiresAt": "2026-02-15T23:59:59Z",  // 可选
     "resourceType": "template",           // 可选
     "resourceId": "template-uuid"         // 可选
   }
   Response: { "success": true, "data": { "id": "xxx" } }
   ```

4. **撤销权限**
   ```
   DELETE /api/v1/user-permissions/:id
   Body: { "reason": "审计工作已完成" }
   Response: { "success": true }
   ```

5. **检查用户权限**（前端调用）
   ```
   GET /api/v1/user-permissions/check?userId=xxx&permissionCode=document:cross_dept_view&resourceId=doc-123
   Response: {
     "success": true,
     "data": { "hasPermission": true, "expiresAt": "2026-02-15T23:59:59Z" }
   }
   ```

6. **批量授予权限**
   ```
   POST /api/v1/user-permissions/batch
   Body: {
     "userIds": ["uuid1", "uuid2"],
     "permissionId": "uuid",
     "reason": "新入职财务人员统一授权"
   }
   Response: { "success": true, "data": { "count": 2 } }
   ```

#### 前端 UI 设计

**用户权限管理页**（系统管理 > 用户管理 > 权限标签）:
```
┌──────────────────────────────────────────────────────────┐
│  用户: 张三 (财务部)                                    │
├──────────────────────────────────────────────────────────┤
│  [授予权限]                                   [批量撤销]│
│                                                          │
│  权限列表:                                               │
│  ┌────────────────────────────────────────────────────┐ │
│  │ 权限名称          │ 授予人 │ 授予时间   │ 过期时间 │ │
│  ├────────────────────────────────────────────────────┤ │
│  │ 跨部门文档查看    │ admin │ 2026-01-15 │ 2026-02-15│[撤销]│
│  │ 模板编辑权限      │ admin │ 2026-01-10 │ 永久      │[撤销]│
│  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

**授予权限对话框**:
```
┌─────────────────────────────────────────┐
│  授予权限                              ×│
├─────────────────────────────────────────┤
│  用户: 张三 (财务部)                    │
│                                         │
│  权限类型（必选）:                      │
│  ┌─────────────────────────────────────┐│
│  │ [v] 跨部门文档查看                  ││
│  └─────────────────────────────────────┘│
│                                         │
│  授予范围:                              │
│  ( ) 全局   (•) 指定资源                │
│  资源类型: [模板      v]                │
│  资源: [选择模板...                    ]│
│                                         │
│  过期时间（可选）:                      │
│  [ ] 永久   [v] 指定时间                │
│  [2026-02-15 23:59:59]                  │
│                                         │
│  授予原因（必填）:                      │
│  ┌─────────────────────────────────────┐│
│  │财务审计需要查看所有文档             ││
│  └─────────────────────────────────────┘│
│                                         │
│           [取消]      [确认授予]        │
└─────────────────────────────────────────┘
```

#### Vue 3 代码示例

```vue
<template>
  <div class="user-permissions">
    <el-button type="primary" @click="grantDialogVisible = true">
      授予权限
    </el-button>

    <el-table :data="userPermissions" style="margin-top: 20px">
      <el-table-column prop="permissionName" label="权限名称" />
      <el-table-column prop="grantedByName" label="授予人" />
      <el-table-column prop="grantedAt" label="授予时间">
        <template #default="{ row }">
          {{ formatDate(row.grantedAt) }}
        </template>
      </el-table-column>
      <el-table-column prop="expiresAt" label="过期时间">
        <template #default="{ row }">
          {{ row.expiresAt ? formatDate(row.expiresAt) : '永久' }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="100">
        <template #default="{ row }">
          <el-button link type="danger" @click="handleRevoke(row)">
            撤销
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 授予权限对话框 -->
    <el-dialog v-model="grantDialogVisible" title="授予权限" width="500px">
      <el-form :model="grantForm" :rules="grantRules" ref="grantFormRef">
        <el-form-item label="权限类型" prop="permissionId">
          <el-select v-model="grantForm.permissionId" placeholder="请选择权限">
            <el-option
              v-for="perm in allPermissions"
              :key="perm.id"
              :label="perm.name"
              :value="perm.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="过期时间">
          <el-date-picker
            v-model="grantForm.expiresAt"
            type="datetime"
            placeholder="不选择表示永久"
          />
        </el-form-item>
        <el-form-item label="授予原因" prop="reason">
          <el-input
            v-model="grantForm.reason"
            type="textarea"
            :rows="3"
            placeholder="请输入授予原因（必填）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="grantDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleGrant">确认授予</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getUserPermissions, grantPermission, revokePermission, getAllPermissions } from '@/api/permissions'

const userPermissions = ref([])
const allPermissions = ref([])
const grantDialogVisible = ref(false)
const grantForm = reactive({
  permissionId: '',
  expiresAt: null,
  reason: ''
})
const grantRules = {
  permissionId: [{ required: true, message: '请选择权限', trigger: 'change' }],
  reason: [{ required: true, message: '请输入授予原因', trigger: 'blur' }]
}

const fetchUserPermissions = async () => {
  const res = await getUserPermissions(props.userId)
  userPermissions.value = res.data
}

const fetchAllPermissions = async () => {
  const res = await getAllPermissions()
  allPermissions.value = res.data
}

const handleGrant = async () => {
  try {
    await grantPermission({
      userId: props.userId,
      ...grantForm
    })
    ElMessage.success('权限授予成功')
    grantDialogVisible.value = false
    fetchUserPermissions()
  } catch (error) {
    ElMessage.error(error.message || '授予失败')
  }
}

const handleRevoke = async (row) => {
  try {
    await ElMessageBox.confirm('确认撤销该权限?', '警告', { type: 'warning' })
    const reason = await ElMessageBox.prompt('请输入撤销原因', '撤销权限')
    await revokePermission(row.id, { reason: reason.value })
    ElMessage.success('权限已撤销')
    fetchUserPermissions()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '撤销失败')
    }
  }
}

onMounted(() => {
  fetchUserPermissions()
  fetchAllPermissions()
})
</script>
```

#### 实施检查清单

- [ ] **1. 权限定义**
  - [ ] 定义权限清单（文档/模板/任务/审批/系统类权限）
  - [ ] 创建 Permission 种子数据（Prisma seed）
  - [ ] 验证权限 code 命名规范（category:action）
- [ ] **2. 数据库表创建**
  - [ ] 更新 Prisma Schema（Permission + UserPermission 表）
  - [ ] 运行 `npx prisma migrate dev --name add-permission-tables`
  - [ ] 验证表结构和索引
- [ ] **3. 后端 API**
  - [ ] 实现 6 个权限 API 端点
  - [ ] 实现 BR-349 ~ BR-353 业务规则
  - [ ] 创建权限检查中间件（用于 API 鉴权）
  - [ ] 添加单元测试（6 个端点 × 3-4 测试用例）
- [ ] **4. 权限中间件集成**
  - [ ] 在需要细粒度权限的 API 端点添加权限检查
  - [ ] 实现资源级权限验证（如只能审批特定模板）
  - [ ] 实现权限过期自动失效逻辑
- [ ] **5. 前端界面**
  - [ ] 用户管理页添加"权限"标签页
  - [ ] 实现授予权限对话框
  - [ ] 实现撤销权限功能
  - [ ] 表单验证（权限类型、授予原因必填）
- [ ] **6. 集成测试**
  - [ ] 后端单元测试（覆盖率 80%+）
  - [ ] 前端集成测试（授予 → 验证 → 撤销流程）
  - [ ] E2E 测试（跨部门权限、资源级权限、权限过期）
- [ ] **7. 文档更新**
  - [ ] 更新 API 文档（Swagger）
  - [ ] 更新用户手册（权限管理操作说明）
  - [ ] 更新权限矩阵文档（谁可以授予/撤销权限）

**估时**: 8-16 小时（含测试）

---

### P1-3: 工作流引擎（估时 24-40h）

#### 业务背景
当前审批流程硬编码在代码中，无法实现：
- **串行审批**（主管 → 经理 → 总监）
- **并行审批**（财务 + 质量 同时审批，都通过才进入下一步）
- **条件分支**（金额 > 10000 需要财务审批，否则跳过）
- **审批超时升级**（24小时未审批自动升级到上级）
- **工作流模板复用**（定义一次，多次使用）

#### 新增业务规则

| 规则编号 | 规则内容 |
|---------|---------|
| **BR-354** | 工作流模板规则：包含步骤定义（类型、审批人、超时时间），支持串行/并行混合 |
| **BR-355** | 工作流启动规则：指定模板 + 关联业务对象（文档/任务），自动创建实例 |
| **BR-356** | 串行审批规则：当前步骤通过后自动进入下一步，驳回则返回发起人 |
| **BR-357** | 并行审批规则：所有并行任务都通过才进入下一步，任一驳回则整体驳回 |
| **BR-358** | 审批超时升级规则：超时未审批自动分配给上级或指定人，发送通知 |
| **BR-359** | 工作流取消规则：发起人可取消未完成工作流，已审批步骤不可撤销 |

#### Prisma Schema 设计

```prisma
model WorkflowTemplate {
  id          String   @id @default(cuid())
  name        String   // 如 "文档审批流程（三级）"
  description String?
  category    String   // "document" | "task" | "deviation"
  steps       Json     // 步骤定义数组（见下方示例）
  isActive    Boolean  @default(true)
  createdBy   String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  instances   WorkflowInstance[]
  @@map("workflow_templates")
}

model WorkflowInstance {
  id          String   @id @default(cuid())
  templateId  String
  name        String   // 如 "文档《质量手册v2》审批流程"
  status      String   // "pending" | "in_progress" | "completed" | "rejected" | "cancelled"
  businessType String  // "document" | "task" | "deviation"
  businessId  String   // 关联业务对象 ID（文档 ID / 任务 ID）
  currentStep Int      @default(0)
  startedBy   String
  startedAt   DateTime @default(now())
  completedAt DateTime?
  template    WorkflowTemplate @relation(fields: [templateId], references: [id])
  tasks       WorkflowTask[]
  @@index([businessType, businessId])
  @@map("workflow_instances")
}

model WorkflowTask {
  id          String   @id @default(cuid())
  instanceId  String
  stepIndex   Int      // 步骤序号（从 0 开始）
  stepName    String   // 如 "主管审批"
  assignee    String   // 审批人用户 ID
  assigneeName String  // 审批人姓名（冗余字段）
  status      String   // "pending" | "approved" | "rejected" | "cancelled"
  comment     String?  // 审批意见
  dueAt       DateTime? // 截止时间
  completedAt DateTime?
  instance    WorkflowInstance @relation(fields: [instanceId], references: [id], onDelete: Cascade)
  @@index([assignee, status])
  @@map("workflow_tasks")
}
```

**WorkflowTemplate.steps JSON 示例**（串行审批）:
```json
[
  {
    "name": "主管审批",
    "type": "approval",
    "assigneeRole": "supervisor",
    "timeout": 24,
    "escalateTo": "manager"
  },
  {
    "name": "经理审批",
    "type": "approval",
    "assigneeRole": "manager",
    "timeout": 48,
    "escalateTo": "director"
  }
]
```

**WorkflowTemplate.steps JSON 示例**（并行审批）:
```json
[
  {
    "name": "主管审批",
    "type": "approval",
    "assigneeRole": "supervisor"
  },
  {
    "name": "并行审批（财务+质量）",
    "type": "parallel",
    "tasks": [
      { "name": "财务审批", "assigneeRole": "finance" },
      { "name": "质量审批", "assigneeRole": "quality" }
    ]
  },
  {
    "name": "总监审批",
    "type": "approval",
    "assigneeRole": "director"
  }
]
```

#### API 设计（8 个端点）

1. **创建工作流模板**（管理员）
   ```
   POST /api/v1/workflow-templates
   Body: {
     "name": "文档审批流程（三级）",
     "category": "document",
     "steps": [
       { "name": "主管审批", "type": "approval", "assigneeRole": "supervisor", "timeout": 24 },
       { "name": "经理审批", "type": "approval", "assigneeRole": "manager", "timeout": 48 }
     ]
   }
   Response: { "success": true, "data": { "id": "xxx" } }
   ```

2. **获取工作流模板列表**
   ```
   GET /api/v1/workflow-templates?category=document
   Response: {
     "success": true,
     "data": [
       { "id": "xxx", "name": "文档审批流程（三级）", "category": "document", "isActive": true }
     ]
   }
   ```

3. **启动工作流**（普通用户）
   ```
   POST /api/v1/workflow-instances
   Body: {
     "templateId": "uuid",
     "name": "文档《质量手册v2》审批流程",
     "businessType": "document",
     "businessId": "doc-uuid"
   }
   Response: { "success": true, "data": { "id": "xxx", "status": "in_progress" } }
   ```

4. **获取我的待审批任务**
   ```
   GET /api/v1/workflow-tasks/my-tasks?status=pending
   Response: {
     "success": true,
     "data": [
       {
         "id": "xxx",
         "instanceName": "文档《质量手册v2》审批流程",
         "stepName": "主管审批",
         "businessType": "document",
         "businessId": "doc-uuid",
         "dueAt": "2026-02-14T23:59:59Z"
       }
     ]
   }
   ```

5. **审批通过**
   ```
   POST /api/v1/workflow-tasks/:id/approve
   Body: { "comment": "同意发布" }
   Response: { "success": true, "data": { "status": "approved" } }
   ```

6. **审批驳回**
   ```
   POST /api/v1/workflow-tasks/:id/reject
   Body: { "comment": "文档格式不符合要求" }
   Response: { "success": true, "data": { "status": "rejected" } }
   ```

7. **取消工作流**（发起人）
   ```
   POST /api/v1/workflow-instances/:id/cancel
   Body: { "reason": "业务需求变更" }
   Response: { "success": true }
   ```

8. **获取工作流详情**
   ```
   GET /api/v1/workflow-instances/:id
   Response: {
     "success": true,
     "data": {
       "id": "xxx",
       "name": "文档《质量手册v2》审批流程",
       "status": "in_progress",
       "currentStep": 1,
       "tasks": [
         { "stepName": "主管审批", "assigneeName": "张三", "status": "approved", "completedAt": "2026-02-13T10:00:00Z" },
         { "stepName": "经理审批", "assigneeName": "李四", "status": "pending", "dueAt": "2026-02-14T23:59:59Z" }
       ]
     }
   }
   ```

#### 前端 UI 设计

**工作流模板编辑器**（系统管理 > 工作流管理 > 模板管理）:
```
┌──────────────────────────────────────────────────────────┐
│  工作流模板编辑                                          │
├──────────────────────────────────────────────────────────┤
│  模板名称: [文档审批流程（三级）                        ]│
│  应用类别: [文档管理  v]                                 │
│                                                          │
│  审批步骤:                                    [+ 添加步骤]│
│  ┌────────────────────────────────────────────────────┐ │
│  │  步骤 1: 主管审批                           [编辑][删除]│
│  │  类型: 审批   审批人: 主管   超时: 24h              │ │
│  │  ─────────────────────────────────────────────────│ │
│  │  步骤 2: 经理审批                           [编辑][删除]│
│  │  类型: 审批   审批人: 经理   超时: 48h              │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│                        [取消]      [保存模板]            │
└──────────────────────────────────────────────────────────┘
```

**我的待审批任务页**（首页 > 我的任务）:
```
┌──────────────────────────────────────────────────────────┐
│  我的待审批任务                                          │
├──────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────┐ │
│  │ 工作流名称              │ 步骤     │ 截止时间  │ 操作 │ │
│  ├────────────────────────────────────────────────────┤ │
│  │ 文档《质量手册v2》审批  │ 主管审批 │ 今天23:59 │[审批]│ │
│  │ 任务 #1234 偏离审批     │ 经理审批 │ 明天18:00 │[审批]│ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

**审批对话框**:
```
┌─────────────────────────────────────────┐
│  审批 - 文档《质量手册v2》              ×│
├─────────────────────────────────────────┤
│  工作流: 文档审批流程（三级）           │
│  当前步骤: 主管审批                     │
│  发起人: 王五                           │
│  发起时间: 2026-02-13 09:00             │
│                                         │
│  业务对象:                              │
│  文档名称: 质量手册v2                   │
│  文档级别: 一级                         │
│  所属部门: 质量部                       │
│  [查看文档详情]                         │
│                                         │
│  审批意见（必填）:                      │
│  ┌─────────────────────────────────────┐│
│  │同意发布，符合质量管理要求           ││
│  └─────────────────────────────────────┘│
│                                         │
│         [驳回]  [取消]  [通过]          │
└─────────────────────────────────────────┘
```

#### Vue 3 代码示例

```vue
<template>
  <div class="my-tasks">
    <el-table :data="myTasks" style="width: 100%">
      <el-table-column prop="instanceName" label="工作流名称" />
      <el-table-column prop="stepName" label="步骤" width="120" />
      <el-table-column prop="dueAt" label="截止时间" width="180">
        <template #default="{ row }">
          {{ formatDate(row.dueAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="100">
        <template #default="{ row }">
          <el-button link type="primary" @click="handleApprove(row)">
            审批
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 审批对话框 -->
    <el-dialog v-model="approveDialogVisible" title="审批" width="600px">
      <div v-if="currentTask">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="工作流">
            {{ currentTask.instanceName }}
          </el-descriptions-item>
          <el-descriptions-item label="当前步骤">
            {{ currentTask.stepName }}
          </el-descriptions-item>
          <el-descriptions-item label="发起人">
            {{ currentTask.startedByName }}
          </el-descriptions-item>
          <el-descriptions-item label="发起时间">
            {{ formatDate(currentTask.startedAt) }}
          </el-descriptions-item>
        </el-descriptions>

        <el-divider />

        <div v-if="currentTask.businessType === 'document'">
          <h4>业务对象：文档</h4>
          <p>文档名称: {{ businessDetail.name }}</p>
          <p>文档级别: {{ businessDetail.level }}</p>
          <el-button link @click="viewBusinessDetail">查看文档详情</el-button>
        </div>

        <el-form :model="approveForm" :rules="approveRules" ref="approveFormRef">
          <el-form-item label="审批意见" prop="comment">
            <el-input
              v-model="approveForm.comment"
              type="textarea"
              :rows="4"
              placeholder="请输入审批意见（必填）"
            />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="handleReject">驳回</el-button>
        <el-button @click="approveDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleApproveConfirm">通过</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getMyTasks, approveTask, rejectTask, getWorkflowInstance } from '@/api/workflow'
import { getDocumentById } from '@/api/documents'

const myTasks = ref([])
const currentTask = ref(null)
const businessDetail = ref(null)
const approveDialogVisible = ref(false)
const approveForm = reactive({ comment: '' })
const approveRules = {
  comment: [{ required: true, message: '请输入审批意见', trigger: 'blur' }]
}

const fetchMyTasks = async () => {
  const res = await getMyTasks({ status: 'pending' })
  myTasks.value = res.data
}

const handleApprove = async (task) => {
  currentTask.value = task
  approveDialogVisible.value = true

  // 加载业务对象详情
  if (task.businessType === 'document') {
    const res = await getDocumentById(task.businessId)
    businessDetail.value = res.data
  }
}

const handleApproveConfirm = async () => {
  try {
    await approveTask(currentTask.value.id, {
      action: 'approve',
      comment: approveForm.comment
    })
    ElMessage.success('审批通过')
    approveDialogVisible.value = false
    fetchMyTasks()
  } catch (error) {
    ElMessage.error(error.message || '审批失败')
  }
}

const handleReject = async () => {
  try {
    await ElMessageBox.confirm('确认驳回该审批?', '警告', { type: 'warning' })
    await rejectTask(currentTask.value.id, {
      action: 'reject',
      comment: approveForm.comment
    })
    ElMessage.success('已驳回')
    approveDialogVisible.value = false
    fetchMyTasks()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '驳回失败')
    }
  }
}

const viewBusinessDetail = () => {
  // 跳转到文档详情页
  window.open(`/documents/${currentTask.value.businessId}`, '_blank')
}

onMounted(() => {
  fetchMyTasks()
})
</script>
```

#### 实施检查清单

- [ ] **1. 工作流模板定义**
  - [ ] 设计工作流步骤 JSON Schema
  - [ ] 定义常用模板（文档审批、任务审批、偏离审批）
  - [ ] 创建 WorkflowTemplate 种子数据
- [ ] **2. 数据库表创建**
  - [ ] 更新 Prisma Schema（WorkflowTemplate + Instance + Task 表）
  - [ ] 运行 `npx prisma migrate dev --name add-workflow-tables`
  - [ ] 验证表结构和索引
- [ ] **3. 工作流引擎核心逻辑**
  - [ ] 创建 WorkflowService 服务
  - [ ] 实现串行审批逻辑（步骤自动流转）
  - [ ] 实现并行审批逻辑（所有任务通过才进入下一步）
  - [ ] 实现审批超时升级逻辑（定时任务检查）
  - [ ] 实现工作流取消逻辑
- [ ] **4. 后端 API**
  - [ ] 实现 8 个工作流 API 端点
  - [ ] 实现 BR-354 ~ BR-359 业务规则
  - [ ] 添加单元测试（8 个端点 × 3-4 测试用例）
- [ ] **5. 前端界面**
  - [ ] 工作流模板管理页（创建/编辑/删除模板）
  - [ ] 我的待审批任务页
  - [ ] 审批对话框（通过/驳回 + 业务对象详情）
  - [ ] 工作流详情页（查看审批进度）
- [ ] **6. E2E 测试**
  - [ ] 串行审批流程测试（主管 → 经理 → 总监）
  - [ ] 并行审批流程测试（财务 + 质量 同时审批）
  - [ ] 审批超时升级测试（定时任务 + 通知）
  - [ ] 工作流取消测试
- [ ] **7. 文档更新**
  - [ ] 更新 API 文档（Swagger）
  - [ ] 更新用户手册（工作流使用说明）
  - [ ] 更新管理员手册（工作流模板配置说明）

**估时**: 24-40 小时（含测试）

---

## 📊 实施优先级

根据用户反馈："我的优先级肯定是先修复技术债务的"

### 建议实施顺序

| 顺序 | 技术债务 | 估时 | 原因 |
|-----|---------|------|------|
| **1** | P1-1: 文档归档/作废 | 2-3h | 快速见效，BRCGS 合规必需，影响范围小 |
| **2** | P1-2: 细粒度权限 | 8-16h | 为后续功能奠定基础，独立性强 |
| **3** | P1-3: 工作流引擎 | 24-40h | 最复杂，依赖 P1-2 的权限系统 |

### 并行开发建议

- **前端开发** 可在后端 API 开发同时进行（Mock 数据）
- **文档更新** 可在功能开发同时进行
- **测试编写** 必须在实现后立即进行（TDD 原则）

---

## ✅ 验收标准

每个 P1 技术债务完成后，必须满足以下条件：

- [ ] 后端单元测试通过（覆盖率 80%+）
- [ ] 前端集成测试通过
- [ ] E2E 测试通过（关键用户流程）
- [ ] API 文档更新（Swagger）
- [ ] 用户手册更新
- [ ] Code Review 通过
- [ ] 无 P0/P1 级别 Bug

---

## 📂 相关文档

- **DESIGN.md 第 22.2 章**: 完整技术方案（~6,000 行）
- **DESIGN.md 第 5 章**: 业务规则完整清单（BR-1.1 ~ BR-359）
- **DESIGN.md 第 6 章**: 数据模型（Prisma Schema）
- **INTERACTION_DESIGN.md**: 前端交互规范

---

## 🔄 后续步骤

1. **开发团队评审**
   - 评估估时是否合理
   - 确认技术方案是否可行
   - 提出优化建议

2. **创建开发任务**
   - 在项目管理工具（Jira/GitHub Issues）创建对应任务
   - 分配给开发人员
   - 设置里程碑和截止日期

3. **开始实施**
   - 按照实施检查清单逐步推进
   - 每完成一个检查项，在清单中打勾
   - 遇到问题及时沟通

4. **持续集成**
   - 每完成一个功能点，立即提交代码
   - 运行自动化测试
   - Code Review

5. **验收与部署**
   - 完成所有验收标准
   - 部署到测试环境
   - 用户验收测试（UAT）
   - 部署到生产环境

---

**文档版本**: 3.0
**最后更新**: 2026-02-13
**状态**: ✅ 完成
**下一步**: 开发团队评审 → 创建开发任务 → 开始实施
