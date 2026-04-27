<template>
  <article class="markdown-viewer" v-html="html" />
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ content: string }>();

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const renderLine = (line: string) => {
  const escaped = escapeHtml(line).replace(/\[\[([^\]]+)\]\]/g, '<span class="wikilink">$1</span>');
  if (escaped.startsWith('# ')) return `<h1>${escaped.slice(2)}</h1>`;
  if (escaped.startsWith('## ')) return `<h2>${escaped.slice(3)}</h2>`;
  if (!escaped.trim()) return '';
  return `<p>${escaped}</p>`;
};

const html = computed(() => props.content.split('\n').map(renderLine).join(''));
</script>

<style scoped>
.markdown-viewer {
  line-height: 1.7;
}

:deep(.wikilink) {
  color: #1677d2;
  font-weight: 600;
}
</style>
