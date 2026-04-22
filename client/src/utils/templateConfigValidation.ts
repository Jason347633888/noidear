export interface TemplateConfigOption {
  label: unknown;
  value: unknown;
}

export interface TemplateConfigField {
  name?: unknown;
  label?: unknown;
  type?: unknown;
  min?: unknown;
  max?: unknown;
  options?: TemplateConfigOption[];
  [key: string]: unknown;
}

export interface TemplateConfigValidationResult {
  valid: boolean;
  errors: string[];
}

const OPTION_FIELD_TYPES = new Set(['select', 'radio', 'checkbox']);

const normalizeText = (value: unknown): string => (
  typeof value === 'string' ? value.trim() : ''
);

const hasMeaningfulValue = (value: unknown): boolean => {
  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  return true;
};

const isValidOption = (option: TemplateConfigOption | undefined): boolean => (
  !!option
  && normalizeText(option.label).length > 0
  && hasMeaningfulValue(option.value)
);

const isFiniteNumber = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value)
);

export function validateTemplateFields(fields: TemplateConfigField[]): TemplateConfigValidationResult {
  const errors: string[] = [];
  if (!Array.isArray(fields) || fields.length === 0) errors.push('请至少添加一个字段');

  const seenNames = new Set<string>();

  (Array.isArray(fields) ? fields : []).forEach((field, index) => {
    const name = normalizeText(field?.name);
    const label = normalizeText(field?.label) || `第${index + 1}个字段`;
    const type = normalizeText(field?.type);

    if (!name) {
      errors.push(`${label} 缺少字段名`);
    }

    if (!normalizeText(field?.label)) {
      errors.push(`${name || label} 缺少标签`);
    }

    if (!type) {
      errors.push(`${name || label} 缺少字段类型`);
    }

    if (name) {
      if (seenNames.has(name)) {
        errors.push(`字段名 ${name} 重复`);
      } else {
        seenNames.add(name);
      }
    }

    if (OPTION_FIELD_TYPES.has(type)) {
      const validOptions = Array.isArray(field?.options)
        ? field.options.filter((option) => isValidOption(option))
        : [];

      if (validOptions.length === 0) {
        errors.push(`${label} 至少需要一个有效选项`);
      }
    }

    if (isFiniteNumber(field?.min) && isFiniteNumber(field?.max) && field.min > field.max) {
      errors.push(`${label} 的最小值不能大于最大值`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
