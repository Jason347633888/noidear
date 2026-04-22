import { describe, expect, it } from 'vitest';
import { validateFields } from '../validators';
import type { FormValidationField } from '../types';

describe('validateFields', () => {
  it('validates required text fields', () => {
    const fields: FormValidationField[] = [
      { name: 'productName', label: '开发产品名称', type: 'text', required: true },
    ];

    const result = validateFields(fields, { productName: '' });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      {
        fieldKey: 'productName',
        errorCode: 'REQUIRED',
        message: '开发产品名称不能为空',
        severity: 'error',
      },
    ]);
  });

  it('validates number min and max', () => {
    const fields: FormValidationField[] = [
      { name: 'output', label: '产量', type: 'number', min: 1, max: 100 },
    ];

    expect(validateFields(fields, { output: 0 }).errors[0].message).toBe('产量不能小于1');
    expect(validateFields(fields, { output: 101 }).errors[0].message).toBe('产量不能大于100');
    expect(validateFields(fields, { output: 50 }).valid).toBe(true);
  });

  it('validates table row required fields', () => {
    const fields: FormValidationField[] = [
      {
        name: 'ingredients',
        label: '配料表',
        type: 'table-input',
        required: true,
        rowSchema: [
          { name: 'name', label: '配料名称', type: 'text', required: true },
          { name: 'weight', label: '重量', type: 'text', required: true },
        ],
      },
    ];

    const result = validateFields(fields, {
      ingredients: [{ name: '鸡蛋', weight: '' }],
    });

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatchObject({
      fieldKey: 'ingredients',
      errorCode: 'ROW_REQUIRED',
      rowIndex: 0,
      childKey: 'weight',
      message: '第1行重量不能为空',
    });
  });

  it('validates checkbox text fields when checked', () => {
    const fields: FormValidationField[] = [
      {
        name: 'allergen',
        label: '引入的食品安全危害（含过敏源）',
        type: 'checkbox-text',
        validation: [{ type: 'checkedTextRequired', message: '勾选后必须填写危害说明' }],
      },
    ];

    const result = validateFields(fields, {
      allergen: { checked: true, text: '' },
    });

    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toBe('勾选后必须填写危害说明');
  });

  it('skips invisible conditional fields', () => {
    const fields: FormValidationField[] = [
      {
        name: 'standardOther',
        label: '标准编号',
        type: 'text',
        required: true,
        visibility: { field: 'standard', equals: '其他' },
      },
    ];

    expect(validateFields(fields, { standard: '国标 GB7099', standardOther: '' }).valid).toBe(true);
    expect(validateFields(fields, { standard: '其他', standardOther: '' }).valid).toBe(false);
  });
});
