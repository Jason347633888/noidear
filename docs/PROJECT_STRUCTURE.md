# 项目结构导航

> 文档版本: 6.0
> 最后更新: 2026-02-22
> 用途: AI Agent 快速定位文件 + 项目结构参考
> 项目状态: 全部 22 个功能模块已开发，总体完成度 **85.6%**（154/180 任务）

---

## 目录

1. [项目概览](#一项目概览)
2. [.claude AI约束配置](#二claude-ai约束配置)
3. [目录结构](#三目录结构)
4. [后端模块映射](#四后端模块映射)
5. [前端页面映射](#五前端页面映射)
6. [API 文件索引](#六api-文件索引)
7. [核心流程文件](#七核心流程文件)
8. [配置相关](#八配置相关)
9. [文档相关](#九文档相关)
10. [AI Agent 快速参考](#十ai-agent-快速参考)

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
| 搜索 | ElasticSearch 8.11+（可选，降级至 PostgreSQL LIKE） |
| 认证 | LDAP + OAuth2 SSO（ldapjs 3.0.7） |
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
| MinIO | 9000 | 对象存储 API |
| MinIO Console | 9001 | 管理界面 |
| NestJS | 3000 | 后端 API |
| Vue（Docker） | 80 | 生产前端（nginx） |
| Vue（Dev） | 5173 | 前端开发服务器 |

### 1.4 默认账号

```
用户名: admin
密码: 12345678
```

---

## 二、.claude AI约束配置

### 2.1 目录结构

```
.claude/
├── rules/
│   ├── constraints.mdc     # AI 约束清单（最高优先级）
│   ├── tech-stack.mdc      # 技术选型规范
│   ├── ui-standards.mdc    # UI 设计标准
│   ├── api-spec.mdc        # API 设计规范
│   ├── database.mdc        # 数据库规范
│   └── git-flow.mdc        # Git 提交规范
```

### 2.2 核心约束速查

**禁止的行为**：
```
❌ 更换框架（Vue 3 → React, NestJS → Express）
❌ 修改项目目录结构
❌ 硬编码密码/密钥
❌ 强制推送 Git（force push）
❌ 本地安装运行 Docker 已有的服务
```

**必须遵循**：
```
✅ 使用 Element Plus 组件库
✅ 使用 Prisma ORM
✅ 环境变量存储敏感信息
✅ 中文 commit message
✅ 所有 API 必须有 try-catch
✅ 函数 < 50 行，缩进 < 3 层
```

---

## 三、目录结构

```
noidear/
├── client/                         # 前端项目（Vue 3 + TypeScript）
│   ├── src/
│   │   ├── api/                    # API 请求封装（33 个 .ts 文件）
│   │   ├── components/             # 公共组件
│   │   │   ├── fields/             # 动态表单字段组件（20+）
│   │   │   ├── training/           # 培训相关组件
│   │   │   ├── todo/               # 待办组件
│   │   │   └── audit/              # 审计日志组件
│   │   ├── constants/              # 常量定义
│   │   ├── i18n/                   # 国际化
│   │   ├── router/                 # 路由配置（94 条路由）
│   │   ├── stores/                 # Pinia 状态管理
│   │   ├── styles/                 # 全局样式
│   │   ├── types/                  # TypeScript 类型定义
│   │   ├── utils/                  # 工具函数
│   │   └── views/                  # 页面组件（97 个 .vue 文件）
│   ├── e2e/                        # Playwright E2E 测试（30 个 spec 文件）
│   ├── Dockerfile                  # 前端 Docker 镜像
│   ├── nginx.conf                  # Nginx 配置
│   └── package.json
├── server/                         # 后端项目（NestJS + TypeScript）
│   ├── src/
│   │   ├── main.ts                 # 入口文件
│   │   ├── app.module.ts           # 根模块
│   │   ├── modules/                # 功能模块（40 个模块目录）
│   │   ├── common/                 # 公共工具（装饰器/过滤器/拦截器/管道）
│   │   └── prisma/                 # 数据库 Schema（73 个模型，1918 行）
│   ├── test/                       # 后端测试（30+ 个 spec 文件）
│   ├── Dockerfile                  # 后端 Docker 镜像
│   └── package.json
├── docs/                           # 文档目录
│   ├── DESIGN.md                   # 需求设计文档（v10.7，113 条业务规则）
│   ├── PROJECT_STRUCTURE.md        # 本文件（v6.0）
│   ├── complete-audit-report.md    # 功能审计报告（2026-02-22，第三次更新）
│   ├── INTERACTION_DESIGN.md       # 前端交互设计规范（v1.1）
│   ├── task_modules/               # 各功能模块任务详情
│   └── design_modules/             # 各功能模块设计文档
├── docker-compose.yml              # Docker Compose 配置
├── CLAUDE.md                       # AI 开发指南（v5.1）
└── README.md                       # 项目说明
```

---

## 四、后端模块映射

**路径**: `server/src/modules/`

### 4.1 MVP 核心模块（10个）

| 模块目录 | 功能 | 关键文件 |
|---------|------|---------|
| `auth/` | JWT 认证、LDAP SSO、密码管理 | `auth.service.ts`, `auth.guard.ts`, `sso.service.ts` |
| `user/` | 用户 CRUD、状态管理 | `user.service.ts`, `user.controller.ts` |
| `department/` | 组织架构、部门树 | `department.service.ts` |
| `document/` | 三级文档管理、版本控制、归档作废 | `document.service.ts`, `document.controller.ts` |
| `template/` | 四级模板、Excel 解析、动态表单 | `template.service.ts`, `excel.parser.ts` |
| `task/` | 任务派发、填报、逾期检查 | `task.service.ts`, `task.cron.ts` |
| `record/` | 记录管理、锁定、变更追踪 | `record.service.ts`, `record.controller.ts` |
| `approval/` | 单级/二级审批、审批链 | `approval.service.ts` |
| `notification/` | 站内消息、实时通知 | `notification.service.ts` |
| `role/` | 角色 CRUD、权限分配 | `role.service.ts` |

### 4.2 权限与审计（5个）

| 模块目录 | 功能 | 关键文件 |
|---------|------|---------|
| `permission/` | 权限定义、权限校验 | `permission.controller.ts` |
| `fine-grained-permission/` | 细粒度权限矩阵、有效期、审计 | `fine-grained-permission.service.ts`, `permission-audit-log.controller.ts` |
| `user-permission/` | 用户权限绑定、权限继承 | `user-permission.service.ts` |
| `department-permission/` | 部门级权限隔离配置 | `department-permission.controller.ts`, `department-permission.service.ts` |
| `audit/` | 登录/权限/敏感操作审计日志 | `audit.service.ts`, `audit.module.ts` |

### 4.3 业务扩展模块（12个）

| 模块目录 | 功能 | 关键文件 |
|---------|------|---------|
| `deviation/` | 配方偏离检测、报告生成、统计 | `deviation.service.ts` |
| `statistics/` | 综合统计、文档/任务/工作流统计 | `statistics.service.ts` |
| `export/` | 批量导出（Excel）、动态列配置 | `export.service.ts` |
| `import/` | 批量导入（Excel/CSV）、数据校验 | `import.service.ts` |
| `recycle-bin/` | 软删除管理、恢复、彻底删除、30天自动清理 | `recycle-bin.service.ts`, `recycle-bin.cron.ts` |
| `workflow/` | 工作流模板、实例、任务、条件分支 | `workflow-template.controller.ts`, `workflow-task.service.ts` |
| `batch-trace/` | 批次管理、追溯链可视化 | `batch-trace.controller.ts` |
| `warehouse/` | 仓库、物料、领料、物料平衡 | `warehouse.controller.ts` |
| `equipment/` | 设备台账、维保计划、故障报修 | `equipment.controller.ts` |
| `training/` | 培训计划、考试题库、学习记录 | `training.controller.ts` |
| `internal-audit/` | 内审计划、执行、整改、报告 | `audit-plan/`, `audit-execution/`, `report/` |
| `search/` | 全文搜索（ES + PostgreSQL 降级） | `search.service.ts` |

### 4.4 基础设施模块（13个）

| 模块目录 | 功能 |
|---------|------|
| `operation-log/` | 操作日志记录、权限审计日志 |
| `alert/` | 告警规则配置、告警历史 |
| `monitoring/` | 系统监控指标、Prometheus 集成 |
| `health/` | 健康检查、依赖服务检查 |
| `backup/` | 数据备份、恢复 |
| `i18n/` | 国际化管理、语言切换 |
| `system-config/` | 系统配置管理 |
| `redis/` | Redis 缓存服务 |
| `mobile/` | 移动端 API、离线缓存、数据同步 |
| `recommendation/` | 文档推荐（协同过滤） |
| `record-template/` | 记录模板管理、动态字段配置 |
| `todo/` | 待办事项管理 |
| `wechat/` | 微信集成、消息推送 |

---

## 五、前端页面映射

**路径**: `client/src/views/`（共 97 个 .vue 文件）

### 5.1 基础页面

| 文件 | 路由 | 说明 |
|------|------|------|
| `Login.vue` | `/login` | 登录页 |
| `login/SsoLogin.vue` | `/login/sso` | SSO 单点登录 |
| `Layout.vue` | `/` | 全局布局（侧边栏+顶栏） |
| `Dashboard.vue` | `/dashboard` | 首页仪表板 |
| `UserList.vue` | `/users` | 用户管理 |
| `NotificationList.vue` | `/notifications` | 消息通知列表 |
| `Password.vue` | `/password` | 修改密码 |
| `RecycleBin.vue` | `/recycle-bin` | 回收站 |

### 5.2 MVP 核心模块

| 目录/文件 | 路由前缀 | 说明 |
|---------|---------|------|
| `documents/Level1List.vue` | `/documents/level/1,2,3` | 三级文档列表（通过路由参数复用） |
| `documents/DocumentDetail.vue` | `/documents/:id` | 文档详情 |
| `documents/DocumentUpload.vue` | `/documents/upload` | 文档上传 |
| `templates/TemplateList.vue` | `/templates` | 模板列表 |
| `templates/TemplateEdit.vue` | `/templates/:id/edit` | 模板编辑 |
| `templates/TemplateDesigner.vue` | `/templates/:id/designer` | 拖拽表单设计器 |
| `templates/ToleranceConfig.vue` | `/templates/:id/tolerance` | 公差配置 |
| `tasks/TaskList.vue` | `/tasks` | 任务列表 |
| `tasks/TaskCreate.vue` | `/tasks/create` | 新建/派发任务 |
| `tasks/TaskDetail.vue` | `/tasks/:id` | 任务详情与填报 |
| `approvals/ApprovalPending.vue` | `/approvals/pending` | 待审批列表 |
| `approvals/ApprovalList.vue` | `/approvals` | 审批历史 |
| `approvals/ApprovalDetail.vue` | `/approvals/:id` | 审批详情 |
| `approvals/ApprovalHistory.vue` | `/approvals/history` | 审批链追踪 |
| `record/RecordList.vue` | `/records` | 记录列表 |
| `record/RecordDetail.vue` | `/records/:id` | 记录详情 |

### 5.3 权限管理

| 文件 | 路由 | 说明 |
|------|------|------|
| `role/RoleList.vue` | `/roles` | 角色管理 |
| `permission/PermissionList.vue` | `/permissions` | 权限定义列表 |
| `permission/UserPermissions.vue` | `/permissions/users` | 用户权限分配 |
| `permission/FineGrainedPermission.vue` | `/permissions/fine-grained` | 细粒度权限矩阵（344行） |
| `permission/DepartmentPermission.vue` | `/permissions/department` | 部门权限隔离（358行） |
| `permission/PermissionAuditLog.vue` | `/permissions/audit-log` | 权限审计日志（267行） |

### 5.4 业务扩展模块

| 目录 | 路由前缀 | 文件数 | 说明 |
|-----|---------|--------|------|
| `deviation/` | `/deviation` | 2 | 偏离报告、偏离分析仪表板 |
| `workflow/` | `/workflow` | 7 | 工作流模板/实例/设计器/待办/统计 |
| `batch-trace/` | `/batch-trace` | 3 | 批次列表/详情/追溯可视化 |
| `warehouse/` | `/warehouse` | 7 | 物料/供应商/领料/暂存/物料平衡/追溯 |
| `equipment/` | `/equipment` | 10 | 设备/维护计划/维保记录/报修/统计 |
| `training/` | `/training` | 10 | 培训计划/项目/档案/考试/题库/统计 |
| `internal-audit/` | `/internal-audit` | 6 | 审计计划/执行/整改/验证/报告 |
| `statistics/` | `/statistics` | 4 | 综合统计大屏/文档统计/任务统计/概览 |

### 5.5 系统运维模块

| 目录/文件 | 路由前缀 | 说明 |
|---------|---------|------|
| `monitoring/` | `/monitoring` | 监控大屏/指标/告警规则/告警历史（4个） |
| `audit/` | `/audit` | 登录日志/权限日志/敏感操作/综合搜索（4个） |
| `backup/BackupManage.vue` | `/backup` | 备份管理 |
| `health/HealthPage.vue` | `/health` | 健康检查 |
| `search/AdvancedSearch.vue` | `/search` | 全文高级搜索 |
| `admin/ExportPage.vue` | `/admin/export` | 批量数据导出 |
| `admin/ImportPage.vue` | `/admin/import` | 批量数据导入 |
| `todo/TodoList.vue` | `/todos` | 待办事项 |

---

## 六、API 文件索引

**路径**: `client/src/api/`（共 33 个 .ts 文件）

| 文件 | 对应后端模块 | 主要功能 |
|------|------------|---------|
| `request.ts` | — | axios 实例 + Token 拦截 + 401 跳转 |
| `approval.ts` | approval | 审批列表、审批操作、审批链 |
| `audit.ts` | audit | 登录/权限/敏感操作日志查询 |
| `backup.ts` | backup | 备份管理 |
| `batch.ts` | batch-trace | 批次 CRUD、追溯链查询 |
| `department.ts` | department | 部门 CRUD、部门树 |
| `deviation.ts` | deviation | 偏离报告查询 |
| `deviation-analytics.ts` | deviation | 偏离统计分析 |
| `equipment.ts` | equipment | 设备/维保计划/维保记录/故障报修 |
| `exam.ts` | training | 考试题目、考试提交 |
| `export.ts` | export | 批量导出 Excel |
| `file-preview.ts` | document | 文件预签名 URL |
| `health.ts` | health | 健康检查 |
| `i18n.ts` | i18n | 国际化文本 |
| `import.ts` | import | 批量导入 |
| `internal-audit/index.ts` | internal-audit | 内审管理（聚合导出） |
| `internal-audit/plan.ts` | internal-audit | 审计计划 |
| `internal-audit/finding.ts` | internal-audit | 审计发现/整改 |
| `internal-audit/report.ts` | internal-audit | 审计报告 |
| `monitoring.ts` | monitoring | 监控指标、告警规则 |
| `permission.ts` | permission, fine-grained-permission, user-permission | 权限管理全集 |
| `record.ts` | record | 动态表单记录管理 |
| `recycle-bin.ts` | recycle-bin | 回收站查询/恢复/删除 |
| `recommendation.ts` | recommendation | 文档推荐 |
| `role.ts` | role | 角色 CRUD |
| `search.ts` | search | 全文搜索（ES + 降级） |
| `sso.ts` | auth | LDAP + OAuth2 SSO 登录 |
| `statistics.ts` | statistics | 综合统计分析 |
| `task.ts` | task | 任务 CRUD + 派发 + 填报 |
| `todo.ts` | todo | 待办事项 |
| `training.ts` | training | 培训计划/项目/档案/统计 |
| `warehouse.ts` | warehouse | 仓库/物料/领料/物料平衡 |
| `workflow.ts` | workflow | 工作流实例 + 任务审批 |

---

## 七、核心流程文件

### 7.1 用户认证流程

```
client/src/views/Login.vue
    ↓ (用户名/密码或 SSO)
client/src/api/request.ts (axios + JWT 拦截)
    ↓
server/src/modules/auth/auth.controller.ts
    ↓
server/src/modules/auth/auth.service.ts (bcrypt 验证 + JWT 签发)
    ↓
server/src/modules/auth/strategies/jwt.strategy.ts
```

### 7.2 LDAP/SSO 认证流程

```
client/src/views/login/SsoLogin.vue
    ↓
client/src/api/sso.ts
    ↓
server/src/modules/auth/sso.service.ts (三步 LDAP + escapeLdapFilter 防注入)
    ↓
server/src/modules/auth/auth.service.ts (JWT 签发)
```

### 7.3 文档上传审批流程

```
client/src/views/documents/DocumentUpload.vue
    ↓
client/src/api/request.ts (multipart/form-data)
    ↓
server/src/modules/document/document.controller.ts (POST /documents)
    ↓
MinIO 文件存储 → PostgreSQL 记录写入
    ↓
server/src/modules/approval/approval.service.ts (创建审批记录)
    ↓
server/src/modules/notification/notification.service.ts (站内消息通知)
```

### 7.4 任务派发填报流程

```
client/src/views/tasks/TaskCreate.vue
    ↓
server/src/modules/task/task.service.ts (create)
    ↓
server/src/modules/notification/notification.service.ts (通知执行人)
    ↓
client/src/views/tasks/TaskDetail.vue (执行人填报)
    ↓
server/src/modules/record/record.service.ts (提交记录)
    ↓
server/src/modules/deviation/deviation.service.ts (偏离检测)
    ↓
server/src/modules/approval/approval.service.ts (触发审批)
```

### 7.5 工作流引擎流程

```
管理员: client/src/views/workflow/WorkflowDesigner.vue (拖拽配置)
    ↓
server/src/modules/workflow/workflow-template.controller.ts (保存配置)
    ↓
用户: client/src/views/workflow/InstanceList.vue (发起实例)
    ↓
server/src/modules/workflow/workflow-instance.controller.ts (启动)
    ↓
server/src/modules/workflow/workflow-task.service.ts (分配步骤任务)
    ↓ (超时时仅通知，不转交)
审批人: client/src/views/workflow/MyTasks.vue (审批)
    ↓
下一步骤自动推进 → 完成
```

---

## 八、配置相关

### 8.1 环境变量（server/.env）

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | PostgreSQL 连接字符串 |
| `REDIS_HOST`, `REDIS_PORT` | Redis 连接配置 |
| `JWT_SECRET` | JWT 签名密钥（512位） |
| `MINIO_*` | MinIO 连接配置 |
| `ELASTICSEARCH_NODE` | ES 节点地址（可选） |
| `LDAP_URL`, `LDAP_BASE_DN` | LDAP 服务器配置 |

### 8.2 关键配置文件

| 文件 | 用途 |
|------|------|
| `docker-compose.yml` | 服务编排（postgres/redis/minio/server/client） |
| `server/src/prisma/schema.prisma` | 数据库 Schema（73个模型，1918行） |
| `client/src/router/index.ts` | 前端路由（94条路由 + 守卫） |
| `client/nginx.conf` | 生产 Nginx 配置（API 反向代理） |
| `server/tsconfig.json` | TypeScript 配置 |
| `client/vite.config.ts` | Vite 构建配置（含代码分割优化） |

---

## 九、文档相关

### 9.1 文档索引

| 文档 | 路径 | 版本 | 说明 |
|------|------|------|------|
| 需求设计 | `docs/DESIGN.md` | v10.7 | 113 条业务规则 + P1 技术债务方案 |
| 功能审计 | `docs/complete-audit-report.md` | 第三次更新 | 22模块任务级精确核查，85.6% 完成 |
| 交互设计 | `docs/INTERACTION_DESIGN.md` | v1.1 | 7 大模块完整交互规范 |
| 项目结构 | `docs/PROJECT_STRUCTURE.md` | v6.0（本文件） | 文件导航 + 模块映射 |
| AI 指南 | `CLAUDE.md` | v5.1 | AI Agent 开发约束 + 编码预防清单 |
| README | `README.md` | v4.1 | 快速开始、功能概览 |

### 9.2 各模块任务文档

**路径**: `docs/task_modules/`

| 文件 | 说明 |
|------|------|
| `06_回收站_TASKS.md` | 回收站模块任务详情 |
| `11_P1-1_文档归档作废_TASKS.md` | P1-1 任务详情 |
| `14_动态表单引擎_TASKS.md` | 动态表单任务详情 |
| `15_批次追溯系统_TASKS.md` | 批次追溯任务详情 |
| `17_设备管理系统_TASKS.md` | 设备管理任务详情 |

---

## 十、AI Agent 快速参考

### 10.1 文件定位速查

| 关键词/需求 | 文件路径 |
|------------|---------|
| 登录逻辑 | `server/src/modules/auth/auth.service.ts` |
| JWT 策略 | `server/src/modules/auth/strategies/jwt.strategy.ts` |
| LDAP/SSO | `server/src/modules/auth/sso.service.ts` |
| 用户管理 | `server/src/modules/user/user.service.ts` |
| 数据库 Schema | `server/src/prisma/schema.prisma` |
| 文档 CRUD | `server/src/modules/document/document.service.ts` |
| 模板 Excel 解析 | `server/src/modules/template/excel.parser.ts` |
| 偏离检测逻辑 | `server/src/modules/deviation/deviation.service.ts` |
| 工作流引擎 | `server/src/modules/workflow/workflow-task.service.ts` |
| 细粒度权限 | `server/src/modules/fine-grained-permission/fine-grained-permission.service.ts` |
| 权限守卫 | `server/src/modules/permission/permission.guard.ts` |
| 回收站定时清理 | `server/src/modules/recycle-bin/recycle-bin.cron.ts` |
| 前端路由配置 | `client/src/router/index.ts` |
| 前端状态管理 | `client/src/stores/user.ts` |
| axios 封装 | `client/src/api/request.ts` |
| 全局样式 | `client/src/styles/` |
| 雪花 ID 生成 | `server/src/common/utils/snowflake.ts` |
| 异常过滤器 | `server/src/common/filters/all-exception.filter.ts` |
| 操作日志拦截器 | `server/src/common/interceptors/logging.interceptor.ts` |

### 10.2 常见开发任务定位

| 任务 | 需要修改的关键文件 |
|------|----------------|
| 添加新 API 端点 | `server/src/modules/{模块}/{模块}.controller.ts` |
| 修改数据库模型 | `server/src/prisma/schema.prisma` → 运行 `npx prisma db push` |
| 添加前端页面 | `client/src/views/{目录}/NewPage.vue` + `client/src/router/index.ts` |
| 添加前端 API 调用 | `client/src/api/{模块}.ts` |
| 修改权限逻辑 | `server/src/modules/permission/permission.guard.ts` |
| 修改审批流程 | `server/src/modules/approval/approval.service.ts` |
| 修改工作流超时 | `server/src/modules/workflow/workflow-task.service.ts` |
| 修改回收站规则 | `server/src/modules/recycle-bin/recycle-bin.cron.ts` |

### 10.3 测试文件位置

| 测试类型 | 位置 | 数量 |
|---------|------|------|
| 后端 E2E 测试 | `server/test/*.e2e-spec.ts` | 17个 |
| 后端单元测试 | `server/src/modules/**/*.spec.ts` | 20+个 |
| 前端 E2E 测试（Playwright） | `client/e2e/*.spec.ts` | 30个 |
| 前端页面单元测试 | `client/src/views/**/__tests__/*.spec.ts` | 20+个 |
| 前端组件单元测试 | `client/src/components/**/__tests__/*.spec.ts` | 12个 |
| 前端 API 集成测试 | `client/src/__tests__/*.spec.ts` | 4个 |

### 10.4 架构约束与注意事项

1. **Prisma 模型变更后必须执行**:
   ```bash
   npx prisma generate --schema=src/prisma/schema.prisma
   npx prisma db push --schema=src/prisma/schema.prisma
   ```

2. **前端新增页面必须同步路由**:
   ```typescript
   // client/src/router/index.ts
   { path: '/new-path', component: () => import('@/views/module/NewPage.vue') }
   ```

3. **API 文件使用 TypeScript**（非 JavaScript）:
   ```typescript
   // client/src/api/{module}.ts（不是 .js）
   import request from './request'
   export const getList = (params: Params) => request.get('/endpoint', { params })
   ```

4. **残留架构缺陷（勿误以为是 bug）**:
   - `RoleFineGrainedPermission` 中间表缺失：角色权限通过批量写用户权限变通实现
   - `DepartmentPermission` 存储在 `SystemConfig` 表（key = `dept_permission_{deptId}`）
   - `RecordTemplate` 缺少 `workflowConfig`/`approvalRequired` 字段（P1 待补）
   - `Record` 缺少 `workflowId` 字段（P1 待补）

---

**文档版本**: 6.0
**最后更新**: 2026-02-22
**变更内容**:
- 完整重写（原 v5.0 描述的是计划结构而非实际结构）
- 更新目录结构以反映实际已实现的 40 个后端模块、97 个前端 Vue 组件、33 个 API 文件
- 新增后端模块完整映射表（4.1~4.4）
- 新增前端页面完整映射表（5.1~5.5）
- 新增 API 文件完整索引（第六章）
- 更新核心流程文件（第七章），新增工作流引擎和 SSO 流程
- 新增测试文件位置索引（10.3）
- 新增架构约束与注意事项（10.4）
- 删除已废弃的"前端开发计划"章节（功能已全部实现）
