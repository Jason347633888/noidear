/**
 * All 21 supported field types for templates.
 * Each entry defines the value stored in the database, the display label,
 * the Element Plus component used for rendering, and whether options are needed.
 *
 * CRITICAL-1: Expands from the original 6 types to 21 types.
 */

export interface FieldTypeDefinition {
  /** Value stored in database */
  value: string;
  /** Chinese label shown in UI */
  label: string;
  /** Grouping category for the type selector */
  group: 'input' | 'selection' | 'special';
  /** Whether this type requires an options list */
  needsOptions: boolean;
}

/**
 * Complete list of all 21 field types, organized by group.
 */
export const FIELD_TYPES: FieldTypeDefinition[] = [
  // Input types (11)
  { value: 'text', label: '文本', group: 'input', needsOptions: false },
  { value: 'textarea', label: '多行文本', group: 'input', needsOptions: false },
  { value: 'number', label: '数字', group: 'input', needsOptions: false },
  { value: 'date', label: '日期', group: 'input', needsOptions: false },
  { value: 'time', label: '时间', group: 'input', needsOptions: false },
  { value: 'datetime', label: '日期时间', group: 'input', needsOptions: false },
  { value: 'email', label: '邮箱', group: 'input', needsOptions: false },
  { value: 'phone', label: '电话', group: 'input', needsOptions: false },
  { value: 'url', label: '链接', group: 'input', needsOptions: false },
  { value: 'boolean', label: '布尔', group: 'input', needsOptions: false },
  { value: 'switch', label: '开关', group: 'input', needsOptions: false },

  // Selection types (5)
  { value: 'select', label: '下拉选择', group: 'selection', needsOptions: true },
  { value: 'radio', label: '单选', group: 'selection', needsOptions: true },
  { value: 'checkbox', label: '多选', group: 'selection', needsOptions: true },
  { value: 'cascader', label: '级联选择', group: 'selection', needsOptions: true },
  { value: 'slider', label: '滑块', group: 'selection', needsOptions: false },
  { value: 'rate', label: '评分', group: 'selection', needsOptions: false },

  // Special types (4)
  { value: 'color', label: '颜色', group: 'special', needsOptions: false },
  { value: 'file', label: '文件', group: 'special', needsOptions: false },
  { value: 'image', label: '图片', group: 'special', needsOptions: false },
  { value: 'richtext', label: '富文本', group: 'special', needsOptions: false },
];

/**
 * All field type values as a union type.
 */
export type FieldTypeValue = typeof FIELD_TYPES[number]['value'];

/**
 * Grouped field types for use in el-select with option groups.
 */
export const FIELD_TYPE_GROUPS = [
  {
    label: '输入类型',
    types: FIELD_TYPES.filter((t) => t.group === 'input'),
  },
  {
    label: '选择类型',
    types: FIELD_TYPES.filter((t) => t.group === 'selection'),
  },
  {
    label: '特殊类型',
    types: FIELD_TYPES.filter((t) => t.group === 'special'),
  },
];

/**
 * Lookup map: value -> FieldTypeDefinition
 */
export const FIELD_TYPE_MAP: Record<string, FieldTypeDefinition> = Object.fromEntries(
  FIELD_TYPES.map((t) => [t.value, t]),
);

/**
 * Check if a field type needs options (used in TemplateEdit.vue).
 */
export function fieldTypeNeedsOptions(type: string): boolean {
  return FIELD_TYPE_MAP[type]?.needsOptions ?? false;
}
