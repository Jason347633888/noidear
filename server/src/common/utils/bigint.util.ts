/**
 * 将对象中的 BigInt 类型转换为 Number 类型。
 * Prisma Decimal 对象保留为稳定字符串，避免被递归成不可读结构。
 */
import { Decimal } from '@prisma/client/runtime/library';

export function convertBigIntToNumber<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'bigint') {
    return Number(obj) as unknown as T;
  }

  if (obj instanceof Decimal) {
    return obj.toString() as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertBigIntToNumber(item)) as unknown as T;
  }

  if (typeof obj === 'object') {
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
