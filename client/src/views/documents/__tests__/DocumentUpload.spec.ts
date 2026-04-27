import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { defineComponent, h } from 'vue';
import DocumentUpload from '../DocumentUpload.vue';

const mockPost = vi.fn();
const mockPush = vi.fn();
const mockBack = vi.fn();

vi.mock('@/api/request', () => ({
  default: {
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { level: '1' } }),
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

const stubs = {
  'el-page-header': { template: '<div><button @click="$emit(\'back\')" /><slot name="content" /></div>' },
  'el-card': { template: '<div><slot /></div>' },
  'el-form': defineComponent({
    props: ['model', 'rules', 'labelWidth'],
    setup(_, { expose, slots }) {
      expose({ validate: vi.fn().mockResolvedValue(true) });
      return () => h('form', slots.default?.());
    },
  }),
  'el-form-item': { template: '<div><slot /></div>', props: ['label', 'prop'] },
  'el-tag': { template: '<span><slot /></span>', props: ['type', 'effect', 'size'] },
  'el-input': { template: '<input />', props: ['modelValue', 'placeholder', 'maxlength', 'showWordLimit'] },
  'el-upload': {
    template: '<div><slot /></div>',
    props: ['autoUpload', 'limit', 'onChange', 'onExceed', 'onRemove', 'accept', 'drag'],
  },
  'el-button': defineComponent({
    props: ['type', 'loading', 'size', 'circle'],
    emits: ['click'],
    inheritAttrs: false,
    setup(_, { attrs, emit, slots }) {
      return () => h('button', { 'data-test': attrs['data-test'], onClick: () => emit('click') }, slots.default?.());
    },
  }),
  'el-icon': { template: '<span><slot /></span>', props: ['size'] },
  UploadFilled: { template: '<span />' },
  Document: { template: '<span />' },
  Close: { template: '<span />' },
};

const mountOptions = {
  global: { stubs },
};

const setRequiredTitleAndFile = async (wrapper: VueWrapper) => {
  const vm = wrapper.vm as unknown as { formData: { title: string; file: File | null } };
  vm.formData.title = '食品安全管理制度';
  vm.formData.file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
  await flushPromises();
};

describe('DocumentUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves draft without submitting approval', async () => {
    mockPost.mockResolvedValueOnce({ id: 'doc1' });
    const wrapper = mount(DocumentUpload, mountOptions);
    await setRequiredTitleAndFile(wrapper);

    await wrapper.find('[data-test="save-draft"]').trigger('click');
    await flushPromises();

    expect(mockPost).toHaveBeenCalledWith('/documents/upload', expect.any(FormData), expect.any(Object));
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it('does not start a second upload while saving draft is in progress', async () => {
    let resolveUpload: (value: { id: string }) => void = () => {};
    mockPost.mockReturnValueOnce(new Promise((resolve) => {
      resolveUpload = resolve;
    }));
    const wrapper = mount(DocumentUpload, mountOptions);
    await setRequiredTitleAndFile(wrapper);

    await wrapper.find('[data-test="save-draft"]').trigger('click');
    await wrapper.find('[data-test="save-draft"]').trigger('click');
    await flushPromises();

    expect(mockPost).toHaveBeenCalledWith('/documents/upload', expect.any(FormData), expect.any(Object));
    expect(mockPost).toHaveBeenCalledTimes(1);

    resolveUpload({ id: 'doc1' });
    await flushPromises();
  });

  it('submits approval after upload when clicking submit approval', async () => {
    mockPost.mockResolvedValueOnce({ id: 'doc1' }).mockResolvedValueOnce({ id: 'doc1', status: 'pending' });
    const wrapper = mount(DocumentUpload, mountOptions);
    await setRequiredTitleAndFile(wrapper);

    await wrapper.find('[data-test="submit-approval"]').trigger('click');
    await flushPromises();

    expect(mockPost).toHaveBeenNthCalledWith(1, '/documents/upload', expect.any(FormData), expect.any(Object));
    expect(mockPost).toHaveBeenNthCalledWith(2, '/documents/doc1/submit');
  });
});
