import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { ElMessage } from 'element-plus';

const mockGet = vi.fn();
const mockPut = vi.fn();
const mockPost = vi.fn();
const mockPush = vi.fn();

vi.mock('@/api/request', () => ({
  default: {
    get: (...a: unknown[]) => mockGet(...a),
    put: (...a: unknown[]) => mockPut(...a),
    post: (...a: unknown[]) => mockPost(...a),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, back: vi.fn() }),
  useRoute: () => ({ params: { id: 'tpl-v1' } }),
}));

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
  ElMessageBox: { confirm: vi.fn() },
}));

vi.mock('sortablejs', () => ({
  default: { create: vi.fn(() => ({ destroy: vi.fn() })) },
}));

vi.mock('@/utils/templateConfigValidation', () => ({
  validateTemplateFields: vi.fn(() => ({ valid: true, errors: [] })),
}));

const stubs: Record<string, any> = {
  'el-page-header': { template: '<div />' },
  'el-card': { template: '<div><slot /><slot name="header" /></div>' },
  'el-button': { template: '<button @click="$emit(\'click\')"><slot /></button>', props: ['loading', 'disabled', 'size', 'type'] },
  'el-empty': { template: '<div />', props: ['description', 'image-size'] },
  'el-dialog': { template: '<div v-if="modelValue"><slot /></div>', props: ['modelValue'] },
  'el-form': { template: '<div><slot /></div>' },
  'el-form-item': { template: '<div><slot /></div>' },
  'el-input': { template: '<input />', props: ['modelValue', 'disabled'] },
  'el-switch': { template: '<input type="checkbox" />', props: ['modelValue'] },
  'el-input-number': { template: '<input type="number" />', props: ['modelValue'] },
  'el-tag': { template: '<span><slot /></span>', props: ['type', 'size'] },
  'el-icon': { template: '<span />' },
  DynamicField: { template: '<div />', props: ['modelValue', 'field'] },
};

async function mountComponent(templateData: any = null) {
  if (templateData) {
    mockGet.mockResolvedValue(templateData);
  } else {
    mockGet.mockRejectedValue(new Error('not found'));
  }

  const { default: TemplateDesigner } = await import('../TemplateDesigner.vue');

  const wrapper = mount(TemplateDesigner, {
    global: {
      stubs,
      components: {},
    },
  });

  await flushPromises();
  return wrapper;
}

describe('TemplateDesigner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks save and shows warning on active template', async () => {
    const wrapper = await mountComponent({
      id: 'tpl-v1',
      status: 'active',
      versionStatus: 'active',
      fieldsJson: { fields: [] },
    });

    const saveButton = wrapper.findAll('button').find(b => b.text() === '保存');
    await saveButton?.trigger('click');

    expect(ElMessage.warning).toHaveBeenCalledWith(
      expect.stringContaining('已启用模板不能原地修改字段'),
    );
    expect(mockPut).not.toHaveBeenCalled();
  });

  it('shows createRevision button for active template', async () => {
    const wrapper = await mountComponent({
      id: 'tpl-v1',
      status: 'active',
      versionStatus: 'active',
      fieldsJson: { fields: [] },
    });

    const buttons = wrapper.findAll('button').map(b => b.text());
    expect(buttons).toContain('发起改版');
  });

  it('does not show createRevision button for draft template', async () => {
    const wrapper = await mountComponent({
      id: 'tpl-v1',
      status: 'draft',
      versionStatus: 'draft',
      fieldsJson: { fields: [] },
    });

    const buttons = wrapper.findAll('button').map(b => b.text());
    expect(buttons).not.toContain('发起改版');
  });

  it('calls createRevision API and navigates on success', async () => {
    const wrapper = await mountComponent({
      id: 'tpl-v1',
      status: 'active',
      versionStatus: 'active',
      fieldsJson: { fields: [] },
    });

    mockPost.mockResolvedValue({ id: 'tpl-v2', version: 2, versionStatus: 'draft' });

    const revisionButton = wrapper.findAll('button').find(b => b.text() === '发起改版');
    await revisionButton?.trigger('click');
    await flushPromises();

    expect(mockPost).toHaveBeenCalledWith(
      expect.stringContaining('tpl-v1/revisions'),
      expect.any(Object),
    );
    expect(mockPush).toHaveBeenCalledWith('/templates/tpl-v2/design');
  });

  it('saves fields successfully on draft template', async () => {
    const wrapper = await mountComponent({
      id: 'tpl-v1',
      status: 'draft',
      versionStatus: 'draft',
      fieldsJson: { fields: [] },
    });

    mockPut.mockResolvedValue({});

    const saveButton = wrapper.findAll('button').find(b => b.text() === '保存');
    await saveButton?.trigger('click');
    await flushPromises();

    expect(mockPut).toHaveBeenCalledWith(
      expect.stringContaining('tpl-v1/fields'),
      expect.any(Object),
    );
    expect(ElMessage.success).toHaveBeenCalledWith('表单字段已保存到模板');
  });
});
