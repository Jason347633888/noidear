# 🚨 文档管理系统 - AI Agent 指南

> **重要**: 在开始任何开发工作之前，必须先阅读 `.claude/` 目录下的所有规则文件

---

## 🚨 AI必须遵守的核心规则（最高优先级）

### 绝对禁止 ❌
- ❌ 引入未在文档中列出的库
- ❌ 更换框架（Vue 3 → React, NestJS → Express）
- ❌ 修改项目目录结构
- ❌ 添加MVP范围外的功能（Phase 7-14）
- ❌ 硬编码密码/密钥
- ❌ 强制推送 Git（force push）

### 必须遵循 ✅
- ✅ 使用 Element Plus 组件库
- ✅ 使用 Prisma ORM（禁止裸SQL）
- ✅ 使用文档中的API端点
- ✅ 按 Prisma Schema 创建数据表
- ✅ 环境变量存储敏感信息
- ✅ 中文 commit message
- ✅ 所有API必须有异常处理（try-catch）

### 🎯 Coding Principle（强制标准）✅
| 原则 | 具体要求 |
|------|----------|
| **Good Taste** | 消除边界优于增加判断，函数<50行，缩进<3层 |
| **Never break userspace** | 向后兼容性神圣不可侵犯 |
| **实用主义** | 先确认真问题，寻找最简方案 |
| **直接犀利** | 技术批评直接，不委婉不模糊 |

### 文件类型限制 📁
- ✅ 仅支持：PDF、Word、Excel
- ✅ 单文件最大：10MB
- ✅ 必须上传到 MinIO（禁止存数据库）

---

## 快速开始

1. **先读文档**: 依次阅读 `.claude/` 目录下的规则文件
2. **理解约束**: 熟悉 `rules/constraints.mdc` 的26章约束（包含Coding Principle）
3. **检查范围**: 确认你要做的功能在 MVP Phase 1-6 范围内
4. **参考设计**: 对照 `docs/` 目录下的设计文档

---

## 📋 实现前检查清单（必须逐项通过）

在实现任何功能前，AI/Agent **必须**回答以下问题：

### 技术选型检查
```
□ 1. 这个功能在 MVP Phase 1-6 范围内吗？
□ 2. 这个库在技术栈清单里吗？（前端：dayjs/lodash-es；后端：xlsx/bcrypt/jsonwebtoken）
□ 3. 这个框架是文档中指定的框架吗？（Vue 3 / NestJS）
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
□ 15. 函数长度 < 50行吗？
□ 16. 重复代码提取了吗？
```

### 测试检查
```
□ 17. 有对应的测试吗？（核心逻辑必须有测试）
```

### Coding Principle 检查
```
□ 18. 是否消除了边界情况？（Good Taste）
□ 19. 缩进是否超过3层？（Good Taste）
□ 20. 是否满足向后兼容？（Never break userspace）
□ 21. 是否验证了这是真问题？（实用主义）
□ 22. 沟通是否直接犀利？（沟通风格）
```

**任何一项检查不通过，必须停止实现，先解决问题！**

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
| **测试用例** | `docs/TEST-CASES.md` | 548个测试用例 |
| **项目结构** | `docs/PROJECT_STRUCTURE.md` | 文件导航 + 前端开发计划 |
| **README** | `README.md` | 快速开始、访问地址 |

## 关键约束（必读）

### 绝对禁止
- ❌ 引入未在文档中列出的库
- ❌ 更换框架（Vue 3 → React）
- ❌ 修改项目目录结构
- ❌ 添加MVP范围外的功能
- ❌ 硬编码密码/密钥

### 必须遵循
- ✅ 使用 Element Plus 组件库
- ✅ 使用文档中的API端点
- ✅ 按 Prisma Schema 创建数据表
- ✅ 环境变量存储敏感信息
- ✅ 中文 commit message

## 检查清单

实现前回答：

```
1. 功能在 MVP Phase 1-6 范围内？
2. 库在技术栈清单里？
3. UI 用 Element Plus？
4. API 端点在文档里？
5. 密码用环境变量？
```

## 禁止的行为

见 [rules/constraints.mdc](rules/constraints.mdc)

---

**项目状态**: 需求确认完成，准备实施
**文档版本**: 2.0
