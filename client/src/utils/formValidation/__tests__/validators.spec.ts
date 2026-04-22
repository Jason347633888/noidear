import { describe, expect, it } from 'vitest';
import type { FormValidationError, FormValidationField } from '../types';

describe('form validation types', () => {
  it('supports table row schema and validation metadata', () => {
    const field: FormValidationField = {
      name: 'ingredients',
      label: '配料表',
      type: 'table-input',
      required: true,
      rowSchema: [
        { name: 'name', label: '配料名称', type: 'text', required: true },
        { name: 'weight', label: '重量', type: 'text', required: true },
      ],
    };

    const error: FormValidationError = {
      fieldKey: 'ingredients',
      errorCode: 'ROW_REQUIRED',
      message: '第1行配料名称不能为空',
      severity: 'error',
      rowIndex: 0,
      childKey: 'name',
    };

    expect(field.rowSchema?.[0].name).toBe('name');
    expect(error.childKey).toBe('name');
  });
});
