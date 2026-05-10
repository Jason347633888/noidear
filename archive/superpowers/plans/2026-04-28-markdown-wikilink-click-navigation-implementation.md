# Markdown Wikilink Click Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Markdown `[[...]]` links clickable, route resolved links to target documents, visually mark unresolved/conflict links, and persist the raw wikilink target on `DocumentReference`.

**Architecture:** Backend wikilink sync stores `wikilinkTarget` as the canonical raw target for every WIKILINK reference, with `sectionId` kept only for legacy compatibility. The renderer remains business-agnostic and only emits styled spans plus click events; `DocumentDetail.vue` owns document-control semantics and decides whether to navigate, warn, or expand reference issues.

**Tech Stack:** NestJS, Prisma/PostgreSQL, Jest, Vue 3, Vue Test Utils, Vitest, Element Plus, markdown-it.

---

## File Structure

- Modify `server/src/prisma/schema.prisma`
  Adds nullable `DocumentReference.wikilinkTarget` plus index.
- Create `server/src/prisma/migrations/20260428000000_add_document_reference_wikilink_target/migration.sql`
  Adds the database column, backfills legacy `sectionId = wikilink:<target>` rows, and adds an index.
- Modify `server/src/modules/document/services/markdown-wikilink.service.ts`
  Parses alias wikilinks as target/display label, writes `wikilinkTarget` for resolved, unresolved, and conflict references.
- Modify `server/src/modules/document/services/markdown-wikilink.service.spec.ts`
  Covers alias parsing and `wikilinkTarget` persistence.
- Modify `client/src/api/document-control.ts`
  Exposes `wikilinkTarget`, `sectionId`, and richer `targetDoc` fields to the UI.
- Modify `client/src/components/documents/markdown-renderer.ts`
  Adds `WikilinkStatus`, render options, status classes, and keeps code-block protection.
- Modify `client/src/components/documents/MarkdownViewer.vue`
  Accepts status map, forwards options to renderer, emits `wikilink-click`, and styles link states.
- Modify `client/src/components/documents/MarkdownViewer.spec.ts`
  Covers click emission, no emission for plain text/code links, and status classes.
- Modify `client/src/views/documents/DocumentDetail.vue`
  Passes status map, handles click navigation/warnings, and prioritizes `wikilinkTarget`.
- Modify `client/src/views/documents/__tests__/DocumentDetail.spec.ts`
  Covers resolved/dangling/conflict/alias click behavior and status map generation.

---

### Task 1: Backend Schema And Migration

**Files:**
- Modify: `server/src/prisma/schema.prisma`
- Create: `server/src/prisma/migrations/20260428000000_add_document_reference_wikilink_target/migration.sql`

- [ ] **Step 1: Add the Prisma field**

In `server/src/prisma/schema.prisma`, update `model DocumentReference`:

```prisma
model DocumentReference {
  id          String   @id @default(cuid())
  sourceDocId String
  sourceDoc   Document @relation("SourceRefs", fields: [sourceDocId], references: [id], onDelete: Cascade)

  targetDocId String?
  targetDoc   Document? @relation("TargetRefs", fields: [targetDocId], references: [id], onDelete: SetNull)

  targetType  String   @default("document")
  targetId    String?
  targetRoute String?
  targetLabel String?
  relationType String @default("RELATED_TO")

  sectionId      String?
  wikilinkTarget String?
  snapshot       Json?
  syncedAt       DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([sourceDocId, targetType, targetId, targetRoute, sectionId])
  @@index([sourceDocId])
  @@index([targetDocId])
  @@index([targetType, targetId])
  @@index([relationType])
  @@index([wikilinkTarget])
  @@map("document_references")
}
```

- [ ] **Step 2: Add the SQL migration**

Create `server/src/prisma/migrations/20260428000000_add_document_reference_wikilink_target/migration.sql`:

```sql
ALTER TABLE "document_references"
ADD COLUMN "wikilinkTarget" TEXT;

UPDATE "document_references"
SET "wikilinkTarget" = substring("sectionId" from 10)
WHERE "relationType" = 'WIKILINK'
  AND "wikilinkTarget" IS NULL
  AND "sectionId" LIKE 'wikilink:%';

CREATE INDEX "document_references_wikilinkTarget_idx"
ON "document_references"("wikilinkTarget");
```

The `substring(... from 10)` starts after the nine-character prefix `wikilink:`.

- [ ] **Step 3: Regenerate Prisma client**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-markdown-wikilink-click-navigation/server
npm run prisma:generate
```

Expected: Prisma Client generation succeeds without schema errors.

- [ ] **Step 4: Commit schema and migration**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-markdown-wikilink-click-navigation
git add server/src/prisma/schema.prisma server/src/prisma/migrations/20260428000000_add_document_reference_wikilink_target/migration.sql
git commit -m "feat: add wikilink target field"
```

---

### Task 2: Backend Wikilink Sync

**Files:**
- Modify: `server/src/modules/document/services/markdown-wikilink.service.spec.ts`
- Modify: `server/src/modules/document/services/markdown-wikilink.service.ts`

- [ ] **Step 1: Update the extraction test to prove alias handling**

In `server/src/modules/document/services/markdown-wikilink.service.spec.ts`, replace the extraction test with:

```ts
it('extracts unique trimmed wikilink targets without alias display labels', () => {
  expect(service.extractWikilinks('引用 [[GRSS-CX-01|文件控制程序]]、[[ 原辅料验收标准 ]]、[[]]、[[GRSS-CX-01|重复显示]]')).toEqual([
    'GRSS-CX-01',
    '原辅料验收标准',
  ]);
});
```

- [ ] **Step 2: Add `wikilinkTarget` expectations to existing create tests**

In the resolved reference test, add:

```ts
wikilinkTarget: '原辅料验收标准',
```

inside the existing `expect.objectContaining({ ... })`.

In the unresolved reference test, add:

```ts
wikilinkTarget: '不存在的文件',
```

inside the existing `expect.objectContaining({ ... })`.

In the conflict reference test, add:

```ts
wikilinkTarget: '原辅料验收标准',
```

inside the existing `expect.objectContaining({ ... })`.

- [ ] **Step 3: Add a dedicated alias persistence test**

Append this test before the self-reference test:

```ts
it('stores the alias target as wikilinkTarget and not the display label', async () => {
  prisma.document.findMany.mockResolvedValueOnce([
    { id: 'target1', title: '文件控制程序', number: 'GRSS-CX-01', doc_code: null },
  ]);

  await service.syncDocumentWikilinks('source1', '见 [[GRSS-CX-01|文件控制程序]]');

  expect(prisma.document.findMany).toHaveBeenCalledWith(expect.objectContaining({
    where: expect.objectContaining({
      OR: [
        { number: 'GRSS-CX-01' },
        { title: 'GRSS-CX-01' },
        { doc_code: 'GRSS-CX-01' },
      ],
    }),
  }));
  expect(prisma.documentReference.create).toHaveBeenCalledWith({
    data: expect.objectContaining({
      targetDocId: 'target1',
      targetLabel: '文件控制程序',
      sectionId: 'wikilink:GRSS-CX-01',
      wikilinkTarget: 'GRSS-CX-01',
    }),
  });
});
```

- [ ] **Step 4: Run backend test and confirm failure**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-markdown-wikilink-click-navigation/server
npm test -- markdown-wikilink.service.spec.ts --runInBand
```

Expected: FAIL because `extractWikilinks()` still returns the alias string and creates references without `wikilinkTarget`.

- [ ] **Step 5: Implement target parsing and persistence**

In `server/src/modules/document/services/markdown-wikilink.service.ts`, replace the current `extractWikilinks()` with:

```ts
  extractWikilinks(content: string): string[] {
    const targets = Array.from(content.matchAll(/\[\[([^\]]+)\]\]/g))
      .map((match) => this.extractTarget(match[1]))
      .filter((target): target is string => Boolean(target));
    return Array.from(new Set(targets));
  }

  private extractTarget(raw: string): string | null {
    const target = raw.split('|')[0]?.trim();
    return target || null;
  }
```

In the resolved `documentReference.create()` data object, add:

```ts
            wikilinkTarget: label,
```

In the unresolved/conflict `documentReference.create()` data object, add:

```ts
          wikilinkTarget: label,
```

- [ ] **Step 6: Run backend test and confirm pass**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-markdown-wikilink-click-navigation/server
npm test -- markdown-wikilink.service.spec.ts --runInBand
```

Expected: PASS for `markdown-wikilink.service.spec.ts`.

- [ ] **Step 7: Commit backend sync**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-markdown-wikilink-click-navigation
git add server/src/modules/document/services/markdown-wikilink.service.ts server/src/modules/document/services/markdown-wikilink.service.spec.ts
git commit -m "feat: persist markdown wikilink targets"
```

---

### Task 3: Renderer Status Classes

**Files:**
- Modify: `client/src/components/documents/markdown-renderer.ts`
- Modify: `client/src/components/documents/MarkdownViewer.spec.ts`

- [ ] **Step 1: Add renderer status tests**

In `client/src/components/documents/MarkdownViewer.spec.ts`, after the existing code-block test, add:

```ts
  it('emits wikilink-click with the data target when a wikilink is clicked', async () => {
    const wrapper = mountMarkdown('参考 [[GRSS-CX-01|文件控制程序]]');

    await wrapper.find('.wikilink').trigger('click');

    expect(wrapper.emitted('wikilink-click')).toEqual([['GRSS-CX-01']]);
  });

  it('does not emit wikilink-click when plain text is clicked', async () => {
    const wrapper = mountMarkdown('这里只是普通正文');

    await wrapper.find('.markdown-viewer').trigger('click');

    expect(wrapper.emitted('wikilink-click')).toBeUndefined();
  });

  it('applies wikilink status classes by target', () => {
    const wrapper = mount(MarkdownViewer, {
      props: {
        content: '[[正常文件]] [[缺失文件]] [[重复文件]] [[未知文件]]',
        wikilinkStatusByTarget: {
          正常文件: 'resolved',
          缺失文件: 'dangling',
          重复文件: 'conflict',
        },
      },
    });

    const links = wrapper.findAll('.wikilink');
    expect(links[0].classes()).toContain('wikilink-resolved');
    expect(links[1].classes()).toContain('wikilink-dangling');
    expect(links[2].classes()).toContain('wikilink-conflict');
    expect(links[3].classes()).toContain('wikilink-unknown');
  });
```

- [ ] **Step 2: Run frontend test and confirm failure**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-markdown-wikilink-click-navigation/client
npm run test -- MarkdownViewer.spec.ts
```

Expected: FAIL because `MarkdownViewer` has no emit and renderer has no status option.

- [ ] **Step 3: Update renderer types and `enhanceWikilinks()`**

In `client/src/components/documents/markdown-renderer.ts`, add the public types after the `CALLOUT_TYPES` declaration:

```ts
export type WikilinkStatus = 'resolved' | 'dangling' | 'conflict' | 'unknown';

export interface RenderMarkdownOptions {
  wikilinkStatusByTarget?: Record<string, WikilinkStatus>;
}
```

Replace `const enhanceWikilinks = (html: string) => { ... }` with:

```ts
const enhanceWikilinks = (html: string, options: RenderMarkdownOptions = {}) => {
  const codeBlocks: string[] = [];
  const guarded = html.replace(/<code[^>]*>[\s\S]*?<\/code>/g, (match) => {
    codeBlocks.push(match);
    return `__NOIDEAR_CODE_BLOCK_${codeBlocks.length - 1}__`;
  });

  const withLinks = guarded.replace(
    /\[\[([^\]|<]+?)(?:\|([^\]<]+?))?\]\]/g,
    (_match, rawTarget: string, rawLabel?: string) => {
      const target = rawTarget.trim();
      const label = (rawLabel || rawTarget).trim();
      const status = options.wikilinkStatusByTarget?.[target] || 'unknown';
      return `<span class="wikilink wikilink-${escapeAttribute(status)}" data-target="${escapeAttribute(target)}">${label}</span>`;
    },
  );

  return withLinks.replace(/__NOIDEAR_CODE_BLOCK_(\d+)__/g, (_, i) => codeBlocks[parseInt(i, 10)]);
};
```

Replace `renderMarkdown()` with:

```ts
export const renderMarkdown = (content: string, options: RenderMarkdownOptions = {}) => {
  const withoutFrontmatter = stripFrontmatter(content);
  const rendered = markdown.render(withoutFrontmatter);

  return enhanceWikilinks(enhanceTaskLists(enhanceCallouts(rendered)), options);
};
```

- [ ] **Step 4: Run frontend test and keep expected failure**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-markdown-wikilink-click-navigation/client
npm run test -- MarkdownViewer.spec.ts
```

Expected: status-class assertions may pass, click emit tests still FAIL until `MarkdownViewer.vue` is updated in Task 4.

---

### Task 4: MarkdownViewer Click Event And Styles

**Files:**
- Modify: `client/src/components/documents/MarkdownViewer.vue`
- Modify: `client/src/components/documents/MarkdownViewer.spec.ts`

- [ ] **Step 1: Update MarkdownViewer script and template**

In `client/src/components/documents/MarkdownViewer.vue`, replace the template and script with:

```vue
<template>
  <article class="markdown-viewer" v-html="html" @click="handleClick" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { renderMarkdown, type WikilinkStatus } from './markdown-renderer';

const props = defineProps<{
  content: string;
  wikilinkStatusByTarget?: Record<string, WikilinkStatus>;
}>();

const emit = defineEmits<{
  (event: 'wikilink-click', target: string): void;
}>();

const html = computed(() => renderMarkdown(props.content, {
  wikilinkStatusByTarget: props.wikilinkStatusByTarget,
}));

const handleClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement | null;
  const link = target?.closest?.('.wikilink') as HTMLElement | null;
  const wikilinkTarget = link?.dataset?.target;
  if (!wikilinkTarget) return;
  emit('wikilink-click', wikilinkTarget);
};
</script>
```

Keep the existing style block and replace only the `.wikilink` section with the next step.

- [ ] **Step 2: Replace wikilink CSS**

In the same file, replace the existing `.markdown-viewer :deep(.wikilink)` block with:

```css
.markdown-viewer :deep(.wikilink) {
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  padding: 0 3px;
}

.markdown-viewer :deep(.wikilink-resolved) {
  background: #eef6ff;
  color: #1677d2;
}

.markdown-viewer :deep(.wikilink-dangling) {
  background: #fff2f0;
  color: #cf1322;
  text-decoration: underline dotted;
}

.markdown-viewer :deep(.wikilink-conflict) {
  background: #fff7e6;
  color: #ad6800;
  text-decoration: underline wavy;
}

.markdown-viewer :deep(.wikilink-unknown) {
  background: #f5f7fa;
  color: #606266;
  text-decoration: underline dotted;
}
```

- [ ] **Step 3: Run MarkdownViewer tests**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-markdown-wikilink-click-navigation/client
npm run test -- MarkdownViewer.spec.ts
```

Expected: PASS for all `MarkdownViewer` tests.

- [ ] **Step 4: Commit renderer and viewer**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-markdown-wikilink-click-navigation
git add client/src/components/documents/markdown-renderer.ts client/src/components/documents/MarkdownViewer.vue client/src/components/documents/MarkdownViewer.spec.ts
git commit -m "feat: emit markdown wikilink clicks"
```

---

### Task 5: Document Detail Navigation Semantics

**Files:**
- Modify: `client/src/api/document-control.ts`
- Modify: `client/src/views/documents/DocumentDetail.vue`
- Modify: `client/src/views/documents/__tests__/DocumentDetail.spec.ts`

- [ ] **Step 1: Extend frontend reference types**

In `client/src/api/document-control.ts`, update `DocumentReference`:

```ts
export interface DocumentReference {
  id: string;
  sourceDocId: string;
  targetDocId?: string | null;
  targetType: string;
  targetId?: string | null;
  targetRoute?: string | null;
  targetLabel?: string | null;
  relationType: string;
  sectionId?: string | null;
  wikilinkTarget?: string | null;
  targetDoc?: { id: string; title: string; status: string; number?: string | null; doc_code?: string | null } | null;
  sourceDoc?: { id: string; title: string; status: string; number?: string | null; doc_code?: string | null } | null;
}
```

In `client/src/views/documents/DocumentDetail.vue`, update the local `DocumentReference` interface to include:

```ts
  targetDocId?: string | null;
  sectionId?: string | null;
  wikilinkTarget?: string | null;
  targetDoc?: { id: string; title: string; status: string; number?: string | null; doc_code?: string | null } | null;
  sourceDoc?: { id: string; title: string; status: string; number?: string | null; doc_code?: string | null } | null;
```

- [ ] **Step 2: Add DocumentDetail click tests**

In `client/src/views/documents/__tests__/DocumentDetail.spec.ts`, add these tests after `renders markdown body when document has content_md`:

```ts
  it('routes resolved markdown wikilinks to the target document', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/versions')) return Promise.resolve([]);
      return Promise.resolve(makeDocument({
        content_md: '见 [[GRSS-CX-01|文件控制程序]]',
        sourceReferences: [
          {
            id: 'ref-resolved',
            sourceDocId: 'doc-1',
            relationType: 'WIKILINK',
            targetType: 'document',
            targetDocId: 'doc-2',
            targetId: 'doc-2',
            targetLabel: '文件控制程序',
            wikilinkTarget: 'GRSS-CX-01',
            sectionId: 'wikilink:GRSS-CX-01',
            targetDoc: { id: 'doc-2', title: '文件控制程序', number: 'GRSS-CX-01', doc_code: null, status: 'effective' },
          },
        ],
      }));
    });

    const wrapper = w();
    await flushPromises();
    await wrapper.find('.wikilink').trigger('click');

    expect(mockPush).toHaveBeenCalledWith('/documents/doc-2');
  });

  it('uses legacy sectionId to route old resolved wikilinks', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/versions')) return Promise.resolve([]);
      return Promise.resolve(makeDocument({
        content_md: '见 [[旧文件]]',
        sourceReferences: [
          {
            id: 'ref-legacy',
            sourceDocId: 'doc-1',
            relationType: 'WIKILINK',
            targetType: 'document',
            targetDocId: 'doc-legacy',
            targetId: 'doc-legacy',
            targetLabel: '旧文件',
            sectionId: 'wikilink:旧文件',
            targetDoc: { id: 'doc-legacy', title: '旧文件', status: 'effective' },
          },
        ],
      }));
    });

    const wrapper = w();
    await flushPromises();
    await wrapper.find('.wikilink').trigger('click');

    expect(mockPush).toHaveBeenCalledWith('/documents/doc-legacy');
  });

  it('warns and locates dangling markdown wikilinks without navigating', async () => {
    const { ElMessage } = await import('element-plus');
    mockGetReferenceHealth.mockResolvedValue({
      totals: { total: 1, healthy: 0, dangling: 1, invalid: 0, conflict: 0, superseded: 0 },
      issues: [
        { sourceDocId: 'doc-1', sourceTitle: '测试文档', referenceId: 'ref-dangling', label: '缺失文件', status: 'dangling', reason: '引用文本未匹配到受控文件。' },
      ],
    });
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/versions')) return Promise.resolve([]);
      return Promise.resolve(makeDocument({
        content_md: '见 [[缺失文件]]',
        sourceReferences: [
          {
            id: 'ref-dangling',
            sourceDocId: 'doc-1',
            relationType: 'WIKILINK',
            targetType: 'unresolved_document',
            targetLabel: '缺失文件',
            wikilinkTarget: '缺失文件',
            sectionId: 'wikilink:缺失文件',
          },
        ],
      }));
    });

    const wrapper = w();
    await flushPromises();
    await wrapper.find('.wikilink').trigger('click');

    expect(mockPush).not.toHaveBeenCalled();
    expect((wrapper.vm as any).activeReferenceLabel).toBe('缺失文件');
    expect(ElMessage.warning).toHaveBeenCalledWith('引用未解析，请在引用关系中处理。');
  });

  it('warns and expands conflict markdown wikilinks without navigating', async () => {
    const { ElMessage } = await import('element-plus');
    mockGetReferenceHealth.mockResolvedValue({
      totals: { total: 1, healthy: 0, dangling: 0, invalid: 0, conflict: 1, superseded: 0 },
      issues: [
        { sourceDocId: 'doc-1', sourceTitle: '测试文档', referenceId: 'ref-conflict', label: '重复文件', status: 'conflict', reason: '引用文本匹配到多个候选文件。', candidates: [{ id: 'doc-a', title: '重复文件' }] },
      ],
    });
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/versions')) return Promise.resolve([]);
      return Promise.resolve(makeDocument({
        content_md: '见 [[重复文件]]',
        sourceReferences: [
          {
            id: 'ref-conflict',
            sourceDocId: 'doc-1',
            relationType: 'WIKILINK',
            targetType: 'conflict_document',
            targetLabel: '重复文件',
            wikilinkTarget: '重复文件',
            sectionId: 'wikilink:重复文件',
            snapshot: { candidates: [{ id: 'doc-a', title: '重复文件' }] },
          },
        ],
      }));
    });

    const wrapper = w();
    await flushPromises();
    await wrapper.find('.wikilink').trigger('click');

    expect(mockPush).not.toHaveBeenCalled();
    expect((wrapper.vm as any).expandedConflictReferenceId).toBe('ref-conflict');
    expect(ElMessage.warning).toHaveBeenCalledWith('引用存在多个候选，请选择正确目标。');
  });

  it('passes resolved dangling and conflict wikilink status to MarkdownViewer', async () => {
    mockGetReferenceHealth.mockResolvedValue({
      totals: { total: 3, healthy: 1, dangling: 1, invalid: 0, conflict: 1, superseded: 0 },
      issues: [
        { sourceDocId: 'doc-1', sourceTitle: '测试文档', referenceId: 'ref-dangling', label: '缺失文件', status: 'dangling', reason: '引用文本未匹配到受控文件。' },
        { sourceDocId: 'doc-1', sourceTitle: '测试文档', referenceId: 'ref-conflict', label: '重复文件', status: 'conflict', reason: '引用文本匹配到多个候选文件。' },
      ],
    });
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/versions')) return Promise.resolve([]);
      return Promise.resolve(makeDocument({
        content_md: '[[正常文件]] [[缺失文件]] [[重复文件]]',
        sourceReferences: [
          { id: 'ref-ok', sourceDocId: 'doc-1', relationType: 'WIKILINK', targetType: 'document', targetDocId: 'doc-ok', targetLabel: '正常文件', wikilinkTarget: '正常文件', targetDoc: { id: 'doc-ok', title: '正常文件', status: 'effective' } },
          { id: 'ref-dangling', sourceDocId: 'doc-1', relationType: 'WIKILINK', targetType: 'unresolved_document', targetLabel: '缺失文件', wikilinkTarget: '缺失文件' },
          { id: 'ref-conflict', sourceDocId: 'doc-1', relationType: 'WIKILINK', targetType: 'conflict_document', targetLabel: '重复文件', wikilinkTarget: '重复文件' },
        ],
      }));
    });

    const wrapper = w();
    await flushPromises();
    const links = wrapper.findAll('.wikilink');

    expect(links[0].classes()).toContain('wikilink-resolved');
    expect(links[1].classes()).toContain('wikilink-dangling');
    expect(links[2].classes()).toContain('wikilink-conflict');
  });
```

- [ ] **Step 3: Run DocumentDetail test and confirm failure**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-markdown-wikilink-click-navigation/client
npm run test -- DocumentDetail.spec.ts
```

Expected: FAIL because `DocumentDetail.vue` does not pass status props or handle wikilink clicks.

- [ ] **Step 4: Pass props and event to MarkdownViewer**

In `client/src/views/documents/DocumentDetail.vue`, replace:

```vue
      <MarkdownViewer
        v-else
        :content="document.content_md"
      />
```

with:

```vue
      <MarkdownViewer
        v-else
        :content="document.content_md"
        :wikilink-status-by-target="wikilinkStatusByTarget"
        @wikilink-click="handleMarkdownWikilinkClick"
      />
```

- [ ] **Step 5: Add helper methods and computed status map**

In `client/src/views/documents/DocumentDetail.vue`, near `referenceHealthIssues`, add:

```ts
const wikilinkLegacyTarget = (ref: DocumentReference): string | null => (
  ref.sectionId?.startsWith('wikilink:') ? ref.sectionId.slice('wikilink:'.length) : null
);

const wikilinkReferenceTarget = (ref: DocumentReference): string | null => (
  ref.wikilinkTarget || wikilinkLegacyTarget(ref) || ref.targetLabel || null
);

const wikilinkStatusByTarget = computed(() => {
  const statusMap: Record<string, 'resolved' | 'dangling' | 'conflict' | 'unknown'> = {};

  for (const ref of outboundReferences.value) {
    if (ref.relationType !== 'WIKILINK' || !ref.targetDocId) continue;
    const target = wikilinkReferenceTarget(ref);
    if (target) statusMap[target] = 'resolved';
  }
  for (const issue of referenceHealthIssues.value) {
    if (issue.status === 'dangling') statusMap[issue.label] = 'dangling';
    if (issue.status === 'conflict') statusMap[issue.label] = 'conflict';
  }

  return statusMap;
});

const findResolvedWikilinkReference = (target: string): DocumentReference | undefined => (
  outboundReferences.value.find((ref) =>
    ref.relationType === 'WIKILINK' &&
    Boolean(ref.targetDocId) &&
    (
      ref.wikilinkTarget === target ||
      ref.sectionId === `wikilink:${target}` ||
      ref.targetLabel === target ||
      ref.targetDoc?.number === target ||
      ref.targetDoc?.doc_code === target ||
      ref.targetDoc?.title === target
    ),
  )
);
```

Near `handleReferenceHealthIssue`, add:

```ts
const handleMarkdownWikilinkClick = (target: string) => {
  const normalizedTarget = target.trim();
  if (!normalizedTarget) return;

  const resolved = findResolvedWikilinkReference(normalizedTarget);
  if (resolved?.targetDocId) {
    router.push(`/documents/${resolved.targetDocId}`);
    return;
  }

  const dangling = referenceHealthIssues.value.find(
    (issue) => issue.status === 'dangling' && issue.label === normalizedTarget,
  );
  if (dangling) {
    handleReferenceHealthIssue(dangling);
    ElMessage.warning('引用未解析，请在引用关系中处理。');
    return;
  }

  const conflict = referenceHealthIssues.value.find(
    (issue) => issue.status === 'conflict' && issue.label === normalizedTarget,
  );
  if (conflict) {
    handleReferenceHealthIssue(conflict);
    ElMessage.warning('引用存在多个候选，请选择正确目标。');
    return;
  }

  ElMessage.warning('未找到该引用的解析结果，请保存正文后刷新引用关系。');
};
```

- [ ] **Step 6: Run DocumentDetail tests**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-markdown-wikilink-click-navigation/client
npm run test -- DocumentDetail.spec.ts
```

Expected: PASS for `DocumentDetail.spec.ts`.

- [ ] **Step 7: Commit document detail behavior**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-markdown-wikilink-click-navigation
git add client/src/api/document-control.ts client/src/views/documents/DocumentDetail.vue client/src/views/documents/__tests__/DocumentDetail.spec.ts
git commit -m "feat: navigate document markdown wikilinks"
```

---

### Task 6: Final Verification

**Files:**
- Verify all files changed in previous tasks.

- [ ] **Step 1: Run targeted backend tests**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-markdown-wikilink-click-navigation/server
npm test -- markdown-wikilink.service.spec.ts --runInBand
```

Expected: PASS.

- [ ] **Step 2: Run targeted frontend tests**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-markdown-wikilink-click-navigation/client
npm run test -- MarkdownViewer.spec.ts DocumentDetail.spec.ts
```

Expected: PASS.

- [ ] **Step 3: Run frontend build check**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-markdown-wikilink-click-navigation/client
npm run build:check
```

Expected: `vue-tsc` and `vite build` complete successfully.

- [ ] **Step 4: Inspect migration and generated Prisma type state**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-markdown-wikilink-click-navigation
rg -n "wikilinkTarget" server/src/prisma/schema.prisma server/src/prisma/migrations/20260428000000_add_document_reference_wikilink_target/migration.sql server/src/modules/document/services/markdown-wikilink.service.ts client/src
```

Expected: output shows schema, migration, backend sync, frontend API type, renderer, viewer, and detail page references.

- [ ] **Step 5: Confirm working tree is clean except intended commits**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-markdown-wikilink-click-navigation
git status --short
git log --oneline --decorate -6
```

Expected: no unstaged or staged files. Recent commits include the schema, backend sync, renderer/viewer, and detail navigation commits.

---

## Self-Review

Spec coverage:

- Resolved wikilink navigation is implemented in Task 5.
- Dangling/conflict click handling and warnings are implemented in Task 5.
- `DocumentReference.wikilinkTarget` schema, migration, backfill, and backend persistence are implemented in Tasks 1 and 2.
- Visible resolved/dangling/conflict/unknown styles are implemented in Tasks 3 and 4.
- Alias `[[target|label]]` uses the target, not display label, in Tasks 2 and 5.
- Code block protection remains in Task 3 because `enhanceWikilinks()` still guards `<code>...</code>`.
- Tests and build verification are covered in Tasks 2, 4, 5, and 6.

Risk notes:

- `DocumentDetail.vue` already has a local `DocumentReference` interface separate from `client/src/api/document-control.ts`; update both so TypeScript and runtime assumptions stay aligned.
- Migration uses PostgreSQL quoted column names because Prisma maps camelCase fields directly unless `@map` is used.
- `wikilinkStatusByTarget` only marks resolved WIKILINK references with `targetDocId`; generic document references should not color Markdown wikilinks as resolved.
