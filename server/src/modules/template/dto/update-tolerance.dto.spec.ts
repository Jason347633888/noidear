import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateToleranceDto, ToleranceConfigItemDto } from './update-tolerance.dto';

describe('UpdateToleranceDto', () => {
  async function validateConfigItem(plain: Record<string, unknown>) {
    const dto = plainToInstance(ToleranceConfigItemDto, plain);
    return validate(dto);
  }

  // =========================================================================
  // ToleranceConfigItemDto validation
  // =========================================================================
  describe('ToleranceConfigItemDto', () => {
    it('should pass for valid range config', async () => {
      const errors = await validateConfigItem({
        type: 'range',
        min: 0,
        max: 10,
      });
      expect(errors).toHaveLength(0);
    });

    it('should pass for valid percentage config', async () => {
      const errors = await validateConfigItem({
        type: 'percentage',
        percentage: 5,
      });
      expect(errors).toHaveLength(0);
    });

    it('should fail for invalid type', async () => {
      const errors = await validateConfigItem({
        type: 'invalid',
        min: 0,
        max: 10,
      });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail when type is missing', async () => {
      const errors = await validateConfigItem({
        min: 0,
        max: 10,
      });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail for negative min value', async () => {
      const errors = await validateConfigItem({
        type: 'range',
        min: -5,
        max: 10,
      });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail for negative max value', async () => {
      const errors = await validateConfigItem({
        type: 'range',
        min: 0,
        max: -1,
      });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail for percentage > 100', async () => {
      const errors = await validateConfigItem({
        type: 'percentage',
        percentage: 150,
      });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail for percentage < 0', async () => {
      const errors = await validateConfigItem({
        type: 'percentage',
        percentage: -5,
      });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should pass for percentage = 0', async () => {
      const errors = await validateConfigItem({
        type: 'percentage',
        percentage: 0,
      });
      expect(errors).toHaveLength(0);
    });

    it('should pass for percentage = 100', async () => {
      const errors = await validateConfigItem({
        type: 'percentage',
        percentage: 100,
      });
      expect(errors).toHaveLength(0);
    });

    it('should allow min and max to be optional for percentage type', async () => {
      const errors = await validateConfigItem({
        type: 'percentage',
        percentage: 10,
      });
      expect(errors).toHaveLength(0);
    });

    it('should allow percentage to be optional for range type', async () => {
      const errors = await validateConfigItem({
        type: 'range',
        min: 0,
        max: 100,
      });
      expect(errors).toHaveLength(0);
    });
  });

  // =========================================================================
  // UpdateToleranceDto top-level validation
  // =========================================================================
  describe('UpdateToleranceDto top-level', () => {
    it('should pass for valid config map with single field', async () => {
      const dto = plainToInstance(UpdateToleranceDto, {
        config: {
          temp: { type: 'range', min: 175, max: 185 },
        },
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass for valid config map with multiple fields', async () => {
      const dto = plainToInstance(UpdateToleranceDto, {
        config: {
          temp: { type: 'range', min: 175, max: 185 },
          pressure: { type: 'percentage', percentage: 5 },
        },
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail when config is missing', async () => {
      const dto = plainToInstance(UpdateToleranceDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
