# 文档管理系统 - 完整开发 TodoList

> **文档版本**: 1.0
> **创建日期**: 2026-02-13
> **基于**: DESIGN.md v10.7
> **项目状态**: MVP 98.1% 完成，准备进入增量开发阶段

---

## 📊 总体进度概览

| 阶段 | 功能范围 | 完成度 | 待开发工时 | 优先级 | 状态 |
|------|---------|--------|-----------|--------|------|
| **MVP Phase 1-6** | 用户/文档/模板/任务/审批/通知 | 98.1% (51/52) | 2h | P0 | ⏳ 仅剩回收站UI |
| **P1 技术债务** | 归档/权限/工作流（简化） | 0% (0/3) | 80h | P1 | ⏳ 完整方案已就绪 |
| **Phase 7-8** | 配方偏离检测 | 60% | 48h | P2 | 🚧 核心检测已实现 |
| **Phase 9** | 数据导出 | 100% | 0h | - | ✅ Excel导出完成 |
| **Phase 10** | 二级审批流程 | 0% | 16h | P2 | ⏳ 依赖P1-3工作流 |
| **Phase 11** | 文件预览 | 30% | 60h | P2 | 🚧 PDF已完成 |
| **Phase 12** | 偏离统计分析 | 100% | 0h | - | ✅ ECharts图表完成 |
| **v2.0.0 工作流引擎** | 智能文档工作流系统 | 0% | 400h | P0 | ⏳ 替代P1-3 |
| **v2.0.0 扩展模块** | 培训/内审/仓库/设备/批次 | 0% | 1200h+ | P3 | ⏳ 长期规划 |
| **测试覆盖率提升** | 85.3% → 90%+ | 85.3% | 20h | P1 | ⏳ 单元+E2E |
| **总计** | | | **1826h+** | | |

**关键时间线**:
- **短期**（1-2 周）: 回收站UI + P1-1 文档归档 = 22h
- **中期**（4-8 周）: P1-2 权限系统 + P1-3 简化工作流 = 60h
- **长期**（6-12 个月）: v2.0.0 工作流引擎 + 扩展模块 = 1600h+

---

## 🎯 实施路线图

### **第一阶段：完成 MVP + P1 技术债务**（估时 102h，约 3 周）

```mermaid
graph LR
    A[回收站UI 2h] --> B[P1-1 归档 20h]
    B --> C[P1-2 权限 40h]
    C --> D[P1-3 简化工作流 20h]
    D --> E[测试覆盖率 20h]
```

**里程碑**: MVP 100% 完成 + P1 技术债务清零

### **第二阶段：完善现有功能**（估时 124h，约 4 周）

```mermaid
graph LR
    A[Phase 7-8 偏离检测 48h] --> B[Phase 10 二级审批 16h]
    B --> C[Phase 11 文件预览 60h]
```

**里程碑**: Phase 1-12 全部完成

### **第三阶段：v2.0.0 智能工作流引擎**（估时 400h，约 10 周）

```mermaid
graph TD
    A[Phase 1: 数据模型 80h] --> B[Phase 2: 核心引擎 120h]
    B --> C[Phase 3: 可视化配置器 80h]
    C --> D[Phase 4: 高级特性 80h]
    D --> E[Phase 5: 集成测试 40h]
```

**里程碑**: 可配置工作流系统上线

### **第四阶段：扩展模块**（估时 1200h+，长期规划）

- 培训管理系统
- 内审管理系统
- 仓库管理系统
- 设备管理系统
- 批次追溯系统

---

## 📋 详细任务清单

---

## ✅ **已完成功能**（98.1% of MVP）

<details>
<summary>点击展开查看已完成的 51 个功能点</summary>

### Phase 1: 用户管理 ✅
- [x] 用户 CRUD（登录/注册/权限）- `server/src/modules/user/` + `client/src/views/user/`
- [x] 组织架构（树形结构）- `server/src/modules/department/` + `client/src/views/department/`

### Phase 2: 文档管理 ✅
- [x] 三级文档 CRUD - `server/src/modules/document/` + `client/src/views/document/`
- [x] 文件上传（MinIO S3）- `server/src/modules/file/`
- [x] 版本控制 - `Document.version` 字段
- [x] 文档预览（PDF）- `client/src/components/PdfViewer.vue`

### Phase 3: 审批流程 ✅
- [x] 单级审批 - `server/src/modules/approval/` + `client/src/views/approval/`
- [x] 审批记录 - `Approval` 表

### Phase 4: 模板管理 ✅
- [x] 四级模板 CRUD - `server/src/modules/template/` + `client/src/views/template/`
- [x] 字段类型支持（20+ 类型）- 文本/数字/日期/下拉等

### Phase 5: 任务管理 ✅
- [x] 任务派发 - `server/src/modules/task/` + `client/src/views/task/`
- [x] 任务填报（动态表单）- 基于模板字段

### Phase 6: 通知系统 ✅
- [x] 站内消息 - `server/src/modules/notification/` + `client/src/views/notification/`
- [x] 消息已读/未读 - `Notification.read` 字段

### Phase 7: 偏离检测 ✅
- [x] 公差配置 - `TemplateField.tolerance` 字段
- [x] 自动偏离检测 - 填报时自动检测
- [x] 偏离报告生成 - `DeviationReport` 表

### Phase 9: 数据导出 ✅
- [x] Excel 批量导出 - `server/src/modules/export/`
- [x] 动态列支持 - ExcelJS 生成

### Phase 12: 偏离统计 ✅
- [x] 偏离趋势分析 - `client/src/views/statistics/` + ECharts 图表
- [x] 字段分布统计 - 饼图展示
- [x] 部门偏离率 - 柱状图对比

### 其他功能 ✅
- [x] 回收站软删除 - `deleted_at` 字段（所有核心表支持）

</details>

---

## ⏳ **待实施功能**（按优先级排序）

---

### 🔴 **P0: MVP 完成（必须立即完成）**

#### Task-001: 回收站 UI 完善
**估时**: 2 小时
**优先级**: P0
**依赖**: 无
**状态**: ⏳ 待实施

##### 📝 需求描述
完成 MVP Phase 1-6 最后 1/52 的功能，实现回收站的前端界面，包括批量恢复、批量永久删除、空状态显示。

##### 📂 涉及文件
```
client/src/views/trash/Index.vue          # 回收站主页面
client/src/api/trash.ts                   # 回收站 API 调用
```

##### 🔧 开发步骤

**Step 1: 优化回收站页面布局**（30 分钟）
- [ ] 读取现有文件 `client/src/views/trash/Index.vue`
- [ ] 添加批量操作按钮组（页面顶部）
  ```vue
  <el-button type="primary" :disabled="!multipleSelection.length" @click="handleBatchRestore">
    批量恢复 ({{ multipleSelection.length }})
  </el-button>
  <el-button type="danger" :disabled="!multipleSelection.length" @click="handleBatchDelete">
    批量永久删除 ({{ multipleSelection.length }})
  </el-button>
  ```
- [ ] 优化表格列配置（删除时间、删除人、操作列）

**Step 2: 实现批量操作逻辑**（1 小时）
- [ ] 添加表格多选逻辑
  ```vue
  <el-table @selection-change="handleSelectionChange">
    <el-table-column type="selection" width="55" />
  </el-table>
  ```
- [ ] 实现批量恢复方法
  ```typescript
  const handleBatchRestore = async () => {
    await ElMessageBox.confirm('确认恢复选中的 X 项？', '批量恢复', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning'
    })

    try {
      await batchRestoreItems(multipleSelection.value.map(item => item.id))
      ElMessage.success('批量恢复成功')
      fetchTrashList()
    } catch (error) {
      ElMessage.error(error.message || '批量恢复失败')
    }
  }
  ```
- [ ] 实现批量永久删除方法（类似逻辑 + 二次确认）

**Step 3: 添加空状态显示**（15 分钟）
- [ ] 添加 Empty 状态组件
  ```vue
  <el-empty v-if="!trashList.length && !loading" description="回收站为空">
    <el-button type="primary" @click="$router.push('/documents')">
      返回文档管理
    </el-button>
  </el-empty>
  ```

**Step 4: E2E 测试**（15 分钟）
- [ ] 测试批量恢复流程（选中 → 确认 → 刷新列表）
- [ ] 测试批量永久删除流程（选中 → 二次确认 → 刷新列表）
- [ ] 测试空状态显示

##### ✅ 验收标准
- ✅ 批量操作按钮显示正确（选中数量显示）
- ✅ 批量恢复功能正常（ElMessageBox 确认 + API 调用 + 列表刷新）
- ✅ 批量永久删除功能正常（二次确认）
- ✅ 空状态显示友好（无数据时显示 Empty 组件）
- ✅ 表格排序正确（按 deletedAt 倒序）
- ✅ E2E 测试通过

##### 🐛 常见问题排查
- **问题**: 批量操作按钮一直禁用
  **排查**: 检查 `multipleSelection` 是否正确绑定到 `@selection-change`
- **问题**: 永久删除后数据未刷新
  **排查**: 确认 API 返回成功后调用了 `fetchTrashList()`

---

### 🟠 **P1: 技术债务修复（高优先级）**

---

#### Task-002: P1-1 文档归档/作废功能
**估时**: 20 小时
**优先级**: P1
**依赖**: Task-001 完成
**状态**: ⏳ 待实施
**完整方案**: DESIGN.md v10.7 第 22.2.1 章

##### 📝 需求描述
实现 BRCGS 合规所需的文档归档（Archive）和作废（Obsolete）功能，包括：
- 文档归档：将"已发布"文档标记为归档状态，保留查看权限但不可编辑
- 文档作废：文档被新版本替代时标记为作废，必须填写替代文档
- 文档恢复：管理员可将归档/作废文档恢复为"已发布"状态

**业务规则**:
- BR-346: 文档归档规则
- BR-347: 文档作废规则
- BR-348: 文档恢复规则

##### 📂 涉及文件
```
# 后端
server/src/prisma/schema.prisma                              # Prisma Schema 更新
server/src/modules/documents/dto/archive-document.dto.ts    # 归档 DTO
server/src/modules/documents/dto/obsolete-document.dto.ts   # 作废 DTO
server/src/modules/documents/dto/restore-document.dto.ts    # 恢复 DTO
server/src/modules/documents/documents.service.ts           # 服务层实现
server/src/modules/documents/documents.controller.ts        # 控制器
server/test/documents-archive.e2e-spec.ts                   # E2E 测试

# 前端
client/src/views/documents/Detail.vue                       # 文档详情页（添加按钮）
client/src/components/documents/ArchiveDialog.vue           # 归档对话框
client/src/components/documents/ObsoleteDialog.vue          # 作废对话框
client/src/api/documents.ts                                 # API 调用
```

##### 🔧 开发步骤

**Phase 1: 数据库迁移**（30 分钟）

<details>
<summary>点击展开详细步骤</summary>

- [ ] **Step 1.1**: 更新 Prisma Schema
  ```bash
  # 打开文件
  code server/src/prisma/schema.prisma
  ```

  在 `Document` model 中添加 6 个新字段：
  ```prisma
  model Document {
    // ... 现有字段
    archivedAt      DateTime?
    archivedBy      String?
    archivedReason  String?
    obsoletedAt     DateTime?
    obsoletedBy     String?
    obsoletedReason String?
    replacedByDocId String?
  }
  ```

- [ ] **Step 1.2**: 运行数据库迁移
  ```bash
  cd server
  npx prisma migrate dev --name add-document-archive-fields
  ```

- [ ] **Step 1.3**: 验证迁移成功
  ```bash
  npx prisma studio
  # 打开 Document 表，确认 6 个新字段存在
  ```

- [ ] **Step 1.4**: 测试
  - 验证迁移文件生成（`server/prisma/migrations/YYYYMMDDHHMMSS_add-document-archive-fields/migration.sql`）
  - 验证数据库表结构已更新

- [ ] **Step 1.5**: 常见问题排查
  - 如果迁移失败："Prisma migrate 报错" → 运行 `npx prisma db push --force-reset`（测试环境）
  - 如果字段未显示："Prisma Studio 看不到新字段" → 运行 `npx prisma generate`

</details>

**Phase 2: 后端 DTO 定义**（15 分钟）

<details>
<summary>点击展开详细步骤</summary>

- [ ] **Step 2.1**: 创建归档 DTO
  ```bash
  code server/src/modules/documents/dto/archive-document.dto.ts
  ```

  ```typescript
  import { IsString, IsNotEmpty } from 'class-validator';
  import { ApiProperty } from '@nestjs/swagger';

  export class ArchiveDocumentDto {
    @ApiProperty({ description: '归档原因', example: '该文档已过时，新版本为 DOC-2026-002' })
    @IsString()
    @IsNotEmpty()
    reason: string;
  }
  ```

- [ ] **Step 2.2**: 创建作废 DTO
  ```typescript
  export class ObsoleteDocumentDto {
    @ApiProperty({ description: '作废原因' })
    @IsString()
    @IsNotEmpty()
    reason: string;

    @ApiProperty({ description: '替代文档 ID', required: false })
    @IsString()
    @IsOptional()
    replacedByDocId?: string;
  }
  ```

- [ ] **Step 2.3**: 创建恢复 DTO
  ```typescript
  export class RestoreDocumentDto {
    @ApiProperty({ description: '恢复原因' })
    @IsString()
    @IsNotEmpty()
    reason: string;
  }
  ```

</details>

**Phase 3: 后端服务层实现**（2 小时）

<details>
<summary>点击展开详细步骤</summary>

- [ ] **Step 3.1**: 在 `DocumentsService` 添加归档方法
  ```typescript
  async archiveDocument(id: string, userId: string, dto: ArchiveDocumentDto) {
    // BR-346: 只有"已发布"状态文档可归档
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('文档不存在');
    if (doc.status !== 'published') {
      throw new BadRequestException('只有"已发布"状态文档可归档');
    }

    // 更新文档状态
    return this.prisma.document.update({
      where: { id },
      data: {
        archivedAt: new Date(),
        archivedBy: userId,
        archivedReason: dto.reason,
      },
    });
  }
  ```

- [ ] **Step 3.2**: 添加作废方法（类似逻辑 + BR-347 规则）
- [ ] **Step 3.3**: 添加恢复方法（需管理员权限 + BR-348 规则）

</details>

**Phase 4: 后端控制器**（30 分钟）

<details>
<summary>点击展开详细步骤</summary>

- [ ] **Step 4.1**: 在 `DocumentsController` 添加 3 个端点
  ```typescript
  @Post(':id/archive')
  @ApiBearerAuth()
  @ApiOperation({ summary: '归档文档' })
  async archive(
    @Param('id') id: string,
    @Req() req,
    @Body() dto: ArchiveDocumentDto
  ) {
    return this.documentsService.archiveDocument(id, req.user.id, dto);
  }

  @Post(':id/obsolete')
  async obsolete(@Param('id') id: string, @Req() req, @Body() dto: ObsoleteDocumentDto) {
    return this.documentsService.obsoleteDocument(id, req.user.id, dto);
  }

  @Post(':id/restore')
  @UseGuards(AdminGuard)  // 仅管理员可恢复
  async restore(@Param('id') id: string, @Req() req, @Body() dto: RestoreDocumentDto) {
    return this.documentsService.restoreDocument(id, req.user.id, dto);
  }
  ```

- [ ] **Step 4.2**: 添加 Swagger 文档注解

</details>

**Phase 5: 后端单元测试**（1.5 小时）

<details>
<summary>点击展开详细步骤</summary>

- [ ] **Step 5.1**: 创建测试文件 `server/test/documents-archive.e2e-spec.ts`
- [ ] **Step 5.2**: 测试归档流程
  ```typescript
  it('should archive a published document', async () => {
    const doc = await createTestDocument({ status: 'published' });

    const response = await request(app.getHttpServer())
      .post(`/documents/${doc.id}/archive`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: '文档已过时' })
      .expect(200);

    expect(response.body.archivedAt).toBeDefined();
    expect(response.body.archivedReason).toBe('文档已过时');
  });

  it('should fail to archive a draft document', async () => {
    const doc = await createTestDocument({ status: 'draft' });

    await request(app.getHttpServer())
      .post(`/documents/${doc.id}/archive`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: '文档已过时' })
      .expect(400);  // BadRequestException
  });
  ```

- [ ] **Step 5.3**: 测试作废流程（需填写替代文档）
- [ ] **Step 5.4**: 测试恢复流程（管理员权限）
- [ ] **Step 5.5**: 运行测试 `npm test -- documents-archive.e2e-spec.ts`
- [ ] **Step 5.6**: 验证覆盖率 > 80%

</details>

**Phase 6: 前端归档/作废对话框**（2 小时）

<details>
<summary>点击展开详细步骤</summary>

- [ ] **Step 6.1**: 创建归档对话框组件
  ```bash
  code client/src/components/documents/ArchiveDialog.vue
  ```

  ```vue
  <template>
    <el-dialog v-model="visible" title="归档文档" width="500px">
      <el-form :model="form" :rules="rules" ref="formRef">
        <el-form-item label="归档原因" prop="reason">
          <el-input
            v-model="form.reason"
            type="textarea"
            :rows="4"
            placeholder="请输入归档原因（必填）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" @click="handleConfirm" :loading="loading">
          确认归档
        </el-button>
      </template>
    </el-dialog>
  </template>

  <script setup lang="ts">
  import { ref, reactive } from 'vue'
  import { ElMessage } from 'element-plus'
  import { archiveDocument } from '@/api/documents'

  const visible = ref(false)
  const loading = ref(false)
  const form = reactive({ reason: '' })
  const rules = {
    reason: [{ required: true, message: '请输入归档原因', trigger: 'blur' }]
  }

  const handleConfirm = async () => {
    try {
      loading.value = true
      await archiveDocument(props.documentId, form)
      ElMessage.success('文档已归档')
      visible.value = false
      emit('success')
    } catch (error) {
      ElMessage.error(error.message || '归档失败')
    } finally {
      loading.value = false
    }
  }
  </script>
  ```

- [ ] **Step 6.2**: 创建作废对话框组件（类似逻辑 + 替代文档选择器）

</details>

**Phase 7: 前端文档详情页集成**（1 小时）

<details>
<summary>点击展开详细步骤</summary>

- [ ] **Step 7.1**: 在文档详情页添加归档/作废按钮
  ```vue
  <!-- client/src/views/documents/Detail.vue -->
  <template>
    <div class="document-detail">
      <!-- 现有内容 -->

      <div class="action-buttons" v-if="document.status === 'published'">
        <el-button @click="showArchiveDialog = true">归档</el-button>
        <el-button @click="showObsoleteDialog = true">作废</el-button>
      </div>

      <ArchiveDialog
        v-model="showArchiveDialog"
        :document-id="document.id"
        @success="fetchDocumentDetail"
      />
      <ObsoleteDialog
        v-model="showObsoleteDialog"
        :document-id="document.id"
        @success="fetchDocumentDetail"
      />
    </div>
  </template>
  ```

- [ ] **Step 7.2**: 添加 API 调用方法
  ```typescript
  // client/src/api/documents.ts
  export const archiveDocument = (id: string, data: { reason: string }) =>
    request.post(`/documents/${id}/archive`, data)

  export const obsoleteDocument = (id: string, data: { reason: string, replacedByDocId?: string }) =>
    request.post(`/documents/${id}/obsolete`, data)

  export const restoreDocument = (id: string, data: { reason: string }) =>
    request.post(`/documents/${id}/restore`, data)
  ```

</details>

**Phase 8: E2E 测试**（30 分钟）

<details>
<summary>点击展开详细步骤</summary>

- [ ] **Step 8.1**: 测试归档流程
  - 打开文档详情页（状态为"已发布"）
  - 点击"归档"按钮
  - 填写归档原因
  - 确认归档
  - 验证文档详情页刷新，状态变为"已归档"
  - 验证归档后文档不可编辑

- [ ] **Step 8.2**: 测试作废流程（类似）
- [ ] **Step 8.3**: 测试恢复流程（管理员登录）

</details>

##### ✅ 验收标准
- ✅ 数据库迁移成功，6 个新字段已添加
- ✅ 3 个 API 端点正常工作（`/archive`, `/obsolete`, `/restore`）
- ✅ 后端单元测试覆盖率 > 80%
- ✅ 前端归档/作废按钮显示正确（仅"已发布"状态显示）
- ✅ 归档对话框交互流畅（表单验证、成功提示）
- ✅ E2E 测试通过（完整归档流程）
- ✅ 遵循 BR-346, BR-347, BR-348 业务规则

##### 🐛 常见问题排查
- **问题**: Prisma 迁移失败 → 参考 CLAUDE.md #3 "编码后立即验证原则"
- **问题**: API 返回 403 权限不足 → 检查 JWT Token 是否正确、用户角色是否为管理员
- **问题**: 前端对话框不显示 → 检查 `v-model` 绑定是否正确

---

#### Task-003: P1-2 细粒度权限系统
**估时**: 40 小时
**优先级**: P1
**依赖**: Task-002 完成
**状态**: ⏳ 待实施
**完整方案**: DESIGN.md v10.7 第 22.2.2 章

##### 📝 需求描述
实现基于 RBAC + 资源级的细粒度权限系统，支持：
- 权限定义（20-30 个预定义权限，按功能分类）
- 权限授予（可指定过期时间、资源范围）
- 权限撤销（需填写原因）
- 权限检查（API 中间件 + 前端按钮控制）
- 权限过期自动失效

**业务规则**:
- BR-349: 权限定义规则
- BR-350: 权限授予规则
- BR-351: 权限撤销规则
- BR-352: 资源级权限规则
- BR-353: 权限过期规则

##### 📂 涉及文件
```
# 后端
server/src/prisma/schema.prisma                              # Prisma Schema（Permission + UserPermission 表）
server/src/modules/permissions/permissions.module.ts         # 权限模块
server/src/modules/permissions/permissions.service.ts        # 权限服务
server/src/modules/permissions/permissions.controller.ts     # 权限控制器
server/src/modules/permissions/permissions.seed.ts           # 权限种子数据
server/src/modules/permissions/guards/permission.guard.ts    # 权限守卫
server/src/modules/permissions/dto/grant-permission.dto.ts   # 授予权限 DTO
server/test/permissions.e2e-spec.ts                          # E2E 测试

# 前端
client/src/views/system/UserPermissions.vue                  # 用户权限管理页
client/src/components/permissions/GrantDialog.vue            # 授予权限对话框
client/src/api/permissions.ts                                # API 调用
client/src/composables/usePermission.ts                      # 权限检查 Hook
```

##### 🔧 开发步骤

**Phase 1: 权限定义**（2 小时）

<details>
<summary>点击展开详细步骤</summary>

- [ ] **Step 1.1**: 定义权限清单
  ```typescript
  // server/src/modules/permissions/permissions.seed.ts
  export const PERMISSIONS = [
    // 文档类权限
    { code: 'document:cross_dept_view', name: '跨部门文档查看', category: 'document', scope: 'company' },
    { code: 'document:delete', name: '文档删除', category: 'document', scope: 'department' },
    { code: 'document:export', name: '文档导出', category: 'document', scope: 'department' },

    // 模板类权限
    { code: 'template:edit', name: '模板编辑', category: 'template', scope: 'company' },
    { code: 'template:delete', name: '模板删除', category: 'template', scope: 'company' },

    // 任务类权限
    { code: 'task:assign', name: '任务分配', category: 'task', scope: 'department' },
    { code: 'task:approve', name: '任务审批', category: 'task', scope: 'resource' },

    // 审批类权限
    { code: 'approval:override', name: '审批覆盖', category: 'approval', scope: 'company' },

    // 系统类权限
    { code: 'system:user_manage', name: '用户管理', category: 'system', scope: 'company' },
    { code: 'system:permission_grant', name: '权限授予', category: 'system', scope: 'company' },

    // ... 更多权限（总计 20-30 个）
  ];
  ```

- [ ] **Step 1.2**: 权限分类汇总
  - 文档类（document）: 5-8 个权限
  - 模板类（template）: 3-5 个权限
  - 任务类（task）: 3-5 个权限
  - 审批类（approval）: 2-3 个权限
  - 系统类（system）: 5-8 个权限

</details>

**Phase 2: 数据库设计**（1.5 小时）

<details>
<summary>点击展开详细步骤</summary>

- [ ] **Step 2.1**: 更新 Prisma Schema
  ```prisma
  model Permission {
    id          String   @id @default(cuid())
    code        String   @unique          // 如 "document:cross_dept_view"
    name        String                     // 如 "跨部门文档查看"
    category    String                     // 如 "document"
    scope       String   @default("department")  // "department" | "company" | "resource"
    description String?
    createdAt   DateTime @default(now())
    updatedAt   DateTime @updatedAt
    users       UserPermission[]
    @@map("permissions")
  }

  model UserPermission {
    id            String   @id @default(cuid())
    userId        String
    permissionId  String
    grantedBy     String   // 授予人用户 ID
    grantedByName String   // 授予人姓名（冗余字段，便于审计）
    grantedAt     DateTime @default(now())
    expiresAt     DateTime?  // 可选，权限过期时间
    reason        String?    // 授予原因
    resourceType  String?    // 如 "template"、"document"
    resourceId    String?    // 如模板 ID、文档 ID
    user          User       @relation(fields: [userId], references: [id], onDelete: Cascade)
    permission    Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)
    @@index([userId])
    @@index([permissionId])
    @@index([expiresAt])
    @@map("user_permissions")
  }
  ```

- [ ] **Step 2.2**: 运行数据库迁移
  ```bash
  npx prisma migrate dev --name add-permission-tables
  ```

- [ ] **Step 2.3**: 创建权限种子数据
  ```bash
  npx prisma db seed
  ```

</details>

**Phase 3: 后端服务层**（6 小时）

<details>
<summary>点击展开详细步骤</summary>

- [ ] **Step 3.1**: 创建权限服务
  ```typescript
  @Injectable()
  export class PermissionsService {
    // 获取所有权限定义
    async getAllPermissions() {
      return this.prisma.permission.findMany();
    }

    // 获取用户权限列表
    async getUserPermissions(userId: string) {
      return this.prisma.userPermission.findMany({
        where: { userId },
        include: { permission: true },
      });
    }

    // 授予权限
    async grantPermission(dto: GrantPermissionDto, grantedBy: string) {
      // BR-350: 授予权限规则
      return this.prisma.userPermission.create({
        data: {
          userId: dto.userId,
          permissionId: dto.permissionId,
          grantedBy,
          grantedByName: await this.getUserName(grantedBy),
          expiresAt: dto.expiresAt,
          reason: dto.reason,
          resourceType: dto.resourceType,
          resourceId: dto.resourceId,
        },
      });
    }

    // 撤销权限
    async revokePermission(id: string, reason: string) {
      // BR-351: 撤销权限规则
      return this.prisma.userPermission.delete({ where: { id } });
    }

    // 检查用户权限
    async checkPermission(userId: string, permissionCode: string, resourceId?: string): Promise<boolean> {
      const now = new Date();

      const permission = await this.prisma.permission.findUnique({
        where: { code: permissionCode },
      });
      if (!permission) return false;

      const userPermission = await this.prisma.userPermission.findFirst({
        where: {
          userId,
          permissionId: permission.id,
          OR: [
            { expiresAt: null },  // 永久权限
            { expiresAt: { gte: now } },  // 未过期
          ],
          ...(resourceId && {
            OR: [
              { resourceId: null },  // 全局权限
              { resourceId },  // 资源级权限
            ],
          }),
        },
      });

      return !!userPermission;
    }

    // 批量授予权限
    async batchGrantPermissions(userIds: string[], permissionId: string, grantedBy: string) {
      const data = userIds.map(userId => ({
        userId,
        permissionId,
        grantedBy,
        grantedByName: this.getUserName(grantedBy),
      }));

      return this.prisma.userPermission.createMany({ data });
    }
  }
  ```

- [ ] **Step 3.2**: 创建权限守卫
  ```typescript
  @Injectable()
  export class PermissionGuard implements CanActivate {
    constructor(private permissionsService: PermissionsService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
      const request = context.switchToHttp().getRequest();
      const user = request.user;
      const requiredPermission = this.reflector.get<string>('permission', context.getHandler());

      if (!requiredPermission) return true;  // 无权限要求

      return this.permissionsService.checkPermission(user.id, requiredPermission);
    }
  }
  ```

</details>

**Phase 4: 后端 API 端点**（2 小时）

<details>
<summary>点击展开详细步骤</summary>

- [ ] **Step 4.1**: 创建权限控制器
  ```typescript
  @Controller('permissions')
  @ApiBearerAuth()
  export class PermissionsController {
    @Get()
    @ApiOperation({ summary: '获取所有权限定义' })
    async getAllPermissions() {
      return this.permissionsService.getAllPermissions();
    }

    @Get('user/:userId')
    @ApiOperation({ summary: '获取用户权限列表' })
    async getUserPermissions(@Param('userId') userId: string) {
      return this.permissionsService.getUserPermissions(userId);
    }

    @Post('grant')
    @UseGuards(PermissionGuard)
    @RequirePermission('system:permission_grant')
    @ApiOperation({ summary: '授予权限' })
    async grantPermission(@Body() dto: GrantPermissionDto, @Req() req) {
      return this.permissionsService.grantPermission(dto, req.user.id);
    }

    @Delete(':id')
    @UseGuards(PermissionGuard)
    @RequirePermission('system:permission_grant')
    @ApiOperation({ summary: '撤销权限' })
    async revokePermission(@Param('id') id: string, @Body() body: { reason: string }) {
      return this.permissionsService.revokePermission(id, body.reason);
    }

    @Get('check')
    @ApiOperation({ summary: '检查用户权限' })
    async checkPermission(
      @Query('userId') userId: string,
      @Query('permissionCode') permissionCode: string,
      @Query('resourceId') resourceId?: string,
    ) {
      const hasPermission = await this.permissionsService.checkPermission(
        userId,
        permissionCode,
        resourceId,
      );
      return { hasPermission };
    }

    @Post('batch-grant')
    @UseGuards(PermissionGuard)
    @RequirePermission('system:permission_grant')
    @ApiOperation({ summary: '批量授予权限' })
    async batchGrant(@Body() dto: BatchGrantDto, @Req() req) {
      return this.permissionsService.batchGrantPermissions(
        dto.userIds,
        dto.permissionId,
        req.user.id,
      );
    }
  }
  ```

</details>

**Phase 5: 后端单元测试**（4 小时）

<details>
<summary>点击展开详细步骤</summary>

- [ ] **Step 5.1**: 创建测试文件 `server/test/permissions.e2e-spec.ts`
- [ ] **Step 5.2**: 测试权限授予流程
  ```typescript
  it('should grant permission to user', async () => {
    const response = await request(app.getHttpServer())
      .post('/permissions/grant')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userId: testUser.id,
        permissionId: testPermission.id,
        reason: '财务审计需要',
        expiresAt: '2026-03-01T00:00:00Z',
      })
      .expect(201);

    expect(response.body.userId).toBe(testUser.id);
    expect(response.body.permissionId).toBe(testPermission.id);
  });
  ```

- [ ] **Step 5.3**: 测试权限撤销流程
- [ ] **Step 5.4**: 测试权限检查（含过期、资源级）
- [ ] **Step 5.5**: 测试批量授予
- [ ] **Step 5.6**: 验证覆盖率 > 80%

</details>

**Phase 6: 前端权限管理页面**（8 小时）

<details>
<summary>点击展开详细步骤</summary>

- [ ] **Step 6.1**: 创建用户权限管理页面
  ```vue
  <!-- client/src/views/system/UserPermissions.vue -->
  <template>
    <div class="user-permissions">
      <el-page-header @back="$router.back()" title="返回" content="用户权限管理" />

      <el-card>
        <template #header>
          <div class="card-header">
            <span>用户: {{ user.name }} ({{ user.department.name }})</span>
            <el-button type="primary" @click="grantDialogVisible = true">
              授予权限
            </el-button>
          </div>
        </template>

        <el-table :data="userPermissions" style="width: 100%">
          <el-table-column prop="permission.name" label="权限名称" />
          <el-table-column prop="permission.category" label="类别" />
          <el-table-column prop="grantedByName" label="授予人" />
          <el-table-column prop="grantedAt" label="授予时间">
            <template #default="{ row }">
              {{ formatDate(row.grantedAt) }}
            </template>
          </el-table-column>
          <el-table-column prop="expiresAt" label="过期时间">
            <template #default="{ row }">
              {{ row.expiresAt ? formatDate(row.expiresAt) : '永久' }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100">
            <template #default="{ row }">
              <el-button link type="danger" @click="handleRevoke(row)">
                撤销
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- 授予权限对话框 -->
      <GrantDialog
        v-model="grantDialogVisible"
        :user-id="userId"
        @success="fetchUserPermissions"
      />
    </div>
  </template>

  <script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { useRoute } from 'vue-router'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { getUserPermissions, revokePermission } from '@/api/permissions'
  import GrantDialog from '@/components/permissions/GrantDialog.vue'

  const route = useRoute()
  const userId = route.params.id
  const userPermissions = ref([])
  const grantDialogVisible = ref(false)

  const fetchUserPermissions = async () => {
    const res = await getUserPermissions(userId)
    userPermissions.value = res.data
  }

  const handleRevoke = async (row) => {
    try {
      await ElMessageBox.confirm('确认撤销该权限?', '警告', { type: 'warning' })
      const { value: reason } = await ElMessageBox.prompt('请输入撤销原因', '撤销权限')

      await revokePermission(row.id, { reason })
      ElMessage.success('权限已撤销')
      fetchUserPermissions()
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(error.message || '撤销失败')
      }
    }
  }

  onMounted(() => {
    fetchUserPermissions()
  })
  </script>
  ```

- [ ] **Step 6.2**: 创建授予权限对话框（参考 DESIGN.md v10.7 第 22.2.2 章 Vue 3 代码示例）

</details>

**Phase 7: 前端权限检查 Hook**（2 小时）

<details>
<summary>点击展开详细步骤</summary>

- [ ] **Step 7.1**: 创建 `usePermission` composable
  ```typescript
  // client/src/composables/usePermission.ts
  import { computed } from 'vue'
  import { useUserStore } from '@/stores/user'

  export function usePermission() {
    const userStore = useUserStore()

    const hasPermission = (permissionCode: string): boolean => {
      return userStore.permissions.some(p => p.code === permissionCode)
    }

    const hasAnyPermission = (...permissionCodes: string[]): boolean => {
      return permissionCodes.some(code => hasPermission(code))
    }

    const hasAllPermissions = (...permissionCodes: string[]): boolean => {
      return permissionCodes.every(code => hasPermission(code))
    }

    return {
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
    }
  }
  ```

- [ ] **Step 7.2**: 在按钮中使用权限检查
  ```vue
  <el-button
    v-if="hasPermission('document:delete')"
    type="danger"
    @click="handleDelete"
  >
    删除
  </el-button>
  ```

</details>

**Phase 8: E2E 测试**（2 小时）

<details>
<summary>点击展开详细步骤</summary>

- [ ] **Step 8.1**: 测试授予权限流程
- [ ] **Step 8.2**: 测试撤销权限流程
- [ ] **Step 8.3**: 测试权限过期后无法访问

</details>

##### ✅ 验收标准
- ✅ Permission 和 UserPermission 表已创建，索引正确
- ✅ 20-30 个默认权限已插入
- ✅ 6 个 API 端点正常工作
- ✅ 权限守卫正确拦截无权限请求（返回 403）
- ✅ 后端单元测试覆盖率 > 80%
- ✅ 前端权限管理页面显示正常
- ✅ 授予/撤销权限流程流畅
- ✅ E2E 测试通过
- ✅ 遵循 BR-349 ~ BR-353 业务规则

##### 🐛 常见问题排查
- **问题**: 权限守卫不生效 → 检查 `@UseGuards(PermissionGuard)` 是否正确添加
- **问题**: 权限检查总是返回 false → 检查 `UserPermission.expiresAt` 是否过期
- **问题**: 前端按钮权限控制不生效 → 检查 `usePermission` Hook 是否正确导入

---

#### Task-004: P1-3 简化工作流引擎
**估时**: 20 小时
**优先级**: P1
**依赖**: Task-003 完成（依赖权限系统）
**状态**: ⏳ 待实施
**完整方案**: DESIGN.md v10.7 第 22.2.3 章
**备注**: 这是 v2.0.0 工作流引擎的简化版，仅实现基础串行审批

##### 📝 需求描述
实现基础工作流引擎，支持：
- 工作流模板定义（JSON 配置串行审批步骤）
- 工作流启动（指定模板 + 关联业务对象）
- 串行审批流程（主管 → 经理 → 总监）
- 审批通过/驳回
- 工作流取消

**不包含**（留给 v2.0.0）:
- 并行审批
- 条件分支
- 子工作流
- 审批超时升级
- 可视化配置器

**业务规则**:
- BR-354: 工作流模板规则
- BR-355: 工作流启动规则
- BR-356: 串行审批规则
- BR-359: 工作流取消规则

##### 📂 涉及文件
```
# 后端
server/src/prisma/schema.prisma                              # Prisma Schema（3 个工作流表）
server/src/modules/workflow/workflow.module.ts               # 工作流模块
server/src/modules/workflow/workflow.service.ts              # 工作流服务
server/src/modules/workflow/workflow.controller.ts           # 工作流控制器
server/src/modules/workflow/dto/create-template.dto.ts       # 创建模板 DTO
server/src/modules/workflow/dto/start-workflow.dto.ts        # 启动工作流 DTO
server/test/workflow.e2e-spec.ts                             # E2E 测试

# 前端
client/src/views/workflow/MyTasks.vue                        # 我的待审批任务
client/src/components/workflow/ApprovalDialog.vue           # 审批对话框
client/src/api/workflow.ts                                   # API 调用
```

##### 🔧 开发步骤

**Phase 1: 数据库设计**（1 小时）

<details>
<summary>点击展开详细步骤</summary>

- [ ] **Step 1.1**: 更新 Prisma Schema
  ```prisma
  model WorkflowTemplate {
    id          String   @id @default(cuid())
    name        String   // 如 "文档审批流程（三级）"
    description String?
    category    String   // "document" | "task" | "deviation"
    steps       Json     // 步骤定义数组
    isActive    Boolean  @default(true)
    createdBy   String
    createdAt   DateTime @default(now())
    updatedAt   DateTime @updatedAt
    instances   WorkflowInstance[]
    @@map("workflow_templates")
  }

  model WorkflowInstance {
    id          String   @id @default(cuid())
    templateId  String
    name        String   // 如 "文档《质量手册v2》审批流程"
    status      String   // "pending" | "in_progress" | "completed" | "rejected" | "cancelled"
    businessType String  // "document" | "task" | "deviation"
    businessId  String   // 关联业务对象 ID
    currentStep Int      @default(0)
    startedBy   String
    startedAt   DateTime @default(now())
    completedAt DateTime?
    template    WorkflowTemplate @relation(fields: [templateId], references: [id])
    tasks       WorkflowTask[]
    @@index([businessType, businessId])
    @@map("workflow_instances")
  }

  model WorkflowTask {
    id          String   @id @default(cuid())
    instanceId  String
    stepIndex   Int      // 步骤序号（从 0 开始）
    stepName    String   // 如 "主管审批"
    assignee    String   // 审批人用户 ID
    assigneeName String  // 审批人姓名（冗余字段）
    status      String   // "pending" | "approved" | "rejected" | "cancelled"
    comment     String?  // 审批意见
    dueAt       DateTime? // 截止时间
    completedAt DateTime?
    instance    WorkflowInstance @relation(fields: [instanceId], references: [id], onDelete: Cascade)
    @@index([assignee, status])
    @@map("workflow_tasks")
  }
  ```

- [ ] **Step 1.2**: 运行数据库迁移
  ```bash
  npx prisma migrate dev --name add-workflow-tables
  ```

</details>

**Phase 2: 后端工作流引擎**（6 小时）

<details>
<summary>点击展开详细步骤</summary>

- [ ] **Step 2.1**: 创建工作流服务
  ```typescript
  @Injectable()
  export class WorkflowService {
    // 创建工作流模板
    async createTemplate(dto: CreateTemplateDto) {
      return this.prisma.workflowTemplate.create({
        data: {
          name: dto.name,
          category: dto.category,
          steps: dto.steps,
          createdBy: dto.createdBy,
        },
      });
    }

    // 启动工作流
    async startWorkflow(dto: StartWorkflowDto, startedBy: string) {
      const template = await this.prisma.workflowTemplate.findUnique({
        where: { id: dto.templateId },
      });
      if (!template) throw new NotFoundException('工作流模板不存在');

      // 创建工作流实例
      const instance = await this.prisma.workflowInstance.create({
        data: {
          templateId: dto.templateId,
          name: dto.name,
          businessType: dto.businessType,
          businessId: dto.businessId,
          startedBy,
          status: 'in_progress',
        },
      });

      // 创建第一步审批任务
      const firstStep = template.steps[0];
      await this.createTask(instance.id, 0, firstStep);

      return instance;
    }

    // 审批通过
    async approveTask(taskId: string, userId: string, comment: string) {
      const task = await this.prisma.workflowTask.findUnique({
        where: { id: taskId },
        include: { instance: { include: { template: true } } },
      });
      if (!task) throw new NotFoundException('审批任务不存在');
      if (task.assignee !== userId) throw new ForbiddenException('无权限审批此任务');

      // 更新任务状态
      await this.prisma.workflowTask.update({
        where: { id: taskId },
        data: {
          status: 'approved',
          comment,
          completedAt: new Date(),
        },
      });

      // 检查是否有下一步
      const template = task.instance.template;
      const nextStepIndex = task.stepIndex + 1;

      if (nextStepIndex < template.steps.length) {
        // 创建下一步任务
        const nextStep = template.steps[nextStepIndex];
        await this.createTask(task.instanceId, nextStepIndex, nextStep);
        await this.prisma.workflowInstance.update({
          where: { id: task.instanceId },
          data: { currentStep: nextStepIndex },
        });
      } else {
        // 工作流完成
        await this.prisma.workflowInstance.update({
          where: { id: task.instanceId },
          data: {
            status: 'completed',
            completedAt: new Date(),
          },
        });
      }
    }

    // 审批驳回
    async rejectTask(taskId: string, userId: string, comment: string) {
      const task = await this.prisma.workflowTask.findUnique({ where: { id: taskId } });
      if (!task) throw new NotFoundException('审批任务不存在');
      if (task.assignee !== userId) throw new ForbiddenException('无权限审批此任务');

      // 更新任务状态
      await this.prisma.workflowTask.update({
        where: { id: taskId },
        data: {
          status: 'rejected',
          comment,
          completedAt: new Date(),
        },
      });

      // 工作流驳回
      await this.prisma.workflowInstance.update({
        where: { id: task.instanceId },
        data: {
          status: 'rejected',
          completedAt: new Date(),
        },
      });
    }

    // 获取我的待审批任务
    async getMyTasks(userId: string, status?: string) {
      return this.prisma.workflowTask.findMany({
        where: {
          assignee: userId,
          ...(status && { status }),
        },
        include: { instance: true },
        orderBy: { createdAt: 'desc' },
      });
    }

    private async createTask(instanceId: string, stepIndex: number, step: any) {
      const assignee = await this.resolveAssignee(step.assigneeRole);

      return this.prisma.workflowTask.create({
        data: {
          instanceId,
          stepIndex,
          stepName: step.name,
          assignee: assignee.id,
          assigneeName: assignee.name,
          status: 'pending',
        },
      });
    }

    private async resolveAssignee(role: string) {
      // 简化版：根据角色查找用户
      // 实际应根据部门、角色等复杂逻辑查找
      return this.prisma.user.findFirst({ where: { role } });
    }
  }
  ```

</details>

**Phase 3: 后端 API 端点**（2 小时）

<details>
<summary>点击展开详细步骤</summary>

- [ ] **Step 3.1**: 创建工作流控制器
  ```typescript
  @Controller('workflow')
  @ApiBearerAuth()
  export class WorkflowController {
    @Post('templates')
    @UseGuards(AdminGuard)
    @ApiOperation({ summary: '创建工作流模板' })
    async createTemplate(@Body() dto: CreateTemplateDto, @Req() req) {
      return this.workflowService.createTemplate({ ...dto, createdBy: req.user.id });
    }

    @Get('templates')
    @ApiOperation({ summary: '获取工作流模板列表' })
    async getTemplates(@Query('category') category?: string) {
      return this.workflowService.getTemplates(category);
    }

    @Post('instances')
    @ApiOperation({ summary: '启动工作流' })
    async startWorkflow(@Body() dto: StartWorkflowDto, @Req() req) {
      return this.workflowService.startWorkflow(dto, req.user.id);
    }

    @Get('my-tasks')
    @ApiOperation({ summary: '获取我的待审批任务' })
    async getMyTasks(@Req() req, @Query('status') status?: string) {
      return this.workflowService.getMyTasks(req.user.id, status);
    }

    @Post('tasks/:id/approve')
    @ApiOperation({ summary: '审批通过' })
    async approveTask(@Param('id') id: string, @Req() req, @Body() body: { comment: string }) {
      return this.workflowService.approveTask(id, req.user.id, body.comment);
    }

    @Post('tasks/:id/reject')
    @ApiOperation({ summary: '审批驳回' })
    async rejectTask(@Param('id') id: string, @Req() req, @Body() body: { comment: string }) {
      return this.workflowService.rejectTask(id, req.user.id, body.comment);
    }

    @Post('instances/:id/cancel')
    @ApiOperation({ summary: '取消工作流' })
    async cancelWorkflow(@Param('id') id: string, @Body() body: { reason: string }) {
      return this.workflowService.cancelWorkflow(id, body.reason);
    }
  }
  ```

</details>

**Phase 4: 后端单元测试**（3 小时）

<details>
<summary>点击展开详细步骤</summary>

- [ ] **Step 4.1**: 测试创建工作流模板
- [ ] **Step 4.2**: 测试启动工作流
- [ ] **Step 4.3**: 测试串行审批流程（主管 → 经理 → 总监）
- [ ] **Step 4.4**: 测试审批驳回
- [ ] **Step 4.5**: 测试工作流取消
- [ ] **Step 4.6**: 验证覆盖率 > 80%

</details>

**Phase 5: 前端我的待审批任务页面**（4 小时）

<details>
<summary>点击展开详细步骤</summary>

- [ ] **Step 5.1**: 创建我的待审批任务页面（参考 DESIGN.md v10.7 第 22.2.3 章 Vue 3 代码示例）
- [ ] **Step 5.2**: 创建审批对话框（显示业务对象详情 + 审批意见）

</details>

**Phase 6: E2E 测试**（2 小时）

<details>
<summary>点击展开详细步骤</summary>

- [ ] **Step 6.1**: 测试启动工作流
- [ ] **Step 6.2**: 测试串行审批流程（完整流转）
- [ ] **Step 6.3**: 测试审批驳回
- [ ] **Step 6.4**: 测试工作流取消

</details>

##### ✅ 验收标准
- ✅ 3 个工作流表已创建
- ✅ 工作流引擎可执行串行审批
- ✅ 8 个 API 端点正常工作
- ✅ 后端单元测试覆盖率 > 80%
- ✅ 我的待审批任务页面正常显示
- ✅ E2E 测试通过
- ✅ 遵循 BR-354, BR-355, BR-356, BR-359 业务规则

##### 🐛 常见问题排查
- **问题**: 工作流启动后无任务生成 → 检查 `createTask` 方法是否正确调用
- **问题**: 审批后未自动流转 → 检查 `approveTask` 中的步骤流转逻辑
- **问题**: 审批人查找失败 → 检查 `resolveAssignee` 方法的角色查询逻辑

---

### 🟡 **P2: 功能完善（中优先级）**

---

#### Task-005: Phase 7-8 配方偏离检测完善
**估时**: 48 小时
**优先级**: P2
**依赖**: Task-004 完成
**状态**: 🚧 部分完成（核心检测已实现 60%）

##### 📝 需求概述
完善配方偏离检测功能，包括：
- 公差配置优化（支持更多类型）
- 偏离检测算法优化
- 偏离报告模板定制
- 二级审批流程（依赖 P1-3 工作流）

**已完成**:
- ✅ 基础公差配置（范围/百分比）
- ✅ 自动偏离检测
- ✅ 偏离报告生成

**待完成**:
- ⏳ 公差类型扩展（累计偏离、趋势偏离）
- ⏳ 偏离报告模板定制
- ⏳ 二级审批流程（主管 → 经理）

详细任务拆分见 DESIGN.md 第十三章 Phase 7-8 部分。

---

#### Task-006: Phase 10 二级审批流程
**估时**: 16 小时
**优先级**: P2
**依赖**: Task-004 完成（依赖 P1-3 工作流引擎）
**状态**: ⏳ 待实施

##### 📝 需求概述
实现二级审批流程（主管 → 经理），用于偏离任务审批。基于 P1-3 简化工作流引擎实现。

详细方案见 DESIGN.md 第十六章 Phase 10 部分。

---

#### Task-007: Phase 11 文件预览完善
**估时**: 60 小时
**优先级**: P2
**依赖**: 无
**状态**: 🚧 部分完成（PDF 已实现 30%）

##### 📝 需求概述
完善文件预览功能，支持：
- Word 文件预览（LibreOffice 转换）
- Excel 文件预览（SheetJS 渲染）
- 预览性能优化（缓存、懒加载）

**已完成**:
- ✅ PDF 原生预览（`client/src/components/PdfViewer.vue`）

**待完成**:
- ⏳ Word 预览（后端 LibreOffice 转 PDF）
- ⏳ Excel 预览（前端 SheetJS 渲染）
- ⏳ 预览缓存（MinIO + Redis）

详细任务拆分见 DESIGN.md 第十三章 Phase 11 部分。

---

#### Task-008: 测试覆盖率提升
**估时**: 20 小时
**优先级**: P1
**依赖**: Task-001 ~ Task-004 完成
**状态**: ⏳ 待实施

##### 📝 需求概述
将测试覆盖率从当前 85.3% 提升到 90%+。

**任务拆分**:
1. 识别覆盖率盲点（1h）- 运行 `npm run test:cov`，识别 < 80% 的文件
2. 补充单元测试（12h）- 为低覆盖率服务添加测试
3. 补充集成测试（4h）- 为新增 API 端点添加 E2E 测试
4. 补充 E2E 测试（3h）- 为关键用户流程添加 E2E 测试

**验收标准**:
- ✅ 测试覆盖率 > 90%
- ✅ 所有核心业务逻辑覆盖率 > 85%
- ✅ 所有测试通过

---

### 🔵 **P3: 长期规划（低优先级）**

---

#### Task-009: v2.0.0 智能文档工作流引擎
**估时**: 400 小时
**优先级**: P0（长期）
**依赖**: Task-004 完成
**状态**: ⏳ 待实施
**完整方案**: DESIGN.md 第十四章

##### 📝 需求概述
实现完整的智能文档工作流引擎，替代 P1-3 简化版，支持：
- 可视化工作流配置器（拖拽式设计）
- 并行审批（会签）
- 条件分支（根据字段值自动分流）
- 子工作流
- 审批超时自动升级
- 审批人代理
- 工作流版本管理
- 工作流统计分析

**Phase 划分**:
- Phase 1: 数据模型设计（80h）
- Phase 2: 核心引擎实现（120h）
- Phase 3: 可视化配置器（80h）
- Phase 4: 高级特性（80h）
- Phase 5: 集成测试（40h）

详细实施计划见 DESIGN.md 第十四章。

---

#### Task-010: v2.0.0 扩展模块
**估时**: 1200+ 小时
**优先级**: P3（长期）
**依赖**: Task-009 完成
**状态**: ⏳ 待实施

##### 📝 需求概述
实现扩展模块，包括：
- 培训管理系统（DESIGN.md 第十五章）
- 内审管理系统（DESIGN.md 第十六章）
- 仓库管理系统（DESIGN.md 第十七章）
- 设备管理系统（DESIGN.md 第十八章）
- 批次追溯系统（DESIGN.md 第十九章补充）
- 移动端应用（DESIGN.md 第二十章）
- 系统运维监控（DESIGN.md 第二十一章）

详细规划见 DESIGN.md 对应章节。

---

## 🛠️ 开发流程规范

### 1. 任务开始前
- [ ] 从主分支创建开发分支 `git checkout -b feat/task-xxx`
- [ ] 阅读 DESIGN.md 对应章节的完整需求
- [ ] 阅读 CLAUDE.md 编码预防清单
- [ ] 验证开发环境（Docker 服务、依赖安装）

### 2. 开发过程中
- [ ] 遵循 TDD 原则（先写测试，再写实现）
- [ ] 遵循 CLAUDE.md 的所有开发规则
- [ ] 每完成一个 Phase，运行相关测试
- [ ] 遇到问题参考 CLAUDE.md 编码预防清单

### 3. 任务完成后
- [ ] 运行 ESLint `npm run lint`
- [ ] 运行 Prettier `npm run format`
- [ ] 运行所有测试 `npm test`
- [ ] 验证测试覆盖率 > 80%
- [ ] 提交代码（遵循 Commit Message 规范）
- [ ] 创建 Pull Request

### 4. Code Review
- [ ] 自审代码（参考 CLAUDE.md 实现前检查清单）
- [ ] 团队 Code Review
- [ ] 修复 Review 意见
- [ ] 合并到主分支

### 5. 部署
- [ ] 部署到测试环境
- [ ] 用户验收测试（UAT）
- [ ] 部署到生产环境

---

## 📊 总体时间估算汇总

| 类别 | 总估时 | 说明 |
|------|--------|------|
| **短期任务（1-3 周）** | 102h | MVP 完成 + P1 技术债务 |
| **中期任务（1-2 个月）** | 124h | Phase 7-8, 10-11 功能完善 |
| **长期任务（6-12 个月）** | 1600h+ | v2.0.0 工作流引擎 + 扩展模块 |
| **总计** | **1826h+** | 约 228 个工作日（8h/天） |

**人力估算**:
- 1 人全职开发: 约 11 个月
- 2 人并行开发: 约 6 个月
- 3 人团队: 约 4 个月

---

## 📝 Commit Message 规范

遵循 Conventional Commits 规范：

```
<type>: <subject>

<body>

<footer>
```

**Type 类型**:
- `feat`: 新功能
- `fix`: 修复 bug
- `refactor`: 重构
- `test`: 测试
- `docs`: 文档更新
- `chore`: 构建/工具变动

**示例**:
```
feat: 实现文档归档/作废功能 (P1-1)

- 新增 6 个数据库字段（archivedAt, archivedBy 等）
- 实现 3 个 API 端点（archive, obsolete, restore）
- 添加前端归档/作废对话框
- 实现业务规则 BR-346, BR-347, BR-348
- 单元测试覆盖率 82%

Closes #P1-1
```

---

## 🎯 里程碑

### Milestone 1: MVP 100% 完成
**目标日期**: 2 周内
**完成条件**:
- ✅ Task-001 回收站 UI 完成
- ✅ 所有 52/52 MVP 功能完成
- ✅ 测试覆盖率 > 85%

### Milestone 2: P1 技术债务清零
**目标日期**: 8 周内
**完成条件**:
- ✅ Task-002 文档归档/作废完成
- ✅ Task-003 细粒度权限系统完成
- ✅ Task-004 简化工作流引擎完成
- ✅ 测试覆盖率 > 90%

### Milestone 3: Phase 1-12 全部完成
**目标日期**: 12 周内
**完成条件**:
- ✅ Task-005 ~ Task-007 完成
- ✅ 所有 Phase 1-12 功能完成
- ✅ 测试覆盖率 > 90%

### Milestone 4: v2.0.0 上线
**目标日期**: 6-12 个月
**完成条件**:
- ✅ Task-009 智能工作流引擎完成
- ✅ Task-010 扩展模块完成
- ✅ 系统性能达标
- ✅ 用户培训完成

---

## 📞 联系与反馈

**项目负责人**: [请填写]
**技术负责人**: [请填写]
**产品负责人**: [请填写]

**问题反馈**:
- GitHub Issues: [仓库地址]
- 邮件: [联系邮箱]

---

**文档维护**: 本 TodoList 将随项目进展持续更新，请定期同步最新版本。

**最后更新**: 2026-02-13
**下次更新**: Task-001 完成后
