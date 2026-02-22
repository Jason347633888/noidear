/**
 * Form validation utility
 */
import type { FormField, FormRule } from '@/types'

export interface ValidationError {
  field: string
  message: string
}

/**
 * Validate a single field value against its rules
 */
export function validateField(
  field: FormField,
  value: unknown,
): string | null {
  // Required check
  if (field.required) {
    if (value === undefined || value === null || value === '') {
      return `${field.label}不能为空`
    }
    if (Array.isArray(value) && value.length === 0) {
      return `请选择${field.label}`
    }
  }

  // Skip further validation if value is empty and not required
  if (value === undefined || value === null || value === '') {
    return null
  }

  // Custom rules
  if (field.rules) {
    for (const rule of field.rules) {
      const error = applyRule(rule, value, field.label)
      if (error) return error
    }
  }

  // Pattern check
  if (field.pattern && typeof value === 'string') {
    const regex = new RegExp(field.pattern)
    if (!regex.test(value)) {
      return field.patternMessage || `${field.label}格式不正确`
    }
  }

  // Min/Max for numbers
  if (field.type === 'number' && typeof value === 'number') {
    if (field.min !== undefined && value < field.min) {
      return `${field.label}不能小于${field.min}`
    }
    if (field.max !== undefined && value > field.max) {
      return `${field.label}不能大于${field.max}`
    }
  }

  // MaxLength for strings
  if (field.maxLength && typeof value === 'string') {
    if (value.length > field.maxLength) {
      return `${field.label}不能超过${field.maxLength}个字符`
    }
  }

  return null
}

/**
 * Apply a single validation rule
 */
function applyRule(
  rule: FormRule,
  value: unknown,
  label: string,
): string | null {
  switch (rule.type) {
    case 'required':
      if (!value && value !== 0) return rule.message || `${label}不能为空`
      break
    case 'pattern':
      if (typeof value === 'string' && rule.value) {
        const regex = new RegExp(rule.value as string)
        if (!regex.test(value)) return rule.message
      }
      break
    case 'min':
      if (typeof value === 'number' && typeof rule.value === 'number') {
        if (value < rule.value) return rule.message
      }
      break
    case 'max':
      if (typeof value === 'number' && typeof rule.value === 'number') {
        if (value > rule.value) return rule.message
      }
      break
    case 'minLength':
      if (typeof value === 'string' && typeof rule.value === 'number') {
        if (value.length < rule.value) return rule.message
      }
      break
    case 'maxLength':
      if (typeof value === 'string' && typeof rule.value === 'number') {
        if (value.length > rule.value) return rule.message
      }
      break
    case 'custom':
      if (rule.validator && !rule.validator(value)) {
        return rule.message
      }
      break
  }
  return null
}

/**
 * Validate all form fields
 */
export function validateForm(
  fields: FormField[],
  values: Record<string, unknown>,
): ValidationError[] {
  const errors: ValidationError[] = []

  for (const field of fields) {
    const error = validateField(field, values[field.name])
    if (error) {
      errors.push({ field: field.name, message: error })
    }
  }

  return errors
}

/**
 * Check if a value is a valid email
 */
export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

/**
 * Check if a value is a valid phone number (China)
 */
export function isPhone(value: string): boolean {
  return /^1[3-9]\d{9}$/.test(value)
}
