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

`MarkdownViewer.vue` 改为使用成熟 Markdown renderer，例如 `markdown-it`。渲染前先剥离 YAML frontmatter，避免截图中 `--- title tags ---` 这类元数据出现在正文区。

渲染能力至少覆盖：

- 标题
- 有序/无序列表
- 分割线
- 引用块
- 表格
- 代码块
- 粗体和斜体
- 现有 `[[文档编号]]` wikilink 高亮

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

- YAML frontmatter 不显示在预览正文中。
- `# 标题` 渲染为标题。
- `- 条目` 渲染为列表。
- `---` 渲染为分割线。
- `> [!info] 文件信息` 至少渲染为引用块。
- `[[GRSS-XZ-ZD-02]]` 仍显示为 wikilink 样式。

## 测试

更新 `client/src/components/documents/MarkdownViewer.spec.ts`：

- 验证 frontmatter 被移除。
- 验证列表、分割线、引用块、表格、代码块可渲染。
- 验证 wikilink 仍被高亮。
- 验证原始 HTML 不会被执行或作为 HTML 节点插入。

建议验证命令：

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client
npm run test -- MarkdownViewer
npm run build:check
```
