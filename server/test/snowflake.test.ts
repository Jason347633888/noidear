import { Snowflake } from '../src/common/utils/snowflake';

describe('Snowflake', () => {
  it('should generate unique IDs', () => {
    const snowflake = new Snowflake(1, 1);
    const id1 = snowflake.nextId();
    const id2 = snowflake.nextId();
    expect(id1).not.toBe(id2);
  });

  it('should generate string ID with proper length', () => {
    const snowflake = new Snowflake(1, 1);
    const id = snowflake.nextId();
    expect(typeof id).toBe('string');
    // Snowflake ID should be 18-19 digits
    expect(id.length).toBeGreaterThanOrEqual(18);
  });
});
