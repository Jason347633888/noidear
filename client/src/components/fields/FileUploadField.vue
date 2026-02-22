<template>
  <el-upload
    :model-value="fileList"
    @update:model-value="handleFileChange"
    :disabled="field.disabled || false"
    :auto-upload="false"
    :limit="field.limit || 1"
    :accept="field.accept"
    :on-change="handleChange"
    :on-remove="handleRemove"
  >
    <el-button type="primary" :disabled="field.disabled || false">
      选择文件
    </el-button>
    <template #tip>
      <div class="el-upload__tip" v-if="field.tip">
        {{ field.tip }}
      </div>
    </template>
  </el-upload>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { UploadUserFile } from 'element-plus';
import type { FieldConfig } from './TextField.vue';

const props = defineProps<{
  modelValue: any;
  field: FieldConfig;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void;
  (e: 'blur'): void;
  (e: 'change', value: any): void;
}>();

const fileList = ref<UploadUserFile[]>([]);

watch(() => props.modelValue, (val) => {
  if (val && typeof val === 'string') {
    fileList.value = [{ name: val, url: val }];
  }
}, { immediate: true });

const handleFileChange = (files: UploadUserFile[]) => {
  fileList.value = files;
};

const handleChange = (file: UploadUserFile) => {
  emit('update:modelValue', file);
  emit('change', file);
};

const handleRemove = () => {
  emit('update:modelValue', null);
  emit('change', null);
};
</script>
