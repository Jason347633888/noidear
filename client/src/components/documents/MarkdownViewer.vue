<template>
  <article class="markdown-viewer" v-html="html" @click="handleClick" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { renderMarkdown, type WikilinkStatus } from './markdown-renderer';

const props = defineProps<{
  content: string;
  wikilinkStatusByTarget?: Record<string, WikilinkStatus>;
}>();

const emit = defineEmits<{
  (event: 'wikilink-click', target: string): void;
}>();

const html = computed(() => renderMarkdown(props.content, {
  wikilinkStatusByTarget: props.wikilinkStatusByTarget,
}));

const handleClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement | null;
  const link = target?.closest?.('.wikilink') as HTMLElement | null;
  const wikilinkTarget = link?.dataset?.target;
  if (!wikilinkTarget) return;
  emit('wikilink-click', wikilinkTarget);
};
</script>

<style scoped>
.markdown-viewer {
  color: #303133;
  font-size: 15px;
  line-height: 1.75;
  overflow-wrap: break-word;
}

.markdown-viewer :deep(:first-child) {
  margin-top: 0;
}

.markdown-viewer :deep(:last-child) {
  margin-bottom: 0;
}

.markdown-viewer :deep(h1),
.markdown-viewer :deep(h2),
.markdown-viewer :deep(h3),
.markdown-viewer :deep(h4),
.markdown-viewer :deep(h5),
.markdown-viewer :deep(h6) {
  color: #1f2937;
  font-weight: 700;
  line-height: 1.35;
  margin: 1.25em 0 0.55em;
}

.markdown-viewer :deep(h1) {
  font-size: 30px;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 8px;
}

.markdown-viewer :deep(h2) {
  font-size: 24px;
}

.markdown-viewer :deep(h3) {
  font-size: 20px;
}

.markdown-viewer :deep(p) {
  margin: 0.7em 0;
}

.markdown-viewer :deep(ul),
.markdown-viewer :deep(ol) {
  margin: 0.7em 0;
  padding-left: 1.6em;
}

.markdown-viewer :deep(li) {
  margin: 0.28em 0;
}

.markdown-viewer :deep(hr) {
  border: none;
  border-top: 1px solid #dcdfe6;
  margin: 20px 0;
}

.markdown-viewer :deep(blockquote) {
  border-left: 4px solid #d0d7de;
  color: #59636e;
  margin: 1em 0;
  padding: 0.2em 0 0.2em 1em;
}

.markdown-viewer :deep(table) {
  border-collapse: collapse;
  display: block;
  margin: 1em 0;
  max-width: 100%;
  overflow-x: auto;
  width: max-content;
}

.markdown-viewer :deep(th),
.markdown-viewer :deep(td) {
  border: 1px solid #dcdfe6;
  padding: 8px 10px;
  vertical-align: top;
}

.markdown-viewer :deep(th) {
  background: #f5f7fa;
  font-weight: 600;
}

.markdown-viewer :deep(pre) {
  background: #f6f8fa;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  margin: 1em 0;
  overflow-x: auto;
  padding: 12px 14px;
}

.markdown-viewer :deep(code) {
  background: #f6f8fa;
  border-radius: 4px;
  color: #24292f;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 0.92em;
  padding: 0.15em 0.35em;
}

.markdown-viewer :deep(pre code) {
  background: transparent;
  border-radius: 0;
  padding: 0;
}

.markdown-viewer :deep(a) {
  color: #1677d2;
  text-decoration: none;
}

.markdown-viewer :deep(a:hover) {
  text-decoration: underline;
}

.markdown-viewer :deep(.task-list-item) {
  list-style: none;
  margin-left: -1.2em;
}

.markdown-viewer :deep(.task-list-item-checkbox) {
  margin-right: 0.5em;
  vertical-align: -0.12em;
}

.markdown-viewer :deep(.callout) {
  background: #f6f8fa;
  border-left: 4px solid #8c959f;
  border-radius: 6px;
  margin: 1em 0;
  padding: 10px 12px;
}

.markdown-viewer :deep(.callout-title) {
  color: #24292f;
  font-weight: 700;
  margin-bottom: 4px;
}

.markdown-viewer :deep(.callout-content) {
  color: #4b5563;
}

.markdown-viewer :deep(.callout-info),
.markdown-viewer :deep(.callout-note) {
  background: #eff6ff;
  border-left-color: #409eff;
}

.markdown-viewer :deep(.callout-tip) {
  background: #f0fdf4;
  border-left-color: #67c23a;
}

.markdown-viewer :deep(.callout-warning) {
  background: #fffbeb;
  border-left-color: #e6a23c;
}

.markdown-viewer :deep(.callout-danger) {
  background: #fef2f2;
  border-left-color: #f56c6c;
}

.markdown-viewer :deep(.wikilink) {
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  padding: 0 3px;
}

.markdown-viewer :deep(.wikilink-resolved) {
  background: #eef6ff;
  color: #1677d2;
}

.markdown-viewer :deep(.wikilink-dangling) {
  background: #fff2f0;
  color: #cf1322;
  text-decoration: underline dotted;
}

.markdown-viewer :deep(.wikilink-conflict) {
  background: #fff7e6;
  color: #ad6800;
  text-decoration: underline wavy;
}

.markdown-viewer :deep(.wikilink-unknown) {
  background: #f5f7fa;
  color: #606266;
  text-decoration: underline dotted;
}
</style>
