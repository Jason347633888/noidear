import { ConditionParser } from '../src/modules/workflow/condition-parser';

describe('ConditionParser', () => {
  describe('parse', () => {
    it('should parse > operator', () => {
      const result = ConditionParser.parse('amount > 10000');
      expect(result.field).toBe('amount');
      expect(result.operator).toBe('>');
      expect(result.value).toBe(10000);
    });

    it('should parse >= operator', () => {
      const result = ConditionParser.parse('score >= 90');
      expect(result.operator).toBe('>=');
    });

    it('should parse == operator with string value', () => {
      const result = ConditionParser.parse('status == approved');
      expect(result.field).toBe('status');
      expect(result.operator).toBe('==');
      expect(result.value).toBe('approved');
    });

    it('should parse != operator', () => {
      const result = ConditionParser.parse('priority != low');
      expect(result.operator).toBe('!=');
    });

    it('should throw on invalid expression', () => {
      expect(() => ConditionParser.parse('invalid expression without operator')).toThrow();
    });
  });

  describe('evaluate', () => {
    it('should evaluate numeric > correctly', () => {
      expect(ConditionParser.evaluate('amount > 10000', { amount: 15000 })).toBe(true);
      expect(ConditionParser.evaluate('amount > 10000', { amount: 5000 })).toBe(false);
    });

    it('should evaluate string == correctly', () => {
      expect(ConditionParser.evaluate('status == approved', { status: 'approved' })).toBe(true);
      expect(ConditionParser.evaluate('status == approved', { status: 'rejected' })).toBe(false);
    });

    it('should evaluate string != correctly', () => {
      expect(ConditionParser.evaluate('priority != low', { priority: 'high' })).toBe(true);
      expect(ConditionParser.evaluate('priority != low', { priority: 'low' })).toBe(false);
    });

    it('should return false when field is missing from context', () => {
      expect(ConditionParser.evaluate('amount > 100', {})).toBe(false);
    });

    it('should evaluate <= correctly', () => {
      expect(ConditionParser.evaluate('score <= 60', { score: 60 })).toBe(true);
      expect(ConditionParser.evaluate('score <= 60', { score: 61 })).toBe(false);
    });

    it('should evaluate < correctly', () => {
      expect(ConditionParser.evaluate('count < 5', { count: 4 })).toBe(true);
      expect(ConditionParser.evaluate('count < 5', { count: 5 })).toBe(false);
    });
  });
});
