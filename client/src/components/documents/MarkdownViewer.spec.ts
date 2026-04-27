import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import MarkdownViewer from './MarkdownViewer.vue';

describe('MarkdownViewer', () => {
  it('renders headings and wikilinks as readable text', () => {
    const wrapper = mount(MarkdownViewer, {
      props: { content: '# 标题\n\n引用 [[GRSS-CX-01]]' },
    });

    expect(wrapper.html()).toContain('<h1>标题</h1>');
    expect(wrapper.text()).toContain('GRSS-CX-01');
  });
});
