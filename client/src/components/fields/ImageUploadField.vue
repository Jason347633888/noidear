<template>
  <el-upload
    :model-value="fileList"
    @update:model-value="handleFileChange"
    :disabled="field.disabled || false"
    :auto-upload="false"
    list-type="picture-card"
    :limit="field.limit || 1"
    :accept="field.accept || 'image/*'"
    :on-change="handleChange"
    :on-remove="handleRemove"
  >
    <el-icon><Plus /></el-icon>
    <template #tip>
      <div class="el-upload__tip" v-if="field.tip">
        {{ field.tip }}
      </div>
    </template>
  </el-upload>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Plus } from '@element-plus/icons-vue';
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
    fileList.value = [{ name: 'image', url: val }];
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
