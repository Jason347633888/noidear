import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { TemplateFieldDto, CreateTemplateDto } from './index';

describe('TemplateFieldDto Validation', () => {
  describe('Original 6 Field Types', () => {
    const originalTypes = ['text', 'textarea', 'number', 'date', 'select', 'boolean'];

    it.each(originalTypes)('should accept field type: %s', async (type) => {
      const field = plainToInstance(TemplateFieldDto, {
        name: 'test_field',
        label: 'Test Field',
        type,
        required: true,
      });

      const errors = await validate(field);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Extended Field Types', () => {
    const extendedTypes = [
      'email', 'phone', 'url', 'time', 'datetime',
      'radio', 'checkbox', 'switch', 'slider', 'rate',
      'color', 'file', 'image', 'cascader', 'richtext',
    ];

    it.each(extendedTypes)('should accept extended field type: %s', async (type) => {
      const field = plainToInstance(TemplateFieldDto, {
        name: 'test_field',
        label: 'Test Field',
        type,
        required: false,
      });

      const errors = await validate(field);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Boolean required field (CRITICAL-1: frontend sends boolean, not string)', () => {
    it('should accept required: true (boolean) from frontend', async () => {
      const field = plainToInstance(TemplateFieldDto, {
        name: 'test_field',
        label: 'Test Field',
        type: 'text',
        required: true,
      });

      const errors = await validate(field);
      const requiredErrors = errors.filter((e) => e.property === 'required');
      expect(requiredErrors).toHaveLength(0);
    });

    it('should accept required: false (boolean) from frontend', async () => {
      const field = plainToInstance(TemplateFieldDto, {
        name: 'test_field',
        label: 'Test Field',
        type: 'text',
        required: false,
      });

      const errors = await validate(field);
      const requiredErrors = errors.filter((e) => e.property === 'required');
      expect(requiredErrors).toHaveLength(0);
    });

    it('should reject required: "notaboolean" (invalid string)', async () => {
      const field = plainToInstance(TemplateFieldDto, {
        name: 'test_field',
        label: 'Test Field',
        type: 'text',
        required: 'notaboolean',
      });

      const errors = await validate(field);
      const requiredErrors = errors.filter((e) => e.property === 'required');
      expect(requiredErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Invalid Field Types', () => {
    it('should reject invalid field type', async () => {
      const field = plainToInstance(TemplateFieldDto, {
        name: 'test_field',
        label: 'Test Field',
        type: 'invalid_type_xyz',
        required: true,
      });

      const errors = await validate(field);
      const typeErrors = errors.filter((e) => e.property === 'type');
      expect(typeErrors.length).toBeGreaterThan(0);
    });

    it('should reject empty type', async () => {
      const field = plainToInstance(TemplateFieldDto, {
        name: 'test_field',
        label: 'Test Field',
        type: '',
        required: true,
      });

      const errors = await validate(field);
      const typeErrors = errors.filter((e) => e.property === 'type');
      expect(typeErrors.length).toBeGreaterThan(0);
    });
  });

  describe('CreateTemplateDto with Mixed Field Types', () => {
    const allFieldTypes = [
      'text', 'textarea', 'number', 'date', 'select', 'boolean',
      'email', 'phone', 'url', 'time', 'datetime',
      'radio', 'checkbox', 'switch', 'slider', 'rate',
      'color', 'file', 'image', 'cascader', 'richtext',
    ];

    it('should accept template with all 21 field types', async () => {
      const fields = allFieldTypes.map((type, i) => ({
        name: `field_${i}`,
        label: `Field ${i}`,
        type,
        required: true,
      }));

      const dto = plainToInstance(CreateTemplateDto, {
        level: 1,
        title: 'All Types Template',
        fields,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept template with select type and options', async () => {
      const dto = plainToInstance(CreateTemplateDto, {
        level: 2,
        title: 'Select Template',
        fields: [
          {
            name: 'color',
            label: 'Color',
            type: 'select',
            required: true,
            options: [
              { label: 'Red', value: 'red' },
              { label: 'Blue', value: 'blue' },
            ],
          },
        ],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject template with empty title', async () => {
      const dto = plainToInstance(CreateTemplateDto, {
        level: 1,
        title: '',
        fields: [{ name: 'f', label: 'F', type: 'text', required: true }],
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject template with level > 4', async () => {
      const dto = plainToInstance(CreateTemplateDto, {
        level: 5,
        title: 'Invalid Level',
        fields: [{ name: 'f', label: 'F', type: 'text', required: true }],
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject template with level < 1', async () => {
      const dto = plainToInstance(CreateTemplateDto, {
        level: 0,
        title: 'Invalid Level',
        fields: [{ name: 'f', label: 'F', type: 'text', required: true }],
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
