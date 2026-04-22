import type { FormValidationError, FormValidationField, FormValidationResult } from './types';
import { getObjectBoolean, getObjectText, isEmptyValue, toNumber } from './value';

const error = (
  field: FormValidationField,
  errorCode: string,
  message: string,
  extra: Partial<FormValidationError> = {},
): FormValidationError => ({
  fieldKey: field.name,
  errorCode,
  message,
  severity: 'error',
  ...extra,
});

const isVisible = (field: FormValidationField, values: Record<string, unknown>): boolean => {
  if (!field.visibility) return true;
  return values[field.visibility.field] === field.visibility.equals;
};

const validateRequired = (field: FormValidationField, value: unknown): FormValidationError[] => {
  if (!field.required || !isEmptyValue(value)) return [];
  return [error(field, 'REQUIRED', `${field.label}不能为空`)];
};

const validatePattern = (field: FormValidationField, value: unknown): FormValidationError[] => {
  if (!field.pattern || isEmptyValue(value) || typeof value !== 'string') return [];

  return new RegExp(field.pattern).test(value)
    ? []
    : [error(field, 'PATTERN', field.patternMessage || `${field.label}格式不正确`)];
};

const validateNumber = (field: FormValidationField, value: unknown): FormValidationError[] => {
  if (isEmptyValue(value)) return [];

  const numeric = toNumber(value);
  if (numeric === null) return [error(field, 'NUMBER', `${field.label}必须是数字`)];
  if (typeof field.min === 'number' && numeric < field.min) {
    return [error(field, 'MIN', `${field.label}不能小于${field.min}`)];
  }
  if (typeof field.max === 'number' && numeric > field.max) {
    return [error(field, 'MAX', `${field.label}不能大于${field.max}`)];
  }

  return [];
};

const validateTable = (field: FormValidationField, value: unknown): FormValidationError[] => {
  if (!Array.isArray(value)) {
    return field.required ? [error(field, 'REQUIRED', `${field.label}不能为空`)] : [];
  }
  if (field.required && value.length === 0) return [error(field, 'REQUIRED', `${field.label}不能为空`)];

  const rowFields =
    field.rowSchema ||
    (field.columns || []).map((col) => ({
      name: col.key,
      label: col.label,
      type: col.type || 'text',
      required: col.required,
    }));

  const errors: FormValidationError[] = [];
  value.forEach((row, rowIndex) => {
    rowFields.forEach((child) => {
      if (!child.required) return;

      const childValue =
        row && typeof row === 'object' ? (row as Record<string, unknown>)[child.name] : undefined;

      if (isEmptyValue(childValue)) {
        errors.push(
          error(field, 'ROW_REQUIRED', `第${rowIndex + 1}行${child.label}不能为空`, {
            rowIndex,
            childKey: child.name,
          }),
        );
      }
    });
  });

  return errors;
};

const validateCheckboxText = (field: FormValidationField, value: unknown): FormValidationError[] => {
  const rule = field.validation?.find((candidate) => candidate.type === 'checkedTextRequired');
  if (!rule || !getObjectBoolean(value, 'checked') || getObjectText(value, 'text')) return [];

  return [error(field, 'CHECKED_TEXT_REQUIRED', rule.message || `${field.label}说明不能为空`)];
};

export const validateFieldValue = (
  field: FormValidationField,
  value: unknown,
  values: Record<string, unknown>,
): FormValidationError[] => {
  if (field.disabled || field.readonly || !isVisible(field, values)) return [];
  if (field.type === 'table-input') return validateTable(field, value);
  if (field.type === 'checkbox-text') return validateCheckboxText(field, value);

  if (field.type === 'number' || field.type === 'constrained-number') {
    return [...validateRequired(field, value), ...validateNumber(field, value), ...validatePattern(field, value)];
  }

  return [...validateRequired(field, value), ...validatePattern(field, value)];
};

export const validateFields = (
  fields: FormValidationField[],
  values: Record<string, unknown>,
): FormValidationResult => {
  const errors = fields.flatMap((field) => validateFieldValue(field, values[field.name], values));
  return { valid: errors.length === 0, errors };
};
