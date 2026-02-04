# MVP 完成计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 完成所有 MVP Phase 1-6 功能，达到可验收状态

**Architecture:** 按优先级分三轮实现：基础配置 → 核心功能 → 完善优化

**当前状态评估:**
- 用户认证: 90% ✅
- 用户管理: 90% ⚠️ (缺重置密码)
- 部门管理: 100% ✅
- 文档管理: 30% ❌ (MinIO未配置)
- 模板管理: 70% ⚠️ (Excel前端、默认值未完成)
- 任务分发: 60% ⚠️ (锁定、逾期未完成)
- 站内消息: 80% ⚠️ (逾期提醒未完成)

---

## 第一轮：基础设施配置

### Task 1: MinIO 配置与文件上传

**目标:** 让文件上传/下载功能可用

**文件:**
- 修改: `server/docker-compose.yml` - 添加 MinIO 配置
- 修改: `server/.env` - 添加 MinIO 环境变量
- 修改: `server/src/common/utils/file.util.ts` - MinIO 上传封装
- 修改: `server/src/modules/document/document.service.ts` - 文件上传逻辑

**Step 1: 添加 MinIO 到 docker-compose**

```yaml
minio:
  image: minio/minio:latest
  container_name: minio
  ports:
    - "9000:9000"
    - "9001:9001"
  environment:
    MINIO_ROOT_USER: admin
    MINIO_ROOT_PASSWORD: minio123
  volumes:
    - minio_data:/data
  command: server /data --console-address ":9001"
```

**Step 2: 测试 MinIO 连接**

```bash
# 启动 MinIO 后测试
mc alias set myminio http://localhost:9000 admin minio123
mc mb myminio/documents
```

**Step 3: 验证文件上传 API**

```bash
curl -X POST http://localhost:3000/api/v1/documents \
  -H "Authorization: Bearer <token>" \
  -F "file=@test.pdf" \
  -F "title=测试文档"
```

---

## 第二轮：核心功能完善

### Task 2: Excel 解析前端页面

**目标:** 模板创建支持 Excel 上传解析

**文件:**
- 修改: `client/src/views/templates/TemplateEdit.vue` - 添加 Excel 上传组件

**Step 1: 添加 Excel 上传组件**

```vue
<template>
  <el-upload
    drag
    action="/api/v1/templates/parse-excel"
    :headers="{ Authorization: `Bearer ${token}` }"
    :on-success="handleExcelSuccess"
  >
    <el-icon class="el-icon--upload"><Upload /></el-icon>
    <div class="el-upload__text">拖拽或点击上传 Excel</div>
  </el-upload>
</template>
```

**Step 2: 字段映射界面**

```typescript
// 解析成功后显示字段映射
const handleExcelSuccess = (response) => {
  fields.value = response.data.fields.map(f => ({
    label: f.name,
    type: guessFieldType(f.type),
    required: false
  }));
};
```

---

### Task 3: 任务锁定功能

**目标:** 第一人提交后锁定，其他人可以查看但不能编辑

**文件:**
- 修改: `server/src/modules/task/task.service.ts` - 提交时检查锁定
- 修改: `client/src/views/tasks/TaskDetail.vue` - 显示锁定状态

**Step 1: 后端锁定逻辑**

```typescript
async submitTask(taskId: string, userId: string, data: any) {
  // 检查是否已有提交记录
  const existing = await this.prisma.taskRecord.findFirst({
    where: { taskId, deletedAt: null }
  });

  if (existing) {
    throw new BadRequestException('该任务已有人提交，无法重复提交');
  }

  // 创建提交记录（锁定）
  return this.prisma.taskRecord.create({
    data: {
      taskId,
      templateId,
      dataJson: data,
      status: 'submitted',
      submitterId: userId,
      submittedAt: new Date()
    }
  });
}
```

---

### Task 4: 模板字段默认值

**目标:** 模板创建时支持设置字段默认值

**文件:**
- 修改: `client/src/views/templates/TemplateEdit.vue` - 添加默认值输入
- 修改: `server/src/modules/template/template.service.ts` - 保存默认值

**Step 1: 字段配置扩展**

```vue
<el-table :data="fields">
  <el-table-column prop="label" label="字段名" />
  <el-table-column prop="type" label="类型" />
  <el-table-column prop="defaultValue" label="默认值">
    <template #default="{ row }">
      <el-input v-if="row.type === 'text'" v-model="row.defaultValue" />
      <el-date-picker v-if="row.type === 'date'" v-model="row.defaultValue" type="date" />
      <el-switch v-if="row.type === 'boolean'" v-model="row.defaultValue" />
    </template>
  </el-table-column>
</el-table>
```

---

### Task 5: 重置密码功能

**目标:** 管理员可重置用户密码

**文件:**
- 修改: `server/src/modules/user/user.controller.ts` - 添加重置密码接口
- 修改: `server/src/modules/user/user.service.ts` - 重置逻辑
- 修改: `client/src/views/UserList.vue` - 添加重置密码按钮

**Step 1: 后端接口**

```typescript
@Post(':id/reset-password')
@ApiOperation({ summary: '重置用户密码' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
async resetPassword(@Param('id') id: string) {
  const tempPassword = Math.random().toString(36).slice(-8);
  const hashedPassword = await bcrypt.hash(tempPassword, 10);
  await this.prisma.user.update({
    where: { id },
    data: { password: hashedPassword }
  });
  return { password: tempPassword };
}
```

---

## 第三轮：完善优化

### Task 6: 文件搜索/排序

**目标:** 文档列表支持搜索和排序

**文件:**
- 修改: `client/src/views/documents/Level1List.vue` - 添加搜索和排序
- 修改: `server/src/modules/document/document.controller.ts` - 支持搜索参数

**Step 1: 前端**

```vue
<el-form :model="filterForm" inline>
  <el-input v-model="filterForm.keyword" placeholder="搜索标题或编号" />
  <el-select v-model="filterForm.orderBy" placeholder="排序方式">
    <el-option label="创建时间" value="createdAt" />
    <el-option label="文档编号" value="number" />
  </el-select>
</el-form>
```

---

### Task 7: 审批历史查看

**目标:** 文件详情页显示审批历史

**文件:**
- 修改: `client/src/views/documents/DocumentDetail.vue` - 添加审批历史tab
- 修改: `server/src/modules/document/document.service.ts` - 获取审批历史

---

### Task 8: 逾期提醒

**目标:** 截止日期过期后发送站内消息

**文件:**
- 修改: `server/src/modules/task/task.service.ts` - 逾期检查
- 定时任务: `server/src/common/cron/tasks.cron.ts`

**Step 1: 逾期检查定时任务**

```typescript
@Cron(CronExpression.EVERY_DAY_AT_8AM)
async checkOverdueTasks() {
  const overdueTasks = await this.prisma.task.findMany({
    where: {
      deadline: { lt: new Date() },
      status: 'pending'
    }
  });

  for (const task of overdueTasks) {
    await this.notificationService.create({
      userId: task.creatorId,
      type: 'reminder',
      title: '任务逾期提醒',
      content: `任务「${task.title}」已逾期`
    });
  }
}
```

---

## Task 9: 文件版本管理

**目标:** 支持查看历史版本

**文件:**
- 修改: `client/src/views/documents/DocumentDetail.vue` - 版本历史tab
- 修改: `server/src/modules/document/document.controller.ts` - 版本历史接口

---

## 依赖关系图

```
Task 1 (MinIO)
    ↓
    ↓ 文件上传必需 MinIO
    ↓
Task 2 (Excel前端) → Task 4 (默认值) → Task 5 (重置密码)
    ↓
Task 3 (任务锁定)
    ↓
Task 6 (搜索排序) → Task 7 (审批历史) → Task 8 (逾期提醒)
    ↓
Task 9 (版本管理)
```

---

## 优先级排序

| 优先级 | Task | 预计时间 | 阻塞项 |
|--------|------|----------|--------|
| P0 | Task 1: MinIO 配置 | 30分钟 | 无 |
| P0 | Task 2: Excel 前端 | 1小时 | 无 |
| P1 | Task 3: 任务锁定 | 1小时 | 无 |
| P1 | Task 4: 字段默认值 | 30分钟 | Task 2 |
| P1 | Task 5: 重置密码 | 30分钟 | 无 |
| P2 | Task 6: 搜索排序 | 1小时 | 无 |
| P2 | Task 7: 审批历史 | 1小时 | 无 |
| P2 | Task 8: 逾期提醒 | 1小时 | 无 |
| P3 | Task 9: 版本管理 | 2小时 | 无 |

---

## 验收标准

- [ ] 文件上传/下载正常
- [ ] Excel 模板创建正常
- [ ] 任务提交后锁定
- [ ] 模板支持默认值
- [ ] 管理员可重置密码
- [ ] 文档支持搜索排序
- [ ] 审批历史可查看
- [ ] 逾期任务有提醒
- [ ] 所有 P0/P1 功能 E2E 测试通过

---

## 文档位置

- 需求: `docs/DESIGN.md`
- 测试用例: `docs/TEST-CASES-MVP.md`
- 问题记录: `docs/DEBUG-LOG.md`
