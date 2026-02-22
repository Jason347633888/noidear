<template>
  <el-alert
    v-if="!isValidField"
    type="error"
    :title="`字段配置错误: ${validationError}`"
    :closable="false"
    show-icon
  />
  <component
    v-else-if="componentMap[field.type]"
    :is="componentMap[field.type]"
    :key="field.name"
    :model-value="modelValue ?? defaultValue"
    @update:model-value="$emit('update:modelValue', $event)"
    @blur="$emit('blur')"
    @change="$emit('change', $event)"
    :field="field"
  />
  <el-alert
    v-else
    type="warning"
    :title="`未知字段类型: ${field.type}`"
    :closable="false"
    show-icon
  />
</template>

<script setup lang="ts">
import { Component, computed } from 'vue';
import TextField from './TextField.vue';
import TextareaField from './TextareaField.vue';
import NumberField from './NumberField.vue';
import DateField from './DateField.vue';
import TimeField from './TimeField.vue';
import SelectField from './SelectField.vue';
import RadioField from './RadioField.vue';
import CheckboxField from './CheckboxField.vue';
import FileUploadField from './FileUploadField.vue';
import ImageUploadField from './ImageUploadField.vue';
import SignatureField from './SignatureField.vue';
import SwitchField from './SwitchField.vue';
import CascaderField from './CascaderField.vue';
import RateField from './RateField.vue';
import SliderField from './SliderField.vue';
import ColorField from './ColorField.vue';
import PasswordField from './PasswordField.vue';
import DateRangeField from './DateRangeField.vue';
import TimeRangeField from './TimeRangeField.vue';
import RichTextField from './RichTextField.vue';

export interface FieldConfig {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  options?: Array<{ label: string; value: any }>;
  accept?: string;
  [key: string]: any;
}

const props = defineProps<{
  modelValue: any;
  field: FieldConfig;
}>();

defineEmits<{
  (e: 'update:modelValue', value: any): void;
  (e: 'blur'): void;
  (e: 'change', value: any): void;
}>();

// 字段类型映射表
const componentMap: Record<string, Component> = {
  text: TextField,
  textarea: TextareaField,
  number: NumberField,
  date: DateField,
  time: TimeField,
  select: SelectField,
  radio: RadioField,
  checkbox: CheckboxField,
  file: FileUploadField,
  image: ImageUploadField,
  signature: SignatureField,
  switch: SwitchField,
  cascader: CascaderField,
  rate: RateField,
  slider: SliderField,
  color: ColorField,
  password: PasswordField,
  daterange: DateRangeField,
  timerange: TimeRangeField,
  richtext: RichTextField,
};

// 字段验证
const validationError = computed(() => {
  if (!props.field) return '字段对象为空';
  if (!props.field.name) return '缺少字段名称 (name)';
  if (!props.field.label) return '缺少字段标签 (label)';
  if (!props.field.type) return '缺少字段类型 (type)';

  // 验证 options 结构（Select/Radio/Checkbox 必须）
  const requireOptions = ['select', 'radio', 'checkbox'];
  if (requireOptions.includes(props.field.type)) {
    if (!Array.isArray(props.field.options)) {
      return '字段类型需要 options 数组';
    }
    if (props.field.options.length === 0) {
      return 'options 不能为空';
    }
    const invalidOption = props.field.options.find(
      (opt) => !opt || typeof opt.label === 'undefined' || typeof opt.value === 'undefined'
    );
    if (invalidOption) {
      return 'options 格式错误，需包含 label 和 value';
    }
  }

  return '';
});

const isValidField = computed(() => !validationError.value);

// 默认值处理
const defaultValue = computed(() => {
  if (props.field.type === 'checkbox') return [];
  if (props.field.type === 'number' || props.field.type === 'rate' || props.field.type === 'slider') return null;
  if (props.field.type === 'switch') return false;
  if (props.field.type === 'cascader') return [];
  if (props.field.type === 'daterange' || props.field.type === 'timerange') return null;
  if (props.field.type === 'file' || props.field.type === 'image' || props.field.type === 'signature') return '';
  return '';
});
</script>
