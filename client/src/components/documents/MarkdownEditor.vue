<template>
  <div class="markdown-editor">
    <el-input v-model="draft" type="textarea" :rows="24" />
    <MarkdownViewer :content="draft" />
  </div>
</template>

<script setup lang="ts">
import { watch, ref } from 'vue';
import MarkdownViewer from './MarkdownViewer.vue';

const props = defineProps<{ modelValue: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
const draft = ref(props.modelValue);

watch(() => props.modelValue, (value) => {
  draft.value = value;
});
watch(draft, (value) => emit('update:modelValue', value));
</script>

<style scoped>
.markdown-editor {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 900px) {
  .markdown-editor {
    grid-template-columns: 1fr;
  }
}
</style>
