# 文档管理系统

> **项目状态**: 开发计划已完善，开始实施
> **最后更新**: 2026-02-01
> **文档版本**: 2.1

> **MVP范围**: Phase 1-6（52个Issue）
> **扩展范围**: Phase 7-14（预留）

---

## 快速开始

### 环境要求

| 软件 | 最低版本 | 检查命令 |
|------|----------|----------|
| Docker | 24.0 | `docker --version` |
| Docker Compose | 2.20 | `docker compose version` |
| Node.js | 18.0 | `node --version` |

### 启动步骤

```bash
# 1. 进入项目目录
cd /Users/jiashenglin/Desktop/好玩的项目/noidear

# 2. 启动所有服务
docker compose up -d

# 3. 安装后端依赖并初始化数据库
cd server
npm install
npx prisma migrate dev --name init
npm run start:dev

# 4. 安装前端依赖并启动
cd ../client
npm install
npm run dev
```

### 访问地址

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost:5173 |
| 后端API | http://localhost:3000 |
| MinIO控制台 | http://localhost:9001 |

### 默认账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |

---

## 项目概览

### 核心功能

- **四级文档管理**: 一级管理手册、二级程序文件、三级作业指导书、四级记录表单
- **文档审批流程**: 上传 → 提交审批 → 通过/驳回 → 发布
- **四级模板管理**: Excel上传解析、拖拽表单构建、模板复制
- **任务分发**: 发给部门、在线填写、第一人提交锁定
- **用户权限**: 用户管理、部门管理、角色管理

### 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端 | Vue 3 + Element Plus + Vite + Pinia | ^3.4.0 / ^2.5.0 / ^5.0.0 / ^2.1.0 |
| 后端 | Node.js + NestJS + TypeScript + Prisma | >=18.0 / ^10.0.0 / ^5.3.0 / ^5.7.0 |
| 数据库 | PostgreSQL + Redis | >=15.0 / >=7.0 |
| 文件存储 | MinIO | Latest |
| 部署 | Docker + Docker Compose | >=24.0 / >=2.20 |

---

## 文档索引

| 文档 | 说明 |
|------|------|
| [README](README.md) | 本文件，项目总览 |
| [docs/DESIGN.md](docs/DESIGN.md) | 完整需求设计文档 |
| [docs/TEST-CASES.md](docs/TEST-CASES.md) | 548个测试用例 |
| [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) | 项目结构导航 |

---

## 常用命令

```bash
# Docker
docker compose up -d           # 启动服务
docker compose down           # 停止服务
docker compose logs -f server  # 查看后端日志

# 后端
cd server
npm install          # 安装依赖
npm run start:dev    # 开发启动
npm run build        # 构建

# 前端
cd client
npm install          # 安装依赖
npm run dev          # 开发启动
npm run build        # 构建
```

---

**文档版本**: 2.1
**最后更新**: 2026-02-01
**更新内容**: 添加MVP范围说明、52个Issue清单
