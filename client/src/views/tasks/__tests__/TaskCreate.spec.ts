import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPush = vi.fn();
const mockBack = vi.fn();

vi.mock('@/api/request', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

vi.mock('@/api/task', () => ({
  default: {
    create: (...args: unknown[]) => mockPost(...args),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  useRoute: () => ({ path: '/tasks/create' }),
}));

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn() },
}));

const stubs: Record<string, any> = {
  'el-page-header': { template: '<div><slot name="content" /></div>' },
  'el-card': { template: '<div><slot /></div>' },
  'el-form': { template: '<form @submit.prevent><slot /></form>', props: ['model', 'rules', 'labelWidth'] },
  'el-form-item': { template: '<div><slot /></div>', props: ['label', 'prop'] },
  'el-select': { template: '<select><slot /></select>', props: ['modelValue', 'filterable', 'placeholder'] },
  'el-option': { template: '<option />', props: ['value', 'label'] },
  'el-date-picker': { template: '<input type="date" />', props: ['modelValue', 'type', 'placeholder'] },
  'el-button': { template: '<button @click="$emit(\'click\')"><slot /></button>' , props: ['type', 'loading'] },
};

import TaskCreate from '../TaskCreate.vue';

const mockTemplates = [
  { id: 'tpl-1', number: 'TPL-001', title: '模板A' },
  { id: 'tpl-2', number: 'TPL-002', title: '模板B' },
];
const mockDepartments = [
  { id: 'dept-1', name: '研发部' },
  { id: 'dept-2', name: '销售部' },
];

const w = () => mount(TaskCreate, { global: { stubs } });

describe('TaskCreate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockImplementation((url: string) => {
      if (url === '/templates') return Promise.resolve({ list: mockTemplates });
      if (url === '/departments') return Promise.resolve({ list: mockDepartments });
      return Promise.resolve({});
    });
  });

  it('renders without error', async () => {
    const c = w();
    await flushPromises();
    expect(c.exists()).toBe(true);
  });

  it('fetches templates on mount', async () => {
    w();
    await flushPromises();
    expect(mockGet).toHaveBeenCalledWith('/templates', expect.any(Object));
  });

  it('fetches departments on mount', async () => {
    w();
    await flushPromises();
    expect(mockGet).toHaveBeenCalledWith('/departments', expect.any(Object));
  });

  it('stores templates after fetch', async () => {
    const c = w();
    await flushPromises();
    expect((c.vm as any).templates).toHaveLength(2);
  });

  it('stores departments after fetch', async () => {
    const c = w();
    await flushPromises();
    expect((c.vm as any).departments).toHaveLength(2);
  });

  it('formData initializes with empty values', async () => {
    const c = w();
    await flushPromises();
    expect((c.vm as any).formData.templateId).toBe('');
    expect((c.vm as any).formData.departmentId).toBe('');
    expect((c.vm as any).formData.deadline).toBe('');
  });

  it('disablePastDates returns false for future dates', async () => {
    const c = w();
    await flushPromises();
    const futureDate = new Date(Date.now() + 86400000 * 2);
    expect((c.vm as any).disablePastDates(futureDate)).toBe(false);
  });

  it('disablePastDates returns true for past dates', async () => {
    const c = w();
    await flushPromises();
    const pastDate = new Date(Date.now() - 86400000 * 2);
    expect((c.vm as any).disablePastDates(pastDate)).toBe(true);
  });

  it('handles fetch error gracefully', async () => {
    const { ElMessage } = await import('element-plus');
    mockGet.mockRejectedValue(new Error('Network error'));
    w();
    await flushPromises();
    expect(ElMessage.error).toHaveBeenCalled();
  });
});