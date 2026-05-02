# GAP-406 Document Version Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` only to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Do not use brainstorming, writing-plans, or redesign the document version model during execution. If current code disagrees with this plan, stop and report the mismatch to the main agent.

**Goal:** Make controlled document revision lifecycle visible and auditable with `Vn` labels while preserving legacy `DocumentVersion.version` Decimal operations.

**Architecture:** Treat `Document` as the controlled major-version node and `DocumentVersion` as a file snapshot table inside that node. Extend version-history responses with a revision chain, decorate current and revision documents with `versionLabel`, keep legacy snapshot URLs unchanged, and ensure publishing a revision supersedes the previous effective document in the same lineage.

**Tech Stack:** NestJS document module, Prisma existing models, Vue 3, Vitest, Jest, npm workspaces.

---

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** 主 agent 已按 `brainstorming -> grill-with-docs -> writing-plans` 为 GAP-406 生成 spec 和本 implementation plan。
- **grill-with-docs 校准结论：** 已确认 `Document` 是受控文件版本事实源，`DocumentVersion` 只保留为文件快照和 legacy URL 参数来源；不得新增平行版本表。
- **与 GAP-400 边界：** GAP-400 负责当前 `Document.versionNo -> versionLabel` 展示合同和 Decimal 序列化保护；GAP-406 只在该合同已存在后补齐修订链、历史快照标注和发布 supersede。
- **执行限制：** 执行 agent 只能使用 `superpowers:executing-plans`；不得修改业务代码之外的调度表，不得把 GAP-401、GAP-405、GAP-413 合并进本 PR。
- **执行隔离：** 执行本计划前必须从最新 `origin/master` 创建独立 worktree，或使用 Multica 隔离工作目录；不得在主 checkout `/Users/jiashenglin/Desktop/好玩的项目/noidear` 直接修改、提交或 push。如发现当前目录是主 checkout，必须停止并回报主 agent。
- **停止条件：** 如果 GAP-400 的 `versionLabel` 合同、Decimal 序列化保护或 `Document.versionNo` 展示改造尚未合并到当前分支，先停止并回报；不得在 GAP-406 中重做 GAP-400。
- **停止条件：** 如果实现需要新增版本事实表、删除 Decimal `DocumentVersion.version`、改变历史版本 URL 参数，停止并回报主 agent。

## File Map

All commands below assume the execution agent is at the root of its isolated `noidear` worktree or Multica checkout.

- Modify: `server/src/modules/document/document.service.ts`
- Modify: `server/src/modules/document/document.service.spec.ts`
- Modify: `server/src/modules/document/document-lifecycle.service.ts`
- Modify: `server/src/modules/document/document-lifecycle.service.spec.ts`
- Modify: `client/src/api/document-management.ts`
- Modify: `client/src/views/documents/DocumentDetail.vue`
- Modify: `client/src/views/documents/__tests__/DocumentDetail.spec.ts`
- Do not modify: `server/src/prisma/schema.prisma`
- Do not modify: `server/src/prisma/migrations/**`
- Do not modify: `server/src/modules/document-issuance/**`
- Do not modify: `server/src/modules/training/**`
- Do not modify: `server/src/modules/internal-audit/**`
- Do not modify: `server/src/modules/traceability/**`

## Task 1: Verify GAP-400 dependency and baseline

**Files:**
- Read: `docs/superpowers/specs/2026-05-02-gap-400-document-version-display-design.md`
- Read: `docs/superpowers/plans/2026-05-02-gap-400-document-version-display-implementation.md`
- Read: `server/src/modules/document/document.service.ts`
- Read: `client/src/views/documents/DocumentDetail.vue`

- [ ] **Step 1: Confirm isolated worktree**

Run:

```bash
git worktree list --porcelain
pwd
git branch --show-current
git status --short --branch
```

Expected: `pwd` is not `/Users/jiashenglin/Desktop/好玩的项目/noidear`; status is clean or only contains this GAP's intentional changes.

- [ ] **Step 2: Confirm GAP-400 landed**

Run:

```bash
rg -n "versionLabel|withDocumentVersionLabel|document-version.presenter|versionNo" server/src/modules/document client/src/views/documents client/src/api
```

Expected: current document list/detail responses and `DocumentDetail.vue` support `versionLabel` or the GAP-400 presenter/helper. If the output only shows legacy `version` display and no `versionLabel` contract, stop and report that GAP-400 is not merged.

- [ ] **Step 3: Run existing focused tests before editing**

Run:

```bash
(cd server && npm test -- document.service.spec.ts document-lifecycle.service.spec.ts --runInBand)
(cd client && npm test -- DocumentDetail.spec.ts)
```

Expected: PASS. If tests fail because the branch is missing GAP-400 changes, stop and report the dependency mismatch.

## Task 2: Add server tests for revision history response

**Files:**
- Modify: `server/src/modules/document/document.service.spec.ts`

- [ ] **Step 1: Add a failing test for revision chain labels**

In `server/src/modules/document/document.service.spec.ts`, in the `describe('document revision draft', () => {` block, add this test after the existing revision draft test:

```ts
  it('returns controlled revision chain with Vn labels and legacy snapshot labels', async () => {
    const currentDoc = {
      id: 'doc-v2',
      number: 'GRSS-PZ-ZD-08',
      title: '原物料及产品放行制度',
      level: 3,
      versionNo: 2,
      versionLabel: 'V2',
      version: '2.0',
      status: 'effective',
      revisionStatus: 'current',
      revisionOfId: 'doc-v1',
      superseded_by_id: null,
      lineage_key: 'GRSS-PZ-ZD-08',
      creatorId: 'user-1',
      deletedAt: null,
    };
    prisma.document.findUnique.mockResolvedValue(currentDoc);
    prisma.document.findMany.mockResolvedValue([
      { ...currentDoc },
      {
        ...currentDoc,
        id: 'doc-v1',
        versionNo: 1,
        versionLabel: 'V1',
        version: '1.0',
        status: 'superseded',
        revisionStatus: 'superseded',
        revisionOfId: null,
        superseded_by_id: 'doc-v2',
      },
    ]);
    prisma.documentVersion.findMany.mockResolvedValue([
      {
        id: 'snapshot-1',
        documentId: 'doc-v2',
        version: { toString: () => '2.0' },
        filePath: 'documents/v2-old.pdf',
        fileName: '放行制度-v2-old.pdf',
        fileSize: 1024,
        creatorId: 'user-1',
        creator: { id: 'user-1', name: '文控员' },
        createdAt: new Date('2026-05-02T00:00:00.000Z'),
      },
    ]);

    const result = await service.getVersionHistory('doc-v2', 'user-1', 'admin');

    expect(result.revisions).toEqual([
      expect.objectContaining({ id: 'doc-v2', versionNo: 2, versionLabel: 'V2', isCurrentVersion: true }),
      expect.objectContaining({ id: 'doc-v1', versionNo: 1, versionLabel: 'V1', isCurrentVersion: false }),
    ]);
    expect(result.versions).toEqual([
      expect.objectContaining({
        id: 'snapshot-1',
        version: '2.0',
        documentVersionLabel: 'V2',
        snapshotVersionLabel: '文件快照 2.0',
      }),
    ]);
  });
```

- [ ] **Step 2: Run the focused server test and verify it fails**

Run:

```bash
(cd server && npm test -- document.service.spec.ts --runInBand)
```

Expected: FAIL because `getVersionHistory()` currently returns only `{ document, versions }` and does not query revision-chain `Document` rows.

## Task 3: Implement revision history response contract

**Files:**
- Modify: `server/src/modules/document/document.service.ts`

- [ ] **Step 1: Add local helpers in `DocumentService`**

In `server/src/modules/document/document.service.ts`, add these private methods inside `DocumentService` before `getVersionHistory()`:

```ts
  private resolveVersionNo(document: { versionNo?: number | string | null; version?: unknown }): number {
    const explicit = Number(document.versionNo);
    if (Number.isFinite(explicit) && explicit >= 1) return Math.trunc(explicit);

    const legacy = Number(
      typeof document.version === 'object' &&
      document.version !== null &&
      typeof (document.version as { toString?: unknown }).toString === 'function'
        ? (document.version as { toString: () => string }).toString()
        : document.version,
    );
    return Number.isFinite(legacy) && legacy >= 1 ? Math.trunc(legacy) : 1;
  }

  private decorateDocumentVersion<T extends Record<string, any>>(document: T): T & { versionNo: number; versionLabel: string } {
    const versionNo = this.resolveVersionNo(document);
    return { ...document, versionNo, versionLabel: `V${versionNo}` };
  }

  private snapshotLabel(version: unknown): string {
    const value = typeof version === 'object' && version !== null && typeof (version as { toString?: unknown }).toString === 'function'
      ? (version as { toString: () => string }).toString()
      : String(version);
    return `文件快照 ${value}`;
  }
```

If GAP-400 introduced an equivalent presenter, reuse that presenter instead of duplicating these helpers, and keep the same response shape in the following step.

- [ ] **Step 2: Replace `getVersionHistory()`**

Replace the full `getVersionHistory()` method in `server/src/modules/document/document.service.ts` with:

```ts
  async getVersionHistory(id: string, userId: string, role: string) {
    const document = this.decorateDocumentVersion(await this.findOne(id, userId, role) as any);
    const lineageKey = (document as any).lineage_key ?? document.number;

    const [revisionRows, versionRows] = await Promise.all([
      this.prisma.document.findMany({
        where: {
          deletedAt: null,
          OR: [
            { id },
            { revisionOfId: id },
            { lineage_key: lineageKey },
            { number: document.number },
          ] as any,
        },
        orderBy: [{ versionNo: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          number: true,
          title: true,
          version: true,
          versionNo: true,
          status: true,
          revisionStatus: true,
          revisionOfId: true,
          superseded_by_id: true,
          lineage_key: true,
          createdAt: true,
          updatedAt: true,
        } as any,
      }) as unknown as any[],
      this.prisma.documentVersion.findMany({
        where: { documentId: id },
        orderBy: { createdAt: 'desc' },
        include: {
          creator: {
            select: { id: true, name: true },
          },
        },
      }) as unknown as any[],
    ]);

    const seenRevisionIds = new Set<string>();
    const revisions = revisionRows
      .filter((row) => {
        if (seenRevisionIds.has(row.id)) return false;
        seenRevisionIds.add(row.id);
        return true;
      })
      .map((row) => {
        const decorated = this.decorateDocumentVersion(row);
        return {
          ...decorated,
          isCurrentVersion: row.id === id || row.revisionStatus === 'current',
        };
      });

    const versions = versionRows.map((row) => ({
      ...row,
      documentVersionNo: document.versionNo,
      documentVersionLabel: document.versionLabel,
      snapshotVersionLabel: this.snapshotLabel(row.version),
    }));

    return {
      document,
      revisions: convertBigIntToNumber(revisions),
      versions: convertBigIntToNumber(versions),
    };
  }
```

- [ ] **Step 3: Run the focused server test**

Run:

```bash
(cd server && npm test -- document.service.spec.ts --runInBand)
```

Expected: PASS.

## Task 4: Ensure revision approval supersedes the previous effective file

**Files:**
- Modify: `server/src/modules/document/document.service.spec.ts`
- Modify: `server/src/modules/document/document.service.ts`
- Modify: `server/src/modules/document/document-lifecycle.service.spec.ts`
- Modify: `server/src/modules/document/document-lifecycle.service.ts`

- [ ] **Step 1: Add an approval-path supersede test**

In `server/src/modules/document/document.service.spec.ts`, in the approval tests for `approve()`, add a test that approves a pending revision and expects the old effective document to be superseded:

```ts
  it('supersedes the previous effective document when approving a revision draft', async () => {
    const pendingRevision = {
      id: 'doc-v2',
      number: 'CX-01',
      title: '程序文件',
      status: 'pending',
      creatorId: 'creator-1',
      revisionOfId: 'doc-v1',
      lineage_key: 'CX-01',
    };
    prisma.document.findUnique.mockResolvedValue(pendingRevision);
    prisma.approval.findFirst.mockResolvedValue({ id: 'approval-1', documentId: 'doc-v2', approverId: 'admin-1', status: 'pending' });
    prisma.user.findUnique
      .mockResolvedValueOnce({ id: 'admin-1', role: 'admin' })
      .mockResolvedValueOnce({ id: 'creator-1', role: 'user' });
    prisma.document.findFirst.mockResolvedValue({ id: 'doc-v1', number: 'CX-01', status: 'effective', lineage_key: 'CX-01' });
    prisma.approval.update.mockResolvedValue({ id: 'approval-1', status: 'approved' });
    prisma.document.update
      .mockResolvedValueOnce({ id: 'doc-v2', status: 'effective', revisionStatus: 'current' })
      .mockResolvedValueOnce({ id: 'doc-v1', status: 'superseded', revisionStatus: 'superseded', superseded_by_id: 'doc-v2' });

    await service.approve('doc-v2', 'approved', '通过', 'admin-1');

    expect(prisma.document.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'doc-v1' },
      data: expect.objectContaining({
        status: 'superseded',
        revisionStatus: 'superseded',
        superseded_by_id: 'doc-v2',
      }),
    }));
  });
```

If the current mock object names differ, adapt only the mock variable names while preserving the assertion.

- [ ] **Step 2: Run the approval test and verify it fails**

Run:

```bash
(cd server && npm test -- document.service.spec.ts --runInBand)
```

Expected: FAIL because `approve()` currently updates only the approved document.

- [ ] **Step 3: Add supersede helper to `DocumentService`**

In `server/src/modules/document/document.service.ts`, add this private method before `approve()`:

```ts
  private async supersedePreviousEffectiveRevision(
    tx: PrismaService | Prisma.TransactionClient,
    document: { id: string; number: string; lineage_key?: string | null; revisionOfId?: string | null },
  ) {
    if (!document.revisionOfId) return;

    const lineageKey = document.lineage_key ?? document.number;
    const previous = await tx.document.findFirst({
      where: {
        id: { not: document.id },
        deletedAt: null,
        status: { in: [...EFFECTIVE_COMPAT_STATUSES] },
        OR: [
          { lineage_key: lineageKey } as any,
          { id: document.revisionOfId },
          { number: document.number },
        ],
      },
    });

    if (!previous) return;

    await tx.document.update({
      where: { id: previous.id },
      data: {
        status: 'superseded',
        revisionStatus: 'superseded',
        superseded_by_id: document.id,
      } as any,
    });
  }
```

- [ ] **Step 4: Use the helper in `approve()`**

In `approve()`, replace the separate approval update and document update block with a transaction:

```ts
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.approval.update({
        where: { id: pendingApproval.id },
        data: {
          status: status === 'approved' ? 'approved' : 'rejected',
          comment: comment ?? null,
        },
      });

      const updated = await tx.document.update({
        where: { id },
        data: {
          status: status === 'approved'
            ? CANONICAL_DOCUMENT_STATUS.EFFECTIVE
            : CANONICAL_DOCUMENT_STATUS.REJECTED,
          revisionStatus: status === 'approved' ? 'current' : (document as any).revisionStatus,
          approverId,
          approvedAt: new Date(),
        } as any,
      });

      if (status === 'approved') {
        await this.supersedePreviousEffectiveRevision(tx, {
          id,
          number: document.number,
          lineage_key: (document as any).lineage_key,
          revisionOfId: (document as any).revisionOfId,
        });
      }

      return updated;
    });
```

Remove the old standalone `this.prisma.approval.update()` call so approval and supersede happen atomically.

- [ ] **Step 5: Keep lifecycle publish behavior aligned**

In `server/src/modules/document/document-lifecycle.service.ts`, verify `publish()` already updates the old effective document with:

```ts
status: 'superseded',
revisionStatus: 'superseded',
superseded_by_id: id,
```

If any of these fields are missing, add them to the existing old-document update block. Keep the existing transaction.

- [ ] **Step 6: Run lifecycle tests**

Run:

```bash
(cd server && npm test -- document.service.spec.ts document-lifecycle.service.spec.ts --runInBand)
```

Expected: PASS.

## Task 5: Update frontend version-history contract and rendering

**Files:**
- Modify: `client/src/api/document-management.ts`
- Modify: `client/src/views/documents/DocumentDetail.vue`
- Modify: `client/src/views/documents/__tests__/DocumentDetail.spec.ts`

- [ ] **Step 1: Update API types**

In `client/src/api/document-management.ts`, replace `DocumentVersionItem` with:

```ts
export interface DocumentRevisionItem {
  id: string;
  number: string;
  title: string;
  versionNo: number;
  versionLabel: string;
  status: string;
  revisionStatus?: string | null;
  revisionOfId?: string | null;
  superseded_by_id?: string | null;
  isCurrentVersion?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface DocumentVersionItem {
  id: string;
  version: number | string;
  documentVersionNo?: number;
  documentVersionLabel?: string;
  snapshotVersionLabel?: string;
  fileName: string;
  fileSize: string | number;
  createdAt: string;
  creator: { name: string } | null;
}
```

Then update `getVersions()` to:

```ts
  getVersions(id: string) {
    return request.get<{ revisions: DocumentRevisionItem[]; versions: DocumentVersionItem[] }>(`/documents/${id}/versions`);
  },
```

- [ ] **Step 2: Update component state and interfaces**

In `client/src/views/documents/DocumentDetail.vue`, import the new types:

```ts
import { documentManagementApi, type DocumentRevisionItem, type DocumentVersionItem } from '@/api/document-management';
```

Replace the local `VersionItem` interface with the imported type and add:

```ts
const revisionHistory = ref<DocumentRevisionItem[]>([]);
const versionHistory = ref<DocumentVersionItem[]>([]);
```

Remove the old `const versionHistory = ref<VersionItem[]>([]);` declaration.

- [ ] **Step 3: Render revision chain before file snapshots**

In the template, before the existing `version-card`, add:

```vue
    <el-card class="version-card" v-if="revisionHistory.length">
      <template #header>
        <span>修订链</span>
      </template>
      <el-table :data="revisionHistory" stripe>
        <el-table-column prop="versionLabel" label="受控版本" width="100" />
        <el-table-column prop="title" label="文件名称" min-width="160" />
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="修订状态" width="140">
          <template #default="{ row }">
            {{ revisionStatusText(row) }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>
```

In the existing file snapshot table, change the version column template to:

```vue
          <template #default="{ row }">
            {{ row.documentVersionLabel || displayVersion }} / {{ row.snapshotVersionLabel || `文件快照 ${row.version}` }}
          </template>
```

Keep preview, download, compare, and rollback handlers using `row.version`.

- [ ] **Step 4: Add revision status formatter**

In the script block, add:

```ts
const revisionStatusText = (row: DocumentRevisionItem): string => {
  if (row.isCurrentVersion || row.revisionStatus === 'current') return '当前有效';
  if (row.revisionStatus === 'revision_draft') return '修订草稿';
  if (row.revisionStatus === 'superseded' || row.superseded_by_id) return '已被替代';
  return row.revisionStatus || '-';
};
```

- [ ] **Step 5: Update version-history fetch**

Replace `fetchVersionHistory()` with:

```ts
const fetchVersionHistory = async () => {
  try {
    const res = await documentManagementApi.getVersions(String(route.params.id));
    revisionHistory.value = res.revisions || [];
    versionHistory.value = res.versions || [];
  } catch (error) {
    revisionHistory.value = [];
    versionHistory.value = [];
  }
};
```

- [ ] **Step 6: Add frontend test data and assertions**

In `client/src/views/documents/__tests__/DocumentDetail.spec.ts`, adjust the mocked `/versions` response to include both arrays:

```ts
if (url.includes('/versions')) {
  return Promise.resolve({
    revisions: [
      { id: 'doc-v2', title: 'SOP', number: 'CX-01', versionNo: 2, versionLabel: 'V2', status: 'effective', revisionStatus: 'current', isCurrentVersion: true },
      { id: 'doc-v1', title: 'SOP', number: 'CX-01', versionNo: 1, versionLabel: 'V1', status: 'superseded', revisionStatus: 'superseded', superseded_by_id: 'doc-v2' },
    ],
    versions: [
      { id: 'snapshot-1', version: '2.0', documentVersionLabel: 'V2', snapshotVersionLabel: '文件快照 2.0', fileName: 'old.pdf', fileSize: 100, createdAt: '2026-05-02T00:00:00.000Z', creator: { name: '文控员' } },
    ],
  });
}
```

Add this assertion test:

```ts
  it('renders controlled revision chain and legacy file snapshot labels', async () => {
    const c = w();
    await flushPromises();

    expect(c.text()).toContain('修订链');
    expect(c.text()).toContain('V2');
    expect(c.text()).toContain('V1');
    expect(c.text()).toContain('文件快照 2.0');
  });
```

- [ ] **Step 7: Run frontend focused tests**

Run:

```bash
(cd client && npm test -- DocumentDetail.spec.ts)
```

Expected: PASS.

## Task 6: Final verification

**Files:**
- Verify only

- [ ] **Step 1: Run server tests**

Run:

```bash
(cd server && npm test -- document.service.spec.ts document-lifecycle.service.spec.ts --runInBand)
```

Expected: PASS.

- [ ] **Step 2: Run frontend tests**

Run:

```bash
(cd client && npm test -- DocumentDetail.spec.ts)
```

Expected: PASS.

- [ ] **Step 3: Run client build**

Run:

```bash
npm run build:client
```

Expected: PASS.

- [ ] **Step 4: Check diff hygiene**

Run:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors; only the files listed in this plan are modified.

## Execution handoff

Execution agent must implement this plan with `superpowers:executing-plans` only. This PR must not include schema migrations, roadmap edits, spec rewrites, or unrelated module changes.
