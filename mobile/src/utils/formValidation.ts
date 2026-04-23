import type { FormField, FormRule } from '@/types'

const isEmpty = (value: unknown): boolean => {
  if (value === undefined || value === null) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  return false
}

const validateRule = (rule: FormRule, value: unknown, label: string): string | null => {
  switch (rule.type) {
    case 'required':
      if (isEmpty(value)) return rule.message || `${label}不能为空`
      break
    case 'pattern':
      if (typeof value === 'string' && rule.value) {
        const regex = new RegExp(rule.value as string)
        if (!regex.test(value)) return rule.message
      }
      break
    case 'min':
      if (typeof value === 'number' && typeof rule.value === 'number' && value < rule.value) {
        return rule.message
      }
      break
    case 'max':
      if (typeof value === 'number' && typeof rule.value === 'number' && value > rule.value) {
        return rule.message
      }
      break
    case 'minLength':
      if (typeof value === 'string' && typeof rule.value === 'number' && value.length < rule.value) {
        return rule.message
      }
      break
    case 'maxLength':
      if (typeof value === 'string' && typeof rule.value === 'number' && value.length > rule.value) {
        return rule.message
      }
      break
    case 'custom':
      if (rule.validator && !rule.validator(value)) return rule.message
      break
    case 'checkedTextRequired': {
      const objectValue = value as { checked?: boolean; text?: string }
      if (objectValue?.checked && !objectValue.text?.trim()) {
        return rule.message || `${label}说明不能为空`
      }
      break
    }
  }

  return null
}

const validateTable = (field: FormField, value: unknown): string | null => {
  if (!Array.isArray(value)) return field.required ? `${field.label}不能为空` : null
  if (field.required && value.length === 0) return `${field.label}不能为空`

  const rowSchema = field.rowSchema || field.columns?.map((col) => ({
    name: col.key,
    label: col.label,
    type: col.type || 'text',
    required: col.required || false,
  } as FormField)) || []

  for (let rowIndex = 0; rowIndex < value.length; rowIndex++) {
    const row = value[rowIndex] as Record<string, unknown>
    for (const child of rowSchema) {
      if (child.required && isEmpty(row?.[child.name])) {
        return `第${rowIndex + 1}行${child.label}不能为空`
      }
    }
  }

  return null
}

export const validateMobileField = (field: FormField, value: unknown): string | null => {
  if (field.type === 'table-input') return validateTable(field, value)
  if (field.required && isEmpty(value)) return `${field.label}不能为空`

  const rules = [...(field.rules || []), ...(field.validation || [])]
  for (const rule of rules) {
    const error = validateRule(rule, value, field.label)
    if (error) return error
  }

  if ((field.type === 'number' || field.type === 'constrained-number') && typeof value === 'number') {
    if (field.min !== undefined && value < field.min) return `${field.label}不能小于${field.min}`
    if (field.max !== undefined && value > field.max) return `${field.label}不能大于${field.max}`
  }

  if (field.pattern && typeof value === 'string' && !new RegExp(field.pattern).test(value)) {
    return field.patternMessage || `${field.label}格式不正确`
  }

  if (field.maxLength && typeof value === 'string' && value.length > field.maxLength) {
    return `${field.label}不能超过${field.maxLength}个字符`
  }

  return null
}
