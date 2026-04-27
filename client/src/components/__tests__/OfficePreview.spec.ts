import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const stubs: Record<string, any> = {
  'el-alert': { template: '<div class="el-alert">{{ title }}</div>', props: ['title', 'type', 'closable'] },
  'el-button': { template: '<button @click="$emit(\'click\')"><slot /></button>' , props: ['type'] },
  'el-empty': { template: '<div class="el-empty" />', props: ['description'] },
  'el-image': {
    template: '<div class="el-image"><slot name="error" /></div>',
    props: ['src', 'previewSrcList', 'fit', 'previewTeleported'],
  },
};

import OfficePreview from '../OfficePreview.vue';

const w = (props: Record<string, any>) => mount(OfficePreview, {
  props,
  global: { stubs },
});

describe('OfficePreview', () => {
  it('renders without error for PDF', async () => {
    const c = w({ filename: 'document.pdf', previewUrl: 'https://example.com/doc.pdf' });
    await flushPromises();
    expect(c.exists()).toBe(true);
  });

  it('renders without error for Word document', async () => {
    const c = w({ filename: 'report.docx', previewUrl: 'https://example.com/report.docx' });
    await flushPromises();
    expect(c.exists()).toBe(true);
  });

  it('renders without error for image', async () => {
    const c = w({ filename: 'photo.jpg', previewUrl: 'https://example.com/photo.jpg' });
    await flushPromises();
    expect(c.exists()).toBe(true);
  });

  it('renders without error for unsupported format', async () => {
    const c = w({ filename: 'archive.zip', previewUrl: '' });
    await flushPromises();
    expect(c.exists()).toBe(true);
  });

  it('fileType is pdf for .pdf files', async () => {
    const c = w({ filename: 'test.pdf', previewUrl: '' });
    await flushPromises();
    expect((c.vm as any).fileType).toBe('pdf');
  });

  it('fileType is office for .docx files', async () => {
    const c = w({ filename: 'report.docx', previewUrl: '' });
    await flushPromises();
    expect((c.vm as any).fileType).toBe('office');
  });

  it('fileType is office for .xlsx files', async () => {
    const c = w({ filename: 'data.xlsx', previewUrl: '' });
    await flushPromises();
    expect((c.vm as any).fileType).toBe('office');
  });

  it('fileType is office for .pptx files', async () => {
    const c = w({ filename: 'slide.pptx', previewUrl: '' });
    await flushPromises();
    expect((c.vm as any).fileType).toBe('office');
  });

  it('fileType is image for .jpg files', async () => {
    const c = w({ filename: 'photo.jpg', previewUrl: '' });
    await flushPromises();
    expect((c.vm as any).fileType).toBe('image');
  });

  it('fileType is image for .png files', async () => {
    const c = w({ filename: 'icon.png', previewUrl: '' });
    await flushPromises();
    expect((c.vm as any).fileType).toBe('image');
  });

  it('fileType is other for unsupported formats', async () => {
    const c = w({ filename: 'archive.zip', previewUrl: '' });
    await flushPromises();
    expect((c.vm as any).fileType).toBe('other');
  });

  it('shows attachment fallback for Office files', async () => {
    const c = w({ filename: 'report.docx', previewUrl: 'https://example.com/report.docx?token=abc' });
    await flushPromises();
    expect(c.find('iframe').exists()).toBe(false);
    expect(c.text()).toContain('Office 文件暂按附件管理，请下载查看');
  });

  it('emits download event when download button is clicked', async () => {
    const c = w({ filename: 'archive.zip', previewUrl: '' });
    await flushPromises();
    const downloadBtn = c.find('button');
    await downloadBtn.trigger('click');
    expect(c.emitted('download')).toBeTruthy();
  });

  it('handles case-insensitive file extensions', async () => {
    const c = w({ filename: 'DOCUMENT.PDF', previewUrl: '' });
    await flushPromises();
    expect((c.vm as any).fileType).toBe('pdf');
  });
});
