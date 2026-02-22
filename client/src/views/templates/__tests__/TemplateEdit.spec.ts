import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockPush = vi.fn();

vi.mock('@/api/request', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, back: vi.fn() }),
  useRoute: () => ({ params: { id: '' }, path: '/templates/create' }),
}));

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('sortablejs', () => ({
  default: { create: vi.fn(() => ({ destroy: vi.fn() })) },
}));

const stubs: Record<string, any> = {
  'el-page-header': { template: '<div><slot name="content" /></div>' },
  'el-card': { template: '<div><slot /><slot name="header" /></div>' },
  'el-form': { template: '<form><slot /></form>', props: ['model', 'rules', 'labelWidth'] },
  'el-form-item': { template: '<div><slot /></div>', props: ['label', 'prop'] },
  'el-input': { template: '<input />', props: ['modelValue', 'placeholder', 'type', 'rows'] },
  'el-input-number': { template: '<input type="number" />', props: ['modelValue'] },
  'el-select': { template: '<select><slot /></select>', props: ['modelValue', 'placeholder'] },
  'el-option': { template: '<option />', props: ['value', 'label'] },
  'el-switch': { template: '<input type="checkbox" />', props: ['modelValue'] },
  'el-button': { template: '<button @click="$emit(\'click\')"><slot /></button>' , props: ['type', 'loading', 'disabled'] },
  'el-icon': { template: '<span><slot /></span>' },
  'el-empty': { template: '<div />', props: ['description'] },
  'ExcelUpload': { template: '<div />', props: ['visible'] },
  'Plus': { template: '<span />' },
  'Delete': { template: '<span />' },
  'Rank': { template: '<span />' },
  'Upload': { template: '<span />' },
};

import TemplateEdit from '../TemplateEdit.vue';

const w = () => mount(TemplateEdit, { global: { stubs } });

describe('TemplateEdit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({});
    mockPost.mockResolvedValue({ id: 'new-tpl' });
  });

  it('renders without error in create mode', async () => {
    const c = w();
    await flushPromises();
    expect(c.exists()).toBe(true);
  });

  it('initializes with title and level fields', async () => {
    const c = w();
    await flushPromises();
    expect((c.vm as any).form.title).toBe('');
    expect((c.vm as any).form.level).toBeDefined();
  });

  it('form starts with one default field', async () => {
    const c = w();
    await flushPromises();
    // TemplateEdit initializes with one default field
    expect((c.vm as any).form.fields.length).toBeGreaterThanOrEqual(1);
  });

  it('isEdit is false when no route id', async () => {
    const c = w();
    await flushPromises();
    expect((c.vm as any).isEdit).toBe(false);
  });

  it('addField appends a new field', async () => {
    const c = w();
    await flushPromises();
    const initialCount = (c.vm as any).form.fields.length;
    (c.vm as any).addField();
    expect((c.vm as any).form.fields.length).toBe(initialCount + 1);
  });

  it('addField creates field with defaults', async () => {
    const c = w();
    await flushPromises();
    const initialCount = (c.vm as any).form.fields.length;
    (c.vm as any).addField();
    const field = (c.vm as any).form.fields[initialCount];
    expect(field.label).toBe('');
    expect(field.type).toBe('text');
  });

  it('removeField removes a field when there are multiple', async () => {
    const c = w();
    await flushPromises();
    (c.vm as any).addField();
    (c.vm as any).addField();
    const countBefore = (c.vm as any).form.fields.length;
    (c.vm as any).removeField(0);
    expect((c.vm as any).form.fields.length).toBe(countBefore - 1);
  });

  it('addOption adds option to a select field', async () => {
    const c = w();
    await flushPromises();
    const field = { type: 'select', options: [] };
    (c.vm as any).addOption(field);
    expect(field.options).toHaveLength(1);
  });

  it('removeOption removes an option', async () => {
    const c = w();
    await flushPromises();
    const field = { options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] };
    (c.vm as any).removeOption(field, 0);
    expect(field.options).toHaveLength(1);
    expect(field.options[0].value).toBe('b');
  });

  it('handleExcelImport sets imported fields', async () => {
    const c = w();
    await flushPromises();
    const importedFields = [
      { key: 'f1', label: '字段1', type: 'text', required: false, options: [] },
    ];
    (c.vm as any).handleExcelImport(importedFields);
    expect((c.vm as any).form.fields).toHaveLength(1);
  });
});