# API 索引

> **来源**: DESIGN.md 各章节  
> **文档版本**: 1.0  
> **最后更新**: 2026-02-14  
> **API 数量**: 约 150+ 个端点  
> **API 版本**: v1

---

## 目录

- [1. 认证与授权 API](#1-认证与授权-api)
- [2. 文档管理 API](#2-文档管理-api)
- [3. 模板管理 API](#3-模板管理-api)
- [4. 记录管理 API](#4-记录管理-api)
- [5. 批次追溯 API](#5-批次追溯-api)
- [6. 工作流 API](#6-工作流-api)
- [7. 权限管理 API](#7-权限管理-api)
- [8. 审计日志 API](#8-审计日志-api)
- [9. 通知系统 API](#9-通知系统-api)
- [10. 用户管理 API](#10-用户管理-api)
- [11. 部门管理 API](#11-部门管理-api)
- [12. 文件上传 API](#12-文件上传-api)

---

## 1. 认证与授权 API

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/api/v1/auth/login` | 用户登录 | 公开 |
| POST | `/api/v1/auth/logout` | 用户登出 | 已认证 |
| POST | `/api/v1/auth/refresh` | 刷新 Token | 已认证 |
| GET | `/api/v1/auth/me` | 获取当前用户信息 | 已认证 |
| PUT | `/api/v1/auth/password` | 修改密码 | 已认证 |

---

## 2. 文档管理 API

### 2.1 一级文件（质量手册）

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/v1/documents/level1` | 查询一级文件列表 | document:view |
| GET | `/api/v1/documents/level1/:id` | 查询一级文件详情 | document:view |
| POST | `/api/v1/documents/level1` | 创建一级文件 | document:create |
| PUT | `/api/v1/documents/level1/:id` | 更新一级文件 | document:edit |
| DELETE | `/api/v1/documents/level1/:id` | 删除一级文件 | document:delete |
| POST | `/api/v1/documents/level1/:id/submit` | 提交审批 | document:submit |
| POST | `/api/v1/documents/level1/:id/approve` | 审批通过 | document:approve |
| POST | `/api/v1/documents/level1/:id/reject` | 审批驳回 | document:approve |
| POST | `/api/v1/documents/level1/:id/publish` | 发布文档 | document:publish |
| POST | `/api/v1/documents/level1/:id/archive` | 归档文档 | document:archive |
| POST | `/api/v1/documents/level1/:id/obsolete` | 作废文档 | document:obsolete |
| POST | `/api/v1/documents/level1/:id/restore` | 恢复文档 | document:restore |
| GET | `/api/v1/documents/level1/:id/history` | 查询版本历史 | document:view |
| GET | `/api/v1/documents/level1/:id/download` | 下载文件 | document:download |

### 2.2 二级文件（SOP）

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/v1/documents/level2` | 查询二级文件列表 | document:view |
| GET | `/api/v1/documents/level2/:id` | 查询二级文件详情 | document:view |
| POST | `/api/v1/documents/level2` | 创建二级文件 | document:create |
| PUT | `/api/v1/documents/level2/:id` | 更新二级文件 | document:edit |
| DELETE | `/api/v1/documents/level2/:id` | 删除二级文件 | document:delete |
| POST | `/api/v1/documents/level2/:id/submit` | 提交审批 | document:submit |
| POST | `/api/v1/documents/level2/:id/approve` | 审批通过 | document:approve |
| POST | `/api/v1/documents/level2/:id/reject` | 审批驳回 | document:approve |
| POST | `/api/v1/documents/level2/:id/publish` | 发布文档 | document:publish |

### 2.3 三级文件（WI）

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/v1/documents/level3` | 查询三级文件列表 | document:view |
| GET | `/api/v1/documents/level3/:id` | 查询三级文件详情 | document:view |
| POST | `/api/v1/documents/level3` | 创建三级文件 | document:create |
| PUT | `/api/v1/documents/level3/:id` | 更新三级文件 | document:edit |
| DELETE | `/api/v1/documents/level3/:id` | 删除三级文件 | document:delete |

### 2.4 文档通用操作

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/v1/documents` | 查询所有文档（支持筛选） | document:view |
| GET | `/api/v1/documents/:id` | 查询文档详情 | document:view |
| GET | `/api/v1/documents/:id/preview` | 预览文档（PDF） | document:view |
| POST | `/api/v1/documents/export` | 批量导出文档 | document:export |
| GET | `/api/v1/documents/stats` | 文档统计信息 | document:view |

---

## 3. 模板管理 API

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/v1/templates` | 查询模板列表 | template:view |
| GET | `/api/v1/templates/:id` | 查询模板详情 | template:view |
| POST | `/api/v1/templates` | 创建模板 | template:create |
| PUT | `/api/v1/templates/:id` | 更新模板 | template:edit |
| DELETE | `/api/v1/templates/:id` | 删除模板 | template:delete |
| POST | `/api/v1/templates/:id/duplicate` | 复制模板 | template:create |
| POST | `/api/v1/templates/:id/fields` | 添加字段 | template:edit |
| PUT | `/api/v1/templates/:id/fields/:fieldId` | 更新字段 | template:edit |
| DELETE | `/api/v1/templates/:id/fields/:fieldId` | 删除字段 | template:edit |
| GET | `/api/v1/templates/:id/preview` | 预览模板 | template:view |

---

## 4. 记录管理 API

### 4.1 记录 CRUD

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/v1/records` | 查询记录列表 | record:view |
| GET | `/api/v1/records/:id` | 查询记录详情 | record:view |
| POST | `/api/v1/records` | 创建记录 | record:create |
| PUT | `/api/v1/records/:id` | 更新记录 | record:edit |
| DELETE | `/api/v1/records/:id` | 删除记录 | record:delete |
| POST | `/api/v1/records/:id/submit` | 提交记录 | record:submit |
| POST | `/api/v1/records/:id/signature` | 电子签名 | record:sign |

### 4.2 记录审批

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/api/v1/records/:id/approve` | 审批通过 | record:approve |
| POST | `/api/v1/records/:id/reject` | 审批驳回 | record:approve |
| GET | `/api/v1/records/:id/approval-history` | 查询审批历史 | record:view |

### 4.3 记录修改

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| PUT | `/api/v1/records/:id/approved-modify` | 修改已批准记录 | record:modify_approved |
| GET | `/api/v1/records/:id/change-logs` | 查询修改历史 | record:view |

### 4.4 记录查询

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/api/v1/records/search` | 高级搜索 | record:view |
| POST | `/api/v1/records/export` | 批量导出 | record:export |
| GET | `/api/v1/records/stats` | 记录统计 | record:view |

---

## 5. 批次追溯 API

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/api/v1/trace/backward` | 批次反向追溯（原料 ← 成品） | trace:view |
| POST | `/api/v1/trace/forward` | 批次正向追溯（原料 → 成品） | trace:view |
| POST | `/api/v1/trace/export` | 导出追溯报告 | trace:export |

---

## 6. 工作流 API

### 6.1 工作流模板

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/v1/workflow-templates` | 查询流程模板 | workflow:view |
| GET | `/api/v1/workflow-templates/:id` | 查询模板详情 | workflow:view |
| POST | `/api/v1/workflow-templates` | 创建流程模板 | workflow:create |
| PUT | `/api/v1/workflow-templates/:id` | 更新流程模板 | workflow:edit |
| DELETE | `/api/v1/workflow-templates/:id` | 删除流程模板 | workflow:delete |

### 6.2 工作流实例

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/api/v1/workflow-instances` | 创建流程实例 | workflow:start |
| GET | `/api/v1/workflow-instances/:id` | 查询流程实例详情 | workflow:view |
| GET | `/api/v1/workflow-instances/:id/graph` | 获取流程图数据 | workflow:view |
| POST | `/api/v1/workflow-instances/:id/cancel` | 取消流程 | workflow:cancel |

### 6.3 工作流任务

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/v1/workflow-tasks/my-tasks` | 我的待办任务 | workflow:view |
| POST | `/api/v1/workflow-tasks/:id/approve` | 审批任务 | workflow:approve |
| GET | `/api/v1/workflow-tasks/:id/history` | 查询审批历史 | workflow:view |

---

## 7. 权限管理 API

### 7.1 权限定义

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/v1/permissions` | 查询权限列表 | permission:view |
| GET | `/api/v1/permissions/:id` | 查询权限详情 | permission:view |
| POST | `/api/v1/permissions` | 创建权限 | permission:create |
| PUT | `/api/v1/permissions/:id` | 更新权限 | permission:edit |
| DELETE | `/api/v1/permissions/:id` | 删除权限 | permission:delete |

### 7.2 用户权限

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/v1/user-permissions` | 查询用户权限 | permission:view |
| POST | `/api/v1/user-permissions` | 授予权限 | permission:grant |
| DELETE | `/api/v1/user-permissions/:id` | 撤销权限 | permission:revoke |
| GET | `/api/v1/user-permissions/check` | 检查用户权限 | permission:view |

---

## 8. 审计日志 API

### 8.1 登录日志

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/api/v1/audit/login-logs/query` | 查询登录日志 | audit:view |
| GET | `/api/v1/audit/login-logs/export` | 导出登录日志 | audit:export |
| GET | `/api/v1/audit/login-logs/stats` | 登录统计 | audit:view |

### 8.2 权限变更日志

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/api/v1/audit/permission-logs/query` | 查询权限变更日志 | audit:view |
| GET | `/api/v1/audit/permission-logs/export` | 导出权限变更日志 | audit:export |
| GET | `/api/v1/audit/permission-logs/:userId` | 查询某用户的权限变更历史 | audit:view |

### 8.3 敏感操作日志

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/api/v1/audit/sensitive-logs/query` | 查询敏感操作日志 | audit:view |
| GET | `/api/v1/audit/sensitive-logs/export` | 导出敏感操作日志 | audit:export |
| GET | `/api/v1/audit/sensitive-logs/stats` | 敏感操作统计 | audit:view |

### 8.4 综合查询

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/api/v1/audit/search` | 跨日志类型搜索 | audit:view |
| GET | `/api/v1/audit/dashboard` | 审计仪表板统计 | audit:view |
| GET | `/api/v1/audit/timeline/:userId` | 用户操作时间线 | audit:view |

---

## 9. 通知系统 API

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/v1/notifications` | 查询通知列表 | 已认证 |
| GET | `/api/v1/notifications/unread-count` | 查询未读通知数量 | 已认证 |
| PUT | `/api/v1/notifications/:id/read` | 标记为已读 | 已认证 |
| PUT | `/api/v1/notifications/read-all` | 标记全部已读 | 已认证 |
| DELETE | `/api/v1/notifications/:id` | 删除通知 | 已认证 |

---

## 10. 用户管理 API

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/v1/users` | 查询用户列表 | user:view |
| GET | `/api/v1/users/:id` | 查询用户详情 | user:view |
| POST | `/api/v1/users` | 创建用户 | user:create |
| PUT | `/api/v1/users/:id` | 更新用户 | user:edit |
| DELETE | `/api/v1/users/:id` | 删除用户 | user:delete |
| PUT | `/api/v1/users/:id/status` | 修改用户状态 | user:edit |
| PUT | `/api/v1/users/:id/department` | 修改用户部门 | user:edit |
| PUT | `/api/v1/users/:id/reset-password` | 重置密码 | user:reset_password |

---

## 11. 部门管理 API

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/v1/departments` | 查询部门列表 | department:view |
| GET | `/api/v1/departments/:id` | 查询部门详情 | department:view |
| POST | `/api/v1/departments` | 创建部门 | department:create |
| PUT | `/api/v1/departments/:id` | 更新部门 | department:edit |
| DELETE | `/api/v1/departments/:id` | 删除部门 | department:delete |
| GET | `/api/v1/departments/:id/users` | 查询部门成员 | department:view |

---

## 12. 文件上传 API

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/api/v1/files/upload` | 上传文件（PDF/Word/Excel） | 已认证 |
| POST | `/api/v1/files/upload-image` | 上传图片 | 已认证 |
| GET | `/api/v1/files/:id/download` | 下载文件 | file:download |
| GET | `/api/v1/files/:id/preview` | 预览文件（PDF） | file:view |
| DELETE | `/api/v1/files/:id` | 删除文件 | file:delete |

---

## API 设计规范

### 请求格式

```http
Content-Type: application/json
Authorization: Bearer <token>

{
  "key": "value"
}
```

### 响应格式

```json
{
  "success": true,
  "data": {},
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20
  }
}
```

### 错误响应

```json
{
  "success": false,
  "error": "错误信息",
  "code": "ERROR_CODE"
}
```

### 分页参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | number | 1 | 页码 |
| limit | number | 20 | 每页数量 |
| sortBy | string | createdAt | 排序字段 |
| sortOrder | string | desc | 排序方向（asc/desc） |

### 筛选参数

| 参数 | 类型 | 说明 |
|------|------|------|
| search | string | 关键词搜索 |
| status | string | 状态筛选 |
| departmentId | string | 部门筛选 |
| createdAfter | string | 创建时间范围（起始） |
| createdBefore | string | 创建时间范围（结束） |

---

## HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 204 | 删除成功（无内容） |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 409 | 冲突（如唯一键冲突） |
| 422 | 验证失败 |
| 500 | 服务器错误 |

---

**本文档完成 ✅**
