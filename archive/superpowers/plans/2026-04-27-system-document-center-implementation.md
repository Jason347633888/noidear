# 体系文件中心实施计划

> **给 agent worker 的要求：**执行本计划时必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans`。任务使用 checkbox（`- [ ]`）追踪。

**目标：**把重复的 `体系文件库` 和 `文档台账` 合并为一个系统内文控中心，支持 Markdown 阅读/编辑/实时预览、PDF 实时预览、业务挂接受控附件、到期提醒，以及轻量 wikilink 双向引用。

**架构：**`Document` 继续作为文件本体和生命周期模型。供应商、产品、来料检验等业务模块保留业务含义，但通过业务文件挂接关系连接到 `Document`，复用预览、版本、归档、作废、到期和提醒能力。Markdown 引用解析写入现有 `DocumentReference`。

**技术栈：**Vue 3、Element Plus、Vitest、NestJS、Prisma、现有 `Document`、`DocumentReference`、`SupplierDocument`、`TodoTask`。

---

## 文件结构

- 修改 `client/src/router/index.ts`：把旧文档列表入口收敛到新中心，保留详情路由。
- 新建 `client/src/views/documents/SystemDocumentCenter.vue`：统一入口，包含 `文件库` 和 `台账` 视图。
- 修改 `client/src/views/documents/SystemFileLibrary.vue`：作为中心内文件库视图。
- 修改 `client/src/views/documents/Level1List.vue`：作为中心内台账视图，或逐步退役独立入口。
- 修改 `client/src/views/documents/DocumentDetail.vue`：增加 Markdown 阅读/编辑/实时预览、PDF 预览和引用区块。
- 新建 `client/src/components/documents/MarkdownViewer.vue`：安全渲染 Markdown。
- 新建 `client/src/components/documents/MarkdownEditor.vue`：Markdown 编辑器 + 实时预览。
- 修改 `client/src/api/document-control.ts`：增加 Markdown 保存、引用刷新、业务文件挂接相关 API。
- 修改 `server/src/modules/document/document.controller.ts`：增加 Markdown 正文更新接口。
- 新建 `server/src/modules/document/services/markdown-wikilink.service.ts`：解析、匹配、同步 wikilink。
- 新建 `server/src/modules/document/services/business-document-link.service.ts`：创建/查询业务对象与 `Document` 的关系。
- 新建 `server/src/modules/document/services/document-expiry.service.ts`：计算到期状态并创建/关闭更新待办。
- 修改 `server/src/modules/document/document.module.ts`：注册新增服务。
- 修改 `server/src/prisma/schema.prisma`：增加最小业务文件挂接模型和 `document_renewal` 待办类型。
- 修改 `server/src/modules/todo/todo.service.ts`：增加 `document_renewal` 的跳转和统计。
- 修改 `server/src/modules/warehouse/supplier.service.ts`、`server/src/modules/warehouse/supplier.controller.ts`：供应商证照上传、列表、换版。
- 修改 `client/src/views/warehouse/SupplierList.vue`：在供应商入口展示证照/报告、PDF 预览和到期状态。
- 修改 `server/src/modules/product/product.service.ts`、`server/src/modules/product/product.controller.ts`：产品外检报告挂接。
- 修改 `client/src/views/product/ProductList.vue`：在产品入口展示外检报告。
- 修改 `server/src/modules/incoming-inspection/incoming-inspection.service.ts`、`server/src/modules/incoming-inspection/incoming-inspection.controller.ts`：来料检验报告挂接。
- 修改 `client/src/views/incoming-inspection/IncomingInspectionList.vue`：在来料检验入口展示报告。

---

## 任务 1：统一体系文件中心入口

**文件：**
- 新建：`client/src/views/documents/SystemDocumentCenter.vue`
- 修改：`client/src/router/index.ts`
- 测试：`client/src/views/documents/__tests__/SystemDocumentCenter.spec.ts`

- [ ] **步骤 1：编写失败测试**

新建 `client/src/views/documents/__tests__/SystemDocumentCenter.spec.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import SystemDocumentCenter from '../SystemDocumentCenter.vue';

describe('SystemDocumentCenter', () => {
  it('shows library and ledger views under one center', () => {
    const wrapper = mount(SystemDocumentCenter, {
      global: {
        stubs: {
          'el-tabs': { template: '<div><slot /></div>' },
          'el-tab-pane': { template: '<section><slot /></section>', props: ['label', 'name'] },
          SystemFileLibrary: { template: '<div class="library-view" />' },
          Level1List: { template: '<div class="ledger-view" />' },
        },
      },
    });

    expect(wrapper.find('.library-view').exists()).toBe(true);
    expect(wrapper.find('.ledger-view').exists()).toBe(true);
  });
});
```

- [ ] **步骤 2：运行测试确认失败**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-doc-import/client
npm test -- SystemDocumentCenter.spec.ts
```

预期：因为组件不存在而失败。

- [ ] **步骤 3：实现中心壳组件**

新建 `client/src/views/documents/SystemDocumentCenter.vue`：

```vue
<template>
  <div class="system-document-center">
    <el-tabs v-model="activeView">
      <el-tab-pane label="文件库" name="library">
        <SystemFileLibrary />
      </el-tab-pane>
      <el-tab-pane label="台账" name="ledger">
        <Level1List />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import SystemFileLibrary from './SystemFileLibrary.vue';
import Level1List from './Level1List.vue';

const activeView = ref('library');
</script>

<style scoped>
.system-document-center {
  min-width: 0;
}
</style>
```

- [ ] **步骤 4：调整路由**

修改 `client/src/router/index.ts`：

- 新主入口指向 `SystemDocumentCenter.vue`。
- 旧 `documents/control/library` 重定向到中心或加载同一组件。
- `/documents/:id`、`/documents/:id/edit` 保持不变。

- [ ] **步骤 5：运行测试**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-doc-import/client
npm test -- SystemDocumentCenter.spec.ts
```

预期：通过。

- [ ] **步骤 6：提交**

```bash
git add client/src/router/index.ts client/src/views/documents/SystemDocumentCenter.vue client/src/views/documents/__tests__/SystemDocumentCenter.spec.ts
git commit -m "feat: unify document center entry"
```

---

## 任务 2：Markdown 阅读组件

**文件：**
- 新建：`client/src/components/documents/MarkdownViewer.vue`
- 测试：`client/src/components/documents/MarkdownViewer.spec.ts`

- [ ] **步骤 1：编写失败测试**

新建 `client/src/components/documents/MarkdownViewer.spec.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import MarkdownViewer from './MarkdownViewer.vue';

describe('MarkdownViewer', () => {
  it('renders headings and wikilinks as readable text', () => {
    const wrapper = mount(MarkdownViewer, {
      props: { content: '# 标题\n\n引用 [[GRSS-CX-01]]' },
    });

    expect(wrapper.html()).toContain('<h1>标题</h1>');
    expect(wrapper.text()).toContain('GRSS-CX-01');
  });
});
```

- [ ] **步骤 2：运行测试确认失败**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-doc-import/client
npm test -- MarkdownViewer.spec.ts
```

预期：组件不存在而失败。

- [ ] **步骤 3：实现最小 Markdown 渲染**

新建 `client/src/components/documents/MarkdownViewer.vue`：

```vue
<template>
  <article class="markdown-viewer" v-html="html" />
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ content: string }>();

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const renderLine = (line: string) => {
  const escaped = escapeHtml(line).replace(/\[\[([^\]]+)\]\]/g, '<span class="wikilink">$1</span>');
  if (escaped.startsWith('# ')) return `<h1>${escaped.slice(2)}</h1>`;
  if (escaped.startsWith('## ')) return `<h2>${escaped.slice(3)}</h2>`;
  if (!escaped.trim()) return '';
  return `<p>${escaped}</p>`;
};

const html = computed(() => props.content.split('\n').map(renderLine).join(''));
</script>

<style scoped>
.markdown-viewer {
  line-height: 1.7;
}
.wikilink {
  color: #1677d2;
  font-weight: 600;
}
</style>
```

- [ ] **步骤 4：运行测试并提交**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-doc-import/client
npm test -- MarkdownViewer.spec.ts
git add client/src/components/documents/MarkdownViewer.vue client/src/components/documents/MarkdownViewer.spec.ts
git commit -m "feat: add markdown viewer"
```

---

## 任务 3：Markdown 编辑和详情页集成

**文件：**
- 新建：`client/src/components/documents/MarkdownEditor.vue`
- 修改：`client/src/views/documents/DocumentDetail.vue`
- 修改：`client/src/api/document-control.ts`
- 测试：`client/src/views/documents/__tests__/DocumentDetail.spec.ts`

- [ ] **步骤 1：增加 API 方法**

在 `client/src/api/document-control.ts` 增加：

```ts
updateMarkdown(documentId: string, payload: { contentMd: string }) {
  return request.patch(`/documents/${documentId}/markdown`, payload);
},
```

- [ ] **步骤 2：创建 Markdown 编辑器**

新建 `client/src/components/documents/MarkdownEditor.vue`：

```vue
<template>
  <div class="markdown-editor">
    <el-input v-model="draft" type="textarea" :rows="24" />
    <MarkdownViewer :content="draft" />
  </div>
</template>

<script setup lang="ts">
import { watch, ref } from 'vue';
import MarkdownViewer from './MarkdownViewer.vue';

const props = defineProps<{ modelValue: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
const draft = ref(props.modelValue);

watch(() => props.modelValue, (value) => {
  draft.value = value;
});
watch(draft, (value) => emit('update:modelValue', value));
</script>

<style scoped>
.markdown-editor {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
</style>
```

- [ ] **步骤 3：集成到 `DocumentDetail.vue`**

改动要求：

- `Document` 接口增加 `content_md?: string`。
- 引入 `MarkdownViewer` 和 `MarkdownEditor`。
- 当 `document.content_md` 存在时显示 Markdown 阅读区。
- 增加编辑状态 `markdownEditing`、草稿 `markdownDraft`。
- 保存时调用 `documentControlApi.updateMarkdown`。
- 保存成功后刷新详情。

- [ ] **步骤 4：补详情页测试**

在 `DocumentDetail.spec.ts` 增加 Markdown 渲染测试，断言详情页能显示 `content_md` 正文。

- [ ] **步骤 5：运行测试并提交**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-doc-import/client
npm test -- MarkdownViewer.spec.ts DocumentDetail.spec.ts
git add client/src/api/document-control.ts client/src/components/documents/MarkdownEditor.vue client/src/views/documents/DocumentDetail.vue client/src/views/documents/__tests__/DocumentDetail.spec.ts
git commit -m "feat: edit markdown documents"
```

---

## 任务 4：后端 Markdown 保存接口

**文件：**
- 修改：`server/src/modules/document/document.controller.ts`
- 修改：`server/src/modules/document/document.service.ts`
- 测试：`server/src/modules/document/document.service.spec.ts`

- [ ] **步骤 1：增加失败测试**

测试 `updateMarkdown('doc1', 'u1', 'admin', { contentMd: '# 新内容' })` 会调用 `prisma.document.update`，并写入 `content_md: '# 新内容'`。

- [ ] **步骤 2：实现 service 方法**

在 `DocumentService` 增加：

```ts
async updateMarkdown(id: string, userId: string, role: string, dto: { contentMd: string }) {
  const document = await this.prisma.document.findUnique({ where: { id, deletedAt: null } });
  if (!document) throw new NotFoundException('文档不存在');
  if (role !== 'admin' && document.creatorId !== userId) {
    throw new ForbiddenException('无权编辑该文档');
  }
  if (!['draft', 'rejected'].includes(document.status)) {
    throw new BadRequestException('仅草稿或驳回文档可直接编辑正文');
  }
  return this.prisma.document.update({
    where: { id },
    data: { content_md: dto.contentMd },
  });
}
```

- [ ] **步骤 3：增加 controller 接口**

```ts
@Patch(':id/markdown')
@ApiOperation({ summary: '更新 Markdown 正文' })
updateMarkdown(@Param('id') id: string, @Body() dto: { contentMd: string }, @Req() req: any) {
  return this.documentService.updateMarkdown(id, req.user.id, req.user.role, dto);
}
```

- [ ] **步骤 4：运行构建并提交**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-doc-import/server
npm run build
git add server/src/modules/document/document.controller.ts server/src/modules/document/document.service.ts server/src/modules/document/document.service.spec.ts
git commit -m "feat: save markdown document content"
```

---

## 任务 5：wikilink 解析和反向引用

**文件：**
- 新建：`server/src/modules/document/services/markdown-wikilink.service.ts`
- 新建：`server/src/modules/document/services/markdown-wikilink.service.spec.ts`
- 修改：`server/src/modules/document/document.module.ts`
- 修改：`server/src/modules/document/document.service.ts`
- 修改：`client/src/views/documents/DocumentDetail.vue`

- [ ] **步骤 1：编写 service 测试**

覆盖：

- `[[GRSS-CX-01]]`、`[[原辅料验收标准]]` 能被提取。
- 匹配编号或标题时生成 `targetType='document'`。
- 匹配不到时生成 `targetType='unresolved_document'`、`targetLabel` 和 `relationType='WIKILINK'`。
- 同一个引用文本命中多个文件时不静默选第一个，标记为冲突候选。

- [ ] **步骤 2：实现服务**

核心实现：

```ts
@Injectable()
export class MarkdownWikilinkService {
  constructor(private readonly prisma: PrismaService) {}

  extractWikilinks(content: string): string[] {
    return Array.from(new Set(Array.from(content.matchAll(/\[\[([^\]]+)\]\]/g)).map((m) => m[1].trim()).filter(Boolean)));
  }

  async syncDocumentWikilinks(sourceDocId: string, content: string) {
    const labels = this.extractWikilinks(content);
    await this.prisma.documentReference.deleteMany({ where: { sourceDocId, relationType: 'WIKILINK' } });
    for (const label of labels) {
      const targets = await this.prisma.document.findMany({
        where: { deletedAt: null, OR: [{ number: label }, { title: label }] },
        select: { id: true, title: true, number: true },
        take: 2,
      });
      const target = targets.length === 1 ? targets[0] : null;
      const targetType = targets.length > 1 ? 'conflict_document' : target ? 'document' : 'unresolved_document';
      await this.prisma.documentReference.create({
        data: {
          sourceDocId,
          targetDocId: target?.id ?? null,
          targetType,
          targetId: target?.id ?? null,
          targetLabel: target?.title ?? label,
          relationType: 'WIKILINK',
          snapshot: targets.length > 1 ? { candidates: targets } : undefined,
        },
      });
    }
  }
}
```

- [ ] **步骤 3：接入 Markdown 保存**

`DocumentService.updateMarkdown` 成功后调用：

```ts
await this.markdownWikilinkService.syncDocumentWikilinks(id, dto.contentMd);
```

- [ ] **步骤 4：详情页显示引用**

`DocumentDetail.vue` 中基于已有 `sourceReferences`、`targetReferences` 展示：

- `引用了`
- `被引用`
- `未解析引用`
- `冲突引用`

未解析引用条件：

```ts
relationType === 'WIKILINK' && targetType === 'unresolved_document'
```

冲突引用条件：

```ts
relationType === 'WIKILINK' && targetType === 'conflict_document'
```

- [ ] **步骤 5：运行测试并提交**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-doc-import/server
npm test -- markdown-wikilink.service.spec.ts
cd ../client
npm test -- DocumentDetail.spec.ts
git add server/src/modules/document/services/markdown-wikilink.service.ts server/src/modules/document/services/markdown-wikilink.service.spec.ts server/src/modules/document/document.module.ts server/src/modules/document/document.service.ts client/src/views/documents/DocumentDetail.vue
git commit -m "feat: sync markdown wikilinks"
```

---

## 任务 6：引用健康度和问题清单

**文件：**
- 新建：`server/src/modules/document/services/document-reference-health.service.ts`
- 新建：`server/src/modules/document/services/document-reference-health.service.spec.ts`
- 修改：`server/src/modules/document/document.module.ts`
- 修改：`server/src/modules/document/document.controller.ts`
- 修改：`client/src/views/documents/DocumentDetail.vue`
- 修改：`client/src/views/documents/SystemDocumentCenter.vue`

- [ ] **步骤 1：编写引用健康度测试**

覆盖：

- `targetType='unresolved_document'` 返回 `dangling`。
- `targetType='conflict_document'` 返回 `conflict`，并保留候选文件。
- 目标文件已删除、作废、归档或不允许作为当前依据时返回 `invalid`。
- 目标文件已被新版本替代时返回 `superseded`。
- 目标文件正常可用时返回 `healthy`。
- 全局问题清单只返回 `dangling / invalid / conflict / superseded`，不返回 `healthy`。

- [ ] **步骤 2：实现 `DocumentReferenceHealthService`**

返回结构：

```ts
type ReferenceHealthStatus = 'healthy' | 'dangling' | 'invalid' | 'conflict' | 'superseded';

interface DocumentReferenceHealthResult {
  totals: {
    total: number;
    healthy: number;
    dangling: number;
    invalid: number;
    conflict: number;
    superseded: number;
  };
  issues: Array<{
    sourceDocId: string;
    sourceTitle: string;
    referenceId: string;
    label: string;
    status: ReferenceHealthStatus;
    reason: string;
    targetDocId?: string;
    targetTitle?: string;
    candidates?: Array<{ id: string; number?: string; title: string }>;
  }>;
}
```

判断规则：

- 无目标文件：`dangling`。
- 多候选：`conflict`。
- 目标文件 `deletedAt` 不为空：`invalid`。
- 目标文件 `archivedAt` 或 `obsoletedAt` 不为空：`invalid`。
- 目标文件状态为作废、归档、停用类状态：`invalid`。
- 目标文件 `superseded_by_id` 不为空或存在替代关系：`superseded`。
- 其他情况：`healthy`。

- [ ] **步骤 3：增加后端接口**

新增：

```ts
GET /documents/reference-health/issues
GET /documents/:id/reference-health
```

注意路由顺序：`/documents/reference-health/issues` 必须放在 `/:id` 动态路由之前，避免被当作文档 id 匹配。

- [ ] **步骤 4：详情页展示引用健康概览**

`DocumentDetail.vue` 显示：

- 总引用数。
- 正常引用。
- 悬空引用。
- 无效引用。
- 冲突引用。
- 被替代引用。

问题项点击后：

- 悬空引用：定位到原始引用文本。
- 无效引用：打开目标文件详情，并提示目标已不可作为当前依据。
- 冲突引用：展开候选文件，由文控人员选择正确目标。
- 被替代引用：跳转到新版本文件，并提示需要更新引用。

- [ ] **步骤 5：体系文件中心增加 `引用问题` 筛选**

`SystemDocumentCenter.vue` 增加引用问题入口，列表字段：

- 来源文件编号和标题。
- 引用文本。
- 问题类型。
- 问题原因。
- 目标文件或候选文件。
- 操作：查看来源文件、查看目标文件、处理冲突。

不新增关系图谱。

- [ ] **步骤 6：运行测试并提交**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-doc-import/server
npm test -- document-reference-health.service.spec.ts markdown-wikilink.service.spec.ts
cd ../client
npm test -- DocumentDetail.spec.ts SystemDocumentCenter.spec.ts
git add server/src/modules/document/services/document-reference-health.service.ts server/src/modules/document/services/document-reference-health.service.spec.ts server/src/modules/document/document.module.ts server/src/modules/document/document.controller.ts client/src/views/documents/DocumentDetail.vue client/src/views/documents/SystemDocumentCenter.vue
git commit -m "feat: surface document reference health"
```

---

## 任务 7：PDF 实时预览

**文件：**
- 修改：`server/src/modules/document/services/file-preview.service.ts`
- 修改：`client/src/components/OfficePreview.vue`
- 测试：`server/src/modules/document/services/file-preview.service.spec.ts`

- [ ] **步骤 1：增加 Markdown 预览类型**

Markdown 文件返回：

```ts
return {
  type: 'markdown',
  fileName: document.fileName,
  message: 'Markdown 文件使用系统正文预览',
};
```

- [ ] **步骤 2：确保 PDF 返回可 iframe 预览地址**

测试示例：

```ts
it('returns a live preview url for pdf documents', async () => {
  prisma.document.findUnique.mockResolvedValue({
    id: 'doc1',
    fileType: 'application/pdf',
    filePath: 'documents/test.pdf',
    fileName: 'test.pdf',
    status: 'approved',
  });
  storage.getSignedUrl.mockResolvedValue('https://preview.local/test.pdf');

  const result = await service.getPreviewUrl('doc1', 'user1', 'admin');

  expect(result).toEqual({
    type: 'pdf',
    url: 'https://preview.local/test.pdf',
    fileName: 'test.pdf',
  });
});
```

- [ ] **步骤 3：Office 降级提示**

`OfficePreview.vue` 中 Office 默认提示：

```vue
<el-alert title="Office 文件暂按附件管理，请下载查看" type="info" :closable="false" show-icon />
```

- [ ] **步骤 4：运行测试并提交**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-doc-import/server
npm run build
cd ../client
npm test -- DocumentDetail.spec.ts
git add server/src/modules/document/services/file-preview.service.ts client/src/components/OfficePreview.vue
git commit -m "fix: support live pdf previews"
```

---

## 任务 8：业务文件挂接模型

**文件：**
- 修改：`server/src/prisma/schema.prisma`
- 新建：`server/src/modules/document/services/business-document-link.service.ts`
- 新建：`server/src/modules/document/services/business-document-link.service.spec.ts`
- 修改：`server/src/modules/document/document.module.ts`

- [ ] **步骤 1：编写 service 测试**

测试供应商营业执照可挂接到 `Document`：

```ts
await service.link({
  documentId: 'doc1',
  businessType: 'supplier',
  businessId: 'supplier1',
  documentKind: 'business_license',
  required: true,
  expiresAt: new Date('2027-01-01'),
});
```

断言调用 `businessDocumentLink.upsert`。

- [ ] **步骤 2：增加 Prisma 模型**

在 `Document` 增加：

```prisma
businessLinks BusinessDocumentLink[]
```

新增：

```prisma
model BusinessDocumentLink {
  id           String   @id @default(cuid())
  documentId   String
  document     Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  businessType String
  businessId   String
  documentKind String
  required     Boolean  @default(false)
  issuedAt     DateTime?
  expiresAt    DateTime?
  warningDays  Int      @default(30)
  status       String   @default("valid")
  metadata     Json?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([businessType, businessId, documentKind, documentId])
  @@index([businessType, businessId])
  @@index([expiresAt])
  @@index([status])
  @@map("business_document_links")
}
```

- [ ] **步骤 3：实现挂接服务**

新建 `business-document-link.service.ts`，提供 `link(input)`，使用 `businessDocumentLink.upsert` 创建或更新挂接关系。

- [ ] **步骤 4：注册服务并提交**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-doc-import/server
npm test -- business-document-link.service.spec.ts
git add server/src/prisma/schema.prisma server/src/modules/document/services/business-document-link.service.ts server/src/modules/document/services/business-document-link.service.spec.ts server/src/modules/document/document.module.ts
git commit -m "feat: link documents to business records"
```

---

## 任务 9：到期状态和更新待办

**文件：**
- 新建：`server/src/modules/document/services/document-expiry.service.ts`
- 新建：`server/src/modules/document/services/document-expiry.service.spec.ts`
- 修改：`server/src/modules/document/document-cron.service.ts`
- 修改：`server/src/modules/document/document.module.ts`
- 修改：`server/src/prisma/schema.prisma`
- 修改：`server/src/modules/todo/todo.service.ts`

- [ ] **步骤 1：新增待办类型**

`TodoType` 增加：

```prisma
document_renewal
```

`todo.service.ts` 中增加跳转：

```ts
document_renewal: (id) => `/documents/business-links/${id}`,
```

并加入 `ALL_TODO_TYPES`。

- [ ] **步骤 2：编写到期测试**

测试：

- 已过期的挂接记录变为 `expired`。
- 30 天内到期的挂接记录变为 `expiring_soon`。
- 两种情况都创建或更新 `TodoTask(document_renewal)`。

- [ ] **步骤 3：实现 `DocumentExpiryService`**

核心逻辑：

- 查询有 `expiresAt` 的 `BusinessDocumentLink`。
- 按当前日期和 `warningDays` 计算 `valid / expiring_soon / expired`。
- 更新挂接状态。
- 对 `expiring_soon` 和 `expired` upsert 更新待办。

- [ ] **步骤 4：接入定时任务**

`DocumentCronService` 每日调用：

```ts
await this.documentExpiryService.scanAndCreateTodos();
```

- [ ] **步骤 5：运行测试并提交**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-doc-import/server
npm test -- document-expiry.service.spec.ts
git add server/src/modules/document/services/document-expiry.service.ts server/src/modules/document/services/document-expiry.service.spec.ts server/src/modules/document/document-cron.service.ts server/src/modules/document/document.module.ts server/src/prisma/schema.prisma server/src/modules/todo/todo.service.ts
git commit -m "feat: create document expiry renewal todos"
```

---

## 任务 10：供应商证照业务闭环

**文件：**
- 修改：`server/src/modules/warehouse/supplier.service.ts`
- 修改：`server/src/modules/warehouse/supplier.controller.ts`
- 修改：`client/src/views/warehouse/SupplierList.vue`
- 测试：`server/src/modules/warehouse/supplier.service.spec.ts`

- [ ] **步骤 1：补供应商 service 测试**

测试上传营业执照时：

1. 创建 `Document`。
2. 创建或更新 `SupplierDocument`。
3. 创建 `BusinessDocumentLink`，其中 `businessType='supplier'`、`businessId=supplier.id`、`documentKind='business_license'`。
4. 写入有效期。

- [ ] **步骤 2：新增后端接口**

增加：

```ts
POST /suppliers/:id/documents
GET /suppliers/:id/documents
POST /suppliers/:id/documents/:linkId/replace
```

创建/换版流程：

1. PDF 存为 `Document`。
2. 创建或更新 `SupplierDocument`。
3. 创建或更新 `BusinessDocumentLink`。
4. 设置 `expiresAt`。
5. 返回 PDF 预览信息。

- [ ] **步骤 3：供应商前端展示**

在 `SupplierList.vue` 的供应商操作区或详情抽屉中增加 `证照/报告` 区块：

- 文件类型
- 证书编号
- 有效期
- 状态 badge
- PDF 预览
- 换版按钮

- [ ] **步骤 4：运行测试并提交**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-doc-import/server
npm test -- supplier.service.spec.ts
npm run build
git add server/src/modules/warehouse/supplier.service.ts server/src/modules/warehouse/supplier.controller.ts client/src/views/warehouse/SupplierList.vue
git commit -m "feat: manage supplier controlled documents"
```

---

## 任务 11：产品和品质报告业务闭环

**文件：**
- 修改：`server/src/modules/product/product.service.ts`
- 修改：`server/src/modules/product/product.controller.ts`
- 修改：`server/src/modules/incoming-inspection/incoming-inspection.service.ts`
- 修改：`server/src/modules/incoming-inspection/incoming-inspection.controller.ts`
- 修改：`client/src/views/product/ProductList.vue`
- 修改：`client/src/views/incoming-inspection/IncomingInspectionList.vue`
- 测试：`server/src/modules/product/product.service.spec.ts`
- 测试：`server/src/modules/incoming-inspection/incoming-inspection.service.spec.ts`

- [ ] **步骤 1：确定业务归属**

- 产品级外检报告归 `Product`。
- 来料/批次检验报告归 `IncomingInspection`。
- 不把所有报告只放到体系文件中心。

- [ ] **步骤 2：新增报告接口**

产品：

```ts
POST /products/:id/reports
GET /products/:id/reports
POST /products/:id/reports/:linkId/replace
```

来料检验：

```ts
POST /incoming-inspections/:id/reports
GET /incoming-inspections/:id/reports
POST /incoming-inspections/:id/reports/:linkId/replace
```

- [ ] **步骤 3：挂接到 `Document`**

每次上传报告：

- 创建 `Document`。
- 创建 `BusinessDocumentLink`。
- `businessType` 使用 `product` 或 `incoming_inspection`。
- `documentKind` 使用 `external_inspection_report`。
- 写入报告编号、检测日期、结论、有效期等 metadata。

- [ ] **步骤 4：前端展示**

在产品/来料检验入口显示：

- 报告类型
- 报告编号
- 检测日期
- 结论
- 有效期
- PDF 预览
- 换版/替换操作

- [ ] **步骤 5：运行测试并提交**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-doc-import/server
npm test -- product.service.spec.ts incoming-inspection.service.spec.ts
npm run build
git add server/src/modules/product/product.service.ts server/src/modules/product/product.controller.ts server/src/modules/incoming-inspection/incoming-inspection.service.ts server/src/modules/incoming-inspection/incoming-inspection.controller.ts client/src/views/product/ProductList.vue client/src/views/incoming-inspection/IncomingInspectionList.vue
git commit -m "feat: manage product and quality report documents"
```

---

## 总体验证

- `cd /Users/jiashenglin/Desktop/好玩的项目/noidear-doc-import/server && npm run build`
- `cd /Users/jiashenglin/Desktop/好玩的项目/noidear-doc-import/client && npm test -- SystemDocumentCenter.spec.ts MarkdownViewer.spec.ts DocumentDetail.spec.ts`
- `cd /Users/jiashenglin/Desktop/好玩的项目/noidear-doc-import/server && npm test -- document-reference-health.service.spec.ts business-document-link.service.spec.ts document-expiry.service.spec.ts`
- `cd /Users/jiashenglin/Desktop/好玩的项目/noidear-doc-import/client && npm run build:check`

如果 `build:check` 仍失败在既有的 `ProductList.vue`、`RecipeEdit.vue`、`RecipeList.vue` 未使用变量，记录为基线债务，不把它混入本次功能结论。

## 自检

- 覆盖范围：统一入口、系统内正文、Markdown 编辑/预览、PDF 实时预览、业务挂接文件、供应商证照、产品/品质报告、到期提醒、换版待办、wikilink、反向引用、引用健康度、悬空引用、无效引用、冲突引用、被替代引用、无图谱。
- 占位检查：无待补占位。
- 类型一致性：使用现有 `Document.content_md`、`DocumentReference`、`SupplierDocument`、`TodoTask`、`targetType`、`targetLabel`、`relationType`；新增 `BusinessDocumentLink` 作为业务对象到 `Document` 的通用桥接。
