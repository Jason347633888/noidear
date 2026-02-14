# 项目结构导航

> 文档版本: 5.0
> 最后更新: 2026-02-14
> 用途: AI Agent 快速定位文件 + 项目结构参考
> 项目状态: MVP Phase 1-6 完成 98.1%（51/52 Issue）| Phase 7-12 部分完成 | 技术债务: 3 个 P1 问题已有完整技术方案

---

## 目录

1. [项目概览](#一项目概览)
2. [.claude AI约束配置](#二claude-ai约束配置)
3. [目录结构](#三目录结构)
4. [模块映射表](#四模块映射表)
5. [文件定位索引](#五文件定位索引)
6. [核心流程文件](#六核心流程文件)
7. [配置相关](#七配置相关)
8. [文档相关](#八文档相关)
9. [AI Agent 参考](#九ai-agent-参考)

---

## 一、项目概览

### 1.1 项目信息

| 项目 | 值 |
|------|------|
| 项目名称 | 文档管理系统 (Document Management System) |
| 技术栈前端 | Vue 3.4+ + Element Plus 2.5+ + Vite 5.0+ + Pinia 2.1+ + echarts 6.0+ + sortablejs 1.15+ |
| 技术栈后端 | Node.js 18 + NestJS 10+ + TypeScript 5.3+ + Prisma 5.7+ |
| 数据库 | PostgreSQL 15+ + Redis 7+ |
| 文件存储 | MinIO 8.0+ |
| 工具库 | exceljs 4.4+ + @nestjs/swagger 7.1+ + helmet 8.1+ + bcrypt 5.1+ |
| 部署 | Docker + Docker Compose |

### 1.2 项目路径

```
/Users/jiashenglin/Desktop/好玩的项目/noidear/
```

### 1.3 服务端口

| 服务 | 端口 | 说明 |
|------|------|------|
| PostgreSQL | 5432 | 主数据库 |
| Redis | 6379 | 缓存 |
| MinIO | 9000 | 对象存储API |
| MinIO Console | 9001 | 管理界面 |
| NestJS | 3000 | 后端API |
| Vue Dev | 5173 | 前端开发 |

---

## 二、.claude AI约束配置

### 2.1 目录结构

```
.claude/
├── RULES_INDEX.mdc              # 规则索引（入口）
├── settings.local.json          # Claude Code设置（含Hook）
├── rules/                       # 规则文件目录
│   ├── constraints.mdc          # AI约束清单（26章，最高优先级）
│   ├── tech-stack.mdc           # 技术选型规范
│   ├── ui-standards.mdc         # UI设计标准
│   ├── api-spec.mdc             # API设计规范
│   ├── database.mdc             # 数据库规范
│   └── git-flow.mdc             # Git提交规范
└── CLAUDE.md                    # AI项目指南
```

### 2.2 规则文件阅读顺序

```
1. RULES_INDEX.mdc    ← 规则索引，了解整体约束体系
2. rules/constraints.mdc  ← 核心约束，什么不能做
3. CLAUDE.md           ← 项目启动提醒
4. rules/tech-stack.mdc    ← 技术选型
5. rules/ui-standards.mdc  ← UI规范
6. rules/api-spec.mdc      ← API规范
7. rules/database.mdc      ← 数据库规范
8. rules/git-flow.mdc      ← Git规范
```

### 2.3 约束体系（26章）

| 章节 | 主题 | 优先级 |
|------|------|--------|
| 1-6 | 技术选型、代码风格、功能边界、UI、数据库、API | 基础 |
| 7 | 安全约束 | 高 |
| 8 | 运维约束 | 中 |
| 9 | 文档与变更约束 | 中 |
| 10 | 测试约束 | 中 |
| 11 | 性能与可扩展性 | 中 |
| 12 | 可访问性 | 中 |
| 13 | 代码质量 | 高 |
| 14 | 数据管理 | 中 |
| 15-22 | 通用函数、异常、文件、国际化等 | 基础 |
| **23** | **代码简洁性（Good Taste）** | **强制** |
| **24** | **向后兼容（Never break userspace）** | **强制** |
| **25** | **实用主义** | **强制** |
| **26** | **沟通风格** | **强制** |

### 2.4 核心约束速查

**禁止的行为**：
```
❌ 引入未在文档中列出的库
❌ 更换框架（Vue 3 → React, NestJS → Express）
❌ 修改项目目录结构
❌ 添加MVP范围外的功能（Phase 7-14）
❌ 硬编码密码/密钥
❌ 直接修改数据库（必须用Prisma迁移）
❌ 强制推送Git（force push）
```

**必须遵循**：
```
✅ 使用 Element Plus 组件库
✅ 使用文档中的API端点
✅ 按 Prisma Schema 创建数据表
✅ 环境变量存储敏感信息
✅ 中文 commit message
✅ 所有API必须有异常处理（try-catch）
✅ 函数<50行，缩进<3层
✅ 向后兼容性神圣不可侵犯
```

---

## 三、目录结构

```
noidear/
├── docs/                          # 文档目录
│   ├── DESIGN.md                  # 需求设计文档（主文档）
│   ├── TEST-CASES.md              # 测试用例清单
│   ├── PROJECT_STRUCTURE.md       # 项目结构导航（本文件）
│   └── API.md                     # API文档（生成）
├── packages/                      # 共享包
│   └── types/                     # TypeScript 类型定义
│       ├── index.ts               # 导出所有类型
│       ├── user.ts                # 用户相关类型
│       ├── document.ts            # 文档相关类型
│       ├── template.ts            # 模板相关类型
│       ├── task.ts                # 任务相关类型
│       └── api.ts                 # API 响应类型
├── client/                        # 前端项目
│   ├── src/
│   │   ├── api/                   # API请求封装
│   │   │   ├── index.js           # axios实例和公共配置
│   │   │   ├── auth.js            # 认证相关接口
│   │   │   ├── user.js            # 用户相关接口
│   │   │   ├── department.js      # 部门相关接口
│   │   │   ├── document.js        # 文档相关接口
│   │   │   ├── template.js        # 模板相关接口
│   │   │   ├── task.js            # 任务相关接口
│   │   │   └── notification.js    # 消息相关接口
│   │   ├── stores/                # Pinia状态管理
│   │   │   ├── index.js           # store实例
│   │   │   ├── user.js            # 用户状态
│   │   │   └── notification.js    # 消息状态
│   │   ├── views/                 # 页面组件
│   │   │   ├── Login.vue          # 登录页
│   │   │   ├── Layout.vue         # 布局组件
│   │   │   ├── Dashboard.vue      # 首页
│   │   │   ├── document/          # 文档管理页面
│   │   │   │   ├── Level1.vue     # 一级文件
│   │   │   │   ├── Level2.vue     # 二级文件
│   │   │   │   ├── Level3.vue     # 三级文件
│   │   │   │   ├── Upload.vue     # 上传文件
│   │   │   │   └── Detail.vue     # 文件详情
│   │   │   ├── template/          # 模板管理页面
│   │   │   │   ├── List.vue       # 模板列表
│   │   │   │   └── Create.vue     # 创建模板
│   │   │   ├── task/              # 任务管理页面
│   │   │   │   ├── List.vue       # 任务列表
│   │   │   │   ├── Distribute.vue # 分发任务
│   │   │   │   └── Fill.vue       # 填写任务
│   │   │   ├── approval/          # 审批页面
│   │   │   │   ├── Pending.vue    # 待审批
│   │   │   │   └── History.vue    # 审批历史
│   │   │   ├── user/              # 用户管理页面（Admin）
│   │   │   │   └── List.vue       # 用户列表
│   │   │   ├── department/        # 部门管理页面（Admin）
│   │   │   │   └── List.vue       # 部门列表
│   │   │   └── notification/      # 消息页面
│   │   │       └── List.vue       # 消息列表
│   │   ├── components/            # 公共组件
│   │   │   ├── FileUpload.vue     # 文件上传组件
│   │   │   ├── FormBuilder.vue    # 表单构建器
│   │   │   ├── FormRenderer.vue   # 表单渲染器
│   │   │   ├── TablePagination.vue# 分页组件
│   │   │   └── StatusTag.vue      # 状态标签
│   │   ├── router/                # 路由配置
│   │   │   └── index.js           # 路由定义
│   │   ├── utils/                 # 工具函数
│   │   │   ├── request.js         # 请求封装
│   │   │   ├── format.js          # 格式化函数
│   │   │   └── validate.js        # 验证函数
│   │   ├── styles/                # 样式文件
│   │   │   └── index.css          # 全局样式
│   │   ├── App.vue                # 根组件
│   │   └── main.js                # 入口文件
│   ├── public/
│   │   └── index.html             # HTML模板
│   ├── package.json
│   ├── vite.config.js
│   └── README.md
├── server/                        # 后端项目
│   ├── src/
│   │   ├── main.ts                # 入口文件
│   │   ├── app.module.ts          # 根模块
│   │   ├── modules/               # 功能模块
│   │   │   ├── auth/              # 认证模块
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.guard.ts
│   │   │   │   ├── dto/
│   │   │   │   │   ├── login.dto.ts
│   │   │   │   │   └── password.dto.ts
│   │   │   │   └── strategies/
│   │   │   │       └── jwt.strategy.ts
│   │   │   ├── user/              # 用户模块
│   │   │   │   ├── user.module.ts
│   │   │   │   ├── user.controller.ts
│   │   │   │   ├── user.service.ts
│   │   │   │   ├── user.entity.ts
│   │   │   │   └── dto/
│   │   │   │       ├── create-user.dto.ts
│   │   │   │       └── update-user.dto.ts
│   │   │   ├── department/        # 部门模块
│   │   │   │   ├── department.module.ts
│   │   │   │   ├── department.controller.ts
│   │   │   │   ├── department.service.ts
│   │   │   │   ├── department.entity.ts
│   │   │   │   └── dto/
│   │   │   ├── document/          # 文档模块
│   │   │   │   ├── document.module.ts
│   │   │   │   ├── document.controller.ts
│   │   │   │   ├── document.service.ts
│   │   │   │   ├── document.entity.ts
│   │   │   │   ├── document.version.service.ts
│   │   │   │   └── dto/
│   │   │   ├── template/          # 模板模块
│   │   │   │   ├── template.module.ts
│   │   │   │   ├── template.controller.ts
│   │   │   │   ├── template.service.ts
│   │   │   │   ├── template.entity.ts
│   │   │   │   ├── excel.parser.ts
│   │   │   │   └── dto/
│   │   │   ├── task/              # 任务模块
│   │   │   │   ├── task.module.ts
│   │   │   │   ├── task.controller.ts
│   │   │   │   ├── task.service.ts
│   │   │   │   ├── task.entity.ts
│   │   │   │   └── dto/
│   │   │   └── approval/          # 审批模块
│   │   │       ├── approval.module.ts
│   │   │       ├── approval.controller.ts
│   │   │       ├── approval.service.ts
│   │   │       ├── approval.entity.ts
│   │   │       └── dto/
│   │   ├── common/                # 公共模块
│   │   │   ├── decorators/        # 自定义装饰器
│   │   │   │   ├── current-user.decorator.ts
│   │   │   │   └── roles.decorator.ts
│   │   │   ├── filters/           # 异常过滤器
│   │   │   │   └── all-exception.filter.ts
│   │   │   ├── interceptors/      # 拦截器
│   │   │   │   └── logging.interceptor.ts
│   │   │   ├── pipes/             # 管道
│   │   │   │   └── validation.pipe.ts
│   │   │   ├── utils/             # 工具函数
│   │   │   │   ├── snowflake.ts   # 雪花ID生成器
│   │   │   │   └── file.util.ts   # 文件处理工具
│   │   │   └── constants/         # 常量
│   │   │       └── status.ts      # 状态常量
│   │   └── prisma/                # 数据库模型
│   │       ├── schema.prisma      # 数据库schema
│   │       └── migrations/        # 迁移文件
│   ├── test/                      # 测试文件
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
├── data/                          # 数据持久化目录
│   ├── postgres/                  # PostgreSQL数据
│   └── minio/                     # MinIO数据
├── docker-compose.yml             # 开发环境Docker配置
├── docker-compose.prod.yml        # 生产环境Docker配置
├── .env                           # 环境变量
└── README.md                      # 项目说明
```

---

## 四、模块映射表

### 4.1 功能模块与文件对应关系

| 功能模块 | 前端页面 | 前端API | 后端模块 | 后端实体 |
|----------|----------|---------|----------|----------|
| 用户登录 | Login.vue | auth.js | auth/ | - |
| 用户管理 | user/List.vue | user.js | user/ | User |
| 部门管理 | department/List.vue | department.js | department/ | Department |
| 一级文件 | document/Level1.vue | document.js | document/ | Document |
| 二级文件 | document/Level2.vue | document.js | document/ | Document |
| 三级文件 | document/Level3.vue | document.js | document/ | Document |
| 模板管理 | template/* | template.js | template/ | Template |
| 任务分发 | task/* | task.js | task/ | Task, TaskRecord |
| 审批中心 | approval/* | document.js | approval/ | Approval |
| 站内消息 | notification/List.vue | notification.js | - | Notification |
| 工作流引擎（v1.1.0） | workflows/* | workflow.js | workflow/ | Workflow, WorkflowStep, WorkflowInstance, WorkflowStepRecord |

### 4.2 组件与功能对应

| 组件 | 功能 | 关联模块 |
|------|------|----------|
| FileUpload.vue | 文件上传 | document |
| FormBuilder.vue | 表单构建 | template |
| FormRenderer.vue | 表单渲染 | template, task |
| TablePagination.vue | 分页组件 | 通用 |
| StatusTag.vue | 状态标签 | 通用 |

---

## 五、文件定位索引

### 5.1 按功能搜索

| 关键词 | 文件路径 |
|--------|----------|
| 登录 | client/src/views/Login.vue |
| 用户列表 | client/src/views/user/List.vue |
| 用户API | client/src/api/user.js |
| 用户服务 | server/src/modules/user/user.service.ts |
| 部门列表 | client/src/views/department/List.vue |
| 部门API | client/src/api/department.js |
| 部门服务 | server/src/modules/department/department.service.ts |
| 文件上传 | client/src/components/FileUpload.vue |
| 文档API | client/src/api/document.js |
| 文档服务 | server/src/modules/document/document.service.ts |
| 模板列表 | client/src/views/template/List.vue |
| 模板API | client/src/api/template.js |
| 模板服务 | server/src/modules/template/template.service.ts |
| 任务列表 | client/src/views/task/List.vue |
| 任务分发 | client/src/views/task/Distribute.vue |
| 任务API | client/src/api/task.js |
| 任务服务 | server/src/modules/task/task.service.ts |
| 审批 | client/src/views/approval/* |
| 消息 | client/src/views/notification/List.vue |
| 工作流列表 | client/src/views/workflows/WorkflowList.vue |
| 工作流详情 | client/src/views/workflows/WorkflowDetail.vue |
| 工作流设计器 | client/src/views/workflows/WorkflowDesigner.vue |
| 工作流API | client/src/api/workflow.js |
| 工作流服务 | server/src/modules/workflow/workflow.service.ts |
| 工作流配置 | server/src/config/workflows.json |

### 5.2 按类型搜索

| 文件类型 | 目录 |
|----------|------|
| 共享类型 | packages/types/ |
| Vue页面 | client/src/views/ |
| Vue组件 | client/src/components/ |
| API封装 | client/src/api/ |
| 状态管理 | client/src/stores/ |
| 路由配置 | client/src/router/ |
| NestJS控制器 | server/src/modules/*/ |
| NestJS服务 | server/src/modules/*/ |
| DTO定义 | server/src/modules/*/dto/ |
| 数据库模型 | server/src/prisma/ |
| Docker配置 | docker-compose.yml |

### 5.3 关键文件速查

| 功能 | 文件路径 |
|------|----------|
| 路由守卫/权限控制 | server/src/modules/auth/auth.guard.ts |
| JWT策略 | server/src/modules/auth/strategies/jwt.strategy.ts |
| 雪花ID生成 | server/src/common/utils/snowflake.ts |
| 文件存储 | server/src/common/utils/file.util.ts |
| 状态常量 | server/src/common/constants/status.ts |
| 异常处理 | server/src/common/filters/all-exception.filter.ts |
| 请求日志 | server/src/common/interceptors/logging.interceptor.ts |
| axios封装 | client/src/utils/request.js |
| 全局样式 | client/src/styles/index.css |
| 数据库Schema | server/src/prisma/schema.prisma |

---

## 六、核心流程文件

### 6.1 用户认证流程

```
登录页面: client/src/views/Login.vue
    ↓
API调用: client/src/api/auth.js (login)
    ↓
后端认证: server/src/modules/auth/auth.controller.ts
    ↓
JWT策略: server/src/modules/auth/strategies/jwt.strategy.ts
    ↓
Token生成: server/src/modules/auth/auth.service.ts
```

### 6.2 文件上传流程

```
上传组件: client/src/components/FileUpload.vue
    ↓
API调用: client/src/api/document.js (upload)
    ↓
MinIO存储: server/src/common/utils/file.util.ts
    ↓
数据库记录: server/src/modules/document/document.service.ts (create)
```

### 6.3 审批流程

```
提交审批: client/src/views/document/Detail.vue
    ↓
API调用: client/src/api/document.js (submitApproval)
    ↓
待审批列表: client/src/views/approval/Pending.vue
    ↓
审批操作: server/src/modules/approval/approval.service.ts
    ↓
状态更新: server/src/modules/document/document.service.ts (approve/reject)
```

### 6.4 任务分发流程

```
分发任务: client/src/views/task/Distribute.vue
    ↓
API调用: client/src/api/task.js (create)
    ↓
任务创建: server/src/modules/task/task.service.ts (create)
    ↓
消息通知: server/src/modules/notification/notification.service.ts
```

### 6.5 任务填写流程

```
任务列表: client/src/views/task/List.vue
    ↓
填写表单: client/src/components/FormRenderer.vue
    ↓
API调用: client/src/api/task.js (submit)
    ↓
记录锁定: server/src/modules/task/task.service.ts (submit)
    ↓
审批: server/src/modules/approval/approval.service.ts
```

---

## 七、配置相关

### 7.1 环境配置

| 文件 | 用途 |
|------|------|
| .env | 环境变量（数据库密码、Token密钥等） |
| docker-compose.yml | 开发环境服务配置 |
| docker-compose.prod.yml | 生产环境服务配置 |
| client/vite.config.js | Vite构建配置 |
| server/tsconfig.json | TypeScript配置 |

### 7.2 服务端口

| 服务 | 端口 | 配置文件 |
|------|------|----------|
| PostgreSQL | 5432 | docker-compose.yml |
| Redis | 6379 | docker-compose.yml |
| MinIO | 9000 | docker-compose.yml |
| MinIO Console | 9001 | docker-compose.yml |
| NestJS | 3000 | .env |
| Vue Dev | 5173 | vite.config.js |

---

## 八、文档相关

### 8.1 设计文档

| 文档 | 路径 | 说明 |
|------|------|------|
| 需求设计 | docs/DESIGN.md | 完整的需求和设计文档 |
| 测试用例 | docs/TEST-CASES.md | 测试用例清单 |
| 项目结构 | docs/PROJECT_STRUCTURE.md | 本文件 |

### 8.2 后续文档

| 文档 | 路径 | 说明 |
|------|------|------|
| API文档 | docs/API.md | Swagger生成的API文档 |
| 手动测试指南 | docs/TEST-MANUAL.md | 手动测试操作步骤 |
| 部署指南 | docs/DEPLOY.md | 生产环境部署说明 |

---

## 九、AI Agent 快速参考

### 9.1 添加新功能步骤

1. **设计阶段**: 在 `docs/DESIGN.md` 中添加需求
2. **后端开发**:
   - 在 `server/src/modules/` 下创建模块目录
   - 创建 controller, service, entity, dto
   - 在 `server/src/prisma/schema.prisma` 中添加模型
3. **前端开发**:
   - 在 `client/src/views/` 下创建页面
   - 在 `client/src/api/` 下添加API
   - 在 `client/src/router/` 中添加路由
4. **测试**:
   - 在 `docs/TEST-CASES.md` 中添加测试用例

### 9.2 常见任务定位

| 任务 | 搜索关键词 | 目标文件 |
|------|------------|----------|
| 修改登录逻辑 | auth | auth.service.ts, auth.controller.ts |
| 修改用户权限 | user, role | user.service.ts, roles.decorator.ts |
| 添加新API | controller | 对应模块的 controller.ts |
| 修改数据库模型 | prisma, schema | schema.prisma |
| 修改前端样式 | css, style | styles/index.css |
| 添加路由 | router | router/index.js |
| 修改环境配置 | env, docker | .env, docker-compose.yml |

### 9.3 代码规范参考

| 规范 | 说明 | 文件 |
|------|------|------|
| 后端命名 | controller.ts, service.ts, entity.ts | 模块目录 |
| 前端命名 | PascalCase for components, camelCase for utils | - |
| API路径 | /api/v1/{module}/{action} | controller.ts |
| 数据库字段 | snake_case | schema.prisma |
| 代码变量 | camelCase | TypeScript, JavaScript |

---

## 十、前端开发计划

### 10.1 开发顺序（按依赖关系）

| 顺序 | 模块 | 依赖 | 说明 |
|------|------|------|------|
| 1 | 基础框架 | 无 | 路由、状态管理、API封装 |
| 2 | 登录模块 | 基础框架 | 登录、登出、Token管理 |
| 3 | 布局组件 | 登录模块 | 侧边栏、顶栏、权限菜单 |
| 4 | 用户管理 | 布局组件 | 列表、增删改查 |
| 5 | 部门管理 | 用户管理 | 列表、增删改查 |
| 6 | 一级文件 | 部门管理 | 上传、列表、审批 |
| 7 | 二级文件 | 一级文件 | 复用一级逻辑 |
| 8 | 三级文件 | 一级文件 | 复用+表单功能 |
| 9 | 四级模板 | 三级文件 | Excel解析、表单构建 |
| 10 | 任务管理 | 四级模板 | 分发、填写、列表 |
| 11 | 站内消息 | 任务管理 | 通知列表、已读状态 |

### 10.2 页面UI设计概览

```
登录页 (Login.vue)
├── 居中卡片布局
├── 用户名/密码输入
├── 登录按钮
└── 记住密码(可选)

主布局 (Layout.vue)
├── 左侧边栏(二级菜单)
│   ├── 一级文件管理
│   ├── 二级文件管理
│   ├── 三级文件管理
│   ├── 四级模板
│   ├── 任务管理
│   ├── 审批中心
│   ├── 用户管理(Admin)
│   └── 部门管理(Admin)
├── 顶部栏
│   ├── 面包屑
│   ├── 消息图标(红点)
│   └── 用户下拉菜单
└── 主内容区

列表页通用结构
├── 搜索栏(名称/编号)
├── 操作按钮(新增/导入/导出)
├── 表格(编号/名称/状态/创建人/时间/操作)
├── 分页器
└── 详情/编辑弹窗

表单页通用结构
├── 标题
├── 表单(响应式布局)
├── 按钮组(取消/提交)
└── 帮助提示
```

### 10.3 公共组件

| 组件名 | 用途 | 依赖 |
|--------|------|------|
| `FileUpload.vue` | 文件上传(拖拽/进度条) | Element Plus Upload |
| `FormBuilder.vue` | 表单构建器(拖拽字段) | SortableJS |
| `FormRenderer.vue` | 表单渲染器(根据JSON生成) | Element Plus Form |
| `TablePagination.vue` | 列表+分页封装 | Element Plus Table |
| `StatusTag.vue` | 状态标签(待审批/已通过等) | Element Plus Tag |
| `ConfirmDialog.vue` | 确认弹窗 | Element Plus Dialog |
| `PageHeader.vue` | 页面标题+操作栏 | - |

### 10.4 API封装

```
client/src/api/
├── index.js         # axios实例: Token拦截、401跳转、错误处理
├── auth.js          # login, logout, me, password
├── user.js          # CRUD用户
├── department.js    # CRUD部门
├── document.js      # CRUD文档, upload, download, versions
├── template.js      # CRUD模板, parse-excel, copy
├── task.js          # CRUD任务, submit
└── notification.js  # list, read, read-all
```

### 10.5 状态管理(Pinia)

```
client/src/stores/
├── user.js              # 用户信息, Token, 权限
└── notification.js      # 未读消息数
```

### 10.6 路由规划

```javascript
// 公开路由
/login

// 需要登录的路由
/
├── dashboard
├── document/level/1     # 一级文件
├── document/level/2     # 二级文件
├── document/level/3     # 三级文件
├── template
├── task
│   ├── list            # 我的任务
│   └── distribute      # 分发任务(Leader)
├── approval
│   ├── pending         # 待审批
│   └── history         # 审批历史
├── user                # (Admin)
└── department          # (Admin)

// 路由守卫
- 检查Token，无Token跳转登录
- 检查权限，无权限跳转403
```

### 10.7 UI标准（开箱即用）

| 项目 | 标准 |
|------|------|
| 组件库 | Element Plus 官方组件为主 |
| 图标 | Element Plus Icons |
| 布局 | 响应式布局，适配 1920x1080 为主 |
| 配色 | 简洁专业，主色 #409EFF |
| 加载状态 | 每个操作要有 loading 提示 |
| 空状态 | 列表为空时显示友好提示 |
| 确认操作 | 删除等危险操作要有确认弹窗 |
| 表单验证 | 红色文字在字段下方 |
| 消息提示 | 右上角 Toast，成功绿色，失败红色 |

---

## 十一、工作流引擎模块（v1.1.0新增）

### 11.1 模块概述

工作流引擎是文档管理系统的核心扩展模块，提供灵活可配置的业务流程编排能力。

**核心价值**：
- 🎯 灵活配置：支持 1-N 步骤，不同公司定制不同流程
- 🔄 可视化管理：拖拽式工作流设计器
- 📊 数据驱动：工作流统计分析

### 11.2 后端模块文件

**路径**：`server/src/modules/workflow/`

| 文件 | 说明 | 行数 |
|------|------|------|
| workflow.module.ts | 工作流模块定义 | ~30 |
| workflow.service.ts | 核心工作流引擎 | ~500 |
| workflow.controller.ts | API 控制器 | ~200 |
| dto/workflow-config.dto.ts | 工作流配置 DTO | ~100 |
| dto/start-workflow.dto.ts | 启动工作流 DTO | ~50 |
| dto/submit-step.dto.ts | 提交步骤 DTO | ~50 |
| dto/approve-step.dto.ts | 审批步骤 DTO | ~50 |
| services/parallel-approval.service.ts | 并行审批服务 | ~200 |
| services/conditional-branch.service.ts | 条件分支服务 | ~150 |
| services/sub-workflow.service.ts | 子工作流服务 | ~150 |
| services/timeout-handler.service.ts | 超时处理服务 | ~100 |
| services/delegation.service.ts | 审批人代理服务 | ~100 |
| services/statistics.service.ts | 工作流统计服务 | ~200 |

### 11.3 前端页面文件

**路径**：`client/src/views/workflows/`

| 文件 | 说明 | 行数 |
|------|------|------|
| WorkflowList.vue | 工作流列表页 | ~200 |
| WorkflowDetail.vue | 工作流详情页 | ~300 |
| WorkflowStart.vue | 发起工作流页 | ~150 |
| WorkflowDesigner.vue | 工作流设计器页 | ~500 |
| components/StepNode.vue | 步骤节点组件 | ~150 |
| components/ApprovalRuleConfig.vue | 审批规则配置组件 | ~200 |
| components/TemplateSelector.vue | 模板选择器组件 | ~150 |
| components/WorkflowPreview.vue | 工作流预览组件 | ~200 |
| statistics/EfficiencyDashboard.vue | 效率统计页面 | ~250 |
| statistics/BottleneckAnalysis.vue | 瓶颈分析页面 | ~200 |
| statistics/WorkflowReport.vue | 工作流报告页面 | ~250 |

### 11.4 数据库表

| 表名 | 说明 | 关键字段 |
|------|------|---------|
| workflows | 工作流定义 | id, name, category, status |
| workflow_steps | 工作流步骤 | workflowId, stepOrder, stepName, templateId, approvalRule |
| workflow_instances | 工作流实例 | id, workflowId, instanceName, initiatorId, currentStep, status |
| workflow_step_records | 步骤执行记录 | instanceId, stepOrder, documentId, taskRecordId, status, submitterId, approverId |
| workflow_versions | 工作流版本管理 | workflowId, version, config, isActive |
| parallel_approval_groups | 并行审批组 | stepRecordId, approverIds, requiredCount, status |
| conditional_branches | 条件分支 | stepId, condition, nextStepId, elseStepId |
| approval_delegations | 审批人代理 | delegatorId, delegateeId, startDate, endDate |

### 11.5 API 端点

#### 11.5.1 工作流管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/workflows` | 获取所有工作流定义 |
| POST | `/workflows` | 创建工作流定义 |
| GET | `/workflows/:id` | 获取工作流详情 |
| PUT | `/workflows/:id` | 更新工作流定义 |
| DELETE | `/workflows/:id` | 删除工作流定义 |
| POST | `/workflows/:id/config` | 保存工作流配置（UI 设计器） |
| GET | `/workflows/:id/versions` | 获取工作流版本列表 |
| POST | `/workflows/versions/:versionId/activate` | 激活工作流版本 |
| POST | `/workflows/:id/rollback/:versionId` | 回滚到指定版本 |

#### 11.5.2 工作流实例

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/workflows/:id/start` | 启动工作流实例 |
| GET | `/workflows/instances` | 获取工作流实例列表 |
| GET | `/workflows/instances/:id` | 获取工作流实例详情 |
| POST | `/workflows/instances/:id/steps/:stepOrder/submit` | 提交步骤 |
| POST | `/workflows/instances/:id/steps/:stepOrder/approve` | 审批步骤 |

#### 11.5.3 统计分析

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/workflows/statistics/efficiency` | 获取执行效率统计 |
| GET | `/workflows/statistics/bottlenecks` | 获取瓶颈步骤分析 |
| GET | `/workflows/statistics/workload` | 获取审批人工作量 |

### 11.6 配置文件

| 文件 | 说明 |
|------|------|
| `server/src/config/workflows.json` | 工作流JSON配置文件 |
| `docs/WORKFLOW_CONFIG.md` | 工作流配置指南 |

### 11.7 路由配置

```typescript
// client/src/router/index.ts
{
  path: '/workflows',
  name: 'WorkflowList',
  component: () => import('@/views/workflows/WorkflowList.vue'),
  meta: { requiresAuth: true },
},
{
  path: '/workflows/:id',
  name: 'WorkflowDetail',
  component: () => import('@/views/workflows/WorkflowDetail.vue'),
  meta: { requiresAuth: true },
},
{
  path: '/workflows/:id/designer',
  name: 'WorkflowDesigner',
  component: () => import('@/views/workflows/WorkflowDesigner.vue'),
  meta: { requiresAuth: true, requiresAdmin: true },
},
{
  path: '/workflows/statistics',
  name: 'WorkflowStatistics',
  component: () => import('@/views/workflows/statistics/EfficiencyDashboard.vue'),
  meta: { requiresAuth: true },
},
```

---

**文档版本**: 5.0
**最后更新**: 2026-02-13
**更新内容**:
- 同步项目状态：MVP Phase 1-6 完成 98.1%
- Phase 7-12: 部分完成（Phase 7-9, 12 已实现）
- 技术债务: 已识别 3 个 P1 问题，待实施
- 补充完整技术栈信息（echarts, sortablejs, exceljs等）
- 新增 Phase 7-12 模块说明：偏离检测、数据导出、2级审批、文件预览、统计分析
- **v1.1.0 新增**：工作流引擎模块（第十一章节）
  - 添加工作流模块文件说明（13个文件）
  - 添加工作流前端页面说明（11个组件）
  - 添加工作流数据库表说明（8张表）
  - 添加工作流API端点说明（20个端点）
  - 添加工作流路由配置
- 更新文档版本与 DESIGN.md 10.1、README.md 3.1、CLAUDE.md 4.0 保持一致
