import { describe, expect, it } from 'vitest'
import {
  extractTemplateFields,
  getTemplateSourceGroup,
  normalizeTemplatePage,
  sortTemplatesWithPinned,
} from '@/utils/recordTemplate'

describe('recordTemplate utilities', () => {
  it('normalizes backend page shape and fieldsJson fields', () => {
    const page = normalizeTemplatePage({
      data: [
        {
          id: 'tpl-1',
          name: '清洁记录',
          code: 'CC-001',
          description: '仓储组 — 清洁记录.md',
          status: 'active',
          fieldsJson: {
            fields: [{ name: 'area', label: '区域', type: 'text', required: true }],
          },
        },
      ],
      total: 1,
      page: 1,
      limit: 100,
      totalPages: 1,
    })

    expect(page.list[0].fields).toEqual([
      { name: 'area', label: '区域', type: 'text', required: true },
    ])
    expect(page.pageSize).toBe(100)
  })

  it('derives source group from description', () => {
    expect(getTemplateSourceGroup({ description: '制造部 — 投料记录.md' })).toBe('制造部')
    expect(getTemplateSourceGroup({ description: '' })).toBe('未分组')
  })

  it('sorts pinned templates first without hiding unpinned templates', () => {
    const result = sortTemplatesWithPinned(
      [
        { id: 'b', name: 'B' },
        { id: 'a', name: 'A' },
      ],
      ['a'],
    )

    expect(result.map((item) => item.id)).toEqual(['a', 'b'])
  })

  it('extracts empty fields when backend has no fieldsJson', () => {
    expect(extractTemplateFields({})).toEqual([])
  })
})
