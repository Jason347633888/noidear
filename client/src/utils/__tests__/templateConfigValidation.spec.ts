import { describe, expect, it } from 'vitest';
import { validateTemplateFields } from '../templateConfigValidation';

describe('templateConfigValidation', () => {
  it('rejects an empty field list', () => {
    const result = validateTemplateFields([]);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(['请至少添加一个字段']);
  });

  it('rejects duplicate field names after trimming', () => {
    const result = validateTemplateFields([
      { name: ' productName ', label: '产品名称', type: 'text' },
      { name: 'productName', label: '备用名称', type: 'text' },
    ]);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('字段名 productName 重复');
  });

  it('rejects option fields without a valid option', () => {
    const result = validateTemplateFields([
      {
        name: 'standard',
        label: '适用标准',
        type: 'select',
        options: [
          { label: '', value: 'a' },
          { label: '  ', value: '' },
          { label: '有效标签', value: undefined },
        ],
      },
    ]);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('适用标准 至少需要一个有效选项');
  });

  it('rejects numeric ranges where min is greater than max', () => {
    const result = validateTemplateFields([
      {
        name: 'output',
        label: '产量',
        type: 'number',
        min: 10,
        max: 5,
      },
    ]);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('产量 的最小值不能大于最大值');
  });
});
