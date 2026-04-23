import { describe, expect, it } from 'vitest'
import { validateMobileField } from '../formValidation'
import type { FormField } from '@/types'

describe('validateMobileField', () => {
  it('validates table-input rows', () => {
    const field: FormField = {
      name: 'ingredients',
      label: '配料表',
      type: 'table-input',
      required: true,
      rowSchema: [
        { name: 'name', label: '配料名称', type: 'text', required: true },
        { name: 'weight', label: '重量', type: 'text', required: true },
      ],
    }

    expect(validateMobileField(field, [{ name: '', weight: '10kg' }])).toBe('第1行配料名称不能为空')
  })

  it('validates checkbox-text checked state', () => {
    const field: FormField = {
      name: 'allergen',
      label: '引入的食品安全危害（含过敏源）',
      type: 'checkbox-text',
      required: false,
      rules: [{ type: 'checkedTextRequired', message: '勾选后必须填写危害说明' }],
    }

    expect(validateMobileField(field, { checked: true, text: '' })).toBe('勾选后必须填写危害说明')
  })

  it('keeps legacy custom rule validation', () => {
    const field: FormField = {
      name: 'batchNo',
      label: '批次号',
      type: 'text',
      required: false,
      rules: [{ type: 'custom', message: '批次号必须以B开头', validator: (value) => value === 'B001' }],
    }

    expect(validateMobileField(field, 'A001')).toBe('批次号必须以B开头')
  })
})
