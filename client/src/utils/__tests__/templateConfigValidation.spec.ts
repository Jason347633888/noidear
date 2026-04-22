import { describe, expect, it } from 'vitest';
import { validateTemplateFields } from '../templateConfigValidation';

describe('validateTemplateFields', () => {
  it('rejects empty field lists', () => {
    expect(validateTemplateFields([]).errors[0]).toBe('请至少添加一个字段');
  });

  it('rejects duplicate field names', () => {
    const result = validateTemplateFields([
      { name: 'productName', label: '产品名称', type: 'text', required: true },
      { name: 'productName', label: '产品名称2', type: 'text', required: false },
    ]);

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toBe('字段名 productName 重复');
  });

  it('rejects invalid option fields', () => {
    const result = validateTemplateFields([
      { name: 'standard', label: '适用标准', type: 'radio', required: true, options: [] },
    ]);

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toBe('适用标准 至少需要一个有效选项');
  });

  it('rejects invalid numeric ranges', () => {
    const result = validateTemplateFields([
      { name: 'output', label: '产量', type: 'number', required: true, min: 10, max: 1 },
    ]);

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toBe('产量 的最小值不能大于最大值');
  });
});
