<template>
  <el-form
    ref="formRef"
    :model="formData"
    :rules="formRules"
    label-width="120px"
    :disabled="disabled"
  >
    <template v-if="template?.fieldsJson?.fields">
      <el-form-item
        v-for="field in template.fieldsJson.fields"
        :key="field.name"
        :label="field.label"
        :prop="field.name"
        :required="field.required"
      >
        <DynamicField
          v-model="formData[field.name]"
          :field="field"
          @blur="validateField(field.name)"
          @change="handleFieldChange(field.name)"
        />
      </el-form-item>
    </template>
    <el-empty v-else description="模板配置为空" />
  </el-form>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import DynamicField from './fields/DynamicField.vue';
import type { FieldConfig } from './fields/DynamicField.vue';

export interface TemplateFieldsJson {
  fields: FieldConfig[];
}

export interface Template {
  id: string;
  name: string;
  fieldsJson: TemplateFieldsJson;
}

const props = defineProps<{
  template: Template;
  modelValue: Record<string, any>;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, any>): void;
}>();

const formRef = ref<FormInstance>();
const formData = reactive<Record<string, any>>({});
let isUpdating = false;

const initFormData = () => {
  if (!props.template?.fieldsJson?.fields) return;

  isUpdating = true;
  Object.keys(formData).forEach((key) => {
    delete formData[key];
  });

  props.template.fieldsJson.fields.forEach((field) => {
    if (!field.name) return;
    formData[field.name] = getFieldDefaultValue(field, props.modelValue);
  });

  nextTick(() => {
    isUpdating = false;
  });
};

const getFieldDefaultValue = (field: FieldConfig, modelValue?: Record<string, any>) => {
  if (modelValue && typeof modelValue[field.name] !== 'undefined') {
    return modelValue[field.name];
  }
  if (field.type === 'checkbox') return [];
  if (field.type === 'number') return null;
  return '';
};

watch(() => props.template, initFormData, { immediate: true });

watch(
  () => props.modelValue,
  (newVal) => {
    if (isUpdating) return;
    if (!newVal || typeof newVal !== 'object') {
      initFormData();
      return;
    }
    isUpdating = true;
    Object.keys(newVal).forEach((key) => {
      formData[key] = newVal[key];
    });
    nextTick(() => {
      isUpdating = false;
    });
  },
  { deep: true }
);

watch(
  formData,
  (newVal) => {
    if (isUpdating) return;
    emit('update:modelValue', { ...newVal });
  },
  { deep: true }
);

const createRequiredRule = (field: FieldConfig) => ({
  required: true,
  message: `${field.label}不能为空`,
  trigger: ['blur', 'change'],
});

const createMinRule = (field: FieldConfig) => ({
  validator: (_rule: any, value: any, callback: any) => {
    try {
      if (value !== null && value !== '' && value < field.min!) {
        callback(new Error(`${field.label}不能小于${field.min}`));
      } else {
        callback();
      }
    } catch (error) {
      callback(new Error('验证失败'));
    }
  },
  trigger: 'blur',
});

const createMaxRule = (field: FieldConfig) => ({
  validator: (_rule: any, value: any, callback: any) => {
    try {
      if (value !== null && value !== '' && value > field.max!) {
        callback(new Error(`${field.label}不能大于${field.max}`));
      } else {
        callback();
      }
    } catch (error) {
      callback(new Error('验证失败'));
    }
  },
  trigger: 'blur',
});

const createPatternRule = (field: FieldConfig) => ({
  pattern: new RegExp(field.pattern!),
  message: field.patternMessage || `${field.label}格式不正确`,
  trigger: 'blur',
});

const buildFieldRules = (field: FieldConfig) => {
  const rules: any[] = [];
  if (field.required) rules.push(createRequiredRule(field));
  if (field.type === 'number') {
    if (typeof field.min === 'number') rules.push(createMinRule(field));
    if (typeof field.max === 'number') rules.push(createMaxRule(field));
  }
  if (field.pattern) rules.push(createPatternRule(field));
  return rules;
};

const formRules = computed<FormRules>(() => {
  const rules: FormRules = {};
  if (!props.template?.fieldsJson?.fields) return rules;

  props.template.fieldsJson.fields.forEach((field) => {
    if (!field.name) return;
    const fieldRules = buildFieldRules(field);
    if (fieldRules.length > 0) {
      rules[field.name] = fieldRules;
    }
  });

  return rules;
});

const validateField = (fieldName: string) => {
  if (!fieldName || !formRef.value) return;
  formRef.value.validateField(fieldName);
};

const handleFieldChange = (fieldName: string) => {
  if (!fieldName) return;
  validateField(fieldName);
};

const validate = async (): Promise<boolean> => {
  if (!formRef.value) return false;
  try {
    await formRef.value.validate();
    return true;
  } catch {
    return false;
  }
};

defineExpose({
  validate,
  resetFields: () => formRef.value?.resetFields(),
  clearValidate: () => formRef.value?.clearValidate(),
  formRef,
});
</script>
