# Todo API And My-Todos Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement GET/POST /api/v1/todos backend module and /my-todos frontend page so users can view and complete cross-module pending tasks.

**Architecture:** New `todo` NestJS module reads `TodoTask` Prisma model (already populated by training/audit/equipment services). Backend computes `actionRoute` per type. Frontend `useTodoStore` tracks pending count for nav badge. New `/my-todos` route has two subcomponents: `MyTodos.vue` (page scaffold) and `TodoTable.vue` (table). Training e2e tests pass once endpoints exist.

**Tech Stack:** NestJS 10, Prisma 5, class-validator, Vue 3 Composition API, Element Plus 2, Pinia 2, TypeScript 5

---

## Scope Check

This plan does NOT cover:
- Merging `/tasks` (RecordTaskAssignment) into `/my-todos`
- `inventory` / `change_request` actionRoutes (no frontend routes exist)
- Notification push or WebSocket

---

## File Structure

### New files
- `server/src/modules/todo/dto/query-todo.dto.ts`
- `server/src/modules/todo/todo.service.ts`
- `server/src/modules/todo/todo.service.spec.ts`
- `server/src/modules/todo/todo.controller.ts`
- `server/src/modules/todo/todo.module.ts`
- `client/src/types/todo.ts`
- `client/src/api/todo.ts`
- `client/src/stores/todo.ts`
- `client/src/views/my-todos/TodoTable.vue`
- `client/src/views/my-todos/MyTodos.vue`

### Modified files
- `server/src/prisma/schema.prisma` — add `completedBy String?` to `TodoTask`
- `server/src/app.module.ts` — import `TodoModule`
- `client/src/types/training.ts` — add `@deprecated` JSDoc to old Todo types
- `client/src/router/index.ts` — add `/my-todos` route
- `client/src/views/Layout.vue` — add menu item and pending badge
- `server/test/training.e2e-spec.ts` — verify 3 todo tests pass (no code change expected)

---

### Task 1: Add completedBy to Prisma Schema and Run Migration

**Files:**
- Modify: `server/src/prisma/schema.prisma`

- [ ] **Step 1: Add field to schema**

Open `server/src/prisma/schema.prisma`. Find the `TodoTask` model. Add one field after `completedAt`:

```
completedBy String?   // 完成人ID，用于审计
```

Full model after edit:

```
model TodoTask {
  id          String       @id @default(cuid())
  userId      String
  user        User         @relation("UserTodoTasks", fields: [userId], references: [id], onDelete: Cascade)
  type        TodoType
  relatedId   String
  title       String
  description String?
  status      TodoStatus   @default(pending)
  priority    TodoPriority @default(normal)
  dueDate     DateTime?
  completedAt DateTime?
  completedBy String?
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@index([userId, status])
  @@index([type, relatedId])
  @@index([status, dueDate])
  @@map("todo_tasks")
}
```

- [ ] **Step 2: Generate and apply migration**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npx prisma migrate dev --name add_completed_by_to_todo_task --schema=src/prisma/schema.prisma
```

Expected: migration file created, Prisma client regenerated, no errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/prisma/schema.prisma server/src/prisma/migrations/
git commit -m "feat: add completedBy to TodoTask for audit trail"
```

---

### Task 2: Backend — Todo Service with Unit Tests

**Files:**
- Create: `server/src/modules/todo/dto/query-todo.dto.ts`
- Create: `server/src/modules/todo/todo.service.ts`
- Create: `server/src/modules/todo/todo.service.spec.ts`

- [ ] **Step 1: Create the DTO**

Create `server/src/modules/todo/dto/query-todo.dto.ts`:

```typescript
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

const STATUS_VALUES = ['all', 'pending', 'completed'] as const;
const TYPE_VALUES = [
  'all', 'training_attend', 'training_organize', 'approval',
  'audit_rectification', 'equipment_maintain', 'inventory', 'change_request',
] as const;

export type TodoStatusFilter = typeof STATUS_VALUES[number];
export type TodoTypeFilter = typeof TYPE_VALUES[number];

export class QueryTodoDto {
  @ApiPropertyOptional({ enum: STATUS_VALUES, default: 'all' })
  @IsOptional()
  @IsEnum(STATUS_VALUES)
  status?: TodoStatusFilter = 'all';

  @ApiPropertyOptional({ enum: TYPE_VALUES, default: 'all' })
  @IsOptional()
  @IsEnum(TYPE_VALUES)
  type?: TodoTypeFilter = 'all';

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
```

- [ ] **Step 2: Write the failing unit tests**

Create `server/src/modules/todo/todo.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { TodoService } from './todo.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

const mockPrisma = {
  todoTask: {
    findMany: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    groupBy: jest.fn(),
  },
};

const makeTodo = (overrides = {}) => ({
  id: '1', type: 'training_attend', relatedId: 'proj1', status: 'pending',
  title: '参加培训', priority: 'normal', dueDate: null,
  completedAt: null, completedBy: null, createdAt: new Date(), updatedAt: new Date(),
  ...overrides,
});

describe('TodoService', () => {
  let service: TodoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TodoService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<TodoService>(TodoService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns paginated items with computed actionRoute', async () => {
      mockPrisma.todoTask.findMany.mockResolvedValue([makeTodo()]);
      mockPrisma.todoTask.count.mockResolvedValue(1);

      const result = await service.findAll('user1', { status: 'all', type: 'all', page: 1, limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].actionRoute).toBe('/training/projects/proj1');
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
      expect(mockPrisma.todoTask.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ userId: 'user1' }) }),
      );
    });

    it('sets actionRoute null for unmapped type (inventory)', async () => {
      mockPrisma.todoTask.findMany.mockResolvedValue([makeTodo({ type: 'inventory' })]);
      mockPrisma.todoTask.count.mockResolvedValue(1);

      const result = await service.findAll('user1', { status: 'all', type: 'all', page: 1, limit: 20 });
      expect(result.items[0].actionRoute).toBeNull();
    });

    it('sets hasMore true when more pages exist', async () => {
      mockPrisma.todoTask.findMany.mockResolvedValue(new Array(5).fill(makeTodo()));
      mockPrisma.todoTask.count.mockResolvedValue(10);

      const result = await service.findAll('user1', { status: 'all', type: 'all', page: 1, limit: 5 });
      expect(result.hasMore).toBe(true);
    });
  });

  describe('getStatistics', () => {
    it('returns all TodoType keys with zero-fill and byStatus counts', async () => {
      mockPrisma.todoTask.groupBy.mockResolvedValue([
        { type: 'training_attend', status: 'pending', _count: { id: 3 } },
        { type: 'approval', status: 'completed', _count: { id: 1 } },
      ]);

      const result = await service.getStatistics('user1');

      expect(result.byStatus.pending).toBe(3);
      expect(result.byStatus.completed).toBe(1);
      expect(result.total).toBe(4);
      expect(result.byType['training_attend']).toBe(3);
      expect(result.byType['approval']).toBe(1);
      expect(result.byType['equipment_maintain']).toBe(0);
    });
  });

  describe('complete', () => {
    it('marks pending todo as completed and writes completedBy', async () => {
      mockPrisma.todoTask.findFirst.mockResolvedValue(makeTodo({ id: 'todo1', userId: 'user1' }));
      mockPrisma.todoTask.update.mockResolvedValue({
        id: 'todo1', status: 'completed', completedAt: new Date(), completedBy: 'user1',
      });

      const result = await service.complete('todo1', 'user1');

      expect(result.status).toBe('completed');
      expect(mockPrisma.todoTask.update).toHaveBeenCalledWith({
        where: { id: 'todo1' },
        data: expect.objectContaining({ status: 'completed', completedBy: 'user1' }),
      });
    });

    it('throws NotFoundException when todo not found', async () => {
      mockPrisma.todoTask.findFirst.mockResolvedValue(null);
      await expect(service.complete('missing', 'user1')).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when already completed (non-idempotent)', async () => {
      mockPrisma.todoTask.findFirst.mockResolvedValue(makeTodo({ id: 'todo1', userId: 'user1', status: 'completed' }));
      await expect(service.complete('todo1', 'user1')).rejects.toThrow(ConflictException);
    });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npx jest todo.service.spec.ts --no-coverage 2>&1 | tail -10
```

Expected: FAIL — TodoService not found.

- [ ] **Step 4: Implement TodoService**

Create `server/src/modules/todo/todo.service.ts`:

```typescript
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryTodoDto } from './dto/query-todo.dto';
import { TodoType } from '@prisma/client';

const ACTION_ROUTE_MAP: Partial<Record<TodoType, (id: string) => string>> = {
  training_attend: (id) => `/training/projects/${id}`,
  training_organize: (id) => `/training/projects/${id}`,
  approval: (id) => `/approvals/detail/${id}`,
  audit_rectification: (_id) => `/internal-audit/rectifications`,
  equipment_maintain: (id) => `/equipment/${id}`,
};

const ALL_TODO_TYPES: TodoType[] = [
  'training_attend', 'training_organize', 'approval',
  'audit_rectification', 'equipment_maintain', 'inventory', 'change_request',
];

@Injectable()
export class TodoService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, query: QueryTodoDto) {
    const { status = 'all', type = 'all', page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = { userId };
    if (status !== 'all') where.status = status;
    if (type !== 'all') where.type = type;

    const [rawItems, total] = await Promise.all([
      this.prisma.todoTask.findMany({
        where,
        orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.todoTask.count({ where }),
    ]);

    const items = rawItems.map((t) => ({
      ...t,
      actionRoute: ACTION_ROUTE_MAP[t.type]?.(t.relatedId) ?? null,
    }));

    return { items, total, page, limit, hasMore: skip + items.length < total };
  }

  async getStatistics(userId: string) {
    const groups = await this.prisma.todoTask.groupBy({
      by: ['type', 'status'],
      where: { userId },
      _count: { id: true },
    });

    const byType: Partial<Record<TodoType, number>> = Object.fromEntries(
      ALL_TODO_TYPES.map((t) => [t, 0]),
    );
    let pending = 0;
    let completed = 0;

    for (const g of groups) {
      const count = g._count.id;
      byType[g.type] = (byType[g.type] ?? 0) + count;
      if (g.status === 'pending') pending += count;
      else if (g.status === 'completed') completed += count;
    }

    return { total: pending + completed, byType, byStatus: { pending, completed } };
  }

  async complete(id: string, userId: string) {
    const todo = await this.prisma.todoTask.findFirst({ where: { id, userId } });
    if (!todo) throw new NotFoundException('待办不存在');
    if (todo.status !== 'pending') throw new ConflictException('该待办已完成，不可重复操作');
    return this.prisma.todoTask.update({
      where: { id },
      data: { status: 'completed', completedAt: new Date(), completedBy: userId },
    });
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npx jest todo.service.spec.ts --no-coverage 2>&1 | tail -10
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/modules/todo/
git commit -m "feat: add TodoService with findAll, getStatistics, complete"
```

---

### Task 3: Backend — Controller, Module, App Registration

**Files:**
- Create: `server/src/modules/todo/todo.controller.ts`
- Create: `server/src/modules/todo/todo.module.ts`
- Modify: `server/src/app.module.ts`

- [ ] **Step 1: Create controller**

Create `server/src/modules/todo/todo.controller.ts`:

```typescript
import { Controller, Get, Post, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TodoService } from './todo.service';
import { QueryTodoDto } from './dto/query-todo.dto';

@ApiTags('待办任务')
@Controller('todos')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TodoController {
  constructor(private readonly todoService: TodoService) {}

  @Get()
  @ApiOperation({ summary: '获取当前用户待办列表' })
  findAll(@Query() query: QueryTodoDto, @Request() req: any) {
    return this.todoService.findAll(req.user.id, query);
  }

  @Get('statistics')
  @ApiOperation({ summary: '获取当前用户待办统计（用于 badge）' })
  getStatistics(@Request() req: any) {
    return this.todoService.getStatistics(req.user.id);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: '完成指定待办（非幂等，重复提交 409）' })
  complete(@Param('id') id: string, @Request() req: any) {
    return this.todoService.complete(id, req.user.id);
  }
}
```

- [ ] **Step 2: Create module**

Create `server/src/modules/todo/todo.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TodoController } from './todo.controller';
import { TodoService } from './todo.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TodoController],
  providers: [TodoService],
})
export class TodoModule {}
```

- [ ] **Step 3: Register in app.module.ts**

Open `server/src/app.module.ts`. Add at top:

```typescript
import { TodoModule } from './modules/todo/todo.module';
```

Add `TodoModule` to the `imports: [...]` array.

- [ ] **Step 4: Build to verify**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npm run build 2>&1 | tail -5
```

Expected: exits 0, no errors.

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/todo/todo.controller.ts server/src/modules/todo/todo.module.ts server/src/app.module.ts
git commit -m "feat: register TodoController and TodoModule"
```

---

### Task 4: Client Types and API Client

**Files:**
- Create: `client/src/types/todo.ts`
- Create: `client/src/api/todo.ts`
- Modify: `client/src/types/training.ts`

- [ ] **Step 1: Create authoritative frontend types**

Create `client/src/types/todo.ts`:

```typescript
export type TodoStatus = 'pending' | 'completed';
export type TodoPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TodoType =
  | 'training_attend'
  | 'training_organize'
  | 'approval'
  | 'audit_rectification'
  | 'equipment_maintain'
  | 'inventory'
  | 'change_request';

export interface TodoItem {
  id: string;
  type: TodoType;
  status: TodoStatus;
  priority: TodoPriority;
  title: string;
  description: string | null;
  relatedId: string;
  actionRoute: string | null;
  dueDate: string | null;
  createdAt: string;
  completedAt: string | null;
  completedBy: string | null;
}

export interface TodoListResponse {
  items: TodoItem[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface TodoStatisticsResponse {
  total: number;
  byType: Partial<Record<TodoType, number>>;
  byStatus: { pending: number; completed: number };
}

export interface TodoListQuery {
  status?: 'all' | TodoStatus;
  type?: 'all' | TodoType;
  page?: number;
  limit?: number;
}
```

- [ ] **Step 2: Deprecate old Todo types in training.ts**

Open `client/src/types/training.ts`. Find the `// Todo Task` comment block (around line 256). Add JSDoc above each interface without changing field definitions:

```typescript
/** @deprecated Use TodoItem from '@/types/todo' instead. */
export interface TodoTask {
  // ... existing fields unchanged
}

/** @deprecated Use TodoStatisticsResponse from '@/types/todo' instead. */
export interface TodoStatistics {
  // ... existing fields unchanged
}
```

- [ ] **Step 3: Create API client**

Create `client/src/api/todo.ts`:

```typescript
import request from './request';
import type { TodoListQuery, TodoListResponse, TodoStatisticsResponse, TodoItem } from '@/types/todo';

export const todoApi = {
  list(query: TodoListQuery): Promise<TodoListResponse> {
    return request.get('/todos', { params: query });
  },

  statistics(): Promise<TodoStatisticsResponse> {
    return request.get('/todos/statistics');
  },

  complete(id: string): Promise<TodoItem> {
    return request.post(`/todos/${id}/complete`);
  },
};
```

- [ ] **Step 4: Commit**

```bash
git add client/src/types/todo.ts client/src/api/todo.ts client/src/types/training.ts
git commit -m "feat: add todo types and todoApi client, deprecate old training.ts todo types"
```

---

### Task 5: useTodoStore

**Files:**
- Create: `client/src/stores/todo.ts`

- [ ] **Step 1: Create store**

Create `client/src/stores/todo.ts`:

```typescript
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { todoApi } from '@/api/todo';

export const useTodoStore = defineStore('todo', () => {
  const pendingTodoCount = ref(0);
  let _inflight: Promise<void> | null = null;

  function handleStatsError(err: unknown): void {
    const code = (err as any)?.code;
    if (code !== 401 && code !== 403) {
      console.warn('[TodoStore] refreshPendingCount failed:', err);
    }
  }

  async function refreshPendingCount(): Promise<void> {
    if (_inflight) return _inflight;
    _inflight = todoApi
      .statistics()
      .then((stats) => { pendingTodoCount.value = stats.byStatus.pending; })
      .catch(handleStatsError)
      .finally(() => { _inflight = null; });
    return _inflight;
  }

  return { pendingTodoCount, refreshPendingCount };
});
```

- [ ] **Step 2: Commit**

```bash
git add client/src/stores/todo.ts
git commit -m "feat: add useTodoStore with dedup pending count refresh"
```

---

### Task 6: TodoTable Subcomponent

**Files:**
- Create: `client/src/views/my-todos/TodoTable.vue`

- [ ] **Step 1: Create TodoTable.vue**

Create `client/src/views/my-todos/TodoTable.vue`:

```vue
<template>
  <el-table v-loading="loading" :data="items" empty-text="暂无待办">
    <el-table-column label="标题" prop="title" min-width="200" />
    <el-table-column label="类型" width="130">
      <template #default="{ row }">
        <el-tag size="small">{{ TYPE_LABELS[row.type] ?? row.type }}</el-tag>
      </template>
    </el-table-column>
    <el-table-column label="优先级" width="90">
      <template #default="{ row }">
        <el-tag :type="PRIORITY_TYPES[row.priority]" size="small">
          {{ PRIORITY_LABELS[row.priority] ?? row.priority }}
        </el-tag>
      </template>
    </el-table-column>
    <el-table-column label="截止日期" width="120">
      <template #default="{ row }">{{ row.dueDate ? row.dueDate.slice(0, 10) : '—' }}</template>
    </el-table-column>
    <el-table-column label="创建时间" width="120">
      <template #default="{ row }">{{ row.createdAt.slice(0, 10) }}</template>
    </el-table-column>
    <el-table-column label="状态" width="90">
      <template #default="{ row }">
        <el-tag :type="row.status === 'pending' ? 'warning' : 'success'" size="small">
          {{ row.status === 'pending' ? '待处理' : '已完成' }}
        </el-tag>
      </template>
    </el-table-column>
    <el-table-column label="操作" width="160" fixed="right">
      <template #default="{ row }">
        <el-button
          v-if="row.status === 'pending'"
          type="primary"
          size="small"
          :loading="completing === row.id"
          @click="emit('complete', row)"
        >完成</el-button>
        <el-tooltip :content="row.actionRoute ? '前往处理' : '暂不支持跳转'" placement="top">
          <span>
            <el-button size="small" :disabled="!row.actionRoute" @click="emit('goto', row)">
              跳转
            </el-button>
          </span>
        </el-tooltip>
      </template>
    </el-table-column>
  </el-table>
</template>

<script setup lang="ts">
import type { TodoItem, TodoType } from '@/types/todo';

defineProps<{ items: TodoItem[]; loading: boolean; completing: string | null }>();
const emit = defineEmits<{ complete: [row: TodoItem]; goto: [row: TodoItem] }>();

const TYPE_LABELS: Record<TodoType, string> = {
  training_attend: '培训参加',
  training_organize: '培训组织',
  approval: '审批',
  audit_rectification: '内审整改',
  equipment_maintain: '设备维护',
  inventory: '盘点',
  change_request: '变更请求',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: '低', normal: '普通', high: '高', urgent: '紧急',
};

const PRIORITY_TYPES: Record<string, '' | 'info' | 'warning' | 'danger'> = {
  low: 'info', normal: '', high: 'warning', urgent: 'danger',
};
</script>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/views/my-todos/TodoTable.vue
git commit -m "feat: add TodoTable subcomponent with type, priority, and action columns"
```

---

### Task 7: MyTodos.vue Page Scaffold

**Files:**
- Create: `client/src/views/my-todos/MyTodos.vue`

- [ ] **Step 1: Create MyTodos.vue**

Create `client/src/views/my-todos/MyTodos.vue`:

```vue
<template>
  <div class="my-todos-page">
    <el-card>
      <template #header><span>我的待办</span></template>
      <el-row :gutter="12" class="filter-row">
        <el-col :span="8">
          <el-select v-model="query.status" @change="resetAndFetch">
            <el-option label="全部" value="all" />
            <el-option label="待处理" value="pending" />
            <el-option label="已完成" value="completed" />
          </el-select>
        </el-col>
        <el-col :span="8">
          <el-select v-model="query.type" @change="resetAndFetch">
            <el-option label="全部类型" value="all" />
            <el-option label="培训参加" value="training_attend" />
            <el-option label="培训组织" value="training_organize" />
            <el-option label="审批" value="approval" />
            <el-option label="内审整改" value="audit_rectification" />
            <el-option label="设备维护" value="equipment_maintain" />
            <el-option label="盘点" value="inventory" />
            <el-option label="变更请求" value="change_request" />
          </el-select>
        </el-col>
      </el-row>
      <TodoTable
        :items="items"
        :loading="loading"
        :completing="completing"
        @complete="handleComplete"
        @goto="handleGoto"
      />
      <el-pagination
        v-if="total > 0"
        class="pagination"
        background
        layout="total, prev, pager, next"
        :total="total"
        :page-size="query.limit"
        :current-page="query.page"
        @current-change="handlePageChange"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { todoApi } from '@/api/todo';
import { useTodoStore } from '@/stores/todo';
import TodoTable from './TodoTable.vue';
import type { TodoItem, TodoListQuery } from '@/types/todo';

const router = useRouter();
const todoStore = useTodoStore();

const loading = ref(false);
const completing = ref<string | null>(null);
const items = ref<TodoItem[]>([]);
const total = ref(0);

const query = reactive<Required<TodoListQuery>>({
  status: 'all', type: 'all', page: 1, limit: 20,
});

async function fetchList() {
  loading.value = true;
  try {
    const res = await todoApi.list(query);
    items.value = res.items;
    total.value = res.total;
  } catch {
    ElMessage.error('获取待办列表失败');
  } finally {
    loading.value = false;
  }
}

function resetAndFetch() { query.page = 1; fetchList(); }
function handlePageChange(page: number) { query.page = page; fetchList(); }

function resolveCompleteError(err: unknown): string {
  const status = (err as any)?.status ?? (err as any)?.code;
  if (status === 404) return '待办不存在';
  if (status === 409) return '该待办已完成';
  return '操作失败，请重试';
}

async function handleComplete(row: TodoItem) {
  completing.value = row.id;
  try {
    await todoApi.complete(row.id);
    ElMessage.success('已完成');
    await Promise.all([fetchList(), todoStore.refreshPendingCount()]);
  } catch (err) {
    ElMessage.error(resolveCompleteError(err));
  } finally {
    completing.value = null;
  }
}

function handleGoto(row: TodoItem) {
  if (row.actionRoute) router.push(row.actionRoute);
}

onMounted(() => { fetchList(); todoStore.refreshPendingCount(); });
</script>

<style scoped>
.my-todos-page { padding: 20px; }
.filter-row { margin-bottom: 16px; }
.pagination { margin-top: 16px; justify-content: flex-end; }
</style>
```

- [ ] **Step 2: Run build**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client && npm run build 2>&1 | tail -5
```

Expected: build passes.

- [ ] **Step 3: Commit**

```bash
git add client/src/views/my-todos/MyTodos.vue
git commit -m "feat: add MyTodos.vue page with filter, list, complete, and goto actions"
```

---

### Task 8: Router and Layout Integration

**Files:**
- Modify: `client/src/router/index.ts`
- Modify: `client/src/views/Layout.vue`

- [ ] **Step 1: Add /my-todos route**

Open `client/src/router/index.ts`. In the children array of the main layout route, add near `/workflow/my-tasks`:

```typescript
{
  path: 'my-todos',
  name: 'MyTodos',
  component: () => import('@/views/my-todos/MyTodos.vue'),
  meta: { title: '我的待办' },
},
```

- [ ] **Step 2: Import useTodoStore and refresh on mount in Layout.vue**

Open `client/src/views/Layout.vue`. In the `<script setup>` section, add:

```typescript
import { useTodoStore } from '@/stores/todo';
const todoStore = useTodoStore();
```

Add or merge into `onMounted`:

```typescript
onMounted(() => {
  todoStore.refreshPendingCount();
});
```

(`onMounted` is already imported via `import { ..., onMounted } from 'vue'` — verify this exists, add if not.)

- [ ] **Step 3: Add menu item with badge**

In the `menuItems` array, add a new top-level entry (place after dashboard):

```typescript
{ path: '/my-todos', title: '我的待办', icon: Bell, badge: true },
```

`Bell` is already imported in the existing icons import line.

- [ ] **Step 4: Update menu item template to support optional badge**

Find the `v-if="!item.children"` branch in the menu template. Replace it with:

```html
<el-menu-item v-if="!item.children" :index="item.path">
  <el-icon><component :is="item.icon" /></el-icon>
  <template #title>
    <el-badge
      v-if="item.badge && todoStore.pendingTodoCount > 0"
      :value="todoStore.pendingTodoCount"
      :max="99"
    >{{ item.title }}</el-badge>
    <span v-else>{{ item.title }}</span>
  </template>
</el-menu-item>
```

- [ ] **Step 5: Run build and tests**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client && npm run build 2>&1 | tail -5
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client && npm test -- --run 2>&1 | tail -10
```

Expected: build passes, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add client/src/router/index.ts client/src/views/Layout.vue
git commit -m "feat: add /my-todos route and Layout nav badge"
```

---

### Task 9: Verify Training E2E Tests Pass

**Files:**
- Read: `server/test/training.e2e-spec.ts`

The 3 failing tests in `describe('Todo Task API')` call the correct endpoints. They should pass now that the backend is live.

- [ ] **Step 1: Run training e2e tests**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npx jest test/training.e2e-spec.ts --no-coverage 2>&1 | grep -E "PASS|FAIL|✓|✗|●" | head -30
```

Expected: 3 todo-related tests now PASS.

- [ ] **Step 2: If a todo test fails with no data, add a seed**

If the test fails because `prisma.todoTask.findFirst` returns null (no data for trainee1), add a seed in the test file's `beforeAll`:

```typescript
// Inside the describe('Todo Task API') block or the outer beforeAll:
await prisma.todoTask.create({
  data: {
    userId: IDS.trainee1,
    type: 'training_attend',
    relatedId: 'seed-project-id',
    title: '测试培训参加待办',
    status: 'pending',
  },
});
```

- [ ] **Step 3: Commit if test file changed**

```bash
git add server/test/training.e2e-spec.ts
git commit -m "test: seed todo data for training e2e todo tests"
```

---

## Self-Review

**Spec coverage:**
- completedBy schema field: Task 1
- 3 endpoints with JWT guard: Tasks 2-3
- actionRoute mapping (correct routes from router.ts): Task 2 ACTION_ROUTE_MAP
- 404/409/400 error codes: Task 2 complete()
- byType all keys present (zero-fill): Task 2 getStatistics()
- hasMore in list response: Task 2 findAll()
- status/type use 'all' not undefined: Tasks 2, 4
- Frontend types in todo.ts: Task 4
- Old types deprecated not deleted: Task 4
- useTodoStore with in-flight dedup: Task 5
- 401/403 silent, others console.warn: Task 5
- Page with filter, list, complete, goto: Tasks 6-7
- Non-optimistic complete: Task 7 handleComplete
- Badge refresh on Layout mount + complete + page mount: Tasks 5, 7, 8
- Training e2e tests pass: Task 9

**Type consistency:** TodoItem, TodoListResponse, TodoStatisticsResponse, TodoListQuery defined in Task 4 and referenced unchanged in Tasks 5, 6, 7. No renaming.

**No placeholders:** All code blocks complete and runnable.
