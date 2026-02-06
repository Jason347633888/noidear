/**
 * 将对象中的 BigInt 类型转换为 Number 类型
 * 用于解决 Prisma BigInt 字段序列化问题
 */
export function convertBigIntToNumber<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'bigint') {
    return Number(obj) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertBigIntToNumber(item)) as unknown as T;
  }

  if (typeof obj === 'object') {
    // 跳过特殊对象类型（Date, RegExp 等）
    if (obj instanceof Date || obj instanceof RegExp) {
      return obj;
    }

    const result: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) {
      result[key] = convertBigIntToNumber((obj as Record<string, unknown>)[key]);
    }
    return result as T;
  }

  return obj;
}
