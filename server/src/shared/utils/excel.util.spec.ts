import { addDateRange, filterRow, getFilteredFields } from './excel.util';

describe('excel.util', () => {
  const fields = [
    { key: 'name', label: '名称', width: 20 },
    { key: 'status', label: '状态', width: 10 },
  ];

  it('filters fields by selected keys', () => {
    expect(getFilteredFields(fields, ['status'])).toEqual([{ key: 'status', label: '状态', width: 10 }]);
    expect(getFilteredFields(fields, undefined)).toEqual(fields);
  });

  it('filters row by fields', () => {
    expect(filterRow({ name: 'A', status: 'active', ignored: true } as Record<string, unknown>, fields)).toEqual({ name: 'A', status: 'active' });
  });

  it('adds date range to where object', () => {
    const where: any = {};
    addDateRange(where, 'createdAt', '2026-05-01', '2026-05-12');
    expect(where.createdAt.gte).toEqual(new Date('2026-05-01'));
    expect(where.createdAt.lte).toEqual(new Date('2026-05-12'));
  });
});
