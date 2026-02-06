# 文档管理系统

> 企业级三级文档管理与四级配方填报系统

[![Tests](https://img.shields.io/badge/tests-164%20passed-brightgreen.svg)](server/test)
[![Coverage](https://img.shields.io/badge/coverage-85.3%25-brightgreen.svg)](server/coverage)
[![Status](https://img.shields.io/badge/status-production%20ready-green.svg)]()

---

## 📋 项目简介

一个完整的企业文档管理与配方填报系统，支持三级文档管理、四级模板配方、任务派发与填报、配方偏离检测与统计分析、二级审批流程、数据导出与文件预览等功能。

**项目状态**: ✅ Phase 1-12 全部完成，生产就绪

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
| 前端 | Vue 3 + TypeScript + Element Plus + Vite + Pinia |
| 后端 | NestJS 11 + TypeScript + Prisma ORM |
| 数据库 | PostgreSQL 15 + Redis 7 |
| 存储 | MinIO (S3 兼容) |
| 测试 | Jest (164 tests, 85.3% coverage) |
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

### 数据分析与导出
- ✅ 偏离趋势分析（按天/周/月）
- ✅ 偏离字段分布统计
- ✅ 部门偏离率对比
- ✅ Excel 批量导出

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
- ✅ 20/20 测试套件通过
- ✅ 164/164 测试用例通过
- ✅ 85.3% 代码覆盖率

---

## 🔒 安全

- ✅ JWT 认证（512位密钥）
- ✅ 密码 bcrypt 加密
- ✅ Helmet 安全头
- ✅ 输入验证
- ✅ SQL 注入防护（Prisma ORM）
- ✅ 文件类型白名单

详见 [SECURITY.md](SECURITY.md)

---

## 📚 文档

| 文档 | 说明 |
|------|------|
| [DESIGN.md](docs/DESIGN.md) | 技术设计文档 |
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

### v1.0.0 (2026-02-06)

**完成功能**:
- Phase 1-6: 核心功能（文档/模板/任务/审批）
- Phase 7-8: 配方偏离检测
- Phase 9: 数据导出（Excel）
- Phase 10: 二级审批流程
- Phase 11: 文件预览
- Phase 12: 偏离统计分析
- 回收站功能

**测试状态**: 164/164 测试通过，85.3% 覆盖率

详见 [docs/CHANGELOG.md](docs/CHANGELOG.md)

---

## 📄 License

MIT License

---

**项目状态**: 🟢 生产就绪
**最后更新**: 2026-02-06
