<template>
  <div class="search-result">
    <div v-if="results.length === 0 && !loading" class="no-results">
      <el-empty description="未找到相关文档" />
    </div>
    <div v-else>
      <div class="result-header">
        <span class="result-count">共找到 {{ total }} 条相关文档</span>
      </div>
      <div v-loading="loading" class="result-list">
        <el-card
          v-for="item in results"
          :key="item.id"
          class="result-item"
          :body-style="{ padding: '16px' }"
          @click="handleClick(item.id)"
        >
          <div class="item-title" v-html="highlightText(item.title)" />
          <div class="item-meta">
            <el-tag size="small" type="info">{{ item.type }}</el-tag>
            <span class="item-department">{{ item.department }}</span>
            <span class="item-date">{{ formatDate(item.updatedAt) }}</span>
          </div>
          <div class="item-summary" v-html="item.highlight ? item.highlight : highlightText(item.summary)" />
        </el-card>
      </div>
      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @change="handlePageChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import dayjs from 'dayjs';
import type { SearchResult } from '@/api/search';

const props = defineProps<{
  results: SearchResult[];
  total: number;
  loading: boolean;
  keyword: string;
}>();

const emit = defineEmits<{
  pageChange: [page: number, size: number];
}>();

const router = useRouter();
const currentPage = ref(1);
const pageSize = ref(10);

function formatDate(date: string) {
  return dayjs(date).format('YYYY-MM-DD');
}

function highlightText(text: string): string {
  if (!props.keyword) return text;
  const escaped = props.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

function handleClick(id: string) {
  router.push(`/documents/${id}`);
}

function handlePageChange(page: number, size: number) {
  emit('pageChange', page, size);
}
</script>

<style scoped>
.search-result {
  width: 100%;
}

.result-header {
  margin-bottom: 12px;
  color: #666;
  font-size: 14px;
}

.result-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-item {
  cursor: pointer;
  transition: box-shadow 0.2s;
}

.result-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.item-title {
  font-size: 16px;
  font-weight: 600;
  color: #1890ff;
  margin-bottom: 8px;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 12px;
  color: #999;
}

.item-summary {
  font-size: 13px;
  color: #555;
  line-height: 1.6;
}

:deep(mark) {
  background: #ffe58f;
  padding: 0 2px;
  border-radius: 2px;
}

.item-summary :deep(em),
.item-summary :deep(mark) {
  background-color: #fff3cd;
  color: #856404;
  font-style: normal;
  font-weight: 600;
  padding: 0 2px;
  border-radius: 2px;
}

.pagination-wrap {
  margin-top: 24px;
  display: flex;
  justify-content: center;
}
</style>
