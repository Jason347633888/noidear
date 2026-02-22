import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import ExportButton from '../ExportButton.vue';

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('@element-plus/icons-vue', () => ({ Download: { template: '<span />' } }));

const stubs: Record<string, any> = {
  'el-button': { template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>', props: ['disabled', 'loading', 'type', 'icon'] },
};

const makeBlob = () => new Blob(['data'], { type: 'application/vnd.ms-excel' });

const mockUrlMethods = () => {
  // Mock only the static methods on URL, preserving the constructor so happy-dom internals keep working
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:url');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
};

const w = (props: Record<string, unknown> = {}) => mount(ExportButton, { props, global: { stubs } });

describe('ExportButton', () => {
  beforeEach(() => { vi.clearAllMocks(); mockUrlMethods(); });

  it('renders default text', () => { expect(w().text()).toContain('导出'); });
  it('renders custom text', () => { expect(w({ text: '下载' }).text()).toContain('下载'); });
  it('emits click on button click', async () => { const c = w(); await c.find('button').trigger('click'); expect(c.emitted('click')).toBeTruthy(); });
  it('is disabled when prop is true', () => { expect(w({ disabled: true }).find('button').attributes('disabled')).toBeDefined(); });

  it('calls exportFn on click', async () => {
    const exportFn = vi.fn().mockResolvedValue(makeBlob());
    const c = w({ exportFn });
    await c.find('button').trigger('click');
    await flushPromises();
    expect(exportFn).toHaveBeenCalled();
  });

  it('shows success message after export', async () => {
    const { ElMessage } = await import('element-plus');
    const exportFn = vi.fn().mockResolvedValue(makeBlob());
    const c = w({ exportFn });
    await c.find('button').trigger('click');
    await flushPromises();
    expect(ElMessage.success).toHaveBeenCalledWith('导出成功');
  });

  it('emits success event after export', async () => {
    const exportFn = vi.fn().mockResolvedValue(makeBlob());
    const c = w({ exportFn });
    await c.find('button').trigger('click');
    await flushPromises();
    expect(c.emitted('success')).toBeTruthy();
  });

  it('shows error message on export failure', async () => {
    const { ElMessage } = await import('element-plus');
    const exportFn = vi.fn().mockRejectedValue(new Error('network'));
    const c = w({ exportFn });
    await c.find('button').trigger('click');
    await flushPromises();
    expect(ElMessage.error).toHaveBeenCalled();
  });

  it('emits error event on export failure', async () => {
    const exportFn = vi.fn().mockRejectedValue(new Error('fail'));
    const c = w({ exportFn });
    await c.find('button').trigger('click');
    await flushPromises();
    expect(c.emitted('error')).toBeTruthy();
  });

  it('does nothing extra when exportFn is not provided', async () => {
    const { ElMessage } = await import('element-plus');
    const c = w();
    await c.find('button').trigger('click');
    await flushPromises();
    expect(ElMessage.success).not.toHaveBeenCalled();
    expect(ElMessage.error).not.toHaveBeenCalled();
  });
});
