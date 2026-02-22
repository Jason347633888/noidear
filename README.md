# 文档管理系统

> 企业级三级文档管理与四级配方填报系统

[![Tests](https://img.shields.io/badge/tests-164%20passed-brightgreen.svg)](server/test)
[![Coverage](https://img.shields.io/badge/coverage-85.3%25-brightgreen.svg)](server/coverage)
[![Status](https://img.shields.io/badge/status-production%20ready-green.svg)]()

---

## 📋 项目简介

一个完整的企业文档管理与配方填报系统，支持三级文档管理、四级模板配方、任务派发与填报、配方偏离检测与统计分析、二级审批流程、数据导出与文件预览、**灵活工作流引擎**等功能。

**项目状态** _(最后更新: 2026-02-22，详见 [docs/complete-audit-report.md](docs/complete-audit-report.md))_:
- ✅ 全部 22 个功能模块（TASK-001~402）已开发，总体完成度 **85.6%**（154/180 任务）
- ✅ MVP 模块 01~10：核心业务功能全部交付
- ✅ 高级模块 14~22：培训/内审/移动端/监控/高级功能全部交付
- ✅ 真实 ElasticSearch 集成（TASK-401）+ 真实 LDAP 认证（TASK-402）
- ✅ 安全加固：LDAP 注入防护、XSS 防护、ES 竞态修复
- ✅ 业务规则：113 条（BR-1.1 ~ BR-1.60, BR-281 ~ BR-359）
- ⚠️ **待补全**: P1-2 细粒度权限系统（TASK-239~252）
- ⚠️ **待补全**: 前端 E2E 测试（Playwright，覆盖率约 10%）

---

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- Docker & Docker Compose
- PostgreSQL 15（Docker）
- Redis 7（Docker）
- MinIO（Docker）

### 启动步骤

```bash
# 1. 启动 Docker 服务
docker compose up -d

# 2. 安装后端依赖
cd server
npm install
npx prisma generate --schema=src/prisma/schema.prisma
npx prisma db push --schema=src/prisma/schema.prisma

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 设置 JWT_SECRET 等配置

# 4. 启动后端
npm run start:dev

# 5. 安装并启动前端（新终端）
cd ../client
npm install
npm run dev
```

### 访问地址

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost:5173 |
| 后端 API | http://localhost:3000 |
| MinIO 控制台 | http://localhost:9001 |

### 默认账号

```
用户名: admin
密码: 12345678
```

---

## 📦 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3.4+ + TypeScript + Element Plus 2.5+ + Vite 5.0+ + Pinia 2.1+ + echarts 6.0+ + sortablejs 1.15+ |
| 后端 | Node.js 18 + NestJS 10+ + TypeScript 5.3+ + Prisma 5.7+ |
| 数据库 | PostgreSQL 15+ + Redis 7+ |
| 存储 | MinIO 8.0+ (S3 兼容) |
| 工具库 | exceljs 4.4+ + @nestjs/swagger 7.1+ + helmet 8.1+ + bcrypt 5.1+ |
| 搜索 | ElasticSearch 8.11+（可选，降级至 PostgreSQL LIKE） |
| 认证 | LDAP + OAuth2 SSO（ldapjs 3.0.7） |
| 测试 | Jest（后端 E2E 15 套件，覆盖率 ~85%） |
| 部署 | Docker + Docker Compose |

---

## 🎯 核心功能

### 文档管理
- ✅ 三级文档分类（一级/二级/三级）
- ✅ 文档上传（PDF/Word/Excel，最大10MB）
- ✅ 版本控制与历史记录
- ✅ 审批流程与通知
- ✅ 在线预览（PDF）
- ✅ 回收站

### 配方模板与任务
- ✅ 四级模板配置
- ✅ 动态字段定义
- ✅ 公差设置（范围/百分比）
- ✅ 任务派发与填报
- ✅ 配方偏离检测
- ✅ 偏离报告生成

### 审批流程
- ✅ 单级审批（文档）
- ✅ 二级审批（偏离任务：主管 → 经理）
- ✅ 审批记录追溯

### 工作流引擎（v1.1.0 新增）

- ✅ **灵活配置**：通过 JSON 或 UI 可视化配置工作流
- ✅ **多样化步骤**：支持三级文档和四级表单混合编排
- ✅ **智能审批**：自动分配审批人，支持并行审批和条件分支
- ✅ **版本管理**：工作流配置支持版本控制和回滚
- ✅ **统计分析**：工作流执行效率和瓶颈分析
- ✅ **高级功能**：子工作流、超时处理、审批人代理

#### 快速开始工作流

**1. 配置工作流**（管理员）
```bash
访问 http://localhost:5173/workflows
点击"新建工作流" → 进入可视化设计器
拖拽添加步骤 → 配置模板和审批规则 → 保存
```

**2. 启动工作流**（普通用户）
```bash
访问 http://localhost:5173/workflows
点击"发起工作流" → 选择工作流类型 → 填写名称 → 启动
```

**3. 执行工作流**
```bash
进入工作流详情页
按步骤提交文档或填写表单
等待审批通过 → 自动进入下一步
```

详见 [docs/WORKFLOW_CONFIG.md](docs/WORKFLOW_CONFIG.md)

### 数据分析与导出
- ✅ 偏离趋势分析（按天/周/月）
- ✅ 偏离字段分布统计
- ✅ 部门偏离率对比
- ✅ Excel 批量导出

### 高级功能（v2.0 新增）
- ✅ 全文搜索（ElasticSearch + PostgreSQL 降级）
- ✅ 文档推荐（协同过滤算法）
- ✅ SSO 单点登录（LDAP 三步认证 + OAuth2）
- ✅ 批量导入（Excel/CSV）
- ✅ 国际化（i18n 动态切换）
- ✅ 系统运维监控（Prometheus + Grafana + 告警）
- ✅ 备份管理
- ✅ 内审管理系统
- ✅ 培训管理系统
- ✅ 移动端适配

### 系统管理
- ✅ 用户管理（RBAC）
- ✅ 组织架构
- ✅ 操作日志
- ✅ 通知系统

---

## 🏗️ 项目结构

```
noidear/
├── server/                 # 后端服务
│   ├── src/
│   │   ├── modules/       # 功能模块
│   │   ├── prisma/        # 数据库 Schema
│   │   └── common/        # 公共工具
│   └── test/              # 测试文件
├── client/                # 前端应用
│   ├── src/
│   │   ├── views/         # 页面组件
│   │   ├── components/    # 通用组件
│   │   └── api/           # API 接口
├── docs/                  # 项目文档
├── docker-compose.yml     # Docker 配置
└── .env.example          # 环境变量模板
```

详见 [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md)

---

## 🧪 测试

```bash
cd server

# 运行所有测试
npm test

# 测试覆盖率
npm run test:cov
```

**测试状态**:
- ✅ 后端 E2E：15 个测试套件（alert/audit/backup/deviation/document/export/health/monitoring/permission/recycle-bin/role/statistics/task/training + load spec）
- ✅ 后端覆盖率：核心业务逻辑 ~95%，API 端点 ~85%
- ⚠️ 前端单元测试：~50% 覆盖
- ❌ 前端 E2E（Playwright）：~10% 覆盖（待补全）

---

## 🔒 安全

- ✅ JWT 认证（512位密钥）
- ✅ 密码 bcrypt 加密
- ✅ Helmet 安全头
- ✅ 输入验证
- ✅ SQL 注入防护（Prisma ORM）
- ✅ LDAP 注入防护（escapeLdapFilter）
- ✅ XSS 防护（搜索结果 HTML 转义）
- ✅ 文件类型白名单
- ✅ 全局限流（ThrottlerGuard 100 req/min）

详见 [SECURITY.md](SECURITY.md)

---

## 📚 文档

| 文档 | 说明 |
|------|------|
| [DESIGN.md](docs/DESIGN.md) | 技术设计文档（v10.7，113条业务规则 + P1技术债务完整方案） |
| [complete-audit-report.md](docs/complete-audit-report.md) | **完整功能审计报告（2026-02-22，22模块任务级核查）** |
| [INTERACTION_DESIGN.md](docs/INTERACTION_DESIGN.md) | 前端交互设计规范（v1.1） |
| [PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) | 项目结构详解 |
| [CHANGELOG.md](docs/CHANGELOG.md) | 版本变更日志 |
| [CLAUDE.md](CLAUDE.md) | AI 开发指南 |
| [SECURITY.md](SECURITY.md) | 安全说明 |

---

## 🛠️ 开发

### 提交规范

```bash
feat: 新功能
fix: 修复bug
docs: 文档更新
refactor: 重构
test: 测试
chore: 构建/工具变动
```

### 常用命令

```bash
# Docker
docker compose up -d           # 启动服务
docker compose down           # 停止服务
docker compose logs -f        # 查看日志

# 后端
cd server
npm install                   # 安装依赖
npm run start:dev            # 开发启动
npm run build                # 构建
npm test                     # 测试

# 前端
cd client
npm install                  # 安装依赖
npm run dev                  # 开发启动
npm run build                # 构建
```

---

## 📝 更新日志

### v1.0.3 (2026-02-13) - 文档完善版本

**重大更新**:
- ✅ DESIGN.md v10.5 → v10.6
  - 新增 MVP 实现状态追踪（Phase 1-6 完成度 98.1%）
  - 新增现有技术栈总结（Vue 3 + Element Plus + NestJS + Prisma）
  - 新增增量开发指导（新功能集成检查清单）
  - 新增数据库迁移策略（Prisma Schema 更新步骤）
  - 新增前后端集成测试清单
  - 新增集成失败常见问题排查
  - 新增代码复用指南
- ✅ INTERACTION_DESIGN.md v1.0 → v1.1
  - 新增 UI 状态管理规范（Loading/Error/Empty/Skeleton）
  - 新增快捷键支持（全局/表格/对话框快捷键）
  - 新增动画与过渡效果（页面切换/列表项/对话框/加载动画）
  - 新增可访问性规范（ARIA 属性/键盘导航/屏幕阅读器/色盲友好）
  - 新增异常处理规范（网络异常/表单验证/权限不足/数据冲突）
  - 新增响应式设计规范（断点定义/桌面端布局/表格表单响应式）

**更新动机**:
- 基于 MVP 已完成 98.1% 的事实，补充实现状态追踪
- 为后续增量开发提供明确的集成指导
- 完善前端交互设计的细节规范，覆盖所有 UI/UX 场景

### v1.0.2 (2026-02-13) - 交互设计完成版本

**重大更新**:
- ✅ 完成前端交互设计规范文档（INTERACTION_DESIGN.md）
  - 7大模块完整交互规范（文档、模板、任务、审批、权限、回收站、通知）
  - 每个模块包含页面布局、按钮设计、交互流程、状态映射
  - Element Plus 组件使用规范
- ✅ 补充 18 条前端 UI/UX 业务规则（BR-328 ~ BR-345）
  - 审批流程可视化（BR-328 ~ BR-330）
  - 表格操作列设计（BR-337 ~ BR-338）
  - 状态标签可视化（BR-341 ~ BR-342）
  - 菜单权限动态显示（BR-334 ~ BR-336）
  - 表单分组布局（BR-339 ~ BR-340）
  - 对话框尺寸规范（BR-343）
  - 操作反馈规范（BR-344 ~ BR-345）
- ✅ 更新 DESIGN.md 到 v10.5 版本（104条业务规则完整）

**技术参考**:
- 参考 SPMS-Web 优秀设计模式
- 符合 Material Design / Apple HIG 设计规范

### v1.0.1 (2026-02-13) - 文档对齐版本

**文档更新**:
- 对齐所有文档版本号和项目状态
- 补充完整技术栈信息（echarts, sortablejs, exceljs等）
- 明确技术债务状态（3个P1问题待实施）
- 同步 DESIGN.md v10.1 业务规则细化

### v1.0.0 (2026-02-06)

**完成功能**:
- Phase 1-6: 核心功能（文档/模板/任务/审批）
- Phase 7-8: 配方偏离检测（已实现）
- Phase 9: 数据导出（Excel，已实现）
- Phase 10: 二级审批流程（设计完成）
- Phase 11: 文件预览（设计完成）
- Phase 12: 偏离统计分析（已实现）
- 回收站功能

**测试状态**: 164/164 测试通过，85.3% 覆盖率

详见 [docs/CHANGELOG.md](docs/CHANGELOG.md)

---

## 📄 License

MIT License

---

**项目状态**: 🟢 设计完成，准备开发（MVP 98.1% + 交互设计 100% + 增量开发指导完成）
**文档版本**: 4.1
**最后更新**: 2026-02-13
