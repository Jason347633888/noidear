<!--
  DynamicForm.vue
  用途：通用动态表单填写组件（RecordFill.vue、其他填写页面调用）
  功能：根据 RecordTemplate.fieldsJson.fields 渲染可填写表单
  注意：此组件不含拖拽排序，设计器请使用 FormBuilder.vue
-->
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
        :label="isLayoutField(field.type) ? '' : field.label"
        :prop="isLayoutField(field.type) ? undefined : field.name"
        :required="isLayoutField(field.type) ? false : field.required"
        :class="{ 'full-width-field': isLayoutField(field.type) }"
        :label-width="isLayoutField(field.type) ? '0px' : undefined"
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
import { validateFieldValue, validateFields } from '@/utils/formValidation';
import type { FormValidationError, FormValidationField } from '@/utils/formValidation';
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

const toValidationField = (field: FieldConfig): FormValidationField => ({
  ...field,
  type: field.type,
  name: field.name,
  label: field.label,
});

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

const buildFieldRules = (field: FieldConfig) => {
  if (isLayoutField(field.type)) return [];

  return [
    {
      validator: (_rule: unknown, value: unknown, callback: (error?: Error) => void) => {
        try {
          const errors: FormValidationError[] = validateFieldValue(toValidationField(field), value, {
            ...formData,
          });

          if (errors.length > 0) {
            callback(new Error(errors[0].message));
            return;
          }

          callback();
        } catch {
          callback(new Error('验证失败'));
        }
      },
      trigger: ['blur', 'change'],
    },
  ];
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
    const fields = (props.template?.fieldsJson?.fields || [])
      .filter((field) => field.name && !isLayoutField(field.type))
      .map(toValidationField);
    const unifiedResult = validateFields(fields, { ...formData });

    if (!unifiedResult.valid) {
      await formRef.value.validate().catch(() => false);
      return false;
    }

    return await formRef.value.validate();
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

const LAYOUT_FIELD_TYPES = new Set(['section-header', 'static-content']);
const isLayoutField = (type: string) => LAYOUT_FIELD_TYPES.has(type);
</script>

<style scoped>
.full-width-field :deep(.el-form-item__content) {
  margin-left: 0 !important;
}
</style>
