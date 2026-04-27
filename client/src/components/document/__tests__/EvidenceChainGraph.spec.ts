import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import EvidenceChainGraph from '../EvidenceChainGraph.vue'
import type { EvidenceChainResult } from '@noidear/types'

const mockChain: EvidenceChainResult = {
  root: {
    id: 'doc-1', nodeId: 'document:doc-1', type: 'document',
    label: 'SOP-001 操作规程', route: '/documents/doc-1', depth: 0
  },
  nodes: [
    { id: 'doc-1', nodeId: 'document:doc-1', type: 'document', label: 'SOP-001 操作规程', route: '/documents/doc-1', depth: 0 },
    { id: 'tmpl-1', nodeId: 'record_template:tmpl-1', type: 'record_template', label: '卫生记录表', route: '/records/templates/tmpl-1', depth: 1 },
    { id: 'rec-1', nodeId: 'record:rec-1', type: 'record', label: '2024-01 卫生记录', route: '/records/rec-1', depth: 2 },
    { id: 'find-1', nodeId: 'audit_finding:find-1', type: 'audit_finding', label: '内审发现问题', route: null, depth: 1 },
  ],
  edges: [
    { id: 'e1', source: 'document:doc-1', target: 'record_template:tmpl-1', relationType: 'has_template', strength: 'validated', label: '绑定模板' },
    { id: 'e2', source: 'record_template:tmpl-1', target: 'record:rec-1', relationType: 'has_record', strength: 'validated', label: '填写记录' },
  ],
  warnings: [
    { id: 'w1', severity: 'warning', message: '记录表单入口未绑定表单模板', sourceNodeId: 'document:doc-1' }
  ],
  meta: {
    sourceType: 'document', sourceId: 'doc-1', maxDepth: 4,
    generatedAt: '2026-04-28T00:00:00Z', truncated: false
  }
}

describe('EvidenceChainGraph', () => {
  it('renders nodes grouped by depth', () => {
    const wrapper = mount(EvidenceChainGraph, { props: { chain: mockChain } })
    // Depth 0 node
    expect(wrapper.text()).toContain('SOP-001 操作规程')
    // Depth 1 nodes
    expect(wrapper.text()).toContain('卫生记录表')
    expect(wrapper.text()).toContain('内审发现问题')
    // Depth 2 node
    expect(wrapper.text()).toContain('2024-01 卫生记录')
  })

  it('renders relation labels', () => {
    const wrapper = mount(EvidenceChainGraph, { props: { chain: mockChain } })
    expect(wrapper.text()).toContain('绑定模板')
  })

  it('renders warnings', () => {
    const wrapper = mount(EvidenceChainGraph, { props: { chain: mockChain } })
    expect(wrapper.text()).toContain('记录表单入口未绑定表单模板')
  })

  it('shows empty state when chain is null', () => {
    const wrapper = mount(EvidenceChainGraph, { props: { chain: null } })
    expect(wrapper.text()).toContain('暂无证据链数据')
  })

  it('shows loading state when loading prop is true', () => {
    const wrapper = mount(EvidenceChainGraph, { props: { chain: null, loading: true } })
    // Should show some loading indicator, not empty state
    expect(wrapper.text()).not.toContain('暂无证据链数据')
  })

  it('renders routable nodes without navigation control for non-routable nodes', () => {
    const wrapper = mount(EvidenceChainGraph, { props: { chain: mockChain } })
    // audit_finding:find-1 has route: null — no link/button for it
    // document:doc-1 has route — should have a clickable element
    const links = wrapper.findAll('[data-routable]')
    // Only nodes with non-null route should have the data-routable attribute
    const routeCount = mockChain.nodes.filter(n => n.route).length
    expect(links.length).toBe(routeCount)
  })
})
