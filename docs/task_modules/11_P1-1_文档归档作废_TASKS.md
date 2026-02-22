# P1-1: Document 归档/作废功能 - Task 分解

> **来源**: docs/design/technical_debt/P1-1_文档归档作废.md  
> **总工作量**: 16h  
> **优先级**: P0（紧急）  
> **依赖**: 文档管理模块（TASK-001）

---

## Task 统计

| 类型 | 数量 | 工作量 |
|------|------|--------|
| 数据模型 | 0 | 0h（复用已有字段） |
| 后端 API | 2 | 8h |
| 前端 UI | 1 | 4h |
| 测试 | 1 | 4h |
| **总计** | **4** | **16h** |

---

## TASK-123: 实现文档归档/作废 API

**类型**: 后端 API
**工作量**: 4h
**优先级**: P0
**依赖**: TASK-001

**描述**: 实现文档归档和作废 API。

**API 端点**:
- POST /api/v1/documents/:id/archive - 归档文档
- POST /api/v1/documents/:id/obsolete - 作废文档

**验收标准**:
- [ ] 归档逻辑正确（状态 approved → current → archived，需填写原因）
- [ ] 作废逻辑正确（状态 approved → obsolete，需填写原因）
- [ ] 权限校验（归档：创建者或管理员；作废：质量部或系统管理员）
- [ ] 归档/作废后发送通知
- [ ] BR-346/BR-347 业务规则校验
- [ ] 单元测试覆盖率 ≥ 80%

**相关文件**:
- server/src/modules/document/document.controller.ts
- server/src/modules/document/document.service.ts

---

## TASK-124: 实现归档文档恢复 API

**类型**: 后端 API
**工作量**: 4h
**优先级**: P0
**依赖**: TASK-123

**描述**: 实现归档文档恢复 API（作废文档不可恢复）。

**API 端点**:
- POST /api/v1/documents/:id/restore - 恢复归档文档

**验收标准**:
- [ ] 恢复逻辑正确（状态 archived → current，需填写原因）
- [ ] 作废文档不可恢复（返回错误）
- [ ] 权限校验（仅管理员可恢复）
- [ ] 恢复后发送通知
- [ ] BR-348 业务规则校验
- [ ] 单元测试覆盖率 ≥ 80%

**相关文件**:
- server/src/modules/document/document.controller.ts
- server/src/modules/document/document.service.ts

---

## TASK-125: 实现归档/作废按钮（前端）

**类型**: 前端 UI
**工作量**: 4h
**优先级**: P0
**依赖**: TASK-123, TASK-124

**描述**: 实现归档/作废/恢复按钮及对话框。

**功能要求**:
- 归档按钮（需填写原因，最少 10 字符）
- 作废按钮（需填写原因，最少 10 字符）
- 恢复按钮（仅归档文档显示）
- 确认对话框

**验收标准**:
- [ ] 按钮根据状态和权限动态显示
- [ ] 归档/作废对话框正确（必填原因，最少 10 字符）
- [ ] 恢复对话框正确（必填原因）
- [ ] 操作成功后提示信息
- [ ] 异常处理

**相关文件**:
- client/src/views/document/DocumentDetail.vue

---

## TASK-126: 编写归档/作废功能测试

**类型**: 测试
**工作量**: 4h
**优先级**: P1
**依赖**: TASK-123, TASK-124, TASK-125

**描述**: 编写归档/作废功能的单元测试和集成测试。

**测试范围**:
- 归档/作废 API 逻辑
- 恢复 API 逻辑
- 权限校验
- 业务规则校验

**验收标准**:
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] 所有测试通过

**相关文件**:
- server/test/document.service.spec.ts
- server/test/document.e2e-spec.ts

---

**本文档完成 ✅**
