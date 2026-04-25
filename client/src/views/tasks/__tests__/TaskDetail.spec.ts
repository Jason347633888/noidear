import { mount, flushPromises } from '@vue/test-utils';
import { describe, it, expect, vi } from 'vitest';
import TaskDetail from '../TaskDetail.vue';

const mockGetTaskById = vi.fn();
const mockSaveDraft = vi.fn();
const mockSubmitTaskById = vi.fn();

vi.mock('@/api/task', () => ({
  default: {
    getTaskById: (...args: unknown[]) => mockGetTaskById(...args),
    saveDraft: (...args: unknown[]) => mockSaveDraft(...args),
    submitTaskById: (...args: unknown[]) => mockSubmitTaskById(...args),
    cancelTask: vi.fn(),
    approveTask: vi.fn(),
  },
  isTaskLocked: (status: string) => ['approved', 'rejected', 'cancelled'].includes(status),
  isTaskOverdue: vi.fn(() => false),
  getTaskStatusText: (s: string) =>
    ({ pending: '待填报', submitted: '已提交', approved: '已通过', rejected: '已驳回', cancelled: '已取消' }[s] ?? s),
  getTaskStatusType: (s: string) =>
    ({ pending: 'warning', submitted: 'info', approved: 'success', rejected: 'danger', cancelled: 'info' }[s] ?? 'info'),
  getRecordStatusText: (s: string) =>
    ({ pending: '草稿', submitted: '待审批', approved: '已通过', rejected: '已驳回' }[s] ?? s),
  getRecordStatusType: (s: string) =>
    ({ pending: 'info', submitted: 'warning', approved: 'success', rejected: 'danger' }[s] ?? 'info'),
}));

vi.mock('@/api/deviation', () => ({
  default: {
    getToleranceConfig: vi.fn().mockResolvedValue({ fields: [] }),
  },
}));

vi.mock('@/utils/deviationDetector', () => ({
  detectDeviations: vi.fn(() => ({ hasDeviation: false, deviations: [] })),
  debounce: (fn: (...args: unknown[]) => void) => fn,
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: 'task-1' } }),
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

vi.mock('@/api/request', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('TaskDetail', () => {
  it('loads task on mount', async () => {
    mockGetTaskById.mockResolvedValue({
      id: 'task-1',
      status: 'pending',
      template: { title: 'Test Template', fieldsJson: [] },
      records: [],
      draftData: {},
    });
    const wrapper = mount(TaskDetail, {
      global: { stubs: ['el-card', 'el-button', 'el-tag', 'el-form', 'el-form-item', 'el-input'] },
    });
    await flushPromises();
    expect(mockGetTaskById).toHaveBeenCalledWith('task-1');
    expect(wrapper.exists()).toBe(true);
  });

  it('calls saveDraft when handleSaveDraft is invoked for pending task', async () => {
    mockGetTaskById.mockResolvedValue({
      id: 'task-1',
      status: 'pending',
      template: { title: 'Test', fieldsJson: [] },
      records: [],
      draftData: {},
    });
    mockSaveDraft.mockResolvedValue({ id: 'task-1', status: 'pending', draftData: {} });
    const wrapper = mount(TaskDetail, {
      global: { stubs: ['el-card', 'el-button', 'el-tag', 'el-form', 'el-form-item', 'el-input'] },
    });
    await flushPromises();
    const vm = wrapper.vm as any;
    await vm.handleSaveDraft();
    await flushPromises();
    expect(mockSaveDraft).toHaveBeenCalledWith('task-1', expect.any(Object));
  });

  it('calls submitTaskById when handleSubmit is invoked for pending task', async () => {
    mockGetTaskById.mockResolvedValue({
      id: 'task-1',
      status: 'pending',
      template: { title: 'Test', fieldsJson: [] },
      records: [],
      draftData: {},
    });
    mockSubmitTaskById.mockResolvedValue({ id: 'task-1', status: 'submitted' });
    const wrapper = mount(TaskDetail, {
      global: { stubs: ['el-card', 'el-button', 'el-tag', 'el-form', 'el-form-item', 'el-input'] },
    });
    await flushPromises();
    const vm = wrapper.vm as any;
    await vm.handleSubmit();
    await flushPromises();
    expect(mockSubmitTaskById).toHaveBeenCalledWith('task-1', expect.any(Object));
  });
});
