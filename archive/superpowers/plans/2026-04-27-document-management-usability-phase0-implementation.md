# Document Management Usability Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the document management module actually usable for lifecycle work: status consistency, version actions, upload/approval semantics, actionable workbench, and editable record-form landing index.

**Architecture:** Keep the existing `DocumentService` and document views, but add focused helpers and small UI paths instead of a broad rewrite. Backend remains the authority for status transitions and version file access; frontend exposes those operations from `DocumentDetail`, `DocumentUpload`, `DocumentControlWorkbench`, and `RecordFormLandingIndex`.

**Tech Stack:** NestJS, Prisma, Jest, Vue 3, Element Plus, Vitest, Vite.

---

## File Structure

- Modify: `server/src/modules/document/constants/document-control.constants.ts`  
  Adds canonical document statuses and compatibility helpers.
- Modify: `server/src/modules/document/document.service.ts`  
  Uses status helpers, saves current version snapshots, supports version preview/download metadata, validates rollback reason, logs rollback.
- Modify: `server/src/modules/document/document.controller.ts`  
  Adds history-version preview/download endpoints and rollback body.
- Modify: `server/src/modules/document/dto/document-lifecycle.dto.ts`  
  Adds rollback DTO with required reason.
- Modify: `server/src/modules/document/services/record-form-landing.service.ts`  
  Validates `targetTemplateId` and `relatedDocIds`.
- Test: `server/src/modules/document/document.service.spec.ts`  
  Covers status normalization and rollback behavior.
- Test: `server/src/modules/document/services/record-form-landing.service.spec.ts`  
  Covers target template/document validation.
- Create: `client/src/api/document-management.ts`  
  Centralizes document lifecycle and version operations used by document pages.
- Modify: `client/src/views/documents/DocumentDetail.vue`  
  Adds version preview/download/compare/rollback actions and canonical status labels.
- Modify: `client/src/views/documents/DocumentUpload.vue`  
  Splits save draft and submit approval behavior.
- Modify: `client/src/views/documents/Level1List.vue`  
  Uses canonical status filters and labels.
- Modify: `client/src/views/documents/SystemFileLibrary.vue`  
  Accepts query filters from workbench and supports status compatibility.
- Modify: `client/src/views/documents/DocumentControlWorkbench.vue`  
  Makes cards clickable and routes to filtered detail pages.
- Modify: `client/src/views/documents/RecordFormLandingIndex.vue`  
  Adds edit dialog and save flow for landing entries.
- Test: `client/src/views/documents/__tests__/DocumentDetail.spec.ts`  
  Covers version actions.
- Test: `client/src/views/documents/__tests__/DocumentUpload.spec.ts`  
  Covers save draft vs submit approval.
- Test: `client/src/views/documents/__tests__/RecordFormLandingIndex.spec.ts`  
  Covers edit/save UI.
- Test: `client/src/views/documents/__tests__/DocumentControlWorkbench.spec.ts`  
  Covers card navigation.

---

### Task 1: Backend Status Compatibility

**Files:**
- Modify: `server/src/modules/document/constants/document-control.constants.ts`
- Modify: `server/src/modules/document/document.service.ts`
- Test: `server/src/modules/document/document.service.spec.ts`

- [ ] **Step 1: Write failing status helper tests**

Add these cases to `server/src/modules/document/document.service.spec.ts` or a new `describe('document status compatibility')` block in that file:

```ts
describe('document status compatibility', () => {
  it('allows approved documents wherever effective documents are allowed', async () => {
    prisma.document.findUnique.mockResolvedValue({
      id: 'doc1',
      number: 'DOC-001',
      title: 'SOP',
      status: 'approved',
      creatorId: 'u1',
      deletedAt: null,
    });
    prisma.document.update.mockResolvedValue({ id: 'doc1', status: 'archived' });

    await service.archive('doc1', '归档原因满足十个字符', 'u1', 'admin');

    expect(prisma.document.update).toHaveBeenCalledWith({
      where: { id: 'doc1' },
      data: expect.objectContaining({ status: 'archived' }),
    });
  });

  it('writes effective when approving a document', async () => {
    prisma.document.findUnique.mockResolvedValue({
      id: 'doc1',
      number: 'DOC-001',
      title: 'SOP',
      status: 'pending',
      creatorId: 'creator1',
      deletedAt: null,
    });
    prisma.approval.findFirst.mockResolvedValue({ id: 'ap1', approverId: 'admin1', status: 'pending' });
    prisma.user.findUnique
      .mockResolvedValueOnce({ id: 'admin1', role: 'admin' })
      .mockResolvedValueOnce({ id: 'creator1', role: 'user' });
    prisma.approval.update.mockResolvedValue({ id: 'ap1', status: 'approved' });
    prisma.document.update.mockResolvedValue({ id: 'doc1', status: 'effective' });
    notification.create.mockResolvedValue({});
    operationLog.log.mockResolvedValue({});

    await service.approve('doc1', 'approved', undefined, 'admin1');

    expect(prisma.document.update).toHaveBeenCalledWith({
      where: { id: 'doc1' },
      data: expect.objectContaining({ status: 'effective' }),
    });
  });
});
```

- [ ] **Step 2: Run the failing backend test**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm test -- document.service.spec.ts --runInBand
```

Expected: FAIL because approved/effective compatibility and new effective write behavior are not implemented yet.

- [ ] **Step 3: Add status helper exports**

In `server/src/modules/document/constants/document-control.constants.ts`, add:

```ts
export const CANONICAL_DOCUMENT_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  REJECTED: 'rejected',
  EFFECTIVE: 'effective',
  ARCHIVED: 'archived',
  OBSOLETE: 'obsolete',
} as const;

export type CanonicalDocumentStatus =
  typeof CANONICAL_DOCUMENT_STATUS[keyof typeof CANONICAL_DOCUMENT_STATUS];

export const EFFECTIVE_COMPAT_STATUSES = ['effective', 'approved'] as const;

export function isEffectiveCompatible(status: string | null | undefined): boolean {
  return status === 'effective' || status === 'approved';
}

export function toDisplayStatus(status: string | null | undefined): string {
  return status === 'approved' ? 'effective' : (status || '');
}
```

- [ ] **Step 4: Use helpers in document lifecycle methods**

In `server/src/modules/document/document.service.ts`, import the helpers:

```ts
import { CANONICAL_DOCUMENT_STATUS, isEffectiveCompatible } from './constants/document-control.constants';
```

Change approval success write:

```ts
status: status === 'approved' ? CANONICAL_DOCUMENT_STATUS.EFFECTIVE : CANONICAL_DOCUMENT_STATUS.REJECTED,
```

Change `archive()`, `obsolete()`, `deactivate()`, `remove()` effective checks from `document.status !== 'approved'` to:

```ts
if (!isEffectiveCompatible(document.status)) {
  throw new BusinessException(
    ErrorCode.CONFLICT,
    `文档 [${document.number}] 当前状态为 [${document.status}]，只有已生效文档可操作`,
  );
}
```

Change `restore()` success write from `approved` to:

```ts
status: CANONICAL_DOCUMENT_STATUS.EFFECTIVE,
```

- [ ] **Step 5: Run backend test and commit**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm test -- document.service.spec.ts --runInBand
```

Expected: PASS.

Commit:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git add server/src/modules/document/constants/document-control.constants.ts server/src/modules/document/document.service.ts server/src/modules/document/document.service.spec.ts
git commit -m "fix: unify document effective status handling"
```

---

### Task 2: Backend Version Operations

**Files:**
- Modify: `server/src/modules/document/dto/document-lifecycle.dto.ts`
- Modify: `server/src/modules/document/document.controller.ts`
- Modify: `server/src/modules/document/document.service.ts`
- Test: `server/src/modules/document/document.service.spec.ts`

- [ ] **Step 1: Write failing rollback and version access tests**

Add:

```ts
describe('document version operations', () => {
  it('saves the current file before rollback and writes rollback audit details', async () => {
    prisma.$transaction.mockImplementation(async (cb) => cb(prisma));
    prisma.document.findUnique.mockResolvedValue({
      id: 'doc1',
      version: new Prisma.Decimal('1.2'),
      filePath: 'documents/current.pdf',
      fileName: 'current.pdf',
      fileSize: 200,
      status: 'effective',
      deletedAt: null,
    });
    prisma.documentVersion.findFirst.mockResolvedValue({
      version: new Prisma.Decimal('1.0'),
      filePath: 'documents/old.pdf',
      fileName: 'old.pdf',
      fileSize: 100,
    });
    prisma.documentVersion.create.mockResolvedValue({});
    prisma.document.update.mockResolvedValue({ id: 'doc1', version: new Prisma.Decimal('1.3') });
    operationLog.log.mockResolvedValue({});

    await service.rollbackVersion('doc1', '1.0', '恢复到已批准版本', 'u1');

    expect(prisma.documentVersion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        documentId: 'doc1',
        version: new Prisma.Decimal('1.2'),
        filePath: 'documents/current.pdf',
        fileName: 'current.pdf',
      }),
    });
    expect(operationLog.log).toHaveBeenCalledWith(expect.objectContaining({
      action: 'rollback_version',
      details: expect.objectContaining({
        fromVersion: '1.2',
        targetVersion: '1.0',
        reason: '恢复到已批准版本',
      }),
    }));
  });

  it('rejects rollback for archived documents', async () => {
    prisma.$transaction.mockImplementation(async (cb) => cb(prisma));
    prisma.document.findUnique.mockResolvedValue({
      id: 'doc1',
      status: 'archived',
      deletedAt: null,
    });

    await expect(service.rollbackVersion('doc1', '1.0', '恢复到已批准版本', 'u1')).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm test -- document.service.spec.ts --runInBand
```

Expected: FAIL because `rollbackVersion` does not accept reason and saves the wrong version snapshot.

- [ ] **Step 3: Add rollback DTO**

In `server/src/modules/document/dto/document-lifecycle.dto.ts`, add:

```ts
import { IsString, MinLength, MaxLength } from 'class-validator';

export class RollbackDocumentVersionDto {
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;
}
```

If the file already imports from `class-validator`, merge the imports instead of duplicating them.

- [ ] **Step 4: Update controller endpoints**

In `server/src/modules/document/document.controller.ts`, import `RollbackDocumentVersionDto` and change rollback:

```ts
@Post(':id/versions/:targetVersion/rollback')
@ApiOperation({ summary: '回滚到指定版本' })
async rollbackVersion(
  @Param('id') id: string,
  @Param('targetVersion') targetVersion: string,
  @Body() dto: RollbackDocumentVersionDto,
  @Req() req: any,
) {
  return this.documentService.rollbackVersion(id, targetVersion, dto.reason, req.user.id);
}
```

Add metadata endpoints:

```ts
@Get(':id/versions/:version/preview')
@ApiOperation({ summary: '获取历史版本预览信息' })
async getVersionPreview(@Param('id') id: string, @Param('version') version: string, @Req() req: any) {
  return this.documentService.getVersionPreview(id, version, req.user.id, req.user.role);
}

@Get(':id/versions/:version/download')
@ApiOperation({ summary: '下载历史版本文件' })
async downloadVersion(
  @Param('id') id: string,
  @Param('version') version: string,
  @Req() req: any,
  @Res() res: Response,
) {
  return this.documentService.downloadVersion(id, version, req.user.id, req.user.role, res);
}
```

- [ ] **Step 5: Implement version preview/download and corrected rollback**

In `server/src/modules/document/document.service.ts`, change the signature:

```ts
async rollbackVersion(documentId: string, targetVersion: string, reason: string, userId: string)
```

In the transaction:

```ts
if (['archived', 'obsolete'].includes((document as any).status)) {
  throw new BusinessException(
    ErrorCode.CONFLICT,
    `文档当前状态为 [${(document as any).status}]，不能回滚版本`,
  );
}

const currentVersion = new Prisma.Decimal((document as any).version);
const newVersion = currentVersion.add(0.1);

await tx.documentVersion.create({
  data: {
    id: this.snowflake.nextId(),
    documentId,
    version: currentVersion,
    filePath: (document as any).filePath,
    fileName: (document as any).fileName,
    fileSize: Number((document as any).fileSize),
    creatorId: userId,
  },
});
```

Update the document to the selected version file and new version number:

```ts
await tx.document.update({
  where: { id: documentId },
  data: {
    version: newVersion,
    filePath: version.filePath,
    fileName: version.fileName,
    fileSize: version.fileSize,
  },
});
```

Log:

```ts
await this.operationLog.log({
  userId,
  action: 'rollback_version',
  module: 'document',
  objectId: documentId,
  objectType: 'document',
  details: {
    fromVersion: currentVersion.toFixed(1),
    targetVersion,
    newVersion: newVersion.toFixed(1),
    reason,
  },
});
```

Add helper methods:

```ts
async getVersionPreview(documentId: string, version: string, userId: string, role: string) {
  await this.findOne(documentId, userId, role);
  const item = await this.prisma.documentVersion.findFirst({
    where: { documentId, version: new Prisma.Decimal(version) },
  });
  if (!item) throw new BusinessException(ErrorCode.NOT_FOUND, `版本 ${version} 不存在`);
  return {
    type: item.fileName.toLowerCase().endsWith('.pdf') ? 'pdf' : 'download',
    url: `/api/v1/documents/${documentId}/versions/${version}/download`,
    fileName: item.fileName,
  };
}
```

Add `Response` import to `document.service.ts`:

```ts
import { Response } from 'express';
```

Add version download in `DocumentService`:

```ts
async downloadVersion(
  documentId: string,
  version: string,
  userId: string,
  role: string,
  res: Response,
): Promise<void> {
  await this.findOne(documentId, userId, role);
  const item = await this.prisma.documentVersion.findFirst({
    where: { documentId, version: new Prisma.Decimal(version) },
  });
  if (!item) throw new BusinessException(ErrorCode.NOT_FOUND, `版本 ${version} 不存在`);

  const stream = await this.storage.getFileStream(item.filePath);
  res.set({
    'Content-Type': 'application/octet-stream',
    'Content-Disposition': `attachment; filename="${encodeURIComponent(item.fileName)}"`,
  });
  stream.pipe(res);
}
```

Update `getVersionPreview()` so PDF history versions return a signed URL:

```ts
const lowerName = item.fileName.toLowerCase();
if (lowerName.endsWith('.pdf')) {
  return {
    type: 'pdf',
    url: await this.storage.getSignedUrl(item.filePath, 900),
    fileName: item.fileName,
  };
}
return {
  type: 'download',
  url: `/api/v1/documents/${documentId}/versions/${version}/download`,
  fileName: item.fileName,
  message: '该历史版本暂不支持在线预览，请下载后查看',
};
```

- [ ] **Step 6: Run backend version tests and commit**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm test -- document.service.spec.ts --runInBand
npm run build
```

Expected: PASS and build succeeds.

Commit:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git add server/src/modules/document/dto/document-lifecycle.dto.ts server/src/modules/document/document.controller.ts server/src/modules/document/document.service.ts server/src/modules/document/document.service.spec.ts
git commit -m "feat: complete document version operations"
```

---

### Task 3: Frontend Document API and Version UI

**Files:**
- Create: `client/src/api/document-management.ts`
- Modify: `client/src/views/documents/DocumentDetail.vue`
- Test: `client/src/views/documents/__tests__/DocumentDetail.spec.ts`

- [ ] **Step 1: Write failing version action tests**

In `client/src/views/documents/__tests__/DocumentDetail.spec.ts`, add tests that mount the detail page with two versions and assert visible action buttons:

```ts
it('shows version action buttons for historical versions', async () => {
  mockGet.mockImplementation((url: string) => {
    if (url.endsWith('/versions')) {
      return Promise.resolve({
        versions: [{ id: 'v1', version: 1.0, fileName: 'old.pdf', fileSize: '100', createdAt: '2026-01-01', creator: { name: 'Admin' } }],
      });
    }
    return Promise.resolve(makeDocument({ status: 'effective', version: 1.1 }));
  });

  const wrapper = mount(DocumentDetail, mountOptions);
  await flushPromises();

  expect(wrapper.text()).toContain('下载版本');
  expect(wrapper.text()).toContain('预览版本');
  expect(wrapper.text()).toContain('回滚');
});
```

- [ ] **Step 2: Run failing frontend test**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client
npm test -- DocumentDetail.spec.ts
```

Expected: FAIL because version actions are not rendered.

- [ ] **Step 3: Add lifecycle API wrapper**

Create `client/src/api/document-management.ts`:

```ts
import request from './request';

export interface DocumentVersionItem {
  id: string;
  version: number;
  fileName: string;
  fileSize: string | number;
  createdAt: string;
  creator: { name: string } | null;
}

export interface VersionCompareResult {
  documentId: string;
  documentTitle: string;
  version1: Record<string, unknown>;
  version2: Record<string, unknown>;
  differences: Record<string, unknown>;
}

export const documentManagementApi = {
  getVersions(id: string) {
    return request.get<{ versions: DocumentVersionItem[] }>(`/documents/${id}/versions`);
  },
  compareVersions(id: string, v1: number | string, v2: number | string) {
    return request.get<VersionCompareResult>(`/documents/${id}/versions/${v1}/compare/${v2}`);
  },
  rollbackVersion(id: string, version: number | string, reason: string) {
    return request.post(`/documents/${id}/versions/${version}/rollback`, { reason });
  },
  versionDownloadUrl(id: string, version: number | string) {
    return `/api/v1/documents/${id}/versions/${version}/download`;
  },
  versionPreviewUrl(id: string, version: number | string) {
    return `/api/v1/documents/${id}/versions/${version}/preview`;
  },
};
```

- [ ] **Step 4: Add version actions in DocumentDetail**

In `DocumentDetail.vue`, add an operation column to the version table:

```vue
<el-table-column label="操作" width="260" fixed="right">
  <template #default="{ row }">
    <el-button link type="primary" @click="handlePreviewVersion(row)">预览版本</el-button>
    <el-button link type="primary" @click="handleDownloadVersion(row)">下载版本</el-button>
    <el-button link type="warning" @click="handleRollbackVersion(row)">回滚</el-button>
  </template>
</el-table-column>
```

Add handlers:

```ts
const handleDownloadVersion = (row: VersionItem) => {
  if (!document.value?.id) return;
  window.open(documentManagementApi.versionDownloadUrl(document.value.id, row.version), '_blank');
};

const handlePreviewVersion = async (row: VersionItem) => {
  if (!document.value?.id) return;
  showPreview.value = true;
  previewLoading.value = true;
  try {
    const res = await request.get<{ url?: string }>(`/documents/${document.value.id}/versions/${row.version}/preview`);
    previewUrl.value = res.url || documentManagementApi.versionDownloadUrl(document.value.id, row.version);
  } finally {
    previewLoading.value = false;
  }
};

const handleRollbackVersion = async (row: VersionItem) => {
  if (!document.value?.id) return;
  const { value } = await ElMessageBox.prompt(`请输入回滚到 v${row.version} 的原因`, '回滚版本', {
    inputType: 'textarea',
    inputValidator: (val) => Boolean(val && val.trim().length >= 5),
    inputErrorMessage: '回滚原因至少 5 个字符',
  });
  await documentManagementApi.rollbackVersion(document.value.id, row.version, value);
  ElMessage.success('版本回滚成功');
  await fetchData();
  await fetchVersionHistory();
};
```

Import `documentManagementApi`.

- [ ] **Step 5: Run frontend tests and commit**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client
npm test -- DocumentDetail.spec.ts
```

Expected: PASS.

Commit:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git add client/src/api/document-management.ts client/src/views/documents/DocumentDetail.vue client/src/views/documents/__tests__/DocumentDetail.spec.ts
git commit -m "feat: expose document version actions"
```

---

### Task 4: Upload Save Draft vs Submit Approval

**Files:**
- Modify: `client/src/views/documents/DocumentUpload.vue`
- Test: `client/src/views/documents/__tests__/DocumentUpload.spec.ts`

- [ ] **Step 1: Write failing upload behavior tests**

Create `client/src/views/documents/__tests__/DocumentUpload.spec.ts` if it does not exist:

```ts
it('saves draft without submitting approval', async () => {
  mockPost.mockResolvedValueOnce({ id: 'doc1' });
  const wrapper = mount(DocumentUpload, mountOptions);
  await setRequiredTitleAndFile(wrapper);

  await wrapper.find('[data-test="save-draft"]').trigger('click');
  await flushPromises();

  expect(mockPost).toHaveBeenCalledWith('/documents/upload', expect.any(FormData), expect.any(Object));
  expect(mockPost).toHaveBeenCalledTimes(1);
});

it('submits approval after upload when clicking submit approval', async () => {
  mockPost.mockResolvedValueOnce({ id: 'doc1' }).mockResolvedValueOnce({ id: 'doc1', status: 'pending' });
  const wrapper = mount(DocumentUpload, mountOptions);
  await setRequiredTitleAndFile(wrapper);

  await wrapper.find('[data-test="submit-approval"]').trigger('click');
  await flushPromises();

  expect(mockPost).toHaveBeenNthCalledWith(1, '/documents/upload', expect.any(FormData), expect.any(Object));
  expect(mockPost).toHaveBeenNthCalledWith(2, '/documents/doc1/submit');
});
```

- [ ] **Step 2: Run failing upload test**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client
npm test -- DocumentUpload.spec.ts
```

Expected: FAIL because the page has one submit button and never calls `/submit`.

- [ ] **Step 3: Split buttons and behavior**

In `DocumentUpload.vue`, replace the single action button with:

```vue
<el-button data-test="save-draft" @click="handleSaveDraft" :loading="uploading">
  保存草稿
</el-button>
<el-button data-test="submit-approval" type="primary" @click="handleSubmitApproval" :loading="uploading">
  提交审批
</el-button>
```

Add:

```ts
const uploadDocument = async (): Promise<{ id: string }> => {
  const form = new FormData();
  form.append('level', String(level.value));
  form.append('title', formData.title);
  form.append('file', formData.file as File);
  return request.post('/documents/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
};

const validateForm = async (): Promise<boolean> => {
  if (!formRef.value) return false;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return false;
  if (!formData.file) {
    ElMessage.error('请上传文件');
    return false;
  }
  return true;
};

const handleSaveDraft = async () => {
  if (!(await validateForm())) return;
  uploading.value = true;
  try {
    await uploadDocument();
    ElMessage.success('草稿已保存');
    router.push('/documents');
  } finally {
    uploading.value = false;
  }
};

const handleSubmitApproval = async () => {
  if (!(await validateForm())) return;
  uploading.value = true;
  try {
    const doc = await uploadDocument();
    await request.post(`/documents/${doc.id}/submit`);
    ElMessage.success('文档已提交审批');
    router.push('/documents');
  } finally {
    uploading.value = false;
  }
};
```

Remove the old `handleSubmit`.

- [ ] **Step 4: Run test and commit**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client
npm test -- DocumentUpload.spec.ts
```

Expected: PASS.

Commit:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git add client/src/views/documents/DocumentUpload.vue client/src/views/documents/__tests__/DocumentUpload.spec.ts
git commit -m "fix: split document upload draft and submit actions"
```

---

### Task 5: Workbench Actionable Navigation

**Files:**
- Modify: `client/src/views/documents/DocumentControlWorkbench.vue`
- Modify: `client/src/views/documents/SystemFileLibrary.vue`
- Test: `client/src/views/documents/__tests__/DocumentControlWorkbench.spec.ts`

- [ ] **Step 1: Write failing workbench navigation test**

Add:

```ts
it('routes to filtered pages when clicking workbench cards', async () => {
  const routerPush = vi.fn();
  vi.mocked(useRouter).mockReturnValue({ push: routerPush } as any);
  mockGet.mockResolvedValue({ counts: { missingMetadata: 3 }, missingMetadata: [] });

  const wrapper = mount(DocumentControlWorkbench, mountOptions);
  await flushPromises();
  await wrapper.find('[data-test="workbench-card-missingMetadata"]').trigger('click');

  expect(routerPush).toHaveBeenCalledWith({
    path: '/documents/control/library',
    query: { issue: 'missingMetadata' },
  });
});
```

- [ ] **Step 2: Run failing test**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client
npm test -- DocumentControlWorkbench.spec.ts
```

Expected: FAIL because cards are not clickable.

- [ ] **Step 3: Add card route targets**

In `DocumentControlWorkbench.vue`, add router and data-test card wrappers:

```ts
const router = useRouter();

const cards = computed(() => [
  { key: 'pendingReview', title: '待审核', route: { path: '/documents', query: { status: 'pending' } } },
  { key: 'dueForReview', title: '即将复审', route: { path: '/documents/control/library', query: { issue: 'dueForReview' } } },
  { key: 'expiringExternalFiles', title: '外来文件到期', route: { path: '/documents/control/library', query: { issue: 'expiringExternalFiles' } } },
  { key: 'obsoleteReferences', title: '作废仍被引用', route: { path: '/documents/operations/impact', query: { issue: 'obsoleteReferences' } } },
  { key: 'brokenReferences', title: '入口失效', route: { path: '/documents/control/record-form-index', query: { issue: 'brokenReferences' } } },
  { key: 'missingLandingTargets', title: '表单入口缺失', route: { path: '/documents/control/record-form-index', query: { issue: 'missingLandingTargets' } } },
  { key: 'missingMetadata', title: '元数据缺失', route: { path: '/documents/control/library', query: { issue: 'missingMetadata' } } },
]);

const openCard = (card: { route: any }) => router.push(card.route);
```

Template:

```vue
<el-card
  v-for="card in cards"
  :key="card.key"
  :data-test="`workbench-card-${card.key}`"
  class="action-card"
  @click="openCard(card)"
>
```

- [ ] **Step 4: Read route query in SystemFileLibrary**

In `SystemFileLibrary.vue`, import `useRoute` and initialize filters:

```ts
const route = useRoute();

onMounted(() => {
  if (route.query.issue === 'expiringExternalFiles') {
    filters.documentType = 'EXTERNAL_FILE';
  }
  if (route.query.issue === 'dueForReview') {
    filters.status = 'effective';
  }
  fetchDocuments();
});
```

- [ ] **Step 5: Run tests and commit**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client
npm test -- DocumentControlWorkbench.spec.ts
```

Expected: PASS.

Commit:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git add client/src/views/documents/DocumentControlWorkbench.vue client/src/views/documents/SystemFileLibrary.vue client/src/views/documents/__tests__/DocumentControlWorkbench.spec.ts
git commit -m "feat: make document control workbench actionable"
```

---

### Task 6: Editable Record Form Landing Index

**Files:**
- Modify: `server/src/modules/document/services/record-form-landing.service.ts`
- Test: `server/src/modules/document/services/record-form-landing.service.spec.ts`
- Modify: `client/src/views/documents/RecordFormLandingIndex.vue`
- Test: `client/src/views/documents/__tests__/RecordFormLandingIndex.spec.ts`

- [ ] **Step 1: Write failing backend validation tests**

Add:

```ts
it('rejects missing target template ids', async () => {
  modelLanding.getFormByCode.mockReturnValue({ code: 'F1', formName: '表单1' });
  prisma.recordTemplate.findUnique.mockResolvedValue(null);

  await expect(service.upsertTarget('F1', {
    targetTemplateId: 'tpl-missing',
    targetRoute: '/records',
  } as any)).rejects.toThrow('记录模板不存在');
});

it('rejects related document ids that do not exist', async () => {
  modelLanding.getFormByCode.mockReturnValue({ code: 'F1', formName: '表单1' });
  prisma.recordTemplate.findUnique.mockResolvedValue({ id: 'tpl1' });
  prisma.document.count.mockResolvedValue(1);

  await expect(service.upsertTarget('F1', {
    targetTemplateId: 'tpl1',
    relatedDocIds: ['doc1', 'doc2'],
  } as any)).rejects.toThrow('相关文件不存在');
});
```

- [ ] **Step 2: Implement backend validation**

In `record-form-landing.service.ts`, before `upsert`:

```ts
if (dto.targetTemplateId) {
  const template = await this.prisma.recordTemplate.findUnique({
    where: { id: dto.targetTemplateId },
  });
  if (!template) throw new NotFoundException(`记录模板不存在: ${dto.targetTemplateId}`);
}

if (dto.relatedDocIds?.length) {
  const count = await this.prisma.document.count({
    where: { id: { in: dto.relatedDocIds }, deletedAt: null },
  });
  if (count !== dto.relatedDocIds.length) {
    throw new NotFoundException('相关文件不存在或已删除');
  }
}
```

- [ ] **Step 3: Write failing frontend edit test**

Add to `RecordFormLandingIndex.spec.ts`:

```ts
it('opens edit dialog and saves landing entry', async () => {
  mockGet.mockResolvedValue([{ code: 'F1', formName: '表单1', department: '品质部', chain: '研发/变更', entities: [], basis: '', templateGroupId: 'G1', landingEntry: null }]);
  mockPatch.mockResolvedValue({});

  const wrapper = mount(RecordFormLandingIndex, mountOptions);
  await flushPromises();
  await wrapper.find('[data-test="edit-landing-F1"]').trigger('click');
  await wrapper.find('[data-test="target-route-input"]').setValue('/records/templates/tpl1');
  await wrapper.find('[data-test="save-landing"]').trigger('click');
  await flushPromises();

  expect(mockPatch).toHaveBeenCalledWith('/documents/record-form-index/F1', expect.objectContaining({
    targetRoute: '/records/templates/tpl1',
  }));
});
```

- [ ] **Step 4: Add edit dialog**

In `RecordFormLandingIndex.vue`, add operation column:

```vue
<el-table-column label="操作" width="120" fixed="right">
  <template #default="{ row }">
    <el-button :data-test="`edit-landing-${row.code}`" link type="primary" @click="openEdit(row)">维护</el-button>
  </template>
</el-table-column>
```

Add dialog fields:

```vue
<el-dialog v-model="editVisible" title="维护表单入口" width="640px">
  <el-form label-width="120px">
    <el-form-item label="目标模块">
      <el-input v-model="editForm.targetModule" />
    </el-form-item>
    <el-form-item label="目标模型">
      <el-input v-model="editForm.targetModel" />
    </el-form-item>
    <el-form-item label="目标路由">
      <el-input data-test="target-route-input" v-model="editForm.targetRoute" />
    </el-form-item>
    <el-form-item label="模板 ID">
      <el-input v-model="editForm.targetTemplateId" />
    </el-form-item>
    <el-form-item label="备注">
      <el-input v-model="editForm.notes" type="textarea" />
    </el-form-item>
  </el-form>
  <template #footer>
    <el-button @click="editVisible = false">取消</el-button>
    <el-button data-test="save-landing" type="primary" @click="saveEdit">保存</el-button>
  </template>
</el-dialog>
```

Script:

```ts
const editVisible = ref(false);
const editingCode = ref('');
const editForm = ref({
  targetModule: '',
  targetModel: '',
  targetRoute: '',
  targetTemplateId: '',
  landingStrategy: 'route',
  relatedDocIds: [] as string[],
  notes: '',
});

const openEdit = (row: RecordFormLandingEntry) => {
  editingCode.value = row.code;
  editForm.value = {
    targetModule: row.landingEntry?.targetModule || '',
    targetModel: row.landingEntry?.targetModel || '',
    targetRoute: row.landingEntry?.targetRoute || '',
    targetTemplateId: row.landingEntry?.targetTemplateId || '',
    landingStrategy: row.landingEntry?.landingStrategy || 'route',
    relatedDocIds: row.landingEntry?.relatedDocIds || [],
    notes: row.landingEntry?.notes || '',
  };
  editVisible.value = true;
};

const saveEdit = async () => {
  await documentControlApi.updateRecordFormIndex(editingCode.value, editForm.value);
  ElMessage.success('表单入口已保存');
  editVisible.value = false;
  await fetchRows();
};
```

- [ ] **Step 5: Run backend and frontend tests, then commit**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm test -- record-form-landing.service.spec.ts --runInBand
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client
npm test -- RecordFormLandingIndex.spec.ts
```

Expected: PASS.

Commit:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git add server/src/modules/document/services/record-form-landing.service.ts server/src/modules/document/services/record-form-landing.service.spec.ts client/src/views/documents/RecordFormLandingIndex.vue client/src/views/documents/__tests__/RecordFormLandingIndex.spec.ts
git commit -m "feat: enable record form landing maintenance"
```

---

### Task 7: Final Verification

**Files:**
- No planned source edits.

- [ ] **Step 1: Run targeted backend tests**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm test -- document.service.spec.ts record-form-landing.service.spec.ts --runInBand
```

Expected: PASS.

- [ ] **Step 2: Run targeted frontend tests**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client
npm test -- DocumentDetail.spec.ts DocumentUpload.spec.ts DocumentControlWorkbench.spec.ts RecordFormLandingIndex.spec.ts
```

Expected: PASS.

- [ ] **Step 3: Run builds**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm run build
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client
npm run build
```

Expected: both builds succeed. If `npm run build:check` is used instead of `npm run build`, existing unrelated TypeScript unused-variable failures may need separate cleanup before treating that command as required.

- [ ] **Step 4: Manual browser smoke**

Run app if it is not already running:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
AUTH_LOCKOUT_DISABLED=true npm run start:dev
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client
npm run dev -- --host 127.0.0.1 --port 5173
```

Manual checks:

```text
1. Open http://127.0.0.1:5173/login.
2. Log in as admin.
3. Open 文控中心 -> 文档台账.
4. Upload a document with 保存草稿 and confirm status is draft.
5. Upload a document with 提交审批 and confirm status is pending.
6. Open a document detail page with version history.
7. Confirm version preview/download/rollback controls are visible.
8. Open 文控工作台 and click each count card.
9. Open 记录表单索引, edit a row, save, refresh, and confirm persistence.
```

- [ ] **Step 5: Check for unexpected source changes**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git status --short
```

Expected: only intentional source changes from completed tasks are present. If manual smoke reveals a defect, fix it in the owning task files and rerun that task's test command before committing with the same commit pattern used in that task. Do not create an empty commit.

---

## Self-Review

Spec coverage:

- Status unification is covered by Task 1 and Task 7.
- Version management is covered by Task 2, Task 3, and Task 7.
- Upload/approval semantics are covered by Task 4 and Task 7.
- Actionable workbench is covered by Task 5 and Task 7.
- Editable record-form landing index is covered by Task 6 and Task 7.

Scope deliberately deferred:

- Full `ChangeEvent` schema and `ChangeEventFormTask` implementation remain in the broader governance spec and are not part of this first document-management usability plan.
- Full evidence chain and audit/CAPA linkage remain later-phase work.
- Physical deletion of `产品更改申请表` is deferred until historical `RecordTemplate` and `Record` dependencies are checked.
