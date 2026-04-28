# Markdown Wikilink Click Navigation Design

## 背景

Markdown 正文已经可以正常渲染，`[[...]]` 也会显示为 wikilink 样式。当前问题是：wikilink 只是一个带 `data-target` 的静态 `span`，不能像 Obsidian 一样点击跳转。

本设计只补“点击 wikilink 后如何处理”。不重新设计 Markdown 渲染器，不改变文档保存逻辑，不引入图谱或新建文件流程。

## 目标

点击 Markdown 正文中的 `[[引用]]` 时：

- 如果引用唯一解析到目标文件，直接跳转到目标文档详情页。
- 如果引用未解析，不跳转，提示用户并定位到引用问题区。
- 如果引用冲突，不跳转，提示用户并展开候选列表。
- `DocumentReference` 明确保存原始 `wikilinkTarget`，前端不再依赖 `sectionId` 字符串拆解。
- 未解析和冲突 wikilink 在正文里有可见差异，用户不用点击也能看出问题。

## 非目标

- 不做 Obsidian 式“点击未解析链接即新建文件”。
- 不在点击时重新扫描全文或重新解析 Markdown。
- 不允许绕过文控编号、状态、审批、负责部门等受控文件规则创建文件。
- 不支持本次实现 `[[文档#标题]]` 段落锚点跳转。
- 不支持 `![[嵌入内容]]` 嵌入块。
- 不做 hover 预览或 hover 状态浮层。

## 设计原则

### 渲染层不懂业务

`MarkdownViewer.vue` 只负责：

- 展示 `renderMarkdown(content)` 生成的安全 HTML。
- 监听用户点击 `.wikilink`。
- 把点击到的 `data-target` 作为事件向外抛出。

它不负责：

- 查询文档。
- 判断引用是否健康。
- 直接处理冲突候选。
- 直接依赖 `DocumentReference` 结构。

### 页面层负责文控语义

`DocumentDetail.vue` 负责根据当前文档已经加载到的数据判断点击结果：

- `sourceReferences`
- `referenceHealth`
- `referenceHealthIssues`
- `outboundReferences`
- `unresolvedWikilinks`
- `conflictWikilinks`

这样可以复用现有引用健康逻辑，不在前端新增第二套解析规则。

### 原始引用目标是强字段

后端同步 wikilink 时必须把 `[[目标]]` 或 `[[目标|显示名]]` 里的 `目标` 保存到 `DocumentReference.wikilinkTarget`。

这样前端可以直接按字段匹配：

```ts
ref.wikilinkTarget === clickedTarget
```

不再把 `sectionId = wikilink:<target>` 当成主要匹配依据。`sectionId` 可以继续保留用于兼容旧数据。

## 用户交互

### 已解析引用

用户点击：

```markdown
[[GRSS-CX-01]]
[[文件控制程序]]
[[GRSS-CX-01|文件控制程序]]
```

如果当前文档的 `sourceReferences` 中存在：

- `relationType === 'WIKILINK'`
- `targetDocId` 存在
- `targetDoc.id` 或 `targetDocId` 可用
- 引用文本匹配当前点击的 `data-target`

则跳转到：

```text
/documents/<targetDocId>
```

### 未解析引用

如果点击目标命中 `unresolvedWikilinks` 或 `referenceHealthIssues.status === 'dangling'`：

- 不跳转。
- 显示提示：`引用未解析，请在引用关系中处理。`
- 设置 `activeReferenceLabel`。
- 滚动到 Markdown/引用关系区域。
- 正文中的该 wikilink 使用 unresolved 样式，例如红色虚线下划线。

### 冲突引用

如果点击目标命中 `conflictWikilinks` 或 `referenceHealthIssues.status === 'conflict'`：

- 不跳转。
- 显示提示：`引用存在多个候选，请选择正确目标。`
- 设置 `expandedConflictReferenceId`。
- 滚动到引用关系区域。
- 正文中的该 wikilink 使用 conflict 样式，例如黄色背景或黄色下划线。

## 数据模型

### DocumentReference

新增字段：

```prisma
model DocumentReference {
  // existing fields...
  wikilinkTarget String?

  @@index([wikilinkTarget])
}
```

字段含义：

- 对于 `[[GRSS-CX-01]]`，`wikilinkTarget = "GRSS-CX-01"`。
- 对于 `[[GRSS-CX-01|文件控制程序]]`，`wikilinkTarget = "GRSS-CX-01"`。
- 对于非 wikilink 引用，`wikilinkTarget = null`。

迁移要求：

- 新增 nullable 字段，不阻塞旧数据读取。
- 对旧的 `relationType = 'WIKILINK'` 且 `sectionId` 形如 `wikilink:<target>` 的数据，可在 migration 中回填 `wikilinkTarget`。
- 不能只改 Prisma schema，必须补 migration。

后端同步要求：

- `MarkdownWikilinkService.extractWikilinks()` 继续返回去重后的目标文本。
- `syncDocumentWikilinks()` 创建 `DocumentReference` 时写入 `wikilinkTarget: label`。
- 已解析、未解析、冲突三类引用都必须写入 `wikilinkTarget`。

## 组件接口

### markdown-renderer.ts

`renderMarkdown()` 需要支持按引用状态输出 class。推荐新增可选参数：

```ts
export type WikilinkStatus = 'resolved' | 'dangling' | 'conflict' | 'unknown';

export interface RenderMarkdownOptions {
  wikilinkStatusByTarget?: Record<string, WikilinkStatus>;
}

export const renderMarkdown = (content: string, options: RenderMarkdownOptions = {}) => {
  // existing rendering pipeline
};
```

`enhanceWikilinks()` 输出：

```html
<span class="wikilink wikilink-resolved" data-target="GRSS-CX-01">GRSS-CX-01</span>
<span class="wikilink wikilink-dangling" data-target="缺失文件">缺失文件</span>
<span class="wikilink wikilink-conflict" data-target="重复文件">重复文件</span>
```

状态缺省时使用 `wikilink-unknown`，保持可点击但不误报为正常。

### MarkdownViewer.vue

新增 props：

```ts
const props = defineProps<{
  content: string;
  wikilinkStatusByTarget?: Record<string, WikilinkStatus>;
}>();
```

新增 emit：

```ts
const emit = defineEmits<{
  (event: 'wikilink-click', target: string): void;
}>();
```

点击处理：

```ts
const handleClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement | null;
  const link = target?.closest?.('.wikilink') as HTMLElement | null;
  const wikilinkTarget = link?.dataset?.target;
  if (!wikilinkTarget) return;
  emit('wikilink-click', wikilinkTarget);
};
```

模板变为：

```vue
<article class="markdown-viewer" v-html="html" @click="handleClick" />
```

### DocumentDetail.vue

`MarkdownViewer` 使用：

```vue
<MarkdownViewer
  v-else
  :content="document.content_md"
  :wikilink-status-by-target="wikilinkStatusByTarget"
  @wikilink-click="handleMarkdownWikilinkClick"
/>
```

新增方法：

```ts
const handleMarkdownWikilinkClick = (target: string) => {
  const normalizedTarget = target.trim();
  const resolved = outboundReferences.value.find((ref) =>
    ref.targetDocId &&
    (
      ref.wikilinkTarget === normalizedTarget ||
      ref.sectionId === `wikilink:${normalizedTarget}` ||
      ref.targetLabel === normalizedTarget ||
      ref.targetDoc?.number === normalizedTarget ||
      ref.targetDoc?.doc_code === normalizedTarget ||
      ref.targetDoc?.title === normalizedTarget
    ),
  );

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

实际实现可以把匹配逻辑拆成 `findResolvedWikilinkReference(target)`，避免 `DocumentDetail.vue` 继续变长。

`wikilinkStatusByTarget` 由当前引用健康数据派生：

```ts
const wikilinkStatusByTarget = computed(() => {
  const statusMap: Record<string, WikilinkStatus> = {};

  for (const ref of outboundReferences.value) {
    const legacyTarget = ref.sectionId?.startsWith('wikilink:')
      ? ref.sectionId.slice('wikilink:'.length)
      : null;
    const target = ref.wikilinkTarget || legacyTarget;
    if (target) statusMap[target] = 'resolved';
  }
  for (const issue of referenceHealthIssues.value) {
    if (issue.status === 'dangling') statusMap[issue.label] = 'dangling';
    if (issue.status === 'conflict') statusMap[issue.label] = 'conflict';
  }

  return statusMap;
});
```

## 数据匹配规则

点击目标来自 `data-target`，即：

```markdown
[[目标]]
[[目标|显示名]]
```

其中：

- `[[目标]]` 的点击 target 是 `目标`。
- `[[目标|显示名]]` 的点击 target 仍是 `目标`，不是 `显示名`。

匹配优先级：

1. `DocumentReference.wikilinkTarget === target`
2. `DocumentReference.sectionId === wikilink:<target>`，仅兼容旧数据
3. `DocumentReference.targetLabel === target`
4. `targetDoc.number === target`
5. `targetDoc.doc_code === target`
6. `targetDoc.title === target`

新数据必须有 `wikilinkTarget`。`sectionId` 只能作为旧数据兜底，不应成为长期主路径。

## 正文样式

基础样式：

```css
.wikilink {
  cursor: pointer;
}
```

状态样式：

```css
.wikilink-resolved {
  background: #eef6ff;
  color: #1677d2;
}

.wikilink-dangling {
  background: #fff2f0;
  color: #cf1322;
  text-decoration: underline dotted;
}

.wikilink-conflict {
  background: #fff7e6;
  color: #ad6800;
  text-decoration: underline wavy;
}

.wikilink-unknown {
  background: #f5f7fa;
  color: #606266;
  text-decoration: underline dotted;
}
```

样式只表达引用健康状态，不改变点击规则。

## 错误与边界

- 点击代码块内的 `[[...]]` 不应触发，因为 renderer 已保护 code block，不会生成 `.wikilink`。
- 点击普通 Markdown 链接 `<a>` 不受影响。
- 当前文档自己引用自己时，后端同步逻辑会跳过，不应跳转。
- 如果引用刚刚编辑但尚未保存，前端没有新的 `DocumentReference`，应提示保存后刷新。
- 如果 `referenceHealth` 加载失败，wikilink 点击仍可以尝试 resolved 跳转；未解析和冲突提示退化为通用提示。
- 旧数据没有 `wikilinkTarget` 时，前端可以用 `sectionId` 兼容一次，但新保存后的引用必须写入 `wikilinkTarget`。

## 测试计划

### MarkdownViewer.spec.ts

新增测试：

- 点击 `.wikilink` 会 emit `wikilink-click`，payload 为 `data-target`。
- 点击普通文本不会 emit。
- inline code 和 fenced code block 中的 `[[...]]` 不会生成 `.wikilink`，因此不会 emit。
- 根据 `wikilinkStatusByTarget` 给 wikilink 加上 `wikilink-resolved`、`wikilink-dangling`、`wikilink-conflict`。

### DocumentDetail.spec.ts

新增测试：

- resolved wikilink 点击后调用 `router.push('/documents/<targetDocId>')`。
- dangling wikilink 点击后不跳转，设置 `activeReferenceLabel`，显示 warning。
- conflict wikilink 点击后不跳转，设置 `expandedConflictReferenceId`，显示 warning。
- alias wikilink `[[GRSS-CX-01|文件控制程序]]` 点击时按 `GRSS-CX-01` 匹配，而不是按显示名匹配。
- 传给 `MarkdownViewer` 的 `wikilinkStatusByTarget` 能区分 resolved、dangling、conflict。

### 后端测试

更新 `MarkdownWikilinkService.spec.ts`：

- 已解析 wikilink 创建 `DocumentReference.wikilinkTarget`。
- 未解析 wikilink 创建 `DocumentReference.wikilinkTarget`。
- 冲突 wikilink 创建 `DocumentReference.wikilinkTarget`。
- alias wikilink 保存 target，不保存显示名。

增加 migration 验证：

- 新 migration 包含 `wikilinkTarget` 字段。
- 旧 `sectionId = wikilink:<target>` 数据可回填 `wikilinkTarget`。

## 验收标准

- Markdown 正文中的已解析 wikilink 可以点击进入目标文档。
- 未解析 wikilink 点击不会跳错页面，会提示并定位到引用问题。
- 冲突 wikilink 点击不会跳错页面，会提示并展开候选。
- 未解析和冲突 wikilink 在正文里有不同样式。
- 新保存的 wikilink 引用记录有 `DocumentReference.wikilinkTarget`。
- 前端优先使用 `wikilinkTarget` 匹配点击目标，`sectionId` 只作旧数据兼容。
- Markdown 渲染安全边界保持不变：HTML 仍禁用，代码块内 wikilink 不被转换。
- Prisma schema 和 migration 同步。
- `npm run test -- MarkdownViewer DocumentDetail` 通过。
- `npm test -- markdown-wikilink.service.spec.ts` 通过。
- `npm run build:check` 通过。

## 后续可选增强

- 支持 `[[文档#标题]]` 锚点。
- 在 hover 时显示引用健康状态。
