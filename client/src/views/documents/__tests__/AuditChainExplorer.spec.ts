import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import type { EvidenceChainResult } from '@noidear/types';

const mockChain: EvidenceChainResult = {
  root: {
    id: 'doc-1',
    nodeId: 'document:doc-1',
    type: 'document',
    label: 'SOP-001 操作规程',
    route: '/documents/doc-1',
    depth: 0,
  },
  nodes: [
    {
      id: 'doc-1',
      nodeId: 'document:doc-1',
      type: 'document',
      label: 'SOP-001 操作规程',
      route: '/documents/doc-1',
      depth: 0,
    },
    {
      id: 'tmpl-1',
      nodeId: 'record_template:tmpl-1',
      type: 'record_template',
      label: '卫生记录表',
      route: '/records/templates/tmpl-1',
      depth: 1,
    },
  ],
  edges: [
    {
      id: 'e1',
      source: 'document:doc-1',
      target: 'record_template:tmpl-1',
      relationType: 'has_template',
      strength: 'validated',
      label: '绑定模板',
    },
  ],
  warnings: [
    {
      id: 'w1',
      severity: 'warning',
      message: '记录表单入口未绑定表单模板',
      sourceNodeId: 'document:doc-1',
    },
  ],
  meta: {
    sourceType: 'document',
    sourceId: 'doc-1',
    maxDepth: 4,
    generatedAt: '2026-04-28T00:00:00Z',
    truncated: false,
  },
};

vi.mock('@/api/document-control', () => ({
  documentControlApi: {
    getEvidenceChain: vi.fn(),
  },
}));

vi.mock('vue-router', () => ({
  useRoute: vi.fn().mockReturnValue({ query: {} }),
}));

const stubs = {
  EvidenceChainGraph: {
    template: '<div data-testid="evidence-chain-graph">graph</div>',
    props: ['chain', 'loading'],
  },
};

import AuditChainExplorer from '../AuditChainExplorer.vue';
import { documentControlApi } from '@/api/document-control';
import { useRoute } from 'vue-router';

describe('AuditChainExplorer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRoute).mockReturnValue({ query: {} } as any);
    vi.mocked(documentControlApi.getEvidenceChain).mockResolvedValue({ data: mockChain } as any);
  });

  it('page heading includes 证据链', () => {
    const wrapper = mount(AuditChainExplorer, { global: { stubs } });
    expect(wrapper.text()).toContain('证据链');
  });

  it('calls getEvidenceChain with route query params on mount', async () => {
    vi.mocked(useRoute).mockReturnValue({
      query: { sourceType: 'document', sourceId: 'doc-1' },
    } as any);

    mount(AuditChainExplorer, { global: { stubs } });
    await flushPromises();

    expect(documentControlApi.getEvidenceChain).toHaveBeenCalledWith({
      sourceType: 'document',
      sourceId: 'doc-1',
      maxDepth: 4,
    });
  });

  it('source type selector shows all 6 types', () => {
    const wrapper = mount(AuditChainExplorer, { global: { stubs } });
    const options = wrapper.findAll('select option');
    const values = options.map((o) => o.attributes('value'));
    expect(values).toContain('document');
    expect(values).toContain('record_template');
    expect(values).toContain('record');
    expect(values).toContain('change_event');
    expect(values).toContain('audit_finding');
    expect(values).toContain('corrective_action');
    expect(values.length).toBe(6);
  });

  it('shows loading indicator while API call is pending', async () => {
    let resolve!: (v: unknown) => void;
    vi.mocked(documentControlApi.getEvidenceChain).mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }) as any,
    );

    vi.mocked(useRoute).mockReturnValue({
      query: { sourceType: 'document', sourceId: 'doc-1' },
    } as any);

    const wrapper = mount(AuditChainExplorer, { global: { stubs } });

    // Before resolving, loading should be visible
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-testid="loading"]').exists()).toBe(true);

    resolve({ data: mockChain });
    await flushPromises();
    expect(wrapper.find('[data-testid="loading"]').exists()).toBe(false);
  });

  it('shows error message when API rejects', async () => {
    vi.mocked(documentControlApi.getEvidenceChain).mockRejectedValue(new Error('network error'));

    vi.mocked(useRoute).mockReturnValue({
      query: { sourceType: 'document', sourceId: 'doc-1' },
    } as any);

    const wrapper = mount(AuditChainExplorer, { global: { stubs } });
    await flushPromises();

    expect(wrapper.find('[data-testid="error"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('获取证据链失败');
  });

  it('shows 下载 JSON button after chain is loaded', async () => {
    vi.mocked(useRoute).mockReturnValue({
      query: { sourceType: 'document', sourceId: 'doc-1' },
    } as any);

    const wrapper = mount(AuditChainExplorer, { global: { stubs } });
    await flushPromises();

    const buttons = wrapper.findAll('button');
    const downloadBtn = buttons.find((b) => b.text().includes('下载 JSON'));
    expect(downloadBtn).toBeDefined();
  });
});
