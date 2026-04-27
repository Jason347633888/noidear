# Markdown Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the document Markdown body preview so it renders common Markdown and Obsidian-like reading-mode syntax instead of showing raw Markdown markers.

**Architecture:** Keep the existing `DocumentDetail.vue -> MarkdownViewer.vue` data flow. Move parsing/rendering into a focused `markdown-renderer.ts` helper, use `markdown-it` for core Markdown, and apply small controlled post-processors for project-specific Obsidian-like features: frontmatter hiding, callouts, task lists, and wikilinks.

**Tech Stack:** Vue 3, TypeScript, Vitest, `@vue/test-utils`, `markdown-it`, `@types/markdown-it`, Element Plus card layout.

---

## File Structure

- Modify: `client/package.json`
  - Add runtime dependency `markdown-it`.
  - Add dev dependency `@types/markdown-it`.
- Modify: `client/package-lock.json`
  - Let `npm install` update this lockfile.
- Create: `client/src/components/documents/markdown-renderer.ts`
  - Owns Markdown string normalization and rendering.
  - Exports `renderMarkdown(content: string): string` for Vue components.
  - Keeps frontmatter, callout, task list, and wikilink logic out of page components.
- Modify: `client/src/components/documents/MarkdownViewer.vue`
  - Keeps the component as a thin rendering shell.
  - Imports `renderMarkdown`.
  - Owns Obsidian-like reading-mode CSS scoped to `.markdown-viewer`.
- Modify: `client/src/components/documents/MarkdownViewer.spec.ts`
  - Verifies frontmatter hiding, regular Markdown rendering, callout rendering, task lists, wikilink alias behavior, and raw HTML safety.

## Scope Notes

- Do not change `DocumentDetail.vue`.
- Do not change backend `content_md` storage or APIs.
- Do not implement uploaded `.md` file preview.
- Do not implement Obsidian Dataview, Canvas, embedded blocks, graph view, backlinks panel, or `[[doc#heading]]` heading anchors.

---

### Task 1: Add Markdown Dependencies

**Files:**
- Modify: `client/package.json`
- Modify: `client/package-lock.json`

- [ ] **Step 1: Install runtime and type dependencies**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client
npm install markdown-it@^14.1.1
npm install --save-dev @types/markdown-it@^14.1.2
```

Expected:

```text
added packages for markdown-it and @types/markdown-it
found 0 vulnerabilities
```

If npm reports existing vulnerabilities from unrelated packages, do not fix them in this task. Record the output in the task notes and continue.

- [ ] **Step 2: Verify package files changed only for dependencies**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git diff -- client/package.json client/package-lock.json
```

Expected: `client/package.json` includes:

```json
"dependencies": {
  "markdown-it": "^14.1.1"
}
```

Expected: `client/package.json` includes:

```json
"devDependencies": {
  "@types/markdown-it": "^14.1.2"
}
```

The exact ordering may differ because npm sorts and preserves the existing JSON shape.

- [ ] **Step 3: Run the existing MarkdownViewer test before behavior changes**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client
npm run test -- MarkdownViewer
```

Expected:

```text
PASS  src/components/documents/MarkdownViewer.spec.ts
```

- [ ] **Step 4: Commit dependency changes**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git add client/package.json client/package-lock.json
git commit -m "chore: add markdown rendering dependencies"
```

Expected:

```text
[master abc1234] chore: add markdown rendering dependencies
```

---

### Task 2: Add Obsidian-Like Rendering Tests And Helper

**Files:**
- Create: `client/src/components/documents/markdown-renderer.ts`
- Modify: `client/src/components/documents/MarkdownViewer.vue`
- Modify: `client/src/components/documents/MarkdownViewer.spec.ts`

- [ ] **Step 1: Replace MarkdownViewer tests with spec coverage**

Replace `client/src/components/documents/MarkdownViewer.spec.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import MarkdownViewer from './MarkdownViewer.vue';

const mountMarkdown = (content: string) => mount(MarkdownViewer, { props: { content } });

describe('MarkdownViewer', () => {
  it('renders Obsidian-like Markdown while hiding document frontmatter', () => {
    const wrapper = mountMarkdown(`---
title: "关键岗位负责人缺席代理制度"
tags:
- 当前公司
- 三级文件
---

# 关键岗位负责人缺席代理制度

> [!info] 文件信息
> 编号：[[GRSS-XZ-ZD-02|关键岗位制度]]

---

- 普通条目
- [ ] 待处理
- [x] 已完成

| 字段 | 值 |
| --- | --- |
| 编号 | GRSS-XZ-ZD-02 |

\`\`\`ts
const status = 'ok';
\`\`\`

这是 **粗体**、*斜体*、~~删除线~~、\`行内代码\` 和 [官网](https://example.com)。
`);

    expect(wrapper.text()).not.toContain('title:');
    expect(wrapper.text()).not.toContain('tags:');
    expect(wrapper.find('h1').text()).toBe('关键岗位负责人缺席代理制度');
    expect(wrapper.find('.callout.callout-info').exists()).toBe(true);
    expect(wrapper.find('.callout-title').text()).toContain('文件信息');
    expect(wrapper.find('.wikilink').text()).toBe('关键岗位制度');
    expect(wrapper.find('.wikilink').attributes('data-target')).toBe('GRSS-XZ-ZD-02');
    expect(wrapper.findAll('hr')).toHaveLength(1);
    expect(wrapper.findAll('li').some(item => item.text().includes('普通条目'))).toBe(true);
    expect(wrapper.findAll('.task-list-item')).toHaveLength(2);
    expect(wrapper.find('table').exists()).toBe(true);
    expect(wrapper.find('thead').text()).toContain('字段');
    expect(wrapper.find('tbody').text()).toContain('GRSS-XZ-ZD-02');
    expect(wrapper.find('pre code').text()).toContain("const status = 'ok';");
    expect(wrapper.find('strong').text()).toBe('粗体');
    expect(wrapper.find('em').text()).toBe('斜体');
    expect(wrapper.find('s').text()).toBe('删除线');
    expect(wrapper.find('p code').text()).toBe('行内代码');
    expect(wrapper.find('a').attributes('href')).toBe('https://example.com');
  });

  it('does not treat middle-of-document horizontal rules as frontmatter', () => {
    const wrapper = mountMarkdown(`# 标题

第一段

---

第二段`);

    expect(wrapper.find('h1').text()).toBe('标题');
    expect(wrapper.findAll('hr')).toHaveLength(1);
    expect(wrapper.text()).toContain('第一段');
    expect(wrapper.text()).toContain('第二段');
  });

  it('does not insert raw HTML from Markdown input', () => {
    const wrapper = mountMarkdown(`# 安全测试

<script>alert('xss')</script>

<img src=x onerror=alert('xss')>`);

    expect(wrapper.find('script').exists()).toBe(false);
    expect(wrapper.find('img').exists()).toBe(false);
    expect(wrapper.html()).toContain('&lt;script&gt;');
    expect(wrapper.html()).toContain('&lt;img');
  });

  it('renders unknown callout types with the note fallback style', () => {
    const wrapper = mountMarkdown(`> [!custom] 自定义提示
> 正文`);

    expect(wrapper.find('.callout.callout-note').exists()).toBe(true);
    expect(wrapper.find('.callout-title').text()).toContain('自定义提示');
    expect(wrapper.find('.callout-content').text()).toContain('正文');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails before implementation**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client
npm run test -- MarkdownViewer
```

Expected: FAIL. The current hand-written renderer does not remove frontmatter, does not render callouts, tables, task list checkboxes, or most inline Markdown.

- [ ] **Step 3: Create the Markdown renderer helper**

Create `client/src/components/documents/markdown-renderer.ts` with:

```ts
import MarkdownIt from 'markdown-it';

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: false,
  typographer: false,
});

const CALLOUT_TYPES = new Set(['note', 'info', 'tip', 'warning', 'danger']);

const escapeAttribute = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

export const stripFrontmatter = (content: string) => {
  const normalized = content.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');

  if (lines[0]?.trim() !== '---') {
    return normalized;
  }

  const closingIndex = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
  if (closingIndex === -1) {
    return normalized;
  }

  return lines.slice(closingIndex + 1).join('\n').replace(/^\n/, '');
};

const enhanceTaskLists = (html: string) =>
  html
    .replace(
      /<li>\[ \]\s+/g,
      '<li class="task-list-item"><input class="task-list-item-checkbox" type="checkbox" disabled> ',
    )
    .replace(
      /<li>\[[xX]\]\s+/g,
      '<li class="task-list-item"><input class="task-list-item-checkbox" type="checkbox" checked disabled> ',
    )
    .replace(
      /<li><p>\[ \]\s+/g,
      '<li class="task-list-item"><p><input class="task-list-item-checkbox" type="checkbox" disabled> ',
    )
    .replace(
      /<li><p>\[[xX]\]\s+/g,
      '<li class="task-list-item"><p><input class="task-list-item-checkbox" type="checkbox" checked disabled> ',
    );

const enhanceWikilinks = (html: string) =>
  html.replace(/\[\[([^\]|<]+?)(?:\|([^\]<]+?))?\]\]/g, (_match, rawTarget: string, rawLabel?: string) => {
    const target = rawTarget.trim();
    const label = (rawLabel || rawTarget).trim();
    return `<span class="wikilink" data-target="${escapeAttribute(target)}">${label}</span>`;
  });

const enhanceCallouts = (html: string) =>
  html.replace(
    /<blockquote>\s*<p>\[!([a-zA-Z][\w-]*)\]\s*([^<\n]*)(?:<br>\s*|\n)?([\s\S]*?)<\/p>\s*<\/blockquote>/g,
    (_match, rawType: string, rawTitle: string, rawBody: string) => {
      const requestedType = rawType.toLowerCase();
      const type = CALLOUT_TYPES.has(requestedType) ? requestedType : 'note';
      const title = rawTitle.trim() || requestedType;
      const body = rawBody.trim();
      const content = body ? `<div class="callout-content">${body}</div>` : '';

      return [
        `<div class="callout callout-${escapeAttribute(type)}" data-callout="${escapeAttribute(type)}">`,
        `<div class="callout-title">${title}</div>`,
        content,
        '</div>',
      ].join('');
    },
  );

export const renderMarkdown = (content: string) => {
  const withoutFrontmatter = stripFrontmatter(content);
  const rendered = markdown.render(withoutFrontmatter);

  return enhanceWikilinks(enhanceTaskLists(enhanceCallouts(rendered)));
};
```

- [ ] **Step 4: Update MarkdownViewer to use the helper**

Replace `client/src/components/documents/MarkdownViewer.vue` with:

```vue
<template>
  <article class="markdown-viewer" v-html="html" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { renderMarkdown } from './markdown-renderer';

const props = defineProps<{ content: string }>();

const html = computed(() => renderMarkdown(props.content));
</script>

<style scoped>
.markdown-viewer {
  color: #303133;
  font-size: 15px;
  line-height: 1.75;
  overflow-wrap: break-word;
}

.markdown-viewer :deep(:first-child) {
  margin-top: 0;
}

.markdown-viewer :deep(:last-child) {
  margin-bottom: 0;
}

.markdown-viewer :deep(h1),
.markdown-viewer :deep(h2),
.markdown-viewer :deep(h3),
.markdown-viewer :deep(h4),
.markdown-viewer :deep(h5),
.markdown-viewer :deep(h6) {
  color: #1f2937;
  font-weight: 700;
  line-height: 1.35;
  margin: 1.25em 0 0.55em;
}

.markdown-viewer :deep(h1) {
  font-size: 30px;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 8px;
}

.markdown-viewer :deep(h2) {
  font-size: 24px;
}

.markdown-viewer :deep(h3) {
  font-size: 20px;
}

.markdown-viewer :deep(p) {
  margin: 0.7em 0;
}

.markdown-viewer :deep(ul),
.markdown-viewer :deep(ol) {
  margin: 0.7em 0;
  padding-left: 1.6em;
}

.markdown-viewer :deep(li) {
  margin: 0.28em 0;
}

.markdown-viewer :deep(hr) {
  border: none;
  border-top: 1px solid #dcdfe6;
  margin: 20px 0;
}

.markdown-viewer :deep(blockquote) {
  border-left: 4px solid #d0d7de;
  color: #59636e;
  margin: 1em 0;
  padding: 0.2em 0 0.2em 1em;
}

.markdown-viewer :deep(table) {
  border-collapse: collapse;
  display: block;
  margin: 1em 0;
  max-width: 100%;
  overflow-x: auto;
  width: max-content;
}

.markdown-viewer :deep(th),
.markdown-viewer :deep(td) {
  border: 1px solid #dcdfe6;
  padding: 8px 10px;
  vertical-align: top;
}

.markdown-viewer :deep(th) {
  background: #f5f7fa;
  font-weight: 600;
}

.markdown-viewer :deep(pre) {
  background: #f6f8fa;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  margin: 1em 0;
  overflow-x: auto;
  padding: 12px 14px;
}

.markdown-viewer :deep(code) {
  background: #f6f8fa;
  border-radius: 4px;
  color: #24292f;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 0.92em;
  padding: 0.15em 0.35em;
}

.markdown-viewer :deep(pre code) {
  background: transparent;
  border-radius: 0;
  padding: 0;
}

.markdown-viewer :deep(a) {
  color: #1677d2;
  text-decoration: none;
}

.markdown-viewer :deep(a:hover) {
  text-decoration: underline;
}

.markdown-viewer :deep(.task-list-item) {
  list-style: none;
  margin-left: -1.2em;
}

.markdown-viewer :deep(.task-list-item-checkbox) {
  margin-right: 0.5em;
  vertical-align: -0.12em;
}

.markdown-viewer :deep(.callout) {
  background: #f6f8fa;
  border-left: 4px solid #8c959f;
  border-radius: 6px;
  margin: 1em 0;
  padding: 10px 12px;
}

.markdown-viewer :deep(.callout-title) {
  color: #24292f;
  font-weight: 700;
  margin-bottom: 4px;
}

.markdown-viewer :deep(.callout-content) {
  color: #4b5563;
}

.markdown-viewer :deep(.callout-info),
.markdown-viewer :deep(.callout-note) {
  background: #eff6ff;
  border-left-color: #409eff;
}

.markdown-viewer :deep(.callout-tip) {
  background: #f0fdf4;
  border-left-color: #67c23a;
}

.markdown-viewer :deep(.callout-warning) {
  background: #fffbeb;
  border-left-color: #e6a23c;
}

.markdown-viewer :deep(.callout-danger) {
  background: #fef2f2;
  border-left-color: #f56c6c;
}

.markdown-viewer :deep(.wikilink) {
  background: #eef6ff;
  border-radius: 4px;
  color: #1677d2;
  font-weight: 600;
  padding: 0 3px;
}
</style>
```

- [ ] **Step 5: Run the MarkdownViewer tests**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client
npm run test -- MarkdownViewer
```

Expected:

```text
PASS  src/components/documents/MarkdownViewer.spec.ts
```

- [ ] **Step 6: Commit renderer implementation**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git add client/src/components/documents/markdown-renderer.ts client/src/components/documents/MarkdownViewer.vue client/src/components/documents/MarkdownViewer.spec.ts
git commit -m "feat: render markdown body with obsidian-like syntax"
```

Expected:

```text
[master abc1234] feat: render markdown body with obsidian-like syntax
```

---

### Task 3: Typecheck And Build Verification

**Files:**
- Verify: `client/src/components/documents/markdown-renderer.ts`
- Verify: `client/src/components/documents/MarkdownViewer.vue`
- Verify: `client/package.json`
- Verify: `client/package-lock.json`

- [ ] **Step 1: Run the targeted test again**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client
npm run test -- MarkdownViewer
```

Expected:

```text
PASS  src/components/documents/MarkdownViewer.spec.ts
```

- [ ] **Step 2: Run client typecheck and production build**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client
npm run build:check
```

Expected:

```text
vue-tsc && vite build
✓ built in 1s or longer
```

- [ ] **Step 3: Confirm no build-only changes are pending**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git status --short client/src/components/documents/markdown-renderer.ts client/src/components/documents/MarkdownViewer.vue
```

Expected:

```text
```

There should be no output because Task 2 already committed the implementation files.

---

### Task 4: Browser Acceptance Check

**Files:**
- Verify: `client/src/components/documents/MarkdownViewer.vue`
- Verify: `client/src/components/documents/markdown-renderer.ts`
- Verify: `client/src/views/documents/DocumentDetail.vue`

- [ ] **Step 1: Start the frontend dev server**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client
npm run dev -- --host 127.0.0.1
```

Expected:

```text
Local:   http://127.0.0.1:5173/
```

Keep this process running for the browser check. If port `5173` is occupied, Vite will print the next available port. Use the printed local URL.

- [ ] **Step 2: Open a document detail page with Markdown body**

In the browser, open the local app and navigate to a document detail page whose `Markdown 正文` resembles:

```markdown
---
title: "关键岗位负责人缺席代理制度"
tags:
- 当前公司
- 三级文件
---

# 关键岗位负责人缺席代理制度

> [!info] 文件信息
> 编号：[[GRSS-XZ-ZD-02|关键岗位制度]]

---

1. 目的

- [ ] 待处理
- [x] 已完成

| 字段 | 值 |
| --- | --- |
| 编号 | GRSS-XZ-ZD-02 |
```

Expected visual result:

```text
frontmatter is hidden
the title is rendered as a large heading
the callout has a colored left border and highlighted title
the horizontal rule is a line, not raw ---
task list rows show disabled checkboxes
the table has borders and does not overflow the card
the wikilink displays 关键岗位制度
```

- [ ] **Step 3: Check Markdown edit preview consistency**

If the document is editable, click `编辑正文`.

Expected:

```text
the right-side live preview uses the same rendered style as the read-only Markdown 正文 card
frontmatter remains hidden in preview
callouts, task lists, tables, and wikilinks render the same way
```

- [ ] **Step 4: Stop the dev server**

Stop the Vite process with `Ctrl+C`.

Expected:

```text
the terminal returns to the shell prompt
```

- [ ] **Step 5: Record browser acceptance result in final task notes**

Use this note format in the implementation handoff or PR:

```text
Browser acceptance: PASS
URL tested: http://127.0.0.1:5173/documents/doc-1
Markdown sample: 关键岗位负责人缺席代理制度
Checked: frontmatter hidden, callout rendered, task list rendered, table contained, editor preview consistent
```

---

## Final Verification

- [ ] **Step 1: Check git status**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git status --short
```

Expected: only unrelated pre-existing untracked files may remain. There should be no unstaged changes in:

```text
client/package.json
client/package-lock.json
client/src/components/documents/MarkdownViewer.vue
client/src/components/documents/MarkdownViewer.spec.ts
client/src/components/documents/markdown-renderer.ts
```

- [ ] **Step 2: Run final verification commands**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client
npm run test -- MarkdownViewer
npm run build:check
```

Expected:

```text
PASS  src/components/documents/MarkdownViewer.spec.ts
vue-tsc && vite build
✓ built in 1s or longer
```

---

## Self-Review Checklist

- Spec coverage: Tasks 1-2 cover `markdown-it`, frontmatter, core Markdown, task lists, callouts, wikilinks, and raw HTML safety. Task 4 covers browser visual acceptance and editor/read-only consistency.
- Scope control: No task changes backend APIs, document storage, uploaded `.md` preview, DocumentDetail data flow, or Obsidian plugin features.
- Type consistency: The helper exports `renderMarkdown(content: string): string`; `MarkdownViewer.vue` imports and uses that exact function.
- Test consistency: The Vitest file verifies the same class names that the helper and CSS produce: `.callout-info`, `.callout-title`, `.callout-content`, `.task-list-item`, `.wikilink[data-target]`.
