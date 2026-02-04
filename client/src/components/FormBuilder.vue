<template>
  <div class="form-builder">
    <el-form :model="formData" :rules="rules" ref="formRef" v-bind="$attrs">
      <div ref="fieldsContainer" class="fields-container">
        <el-form-item
          v-for="field in fields"
          :key="field.name"
          :label="field.label"
          :prop="field.name"
          :required="field.required"
          :data-index="field.name"
        >
          <template #label>
            <span class="drag-handle" v-if="!disabled">
              <el-icon><Rank /></el-icon>
            </span>
            {{ field.label }}
          </template>

          <!-- 文本输入 -->
          <el-input
            v-if="field.type === 'text'"
            v-model="formData[field.name]"
            :placeholder="`请输入${field.label}`"
            clearable
            :disabled="disabled"
          />

          <!-- 多行文本 -->
          <el-input
            v-else-if="field.type === 'textarea'"
            v-model="formData[field.name]"
            type="textarea"
            :rows="3"
            :placeholder="`请输入${field.label}`"
            clearable
            :disabled="disabled"
          />

          <!-- 数字 -->
          <el-input-number
            v-else-if="field.type === 'number'"
            v-model="formData[field.name]"
            :placeholder="`请输入${field.label}`"
            controls-position="right"
            :disabled="disabled"
          />

          <!-- 日期 -->
          <el-date-picker
            v-else-if="field.type === 'date'"
            v-model="formData[field.name]"
            type="date"
            placeholder="选择日期"
            value-format="YYYY-MM-DD"
            :disabled="disabled"
          />

          <!-- 下拉选择 -->
          <el-select
            v-else-if="field.type === 'select'"
            v-model="formData[field.name]"
            :placeholder="`请选择${field.label}`"
            clearable
            :disabled="disabled"
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
            :disabled="disabled"
          />
        </el-form-item>
      </div>
      <slot />
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted, nextTick } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import { Rank } from '@element-plus/icons-vue';
import Sortable from 'sortablejs';

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
  (e: 'update:fields', value: TemplateField[]): void;
  (e: 'submit', value: Record<string, unknown>): void;
}>();

const formRef = ref<FormInstance>();
const fieldsContainer = ref<HTMLElement>();
const formData = reactive<Record<string, unknown>>({});
const rules = reactive<FormRules>({});
let sortableInstance: Sortable | null = null;

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

const initSortable = () => {
  if (props.disabled || !fieldsContainer.value) return;

  sortableInstance = Sortable.create(fieldsContainer.value, {
    animation: 150,
    handle: '.drag-handle',
    ghostClass: 'sortable-ghost',
    onEnd: (evt) => {
      const fields = [...props.fields];
      const [moved] = fields.splice(evt.oldIndex!, 1);
      fields.splice(evt.newIndex!, 0, moved);
      emit('update:fields', fields);
    },
  });
};

watch(
  () => props.fields,
  () => initForm(),
  { deep: true },
);

watch(
  formData,
  (val) => emit('update:modelValue', val),
  { deep: true },
);

watch(
  () => props.disabled,
  (val) => {
    if (val && sortableInstance) {
      sortableInstance.destroy();
      sortableInstance = null;
    } else if (!val && fieldsContainer.value) {
      initSortable();
    }
  },
);

defineExpose({
  validate: () => formRef.value?.validate(),
  validateField: (prop: string) => formRef.value?.validateField(prop),
  resetFields: () => formRef.value?.resetFields(),
  clearValidate: () => formRef.value?.clearValidate(),
  submit: () => emit('submit', { ...formData }),
});

onMounted(() => {
  initForm();
  nextTick(() => initSortable());
});
</script>

<style scoped>
.form-builder {
  width: 100%;
}

.fields-container {
  min-height: 10px;
}

.drag-handle {
  cursor: move;
  color: #909399;
  margin-right: 4px;
}

.drag-handle:hover {
  color: #409eff;
}

.sortable-ghost {
  opacity: 0.5;
  background: #f5f7fa;
}
</style>
