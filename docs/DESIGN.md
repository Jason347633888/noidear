# 文档管理系统 - 完整需求设计文档

> 最后更新: 2026-02-01
> MVP Phase 1-6 开发计划已完善
> 完整版 Phase 7-14 预留扩展

---

## 目录

1. [项目概述](#一项目概述)
2. [技术架构](#二技术架构)
3. [文档分级体系](#三文档分级体系)
4. [核心功能模块](#四核心功能模块)
5. [业务规则](#五业务规则)
6. [工程化约束](#六工程化约束)
7. [数据模型](#七数据模型)
8. [API设计](#八api设计)
9. [前端设计](#九前端设计)
10. [90个已确认细节](#九十个已确认细节)
11. [开发顺序建议](#十一开发顺序建议)
12. [额外建议](#十二额外建议)
13. [项目里程碑](#十三项目里程碑)
14. [MVP Issue清单](#十四mvp-issue清单)
15. [待办事项](#十五待办事项)
16. [完整版扩展规划](#十六完整版扩展规划)
17. [MVP范围说明](#十七mvp范围说明)

---

## 一、项目概述

### 1.1 项目目标

建立一个企业内部文档管理系统，支持：
- 四级文件体系管理（一级/二级/三级/四级）
- 文档上传、审批、版本管理
- 四级文件模板创建与任务分发
- 用户与权限管理

### 1.2 技术栈

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 前端 | Vue 3 + Element Plus + Vite + Pinia | ^3.4.0 / ^2.5.0 / ^5.0.0 / ^2.1.0 | 上手简单，生态丰富 |
| 后端 | Node.js + NestJS + TypeScript + Prisma | 18.x / ^10.0.0 / ^5.3.0 / ^5.7.0 | 企业级框架，稳定 |
| 数据库 | PostgreSQL + Redis | >=15.0 / >=7.0 | JSON支持好，适合动态表单 |
| 文件存储 | MinIO | Latest | 本地部署，数据自主可控 |
| 部署 | Docker + Docker Compose | >=24.0 / >=2.20 | 环境一致，不出错 |
| 共享 | TypeScript 类型定义 | packages/types | 前后端类型共享 |

### 1.3 目录结构

```
noidear/
├── client/                    # 前端 Vue 3 项目
│   ├── src/
│   ├── public/
│   └── package.json
├── server/                    # 后端 NestJS 项目
│   ├── src/
│   │   ├── modules/          # 按域分模块
│   │   │   ├── auth/         # 认证模块
│   │   │   ├── user/         # 用户模块
│   │   │   ├── department/   # 部门模块
│   │   │   ├── document/     # 文档模块
│   │   │   ├── template/     # 模板模块
│   │   │   ├── task/         # 任务模块
│   │   │   └── approval/     # 审批模块
│   │   ├── common/           # 公共模块
│   │   └── prisma/           # 数据库模型
│   └── package.json
├── packages/                  # 共享包
│   └── types/                 # TypeScript 类型定义
│       ├── index.ts           # 导出所有类型
│       ├── user.ts            # 用户相关类型
│       ├── document.ts        # 文档相关类型
│       ├── template.ts        # 模板相关类型
│       ├── task.ts            # 任务相关类型
│       └── api.ts             # API 响应类型
├── docker-compose.yml         # 开发环境 Docker 配置
├── docker-compose.prod.yml    # 生产环境 Docker 配置
├── data/                      # 数据持久化目录
│   ├── postgres/              # PostgreSQL 数据
│   └── minio/                 # MinIO 数据
└── uploads/                   # 本地临时文件目录
```

### 1.4 数据库

- 数据库名称: `document_system`
- 主键类型: 雪花ID（Snowflake ID）
- 软删除: `deleted_at` 字段（datetime）
- 事务: 创建文件时使用（编号+记录一起成功或失败）
- 并发: 任务提交加锁，数据库事务保证数据一致性

---

## 二、技术架构

### 2.1 开发环境

| 服务 | 端口 | 说明 |
|------|------|------|
| PostgreSQL | 5432 | 主数据库 |
| Redis | 6379 | 缓存 |
| MinIO | 9000 | 对象存储 |
| MinIO Console | 9001 | 管理界面 |
| NestJS | 3000 | 后端API |
| Vue Dev | 5173 | 前端开发 |

### 2.2 部署方案

- 开发环境: Docker Compose
- Docker 配置: 分开两份（dev/prod）
- 文件存储: MinIO，按部门分桶
- 访问方式: VPN + 内网
- HTTPS: 暂时不需要，公网访问时再加

### 2.3 安全配置

- 密码加密: bcrypt（自动加盐）
- 登录锁定: 5次失败锁定账号
- Token: Header 传递 `Authorization: Bearer xxx`
- 验证码: 不需要（MVP阶段）
- 接口限流: 不限流

---

## 三、文档分级体系

### 3.1 四级文件定义

| 级别 | 文件类型 | 说明 | 上传/创建方式 | 审批流程 |
|------|----------|------|---------------|----------|
| 一级 | 管理手册 | 质量方针、目标 | 上传文件（PDF/Word/Excel） | 上传→提交审批→通过→发布 |
| 二级 | 程序文件 | 管理制度、流程 | 上传文件（PDF/Word/Excel） | 上传→提交审批→通过→发布 |
| 三级 | 作业指导书 | 操作规范、标准 | 上传文件（PDF/Word/Excel） | 上传→提交审批→通过→发布 |
| 四级 | 记录表单 | 填写记录、证据 | 创建表单模板 | 创建模板→发布→任务分发→填写→审批 |

### 3.2 编号规则

**编号格式**: `{级别}-{部门代码}-{序号}`

示例:
```
1-RD-001    （一级文件）
2-RD-001    （二级文件）
3-RD-001    （三级文件）
4-RD-001    （四级文件）
```

**规则**:
- 文件编号生成后不能修改
- 编号删除后记录待补齐，下次新建时优先使用
- 不同级别的文件使用不同的编号序列

---

## 四、核心功能模块

### 4.1 用户管理

| 功能 | 说明 |
|------|------|
| 用户列表 | 查看所有用户 |
| 新增用户 | 手动添加 |
| 编辑用户 | 修改信息、状态、部门 |
| 删除用户 | 软删除（deleted_at） |
| 修改密码 | 用户可修改自己的密码 |
| 批量导入 | MVP不支持 |

**用户状态**: 启用/禁用

### 4.2 组织架构

| 功能 | 说明 |
|------|------|
| 部门列表 | 查看所有部门 |
| 新增部门 | 支持2级（公司→部门） |
| 编辑部门 | 修改名称、上级部门 |
| 删除部门 | 检查后删除（有文件时提示） |
| 停用部门 | 用户转无部门状态 |

**规则**:
- 一人只能属一个部门
- 一人只能有一个上级
- 部门停用后用户转"无部门"

### 4.3 文件管理

| 功能 | 说明 |
|------|------|
| 文件上传 | 支持拖拽、批量上传 |
| 文件列表 | 显示编号、名称、状态、创建人、创建时间 |
| 文件搜索 | 支持名称和编号搜索 |
| 文件排序 | 支持创建时间、编号排序 |
| 文件删除 | 草稿/待审批可删；已发布不能删除只能停用；停用后可彻底删除 |
| 文件下载 | 有权限才能下载 |
| 版本管理 | 修改后自动+版本号，旧版本可查看但不能下载，MVP不支持回滚 |

**文件类型**: PDF、Word、Excel
**文件大小限制**: 10MB
**文件名**: 需要填写，可重复时提示用户修改

### 4.4 审批流程

| 功能 | 说明 |
|------|------|
| 提交审批 | 上传文件后提交 |
| 审批操作 | 通过（选填意见）/ 驳回（必填意见） |
| 审批历史 | 能查看自己审批过的文件 |
| 意见可见 | 依次审批时能看到前面人的意见 |
| 驳回处理 | 驳回后状态变"草稿"，修改后重新提交 |

**审批人确定**: 从用户的上级中选择（用户必须有上级）
**会签**: 支持多人同时审批（需全部通过）
**依次审批**: 支持一人审批后下一人审批
**兜底**: Admin可以审批任何文件

### 4.5 四级模板管理

| 功能 | 说明 |
|------|------|
| 模板创建 | Excel上传解析 / 手动创建 |
| 模板字段 | 文本、长文本、数值、日期、下拉、是/否 |
| 字段排序 | 支持拖拽排序 |
| 字段默认值 | 支持设置默认值 |
| 模板复制 | 支持复制模板 |
| 模板列表 | 显示编号、名称、版本、创建人、创建时间 |
| 模板筛选 | 支持筛选 |
| 模板停用 | 停用后已分发任务不受影响 |
| 模板删除 | 支持删除 |

### 4.6 任务分发

| 功能 | 说明 |
|------|------|
| 任务分发 | 发给部门，部门内人人都能看到 |
| 任务列表 | 显示模板名称、执行人、截止时间、状态 |
| 任务筛选 | Tabs切换（全部/待完成/已完成） |
| 任务填写 | 部门内任意一人填写 |
| 任务提交 | 第一人提交后锁定，不能修改 |
| 任务取消 | 发起人可以取消任务 |
| 任务转发 | 不支持 |
| 逾期标记 | 红色标记 |

**截止日期**: 必填，过期站内消息提醒
**执行规则**: 部门内任意一人都可以填写，第一人提交后锁定

### 4.7 站内消息

| 功能 | 说明 |
|------|------|
| 消息类型 | 任务通知、审批通知、逾期提醒 |
| 已读状态 | 显示已读/未读 |
| 消息保留 | 30天自动清理 |

---

## 五、业务规则

| 规则编号 | 规则描述 |
|---------|----------|
| BR-001 | 编号规则配置后，新文件自动按规则生成文件编号 |
| BR-002 | 一级/二级/三级文件创建后必须提交审批，不审批不可发布 |
| BR-003 | 四级文件（模板）创建后直接发布，无需审批 |
| BR-004 | 四级文件（记录）填写后提交审批，审批通过后归档 |
| BR-005 | 模板停用后，不可再新建数据，历史数据可查询 |
| BR-006 | 文件提交后不允许修改，只能查看或撤回 |
| BR-007 | 文件名称同级别内不可重复 |
| BR-008 | 编号删除后，系统记录待补齐编号，下次新建时优先使用 |
| BR-009 | 任务必须指定执行人，否则无法分发 |
| BR-010 | 归档后的数据不可修改，只能查看 |
| BR-011 | 不同级别的文件使用不同的编号序列 |
| BR-012 | 审批驳回时必须填写驳回原因 |
| BR-013 | 文件修改后自动+版本号（1.0→1.1→1.2） |
| BR-014 | 任务第一人提交后，其他人不能再提交，只能查看 |
| BR-014a | 任务发给部门，部门内任意一人都可填写 |
| BR-015 | 用户名唯一，英文+数字，最小3位 |
| BR-016 | 密码最小8位，无需复杂度和特殊字符 |

---

## 六、工程化约束

> **目的**：防止AI乱发挥，确保模块独立、可维护
> **适用范围**：所有开发者/AI Agent

### 6.1 模块化约束

| 约束 | 说明 | 违规处理 |
|------|------|----------|
| **模块独立** | 新增模块不修改现有模块代码 | 重构到独立模块 |
| **API稳定** | 现有API端点不变 | 禁止修改已有API |
| **数据库隔离** | 新功能新建表，不改现有表结构 | 禁止修改现有表 |
| **组件复用** | 相同UI必须提取到components/ | 禁止重复实现 |

### 6.2 代码规范约束

| 约束 | 要求 | 来源 |
|------|------|------|
| 函数长度 | < 50行 | Good Taste |
| 缩进层数 | < 3层 | Good Taste |
| 向后兼容 | 不破坏现有功能 | Never break userspace |
| 异常处理 | 所有API必须有try-catch | 安全规范 |

### 6.3 新增模块步骤

> 以下步骤为AI/开发者必须遵守

```
1. 前端：在 views/ 新建模块目录
2. 前端：在 api/ 新建模块API文件
3. 后端：在 modules/ 新建模块目录
4. 后端：在 prisma/schema.prisma 新增模型（禁止修改现有模型）
5. 路由：在 router/index.js 添加路由
6. 菜单：根据角色动态显示（配置文件控制）
```

### 6.4 禁止行为清单

- ❌ 引入未在技术栈清单中的库
- ❌ 更换框架（Vue 3 → React）
- ❌ 修改项目目录结构
- ❌ 硬编码密码/密钥
- ❌ 使用裸SQL（必须用Prisma）
- ❌ 修改现有API端点
- ❌ 添加MVP范围外功能

---

## 七、数据模型

### 6.1 核心表

```sql
-- 用户表
users (
  id              SnowflakeID   PRIMARY KEY,
  username        VARCHAR(50)   UNIQUE NOT NULL,    -- 用户名（英文+数字）
  password        VARCHAR(255)  NOT NULL,           -- bcrypt加密
  name            VARCHAR(100)  NOT NULL,           -- 姓名
  department_id   SnowflakeID   REFERENCES departments(id),
  role            VARCHAR(20)   NOT NULL DEFAULT 'user',  -- user/leader/admin
  superior_id     SnowflakeID   REFERENCES users(id),     -- 上级ID
  status          VARCHAR(10)   NOT NULL DEFAULT 'active', -- active/inactive
  login_attempts  INT           DEFAULT 0,               -- 登录失败次数
  locked_until    TIMESTAMP,                            -- 锁定截止时间
  created_at      TIMESTAMP   DEFAULT NOW(),
  updated_at      TIMESTAMP   DEFAULT NOW(),
  deleted_at      TIMESTAMP                              -- 软删除
);

-- 部门表
departments (
  id          SnowflakeID   PRIMARY KEY,
  code        VARCHAR(20)   UNIQUE NOT NULL,    -- 部门代码
  name        VARCHAR(100)  NOT NULL,           -- 部门名称
  parent_id   SnowflakeID   REFERENCES departments(id),  -- 上级部门
  status      VARCHAR(10)   NOT NULL DEFAULT 'active',   -- active/inactive
  created_at  TIMESTAMP   DEFAULT NOW(),
  updated_at  TIMESTAMP   DEFAULT NOW(),
  deleted_at  TIMESTAMP                              -- 软删除
);

-- 编号规则表
number_rules (
  id              SnowflakeID   PRIMARY KEY,
  level           INT           NOT NULL,        -- 1/2/3/4级
  department_id   SnowflakeID   REFERENCES departments(id),
  sequence        INT           NOT NULL DEFAULT 0,  -- 当前序号
  created_at      TIMESTAMP   DEFAULT NOW(),
  updated_at      TIMESTAMP   DEFAULT NOW()
);

-- 文档文件表（一/二/三级）
documents (
  id          SnowflakeID   PRIMARY KEY,
  level       INT           NOT NULL,            -- 1/2/3级
  number      VARCHAR(50)   UNIQUE NOT NULL,     -- 文件编号
  title       VARCHAR(200)  NOT NULL,            -- 文件标题
  file_path   VARCHAR(500)  NOT NULL,            -- MinIO路径
  file_name   VARCHAR(200)  NOT NULL,            -- 原始文件名
  file_size   BIGINT        NOT NULL,            -- 文件大小
  file_type   VARCHAR(50)   NOT NULL,            -- 文件类型
  version     DECIMAL(3,1)  NOT NULL DEFAULT 1.0, -- 版本号
  status      VARCHAR(20)   NOT NULL,            -- draft/pending/approved/rejected/archived
  creator_id  SnowflakeID   REFERENCES users(id),
  approver_id SnowflakeID   REFERENCES users(id),    -- 审批人
  approved_at TIMESTAMP,                              -- 审批时间
  created_at  TIMESTAMP   DEFAULT NOW(),
  updated_at  TIMESTAMP   DEFAULT NOW(),
  deleted_at  TIMESTAMP                              -- 软删除
);

-- 文档版本历史表
document_versions (
  id          SnowflakeID   PRIMARY KEY,
  document_id SnowflakeID   REFERENCES documents(id),
  version     DECIMAL(3,1)  NOT NULL,
  file_path   VARCHAR(500)  NOT NULL,
  file_name   VARCHAR(200)  NOT NULL,
  file_size   BIGINT        NOT NULL,
  creator_id  SnowflakeID   REFERENCES users(id),
  created_at  TIMESTAMP   DEFAULT NOW()
);

-- 模板表（四级）
templates (
  id          SnowflakeID   PRIMARY KEY,
  level       INT           NOT NULL DEFAULT 4,
  number      VARCHAR(50)   UNIQUE NOT NULL,
  title       VARCHAR(200)  NOT NULL,
  fields_json JSONB         NOT NULL,            -- 字段配置
  version     DECIMAL(3,1)  NOT NULL DEFAULT 1.0,
  status      VARCHAR(20)   NOT NULL DEFAULT 'active', -- active/inactive
  creator_id  SnowflakeID   REFERENCES users(id),
  created_at  TIMESTAMP   DEFAULT NOW(),
  updated_at  TIMESTAMP   DEFAULT NOW(),
  deleted_at  TIMESTAMP                              -- 软删除
);

-- 任务表
tasks (
  id          SnowflakeID   PRIMARY KEY,
  template_id SnowflakeID   REFERENCES templates(id),
  department_id SnowflakeID REFERENCES departments(id), -- 执行部门
  deadline    TIMESTAMP   NOT NULL,            -- 截止日期
  status      VARCHAR(20)  NOT NULL DEFAULT 'pending', -- pending/completed/cancelled
  creator_id  SnowflakeID   REFERENCES users(id),       -- 分发人
  created_at  TIMESTAMP   DEFAULT NOW(),
  updated_at  TIMESTAMP   DEFAULT NOW(),
  deleted_at  TIMESTAMP                              -- 软删除
);

-- 任务记录表（四级填写）
task_records (
  id          SnowflakeID   PRIMARY KEY,
  task_id     SnowflakeID   REFERENCES tasks(id),
  template_id SnowflakeID   REFERENCES templates(id),
  data_json   JSONB         NOT NULL,            -- 填写数据
  status      VARCHAR(20)   NOT NULL DEFAULT 'pending', -- pending/submitted/approved/rejected
  submitter_id SnowflakeID  REFERENCES users(id),    -- 提交人（第一人提交后锁定）
  submitted_at TIMESTAMP,
  approver_id SnowflakeID   REFERENCES users(id),
  approved_at TIMESTAMP,
  created_at  TIMESTAMP   DEFAULT NOW(),
  updated_at  TIMESTAMP   DEFAULT NOW(),
  deleted_at  TIMESTAMP                              -- 软删除
);

-- 说明：每个任务只能有一条提交后的记录（第一人提交后锁定）

-- 审批记录表
approvals (
  id          SnowflakeID   PRIMARY KEY,
  document_id SnowflakeID   REFERENCES documents(id),
  record_id   SnowflakeID   REFERENCES task_records(id),
  approver_id SnowflakeID   REFERENCES users(id),
  status      VARCHAR(20)   NOT NULL,            -- approved/rejected
  comment     TEXT,
  created_at  TIMESTAMP   DEFAULT NOW()
);

-- 操作日志表
operation_logs (
  id          SnowflakeID   PRIMARY KEY,
  user_id     SnowflakeID   REFERENCES users(id),
  action      VARCHAR(50)   NOT NULL,            -- login/upload/approve/edit/delete
  module      VARCHAR(50)   NOT NULL,            -- auth/document/template/task
  object_id   SnowflakeID,
  object_type VARCHAR(50),
  details     JSONB,
  ip          VARCHAR(50),
  created_at  TIMESTAMP   DEFAULT NOW()
);

-- 站内消息表
notifications (
  id          SnowflakeID   PRIMARY KEY,
  user_id     SnowflakeID   REFERENCES users(id),
  type        VARCHAR(50)   NOT NULL,            -- task/approval/reminder
  title       VARCHAR(200)  NOT NULL,
  content     TEXT,
  is_read     BOOLEAN       DEFAULT FALSE,
  read_at     TIMESTAMP,
  created_at  TIMESTAMP   DEFAULT NOW()
);
```

### 6.2 扩展字段预留（后续加）

| 字段 | 表 | 用途 |
|------|------|------|
| email | users | 后续邮件通知 |
| phone | users | 后续短信通知 |
| workflow_config | documents | 后续多级审批配置 |
| tags | documents/templates | 后续标签搜索 |
| description | departments | 部门描述 |

---

## 七、API设计

### 7.1 API规范

| 项目 | 值 |
|------|------|
| 前缀 | /api/v1 |
| 认证 | Header: `Authorization: Bearer <token>` |
| 分页 | `?page=1&limit=20` |
| 日期格式 | ISO 8601 (YYYY-MM-DDTHH:mm:ssZ) |
| 错误格式 | `{ code: number, message: string, details: any }` |
| 文件上传 | multipart/form-data |
| 超时时间 | 30秒 |

### 7.2 核心API

| 模块 | 端点 | 方法 | 说明 |
|------|------|------|------|
| **认证** | | | |
| | /api/v1/auth/login | POST | 登录 |
| | /api/v1/auth/me | GET | 获取当前用户 |
| | /api/v1/auth/password | PUT | 修改密码 |
| | /api/v1/auth/logout | POST | 登出 |
| **用户** | | | |
| | /api/v1/users | GET | 用户列表 |
| | /api/v1/users | POST | 创建用户 |
| | /api/v1/users/:id | GET | 用户详情 |
| | /api/v1/users/:id | PUT | 更新用户 |
| | /api/v1/users/:id | DELETE | 删除用户 |
| **部门** | | | |
| | /api/v1/departments | GET | 部门列表 |
| | /api/v1/departments | POST | 创建部门 |
| | /api/v1/departments/:id | PUT | 更新部门 |
| | /api/v1/departments/:id | DELETE | 删除部门 |
| **文档** | | | |
| | /api/v1/documents/level/:level | GET | 文档列表 |
| | /api/v1/documents | POST | 上传文档 |
| | /api/v1/documents/:id | GET | 文档详情 |
| | /api/v1/documents/:id | PUT | 更新文档 |
| | /api/v1/documents/:id | DELETE | 删除文档 |
| | /api/v1/documents/:id/download | GET | 下载文档 |
| | /api/v1/documents/:id/versions | GET | 版本历史 |
| **审批** | | | |
| | /api/v1/approvals/pending | GET | 待审批列表 |
| | /api/v1/approvals/history | GET | 审批历史 |
| | /api/v1/approvals | POST | 提交审批 |
| | /api/v1/approvals/:id | PUT | 审批操作 |
| **模板** | | | |
| | /api/v1/templates | GET | 模板列表 |
| | /api/v1/templates | POST | 创建模板 |
| | /api/v1/templates/:id | GET | 模板详情 |
| | /api/v1/templates/:id | PUT | 更新模板 |
| | /api/v1/templates/:id | DELETE | 删除模板 |
| | /api/v1/templates/:id/copy | POST | 复制模板 |
| | /api/v1/templates/parse-excel | POST | 解析Excel |
| **任务** | | | |
| | /api/v1/tasks | GET | 任务列表 |
| | /api/v1/tasks | POST | 分发任务 |
| | /api/v1/tasks/:id | GET | 任务详情 |
| | /api/v1/tasks/:id | DELETE | 取消任务 |
| | /api/v1/tasks/:id/submit | POST | 提交任务 |
| **记录** | | | |
| | /api/v1/records | GET | 记录列表 |
| | /api/v1/records/:id | GET | 记录详情 |
| **消息** | | | |
| | /api/v1/notifications | GET | 消息列表 |
| | /api/v1/notifications/:id/read | PUT | 标记已读 |
| | /api/v1/notifications/read-all | PUT | 全部已读 |
| **日志** | | | |
| | /api/v1/logs | GET | 操作日志（管理员） |

---

## 八、前端设计

### 8.1 页面结构

**侧边栏层级**: 二级（按功能模块分类）

```
侧边栏:
├── 一级文件管理
│   ├── 文件列表
│   └── 上传文件
├── 二级文件管理
│   ├── 文件列表
│   └── 上传文件
├── 三级文件管理
│   ├── 文件列表
│   └── 上传文件
├── 四级模板
│   ├── 模板列表
│   └── 创建模板
├── 任务管理
│   ├── 我的任务
│   └── 分发任务（部门负责人）
├── 审批中心
├── 用户管理（Admin）
└── 部门管理（Admin）
```

### 8.2 交互规范

| 项目 | 值 |
|------|------|
| 每页条数 | 20条（可切换10/20/50） |
| 列表加载 | 分页 |
| 表单验证 | 红色文字在字段下方 |
| 审批意见 | 驳回时必填，通过时选填 |
| 文件上传 | 拖拽上传 + 批量上传 + 进度条 |
| 文件名显示 | 显示文件名 |
| 批量操作 | 批量删除 |
| 任务筛选 | Tabs切换 |

### 8.3 组件预留扩展

| 组件 | 用途 | 后续扩展 |
|------|------|----------|
| UserAvatar | 用户头像 | 后续支持上传 |
| VersionCompare | 版本对比 | 后续加 |
| DataExport | 数据导出 | 后续加Excel导出 |
| WorkflowDesigner | 工作流设计 | 后续加可视化设计 |

### 8.4 响应式设计

> **适用范围**：Phase 1-6 所有页面
> **响应式目标**：手机、平板、电脑均可正常使用核心功能

#### 8.4.1 支持设备

| 设备 | 宽度范围 | 支持级别 |
|------|----------|----------|
| 手机 | 375px - 428px | 完全支持 |
| iPad | 768px - 1024px | 完全支持 |
| 桌面 | ≥1200px | 完全支持（主适配） |

#### 8.4.2 断点定义

```css
/* 桌面 ≥1200px */
@media (min-width: 1200px) { /* 桌面布局 */ }

/* iPad 768px - 1199px */
@media (min-width: 768px) and (max-width: 1199px) { /* iPad布局 */ }

/* 手机 <768px */
@media (max-width: 767px) { /* 手机布局 */ }
```

#### 8.4.3 各端适配规则

| 功能 | 手机 | iPad | 桌面 |
|------|------|------|------|
| 侧边栏 | 汉堡菜单（折叠） | 可折叠 | 固定显示 |
| 文档列表 | 卡片式 | 表格+卡片 | 表格 |
| 任务填写 | 全屏表单 | 分栏布局 | 分栏布局 |
| 审批操作 | 全屏弹窗 | 弹窗 | 弹窗 |
| 文件上传 | 拍照/选择文件 | 拖拽+选择 | 拖拽+批量 |
| 按钮大小 | ≥44px（手指操作） | ≥40px | ≥32px |

#### 8.4.4 禁止行为

- ❌ 禁止使用fixed定位导致手机端底部被遮挡
- ❌ 禁止表格超过屏幕宽度出现横向滚动
- ❌ 禁止弹窗超过100%高度
- ❌ 禁止使用hover交互（手机无hover）

---

## 九、90个已确认细节

### 9.1 用户与权限（19题）

| 题号 | 问题 | 你的选择 |
|------|------|----------|
| 1 | 部门层级 | 2级（公司→部门） |
| 2 | 用户角色 | 普通用户、部门负责人、管理员 |
| 3 | 审批人确定 | 从上级选 |
| 19 | 一人多部门 | 不支持 |
| 20 | 一人多上级 | 不支持 |
| 21 | 部门停用 | 用户转无部门 |
| 22 | 修改密码 | 能 |
| 23 | 用户状态 | 启用/禁用 |
| 46 | 用户头像 | 不支持 |
| 47 | 我的文件 | 能查看 |
| 48 | 审批历史 | 能查看 |
| 49 | 登录锁定 | 5次锁定 |
| 50 | 查看日志 | 不能（只有管理员） |
| 53 | 批量导入用户 | 不能 |
| 76 | 验证码 | 不需要 |
| 77 | 用户名唯一 | 是 |
| 78 | 用户名格式 | 英文+数字 |
| 79 | 用户名最小长度 | 3位 |
| 80 | 密码最小长度 | 8位 |
| 81 | 密码复杂度 | 不需要 |

### 9.2 文件管理（16题）

| 题号 | 问题 | 你的选择 |
|------|------|----------|
| 4 | 文件类型 | PDF、Word、Excel |
| 5 | 文件名重复 | 提示用户手动修改 |
| 6 | 旧版本查看 | 能查看不能下载 |
| 7 | 版本对比 | 不需要 |
| 26 | 文件名填写 | 需要填写 |
| 27 | 文件大小 | 10MB |
| 28 | 文件下载 | 有权限才能下 |
| 29 | 版本排序 | 时间倒序 |
| 54 | 文件列表字段 | 编号、名称、状态、创建人、时间 |
| 55 | 文件排序 | 创建时间、编号 |
| 56 | 审批时限 | 没有时限，站内消息提醒审批人，不做自动处理 |
| 57 | 驳回状态 | 草稿 |
| 58 | 删除已发布文件 | 不能 |
| 59 | 拖拽上传 | 支持 |
| 60 | 批量上传 | 支持 |
| 83 | 文件预览 | 不支持 |
| 88 | 文件编号修改 | 不能 |
| 90 | 上传文件名显示 | 显示文件名 |

### 9.3 审批流程（3题）

| 题号 | 问题 | 你的选择 |
|------|------|----------|
| 24 | 审批历史 | 能 |
| 25 | 审批意见可见 | 能 |
| 14 | 审批意见 | 驳回必填 |

### 9.4 四级模板（5题）

| 题号 | 问题 | 你的选择 |
|------|------|----------|
| 30 | 模板复制 | 能 |
| 61 | 模板列表字段 | 编号、名称、版本、创建人、时间 |
| 62 | 导出模板 | 不能 |
| 69 | 字段拖拽排序 | 支持 |
| 70 | 停用模板影响 | 任务不受影响 |
| 82 | 字段默认值 | 支持 |

### 9.5 任务分发（5题）

| 题号 | 问题 | 你的选择 |
|------|------|----------|
| 8 | 过期提醒 | 站内消息 |
| 9 | 任务筛选 | Tabs切换 |
| 31 | 任务取消 | 能 |
| 63 | 任务列表字段 | 名称、执行人、截止时间、状态 |
| 64 | 转发任务 | 不能 |
| 65 | 修改已提交任务 | 不能 |
| 66 | 逾期标记 | 红色标记 |

### 9.6 Excel与数据（2题）

| 题号 | 问题 | 你的选择 |
|------|------|----------|
| 67 | Excel解析匹配 | 手动映射 |
| 68 | 数据导出 | 能（Excel） |

### 9.7 系统配置（21题）

| 题号 | 问题 | 你的选择 |
|------|------|----------|
| 10 | 分页方式 | page+limit |
| 11 | 错误码设计 | 详细 |
| 12 | 侧边栏层级 | 二级 |
| 13 | 表单验证 | 红色文字 |
| 15 | 主键类型 | 雪花ID |
| 16 | 软删除 | deleted_at |
| 17 | Docker配置 | 分开两份 |
| 18 | MinIO桶 | 按部门分开 |
| 32 | 每页条数 | 20条 |
| 33 | Token位置 | Header |
| 34 | 上传格式 | multipart |
| 35 | 事务 | 需要 |
| 36 | 操作日志 | 关键操作 |
| 37 | 超时时间 | 30秒 |
| 38 | 重试次数 | 1次 |
| 39 | 上传进度 | 进度条 |
| 40 | 系统语言 | 可扩展 |
| 41 | 前端目录 | 默认结构 |
| 42 | 后端目录 | 按域分 |
| 43 | 错误格式 | 详细 |
| 44 | 密码加密 | bcrypt |
| 45 | 数据库连接 | Docker |

### 9.8 消息与其他（6题）

| 题号 | 问题 | 你的选择 |
|------|------|----------|
| 71 | 消息已读 | 有 |
| 72 | 消息保留 | 30天 |
| 73 | 搜索功能 | 有 |
| 74 | 搜索字段 | 名称和编号 |
| 75 | 批量操作 | 批量删除 |
| 84 | 接口限流 | 不限流 |
| 85 | 回收站 | 有（7天） |
| 86 | 加载方式 | 分页 |
| 87 | 日期格式 | YYYY-MM-DD |
| 89 | 清空功能 | 没有 |
| 52 | 删除部门 | 能（有检查） |
| 51 | 部门层级数 | 2级 |

---

## 十、开发顺序建议

| 顺序 | 模块 | 理由 |
|------|------|------|
| 1 | 用户登录 + 用户管理 | 基础，先能登录 |
| 2 | 组织架构（部门管理） | 用户需要关联部门 |
| 3 | 一级文件上传 + 审批 | 最简单，先验证流程 |
| 4 | 二级/三级文件 | 复用一级逻辑 |
| 5 | 四级模板管理 | 复杂，需要Excel解析 |
| 6 | 任务分发 + 填写 | 基于模板 |
| 7 | 站内消息 | 最后再加 |

---

## 十一、额外建议

### 11.1 代码规范

- **提交规范**: 每天至少提交一次，commit message 用中文
- **命名规范**: 数据库字段用 snake_case，代码变量用 camelCase
- **注释规范**: 复杂逻辑必须注释，简单逻辑可不写

### 11.2 测试建议

- **单元测试**: 先测核心逻辑（审批流程、编号生成）
- **手动测试清单**: 整理一份测试用例，开发完自己测一遍
- **测试账号**: 准备几个测试账号（admin、普通用户、部门负责人）

### 11.3 文档建议

- **README**: 项目启动说明
- **API文档**: 用 Swagger 自动生成
- **数据字典**: 数据库表结构说明

### 11.4 安全性（生产环境）

- 生产环境记得改数据库密码
- 不要把配置文件提交到 git
- 定期备份数据库

### 11.5 扩展性预留

| 字段 | 表 | 用途 |
|------|------|------|
| email | users | 后续邮件通知 |
| phone | users | 后续短信通知 |
| workflow_config | documents | 后续多级审批配置 |
| tags | documents/templates | 后续标签搜索 |
| description | departments | 部门描述 |

---

## 十二、项目里程碑

> **重要说明**：
> - **MVP范围**：Phase 1-6（当前开发，完成后开箱即用）
> - **扩展范围**：Phase 7-14（后续扩展，不在当前计划内）

### Phase 1-6: MVP版本（当前开发）

| Phase | 模块 | Issue数 | 状态 |
|-------|------|---------|------|
| Phase 1 | 基础配置 | 8个 | 待开发 |
| Phase 2 | 一级文件 | 10个 | 待开发 |
| Phase 3 | 二三级文件 | 6个 | 待开发 |
| Phase 4 | 四级模板 | 12个 | 待开发 |
| Phase 5 | 任务分发 | 10个 | 待开发 |
| Phase 6 | 消息与优化 | 6个 | 待开发 |
| **合计** | | **52个** | |

### Phase 7-14: 完整版扩展（后续规划）

> 以下功能不在当前开发范围内，仅作为预留扩展空间

| Phase | 模块 | 说明 |
|-------|------|------|
| Phase 7 | 数据联动 | 创建下游报表时自动带入上游配方 |
| Phase 8 | 版本联动 | 上游变更后下游自动更新 |
| Phase 9 | 数据导出 | Excel批量导出 |
| Phase 10 | 工作流配置 | 可视化审批流程设计 |
| Phase 11 | 文件预览 | 在线预览PDF/Word/Excel |
| Phase 12 | 统计分析 | 报表和图表展示 |
| Phase 13 | 多语言 | 中英文切换 |
| Phase 14 | 邮件通知 | SMTP邮件通知（留接口） |

---

## 十三、MVP Issue清单

> **说明**：以下Issue按Phase分组，每个Issue包含约束，防止AI乱发挥
> **约束规则**：严格按Issue描述实现，禁止添加Issue未定义的功能

### Phase 1: 基础配置（8个Issue）

| Issue | 名称 | 依赖 | 约束 |
|-------|------|------|------|
| #1 | 项目骨架搭建 | 无 | 只能用：Vue 3 + Element Plus + Vite + Pinia + NestJS + TypeScript + Prisma |
| #2 | Docker Compose配置 | 无 | 必须包含：PostgreSQL、Redis、MinIO；禁止添加其他服务 |
| #3 | Prisma模型定义 | #2 | 严格按照DESIGN.md数据模型创建，禁止添加未定义的表或字段 |
| #4 | 用户登录功能 | #3 | 只能用：bcrypt加密、jsonwebtoken生成Token；禁止添加验证码 |
| #5 | 用户管理CRUD | #4 | Admin专属；禁止批量导入；用户必须关联部门和上级 |
| #6 | 部门管理CRUD | #3 | 2级结构（公司→部门）；禁止超过2级；一人只能属一个部门 |
| #7 | 公共组件开发 | #1 | FileUpload（拖拽+进度条）、TablePagination（分页封装）；禁止使用其他UI库 |
| #8 | 布局组件开发 | #1, #7 | 侧边栏+顶栏；响应式适配（手机/iPad/桌面）；禁止自定义样式，紧跟Element Plus |

### Phase 2: 一级文件（10个Issue）

| Issue | 名称 | 依赖 | 约束 |
|-------|------|------|------|
| #9 | 文件上传组件 | #7 | 只能用multipart/form-data；限制：PDF/Word/Excel，单文件≤10MB；禁止其他类型 |
| #10 | MinIO文件存储 | #9 | 必须上传到MinIO，禁止存数据库；按部门分桶；禁止直接调用MinIO API，必须用file.util.ts封装 |
| #11 | 一级文件列表 | #10 | 显示：编号、名称、状态、创建人、创建时间；支持：搜索、排序、分页；禁止添加标签筛选 |
| #12 | 一级文件详情 | #11 | 显示：文件信息+版本历史；禁止：文件预览（仅显示下载链接） |
| #13 | 文件下载功能 | #10 | 有权限才能下载；权限规则：创建人/审批人/Admin；禁止匿名下载 |
| #14 | 提交审批功能 | #11 | 提交给上级审批；一人只能有一个上级；Admin可以审批任何文件 |
| #15 | 待审批列表 | #14 | 审批人查看待自己审批的文件；会签（多人同时审批）不支持，仅单级审批 |
| #16 | 审批通过功能 | #15 | 通过+选填意见；通过后状态变为"已发布"；禁止自定义审批流程 |
| #17 | 审批驳回功能 | #15 | 驳回+必填意见；驳回后状态变为"草稿"；禁止驳回不填意见 |
| #18 | 审批历史记录 | #16, #17 | 查看自己审批过的文件；按时间倒序；禁止查看他人审批历史 |

### Phase 3: 二三级文件（6个Issue）

| Issue | 名称 | 依赖 | 约束 |
|-------|------|------|------|
| #19 | 二级文件管理 | #9-#18 | **复用Phase 2逻辑**，仅改变level字段为2；禁止添加新功能 |
| #20 | 三级文件管理 | #9-#18 | **复用Phase 2逻辑**，仅改变level字段为3；禁止添加新功能 |
| #21 | 文件版本管理 | #19, #20 | 修改后自动+版本号（1.0→1.1）；禁止：版本回滚 |
| #22 | 版本历史查看 | #21 | 显示版本列表（时间倒序）；旧版本只能查看，不能下载；禁止版本对比 |
| #23 | 文件状态流转 | #19-#22 | 草稿→待审批→已发布/已驳回→已停用；禁止添加其他状态 |
| #24 | 文件停用功能 | #23 | 已发布文件不能删除，只能停用；停用后不可下载；禁止彻底删除已发布文件 |

### Phase 4: 四级模板（12个Issue）

| Issue | 名称 | 依赖 | 约束 |
|-------|------|------|------|
| #25 | Excel解析功能 | 无 | 只能用：xlsx库；解析后手动映射字段类型；禁止自动推断字段类型 |
| #26 | 模板创建-Excel方式 | #25 | 上传Excel→解析→生成字段；支持：文本、数字、日期、下拉、是/否；禁止其他字段类型 |
| #27 | 模板创建-手动方式 | 无 | 手动添加字段；字段类型同#26；禁止自定义字段类型 |
| #28 | 模板字段配置 | #26, #27 | 支持：拖拽排序、设置默认值、必填/选填；禁止：字段联动、公式计算 |
| #29 | 字段拖拽排序 | #28 | 只能用：SortableJS；禁止使用其他拖拽库 |
| #30 | 字段默认值设置 | #28 | 支持文本默认值、数字默认值、日期默认值；禁止：动态默认值 |
| #31 | 模板列表 | #26-#30 | 显示：编号、名称、版本、创建人、创建时间、状态；支持：筛选、搜索 |
| #32 | 模板详情查看 | #31 | 显示字段配置；禁止：在线预览表单 |
| #33 | 模板编辑功能 | #32 | 修改字段配置；版本号自动+0.1；禁止：修改模板关联的任务 |
| #34 | 模板复制功能 | #31 | 一键复制模板；新模板编号不同，名称加"副本"；禁止：批量复制 |
| #35 | 模板停用功能 | #31 | 停用后不可再新建任务；历史任务不受影响；禁止：删除正在使用的模板 |
| #36 | 模板删除功能 | #35 | 仅能删除草稿状态的模板；禁止：删除已停用的模板 |

### Phase 5: 任务分发（10个Issue）

| Issue | 名称 | 依赖 | 约束 |
|-------|------|------|------|
| #37 | 表单渲染组件 | #28 | 根据JSON字段配置渲染表单；支持：文本框、数字框、日期选择器、下拉选择器、开关；禁止：复杂表单组件 |
| #38 | 任务分发功能 | #31, #37 | 选择模板→选择部门→选择截止日期；截止日期必填；禁止：指定具体执行人（发给部门即可） |
| #39 | 任务列表-My | #38 | 显示：模板名称、部门、截止时间、状态；Tabs筛选：全部/待完成/已完成；禁止：高级筛选 |
| #40 | 任务列表-All | #39 | 部门负责人查看本部门所有任务；显示：执行人（填写后显示）；禁止：查看其他部门任务 |
| #41 | 任务筛选 | #39, #40 | Tabs切换；禁止：搜索框、筛选器 |
| #42 | 任务填写功能 | #37, #39 | 动态表单填写；支持：保存草稿、提交；禁止：文件上传组件 |
| #43 | 任务提交功能 | #42 | 第一人提交后锁定；其他人只能查看；提交后不可修改；禁止：取消提交 |
| #44 | 任务取消功能 | #38 | 发起人可以取消任务；取消后任务删除；禁止：取消已提交的任务 |
| #45 | 逾期红色标记 | #39 | 截止日期过期显示红色；站内消息提醒；禁止：自动处理 |
| #46 | 任务审批功能 | #43 | 任务填写后提交审批；审批通过后归档；禁止：驳回重填（取消任务重填） |

### Phase 6: 消息与优化（6个Issue）

| Issue | 名称 | 依赖 | 约束 |
|-------|------|------|------|
| #47 | 站内消息功能 | #4 | 消息类型：任务通知、审批通知、逾期提醒；保存30天；禁止：消息推送其他渠道 |
| #48 | 消息列表 | #47 | 显示：标题、时间、未读/已读状态；按时间倒序；禁止：消息搜索 |
| #49 | 消息已读功能 | #48 | 点击消息标记已读；支持批量已读；禁止：删除消息 |
| #50 | 操作日志 | #4 | 记录：登录、上传、审批、删除关键操作；日志保留7天；禁止：记录密码等敏感信息 |
| #51 | 回收站功能 | #5, #6, #24, #36, #44 | 恢复已删除的数据；删除后7天彻底删除；禁止：永久保留 |
| #52 | 细节优化 | #1-#51 | 加载状态、空状态、错误提示；响应式适配；禁止：添加新功能 |

---

## 十四、待办事项

### 技术待办
- [ ] 项目初始化（Vue 3 + NestJS）
- [ ] Docker Compose 配置
- [ ] Prisma 模型定义
- [ ] Swagger API 文档

### 文档待办
- [ ] README.md
- [ ] API 文档
- [ ] 数据字典

### 测试待办
- [ ] 测试用例清单
- [ ] 测试账号准备

---

## 十四、完整版扩展规划

> 本章节记录未来要扩展的功能规划，当前 MVP 版本不实现，但已预留扩展空间。

### 14.1 功能扩展清单

| 模块 | MVP版本 | 完整版新增 |
|------|---------|-----------|
| 审批流程 | 单级审批（从上级选） | 多级审批、可视化工作流设计器、自定义审批节点 |
| 通知方式 | 站内消息 | 仅站内消息（邮件仅留接口） |
| 用户管理 | 手动单个添加 | 批量导入（Excel）、LDAP/AD集成、单点登录SSO |
| 文件管理 | 下载 | 文件在线预览（PDF/Word/Excel）、版本对比、历史追溯 |
| 数据导出 | 不支持 | 批量导出Excel、导出模板数据 |
| ~~标签系统~~ | ~~无~~ | ~~标签搜索~~ **去掉，保留关键词搜索** |
| 权限控制 | 角色级（user/leader/admin） | 细粒度权限、数据权限（部门/本人/全部）、权限继承 |
| 统计分析 | 无 | 报表统计、图表展示、审批时效分析、任务完成率统计 |
| 系统集成 | 无 | 开放API、Webhook回调、第三方应用集成 |
| 多语言 | 中文 | 中英文切换、可扩展多语言框架 |
| 归档管理 | 状态归档 | 档案库管理、过期处理、定期归档策略 |
| 流程监控 | 无 | 审批超时提醒、流程催办、流程日志追踪 |
| **数据联动** | 无 | **Phase 7：创建下游报表时自动带入上游配方** |
| **版本联动** | 无 | **Phase 8：上游变更后下游报表自动更新** |

### 14.2 预留扩展字段

以下字段已在数据模型中预留，后续直接启用：

| 字段 | 表 | 用途 | 启用条件 |
|------|------|------|----------|
| email | users | 邮件地址 | 启用邮件通知功能 |
| phone | users | 手机号码 | 启用短信/微信通知 |
| workflow_config | documents | 审批流程配置 | 启用自定义审批流程 |
| tags | documents | 标签列表 | 启用标签搜索功能 |
| tags | templates | 标签列表 | 启用标签筛选功能 |
| description | departments | 部门描述 | 部门信息完善时 |

### 14.3 完整版数据模型扩展

```sql
-- 审批流程配置表（完整版）
approval_workflows (
  id              SnowflakeID   PRIMARY KEY,
  name            VARCHAR(100)  NOT NULL,           -- 流程名称
  levels          JSONB         NOT NULL,            -- 审批级别配置
  condition       JSONB,                            -- 触发条件
  timeout_hours   INT,                              -- 超时时间
  status          VARCHAR(10)  NOT NULL DEFAULT 'active',
  created_at      TIMESTAMP   DEFAULT NOW(),
  updated_at      TIMESTAMP   DEFAULT NOW()
);

-- 标签表
tags (
  id          SnowflakeID   PRIMARY KEY,
  name        VARCHAR(50)   NOT NULL,               -- 标签名称
  color       VARCHAR(20),                          -- 标签颜色
  type        VARCHAR(20)   NOT NULL,               -- document/template
  created_at  TIMESTAMP   DEFAULT NOW()
);

-- 文件标签关联表
document_tags (
  id          SnowflakeID   PRIMARY KEY,
  document_id SnowflakeID   REFERENCES documents(id),
  tag_id      SnowflakeID   REFERENCES tags(id),
  created_at  TIMESTAMP   DEFAULT NOW()
);

-- 邮件配置表
email_config (
  id          SnowflakeID   PRIMARY KEY,
  host        VARCHAR(100)  NOT NULL,               -- SMTP服务器
  port        INT           NOT NULL,               -- 端口
  username    VARCHAR(100)  NOT NULL,               -- 发件账号
  password    VARCHAR(255)  NOT NULL,               -- 发件密码
  from_name   VARCHAR(100),                         -- 发件人名称
  status      VARCHAR(10)   NOT NULL DEFAULT 'active',
  created_at  TIMESTAMP   DEFAULT NOW(),
  updated_at  TIMESTAMP   DEFAULT NOW()
);

-- 系统配置表
system_config (
  id          SnowflakeID   PRIMARY KEY,
  key         VARCHAR(50)   UNIQUE NOT NULL,        -- 配置键
  value       TEXT,                                 -- 配置值
  description VARCHAR(200),                         -- 说明
  updated_at  TIMESTAMP   DEFAULT NOW()
);
```

### 14.4 完整版API扩展

| 模块 | 端点 | 方法 | 说明 |
|------|------|------|------|
| **工作流** | | | |
| | /api/v1/workflows | GET | 流程列表 |
| | /api/v1/workflows | POST | 创建流程 |
| | /api/v1/workflows/:id | PUT | 更新流程 |
| | /api/v1/workflows/:id | DELETE | 删除流程 |
| **标签** | | | |
| | /api/v1/tags | GET | 标签列表 |
| | /api/v1/tags | POST | 创建标签 |
| | /api/v1/tags/:id | DELETE | 删除标签 |
| | /api/v1/tags/:id/documents | GET | 标签下的文档 |
| **统计** | | | |
| | /api/v1/stats/documents | GET | 文档统计 |
| | /api/v1/stats/approvals | GET | 审批统计 |
| | /api/v1/stats/tasks | GET | 任务统计 |
| **系统** | | | |
| | /api/v1/config | GET | 系统配置 |
| | /api/v1/config | PUT | 更新配置 |
| | /api/v1/email/test | POST | 发送测试邮件 |

### 14.5 完整版前端页面

在 MVP 侧边栏基础上，完整版增加：

```
侧边栏扩展:
├── 系统管理（Admin）
│   ├── 工作流配置 ← 新增
│   ├── 标签管理 ← 新增
│   ├── 邮件配置 ← 新增
│   └── 系统参数 ← 新增
├── 统计分析 ← 新增
│   ├── 文档统计
│   ├── 审批统计
│   └── 任务统计
└── 我的
    ├── 我的归档 ← 新增
    └── 个人设置 ← 新增（语言切换、邮箱绑定）
```

### 14.6 完整版组件扩展

| 组件 | 用途 | 说明 |
|------|------|------|
| WorkflowDesigner | 工作流设计器 | 可视化拖拽配置审批流程 |
| VersionCompare | 版本对比 | 文档版本差异对比 |
| TagManager | 标签管理 | 批量打标签、标签筛选 |
| DataExport | 数据导出 | 批量导出Excel |
| EmailSettings | 邮件设置 | SMTP配置、测试发送 |
| StatsDashboard | 统计面板 | 图表展示统计数据 |
| LanguageSwitch | 语言切换 | 中英文切换 |
| FilePreview | 文件预览 | 在线预览PDF/Word/Excel |

### 14.7 完整版开发顺序（Phase 7+）

| Phase | 模块 | 说明 |
|-------|------|------|
| Phase 7 | 数据联动（自动带入） | 创建下游报表时自动带入上游配方数据 |
| Phase 8 | 版本联动（自动更新） | 上游配方变更后，下游报表自动更新 |
| Phase 9 | 数据导出 | Excel批量导出 |
| Phase 10 | 工作流配置 | 可视化工作流设计器 |
| Phase 11 | 文件预览 | 在线预览功能 |
| Phase 12 | 统计分析 | 报表和图表展示 |
| Phase 13 | 多语言 | 中英文切换框架 |
| Phase 14 | 邮件通知 | 留接口，不实现 |

### 14.8 数据联动与版本联动说明

#### 数据联动（自动带入）
**触发时机**：创建下游报表时
**业务场景**：配料表创建时，自动带入工艺配方的原料和比例

```
步骤：
1. 打开"配料表"模板创建新记录
2. 选择关联的"工艺配方"（比如：配方A）
3. 系统自动把配方A的原料和比例带入配料表
4. 保存 → 完成
```

#### 版本联动（自动更新）
**触发时机**：上游配方变更时
**业务场景**：配方从v1.0更新到v1.1，所有关联的生产记录自动更新

```
步骤：
1. 配方A版本从1.0更新到1.1（原料比例变了）
2. 系统检测到变更
3. 自动找到所有关联的生产记录
4. 把这些记录中的配方数据更新到1.1版本
```

#### 业务关系图
```
┌─────────────┐    创建时带入     ┌─────────────┐
│  工艺配方    │ ───────────────> │  生产报表   │
│  (配方A v1.0)│                  │  (带配方A)  │
└─────────────┘                  └─────────────┘
       │
       │ 配方更新 v1.0 → v1.1
       │
       ▼
┌─────────────┐    自动更新       ┌─────────────┐
│  工艺配方    │ ───────────────> │  生产报表   │
│  (配方A v1.1)│                  │  (同步更新) │
└─────────────┘                  └─────────────┘
```

### 14.9 完整版注意事项

1. **向后兼容**: 完整版改动不能影响 MVP 已有功能
2. **数据迁移**: 新增表需要处理存量数据
3. **平滑升级**: 支持配置开关控制功能启用/禁用
4. **性能考虑**: 大数据量时需要分表或归档策略
5. **安全增强**: 完整版需要更严格的权限校验和审计日志

---

## 十五、待补充细节

> 以下是待讨论或待确认的细节，在后续会议中补充

| 序号 | 分类 | 问题 | 状态 |
|------|------|------|------|
| 1 | | | 待讨论 |
| 2 | | | 待讨论 |
| 3 | | | 待讨论 |

---

**文档版本**: 1.5
**最后更新**: 2026-02-01
**更新内容**:
- 技术栈版本锁定（Vue 3.4.x、NestJS 10、Element Plus 2.5）
- 添加 Monorepo + packages 共享类型目录结构

**状态**: MVP开发计划已完善，开始实施
