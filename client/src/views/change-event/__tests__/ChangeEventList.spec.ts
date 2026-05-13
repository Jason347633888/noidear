import { mount, flushPromises } from '@vue/test-utils';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ChangeEventList from '../ChangeEventList.vue';
import changeEventApi from '@/api/change-event';

vi.mock('@/api/change-event', () => ({
  default: {
    getList: vi.fn(),
    getOne: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
    remove: vi.fn(),
    getFormTasks: vi.fn().mockResolvedValue([]),
    fillFormTask: vi.fn().mockResolvedValue({}),
  },
  getChangeTypeText: (type: string) => type,
  getStatusText: (status: string) => status,
  getStatusType: () => 'info',
}));

vi.mock('@/api/change-compliance-record', () => ({
  default: {
    getByEvent: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    remove: vi.fn(),
  },
  getRiskText: (level: string) => level,
  getRiskType: () => 'info',
}));

vi.mock('@/api/change-verification-record', () => ({
  default: {
    getByEvent: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    remove: vi.fn(),
  },
  getVerificationResultText: (result: string) => result,
  getVerificationResultType: () => 'info',
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe('ChangeEventList', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows generated form tasks in change detail', async () => {
    vi.mocked(changeEventApi.getList).mockResolvedValue([]);
    vi.mocked(changeEventApi.getOne).mockResolvedValue({
      id: 'change1',
      company_id: '1',
      change_no: 'CE-2026-0001',
      title: '配方调整',
      change_type: 'recipe',
      description: '调整配方',
      status: 'pending',
      initiator_id: null,
      created_at: '2026-04-27T00:00:00.000Z',
      updated_at: '2026-04-27T00:00:00.000Z',
      deleted_at: null,
      formTasks: [{ id: 'task1', changeEventId: 'change1', templateId: 'tpl1', sourceFormCode: 'GRSS-KF-JL-07', title: '产品验证记录表', status: 'pending', required: true, sortOrder: 0 }],
    } as any);

    const ElTableStub = {
      props: ['data'],
      template: '<div><span v-for="row in (data || [])" :key="row.id">{{ row.sourceFormCode }} {{ row.title }}</span><slot /></div>',
    };

    const wrapper = mount(ChangeEventList, {
      global: {
        stubs: {
          'el-card': { template: '<div><slot /><slot name="header" /></div>' },
          'el-table': ElTableStub,
          'el-table-column': true,
          'el-dialog': { template: '<div><slot /><slot name="footer" /></div>', props: ['modelValue', 'title'] },
          'el-button': { template: '<button><slot /></button>' },
          'el-tag': { template: '<span><slot /></span>' },
          'el-form': { template: '<form><slot /></form>' },
          'el-form-item': { template: '<div><slot /></div>' },
          'el-input': { template: '<input />' },
          'el-select': { template: '<select><slot /></select>' },
          'el-option': { template: '<option />' },
          'el-descriptions': { template: '<dl><slot /></dl>' },
          'el-descriptions-item': { template: '<dd><slot /></dd>' },
          'el-icon': { template: '<i><slot /></i>' },
          'el-date-picker': { template: '<input />' },
        },
      },
    });
    await flushPromises();

    await (wrapper.vm as any).openDetailDialog({ id: 'change1' });
    await flushPromises();

    expect(wrapper.text()).toContain('产品验证记录表');
    expect(wrapper.text()).toContain('GRSS-KF-JL-07');
  });
});
