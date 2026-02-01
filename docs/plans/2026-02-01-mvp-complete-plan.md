# 文档管理系统 MVP 完整实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现文档管理系统 MVP (Phase 1-6)，包含用户管理、部门管理、四级文档体系、模板管理、任务分发、站内消息等完整功能

**Architecture:**
- 前端: Vue 3 + Element Plus + Pinia + Axios
- 后端: NestJS + TypeScript + Prisma ORM
- 数据库: PostgreSQL + Redis 缓存
- 文件存储: MinIO 对象存储
- 类型共享: packages/types 目录

**Tech Stack:**
- Vue 3.4.x, Element Plus 2.5.x, Vite 5.x, Pinia 2.x
- NestJS 10.x, TypeScript 5.x, Prisma 5.x
- PostgreSQL 15+, Redis 7+, MinIO Latest
- xlsx, bcrypt, jsonwebtoken, class-validator

---

## Phase 1: 基础配置 (8个Issue)

### Task 1.1: 雪花ID生成器实现

**Files:**
- Create: `server/src/common/utils/snowflake.ts`
- Modify: `server/src/prisma/schema.prisma`

**Step 1: Write the failing test**

```typescript
// server/test/snowflake.test.ts
import { Snowflake } from '../src/common/utils/snowflake';

describe('Snowflake', () => {
  it('should generate unique IDs', () => {
    const snowflake = new Snowflake(1, 1);
    const id1 = snowflake.nextId();
    const id2 = snowflake.nextId();
    expect(id1).not.toBe(id2);
  });

  it('should generate 19-20 character string ID', () => {
    const snowflake = new Snowflake(1, 1);
    const id = snowflake.nextId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThanOrEqual(19);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- --testPathPattern=snowflake.test.ts`
Expected: FAIL - Snowflake class not defined

**Step 3: Write minimal implementation**

```typescript
// server/src/common/utils/snowflake.ts
export class Snowflake {
  private sequence = 0;
  private lastTimestamp = 0n;
  private readonly workerId: number;
  private readonly datacenterId: number;

  constructor(workerId: number = 1, datacenterId: number = 1) {
    this.workerId = workerId;
    this.datacenterId = datacenterId;
  }

  nextId(): string {
    const timestamp = BigInt(Date.now());
    if (timestamp === this.lastTimestamp) {
      this.sequence = (this.sequence + 1) & 4095;
    } else {
      this.sequence = 0;
    }
    this.lastTimestamp = timestamp;
    const id = ((timestamp - 1609459200000n) << 22n) |
               (BigInt(this.datacenterId) << 17n) |
               (BigInt(this.workerId) << 12n) |
               BigInt(this.sequence);
    return id.toString();
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- --testPathPattern=snowflake.test.ts`
Expected: PASS (2 tests)

**Step 5: Commit**

```bash
git add server/src/common/utils/snowflake.ts server/test/snowflake.test.ts
git commit -m "feat: 添加雪花ID生成器"
```

---

### Task 1.2: Prisma Schema 更新 - 使用雪花ID

**Files:**
- Modify: `server/src/prisma/schema.prisma`

**Step 1: Update schema**

```prisma
// server/src/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  username      String    @unique
  password      String
  name          String
  departmentId  String?
  role          String    @default("user")
  superiorId    String?
  status        String    @default("active")
  loginAttempts Int       @default(0)
  lockedUntil   DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime?

  @@map("users")
}

model Department {
  id        String    @id @default(cuid())
  code      String    @unique
  name      String
  parentId  String?
  status    String    @default("active")
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  @@map("departments")
}

model NumberRule {
  id           String   @id @default(cuid())
  level        Int
  departmentId String
  sequence     Int      @default(0)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([level, departmentId])
  @@map("number_rules")
}

model Document {
  id          String    @id @default(cuid())
  level       Int
  number      String    @unique
  title       String
  filePath    String
  fileName    String
  fileSize    BigInt
  fileType    String
  version     Float     @default(1.0)
  status      String
  creatorId   String
  approverId  String?
  approvedAt  DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?

  @@map("documents")
}

model DocumentVersion {
  id          String   @id @default(cuid())
  documentId  String
  version     Float
  filePath    String
  fileName    String
  fileSize    BigInt
  creatorId   String
  createdAt   DateTime @default(now())

  @@map("document_versions")
}

model Template {
  id        String   @id @default(cuid())
  level     Int      @default(4)
  number    String   @unique
  title     String
  fieldsJson Json
  version   Float    @default(1.0)
  status    String   @default("active")
  creatorId String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?

  @@map("templates")
}

model Task {
  id           String    @id @default(cuid())
  templateId   String
  departmentId String
  deadline     DateTime
  status       String    @default("pending")
  creatorId    String
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  deletedAt    DateTime?

  @@map("tasks")
}

model TaskRecord {
  id          String    @id @default(cuid())
  taskId      String
  templateId  String
  dataJson    Json
  status      String    @default("pending")
  submitterId String?
  submittedAt DateTime?
  approverId  String?
  approvedAt  DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?

  @@map("task_records")
}

model Approval {
  id         String   @id @default(cuid())
  documentId String
  recordId   String?
  approverId String
  status     String
  comment    String?
  createdAt  DateTime @default(now())

  @@map("approvals")
}

model OperationLog {
  id         String   @id @default(cuid())
  userId     String
  action     String
  module     String
  objectId   String
  objectType String
  details    Json?
  ip         String
  createdAt  DateTime @default(now())

  @@map("operation_logs")
}

model Notification {
  id        String    @id @default(cuid())
  userId    String
  type      String
  title     String
  content   String?
  isRead    Boolean   @default(false)
  readAt    DateTime?
  createdAt DateTime  @default(now())

  @@map("notifications")
}
```

**Step 2: Run Prisma generate**

Run: `cd server && npx prisma generate`
Expected: Generate client successfully

**Step 3: Run Prisma migrate**

Run: `npx prisma migrate dev --name init`
Expected: Create migrations directory with init migration

**Step 4: Commit**

```bash
git add server/src/prisma/schema.prisma server/prisma/migrations/
git commit -m "feat: 更新Prisma Schema使用雪花ID"
```

---

### Task 1.3: 共享类型定义

**Files:**
- Create: `packages/types/index.ts`
- Create: `packages/types/user.ts`
- Create: `packages/types/document.ts`
- Create: `packages/types/template.ts`
- Create: `packages/types/task.ts`
- Create: `packages/types/api.ts`

**Step 1: Write type definitions**

```typescript
// packages/types/index.ts
export * from './user';
export * from './document';
export * from './template';
export * from './task';
export * from './api';

// packages/types/user.ts
export interface User {
  id: string;
  username: string;
  name: string;
  departmentId?: string;
  role: 'user' | 'leader' | 'admin';
  superiorId?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  parentId?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

// packages/types/api.ts
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  list: T[];
  total: number;
  page: number;
  limit: number;
}

// packages/types/document.ts
export interface Document {
  id: string;
  level: 1 | 2 | 3;
  number: string;
  title: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  version: number;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'archived';
  creatorId: string;
  approverId?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// packages/types/template.ts
export interface TemplateField {
  id: string;
  name: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'boolean';
  label: string;
  required: boolean;
  defaultValue?: string | number | boolean;
  options?: { label: string; value: string }[];
  sort: number;
}

export interface Template {
  id: string;
  level: 4;
  number: string;
  title: string;
  fieldsJson: TemplateField[];
  version: number;
  status: 'active' | 'inactive';
  creatorId: string;
  createdAt: string;
  updatedAt: string;
}

// packages/types/task.ts
export interface Task {
  id: string;
  templateId: string;
  template?: Template;
  departmentId: string;
  department?: Department;
  deadline: string;
  status: 'pending' | 'completed' | 'cancelled';
  creatorId: string;
  creator?: User;
  createdAt: string;
  updatedAt: string;
}

export interface TaskRecord {
  id: string;
  taskId: string;
  templateId: string;
  dataJson: Record<string, any>;
  status: 'pending' | 'submitted' | 'approved' | 'rejected';
  submitterId?: string;
  submittedAt?: string;
  approverId?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

**Step 2: Create package.json for types**

```json
{
  "name": "@noidear/types",
  "version": "1.0.0",
  "main": "index.ts",
  "types": "index.ts",
  "exports": {
    ".": {
      "import": "./index.ts",
      "types": "./index.ts"
    }
  }
}
```

**Step 3: Commit**

```bash
git add packages/types/
git commit -m "feat: 添加共享类型定义"
```

---

### Task 1.4: 后端公共异常过滤器

**Files:**
- Create: `server/src/common/filters/all-exception.filter.ts`

**Step 1: Write exception filter**

```typescript
// server/src/common/filters/all-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    response.status(status).json({
      code: status,
      message: message,
      details:
        process.env.NODE_ENV === 'development'
          ? exception instanceof Error
            ? exception.stack
            : String(exception)
          : undefined,
    });
  }
}
```

**Step 2: Register in main.ts**

```typescript
// server/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionFilter } from './common/filters/all-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new AllExceptionFilter());
  await app.listen(3000);
}
bootstrap();
```

**Step 3: Commit**

```bash
git add server/src/common/filters/all-exception.filter.ts server/src/main.ts
git commit -m "feat: 添加全局异常过滤器"
```

---

### Task 1.5: Axios请求封装和API拦截器

**Files:**
- Create: `client/src/utils/request.js`
- Modify: `client/src/main.js`

**Step 1: Write axios instance**

```javascript
// client/src/utils/request.js
import axios from 'axios';
import { ElMessage } from 'element-plus';
import { useUserStore } from '@/stores/user';

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 30000,
});

// Request interceptor
request.interceptors.request.use(
  (config) => {
    const userStore = useUserStore();
    if (userStore.token) {
      config.headers.Authorization = `Bearer ${userStore.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
request.interceptors.response.use(
  (response) => {
    const { code, message, data } = response.data;
    if (code === 0 || code === 200) {
      return data;
    }
    ElMessage.error(message || '请求失败');
    return Promise.reject(new Error(message));
  },
  (error) => {
    if (error.response?.status === 401) {
      const userStore = useUserStore();
      userStore.logout();
      window.location.href = '/login';
    } else {
      ElMessage.error(error.response?.data?.message || '网络错误');
    }
    return Promise.reject(error);
  }
);

export default request;
```

**Step 2: Update main.js**

```javascript
// client/src/main.js
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import App from './App.vue';
import router from './router';
import request from '@/utils/request';

import 'element-plus/dist/index.css';

const app = createApp(App);

// Register all icons
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

app.use(createPinia());
app.use(router);
app.use(ElementPlus);

app.config.globalProperties.$request = request;

app.mount('#app');
```

**Step 3: Commit**

```bash
git add client/src/utils/request.js client/src/main.js
git commit -m "feat: 封装Axios请求和拦截器"
```

---

### Task 1.6: User状态管理

**Files:**
- Create: `client/src/stores/user.js`

**Step 1: Write user store**

```javascript
// client/src/stores/user.js
import { defineStore } from 'pinia';
import request from '@/utils/request';

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    user: null,
  }),
  getters: {
    isLoggedIn: (state) => !!state.token,
    isAdmin: (state) => state.user?.role === 'admin',
    isLeader: (state) => state.user?.role === 'leader',
  },
  actions: {
    async login(username, password) {
      const data = await request.post('/auth/login', { username, password });
      this.token = data.token;
      this.user = data.user;
      localStorage.setItem('token', this.token);
      return data;
    },
    async getCurrentUser() {
      const user = await request.get('/auth/me');
      this.user = user;
      return user;
    },
    async logout() {
      try {
        await request.post('/auth/logout');
      } finally {
        this.token = '';
        this.user = null;
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    },
    updateUser(user) {
      this.user = { ...this.user, ...user };
    },
  },
});
```

**Step 2: Commit**

```bash
git add client/src/stores/user.js
git commit -m "feat: 添加User状态管理"
```

---

### Task 1.7: 路由配置和守卫

**Files:**
- Create: `client/src/router/index.js`
- Modify: `client/src/App.vue`

**Step 1: Write router config**

```javascript
// client/src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import { useUserStore } from '@/stores/user';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    component: () => import('@/views/Layout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
      },
      {
        path: 'document/level/:level',
        name: 'DocumentList',
        component: () => import('@/views/document/List.vue'),
      },
      {
        path: 'document/upload/:level',
        name: 'DocumentUpload',
        component: () => import('@/views/document/Upload.vue'),
      },
      {
        path: 'template',
        name: 'TemplateList',
        component: () => import('@/views/template/List.vue'),
      },
      {
        path: 'template/create',
        name: 'TemplateCreate',
        component: () => import('@/views/template/Create.vue'),
      },
      {
        path: 'task',
        name: 'TaskList',
        component: () => import('@/views/task/List.vue'),
      },
      {
        path: 'task/distribute',
        name: 'TaskDistribute',
        component: () => import('@/views/task/Distribute.vue'),
      },
      {
        path: 'approval',
        name: 'ApprovalPending',
        component: () => import('@/views/approval/Pending.vue'),
      },
      {
        path: 'approval/history',
        name: 'ApprovalHistory',
        component: () => import('@/views/approval/History.vue'),
      },
      {
        path: 'user',
        name: 'UserList',
        component: () => import('@/views/user/List.vue'),
        meta: { roles: ['admin'] },
      },
      {
        path: 'department',
        name: 'DepartmentList',
        component: () => import('@/views/department/List.vue'),
        meta: { roles: ['admin'] },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore();

  if (to.meta.public) {
    return next();
  }

  if (!userStore.token) {
    return next({ name: 'Login', query: { redirect: to.fullPath } });
  }

  if (!userStore.user) {
    try {
      await userStore.getCurrentUser();
    } catch {
      return next({ name: 'Login' });
    }
  }

  if (to.meta.roles && !to.meta.roles.includes(userStore.user.role)) {
    return next({ name: 'Dashboard' });
  }

  next();
});

export default router;
```

**Step 2: Update App.vue**

```vue
<template>
  <router-view />
</template>

<script setup>
</script>
```

**Step 3: Commit**

```bash
git add client/src/router/index.js client/src/App.vue
git commit -m "feat: 配置路由和导航守卫"
```

---

### Task 1.8: 布局组件（侧边栏+顶栏）

**Files:**
- Create: `client/src/views/Layout.vue`
- Create: `client/src/components/Sidebar.vue`
- Create: `client/src/components/Header.vue`

**Step 1: Write Layout component**

```vue
<!-- client/src/views/Layout.vue -->
<template>
  <el-container class="layout-container">
    <el-aside :width="isCollapsed ? '64px' : '200px'" class="sidebar">
      <Sidebar :collapsed="isCollapsed" />
    </el-aside>
    <el-container>
      <el-header class="header">
        <Header @toggle="isCollapsed = !isCollapsed" />
      </el-header>
      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref } from 'vue';
import Sidebar from '@/components/Sidebar.vue';
import Header from '@/components/Header.vue';

const isCollapsed = ref(false);
</script>

<style scoped>
.layout-container {
  height: 100vh;
}
.sidebar {
  background-color: #304156;
  transition: width 0.3s;
}
.header {
  padding: 0;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
}
.main {
  background: #f5f7fa;
  padding: 20px;
}
</style>
```

**Step 2: Write Sidebar component**

```vue
<!-- client/src/components/Sidebar.vue -->
<template>
  <el-menu
    :default-active="activeMenu"
    :collapse="collapsed"
    :collapse-transition="false"
    background-color="#304156"
    text-color="#bfcbd9"
    active-text-color="#409EFF"
    router
  >
    <template v-for="menu in menus" :key="menu.path">
      <el-sub-menu v-if="menu.children" :index="menu.path">
        <template #title>
          <el-icon><component :is="menu.icon" /></el-icon>
          <span>{{ menu.title }}</span>
        </template>
        <el-menu-item
          v-for="child in menu.children"
          :key="child.path"
          :index="`${menu.path}/${child.path}`"
        >
          <span>{{ child.title }}</span>
        </el-menu-item>
      </el-sub-menu>
      <el-menu-item v-else :index="menu.path">
        <el-icon><component :is="menu.icon" /></el-icon>
        <span>{{ menu.title }}</span>
      </el-menu-item>
    </template>
  </el-menu>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useUserStore } from '@/stores/user';

defineProps({
  collapsed: Boolean,
});

const route = useRoute();
const userStore = useUserStore();

const activeMenu = computed(() => route.path);

const menus = [
  {
    title: '首页',
    path: '/dashboard',
    icon: 'Odometer',
  },
  {
    title: '一级文件',
    path: '/document/level/1',
    icon: 'Document',
  },
  {
    title: '二级文件',
    path: '/document/level/2',
    icon: 'DocumentCopy',
  },
  {
    title: '三级文件',
    path: '/document/level/3',
    icon: 'DocumentChecked',
  },
  {
    title: '四级模板',
    path: '/template',
    icon: 'Grid',
  },
  {
    title: '任务管理',
    path: '/task',
    icon: 'Timer',
    children: [
      { path: 'list', title: '我的任务' },
      { path: 'distribute', title: '分发任务' },
    ],
  },
  {
    title: '审批中心',
    path: '/approval',
    icon: 'Stamp',
  },
];

if (userStore.isAdmin) {
  menus.push(
    { title: '用户管理', path: '/user', icon: 'User' },
    { title: '部门管理', path: '/department', icon: 'OfficeBuilding' }
  );
}
</script>
```

**Step 3: Write Header component**

```vue
<!-- client/src/components/Header.vue -->
<template>
  <el-header class="header">
    <div class="header-left">
      <el-icon class="toggle-btn" @click="$emit('toggle')">
        <Fold v-if="!collapsed" />
        <Expand v-else />
      </el-icon>
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item>{{ currentTitle }}</el-breadcrumb-item>
      </el-breadcrumb>
    </div>
    <div class="header-right">
      <el-badge :value="unreadCount" :hidden="unreadCount === 0" class="msg-badge">
        <el-icon :size="20" @click="$router.push('/notification')">
          <Bell />
        </el-icon>
      </el-badge>
      <el-dropdown trigger="click" @command="handleCommand">
        <span class="user-info">
          <el-avatar :size="32" src="">{{ userStore.user?.name?.charAt(0) }}</el-avatar>
          <span class="username">{{ userStore.user?.name }}</span>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="profile">个人资料</el-dropdown-item>
            <el-dropdown-item command="password">修改密码</el-dropdown-item>
            <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </el-header>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { Bell, Fold, Expand } from '@element-plus/icons-vue';

defineProps({
  collapsed: Boolean,
});

defineEmits(['toggle']);

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const currentTitle = computed(() => {
  const titles = {
    Dashboard: '仪表盘',
    DocumentList: '文档列表',
    DocumentUpload: '上传文档',
    TemplateList: '模板列表',
    TemplateCreate: '创建模板',
    TaskList: '我的任务',
    TaskDistribute: '分发任务',
    ApprovalPending: '待审批',
    ApprovalHistory: '审批历史',
    UserList: '用户管理',
    DepartmentList: '部门管理',
  };
  return titles[route.name] || '';
});

const unreadCount = computed(() => 0); // TODO: 从消息store获取

const handleCommand = (command) => {
  switch (command) {
    case 'profile':
      break;
    case 'password':
      break;
    case 'logout':
      userStore.logout();
      break;
  }
};
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 60px;
}
.header-left {
  display: flex;
  align-items: center;
}
.toggle-btn {
  font-size: 20px;
  cursor: pointer;
  margin-right: 15px;
}
.header-right {
  display: flex;
  align-items: center;
}
.msg-badge {
  margin-right: 20px;
  cursor: pointer;
}
.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
}
.username {
  margin-left: 8px;
}
</style>
```

**Step 4: Commit**

```bash
git add client/src/views/Layout.vue client/src/components/Sidebar.vue client/src/components/Header.vue
git commit -m "feat: 添加布局组件（侧边栏+顶栏）"
```

---

## Phase 2: 一级文件 (10个Issue)

### Task 2.1: FileUpload组件

**Files:**
- Create: `client/src/components/FileUpload.vue`

**Step 1: Write FileUpload component**

```vue
<!-- client/src/components/FileUpload.vue -->
<template>
  <el-upload
    ref="uploadRef"
    class="file-upload"
    :action="uploadUrl"
    :headers="headers"
    :multiple="multiple"
    :limit="limit"
    :file-list="fileList"
    :on-exceed="handleExceed"
    :on-success="handleSuccess"
    :on-error="handleError"
    :on-change="handleChange"
    :before-upload="beforeUpload"
    drag
  >
    <el-icon class="el-icon--upload"><upload-filled /></el-icon>
    <div class="el-upload__text">拖拽文件到此处，或<em>点击上传</em></div>
    <template #tip>
      <div class="el-upload__tip">
        支持 PDF、Word、Excel，单文件不超过10MB
      </div>
    </template>
  </el-upload>
</template>

<script setup>
import { ref, computed } from 'vue';
import { UploadFilled } from '@element-plus/icons-vue';
import { ElMessage, genFileId } from 'element-plus';
import { useUserStore } from '@/stores/user';

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => [],
  },
  multiple: {
    type: Boolean,
    default: true,
  },
  limit: {
    type: Number,
    default: 10,
  },
});

const emit = defineEmits(['update:modelValue', 'success', 'error']);

const uploadRef = ref(null);
const fileList = ref([]);
const userStore = useUserStore();

const uploadUrl = '/api/v1/documents/upload';
const headers = computed(() => ({
  Authorization: `Bearer ${userStore.token}`,
}));

const allowedTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const beforeUpload = (file) => {
  if (!allowedTypes.includes(file.type)) {
    ElMessage.error('仅支持 PDF、Word、Excel 格式');
    return false;
  }
  if (file.size > 10 * 1024 * 1024) {
    ElMessage.error('文件大小不能超过 10MB');
    return false;
  }
  return true;
};

const handleExceed = (files) => {
  uploadRef.value.clearFiles();
  const file = files[0];
  file.uid = genFileId();
  uploadRef.value.handleStart(file);
};

const handleChange = (file, files) => {
  fileList.value = files;
  emit('update:modelValue', files.map(f => f.raw));
};

const handleSuccess = (response, file, files) => {
  emit('success', response.data);
};

const handleError = (err) => {
  ElMessage.error('上传失败');
  emit('error', err);
};
</script>

<style scoped>
.file-upload {
  width: 100%;
}
</style>
```

**Step 2: Commit**

```bash
git add client/src/components/FileUpload.vue
git commit -m "feat: 添加FileUpload文件上传组件"
```

---

### Task 2.2: MinIO文件存储服务

**Files:**
- Create: `server/src/common/utils/file.util.ts`
- Modify: `server/src/modules/document/document.service.ts`

**Step 1: Write file utility**

```typescript
// server/src/common/utils/file.util.ts
import { Client } from 'minio';

const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

const BUCKET_PREFIX = process.env.MINIO_BUCKET_PREFIX || 'doc';

export class FileUtil {
  private static buckets = new Map<string, string>();

  static async uploadFile(
    departmentId: string,
    file: Express.Multer.File
  ): Promise<{ path: string; bucket: string }> {
    const bucket = `${BUCKET_PREFIX}-${departmentId}`;

    // Create bucket if not exists
    await this.ensureBucket(bucket);

    const timestamp = Date.now();
    const filename = `${timestamp}-${file.originalname}`;
    const path = `${bucket}/${filename}`;

    await minioClient.putObject(bucket, filename, file.buffer, file.size, {
      'Content-Type': file.mimetype,
    });

    return { path, bucket };
  }

  static async getFileStream(path: string): Promise<{
    stream: NodeJS.ReadableStream;
    meta: { contentType: string; size: number };
  }> {
    const [bucket, ...parts] = path.split('/');
    const filename = parts.join('/');

    const stat = await minioClient.statObject(bucket, filename);
    const stream = await minioClient.getObject(bucket, filename);

    return {
      stream,
      meta: {
        contentType: stat.metaData?.['content-type'] || 'application/octet-stream',
        size: stat.size,
      },
    };
  }

  static async deleteFile(path: string): Promise<void> {
    const [bucket, ...parts] = path.split('/');
    const filename = parts.join('/');
    await minioClient.removeObject(bucket, filename);
  }

  static getSignedUrl(path: string, expires = 3600): string {
    const [bucket, ...parts] = path.split('/');
    const filename = parts.join('/');
    return minioClient.presignedGetObject(bucket, filename, expires);
  }

  private static async ensureBucket(bucket: string): Promise<void> {
    const exists = await minioClient.bucketExists(bucket);
    if (!exists) {
      await minioClient.makeBucket(bucket);
    }
  }
}
```

**Step 2: Commit**

```bash
git add server/src/common/utils/file.util.ts
git commit -m "feat: 添加MinIO文件存储服务"
```

---

### Task 2.3: 文档上传API

**Files:**
- Modify: `server/src/modules/document/document.controller.ts`
- Modify: `server/src/modules/document/document.service.ts`

**Step 1: Write document controller**

```typescript
// server/src/modules/document/document.controller.ts
import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/auth.guard';
import { DocumentService } from './document.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('documents')
@UseGuards(AuthGuard)
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { level: string; title: string },
    @CurrentUser() user: any
  ) {
    return this.documentService.create(
      parseInt(body.level),
      body.title,
      file,
      user.id
    );
  }

  @Get('level/:level')
  async list(
    @Param('level') level: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('keyword') keyword: string,
    @CurrentUser() user: any
  ) {
    return this.documentService.list(
      parseInt(level),
      parseInt(page) || 1,
      parseInt(limit) || 20,
      keyword,
      user
    );
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    return this.documentService.findById(id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.documentService.delete(id, user.id);
  }

  @Get(':id/download')
  async download(@Param('id') id: string, @CurrentUser() user: any) {
    return this.documentService.getDownloadUrl(id, user.id);
  }

  @Get(':id/versions')
  async versions(@Param('id') id: string) {
    return this.documentService.getVersions(id);
  }
}
```

**Step 2: Write document service**

```typescript
// server/src/modules/document/document.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FileUtil } from '../../common/utils/file.util';
import { Snowflake } from '../../common/utils/snowflake';

@Injectable()
export class DocumentService {
  private snowflake = new Snowflake(1, 1);

  constructor(private prisma: PrismaService) {}

  async create(level: number, title: string, file: Express.Multer.File, creatorId: string) {
    try {
      // Upload to MinIO
      const { path } = await FileUtil.uploadFile(creatorId, file);

      // Generate document number
      const number = await this.generateDocumentNumber(level, creatorId);

      // Create document record
      const document = await this.prisma.document.create({
        data: {
          id: this.snowflake.nextId(),
          level,
          number,
          title,
          filePath: path,
          fileName: file.originalname,
          fileSize: BigInt(file.size),
          fileType: file.mimetype,
          version: 1.0,
          status: 'draft',
          creatorId,
        },
      });

      return document;
    } catch (error) {
      throw error;
    }
  }

  async list(
    level: number,
    page: number,
    limit: number,
    keyword: string,
    user: any
  ) {
    const where: any = {
      level,
      deletedAt: null,
    };

    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { number: { contains: keyword } },
      ];
    }

    const [list, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          creator: {
            select: { id: true, name: true, username: true },
          },
        },
      }),
      this.prisma.document.count({ where }),
    ]);

    return { list, total, page, limit };
  }

  async findById(id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id, deletedAt: null },
      include: {
        creator: {
          select: { id: true, name: true, username: true },
        },
        approver: {
          select: { id: true, name: true, username: true },
        },
      },
    });

    if (!document) {
      throw new Error('文档不存在');
    }

    return document;
  }

  async delete(id: string, userId: string) {
    const document = await this.findById(id);

    if (document.status === 'approved') {
      throw new Error('已发布的文件不能删除，只能停用');
    }

    if (document.creatorId !== userId) {
      throw new Error('只能删除自己创建的文件');
    }

    return this.prisma.document.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getDownloadUrl(id: string, userId: string) {
    const document = await this.findById(id);

    if (document.status !== 'approved') {
      if (document.creatorId !== userId) {
        throw new Error('无权下载此文件');
      }
    }

    return FileUtil.getSignedUrl(document.filePath);
  }

  async getVersions(id: string) {
    return this.prisma.documentVersion.findMany({
      where: { documentId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        creator: {
          select: { id: true, name: true },
        },
      },
    });
  }

  private async generateDocumentNumber(level: number, departmentId: string): Promise<string> {
    const dept = await this.prisma.department.findUnique({
      where: { id: departmentId },
    });

    if (!dept) {
      throw new Error('部门不存在');
    }

    let rule = await this.prisma.numberRule.findUnique({
      where: { level_departmentId: { level, departmentId } },
    });

    if (!rule) {
      rule = await this.prisma.numberRule.create({
        data: {
          id: this.snowflake.nextId(),
          level,
          departmentId,
          sequence: 0,
        },
      });
    }

    const newSequence = rule.sequence + 1;
    await this.prisma.numberRule.update({
      where: { id: rule.id },
      data: { sequence: newSequence },
    });

    return `${level}-${dept.code}-${String(newSequence).padStart(3, '0')}`;
  }
}
```

**Step 3: Commit**

```bash
git add server/src/modules/document/document.controller.ts server/src/modules/document/document.service.ts
git commit -m "feat: 添加文档上传API"
```

---

### Task 2.4: 文档列表页面

**Files:**
- Create: `client/src/views/document/List.vue`
- Modify: `client/src/api/document.js`

**Step 1: Write API**

```javascript
// client/src/api/document.js
import request from '@/utils/request';

export function getDocuments(level, params) {
  return request.get(`/documents/level/${level}`, { params });
}

export function getDocument(id) {
  return request.get(`/documents/${id}`);
}

export function uploadDocument(data) {
  return request.post('/documents/upload', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export function deleteDocument(id) {
  return request.delete(`/documents/${id}`);
}

export function downloadDocument(id) {
  return request.get(`/documents/${id}/download`, {
    responseType: 'blob',
  });
}

export function getDocumentVersions(id) {
  return request.get(`/documents/${id}/versions`);
}
```

**Step 2: Write List page**

```vue
<!-- client/src/views/document/List.vue -->
<template>
  <div class="document-list">
    <el-card class="filter-card">
      <el-form :inline="true" :model="filterForm">
        <el-form-item label="文件编号">
          <el-input v-model="filterForm.keyword" placeholder="搜索编号" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <span>{{ levelName }}列表</span>
          <el-button type="primary" @click="handleUpload">上传文件</el-button>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="number" label="文件编号" width="150" />
        <el-table-column prop="title" label="文件标题" min-width="200" />
        <el-table-column prop="version" label="版本" width="80" align="center" />
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="creator.name" label="创建人" width="100" />
        <el-table-column prop="createdAt" label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleView(row)">查看</el-button>
            <el-button
              v-if="row.status === 'draft'"
              link
              type="danger"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
            <el-button
              v-if="row.status === 'approved'"
              link
              type="primary"
              @click="handleDownload(row)"
            >
              下载
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :page-sizes="[10, 20, 50]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { getDocuments, deleteDocument, downloadDocument } from '@/api/document';
import dayjs from 'dayjs';

const route = useRoute();
const router = useRouter();

const level = computed(() => parseInt(route.params.level));
const levelName = computed(() => ['一级文件', '二级文件', '三级文件'][level.value - 1]);

const loading = ref(false);
const tableData = ref([]);
const filterForm = ref({ keyword: '' });
const pagination = ref({ page: 1, limit: 20, total: 0 });

const getStatusType = (status) => {
  const types = {
    draft: 'info',
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
  };
  return types[status] || 'info';
};

const getStatusText = (status) => {
  const texts = {
    draft: '草稿',
    pending: '待审批',
    approved: '已发布',
    rejected: '已驳回',
  };
  return texts[status] || status;
};

const formatDate = (date) => dayjs(date).format('YYYY-MM-DD HH:mm');

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await getDocuments(level.value, {
      page: pagination.value.page,
      limit: pagination.value.limit,
      keyword: filterForm.value.keyword,
    });
    tableData.value = res.list;
    pagination.value.total = res.total;
  } catch (error) {
    ElMessage.error('获取列表失败');
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  pagination.value.page = 1;
  fetchData();
};

const handleReset = () => {
  filterForm.value.keyword = '';
  handleSearch();
};

const handleSizeChange = () => {
  pagination.value.page = 1;
  fetchData();
};

const handleCurrentChange = () => {
  fetchData();
};

const handleUpload = () => {
  router.push(`/document/upload/${level.value}`);
};

const handleView = (row) => {
  router.push(`/document/${row.id}`);
};

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除该文件吗？', '确认', {
      type: 'warning',
    });
    await deleteDocument(row.id);
    ElMessage.success('删除成功');
    fetchData();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
    }
  }
};

const handleDownload = async (row) => {
  try {
    const url = await downloadDocument(row.id);
    window.open(url, '_blank');
  } catch (error) {
    ElMessage.error('下载失败');
  }
};

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.document-list {
  padding: 0;
}
.filter-card {
  margin-bottom: 20px;
}
.table-card {
  margin-bottom: 20px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}
</style>
```

**Step 3: Commit**

```bash
git add client/src/api/document.js client/src/views/document/List.vue
git commit -m "feat: 添加文档列表页面"
```

---

### Task 2.5: 文档详情页面

**Files:**
- Create: `client/src/views/document/Detail.vue`

**Step 1: Write Detail page**

```vue
<!-- client/src/views/document/Detail.vue -->
<template>
  <div class="document-detail">
    <el-page-header @back="router.back()" class="page-header">
      <template #content>
        <span class="title">{{ document?.title }}</span>
      </template>
      <template #extra>
        <el-button @click="router.back()">返回</el-button>
        <el-button
          v-if="document?.status === 'approved'"
          type="primary"
          @click="handleDownload"
        >
          下载
        </el-button>
        <el-button
          v-if="document?.status === 'draft'"
          type="primary"
          @click="handleSubmitApproval"
        >
          提交审批
        </el-button>
      </template>
    </el-page-header>

    <el-card class="info-card">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="文件编号">
          {{ document?.number }}
        </el-descriptions-item>
        <el-descriptions-item label="版本号">
          {{ document?.version }}
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(document?.status)">
            {{ getStatusText(document?.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="文件类型">
          {{ document?.fileType }}
        </el-descriptions-item>
        <el-descriptions-item label="文件大小">
          {{ formatFileSize(document?.fileSize) }}
        </el-descriptions-item>
        <el-descriptions-item label="创建人">
          {{ document?.creator?.name }}
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">
          {{ formatDate(document?.createdAt) }}
        </el-descriptions-item>
        <el-descriptions-item v-if="document?.approver" label="审批人">
          {{ document?.approver?.name }}
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card class="version-card">
      <template #header>
        <span>版本历史</span>
      </template>
      <el-timeline>
        <el-timeline-item
          v-for="version in versions"
          :key="version.id"
          :timestamp="formatDate(version.createdAt)"
          placement="top"
        >
          <p>版本: {{ version.version }}</p>
          <p>操作人: {{ version.creator?.name }}</p>
        </el-timeline-item>
      </el-timeline>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { getDocument, getDocumentVersions, downloadDocument } from '@/api/document';
import dayjs from 'dayjs';

const route = useRoute();
const router = useRouter();

const document = ref(null);
const versions = ref([]);

const getStatusType = (status) => {
  const types = {
    draft: 'info',
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
  };
  return types[status] || 'info';
};

const getStatusText = (status) => {
  const texts = {
    draft: '草稿',
    pending: '待审批',
    approved: '已发布',
    rejected: '已驳回',
  };
  return texts[status] || status;
};

const formatDate = (date) => dayjs(date).format('YYYY-MM-DD HH:mm');

const formatFileSize = (size) => {
  if (!size) return '-';
  const num = typeof size === 'bigint' ? Number(size) : size;
  if (num < 1024) return num + ' B';
  if (num < 1024 * 1024) return (num / 1024).toFixed(2) + ' KB';
  return (num / 1024 / 1024).toFixed(2) + ' MB';
};

const fetchData = async () => {
  try {
    const id = route.params.id;
    const [doc, vers] = await Promise.all([
      getDocument(id),
      getDocumentVersions(id),
    ]);
    document.value = doc;
    versions.value = vers;
  } catch (error) {
    ElMessage.error('获取详情失败');
  }
};

const handleDownload = async () => {
  try {
    const url = await downloadDocument(document.value.id);
    window.open(url, '_blank');
  } catch (error) {
    ElMessage.error('下载失败');
  }
};

const handleSubmitApproval = async () => {
  // TODO: 提交审批逻辑
  ElMessage.info('提交审批功能待实现');
};

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.document-detail {
  padding: 20px;
}
.page-header {
  margin-bottom: 20px;
}
.title {
  font-size: 18px;
  font-weight: bold;
}
.info-card {
  margin-bottom: 20px;
}
.version-card {
  margin-bottom: 20px;
}
</style>
```

**Step 2: Commit**

```bash
git add client/src/views/document/Detail.vue
git commit -m "feat: 添加文档详情页面"
```

---

### Task 2.6: 文档上传页面

**Files:**
- Create: `client/src/views/document/Upload.vue`

**Step 1: Write Upload page**

```vue
<!-- client/src/views/document/Upload.vue -->
<template>
  <div class="document-upload">
    <el-page-header @back="router.back()" class="page-header">
      <template #content>
        <span class="title">上传{{ levelName }}</span>
      </template>
    </el-page-header>

    <el-card class="upload-card">
      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="120px"
      >
        <el-form-item label="文件标题" prop="title">
          <el-input v-model="formData.title" placeholder="请输入文件标题" />
        </el-form-item>

        <el-form-item label="上传文件" prop="file">
          <FileUpload
            v-model="formData.file"
            :limit="1"
            :multiple="false"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleSubmit" :loading="uploading">
            {{ uploading ? '上传中...' : '上传' }}
          </el-button>
          <el-button @click="router.back()">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import FileUpload from '@/components/FileUpload.vue';
import { uploadDocument } from '@/api/document';

const route = useRoute();
const router = useRouter();

const level = computed(() => parseInt(route.params.level));
const levelName = computed(() => ['一级文件', '二级文件', '三级文件'][level.value - 1]);

const formRef = ref(null);
const uploading = ref(false);
const formData = reactive({
  title: '',
  file: [],
});

const rules = {
  title: [
    { required: true, message: '请输入文件标题', trigger: 'blur' },
    { min: 1, max: 200, message: '长度在1-200个字符', trigger: 'blur' },
  ],
  file: [
    {
      validator: (rule, value, callback) => {
        if (!value || value.length === 0) {
          callback(new Error('请上传文件'));
        } else {
          callback();
        }
      },
      trigger: 'change',
    },
  ],
};

const handleSubmit = async () => {
  try {
    await formRef.value.validate();
  } catch {
    return;
  }

  if (formData.file.length === 0) {
    ElMessage.error('请选择文件');
    return;
  }

  uploading.value = true;
  try {
    const file = formData.file[0];
    const data = new FormData();
    data.append('level', String(level.value));
    data.append('title', formData.title);
    data.append('file', file);

    await uploadDocument(data);
    ElMessage.success('上传成功');
    router.push(`/document/level/${level.value}`);
  } catch (error) {
    ElMessage.error('上传失败');
  } finally {
    uploading.value = false;
  }
};
</script>

<style scoped>
.document-upload {
  padding: 20px;
}
.page-header {
  margin-bottom: 20px;
}
.title {
  font-size: 18px;
  font-weight: bold;
}
.upload-card {
  max-width: 800px;
}
</style>
```

**Step 2: Commit**

```bash
git add client/src/views/document/Upload.vue
git commit -m "feat: 添加文档上传页面"
```

---

### Task 2.7-2.10: 审批流程API和页面

由于篇幅限制，这里列出核心实现步骤：

**Task 2.7: 审批提交API**
- Modify: `server/src/modules/approval/approval.controller.ts`
- Modify: `server/src/modules/approval/approval.service.ts`
- 实现: `POST /api/v1/approvals` 提交审批
- 实现: `GET /api/v1/approvals/pending` 待审批列表
- 实现: `PUT /api/v1/approvals/:id` 审批操作（通过/驳回）

**Task 2.8: 审批页面**
- Create: `client/src/views/approval/Pending.vue`
- Create: `client/src/views/approval/History.vue`
- 实现待审批列表和审批操作

**Task 2.9: 消息通知**
- Create: `client/src/views/notification/List.vue`
- Create: `client/src/api/notification.js`
- 实现消息列表和已读功能

**Task 2.10: 任务管理基础**
- Create: `client/src/api/task.js`
- Create: `client/src/api/template.js`
- Create: `client/src/views/task/List.vue`

---

## Phase 3: 二三级文件 (6个Issue)

### Task 3.1: 二级文件管理（复用一级逻辑）

**Files:**
- Modify: `client/src/router/index.js`
- Modify: `server/src/modules/document/document.controller.ts`

**说明**: 二级文件与一级文件使用相同的逻辑，仅改变 level 字段为 2

**Step 1: Update router to support level 2**

```javascript
// router/index.js - 已有 level/:level 支持，无需修改
```

**Step 2: Update controller to support all levels**

Controller 已支持 level 1/2/3，无需修改

**Step 3: Commit**

```bash
git commit -m "feat: 支持二级文件管理（复用一级逻辑）"
```

---

### Task 3.2: 三级文件管理（复用一级逻辑）

**Files:**
- Modify: `server/src/modules/document/document.service.ts`
- Modify: `client/src/views/document/List.vue`

**说明**: 三级文件与一级文件使用相同的逻辑，仅改变 level 字段为 3

**Step 1: Add version management in service**

```typescript
// document.service.ts - add update method
async update(id: string, file: Express.Multer.File, userId: string) {
  const document = await this.findById(id);

  if (document.status !== 'draft') {
    throw new Error('只有草稿状态的文件可以修改');
  }

  // Upload new version to MinIO
  const { path } = await FileUtil.uploadFile(userId, file);

  // Update document with new version
  const newVersion = document.version + 0.1;

  return this.prisma.$transaction(async (tx) => {
    // Save old version
    await tx.documentVersion.create({
      data: {
        id: this.snowflake.nextId(),
        documentId: id,
        version: document.version,
        filePath: document.filePath,
        fileName: document.fileName,
        fileSize: document.fileSize,
        creatorId: userId,
      },
    });

    // Update document
    return tx.document.update({
      where: { id },
      data: {
        filePath: path,
        fileName: file.originalname,
        fileSize: BigInt(file.size),
        fileType: file.mimetype,
        version: newVersion,
      },
    });
  });
}
```

**Step 2: Commit**

```bash
git commit -m "feat: 支持三级文件管理和版本管理"
```

---

## Phase 4: 四级模板 (12个Issue)

### Task 4.1: Excel解析功能

**Files:**
- Create: `server/src/modules/template/excel.parser.ts`
- Modify: `server/src/modules/template/template.service.ts`

**Step 1: Write Excel parser**

```typescript
// server/src/modules/template/excel.parser.ts
import * as XLSX from 'xlsx';

export interface ParsedField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'boolean';
  required: boolean;
  options?: { label: string; value: string }[];
}

export class ExcelParser {
  static parse(file: Buffer): ParsedField[] {
    const workbook = XLSX.read(file, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];

    if (rows.length < 2) {
      throw new Error('Excel格式错误，需要至少两行数据');
    }

    const fields: ParsedField[] = [];
    const header = rows[0];

    for (let i = 0; i < header.length; i++) {
      const label = header[i];
      if (!label) continue;

      // Detect type from sample data
      const sampleValues = rows.slice(1).map(row => row[i]).filter(v => v !== undefined);
      const type = this.detectType(sampleValues);

      fields.push({
        name: `field_${i}`,
        label,
        type,
        required: false,
        options: type === 'select' ? this.extractOptions(sampleValues) : undefined,
      });
    }

    return fields;
  }

  private static detectType(values: any[]): ParsedField['type'] {
    if (values.length === 0) return 'text';

    const firstValue = values[0];

    // Check boolean
    if (['true', 'false', '是', '否', 'Y', 'N'].includes(String(firstValue))) {
      return 'boolean';
    }

    // Check number
    if (typeof firstValue === 'number') return 'number';

    // Check date
    if (typeof firstValue === 'string') {
      const date = Date.parse(firstValue);
      if (!isNaN(date) && firstValue.includes('-')) return 'date';
    }

    // Check select (limited unique values)
    const uniqueValues = new Set(values.map(v => String(v)));
    if (uniqueValues.size <= 10 && uniqueValues.size > 1) {
      return 'select';
    }

    // Check textarea (long content)
    if (values.some(v => String(v).length > 100)) {
      return 'textarea';
    }

    return 'text';
  }

  private static extractOptions(values: any[]): { label: string; value: string }[] {
    const uniqueValues = [...new Set(values.map(v => String(v)))];
    return uniqueValues.map(v => ({ label: v, value: v }));
  }
}
```

**Step 2: Commit**

```bash
git add server/src/modules/template/excel.parser.ts
git commit -m "feat: 添加Excel解析功能"
```

---

### Task 4.2: 模板管理API

**Files:**
- Modify: `server/src/modules/template/template.controller.ts`
- Modify: `server/src/modules/template/template.service.ts`

**Step 1: Write template controller**

```typescript
// server/src/modules/template/template.controller.ts
import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/auth.guard';
import { TemplateService } from './template.service';
import { ExcelParser } from './excel.parser';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('templates')
@UseGuards(AuthGuard)
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Post('parse-excel')
  @UseInterceptors(FileInterceptor('file'))
  async parseExcel(@UploadedFile() file: Express.Multer.File) {
    const fields = ExcelParser.parse(file.buffer);
    return { fields };
  }

  @Get()
  async list(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('keyword') keyword: string,
    @CurrentUser() user: any
  ) {
    return this.templateService.list(
      parseInt(page) || 1,
      parseInt(limit) || 20,
      keyword,
      user.id
    );
  }

  @Post()
  async create(
    @Body() body: { title: string; fieldsJson: string },
    @CurrentUser() user: any
  ) {
    const fieldsJson = typeof body.fieldsJson === 'string'
      ? JSON.parse(body.fieldsJson)
      : body.fieldsJson;
    return this.templateService.create(body.title, fieldsJson, user.id);
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    return this.templateService.findById(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: { title?: string; fieldsJson?: string },
    @CurrentUser() user: any
  ) {
    const fieldsJson = body.fieldsJson
      ? (typeof body.fieldsJson === 'string' ? JSON.parse(body.fieldsJson) : body.fieldsJson)
      : undefined;
    return this.templateService.update(id, body.title, fieldsJson, user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.templateService.delete(id, user.id);
  }

  @Post(':id/copy')
  async copy(@Param('id') id: string, @CurrentUser() user: any) {
    return this.templateService.copy(id, user.id);
  }
}
```

**Step 2: Write template service**

```typescript
// server/src/modules/template/template.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Snowflake } from '../../common/utils/snowflake';

@Injectable()
export class TemplateService {
  private snowflake = new Snowflake(1, 1);

  constructor(private prisma: PrismaService) {}

  async create(title: string, fieldsJson: any[], creatorId: string) {
    const number = await this.generateTemplateNumber();

    return this.prisma.template.create({
      data: {
        id: this.snowflake.nextId(),
        level: 4,
        number,
        title,
        fieldsJson,
        version: 1.0,
        status: 'active',
        creatorId,
      },
    });
  }

  async list(page: number, limit: number, keyword: string, userId: string) {
    const where: any = {
      level: 4,
      deletedAt: null,
      status: 'active',
    };

    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { number: { contains: keyword } },
      ];
    }

    const [list, total] = await Promise.all([
      this.prisma.template.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          creator: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.template.count({ where }),
    ]);

    return { list, total, page, limit };
  }

  async findById(id: string) {
    const template = await this.prisma.template.findUnique({
      where: { id, deletedAt: null },
      include: {
        creator: {
          select: { id: true, name: true },
        },
      },
    });

    if (!template) {
      throw new Error('模板不存在');
    }

    return template;
  }

  async update(id: string, title: string, fieldsJson: any[], userId: string) {
    const template = await this.findById(id);

    if (template.status !== 'active') {
      throw new Error('只能编辑活跃状态的模板');
    }

    return this.prisma.template.update({
      where: { id },
      data: {
        title: title || template.title,
        fieldsJson: fieldsJson || template.fieldsJson,
        version: template.version + 0.1,
      },
    });
  }

  async delete(id: string, userId: string) {
    const template = await this.findById(id);

    if (template.status !== 'active') {
      throw new Error('只能删除活跃状态的模板');
    }

    return this.prisma.template.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async copy(id: string, userId: string) {
    const template = await this.findById(id);
    const newNumber = await this.generateTemplateNumber();

    return this.prisma.template.create({
      data: {
        id: this.snowflake.nextId(),
        level: 4,
        number: newNumber,
        title: `${template.title}-副本`,
        fieldsJson: template.fieldsJson,
        version: 1.0,
        status: 'active',
        creatorId: userId,
      },
    });
  }

  private async generateTemplateNumber(): Promise<string> {
    const count = await this.prisma.template.count({
      where: { level: 4, deletedAt: null },
    });
    return `4-TPL-${String(count + 1).padStart(4, '0')}`;
  }
}
```

**Step 3: Commit**

```bash
git add server/src/modules/template/template.controller.ts server/src/modules/template/template.service.ts
git commit -m "feat: 添加模板管理API"
```

---

### Task 4.3: FormBuilder组件

**Files:**
- Create: `client/src/components/FormBuilder.vue`

**Step 1: Write FormBuilder component**

```vue
<!-- client/src/components/FormBuilder.vue -->
<template>
  <div class="form-builder">
    <div class="field-list">
      <div
        v-for="field in fields"
        :key="field.id"
        class="field-item"
        :class="{ active: activeFieldId === field.id }"
        @click="activeFieldId = field.id"
      >
        <div class="field-header">
          <span class="field-label">{{ field.label }}</span>
          <el-tag size="small">{{ field.type }}</el-tag>
        </div>
        <div class="field-props">
          <el-checkbox v-model="field.required" @click.stop>
            必填
          </el-checkbox>
          <el-input
            v-model="field.defaultValue"
            placeholder="默认值"
            size="small"
            @click.stop
          />
        </div>
        <div class="field-actions">
          <el-icon @click.stop="moveUp(field)"><Top /></el-icon>
          <el-icon @click.stop="moveDown(field)"><Bottom /></el-icon>
          <el-icon @click.stop="removeField(field)"><Delete /></el-icon>
        </div>
      </div>

      <el-button type="primary" plain class="add-field-btn" @click="addField">
        添加字段
      </el-button>
    </div>

    <div class="add-field-dialog">
      <el-dialog
        v-model="showAddDialog"
        title="添加字段"
        width="400px"
      >
        <el-form :model="newField" label-width="80px">
          <el-form-item label="字段类型">
            <el-select v-model="newField.type" style="width: 100%">
              <el-option label="文本" value="text" />
              <el-option label="多行文本" value="textarea" />
              <el-option label="数字" value="number" />
              <el-option label="日期" value="date" />
              <el-option label="下拉选择" value="select" />
              <el-option label="是/否" value="boolean" />
            </el-select>
          </el-form-item>
          <el-form-item label="字段标签">
            <el-input v-model="newField.label" placeholder="显示名称" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="showAddDialog = false">取消</el-button>
          <el-button type="primary" @click="confirmAddField">确定</el-button>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { Top, Bottom, Delete } from '@element-plus/icons-vue';
import { v4 as uuidv4 } from 'uuid';

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['update:modelValue']);

const fields = ref([...props.modelValue]);
const activeFieldId = ref(null);
const showAddDialog = ref(false);
const newField = ref({ type: 'text', label: '' });

const addField = () => {
  newField.value = { type: 'text', label: '' };
  showAddDialog.value = true;
};

const confirmAddField = () => {
  const field = {
    id: uuidv4(),
    name: `field_${Date.now()}`,
    label: newField.value.label || '新字段',
    type: newField.value.type,
    required: false,
    defaultValue: '',
    sort: fields.value.length,
  };
  fields.value.push(field);
  showAddDialog.value = false;
  updateModelValue();
};

const removeField = (field) => {
  const index = fields.value.findIndex(f => f.id === field.id);
  if (index > -1) {
    fields.value.splice(index, 1);
    updateModelValue();
  }
};

const moveUp = (field) => {
  const index = fields.value.findIndex(f => f.id === field.id);
  if (index > 0) {
    [fields.value[index - 1], fields.value[index]] = [fields.value[index], fields.value[index - 1]];
    updateModelValue();
  }
};

const moveDown = (field) => {
  const index = fields.value.findIndex(f => f.id === field.id);
  if (index < fields.value.length - 1) {
    [fields.value[index], fields.value[index + 1]] = [fields.value[index + 1], fields.value[index]];
    updateModelValue();
  }
};

const updateModelValue = () => {
  emit('update:modelValue', fields.value);
};

watch(() => props.modelValue, (val) => {
  fields.value = [...val];
}, { deep: true });
</script>

<style scoped>
.form-builder {
  display: flex;
  gap: 20px;
}
.field-list {
  flex: 1;
  max-width: 500px;
}
.field-item {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.3s;
}
.field-item:hover {
  border-color: #409eff;
}
.field-item.active {
  border-color: #409eff;
  background: #ecf5ff;
}
.field-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.field-label {
  font-weight: 500;
}
.field-props {
  display: flex;
  gap: 10px;
  margin-bottom: 8px;
}
.field-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}
.field-actions .el-icon {
  cursor: pointer;
  font-size: 16px;
}
.add-field-btn {
  width: 100%;
}
</style>
```

**Step 2: Commit**

```bash
git add client/src/components/FormBuilder.vue
git commit -m "feat: 添加FormBuilder表单构建器组件"
```

---

### Task 4.4-4.12: 模板相关页面和功能

**Task 4.4: 模板列表页面**
- Create: `client/src/views/template/List.vue`
- 实现模板列表、筛选、搜索

**Task 4.5: 创建模板页面**
- Create: `client/src/views/template/Create.vue`
- 实现手动创建和Excel导入两种方式

**Task 4.6: FormRenderer组件**
- Create: `client/src/components/FormRenderer.vue`
- 根据JSON配置动态渲染表单

**Task 4.7: 模板复制功能**
- Modify: `client/src/views/template/List.vue`
- 添加复制按钮和API调用

**Task 4.8: 模板停用功能**
- Modify: `client/src/views/template/List.vue`
- 添加停用按钮和确认框

---

## Phase 5: 任务分发 (10个Issue)

### Task 5.1: 任务分发API

**Files:**
- Modify: `server/src/modules/task/task.controller.ts`
- Modify: `server/src/modules/task/task.service.ts`

**Step 1: Write task service**

```typescript
// server/src/modules/task/task.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Snowflake } from '../../common/utils/snowflake';

@Injectable()
export class TaskService {
  private snowflake = new Snowflake(1, 1);

  constructor(private prisma: PrismaService) {}

  async create(templateId: string, departmentId: string, deadline: Date, creatorId: string) {
    const template = await this.prisma.template.findUnique({
      where: { id: templateId, deletedAt: null },
    });

    if (!template || template.status !== 'active') {
      throw new Error('模板不存在或已停用');
    }

    return this.prisma.task.create({
      data: {
        id: this.snowflake.nextId(),
        templateId,
        departmentId,
        deadline,
        status: 'pending',
        creatorId,
      },
    });
  }

  async list(userId: string, departmentId: string, role: string) {
    const where: any = { deletedAt: null };

    if (role === 'leader') {
      // 部门负责人查看本部门所有任务
      where.departmentId = departmentId;
    } else {
      // 普通用户查看分配给本部门的任务
      where.departmentId = departmentId;
    }

    return this.prisma.task.findMany({
      where,
      orderBy: { deadline: 'asc' },
      include: {
        template: true,
        department: true,
        creator: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async submit(taskId: string, dataJson: any, userId: string) {
    const task = await this.findById(taskId);

    if (task.status !== 'pending') {
      throw new Error('任务已提交或已取消');
    }

    // Check if already submitted
    const existingRecord = await this.prisma.taskRecord.findFirst({
      where: { taskId, status: { in: ['submitted', 'approved', 'rejected'] } },
    });

    if (existingRecord) {
      throw new Error('该任务已有人提交');
    }

    return this.prisma.taskRecord.create({
      data: {
        id: this.snowflake.nextId(),
        taskId,
        templateId: task.templateId,
        dataJson,
        status: 'submitted',
        submitterId: userId,
        submittedAt: new Date(),
      },
    });
  }

  async findById(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id, deletedAt: null },
      include: {
        template: true,
        department: true,
        records: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!task) {
      throw new Error('任务不存在');
    }

    return task;
  }

  async cancel(id: string, userId: string) {
    const task = await this.findById(id);

    if (task.creatorId !== userId) {
      throw new Error('只能取消自己创建的任务');
    }

    if (task.status !== 'pending') {
      throw new Error('只能取消待执行状态的任务');
    }

    return this.prisma.task.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
```

**Step 2: Commit**

```bash
git add server/src/modules/task/task.controller.ts server/src/modules/task/task.service.ts
git commit -m "feat: 添加任务分发API"
```

---

### Task 5.2-5.10: 任务相关页面

**Task 5.2: 任务列表页面**
- Create: `client/src/views/task/List.vue`
- 实现Tabs切换（全部/待完成/已完成）

**Task 5.3: 分发任务页面**
- Create: `client/src/views/task/Distribute.vue`
- 实现选择模板、选择部门、选择截止日期

**Task 5.4: 任务填写页面**
- Create: `client/src/views/task/Fill.vue`
- 使用FormRenderer组件渲染表单

**Task 5.5: 任务取消功能**
- Modify: `client/src/views/task/List.vue`
- 添加取消按钮和确认框

**Task 5.6: 逾期红色标记**
- Modify: `client/src/views/task/List.vue`
- 根据截止日期判断是否逾期

**Task 5.7: 任务审批功能**
- Modify: `server/src/modules/approval/approval.service.ts`
- 添加任务记录的审批逻辑

---

## Phase 6: 消息与优化 (6个Issue)

### Task 6.1: 站内消息API

**Files:**
- Modify: `server/src/modules/notification/notification.service.ts`
- Create: `server/src/modules/notification/notification.controller.ts`

**Step 1: Write notification service**

```typescript
// server/src/modules/notification/notification.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, type: string, title: string, content?: string) {
    return this.prisma.notification.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        type,
        title,
        content,
      },
    });
  }

  async list(userId: string, page: number, limit: number) {
    const [list, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    return { list, total, page, limit };
  }

  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.update({
      where: { id, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async cleanupExpired() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return this.prisma.notification.deleteMany({
      where: {
        createdAt: { lt: thirtyDaysAgo },
      },
    });
  }
}
```

**Step 2: Commit**

```bash
git add server/src/modules/notification/notification.controller.ts server/src/modules/notification/notification.service.ts
git commit -m "feat: 添加站内消息API"
```

---

### Task 6.2-6.6: 消息和优化

**Task 6.2: 消息列表页面**
- Create: `client/src/views/notification/List.vue`
- 实现消息列表和已读状态

**Task 6.3: 操作日志**
- Modify: `server/src/common/interceptors/logging.interceptor.ts`
- 记录关键操作日志

**Task 6.4: 回收站功能**
- Modify: `server/src/modules/*/*.service.ts`
- 实现软删除恢复功能

**Task 6.5: 响应式适配**
- Modify: `client/src/views/Layout.vue`
- 添加响应式CSS

**Task 6.6: 细节优化**
- 全局加载状态
- 空状态提示
- 错误提示优化

---

## 总结

**总Issue数**: 52个

| Phase | Issue数 | 主要内容 |
|-------|---------|----------|
| Phase 1 | 8 | 基础配置、登录、布局、公共组件 |
| Phase 2 | 10 | 一级文件上传、列表、详情、审批 |
| Phase 3 | 6 | 二三级文件、版本管理 |
| Phase 4 | 12 | 模板管理、Excel解析、表单构建 |
| Phase 5 | 10 | 任务分发、填写、审批 |
| Phase 6 | 6 | 站内消息、操作日志、优化 |

**预计执行时间**: 每个Task约2-5分钟，总计约260-520分钟（4-8小时）

**Plan保存位置**: `docs/plans/2026-02-01-mvp-complete-plan.md`
