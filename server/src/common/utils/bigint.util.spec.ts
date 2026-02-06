import { convertBigIntToNumber } from './bigint.util';

describe('convertBigIntToNumber', () => {
  it('应该将 BigInt 转换为 Number', () => {
    const input = BigInt(123456);
    const result = convertBigIntToNumber(input);
    expect(result).toBe(123456);
    expect(typeof result).toBe('number');
  });

  it('应该处理 null 和 undefined', () => {
    expect(convertBigIntToNumber(null)).toBeNull();
    expect(convertBigIntToNumber(undefined)).toBeUndefined();
  });

  it('应该处理数组中的 BigInt', () => {
    const input = [BigInt(1), BigInt(2), BigInt(3)];
    const result = convertBigIntToNumber(input);
    expect(result).toEqual([1, 2, 3]);
  });

  it('应该处理对象中的 BigInt', () => {
    const input = {
      id: BigInt(123),
      name: 'test',
      count: BigInt(456),
    };
    const result = convertBigIntToNumber(input);
    expect(result).toEqual({
      id: 123,
      name: 'test',
      count: 456,
    });
  });

  it('应该递归处理嵌套对象', () => {
    const input = {
      id: BigInt(1),
      nested: {
        value: BigInt(2),
        array: [BigInt(3), BigInt(4)],
      },
    };
    const result = convertBigIntToNumber(input);
    expect(result).toEqual({
      id: 1,
      nested: {
        value: 2,
        array: [3, 4],
      },
    });
  });

  it('应该保持非 BigInt 类型不变', () => {
    const input = {
      string: 'test',
      number: 123,
      boolean: true,
      date: new Date('2024-01-01'),
    };
    const result = convertBigIntToNumber(input);
    expect(result.string).toBe('test');
    expect(result.number).toBe(123);
    expect(result.boolean).toBe(true);
    expect(result.date).toBeInstanceOf(Date);
  });
});
