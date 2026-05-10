# GAP-400 Document Version Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Do not use brainstorming, writing-plans, or redesign the document version model during execution. If current code disagrees with this plan, stop and report the mismatch to the main agent.

**Goal:** Make controlled document current versions display from `Document.versionNo` as stable `Vn` labels while preserving legacy Decimal `Document.version` compatibility.

**Architecture:** Keep `Document.version` as a legacy Decimal field, backfill `Document.versionNo` for old major-version rows, decorate document API responses with `versionNo` and `versionLabel`, and make the frontend render `versionLabel` instead of raw Decimal values. Protect Prisma Decimal serialization in the shared BigInt utility so legacy `version` remains readable for compatibility.

**Tech Stack:** Prisma schema/migration, NestJS document service, shared server utilities, Vue 3, Vitest, Jest, npm workspaces.

---

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** 主 agent 已按 `brainstorming -> grill-with-docs -> writing-plans` 为 GAP-400 生成 spec 和本 implementation plan。
- **grill-with-docs 校准结论：** 已确认 `Document` 仍是受控文件事实源，当前版本展示必须落到已存在的 `versionNo`，不得新增平行文件版本事实源，不得把 `DocumentVersion.version` 的 GAP-406 语义升级合并进本 PR。
- **执行限制：** Multica 执行 agent 只能使用 `superpowers:executing-plans` 执行本计划；不得自行扩展范围、补写新 spec、重排 GAP 或修改未列入文件。
- **执行隔离：** 执行本计划前必须从最新 `origin/master` 创建独立 worktree，或使用 Multica 隔离工作目录；不得在主 checkout `/Users/jiashenglin/Desktop/好玩的项目/noidear` 直接修改、提交或 push。如发现当前目录是主 checkout，必须停止并回报主 agent。
- **停止条件：** 如果执行 agent 发现本计划与当前代码、`AGENTS.md`、`docs/AGENT_GUIDE.md`、`docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 或 spec 冲突，必须停止并回报主 agent，不得猜测实现。
- **历史兼容停止条件：** 如果实现当前版本 `Vn` 展示必须修改 `DocumentVersion.version` schema 或历史版本 URL 参数，停止并回报主 agent；该范围属于 GAP-406。
- **命令约束：** 本计划只使用当前仓库 npm workspaces 命令；不得新增 pnpm 命令。

## File Map

All commands below assume the execution agent is at the root of its isolated `noidear` worktree or Multica checkout.

- Modify: `server/src/common/utils/bigint.util.ts`
- Modify: `server/src/common/utils/bigint.util.spec.ts`
- Add: `server/src/modules/document/document-version.presenter.ts`
- Add: `server/src/modules/document/document-version.presenter.spec.ts`
- Modify: `server/src/modules/document/document.service.ts`
- Modify: `server/src/modules/document/document.service.spec.ts`
- Modify: `server/src/prisma/schema.prisma`
- Add: `server/src/prisma/migrations/20260502113000_backfill_document_version_no/migration.sql`
- Modify: `client/src/api/document-control.ts`
- Modify: `client/src/views/documents/DocumentDetail.vue`
- Modify: `client/src/views/documents/__tests__/DocumentDetail.spec.ts`
- Do not modify: `server/src/modules/record-template/`
- Do not modify: `server/src/modules/record/`
- Do not modify: `server/src/modules/training/`
- Do not modify: `server/src/modules/internal-audit/`
- Do not modify: `server/src/modules/traceability/`

## Task 1: Protect Prisma Decimal serialization

**Files:**
- Modify: `server/src/common/utils/bigint.util.spec.ts`
- Modify: `server/src/common/utils/bigint.util.ts`

- [ ] **Step 1: Add a failing Decimal serialization test**

In `server/src/common/utils/bigint.util.spec.ts`, add this import at the top:

```ts
import { Prisma } from '@prisma/client';
```

Then add this test before `it('应该保持非 BigInt 类型不变', () => {`:

```ts
  it('应该将 Prisma Decimal 转换为稳定字符串', () => {
    const input = {
      version: new Prisma.Decimal('1.0'),
      nested: {
        amount: new Prisma.Decimal('2.5'),
      },
    };

    expect(convertBigIntToNumber(input)).toEqual({
      version: '1',
      nested: {
        amount: '2.5',
      },
    });
  });
```

- [ ] **Step 2: Run the focused utility test and verify it fails**

```bash
(cd server && npm test -- bigint.util.spec.ts --runInBand)
```

Expected: FAIL because `convertBigIntToNumber()` currently treats Prisma Decimal as a generic object.

- [ ] **Step 3: Update the converter**

Replace the full contents of `server/src/common/utils/bigint.util.ts` with:

```ts
/**
 * 将对象中的 BigInt 类型转换为 Number 类型。
 * Prisma Decimal 对象保留为稳定字符串，避免被递归成不可读结构。
 */

function isPrismaDecimal(obj: unknown): obj is { toString: () => string; toFixed: (decimalPlaces?: number) => string } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    obj.constructor?.name === 'Decimal' &&
    typeof (obj as { toString?: unknown }).toString === 'function' &&
    typeof (obj as { toFixed?: unknown }).toFixed === 'function'
  );
}

export function convertBigIntToNumber<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'bigint') {
    return Number(obj) as unknown as T;
  }

  if (isPrismaDecimal(obj)) {
    return obj.toString() as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertBigIntToNumber(item)) as unknown as T;
  }

  if (typeof obj === 'object') {
    if (obj instanceof Date || obj instanceof RegExp) {
      return obj;
    }

    const result: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) {
      result[key] = convertBigIntToNumber((obj as Record<string, unknown>)[key]);
    }
    return result as T;
  }

  return obj;
}
```

- [ ] **Step 4: Run the focused utility test and verify it passes**

```bash
(cd server && npm test -- bigint.util.spec.ts --runInBand)
```

Expected: PASS.

## Task 2: Add document version presenter

**Files:**
- Add: `server/src/modules/document/document-version.presenter.ts`
- Add: `server/src/modules/document/document-version.presenter.spec.ts`

- [ ] **Step 1: Create the presenter**

Create `server/src/modules/document/document-version.presenter.ts` with:

```ts
type DocumentVersionShape = {
  versionNo?: number | string | null;
  version?: unknown;
};

function numericValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { toString?: unknown }).toString === 'function'
  ) {
    const parsed = Number((value as { toString: () => string }).toString());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function resolveDocumentVersionNo(document: DocumentVersionShape): number {
  const explicit = numericValue(document.versionNo);
  if (explicit !== null && explicit >= 1) return Math.trunc(explicit);

  const legacy = numericValue(document.version);
  if (legacy !== null && legacy >= 1) return Math.max(1, Math.trunc(legacy));

  return 1;
}

export function withDocumentVersionLabel<T extends DocumentVersionShape>(
  document: T,
): T & { versionNo: number; versionLabel: string } {
  const versionNo = resolveDocumentVersionNo(document);
  return {
    ...document,
    versionNo,
    versionLabel: `V${versionNo}`,
  };
}

export function withDocumentVersionLabels<T extends DocumentVersionShape>(
  documents: T[],
): Array<T & { versionNo: number; versionLabel: string }> {
  return documents.map(withDocumentVersionLabel);
}
```

- [ ] **Step 2: Add presenter tests**

Create `server/src/modules/document/document-version.presenter.spec.ts` with:

```ts
import { Prisma } from '@prisma/client';
import {
  resolveDocumentVersionNo,
  withDocumentVersionLabel,
  withDocumentVersionLabels,
} from './document-version.presenter';

describe('document version presenter', () => {
  it('uses explicit versionNo as the controlled document version', () => {
    expect(resolveDocumentVersionNo({ versionNo: 3, version: new Prisma.Decimal('1.2') })).toBe(3);
  });

  it('falls back to the integer part of legacy Decimal version', () => {
    expect(resolveDocumentVersionNo({ version: new Prisma.Decimal('2.0') })).toBe(2);
    expect(resolveDocumentVersionNo({ version: new Prisma.Decimal('1.2') })).toBe(1);
  });

  it('decorates one document with a Vn label', () => {
    expect(withDocumentVersionLabel({ id: 'doc-1', versionNo: 2 })).toEqual({
      id: 'doc-1',
      versionNo: 2,
      versionLabel: 'V2',
    });
  });

  it('decorates document lists with Vn labels', () => {
    expect(withDocumentVersionLabels([{ id: 'doc-1', versionNo: 1 }, { id: 'doc-2', versionNo: 2 }])).toEqual([
      { id: 'doc-1', versionNo: 1, versionLabel: 'V1' },
      { id: 'doc-2', versionNo: 2, versionLabel: 'V2' },
    ]);
  });
});
```

- [ ] **Step 3: Run presenter tests**

```bash
(cd server && npm test -- document-version.presenter.spec.ts --runInBand)
```

Expected: PASS.

## Task 3: Decorate document service responses

**Files:**
- Modify: `server/src/modules/document/document.service.ts`
- Modify: `server/src/modules/document/document.service.spec.ts`

- [ ] **Step 1: Import the presenter**

In `server/src/modules/document/document.service.ts`, add:

```ts
import { withDocumentVersionLabel, withDocumentVersionLabels } from './document-version.presenter';
```

- [ ] **Step 2: Decorate `create()` response**

Replace:

```ts
    return convertBigIntToNumber(result);
```

inside `create()` with:

```ts
    return withDocumentVersionLabel(convertBigIntToNumber(result));
```

- [ ] **Step 3: Decorate `findAll()` response**

Replace:

```ts
    return { list: convertBigIntToNumber(enrichedList), total, page, limit };
```

inside the primary `findAll()` method with:

```ts
    return { list: withDocumentVersionLabels(convertBigIntToNumber(enrichedList)), total, page, limit };
```

- [ ] **Step 4: Decorate `findOne()` response**

Replace:

```ts
    return convertBigIntToNumber(document);
```

inside the primary `findOne()` method with:

```ts
    return withDocumentVersionLabel(convertBigIntToNumber(document));
```

- [ ] **Step 5: Decorate file update response**

Inside `update()`, replace the file-update branch return:

```ts
      return convertBigIntToNumber(result);
```

with:

```ts
      return withDocumentVersionLabel(convertBigIntToNumber(result));
```

- [ ] **Step 6: Decorate metadata-only update response**

Inside `update()`, replace:

```ts
    return convertBigIntToNumber(result);
```

with:

```ts
    return withDocumentVersionLabel(convertBigIntToNumber(result));
```

- [ ] **Step 7: Decorate revision draft response**

In `createRevisionDraft()`, replace:

```ts
    return this.prisma.document.create({
      data: {
```

with:

```ts
    const revisionDraft = await this.prisma.document.create({
      data: {
```

Then replace the end of that create call:

```ts
      } as any,
    });
  }
```

with:

```ts
      } as any,
    });

    return withDocumentVersionLabel(convertBigIntToNumber(revisionDraft));
  }
```

- [ ] **Step 8: Add service tests for decorated responses**

In `server/src/modules/document/document.service.spec.ts`, place this test after the existing `it.each(['approved', 'effective'])('treats %s list filter as effective-compatible'...` block:

```ts
  it('adds versionLabel to document list responses', async () => {
    prisma.document.findMany.mockResolvedValue([{ id: 'doc1', creatorId: null, approverId: null, versionNo: 2, version: new Prisma.Decimal('2.0') }]);
    prisma.document.count.mockResolvedValue(1);
    prisma.user.findMany.mockResolvedValue([]);

    const result = await service.findAll({} as any, 'admin1', 'admin');

    expect(result.list[0]).toEqual(expect.objectContaining({
      versionNo: 2,
      versionLabel: 'V2',
      version: '2',
    }));
  });
```

Add this test in the same describe block:

```ts
  it('adds versionLabel to document detail responses', async () => {
    prisma.document.findUnique.mockResolvedValue({
      id: 'doc1',
      number: 'DOC-001',
      creatorId: 'admin1',
      deletedAt: null,
      versionNo: 3,
      version: new Prisma.Decimal('3.0'),
      sourceReferences: [],
      targetReferences: [],
    });

    const result = await service.findOne('doc1', 'admin1', 'admin');

    expect(result).toEqual(expect.objectContaining({
      versionNo: 3,
      versionLabel: 'V3',
      version: '3',
    }));
  });
```

In the existing `creates a revision draft instead of editing an effective document in place` test, add after `expect(result.id).toBe('doc-v2');`:

```ts
    expect(result.versionLabel).toBe('V2');
```

- [ ] **Step 9: Run focused service tests**

```bash
(cd server && npm test -- document.service.spec.ts document-version.presenter.spec.ts bigint.util.spec.ts --runInBand)
```

Expected: PASS.

## Task 4: Add historical `versionNo` backfill migration

**Files:**
- Modify: `server/src/prisma/schema.prisma`
- Add: `server/src/prisma/migrations/20260502113000_backfill_document_version_no/migration.sql`

- [ ] **Step 1: Document the legacy field in Prisma schema**

In `model Document`, replace:

```prisma
  version    Decimal   @default(1.0) @db.Decimal(3, 1)
```

with:

```prisma
  // Legacy compatibility field for historical upload/rollback routes. Current display uses versionNo/versionLabel.
  version    Decimal   @default(1.0) @db.Decimal(3, 1)
```

- [ ] **Step 2: Create migration SQL**

Create `server/src/prisma/migrations/20260502113000_backfill_document_version_no/migration.sql` with:

```sql
-- GAP-400: preserve legacy Decimal documents.version while ensuring current display can rely on documents.versionNo.
-- Only backfill legacy major versions. Decimal 1.1/1.2 file-upload history remains V1 by design.

UPDATE "documents"
SET "versionNo" = GREATEST(1, FLOOR("version")::integer)
WHERE "versionNo" <= 1
  AND "version" >= 2.0;
```

- [ ] **Step 3: Validate Prisma schema**

```bash
(cd server && npx prisma validate --schema src/prisma/schema.prisma)
```

Expected: `The schema at src/prisma/schema.prisma is valid`.

## Task 5: Update frontend document contract and detail display

**Files:**
- Modify: `client/src/api/document-control.ts`
- Modify: `client/src/views/documents/DocumentDetail.vue`
- Modify: `client/src/views/documents/__tests__/DocumentDetail.spec.ts`

- [ ] **Step 1: Add version fields to API type**

In `client/src/api/document-control.ts`, inside `DocumentControlDocument`, add directly after `status: string;`:

```ts
  version?: number | string;
  versionNo?: number;
  versionLabel?: string;
```

- [ ] **Step 2: Update detail page interfaces**

In `client/src/views/documents/DocumentDetail.vue`, replace:

```ts
  version: number;
```

in the `interface Document` block with:

```ts
  version?: number | string;
  versionNo?: number;
  versionLabel?: string;
```

If there is another `version: number;` in the `VersionItem` interface for historical versions, leave it unchanged for GAP-406.

- [ ] **Step 3: Add a safe current version formatter**

In `DocumentDetail.vue`, place this helper above `const displayVersion = computed(() => {`:

```ts
const formatCurrentVersionLabel = (doc: Document | null) => {
  if (!doc) return 'V1';
  if (doc.versionLabel) return doc.versionLabel;

  const rawVersionNo = Number(doc.versionNo);
  if (Number.isFinite(rawVersionNo) && rawVersionNo >= 1) {
    return `V${Math.trunc(rawVersionNo)}`;
  }

  const rawLegacyVersion = Number(doc.version);
  if (Number.isFinite(rawLegacyVersion) && rawLegacyVersion >= 1) {
    return `V${Math.trunc(rawLegacyVersion)}`;
  }

  return 'V1';
};
```

- [ ] **Step 4: Use the formatter for current display**

Replace:

```ts
const displayVersion = computed(() => {
  const versionNo = Number(document.value?.versionNo || document.value?.version || 1);
  return `V${Number.isFinite(versionNo) ? Math.trunc(versionNo) : 1}`;
});
```

with:

```ts
const displayVersion = computed(() => formatCurrentVersionLabel(document.value));
```

- [ ] **Step 5: Add frontend tests**

In `client/src/views/documents/__tests__/DocumentDetail.spec.ts`, add after `it('stores document data after fetch', async () => { ... });`:

```ts
  it('renders current version from versionLabel', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/versions')) return Promise.resolve({ versions: [] });
      return Promise.resolve(makeDocument({ version: { bad: 'decimal-object' } as any, versionNo: 2, versionLabel: 'V2' } as any));
    });

    const wrapper = w();
    await flushPromises();

    expect(wrapper.text()).toContain('V2');
    expect(wrapper.text()).not.toContain('decimal-object');
  });

  it('falls back to versionNo for current version display', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/versions')) return Promise.resolve({ versions: [] });
      return Promise.resolve(makeDocument({ version: { bad: 'decimal-object' } as any, versionNo: 3 } as any));
    });

    const wrapper = w();
    await flushPromises();

    expect(wrapper.text()).toContain('V3');
    expect(wrapper.text()).not.toContain('decimal-object');
  });
```

- [ ] **Step 6: Run focused frontend tests**

```bash
(cd client && npm test -- DocumentDetail.spec.ts)
```

Expected: PASS.

## Task 6: Full validation

**Files:**
- No file changes.

- [ ] **Step 1: Run server focused tests**

```bash
(cd server && npm test -- document.service.spec.ts document-version.presenter.spec.ts bigint.util.spec.ts --runInBand)
```

Expected: PASS.

- [ ] **Step 2: Run Prisma validation**

```bash
(cd server && npx prisma validate --schema src/prisma/schema.prisma)
```

Expected: `The schema at src/prisma/schema.prisma is valid`.

- [ ] **Step 3: Run client focused tests**

```bash
(cd client && npm test -- DocumentDetail.spec.ts)
```

Expected: PASS.

- [ ] **Step 4: Run client build**

```bash
npm run build:client
```

Expected: PASS.

- [ ] **Step 5: Record E2E status**

GAP-400 专用 E2E 未配置；不得伪造不存在的 GAP-400 专用 E2E 命令。如主 agent 要求浏览器冒烟验证，使用现有 client E2E runner 的真实用例名称，或人工打开 `/documents/:id` 验证页面显示 `Vn`。

## Task 7: Commit implementation

**Files:**
- All modified files from the tasks above.

- [ ] **Step 1: Inspect the diff**

```bash
git status --short
git diff -- server/src/common/utils/bigint.util.ts server/src/common/utils/bigint.util.spec.ts server/src/modules/document/document-version.presenter.ts server/src/modules/document/document-version.presenter.spec.ts server/src/modules/document/document.service.ts server/src/modules/document/document.service.spec.ts server/src/prisma/schema.prisma server/src/prisma/migrations/20260502113000_backfill_document_version_no/migration.sql client/src/api/document-control.ts client/src/views/documents/DocumentDetail.vue client/src/views/documents/__tests__/DocumentDetail.spec.ts
```

Expected: only GAP-400 implementation files changed; no docs roadmap or unrelated module changes.

- [ ] **Step 2: Commit**

```bash
git add server/src/common/utils/bigint.util.ts server/src/common/utils/bigint.util.spec.ts server/src/modules/document/document-version.presenter.ts server/src/modules/document/document-version.presenter.spec.ts server/src/modules/document/document.service.ts server/src/modules/document/document.service.spec.ts server/src/prisma/schema.prisma server/src/prisma/migrations/20260502113000_backfill_document_version_no/migration.sql client/src/api/document-control.ts client/src/views/documents/DocumentDetail.vue client/src/views/documents/__tests__/DocumentDetail.spec.ts
git commit -m "fix: display document versions from versionNo"
```

Expected: commit succeeds from the isolated worktree.
