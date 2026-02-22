/**
 * 简单条件表达式解析器
 * TASK-385: BR-335 排他网关支持条件分支（IF-ELSE）
 * 支持格式：fieldName operator value
 * 示例：amount > 10000 | status == approved | priority != low
 */

type Operator = '>' | '<' | '>=' | '<=' | '==' | '!=';

interface ParsedCondition {
  field: string;
  operator: Operator;
  value: string | number;
}

const VALID_OPERATORS: Operator[] = ['>=', '<=', '!=', '>', '<', '=='];

export class ConditionParser {
  /**
   * 解析条件表达式字符串
   */
  static parse(expression: string): ParsedCondition {
    const trimmed = expression.trim();
    for (const op of VALID_OPERATORS) {
      const idx = trimmed.indexOf(op);
      if (idx === -1) continue;

      const field = trimmed.slice(0, idx).trim();
      const rawValue = trimmed.slice(idx + op.length).trim();

      if (!field || !rawValue) continue;

      const value = isNaN(Number(rawValue)) ? rawValue : Number(rawValue);
      return { field, operator: op, value };
    }
    throw new Error(`无法解析条件表达式: "${expression}"`);
  }

  /**
   * 基于上下文对象求值条件
   */
  static evaluate(expression: string, context: Record<string, unknown>): boolean {
    const { field, operator, value } = this.parse(expression);
    const contextValue = context[field];

    if (contextValue === undefined || contextValue === null) return false;

    const numContext = Number(contextValue);
    const numValue = Number(value);

    // 数值比较
    if (!isNaN(numContext) && !isNaN(numValue)) {
      return this.compareNumbers(numContext, numValue, operator);
    }

    // 字符串比较（仅支持 == 和 !=）
    const strContext = String(contextValue);
    const strValue = String(value);
    if (operator === '==') return strContext === strValue;
    if (operator === '!=') return strContext !== strValue;

    return false;
  }

  private static compareNumbers(a: number, b: number, op: Operator): boolean {
    switch (op) {
      case '>': return a > b;
      case '<': return a < b;
      case '>=': return a >= b;
      case '<=': return a <= b;
      case '==': return a === b;
      case '!=': return a !== b;
    }
  }
}
