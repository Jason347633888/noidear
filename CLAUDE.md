# 🚨 文档管理系统 - AI Agent 指南

> **核心理念**: 规则约束**开发实现方式**（HOW），不限制**业务需求扩展**（WHAT）

> **重要**: 在开始任何开发工作之前，必须先阅读 `.claude/` 目录下的所有规则文件

---

## 🚨 AI必须遵守的核心规则（最高优先级）

### 绝对禁止 ❌
- ❌ 更换框架（Vue 3 → React, NestJS → Express）
- ❌ 修改项目目录结构
- ❌ 硬编码密码/密钥
- ❌ 强制推送 Git（force push）
- ❌ 本地安装运行 Docker 已有的服务（PostgreSQL/Redis/MinIO）

### 必须遵循 ✅
- ✅ 使用 Element Plus 组件库
- ✅ 使用 Prisma ORM（复杂查询可用 `$queryRaw`，参考 database.mdc）
- ✅ 环境变量存储敏感信息
- ✅ 中文 commit message
- ✅ 所有API必须有异常处理（try-catch）
- ✅ PostgreSQL/Redis/MinIO 必须通过 Docker 运行
- ✅ 编写代码前先描述方法并等待批准
- ✅ 修改超过3个文件先拆分任务
- ✅ 编写代码后列出潜在问题和测试方案
- ✅ 遇到错误先写测试用例再修复

### 🎯 Coding Principle（强制标准）✅
| 原则 | 具体要求 |
|------|----------|
| **Good Taste** | 消除边界优于增加判断，函数<50行，缩进<3层 |
| **Never break userspace** | 向后兼容性神圣不可侵犯 |
| **实用主义** | 先确认真问题，寻找最简方案 |
| **直接犀利** | 技术批评直接，不委婉不模糊 |

### 文件类型限制 📁
> **范围**: 仅限用户通过系统上传的业务文件，不包括开发文档（.md/.txt）

- ✅ 用户上传业务文件：仅支持 PDF、Word、Excel
- ✅ 单文件最大：10MB
- ✅ 必须上传到 MinIO（禁止存数据库）
- ✅ 开发文档：允许创建 .md、.txt 等临时文档

---

## 快速开始

1. **先读文档**: 依次阅读 `.claude/` 目录下的规则文件
2. **理解约束**: 熟悉 `rules/constraints.mdc` 的27章约束（包含Coding Principle + Docker）
3. **检查范围**: 确认你要做的功能在 MVP Phase 1-6 范围内
4. **参考设计**: 对照 `docs/` 目录下的设计文档

---

## 📋 实现前检查清单（必须逐项通过）

在实现任何功能前，AI/Agent **必须**回答以下问题：

### 技术选型检查
```
□ 1. 这个功能在 docs/DESIGN.md 需求文档中吗？
□ 2. 需要引入新库吗？
   - 允许直接引入：Vite插件、@types/*、dayjs、nanoid、@nestjs/*（参考 tech-stack.mdc）
   - 需要评估：UI组件库、大型框架库（体积 > 100KB）
□ 3. 使用的是指定框架吗？（Vue 3 / NestJS）
```

### 代码规范检查
```
□ 4. 这个UI符合 Element Plus 规范吗？
□ 5. 这个API端点在文档里吗？
□ 6. 这样改会破坏现有结构吗？
□ 7. 相同功能是否已存在公共函数/组件？
```

### 安全检查
```
□ 8. 密码/密钥硬编码了吗？
□ 9. 敏感信息写入日志了吗？
□ 10. 输入验证做了吗？
□ 11. 权限检查做了吗？
□ 12. 文件类型/大小是否限制？
```

### 代码质量检查
```
□ 13. 异常处理是否完整？
□ 14. ESLint/Prettier 能通过吗？
□ 15. 函数长度合理吗？（建议 < 50行，复杂业务逻辑允许 < 100行）
□ 16. 重复代码提取了吗？
```

### 测试检查
```
□ 17. 有对应的测试吗？（核心逻辑必须有测试）
```

### Coding Principle 检查
```
□ 18. 是否消除了边界情况？（Good Taste）
□ 19. 缩进是否避免超过3层？（Good Taste）
□ 20. 是否满足向后兼容？（Never break userspace）
□ 21. 是否验证了这是真问题？（实用主义）
```

**任何一项检查不通过，必须停止实现，先解决问题！**

---

## 技术栈清单（完整版）

> **说明**: 以下为项目实际使用的技术栈，新增库参考 tech-stack.mdc 引入流程

### 前端核心
- Vue 3.4+, Element Plus 2.5+, Vite 5.0+, Pinia 2.1+
- Vue Router 4.0+, Axios 1.6+, dayjs 1.11+, lodash-es 4.17+
- echarts 6.0+（数据可视化）, sortablejs 1.15+（拖拽排序）
- unplugin-auto-import, unplugin-vue-components（自动导入）

### 后端核心
- Node.js 18 LTS, NestJS 10+, TypeScript 5.3+
- Prisma 5.7+（ORM）, PostgreSQL 15+, Redis 7+
- xlsx 0.18+（Excel解析）, exceljs 4.4+（Excel导出）
- bcrypt 5.1+, @nestjs/jwt, @nestjs/passport（认证）
- @nestjs/throttler（限流）, @nestjs/swagger（API文档）, helmet（安全）
- minio 8.0+（对象存储客户端）

### 库引入流程
**允许直接引入**（无需确认）:
- Vite 插件：vite-plugin-*, @vitejs/*
- TypeScript 类型：@types/*
- 轻量工具库：date-fns, zod, nanoid
- NestJS 官方包：@nestjs/*

**需要评估后引入**:
- UI 组件库（Element Plus 之外）
- 大型框架级库（体积 > 100KB）
- 数据可视化库（ECharts、D3.js）

**版本管理**:
- 补丁版本（5.0.0 → 5.0.x）：✅ 允许自动升级
- 小版本（5.0.0 → 5.x.0）：⚠️ 需评估后升级
- 大版本（5.x → 6.x）：❌ 需充分测试和批准

---

## 文档索引

| 文件 | 用途 | 阅读优先级 |
|------|------|------------|
| [rules/constraints.mdc](rules/constraints.mdc) | AI实现约束清单 | 最高 |
| [rules/tech-stack.mdc](rules/tech-stack.mdc) | 技术选型规范 | 高 |
| [rules/ui-standards.mdc](rules/ui-standards.mdc) | UI设计标准 | 高 |
| [rules/api-spec.mdc](rules/api-spec.mdc) | API设计规范 | 高 |
| [rules/database.mdc](rules/database.mdc) | 数据库规范 | 中 |
| [rules/git-flow.mdc](rules/git-flow.mdc) | Git提交规范 | 中 |

## 完整文档

| 文档 | 路径 | 说明 |
|------|------|------|
| **需求设计** | `docs/DESIGN.md` | 完整功能、规则、数据模型 |
| **项目结构** | `docs/PROJECT_STRUCTURE.md` | 文件导航 + 前端开发计划 |
| **README** | `README.md` | 快速开始、访问地址 |

---

## ESLint 配置

- **前端**: @typescript-eslint + eslint-plugin-vue（TypeScript + Vue 3 规则）
- **后端**: NestJS 默认配置（标准 TypeScript 规则）
- **开发环境**: `no-console` warn, `no-unused-vars` warn
- **生产环境**: `no-console` error, `no-unused-vars` error

---

## 📚 编码预防清单

> **核心原则**：经验要在编码时回顾，而不是事后补救。每次写代码前问自己这些问题。

### 编码前自查

#### 1. Vue Router 导入检查 ✅
```typescript
// 写路由代码前先确认
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();    // Route 对象 - 只读，无 afterEach
const router = useRouter();  // Router 实例 - 有 afterEach 等方法

// 记住：路由监听用 router.afterEach，不是 route.afterEach
```

#### 2. 模块导入检查 ✅
```typescript
// 写导入前先看导出方式
import request from '@/api/request';      // 默认导出
import { request } from '@/api/request';  // 命名导出

// 原则：先看源文件怎么导出的，再写导入语句
```

#### 3. 编码后立即验证 ✅
```bash
# 每次添加新页面/组件后立即运行
npx vite build  # 构建是否通过？

# 每次添加后端 API 后立即运行
npm run build  # 后端编译是否通过？

# 每次使用 Prisma 后
npx prisma generate --schema=src/prisma/schema.prisma
```

#### 4. Worktree 环境初始化 ✅
```bash
# 创建 worktree 后立即执行
cd .worktrees/feature-name/server
npx prisma generate --schema=../server/src/prisma/schema.prisma

# 验证前后端都能构建
npx vite build && npm run build
```

#### 5. E2E 测试编码前准备 ✅
```typescript
// 使用 Chrome DevTools MCP 前
// 1. 先 take_snapshot 获取元素 UID
// 2. 页面导航后重新 take_snapshot
// 3. 用 wait_for 等待页面加载
await mcp__chrome-devtools__take_snapshot();
await mcp__chrome-devtools__click({ uid: 'xxx' });
await mcp__chrome-devtools__wait_for({ text: '目标', timeout: 5000 });
```

#### 6. API 端点选择原则 ✅
```typescript
// 问题：前端调用了 /notifications/unread-count，后端路由未生效导致 404
// 教训：
// 1. 后端添加 API 后必须重启服务验证路由生效
// 2. 优先复用已有的端点获取数据，而非依赖新端点
// 3. 宁可使用已有端点的冗余字段，也不依赖可能未生效的新端点

// 反例：调用单一路径获取单一数据
const res = await request.get('/notifications/unread-count');

// 正例：复用已有的列表端点（即使多返回一些数据）
const res = await request.get('/notifications');
unreadCount.value = res.unreadCount;
```

#### 7. 依赖安装验证原则 ✅
```typescript
// 问题：SortableJS 未安装导致页面空白
// 教训：
// 1. package.json 依赖变动必须提交
// 2. npm install 后立即验证页面正常
// 3. worktree 环境必须重新安装依赖

// 验证命令
npm install && npx vite build && # 检查是否报错
```

#### 8. 端口冲突排查原则 ✅
```typescript
// 问题：Vite 端口 5173 被占用，页面打不开
// 教训：
// 1. 启动前检查端口是否被占用
// 2. 开发时用 lsof -ti:5173 检查
// 3. 冲突时 kill 掉旧进程再启动

// 端口检查命令
lsof -ti:5173 | xargs kill -9  # 清理 5173 端口
lsof -ti:3000 | xargs kill -9  # 清理 3000 端口
```

#### 9. 动态路由参数原则 ✅
```typescript
// 问题：二级/三级文件列表复用了 Level1List.vue，但硬编码了 level=1
// 教训：
// 1. 复用组件时必须考虑参数差异，用路由参数驱动
// 2. 不要在组件内硬编码会变化的常量
// 3. 复用前先分析：哪些是共性，哪些是个性

// 反例：硬编码级别
const filterForm = reactive({ level: 1 });

// 正例：从路由读取级别
const level = computed(() => {
  const path = route.path;
  if (path.includes('/level2')) return 2;
  if (path.includes('/level3')) return 3;
  return 1;
});
```

#### 10. 前端代码修改验证原则 ✅
```typescript
// 问题：修改前端代码后，页面没变化（浏览器缓存/HMR 失效）
// 教训：
// 1. 开发模式用 Vite HMR，但需确认 HMR 正常
// 2. 构建后必须 Ctrl+Shift+R 强制刷新
// 3. 页面无变化时，先检查 Network 标签看是否加载了新 JS
// 4. 必要时清缓存：rm -rf node_modules/.vite

// 验证命令
rm -rf node_modules/.vite  # 清理 Vite 缓存
npx vite build  # 重新构建验证
```

#### 11. 数据库用户数据损坏排查原则 ✅
```typescript
// 问题：文档列表偶发不显示，登录一直失败
// 排查过程：
// 1. curl 测试 API 返回 401 → Token 获取失败
// 2. curl 测试登录返回 "用户名或密码错误"
// 3. 登录逻辑确认 bcrypt.compare 返回 false
// 4. Prisma Studio 查询发现 admin 用户存在，密码哈希长度为 60（正常）
// 5. 直接在 Node.js 中对比 bcrypt 哈希，发现不匹配
// 6. 最终发现数据库中有两个 admin 用户（UUID 格式 vs Snowflake 格式）
// 7. 真正的 admin 密码哈希已损坏

// 教训：
// 1. 先用 curl 测试 API，排除前端问题
// 2. 登录失败时检查数据库是否有重复用户
// 3. 密码哈希损坏时直接用 bcrypt 重新生成并更新数据库
// 4. 使用 Prisma Studio 或 SQL 查询确认用户状态

// 修复命令
node -e "
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
bcrypt.hash('12345678', 10).then(async (hash) => {
  const user = await prisma.user.findFirst({ where: { username: 'admin' } });
  if (user) {
    await prisma.user.update({ where: { id: user.id }, data: { password: hash } });
    console.log('Password reset:', user.username);
  }
});
"
```

#### 12. Vue 组件路由复用不刷新数据原则 ✅
```typescript
// 问题：一级/二级/三级文件列表复用 Level1List.vue，切换路由后数据不更新
// 原因：
// 1. onMounted 只在组件首次挂载时执行
// 2. 路由切换时组件被复用，不会重新触发 onMounted
// 3. 之前的修复用 computed level 解决，但 watch 没加

// 教训：
// 1. 路由复用组件时，必须用 watch 监听路由参数变化
// 2. computed 只解决"读取值"问题，不解决"重新请求"问题
// 3. 任何依赖路由参数的异步操作，都需要 watch 触发

// 正解：
import { watch } from 'vue';

onMounted(() => {
  fetchData();
});

// 监听路由变化，重新获取数据
watch(level, () => {
  pagination.page = 1;
  fetchData();
});
```

#### 13. 文档版本更新同步原则 ✅
```bash
# 问题：更新 DESIGN.md 版本后，其他文档未同步更新
# 教训：
# 1. DESIGN.md 版本变更必须同步更新 4 个文档
# 2. 业务规则数量变更必须同步到 README.md
# 3. 重大变更必须创建 UPDATE_SUMMARY 文档

# DESIGN.md 版本更新检查清单
# ✅ DESIGN.md 版本号已更新（如 v10.6 → v10.7）
# ✅ DESIGN.md 第 22.6 章版本历史表已更新
# ✅ CHANGELOG.md 新增版本记录（含更新动机、项目状态）
# ✅ README.md 项目状态更新（业务规则数量、技术债务状态）
# ✅ README.md 文档表更新（DESIGN.md 描述版本号）
# ✅ UPDATE_SUMMARY_YYYY-MM-DD_vX.md 已创建（详细说明变更内容）
```

#### 14. P1 技术债务方案完整性原则 ✅
```bash
# 问题：技术债务方案不完整，开发时需要额外设计
# 教训：
# 1. P1 技术债务必须提供"完整可执行方案"，而非仅识别问题
# 2. 每个方案必须包含 6 个组成部分（缺一不可）
# 3. 必须提供时间估算（如 P1-1: 2-3h）

# P1 技术债务完整方案检查清单
# ✅ Prisma Schema 完整定义（字段、类型、关系、索引、约束）
# ✅ 后端 API 完整设计（请求体、响应体、错误码、业务规则引用）
# ✅ 业务规则补充（新增 BR-XXX，系统化编号）
# ✅ 前端 UI 完整设计（ASCII 布局图、按钮位置、对话框流程）
# ✅ 代码示例（Vue 3 + Element Plus，可直接复制）
# ✅ 实施检查清单（后端 API → 数据库 → 前端 → 测试 → 文档）
# ✅ 时间估算（开发 + 测试总时长）

# 验证命令
# 检查 DESIGN.md 第 22.2 章是否包含上述 6 个部分
```

#### 15. 业务规则扩展与编号原则 ✅
```bash
# 问题：新增业务规则编号混乱，难以追溯
# 教训：
# 1. 业务规则编号必须连续递增（BR-346 → BR-347 → ...）
# 2. 每个 P1 技术债务至少需要 3-6 条业务规则
# 3. 业务规则数量变更必须同步到 README.md

# 业务规则扩展流程
# 1. 查看 DESIGN.md 第 5 章，确认当前最大编号（如 BR-345）
# 2. 新增规则从下一个编号开始（BR-346, BR-347, ...）
# 3. 更新 README.md 业务规则总数（如 104 → 113）
# 4. 在 DESIGN.md 第 22.2 章的方案中引用新规则

# 业务规则命名规范
# BR-XXX: [功能领域] + [规则类型]
# 示例：BR-346: 文档归档规则
# 示例：BR-349: 权限定义规则
# 示例：BR-354: 工作流模板规则
```

#### 16. UPDATE_SUMMARY 文档创建原则 ✅
```bash
# 问题：CHANGELOG.md 和 UPDATE_SUMMARY 的区别不清晰
# 教训：
# 1. CHANGELOG.md 是永久版本历史（所有开发者）
# 2. UPDATE_SUMMARY 是临时详细说明（当前团队，可在 1-2 个月后删除）
# 3. 重大变更（如 P1 技术债务方案）必须创建 UPDATE_SUMMARY

# UPDATE_SUMMARY 创建时机
# ✅ P1 技术债务完整方案完成时
# ✅ 业务规则大量扩展时（如新增 10+ 条规则）
# ✅ 文档结构重大调整时（如新增整章内容）

# UPDATE_SUMMARY 命名规范
# UPDATE_SUMMARY_YYYY-MM-DD_vX.md
# 示例：UPDATE_SUMMARY_2026-02-13_v3.md

# UPDATE_SUMMARY 必须包含
# ✅ 更新概览（核心变更、业务规则扩展）
# ✅ 详细方案（每个 P1 债务的 6 个组成部分）
# ✅ 实施优先级建议
# ✅ 验收标准
# ✅ 后续步骤
```

#### 17. 技术方案代码示例质量原则 ✅
```bash
# 问题：代码示例不完整，开发时无法直接使用
# 教训：
# 1. 代码示例必须是"可直接复制使用"的完整代码
# 2. 必须包含 import、类型定义、错误处理
# 3. 必须符合 Vue 3 Composition API + Element Plus 规范

# 代码示例完整性检查清单
# ✅ 包含 <template> 和 <script setup> 完整结构
# ✅ 包含 import 语句（ElMessage, ElMessageBox, API 函数）
# ✅ 包含类型定义（ref, reactive, TypeScript 类型）
# ✅ 包含错误处理（try-catch + ElMessage.error）
# ✅ 包含表单验证（rules + ElForm）
# ✅ 符合 Element Plus 组件使用规范

# 代码示例模板（对话框 + 表单提交）
# 1. 声明响应式变量（dialogVisible, form, rules）
# 2. 定义提交函数（handleSubmit + try-catch）
# 3. API 调用 + 成功/失败提示
# 4. 关闭对话框 + 刷新列表
```

---

### 问题排查流程

1. **页面空白/白屏** → 浏览器控制台看错误
   - 模块导入错误 → 检查 export 方式（默认vs命名）
   - 依赖缺失 → npm install 补全依赖

2. **API 404/500** → curl 测试后端路由
   - 路由未生效 → 重启后端服务
   - 端点不存在 → 复用已有端点

3. **构建失败** → 检查 `vite build` / `npm run build`
4. **运行时错误** → 检查浏览器控制台 `list_console_messages`
5. **路由错误** → 检查 `router.afterEach` vs `route.afterEach`
6. **导入错误** → 检查导出方式是默认还是命名
7. **Prisma 错误** → 运行 `npx prisma generate`
8. **端口被占用** → `lsof -ti:5173` / `lsof -ti:3000`

---

### 调试命令速查

```bash
# 清理并重启前端
lsof -ti:5173 | xargs kill -9 && npx vite --host 0.0.0.0 --port 5173

# 重启后端
lsof -ti:3000 | xargs kill -9 && npm run start:prod

# Prisma 生成
npx prisma generate --schema=src/prisma/schema.prisma

# 构建验证
npx vite build && npm run build
```

---

**重要**：每次编码前回顾这份清单，问题在写代码时就能避免，而不是测试时才发现。


---

**文档版本**: 5.0
**最后更新**: 2026-02-13
**变更**: 新增 5 个编码预防清单（文档版本同步、P1 技术债务方案完整性、业务规则扩展、UPDATE_SUMMARY 创建、代码示例质量）

**项目状态**:
- MVP Phase 1-6: 完成 98.1%（51/52 Issue）
- Phase 7-12: 部分完成（Phase 7-9, 12 已实现）
- 技术债务: 3 个 P1 问题已有完整技术方案（P1-1 归档/作废、P1-2 权限系统、P1-3 工作流引擎）

**相关文档**:
- [完整需求设计](docs/DESIGN.md) - 文档版本 10.7（113 条业务规则）
- [项目结构导航](docs/PROJECT_STRUCTURE.md) - 文档版本 5.0
- [变更日志](docs/CHANGELOG.md) - 记录版本变更
- [项目 README](README.md) - 文档版本 4.1
