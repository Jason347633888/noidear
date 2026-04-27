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
