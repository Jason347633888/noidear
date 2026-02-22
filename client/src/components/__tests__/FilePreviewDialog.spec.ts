import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import FilePreviewDialog from '../FilePreviewDialog.vue';
import filePreviewApi from '@/api/file-preview';

// Mock file-preview API
vi.mock('@/api/file-preview', () => ({
  default: {
    getPreviewInfo: vi.fn(),
    getDownloadUrl: vi.fn((id) => `/api/v1/documents/${id}/download`),
  },
}));

// Mock ElMessage
vi.mock('element-plus', async () => {
  const actual = await vi.importActual('element-plus');
  return {
    ...actual,
    ElMessage: {
      error: vi.fn(),
      success: vi.fn(),
    },
  };
});

describe('FilePreviewDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock navigator.userAgent
    Object.defineProperty(window.navigator, 'userAgent', {
      writable: true,
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    });
  });

  const createWrapper = (props = {}) => {
    return mount(FilePreviewDialog, {
      props: {
        modelValue: false,
        documentId: 'test-doc-id',
        filename: 'test.pdf',
        ...props,
      },
      global: {
        stubs: {
          ElDialog: true,
          ElButton: true,
          ElIcon: true,
          ElAlert: true,
          teleport: true,
        },
      },
    });
  };

  it('应该正确渲染组件', () => {
    const wrapper = createWrapper();
    expect(wrapper.exists()).toBe(true);
  });

  it('应该接收正确的 props', () => {
    const wrapper = createWrapper({
      modelValue: true,
      documentId: 'doc-123',
      filename: 'document.pdf',
    });
    expect(wrapper.props('modelValue')).toBe(true);
    expect(wrapper.props('documentId')).toBe('doc-123');
    expect(wrapper.props('filename')).toBe('document.pdf');
  });

  it('应该在 Safari 浏览器使用 iframe', async () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      writable: true,
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15',
    });

    const wrapper = createWrapper({ modelValue: true });
    const vm = wrapper.vm as any;

    expect(vm.isSafari).toBe(true);
  });

  it('应该在移动端显示下载提示', async () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      writable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) Mobile/15E148',
    });

    const wrapper = createWrapper({ modelValue: true });
    const vm = wrapper.vm as any;

    expect(vm.isMobile).toBe(true);
  });

  it('应该正确切换全屏状态', () => {
    const wrapper = createWrapper();
    const vm = wrapper.vm as any;

    expect(vm.fullscreen).toBe(false);
    vm.fullscreen = true;
    expect(vm.fullscreen).toBe(true);
  });

  it('应该正确生成下载 URL', () => {
    const wrapper = createWrapper({ documentId: 'doc-456' });
    const vm = wrapper.vm as any;

    vm.handleDownload();
    expect(filePreviewApi.getDownloadUrl).toHaveBeenCalledWith('doc-456');
  });

  it('应该在 visible 变化时同步 modelValue', async () => {
    const wrapper = createWrapper({ modelValue: true });
    const vm = wrapper.vm as any;

    vm.visible = false;
    await nextTick();

    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([false]);
  });

  it('应该在没有 documentId 时不加载预览', async () => {
    const wrapper = createWrapper({ documentId: '', modelValue: true });
    await nextTick();
    await nextTick();

    expect(filePreviewApi.getPreviewInfo).not.toHaveBeenCalled();
  });

  it('应该验证浏览器检测逻辑正确', () => {
    // 测试 Chrome
    Object.defineProperty(window.navigator, 'userAgent', {
      writable: true,
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    });
    let wrapper = createWrapper();
    let vm = wrapper.vm as any;
    expect(vm.isMobile).toBe(false);
    expect(vm.isSafari).toBe(false);

    // 测试 Android
    Object.defineProperty(window.navigator, 'userAgent', {
      writable: true,
      value: 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36',
    });
    wrapper = createWrapper();
    vm = wrapper.vm as any;
    expect(vm.isMobile).toBe(true);
  });

  it('应该正确处理加载状态', () => {
    const wrapper = createWrapper();
    const vm = wrapper.vm as any;

    expect(vm.loading).toBe(false);
  });

  it('应该正确初始化 previewData 为 null', () => {
    const wrapper = createWrapper();
    const vm = wrapper.vm as any;

    expect(vm.previewData).toBe(null);
  });
});
