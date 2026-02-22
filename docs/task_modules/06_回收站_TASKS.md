# 回收站（软删除恢复） - Task 分解

> **来源**: docs/design/mvp/06_回收站.md  
> **总工作量**: 120h  
> **优先级**: P1（MVP 功能）  
> **依赖**: 文档管理模块（TASK-001）、模板管理模块（TASK-021）

---

## Task 统计

| 类型 | 数量 | 工作量 |
|------|------|--------|
| 数据模型 | 0 | 0h（复用 deleted_at 字段） |
| 后端 API | 3 | 48h |
| 前端 UI | 2 | 32h |
| 测试 | 3 | 40h |
| **总计** | **8** | **120h** |

---

## TASK-079: 实现回收站查询 API

**类型**: 后端 API

**工作量**: 16h

**优先级**: P1

**依赖**: 无（复用已有表的 deleted_at 字段）

**描述**:
实现回收站查询 API，支持查询已软删除的文档和模板。

**API 端点**:
- GET /api/v1/recycle-bin/documents - 查询已删除的文档
- GET /api/v1/recycle-bin/templates - 查询已删除的模板

**验收标准**:
- [ ] 正确查询 deleted_at 不为空的记录
- [ ] 支持分页查询
- [ ] 支持筛选（级别、部门）
- [ ] 返回删除人、删除时间信息
- [ ] 权限校验（删除人和管理员均可查看回收站，符合 BR-317）
- [ ] 异常处理
- [ ] 单元测试覆盖率 ≥ 80%（核心业务逻辑必须 100%，边缘逻辑可低于 80%）
- [ ] API 文档（Swagger）生成

**相关文件**:
- server/src/modules/recycle-bin/recycle-bin.controller.ts
- server/src/modules/recycle-bin/recycle-bin.service.ts
- server/test/recycle-bin.e2e-spec.ts

**后续 Task**: TASK-082（前端回收站页面依赖此 API）

---

## TASK-080: 实现回收站恢复 API

**类型**: 后端 API

**工作量**: 16h

**优先级**: P1

**依赖**: 无

**描述**:
实现回收站恢复 API，支持恢复已删除的文档和模板。

**API 端点**:
- POST /api/v1/recycle-bin/documents/:id/restore - 恢复文档
- POST /api/v1/recycle-bin/templates/:id/restore - 恢复模板

**业务逻辑**:
1. 校验权限（只有 Admin 可恢复）
2. 校验记录是否已删除（deleted_at 不为空）
3. 检查编号是否已被占用
   - 从 documents 表查询 number 字段（where deleted_at IS NULL）
   - 如果编号已被占用，恢复时自动生成新编号（调用 TASK-005 编号生成逻辑）
   - 记录日志：原编号 → 新编号
4. 清空 deleted_at 字段（恢复记录）
5. 发送站内消息通知原创建人

**验收标准**:
- [ ] 恢复逻辑正确（清空 deleted_at）
- [ ] 权限校验（只有 Admin 可恢复）
- [ ] 状态校验（只能恢复已删除的记录）
- [ ] 发送站内消息通知原创建人
- [ ] 异常处理（记录不存在、未删除、无权限）
- [ ] 单元测试覆盖率 ≥ 80%（核心业务逻辑必须 100%，边缘逻辑可低于 80%）
- [ ] API 文档（Swagger）生成

**相关文件**:
- server/src/modules/recycle-bin/recycle-bin.controller.ts
- server/src/modules/recycle-bin/recycle-bin.service.ts
- server/test/recycle-bin.e2e-spec.ts

**后续 Task**: TASK-082（前端恢复按钮依赖此 API）

---

## TASK-081: 实现回收站彻底删除 API

**类型**: 后端 API

**工作量**: 16h

**优先级**: P1

**依赖**: 无

**描述**:
实现回收站彻底删除 API，支持永久删除文档和模板。

**API 端点**:
- DELETE /api/v1/recycle-bin/documents/:id/permanent - 彻底删除文档
- DELETE /api/v1/recycle-bin/templates/:id/permanent - 彻底删除模板

**业务逻辑**:
1. 校验权限（只有 Admin 可彻底删除）
2. 校验记录是否已删除（deleted_at 不为空）
3. 删除关联的 MinIO 文件（文档）
4. 删除数据库记录（永久删除）
5. 将编号加入 pending_numbers 表（文档）

**验收标准**:
- [ ] 彻底删除逻辑正确（删除数据库记录）
- [ ] 删除关联的 MinIO 文件（文档）
- [ ] 将编号加入 pending_numbers 表（文档）
- [ ] 权限校验（只有 Admin 可彻底删除）
- [ ] 状态校验（只能彻底删除已删除的记录）
- [ ] 异常处理（记录不存在、未删除、无权限、删除失败）
- [ ] 单元测试覆盖率 ≥ 80%（核心业务逻辑必须 100%，边缘逻辑可低于 80%）
- [ ] API 文档（Swagger）生成

**相关文件**:
- server/src/modules/recycle-bin/recycle-bin.controller.ts
- server/src/modules/recycle-bin/recycle-bin.service.ts
- server/test/recycle-bin.e2e-spec.ts

**后续 Task**: TASK-082（前端彻底删除按钮依赖此 API）

---

## TASK-082: 实现回收站页面（前端）

**类型**: 前端 UI

**工作量**: 16h

**优先级**: P1

**依赖**: TASK-079, TASK-080, TASK-081

**描述**:
实现回收站页面，支持查看、恢复、彻底删除已删除的文档和模板。

**页面路由**: `/recycle-bin`

**功能要求**:
- Tabs 切换（文档/模板）
- 已删除记录列表展示（表格）
- 筛选（级别、部门）
- 分页
- 操作按钮（恢复、彻底删除）

**验收标准**:
- [ ] 页面布局符合设计稿
- [ ] Tabs 切换功能正常（文档/模板）
- [ ] 已删除记录列表正确展示（标题、删除人、删除时间）
- [ ] 筛选功能正常
- [ ] 分页功能正常
- [ ] 恢复功能正常（调用 TASK-080 API）
- [ ] 彻底删除功能正常（调用 TASK-081 API）
- [ ] 权限校验（删除人可查看自己删除的记录，管理员可查看全部）
- [ ] 异常处理
- [ ] 响应式布局

**主要组件**:
- RecycleBin.vue - 回收站页面组件

**相关文件**:
- client/src/views/recycle-bin/RecycleBin.vue

**后续 Task**: 无

---

## TASK-083: 实现回收站操作按钮（前端）

**类型**: 前端 UI

**工作量**: 16h

**优先级**: P1

**依赖**: TASK-080, TASK-081

**描述**:
实现回收站操作按钮，支持恢复和彻底删除。

**功能要求**:
- 恢复按钮
- 彻底删除按钮
- 确认对话框（彻底删除时）
- 操作成功后刷新列表

**验收标准**:
- [ ] 恢复按钮功能正常
- [ ] 彻底删除按钮功能正常（需确认对话框）
- [ ] 操作成功后提示信息
- [ ] 操作成功后刷新列表
- [ ] 异常处理
- [ ] 权限校验（无权限时禁用按钮）

**相关文件**:
- client/src/views/recycle-bin/RecycleBin.vue

**后续 Task**: 无

---

## TASK-084: 编写回收站单元测试（后端）

**类型**: 测试

**工作量**: 16h

**优先级**: P2

**依赖**: TASK-079, TASK-080, TASK-081

**描述**:
编写回收站模块的单元测试，覆盖核心业务逻辑。

**测试范围**:
- 回收站查询逻辑
- 恢复逻辑
- 彻底删除逻辑

**验收标准**:
- [ ] 单元测试覆盖率 ≥ 80%（核心业务逻辑必须 100%，边缘逻辑可低于 80%）
- [ ] 所有核心业务规则有对应测试用例
- [ ] Mock 外部依赖
- [ ] 测试用例清晰、可读
- [ ] 所有测试通过

**相关文件**:
- server/test/recycle-bin.service.spec.ts

**后续 Task**: 无

---

## TASK-085: 编写回收站集成测试（后端）

**类型**: 测试

**工作量**: 16h

**优先级**: P2

**依赖**: TASK-079, TASK-080, TASK-081

**描述**:
编写回收站模块的集成测试，验证 API 端点。

**测试范围**:
- GET /api/v1/recycle-bin/documents
- GET /api/v1/recycle-bin/templates
- POST /api/v1/recycle-bin/documents/:id/restore
- POST /api/v1/recycle-bin/templates/:id/restore
- DELETE /api/v1/recycle-bin/documents/:id/permanent
- DELETE /api/v1/recycle-bin/templates/:id/permanent

**验收标准**:
- [ ] 所有 API 端点有对应测试用例
- [ ] 测试覆盖正常流程和异常流程
- [ ] 测试覆盖权限校验
- [ ] 所有测试通过

**相关文件**:
- server/test/recycle-bin.e2e-spec.ts

**后续 Task**: 无

---

## TASK-086: 编写前端组件单元测试

**类型**: 测试

**工作量**: 8h

**优先级**: P2

**依赖**: TASK-082, TASK-083

**描述**:
编写前端组件的单元测试，验证组件逻辑。

**测试范围**:
- RecycleBin.vue

**验收标准**:
- [ ] 所有核心组件有对应测试用例
- [ ] 测试覆盖组件交互逻辑
- [ ] Mock API 请求
- [ ] 所有测试通过

**相关文件**:
- client/src/views/recycle-bin/__tests__/RecycleBin.spec.ts

**后续 Task**: 无

---

**本文档完成 ✅**
