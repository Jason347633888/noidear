# Markdown Wikilink Click Navigation Design

## 背景

Markdown 正文已经可以正常渲染，`[[...]]` 也会显示为 wikilink 样式。当前问题是：wikilink 只是一个带 `data-target` 的静态 `span`，不能像 Obsidian 一样点击跳转。

本设计只补“点击 wikilink 后如何处理”。不重新设计 Markdown 渲染器，不改变文档保存逻辑，不引入图谱或新建文件流程。

## 目标

点击 Markdown 正文中的 `[[引用]]` 时：

- 如果引用唯一解析到目标文件，直接跳转到目标文档详情页。
- 如果引用未解析，不跳转，提示用户并定位到引用问题区。
- 如果引用冲突，不跳转，提示用户并展开候选列表。

## 非目标

- 不做 Obsidian 式“点击未解析链接即新建文件”。
- 不在点击时重新扫描全文或重新解析 Markdown。
- 不允许绕过文控编号、状态、审批、负责部门等受控文件规则创建文件。
- 不支持本次实现 `[[文档#标题]]` 段落锚点跳转。
- 不支持 `![[嵌入内容]]` 嵌入块。

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

### 冲突引用

如果点击目标命中 `conflictWikilinks` 或 `referenceHealthIssues.status === 'conflict'`：

- 不跳转。
- 显示提示：`引用存在多个候选，请选择正确目标。`
- 设置 `expandedConflictReferenceId`。
- 滚动到引用关系区域。

## 组件接口

### MarkdownViewer.vue

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
  @wikilink-click="handleMarkdownWikilinkClick"
/>
```

新增方法：

```ts
const handleMarkdownWikilinkClick = (target: string) => {
  const normalizedTarget = target.trim();
  const resolved = outboundReferences.value.find((ref) =>
    ref.targetDocId &&
    [ref.targetLabel, ref.targetDoc?.title, ref.targetDoc?.number, ref.targetDoc?.doc_code]
      .filter(Boolean)
      .includes(normalizedTarget),
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

1. `DocumentReference.sectionId === wikilink:<target>`
2. `DocumentReference.targetLabel === target`
3. `targetDoc.number === target`
4. `targetDoc.doc_code === target`
5. `targetDoc.title === target`

如果未来后端给 `DocumentReference` 增加更明确的 `sourceLabel` 或 `wikilinkTarget` 字段，前端应优先使用该字段。

## 错误与边界

- 点击代码块内的 `[[...]]` 不应触发，因为 renderer 已保护 code block，不会生成 `.wikilink`。
- 点击普通 Markdown 链接 `<a>` 不受影响。
- 当前文档自己引用自己时，后端同步逻辑会跳过，不应跳转。
- 如果引用刚刚编辑但尚未保存，前端没有新的 `DocumentReference`，应提示保存后刷新。
- 如果 `referenceHealth` 加载失败，wikilink 点击仍可以尝试 resolved 跳转；未解析和冲突提示退化为通用提示。

## 测试计划

### MarkdownViewer.spec.ts

新增测试：

- 点击 `.wikilink` 会 emit `wikilink-click`，payload 为 `data-target`。
- 点击普通文本不会 emit。
- inline code 和 fenced code block 中的 `[[...]]` 不会生成 `.wikilink`，因此不会 emit。

### DocumentDetail.spec.ts

新增测试：

- resolved wikilink 点击后调用 `router.push('/documents/<targetDocId>')`。
- dangling wikilink 点击后不跳转，设置 `activeReferenceLabel`，显示 warning。
- conflict wikilink 点击后不跳转，设置 `expandedConflictReferenceId`，显示 warning。
- alias wikilink `[[GRSS-CX-01|文件控制程序]]` 点击时按 `GRSS-CX-01` 匹配，而不是按显示名匹配。

## 验收标准

- Markdown 正文中的已解析 wikilink 可以点击进入目标文档。
- 未解析 wikilink 点击不会跳错页面，会提示并定位到引用问题。
- 冲突 wikilink 点击不会跳错页面，会提示并展开候选。
- Markdown 渲染安全边界保持不变：HTML 仍禁用，代码块内 wikilink 不被转换。
- `npm run test -- MarkdownViewer DocumentDetail` 通过。
- `npm run build:check` 通过。

## 后续可选增强

- 增加 `DocumentReference.wikilinkTarget` 字段，让前端匹配不依赖 `sectionId` 字符串。
- 支持 `[[文档#标题]]` 锚点。
- 给 unresolved/conflict wikilink 加不同颜色或下划线。
- 在 hover 时显示引用健康状态。
