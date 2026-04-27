# Markdown 正文渲染设计

## 背景

文档详情页已经展示 `Document.content_md` 的 Markdown 正文，但当前 `MarkdownViewer` 只是手写处理少量语法：一级/二级标题和 `[[wikilink]]`。实际测试中，YAML frontmatter、列表、分割线、引用块等 Markdown 语法会以原始正文形式显示，导致“有预览区但没有真正渲染”。

## 范围

本次只升级文档详情页的 Markdown 正文渲染：

- 保持 `DocumentDetail.vue -> MarkdownViewer.vue` 的数据流不变。
- 不修改后端 `content_md` 存储格式。
- 不扩展上传 `.md` 文件的独立预览流程。
- 不改变文档引用健康检查和 Markdown 保存 API。

## 方案

`MarkdownViewer.vue` 改为使用成熟 Markdown renderer，例如 `markdown-it`。验收口径对齐 Obsidian 阅读模式：用户写的是常见 Markdown/Obsidian 风格正文时，预览区应该显示排版后的阅读效果，而不是原始标记文本。

渲染前先剥离 YAML frontmatter，避免截图中 `--- title tags ---` 这类元数据出现在正文区。

### 依赖与处理策略

- 在 `client/package.json` 新增 `markdown-it`。
- 如果任务列表、表格、删除线等语法需要额外 plugin，优先使用 `markdown-it` 生态的小型插件；若插件会引入明显复杂度，则在 `MarkdownViewer` 内做窄范围 post-process。
- 原始 HTML 必须保持禁用，不能为了兼容 Markdown 而开启 `html: true`。
- frontmatter、Obsidian callout、wikilink 属于本项目的受控扩展，集中在 `MarkdownViewer` 或同目录小型 helper 中处理，不分散到页面组件。

渲染能力至少覆盖：

- 标题
- 有序/无序列表
- 分割线
- 引用块
- Obsidian 风格 callout，例如 `> [!info] 文件信息`
- 表格
- 代码块
- 行内代码
- 任务列表
- 粗体和斜体
- 删除线
- 普通链接
- 现有 `[[文档编号]]` wikilink 高亮

不要求实现 Obsidian 插件生态能力，例如 Dataview 查询、嵌入块转置、Canvas、属性面板编辑、关系图谱或反向链接面板。

### Obsidian-like 兼容范围

本次对齐的是 Obsidian 的阅读视图体验，不是完整 Obsidian 应用能力。

必须支持的 Obsidian 风格扩展：

- YAML frontmatter：只在文档开头识别并隐藏。
- Callout：至少支持 `note`、`info`、`tip`、`warning`、`danger` 五类。
- Wikilink：支持 `[[GRSS-XZ-ZD-02]]` 和 `[[GRSS-XZ-ZD-02|显示名称]]`。

明确不做的 Obsidian 语法：

- `[[文档#标题]]` 标题锚点跳转。
- `![[嵌入内容]]` 嵌入块。
- Dataview、Templater、Canvas、反向链接面板、关系图谱。
- Obsidian 属性面板编辑；frontmatter 本次只隐藏，不渲染成属性 UI。

### Frontmatter 规则

只剥离满足以下条件的 frontmatter：

1. Markdown 字符串开头第一行是 `---`。
2. 后续存在独立一行 `---` 作为结束。
3. 被剥离内容只影响渲染展示，不改变 `content_md` 原文。

正文中间的 `---` 必须保留并渲染为分割线，不能被 frontmatter 逻辑误删。

### Callout 规则

Obsidian callout 输入示例：

```markdown
> [!info] 文件信息
> 编号：GRSS-XZ-ZD-02
```

渲染要求：

- 整个块渲染为可辨识的 callout 容器。
- 类型名转换为 class，例如 `callout-info`。
- 第一行作为 callout 标题，其余引用内容作为正文。
- 未知类型降级为普通 `note` 样式，但保留原始标题文字。

### Wikilink 规则

Wikilink 只做显示增强，不在本次实现路由跳转。

| 输入 | 显示文本 | data 属性 |
| --- | --- | --- |
| `[[GRSS-XZ-ZD-02]]` | `GRSS-XZ-ZD-02` | `data-target="GRSS-XZ-ZD-02"` |
| `[[GRSS-XZ-ZD-02|关键岗位制度]]` | `关键岗位制度` | `data-target="GRSS-XZ-ZD-02"` |

目标值和显示文本都必须转义后再进入 HTML。

### 视觉要求

Markdown 阅读区应贴近 Obsidian 的阅读密度，同时服从现有 Element Plus 卡片布局：

- 正文行高保持易读，避免压缩成表单文本。
- 标题之间有清晰层级和上下间距。
- 列表有合理缩进，嵌套列表不能贴边。
- 表格使用边框和表头背景；宽表格允许横向滚动，不撑破卡片。
- 代码块使用浅色背景、等宽字体、内边距和横向滚动。
- 行内代码使用轻量背景和等宽字体。
- Callout 使用左边框、浅色背景、标题加粗；不同类型至少通过颜色区分。
- Wikilink 使用可识别的链接样式，但不伪装成已经可点击跳转的主导航链接。

## 安全约束

Markdown 正文来自系统文档内容，前端仍会通过 `v-html` 展示渲染结果，因此 renderer 必须默认禁用原始 HTML，避免用户输入的 HTML 或脚本被直接执行。

`[[wikilink]]` 只转换为受控的 `<span class="wikilink">...</span>`，其中链接文本必须先转义，再进入 HTML。

## 组件边界

`MarkdownViewer` 只负责“Markdown 字符串 -> 安全 HTML”。它不负责：

- 拉取文档数据
- 保存 Markdown
- 判断文档状态是否可编辑
- 解析引用健康状态
- 打开文档详情路由

`MarkdownEditor` 继续复用 `MarkdownViewer` 做右侧实时预览。

## 验收标准

使用包含以下内容的 Markdown 正文时：

- YAML frontmatter 不显示在预览正文中，效果接近 Obsidian 阅读模式。
- 正文中间的 `---` 不被当作 frontmatter 删除，而是渲染为分割线。
- `# 标题` 渲染为标题。
- `- 条目` 渲染为列表。
- `- [ ] 待办` 和 `- [x] 已完成` 渲染为任务列表。
- `---` 渲染为分割线。
- `> [!info] 文件信息` 渲染为可辨识的 callout，带类型 class、标题和正文。
- Markdown 表格渲染为 HTML 表格。
- fenced code block 渲染为代码块，行内反引号渲染为行内代码。
- `**粗体**`、`*斜体*`、`~~删除线~~` 按阅读模式展示。
- 普通链接渲染为可点击链接。
- `[[GRSS-XZ-ZD-02]]` 仍显示为 wikilink 样式。
- `[[GRSS-XZ-ZD-02|关键岗位制度]]` 显示为 `关键岗位制度`，并保留目标编号。
- HTML 输入如 `<script>alert(1)</script>` 不会生成可执行脚本节点。

## 测试

更新 `client/src/components/documents/MarkdownViewer.spec.ts`：

- 验证 frontmatter 被移除。
- 验证正文中间的 `---` 仍渲染为分割线。
- 验证列表、任务列表、分割线、callout、表格、代码块、行内代码可渲染。
- 验证粗体、斜体、删除线、普通链接可渲染。
- 验证普通 wikilink 和 alias wikilink 仍被高亮，并保留目标值。
- 验证原始 HTML 不会被执行或作为 HTML 节点插入。

补充浏览器验收：

- 使用截图中的“关键岗位负责人缺席代理制度”样例正文打开文档详情页。
- 确认 frontmatter 不显示。
- 确认 callout、列表、分割线按阅读模式展示。
- 确认长表格或代码块不撑破文档卡片。
- 确认 Markdown 编辑模式右侧实时预览和详情页只读预览表现一致。

建议验证命令：

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client
npm run test -- MarkdownViewer
npm run build:check
```
