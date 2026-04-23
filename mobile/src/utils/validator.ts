/**
 * Form validation utility
 */
import type { FormField } from '@/types'
import { validateMobileField } from './formValidation'

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
  return validateMobileField(field, value)
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
