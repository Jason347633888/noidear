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

          <!-- Text input -->
          <el-input
            v-if="field.type === 'text'"
            v-model="formData[field.name]"
            :placeholder="`请输入${field.label}`"
            clearable
            :disabled="disabled"
          />

          <!-- Textarea -->
          <el-input
            v-else-if="field.type === 'textarea'"
            v-model="formData[field.name]"
            type="textarea"
            :rows="3"
            :placeholder="`请输入${field.label}`"
            clearable
            :disabled="disabled"
          />

          <!-- Number -->
          <el-input-number
            v-else-if="field.type === 'number'"
            v-model="formData[field.name]"
            :placeholder="`请输入${field.label}`"
            controls-position="right"
            :disabled="disabled"
          />

          <!-- Date -->
          <el-date-picker
            v-else-if="field.type === 'date'"
            v-model="formData[field.name]"
            type="date"
            placeholder="选择日期"
            value-format="YYYY-MM-DD"
            :disabled="disabled"
          />

          <!-- Time -->
          <el-time-picker
            v-else-if="field.type === 'time'"
            v-model="formData[field.name]"
            placeholder="选择时间"
            value-format="HH:mm:ss"
            :disabled="disabled"
          />

          <!-- DateTime -->
          <el-date-picker
            v-else-if="field.type === 'datetime'"
            v-model="formData[field.name]"
            type="datetime"
            placeholder="选择日期时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            :disabled="disabled"
          />

          <!-- Select dropdown -->
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

          <!-- Radio -->
          <el-radio-group
            v-else-if="field.type === 'radio'"
            v-model="formData[field.name]"
            :disabled="disabled"
          >
            <el-radio
              v-for="opt in field.options"
              :key="String(opt.value)"
              :value="opt.value"
            >
              {{ opt.label }}
            </el-radio>
          </el-radio-group>

          <!-- Checkbox -->
          <el-checkbox-group
            v-else-if="field.type === 'checkbox'"
            v-model="formData[field.name]"
            :disabled="disabled"
          >
            <el-checkbox
              v-for="opt in field.options"
              :key="String(opt.value)"
              :label="opt.value"
            >
              {{ opt.label }}
            </el-checkbox>
          </el-checkbox-group>

          <!-- Boolean switch -->
          <el-switch
            v-else-if="field.type === 'boolean' || field.type === 'switch'"
            v-model="formData[field.name]"
            :disabled="disabled"
          />

          <!-- Email -->
          <el-input
            v-else-if="field.type === 'email'"
            v-model="formData[field.name]"
            type="email"
            :placeholder="`请输入${field.label}`"
            clearable
            :disabled="disabled"
          >
            <template #prefix>
              <el-icon><Message /></el-icon>
            </template>
          </el-input>

          <!-- Phone -->
          <el-input
            v-else-if="field.type === 'phone'"
            v-model="formData[field.name]"
            :placeholder="`请输入${field.label}`"
            clearable
            :disabled="disabled"
          >
            <template #prefix>
              <el-icon><Phone /></el-icon>
            </template>
          </el-input>

          <!-- URL -->
          <el-input
            v-else-if="field.type === 'url'"
            v-model="formData[field.name]"
            :placeholder="`请输入${field.label}`"
            clearable
            :disabled="disabled"
          >
            <template #prefix>
              <el-icon><Link /></el-icon>
            </template>
          </el-input>

          <!-- Slider -->
          <el-slider
            v-else-if="field.type === 'slider'"
            v-model="formData[field.name]"
            :disabled="disabled"
          />

          <!-- Rate -->
          <el-rate
            v-else-if="field.type === 'rate'"
            v-model="formData[field.name]"
            :disabled="disabled"
          />

          <!-- Color picker -->
          <el-color-picker
            v-else-if="field.type === 'color'"
            v-model="formData[field.name]"
            :disabled="disabled"
          />

          <!-- Cascader -->
          <el-cascader
            v-else-if="field.type === 'cascader'"
            v-model="formData[field.name]"
            :options="field.options || []"
            :placeholder="`请选择${field.label}`"
            clearable
            :disabled="disabled"
          />

          <!-- File upload (stub) -->
          <el-upload
            v-else-if="field.type === 'file'"
            :disabled="disabled"
            :auto-upload="false"
            :limit="1"
          >
            <el-button type="primary" :disabled="disabled">
              选择文件
            </el-button>
          </el-upload>

          <!-- Image upload (stub) -->
          <el-upload
            v-else-if="field.type === 'image'"
            :disabled="disabled"
            :auto-upload="false"
            list-type="picture-card"
            :limit="1"
          >
            <el-icon><Plus /></el-icon>
          </el-upload>

          <!-- Rich text (fallback to textarea) -->
          <el-input
            v-else-if="field.type === 'richtext'"
            v-model="formData[field.name]"
            type="textarea"
            :rows="6"
            :placeholder="`请输入${field.label}（富文本）`"
            :disabled="disabled"
          />

          <!-- Fallback: text input for unknown types -->
          <el-input
            v-else
            v-model="formData[field.name]"
            :placeholder="`请输入${field.label}`"
            clearable
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
import { Rank, Message, Phone, Link, Plus } from '@element-plus/icons-vue';
import Sortable from 'sortablejs';
import type { FieldTypeValue } from '@/constants/field-types';

export interface TemplateField {
  name: string;
  label: string;
  type: FieldTypeValue;
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
    case 'slider':
    case 'rate':
      return 0;
    case 'boolean':
    case 'switch':
      return false;
    case 'checkbox':
      return [];
    case 'date':
    case 'time':
    case 'datetime':
      return '';
    default:
      return '';
  }
};

const getValidationRules = (field: TemplateField) => {
  const fieldRules: unknown[] = [];

  if (field.required) {
    const isSelectionType = ['select', 'radio', 'cascader', 'checkbox', 'date', 'time', 'datetime', 'color'].includes(field.type);
    fieldRules.push({
      required: true,
      message: `请${isSelectionType ? '选择' : '输入'}${field.label}`,
      trigger: isSelectionType ? 'change' : 'blur',
    });
  }

  // Type-specific validation
  if (field.type === 'email') {
    fieldRules.push({
      type: 'email',
      message: '请输入正确的邮箱地址',
      trigger: 'blur',
    });
  }

  if (field.type === 'url') {
    fieldRules.push({
      type: 'url',
      message: '请输入正确的链接地址',
      trigger: 'blur',
    });
  }

  return fieldRules;
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
