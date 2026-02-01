<template>
  <el-form :model="formData" :rules="rules" ref="formRef" v-bind="$attrs">
    <el-form-item
      v-for="field in fields"
      :key="field.name"
      :label="field.label"
      :prop="field.name"
      :required="field.required"
    >
      <!-- 文本输入 -->
      <el-input
        v-if="field.type === 'text'"
        v-model="formData[field.name]"
        :placeholder="`请输入${field.label}`"
        clearable
      />

      <!-- 多行文本 -->
      <el-input
        v-else-if="field.type === 'textarea'"
        v-model="formData[field.name]"
        type="textarea"
        :rows="3"
        :placeholder="`请输入${field.label}`"
        clearable
      />

      <!-- 数字 -->
      <el-input-number
        v-else-if="field.type === 'number'"
        v-model="formData[field.name]"
        :placeholder="`请输入${field.label}`"
        controls-position="right"
      />

      <!-- 日期 -->
      <el-date-picker
        v-else-if="field.type === 'date'"
        v-model="formData[field.name]"
        type="date"
        placeholder="选择日期"
        value-format="YYYY-MM-DD"
      />

      <!-- 下拉选择 -->
      <el-select
        v-else-if="field.type === 'select'"
        v-model="formData[field.name]"
        :placeholder="`请选择${field.label}`"
        clearable
      >
        <el-option
          v-for="opt in field.options"
          :key="String(opt.value)"
          :label="opt.label"
          :value="opt.value"
        />
      </el-select>

      <!-- 开关 -->
      <el-switch
        v-else-if="field.type === 'boolean'"
        v-model="formData[field.name]"
      />
    </el-form-item>
    <slot />
  </el-form>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';

export interface TemplateField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'boolean';
  required: boolean;
  options?: { label: string; value: string | number }[];
}

const props = withDefaults(
  defineProps<{
    fields: TemplateField[];
    modelValue?: Record<string, unknown>;
    disabled?: boolean;
  }>(),
  {
    modelValue: () => ({}),
    disabled: false,
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, unknown>): void;
  (e: 'submit', value: Record<string, unknown>): void;
}>();

const formRef = ref<FormInstance>();
const formData = reactive<Record<string, unknown>>({});
const rules = reactive<FormRules>({});

// 初始化表单数据和验证规则
const initForm = () => {
  Object.keys(formData).forEach((key) => delete formData[key]);
  Object.keys(rules).forEach((key) => delete rules[key]);

  props.fields.forEach((field) => {
    formData[field.name] = props.modelValue[field.name] ?? getDefaultValue(field.type);
    rules[field.name] = getValidationRules(field);
  });
};

const getDefaultValue = (type: string): unknown => {
  switch (type) {
    case 'number':
      return 0;
    case 'boolean':
      return false;
    case 'date':
      return '';
    default:
      return '';
  }
};

const getValidationRules = (field: TemplateField) => {
  const rules: unknown[] = [];

  if (field.required) {
    rules.push({
      required: true,
      message: `请${field.type === 'select' ? '选择' : '输入'}${field.label}`,
      trigger: field.type === 'select' ? 'change' : 'blur',
    });
  }

  return rules;
};

// 监听字段变化
watch(
  () => props.fields,
  () => initForm(),
  { deep: true },
);

// 监听值变化
watch(
  formData,
  (val) => emit('update:modelValue', val),
  { deep: true },
);

// 暴露方法
defineExpose({
  validate: () => formRef.value?.validate(),
  validateField: (prop: string) => formRef.value?.validateField(prop),
  resetFields: () => formRef.value?.resetFields(),
  clearValidate: () => formRef.value?.clearValidate(),
  submit: () => emit('submit', { ...formData }),
});

onMounted(() => {
  initForm();
});
</script>
