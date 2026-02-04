# MVP 完整实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 完整实现 MVP (Phase 1-6)，开箱即用，可直接部署

**Architecture:**
- 前端: Vue 3 + Element Plus + Pinia + Axios
- 后端: NestJS + TypeScript + Prisma ORM
- 数据库: PostgreSQL + Redis 缓存
- 文件存储: MinIO 对象存储

---

## Phase 3: 二三级文件（6个Issue）

### Task 3.1: 版本历史查看 API

**Files:**
- Modify: `server/src/modules/document/document.controller.ts`
- Modify: `server/src/modules/document/document.service.ts`
- Test: `server/test/document-version.test.ts`

**Step 1: Add version history API**

```typescript
// document.controller.ts
@Get(':id/versions')
async getVersionHistory(@Param('id') id: string) {
  return this.documentService.getVersionHistory(id);
}

// document.service.ts
async getVersionHistory(documentId: string) {
  return this.prisma.documentVersion.findMany({
    where: { documentId },
    orderBy: { createdAt: 'desc' },
    include: { creator: { select: { name: true } } },
  });
}
```

**Step 2: Write test**

```typescript
// test/document-version.test.ts
describe('Document Version History', () => {
  it('should return version list for document', async () => {
    const versions = await service.getVersionHistory('doc-id');
    expect(Array.isArray(versions)).toBe(true);
  });
});
```

---

### Task 3.2: 文件停用功能 API

**Files:**
- Modify: `server/src/modules/document/document.controller.ts`
- Modify: `server/src/modules/document/document.service.ts`

**Step 1: Add deactivate API**

```typescript
// document.controller.ts
@Post(':id/deactivate')
async deactivate(@Param('id') id: string, @CurrentUser() user: any) {
  return this.documentService.deactivate(id, user.id, user.role);
}

// document.service.ts
async deactivate(id: string, userId: string, role: string) {
  const doc = await this.findOne(id, userId, role);
  if (doc.status !== 'approved') {
    throw new BusinessException(ErrorCode.CONFLICT, '只能停用已发布的文档');
  }
  return this.prisma.document.update({
    where: { id },
    data: { status: 'inactive' },
  });
}
```

**Step 2: Add version history API for inactive files**

```typescript
// Modify getVersionHistory to handle inactive documents
async getVersionHistory(documentId: string) {
  const versions = await this.prisma.documentVersion.findMany({
    where: { documentId },
    orderBy: { createdAt: 'desc' },
    include: { creator: { select: { name: true } } },
  });
  const doc = await this.prisma.document.findUnique({
    where: { id: documentId },
  });
  return { versions, document: doc };
}
```

---

### Task 3.3: 文件详情页添加版本历史

**Files:**
- Modify: `client/src/views/documents/DocumentDetail.vue`

**Step 1: Add version history section**

```vue
<el-card class="version-card" v-if="versionHistory.length">
  <template #header><span>版本历史</span></template>
  <el-table :data="versionHistory" stripe>
    <el-table-column prop="version" label="版本" width="80" />
    <el-table-column prop="fileName" label="文件名" />
    <el-table-column prop="creator.name" label="操作人" width="100" />
    <el-table-column prop="createdAt" label="时间" width="180">
      <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
    </el-table-column>
  </el-table>
</el-card>
```

---

## Phase 4: 四级模板（12个Issue）

### Task 4.1: 安装 SortableJS

**Files:**
- Modify: `client/package.json`

**Step 1: Install dependency**

```bash
cd client && npm install sortablejs @types/sortablejs --save
```

---

### Task 4.2: FormBuilder 添加拖拽排序

**Files:**
- Modify: `client/src/components/FormBuilder.vue`
- Test: `client/test/form-builder.test.ts`

**Step 1: Add SortableJS support**

```vue
<template>
  <div class="form-builder">
    <div class="fields-container" ref="fieldsContainer">
      <div
        v-for="(field, index) in modelValue"
        :key="field.name"
        class="field-item"
        :data-index="index"
      >
        <!-- field render content -->
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import Sortable from 'sortablejs';

const props = defineProps<{ fields: TemplateField[]; modelValue: TemplateField[] }>();
const emit = defineEmits(['update:modelValue']);
const fieldsContainer = ref<HTMLElement | null>(null);

onMounted(() => {
  if (fieldsContainer.value) {
    Sortable.create(fieldsContainer.value, {
      animation: 150,
      handle: '.drag-handle',
      onEnd: (evt) => {
        const fields = [...props.modelValue];
        const [moved] = fields.splice(evt.oldIndex!, 1);
        fields.splice(evt.newIndex!, 0, moved);
        emit('update:modelValue', fields);
      },
    });
  }
});
</script>
```

---

### Task 4.3: 模板编辑功能（前端）

**Files:**
- Modify: `client/src/views/templates/TemplateList.vue`
- Create: `client/src/views/templates/TemplateEdit.vue`

**Step 1: Add edit handler**

```typescript
const handleEdit = (row: Template) => {
  router.push(`/templates/${row.id}/edit`);
};
```

**Step 2: Create edit page**

```vue
<!-- TemplateEdit.vue -->
<template>
  <div class="template-edit">
    <el-page-header @back="$router.back()">
      <template #content><span class="page-title">编辑模板</span></template>
    </el-page-header>
    <!-- Reuse create form with pre-filled data -->
  </div>
</template>
```

---

### Task 4.4: 模板删除功能（前端）

**Files:**
- Modify: `client/src/views/templates/TemplateList.vue`

**Step 1: Add delete button**

```vue
<el-button
  link
  type="danger"
  v-if="row.status === 'draft'"
  @click="handleDelete(row)"
>
  删除
</el-button>
```

**Step 2: Add delete handler**

```typescript
const handleDelete = async (row: Template) => {
  try {
    await ElMessageBox.confirm('确定要删除该模板吗？此操作不可恢复。', '警告', {
      type: 'warning',
    });
    await request.delete(`/templates/${row.id}`);
    ElMessage.success('删除成功');
    fetchData();
  } catch {}
};
```

---

## Phase 5: 任务分发（10个Issue）

### Task 5.1: 任务取消功能（前端按钮）

**Files:**
- Modify: `client/src/views/tasks/TaskDetail.vue`

**Step 1: Add cancel button**

```vue
<el-card class="actions-card" v-if="task?.status === 'pending'">
  <el-button type="danger" @click="handleCancel">取消任务</el-button>
</el-card>

<script>
const handleCancel = async () => {
  try {
    await ElMessageBox.confirm('确定要取消该任务吗？此操作不可恢复。', '警告', {
      type: 'warning',
    });
    await request.post(`/tasks/${task.value.id}/cancel`);
    ElMessage.success('任务已取消');
    fetchData();
  } catch {}
};
</script>
```

---

### Task 5.2: 任务审批操作

**Files:**
- Modify: `client/src/views/tasks/TaskDetail.vue`

**Step 1: Add approve/reject buttons**

```vue
<el-table-column label="操作" width="150" v-if="canApprove">
  <template #default="{ row }">
    <el-button type="success" link @click="handleApprove(row)">通过</el-button>
    <el-button type="danger" link @click="handleReject(row)">驳回</el-button>
  </template>
</el-table-column>

<script>
const canApprove = computed(() => {
  // Check if current user is the task creator or admin
});

const handleApprove = async (row: Record) => {
  await request.post(`/tasks/records/${row.id}/approve`, { status: 'approved' });
  ElMessage.success('审批通过');
  fetchData();
};

const handleReject = async (row: Record) => {
  const { value: comment } = await ElMessageBox.prompt('请输入驳回意见', '驳回');
  await request.post(`/tasks/records/${row.id}/approve`, { status: 'rejected', comment });
  ElMessage.success('已驳回');
  fetchData();
};
</script>
```

---

### Task 5.3: 截止日期逾期红色标记

**Files:**
- Modify: `client/src/views/tasks/TaskList.vue`

**Step 1: Add overdue check**

```vue
<el-table-column prop="deadline" label="截止日期" width="180">
  <template #default="{ row }">
    <span :class="{ 'overdue': isOverdue(row.deadline, row.status) }">
      {{ formatDate(row.deadline) }}
      <el-tag v-if="isOverdue(row.deadline, row.status)" type="danger" size="small">
        已逾期
      </el-tag>
    </span>
  </template>
</el-table-column>

<script>
const isOverdue = (deadline: string, status: string) => {
  if (status === 'completed' || status === 'cancelled') return false;
  return new Date(deadline) < new Date();
};
</script>

<style scoped>
.overdue { color: #f56c6c; font-weight: bold; }
</style>
```

---

## Phase 6: 消息与优化（6个Issue）

### Task 6.1: 操作日志功能

**Files:**
- Create: `server/src/modules/operation-log/operation-log.module.ts`
- Create: `server/src/modules/operation-log/operation-log.service.ts`
- Create: `server/src/modules/operation-log/operation-log.controller.ts`
- Modify: `server/src/common/interceptors/operation-log.interceptor.ts`

**Step 1: Create operation log service**

```typescript
// operation-log.service.ts
@Injectable()
export class OperationLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(userId: string, action: string, module: string, detail: string) {
    return this.prisma.operationLog.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        action,
        module,
        detail,
      },
    });
  }

  async findAll(page = 1, limit = 20) {
    return this.prisma.operationLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }
}
```

**Step 2: Add interceptor to record operations**

```typescript
// operation-log.interceptor.ts
@Injectable()
export class OperationLogInterceptor implements NestInterceptor {
  async intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const method = request.method;
    const url = request.url;

    if (user && method !== 'GET') {
      // Log the operation
    }

    return next.handle();
  }
}
```

---

### Task 6.2: 回收站功能

**Files:**
- Create: `server/src/modules/recycle-bin/recycle-bin.controller.ts`
- Create: `server/src/modules/recycle-bin/recycle-bin.service.ts`
- Modify: `client/src/router/index.ts`
- Create: `client/src/views/RecycleBin.vue`

**Step 1: Create recycle bin service**

```typescript
// recycle-bin.service.ts
@Injectable()
export class RecycleBinService {
  async findDeleted(type: 'document' | 'template' | 'task') {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    switch (type) {
      case 'document':
        return this.prisma.document.findMany({
          where: { deletedAt: { gte: sevenDaysAgo } },
        });
      case 'template':
        return this.prisma.template.findMany({
          where: { deletedAt: { gte: sevenDaysAgo } },
        });
      // ... other types
    }
  }

  async restore(type: 'document' | 'template' | 'task', id: string) {
    // Restore from deletedAt to null
  }
}
```

---

### Task 6.3: 通知未读计数

**Files:**
- Modify: `client/src/stores/user.ts`
- Modify: `client/src/components/Header.vue`

**Step 1: Add unread count to store**

```typescript
// user.ts
const state = reactive({
  // ... existing
  unreadCount: 0,
});

const fetchUnreadCount = async () => {
  const res = await request.get<{ count: number }>('/notifications/unread-count');
  state.unreadCount = res.count;
};
```

**Step 2: Update header badge**

```vue
<el-badge :value="userStore.unreadCount" :hidden="userStore.unreadCount === 0">
  <el-icon><Bell /></el-icon>
</el-badge>
```

---

## 部署准备

### Task 7.1: Docker 配置完善

**Files:**
- Modify: `docker-compose.yml`
- Create: `Dockerfile.server`
- Create: `Dockerfile.client`

**Step 1: Ensure production-ready docker config**

```yaml
# docker-compose.prod.yml
services:
  server:
    build: ./server
    environment:
      - NODE_ENV=production
    depends_on:
      - postgres
      - redis
      - minio
```

---

### Task 7.2: 环境变量配置

**Files:**
- Create: `.env.example`
- Create: `server/.env.example`
- Create: `client/.env.example`

**Step 1: Create example env files**

```bash
# .env.example
DATABASE_URL=postgresql://user:pass@localhost:5432/dms
REDIS_URL=redis://localhost:6379
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
JWT_SECRET=
```

---

## 计划执行顺序

1. **Phase 3 核心**: 版本历史 + 停用功能
2. **Phase 4 完善**: 拖拽排序 + 模板编辑/删除
3. **Phase 5 完善**: 任务取消 + 审批操作 + 逾期标记
4. **Phase 6 完善**: 操作日志 + 回收站 + 未读计数
5. **部署准备**: Docker + 环境变量

---

**Estimated Tasks: ~20 个**
**Priority: 按顺序执行**
