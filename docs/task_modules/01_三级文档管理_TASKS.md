# 三级文档管理 - Task 分解

> **来源**: docs/design/mvp/01_三级文档管理.md  
> **总工作量**: 280h  
> **优先级**: P0（MVP 核心功能）  
> **依赖**: 无

---

## Task 统计

| 类型 | 数量 | 工作量 |
|------|------|--------|
| 数据模型 | 3 | 24h |
| 后端 API | 7 | 112h |
| 前端 UI | 6 | 96h |
| 测试 | 4 | 48h |
| **总计** | **20** | **280h** |

---

## TASK-001: 创建文档管理数据模型

**类型**: 数据模型

**工作量**: 8h

**优先级**: P0（阻塞其他 Task）

**依赖**: 无

**描述**:
根据 01_三级文档管理.md 第 121-168 行设计，创建 documents、document_versions 两个表。

**验收标准**:
- [ ] Prisma Schema 编写完成（schema.prisma）
- [ ] documents 表包含所有字段（id, level, number, title, file_path, file_name, file_size, file_type, version, status, creator_id, approver_id, approved_at, archive_reason, archived_at, archived_by, obsolete_reason, obsoleted_at, obsoleted_by, created_at, updated_at, deleted_at）
- [ ] document_versions 表包含所有字段（id, document_id, version, file_path, file_name, file_size, creator_id, created_at）
- [ ] 唯一索引配置正确（number 字段 @unique）
- [ ] 外键约束符合业务规则（creator_id, approver_id, archived_by, obsoleted_by 引用 users(id)）
- [ ] 数据库迁移文件生成
- [ ] 软删除字段配置正确（deleted_at DateTime?）

**技术要点**:
- version 字段使用 Decimal(3,1) 类型
- status 字段使用枚举类型（draft, under_review, approved, current, archived, obsolete）
- createdAt/updatedAt 使用 DateTime @default(now())

**相关文件**:
- server/src/prisma/schema.prisma
- server/prisma/migrations/xxx_add_documents/

**后续 Task**: TASK-002（依赖此 Task 完成）

---

## TASK-002: 创建编号规则数据模型

**类型**: 数据模型

**工作量**: 8h

**优先级**: P0（阻塞文档编号生成）

**依赖**: 无

**描述**:
根据 01_三级文档管理.md 第 170-181 行设计，创建 number_rules 表。

**验收标准**:
- [ ] Prisma Schema 编写完成（schema.prisma）
- [ ] number_rules 表包含所有字段（id, level, department_id, sequence, created_at, updated_at）
- [ ] 外键约束配置正确（department_id 引用 departments(id)）
- [ ] 复合唯一索引配置正确（@@unique([level, department_id])）
- [ ] 数据库迁移文件生成

**业务规则**:
- BR-001: 编号规则配置后，新文件自动按规则生成文件编号
- BR-008: 编号删除后，系统记录待补齐编号，下次新建时优先使用

**相关文件**:
- server/src/prisma/schema.prisma
- server/prisma/migrations/xxx_add_number_rules/

**后续 Task**: TASK-005（文档编号生成逻辑依赖此表）

---

## TASK-003: 创建编号补齐记录表

**类型**: 数据模型

**工作量**: 8h

**优先级**: P1

**依赖**: TASK-002

**描述**:
创建 pending_numbers 表，记录已删除的文档编号，用于编号补齐功能。

**验收标准**:
- [ ] Prisma Schema 编写完成（schema.prisma）
- [ ] pending_numbers 表包含字段（id, level, department_id, number, deleted_at）
- [ ] 复合唯一索引配置正确（@@unique([level, department_id, number])）
- [ ] 数据库迁移文件生成

**业务规则**:
- BR-008: 编号删除后，系统记录待补齐编号，下次新建时优先使用

**相关文件**:
- server/src/prisma/schema.prisma
- server/prisma/migrations/xxx_add_pending_numbers/

**后续 Task**: TASK-005（文档编号生成逻辑依赖此表）

---

## TASK-004: 实现 MinIO 文件上传服务

**类型**: 后端 API

**工作量**: 16h

**优先级**: P0

**依赖**: 无

**描述**:
实现 MinIO 文件上传、下载、删除功能，用于文档文件存储。

**API 功能**:
- uploadFile(file, path): 上传文件到 MinIO
- downloadFile(path): 从 MinIO 下载文件
- deleteFile(path): 从 MinIO 删除文件
- getFileUrl(path): 获取文件预签名 URL

**验收标准**:
- [ ] MinIO 配置读取环境变量（MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY）
- [ ] 文件上传成功返回文件路径
- [ ] 文件下载支持流式传输
- [ ] 文件删除成功返回确认
- [ ] 异常处理完整（连接失败、权限错误、文件不存在）
- [ ] 单元测试覆盖率 ≥ 80%（核心业务逻辑必须 100%，边缘逻辑可低于 80%）

**技术要点**:
- 使用 minio 库（已在技术栈中）
- 文件路径格式：`documents/{level}-{dept}-{number}/v{version}/{filename}`
- 支持 PDF、Word、Excel 格式
- 单文件最大 10MB
- 上传失败时自动重试 3 次
- 使用指数退避策略（1s, 2s, 4s）

**相关文件**:
- server/src/modules/minio/minio.service.ts
- server/test/minio.service.spec.ts

**后续 Task**: TASK-006（文档上传 API 依赖此服务）

---

## TASK-005: 实现文档编号生成逻辑

**类型**: 后端 API

**工作量**: 16h

**优先级**: P0

**依赖**: TASK-002, TASK-003

**描述**:
实现文档编号自动生成逻辑，支持编号补齐功能。

**业务逻辑**:
1. 检查 pending_numbers 表是否有待补齐编号
2. 如有，优先使用待补齐编号，并删除记录
3. 如无，从 number_rules 表获取当前序号，递增后生成新编号
4. 编号格式：`{level}-{department_code}-{sequence}`

**验收标准**:
- [ ] 编号生成逻辑正确（优先补齐 → 递增生成）
- [ ] 编号唯一性校验（BR-001）
- [ ] 并发安全（使用事务锁）
- [ ] 异常处理（编号冲突、部门不存在）
- [ ] 单元测试覆盖率 ≥ 80%（核心业务逻辑必须 100%，边缘逻辑可低于 80%）

**技术要点**:
- 使用 Prisma Transaction + SELECT FOR UPDATE 实现悲观锁
- 或使用 Prisma 版本号字段实现乐观锁
- 确保编号生成的原子性
- 并发测试：模拟 100 个并发请求，验证编号唯一性
- 锁定顺序：先锁 number_rules，再锁 pending_numbers（避免死锁）

**业务规则**:
- BR-001: 同一级别内文件编号唯一
- BR-008: 编号删除后，系统记录待补齐编号，下次新建时优先使用

**相关文件**:
- server/src/modules/document/services/number-generator.service.ts
- server/test/number-generator.service.spec.ts

**后续 Task**: TASK-006（文档创建 API 依赖此逻辑）

---

## TASK-006: 实现文档上传 API

**类型**: 后端 API

**工作量**: 16h

**优先级**: P0

**依赖**: TASK-001, TASK-004, TASK-005

**描述**:
实现文档上传 API，支持 PDF、Word、Excel 格式，自动生成文档编号。

**API 端点**:
- POST /api/v1/documents

**验收标准**:
- [ ] 支持 multipart/form-data 上传
- [ ] 文件类型校验（PDF、Word、Excel）
- [ ] 文件大小校验（最大 10MB）
- [ ] 自动生成文档编号（调用 TASK-005）
- [ ] 上传文件到 MinIO（调用 TASK-004）
- [ ] 保存文档记录到数据库（status: draft）
- [ ] 权限校验（@UseGuards(JwtAuthGuard)）
- [ ] 异常处理（文件类型错误、大小超限、上传失败）
- [ ] 单元测试覆盖率 ≥ 80%（核心业务逻辑必须 100%，边缘逻辑可低于 80%）
- [ ] API 文档（Swagger）生成

**业务规则**:
- BR-001: 编号规则配置后，新文件自动按规则生成文件编号
- BR-007: 文件名称同级别内不可重复

**相关文件**:
- server/src/modules/document/document.controller.ts
- server/src/modules/document/document.service.ts
- server/src/modules/document/dto/create-document.dto.ts
- server/test/document.e2e-spec.ts

**后续 Task**: TASK-011（前端上传组件依赖此 API）

---

## TASK-007: 实现文档列表查询 API

**类型**: 后端 API

**工作量**: 16h

**优先级**: P0

**依赖**: TASK-001

**描述**:
实现文档列表查询 API，支持分页、筛选、排序。

**API 端点**:
- GET /api/v1/documents/level/:level

**查询参数**:
- page: 页码（默认 1）
- limit: 每页数量（默认 20）
- search: 搜索关键词（编号、标题）
- departmentId: 部门筛选
- status: 状态筛选
- sortBy: 排序字段（createdAt, number）
- sortOrder: 排序方向（asc, desc）

**验收标准**:
- [ ] 支持分页查询
- [ ] 支持关键词搜索（编号、标题模糊匹配）
- [ ] 支持部门筛选
- [ ] 支持状态筛选
- [ ] 支持多字段排序
- [ ] 返回数据包含分页信息（total, page, limit）
- [ ] 权限校验（只返回有权限的文档）
- [ ] 异常处理
- [ ] 单元测试覆盖率 ≥ 80%（核心业务逻辑必须 100%，边缘逻辑可低于 80%）
- [ ] API 文档（Swagger）生成

**相关文件**:
- server/src/modules/document/document.controller.ts
- server/src/modules/document/document.service.ts
- server/src/modules/document/dto/query-document.dto.ts
- server/test/document.e2e-spec.ts

**后续 Task**: TASK-011（前端列表页面依赖此 API）

---

## TASK-008: 实现文档详情查询 API

**类型**: 后端 API

**工作量**: 8h

**优先级**: P0

**依赖**: TASK-001

**描述**:
实现文档详情查询 API，返回完整文档信息。

**API 端点**:
- GET /api/v1/documents/:id

**验收标准**:
- [ ] 返回完整文档信息（包括创建人、审批人信息）
- [ ] 权限校验（只有授权用户可查看）
- [ ] 异常处理（文档不存在、无权限）
- [ ] 单元测试覆盖率 ≥ 80%（核心业务逻辑必须 100%，边缘逻辑可低于 80%）
- [ ] API 文档（Swagger）生成

**相关文件**:
- server/src/modules/document/document.controller.ts
- server/src/modules/document/document.service.ts
- server/test/document.e2e-spec.ts

**后续 Task**: TASK-012（前端详情页面依赖此 API）

---

## TASK-009: 实现文档下载 API

**类型**: 后端 API

**工作量**: 16h

**优先级**: P0

**依赖**: TASK-001, TASK-004

**描述**:
实现文档下载 API，支持权限校验和流式传输。

**API 端点**:
- GET /api/v1/documents/:id/download

**验收标准**:
- [ ] 权限校验（只有授权用户可下载）
- [ ] 状态校验（草稿、审批中状态不可下载）
- [ ] 从 MinIO 获取文件流
- [ ] 设置正确的 Content-Type 和 Content-Disposition 头
- [ ] 支持断点续传（Range 请求）
- [ ] 异常处理（文件不存在、无权限、下载失败）
- [ ] 单元测试覆盖率 ≥ 80%（核心业务逻辑必须 100%，边缘逻辑可低于 80%）
- [ ] API 文档（Swagger）生成

**相关文件**:
- server/src/modules/document/document.controller.ts
- server/src/modules/document/document.service.ts
- server/test/document.e2e-spec.ts

**后续 Task**: TASK-012（前端下载功能依赖此 API）

---

## TASK-010: 实现文档版本管理 API

**类型**: 后端 API

**工作量**: 16h

**优先级**: P1

**依赖**: TASK-001, TASK-004

**描述**:
实现文档版本管理 API，支持版本历史查询和版本更新。

**API 端点**:
- GET /api/v1/documents/:id/versions - 查询版本历史
- PUT /api/v1/documents/:id - 更新文档（自动生成新版本）

**版本规则**:
- 修改后自动版本号递增（1.0 → 1.1）
- 旧版本保存到 document_versions 表
- 旧版本可查看但不能下载

**验收标准**:
- [ ] 版本历史查询 API 正确
- [ ] 更新文档时自动生成新版本
- [ ] 旧版本文件保存到 MinIO（新路径）
- [ ] 旧版本记录保存到 document_versions 表
- [ ] 权限校验（只有授权用户可更新）
- [ ] 异常处理
- [ ] 单元测试覆盖率 ≥ 80%（核心业务逻辑必须 100%，边缘逻辑可低于 80%）
- [ ] API 文档（Swagger）生成

**相关文件**:
- server/src/modules/document/document.controller.ts
- server/src/modules/document/document.service.ts
- server/src/modules/document/dto/update-document.dto.ts
- server/test/document.e2e-spec.ts

**后续 Task**: TASK-013（前端版本历史组件依赖此 API）

---

## TASK-011: 实现文档列表页面（前端）

**类型**: 前端 UI

**工作量**: 16h

**优先级**: P0

**依赖**: TASK-006, TASK-007

**描述**:
实现一级/二级/三级文档列表页面，支持上传、搜索、筛选、排序。

**页面路由**:
- /documents/level1
- /documents/level2
- /documents/level3

**功能要求**:
- 文档列表展示（表格）
- 文件上传（拖拽、批量上传）
- 关键词搜索
- 部门筛选
- 状态筛选
- 分页
- 操作按钮（提交审批、编辑、删除、查看、下载）

**验收标准**:
- [ ] 页面布局符合设计稿
- [ ] 文档列表正确展示（编号、标题、版本、状态、创建人、创建时间）
- [ ] 搜索、筛选、排序功能正常
- [ ] 分页功能正常
- [ ] 上传功能正常（调用 TASK-006 API）
- [ ] 文件类型和大小校验
- [ ] 操作按钮根据状态动态显示
- [ ] 权限校验（无权限时隐藏操作按钮）
- [ ] 异常处理（上传失败、网络错误）
- [ ] 响应式布局（支持 1920x1080 分辨率）

**主要组件**:
- DocumentList.vue - 文档列表组件
- FileUpload.vue - 文件上传组件

**相关文件**:
- client/src/views/document/Level1List.vue
- client/src/views/document/Level2List.vue
- client/src/views/document/Level3List.vue
- client/src/components/FileUpload.vue

**后续 Task**: TASK-014（前端详情页面）

---

## TASK-012: 实现文档详情页面（前端）

**类型**: 前端 UI

**工作量**: 16h

**优先级**: P0

**依赖**: TASK-008, TASK-009

**描述**:
实现文档详情页面，支持查看文档信息、预览 PDF、下载文件。

**页面路由**:
- /documents/:id

**功能要求**:
- 文档基本信息展示
- PDF 预览（PdfViewer.vue 组件）
- 文件下载
- 操作按钮（提交审批、编辑、删除、归档、作废）

**验收标准**:
- [ ] 页面布局符合设计稿
- [ ] 文档信息正确展示（编号、标题、版本、状态、创建人、审批人、创建时间、审批时间）
- [ ] PDF 预览功能正常（调用 PdfViewer.vue 组件）
- [ ] 文件下载功能正常（调用 TASK-009 API）
- [ ] 操作按钮根据状态动态显示
- [ ] 权限校验（无权限时隐藏操作按钮）
- [ ] 异常处理（文档不存在、无权限、下载失败）
- [ ] 响应式布局

**主要组件**:
- DocumentDetail.vue - 文档详情组件
- PdfViewer.vue - PDF 预览组件

**相关文件**:
- client/src/views/document/DocumentDetail.vue
- client/src/components/PdfViewer.vue

**后续 Task**: TASK-013（前端版本历史组件）

---

## TASK-013: 实现文档版本历史组件（前端）

**类型**: 前端 UI

**工作量**: 16h

**优先级**: P1

**依赖**: TASK-010

**描述**:
实现文档版本历史组件，支持查看历史版本信息。

**功能要求**:
- 版本历史列表展示（版本号、修改人、修改时间）
- 历史版本预览（只读）
- 版本对比（可选功能）

**验收标准**:
- [ ] 版本历史列表正确展示
- [ ] 历史版本预览功能正常
- [ ] 时间线展示清晰
- [ ] 异常处理（无历史版本、加载失败）
- [ ] 响应式布局

**主要组件**:
- DocumentVersionHistory.vue - 版本历史组件

**相关文件**:
- client/src/components/DocumentVersionHistory.vue

**后续 Task**: 无

---

## TASK-014: 实现文档状态流转逻辑（后端）

**类型**: 后端 API

**工作量**: 16h

**优先级**: P0

**依赖**: TASK-001

**描述**:
实现文档状态流转 API，支持提交审批、撤回、归档、作废。

**API 端点**:
- POST /api/v1/documents/:id/submit - 提交审批
- POST /api/v1/documents/:id/withdraw - 撤回
- POST /api/v1/documents/:id/archive - 归档
- POST /api/v1/documents/:id/obsolete - 作废

**状态流转规则**:
- draft → under_review（提交审批）
- under_review → draft（撤回）
- approved → current（发布）
- current → archived（归档）
- current → obsolete（作废）

**验收标准**:
- [ ] 状态流转逻辑正确
- [ ] 状态校验（只能从指定状态流转）
- [ ] 归档/作废时必须填写原因
- [ ] 权限校验（只有授权用户可操作）
- [ ] 异常处理（状态错误、无权限）
- [ ] 单元测试覆盖率 ≥ 80%（核心业务逻辑必须 100%，边缘逻辑可低于 80%）
- [ ] API 文档（Swagger）生成

**业务规则**:
- BR-002: 一级/二级/三级文件创建后必须提交审批，不审批不可发布
- BR-006: 文件提交后不允许修改，只能查看或撤回

**相关文件**:
- server/src/modules/document/document.controller.ts
- server/src/modules/document/document.service.ts
- server/test/document.e2e-spec.ts

**后续 Task**: TASK-015（前端状态流转按钮）

---

## TASK-015: 实现文档状态流转按钮（前端）

**类型**: 前端 UI

**工作量**: 16h

**优先级**: P0

**依赖**: TASK-014

**描述**:
实现文档状态流转按钮，支持提交审批、撤回、归档、作废。

**功能要求**:
- 根据文档状态动态显示按钮
- 归档/作废时弹出对话框要求填写原因
- 操作成功后刷新页面

**验收标准**:
- [ ] 按钮根据状态动态显示（见 01_三级文档管理.md 第 262-270 行）
- [ ] 提交审批、撤回功能正常
- [ ] 归档、作废功能正常（需填写原因）
- [ ] 操作成功后提示信息
- [ ] 异常处理（操作失败、网络错误）
- [ ] 权限校验（无权限时禁用按钮）

**相关文件**:
- client/src/views/document/DocumentDetail.vue
- client/src/components/DocumentActions.vue

**后续 Task**: 无

---

## TASK-016: 实现文档删除 API（后端）

**类型**: 后端 API

**工作量**: 8h

**优先级**: P0

**依赖**: TASK-001, TASK-003

**描述**:
实现文档删除 API，支持软删除和硬删除。

**API 端点**:
- DELETE /api/v1/documents/:id - 软删除
- DELETE /api/v1/documents/:id/permanent - 硬删除

**删除规则**:
- 草稿/待审批状态：可直接软删除
- 已发布状态：不能删除，只能停用
- 停用状态：可以硬删除（同时删除 MinIO 文件）

**验收标准**:
- [ ] 软删除逻辑正确（设置 deleted_at）
- [ ] 硬删除逻辑正确（删除数据库记录 + MinIO 文件）
- [ ] 删除后将编号加入 pending_numbers 表（BR-008）
- [ ] 状态校验（已发布状态不可删除）
- [ ] 权限校验（只有授权用户可删除）
- [ ] 异常处理
- [ ] 单元测试覆盖率 ≥ 80%（核心业务逻辑必须 100%，边缘逻辑可低于 80%）
- [ ] API 文档（Swagger）生成

**业务规则**:
- BR-008: 编号删除后，系统记录待补齐编号，下次新建时优先使用

**相关文件**:
- server/src/modules/document/document.controller.ts
- server/src/modules/document/document.service.ts
- server/test/document.e2e-spec.ts

**后续 Task**: 无

---

## TASK-017: 编写文档管理单元测试（后端）

**类型**: 测试

**工作量**: 16h

**优先级**: P1

**依赖**: TASK-006, TASK-007, TASK-008, TASK-009, TASK-010, TASK-014, TASK-016

**描述**:
编写文档管理模块的单元测试，覆盖核心业务逻辑。

**测试范围**:
- 文档上传逻辑
- 文档查询逻辑
- 文档下载逻辑
- 版本管理逻辑
- 状态流转逻辑
- 删除逻辑

**验收标准**:
- [ ] 单元测试覆盖率 ≥ 80%（核心业务逻辑必须 100%，边缘逻辑可低于 80%）
- [ ] 所有核心业务规则有对应测试用例
- [ ] Mock 外部依赖（MinIO、Prisma）
- [ ] 测试用例清晰、可读
- [ ] 所有测试通过

**相关文件**:
- server/test/document.service.spec.ts
- server/test/number-generator.service.spec.ts

**后续 Task**: 无

---

## TASK-018: 编写文档管理集成测试（后端）

**类型**: 测试

**工作量**: 16h

**优先级**: P1

**依赖**: TASK-006, TASK-007, TASK-008, TASK-009, TASK-010, TASK-014, TASK-016

**描述**:
编写文档管理模块的集成测试，验证 API 端点。

**测试范围**:
- POST /api/v1/documents
- GET /api/v1/documents/level/:level
- GET /api/v1/documents/:id
- GET /api/v1/documents/:id/download
- GET /api/v1/documents/:id/versions
- PUT /api/v1/documents/:id
- POST /api/v1/documents/:id/submit
- POST /api/v1/documents/:id/withdraw
- POST /api/v1/documents/:id/archive
- POST /api/v1/documents/:id/obsolete
- DELETE /api/v1/documents/:id

**验收标准**:
- [ ] 所有 API 端点有对应测试用例
- [ ] 测试覆盖正常流程和异常流程
- [ ] 测试覆盖权限校验
- [ ] 测试覆盖业务规则校验
- [ ] 所有测试通过

**相关文件**:
- server/test/document.e2e-spec.ts

**后续 Task**: 无

---

## TASK-019: 编写前端组件单元测试

**类型**: 测试

**工作量**: 8h

**优先级**: P2

**依赖**: TASK-011, TASK-012, TASK-013, TASK-015

**描述**:
编写前端组件的单元测试，验证组件逻辑。

**测试范围**:
- DocumentList.vue
- DocumentDetail.vue
- FileUpload.vue
- PdfViewer.vue
- DocumentVersionHistory.vue
- DocumentActions.vue

**验收标准**:
- [ ] 所有核心组件有对应测试用例
- [ ] 测试覆盖组件交互逻辑
- [ ] 测试覆盖数据渲染逻辑
- [ ] Mock API 请求
- [ ] 所有测试通过

**相关文件**:
- client/src/views/document/__tests__/DocumentList.spec.ts
- client/src/views/document/__tests__/DocumentDetail.spec.ts
- client/src/components/__tests__/FileUpload.spec.ts
- client/src/components/__tests__/PdfViewer.spec.ts

**后续 Task**: 无

---

## TASK-020: 编写 E2E 测试（Playwright）

**类型**: 测试

**工作量**: 8h

**优先级**: P2

**依赖**: TASK-011, TASK-012, TASK-013, TASK-015

**描述**:
编写文档管理模块的 E2E 测试，验证关键用户流程。

**测试场景**:
1. 用户上传一级文件 → 提交审批 → 审批通过 → 发布 → 下载
2. 用户修改文件 → 版本自动递增 → 查看版本历史
3. 用户归档文件 → 查看归档文件（只读）
4. 用户删除草稿文件 → 编号加入待补齐列表
5. 用户创建新文件 → 自动使用待补齐编号

**验收标准**:
- [ ] 所有关键用户流程有对应测试用例
- [ ] 测试覆盖正常流程和异常流程
- [ ] 所有测试通过

**相关文件**:
- client/e2e/document.spec.ts

**后续 Task**: 无

---

**本文档完成 ✅**
