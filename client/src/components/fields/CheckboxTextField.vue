<template>
  <div class="checkbox-text-field">
    <el-checkbox v-model="checked" :label="field.checkboxLabel || field.label" @change="handleCheck" />
    <el-input
      v-model="text"
      :disabled="!checked || field.disabled"
      :placeholder="field.placeholder || '请输入内容'"
      style="margin-top: 6px"
      @change="emitUpdate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { FieldConfig } from './DynamicField.vue';

const props = defineProps<{
  modelValue: { checked: boolean; text: string } | null;
  field: FieldConfig;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: { checked: boolean; text: string }): void;
}>();

const checked = ref(props.modelValue?.checked ?? false);
const text = ref(props.modelValue?.text ?? '');

watch(
  () => props.modelValue,
  (val) => {
    checked.value = val?.checked ?? false;
    text.value = val?.text ?? '';
  }
);

const handleCheck = () => {
  if (!checked.value) text.value = '';
  emitUpdate();
};

const emitUpdate = () =>
  emit('update:modelValue', { checked: checked.value, text: text.value });
</script>
