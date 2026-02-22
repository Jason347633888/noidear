<template>
  <div class="advanced-search">
    <el-card class="search-header">
      <h2 class="page-title">高级搜索</h2>
      <div class="search-input-wrap">
        <el-input
          v-model="keyword"
          size="large"
          placeholder="输入关键词搜索文档..."
          clearable
          @keyup.enter="handleSearch"
        >
          <template #append>
            <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          </template>
        </el-input>
      </div>

      <div class="search-tags">
        <span class="tag-label">热门搜索：</span>
        <el-tag
          v-for="kw in hotKeywords"
          :key="kw"
          class="hot-tag"
          @click="applyHotKeyword(kw)"
        >{{ kw }}</el-tag>
      </div>

      <div v-if="searchHistory.length > 0" class="search-history">
        <span class="tag-label">搜索历史：</span>
        <el-tag
          v-for="kw in searchHistory"
          :key="kw"
          closable
          class="history-tag"
          @click="applyHotKeyword(kw)"
          @close="removeHistory(kw)"
        >{{ kw }}</el-tag>
        <el-button link size="small" @click="clearHistory">清除全部</el-button>
      </div>
    </el-card>

    <SearchFilter @search="handleFilterSearch" @reset="handleReset" />

    <SearchResult
      :results="results"
      :total="total"
      :loading="loading"
      :keyword="keyword"
      @page-change="handlePageChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Search } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import SearchFilter from '@/components/SearchFilter.vue';
import SearchResult from '@/components/SearchResult.vue';
import searchApi from '@/api/search';
import type { SearchResult as SearchResultType } from '@/api/search';

const HISTORY_KEY = 'search_history';
const MAX_HISTORY = 10;

const keyword = ref('');
const results = ref<SearchResultType[]>([]);
const total = ref(0);
const loading = ref(false);
const searchHistory = ref<string[]>([]);
const currentPage = ref(1);
const pageSize = ref(10);

const hotKeywords = ['操作规程', '质量手册', '设备维护', '安全规范', '工艺文件'];

interface FilterState {
  type: string;
  department: string;
  sortBy: 'relevance' | 'date';
  startDate: string;
  endDate: string;
}

const currentFilter = ref<FilterState>({
  type: '',
  department: '',
  sortBy: 'relevance',
  startDate: '',
  endDate: '',
});

onMounted(() => {
  const stored = localStorage.getItem(HISTORY_KEY);
  searchHistory.value = stored ? JSON.parse(stored) : [];
});

async function handleSearch() {
  if (!keyword.value.trim()) {
    ElMessage.warning('请输入搜索关键词');
    return;
  }
  addToHistory(keyword.value.trim());
  await fetchResults();
}

async function fetchResults() {
  loading.value = true;
  try {
    const res = await searchApi.query({
      keyword: keyword.value,
      type: currentFilter.value.type || undefined,
      department: currentFilter.value.department || undefined,
      sortBy: currentFilter.value.sortBy,
      startDate: currentFilter.value.startDate || undefined,
      endDate: currentFilter.value.endDate || undefined,
      page: currentPage.value,
      limit: pageSize.value,
    });
    results.value = res.items;
    total.value = res.total;
  } catch {
    ElMessage.error('搜索失败，请重试');
  } finally {
    loading.value = false;
  }
}

async function handleFilterSearch(filters: FilterState) {
  currentFilter.value = filters;
  currentPage.value = 1;
  await fetchResults();
}

function handleReset() {
  currentFilter.value = {
    type: '',
    department: '',
    sortBy: 'relevance',
    startDate: '',
    endDate: '',
  };
}

async function handlePageChange(page: number, size: number) {
  currentPage.value = page;
  pageSize.value = size;
  await fetchResults();
}

function applyHotKeyword(kw: string) {
  keyword.value = kw;
  handleSearch();
}

function addToHistory(kw: string) {
  const history = searchHistory.value.filter((h) => h !== kw);
  history.unshift(kw);
  searchHistory.value = history.slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(searchHistory.value));
}

function removeHistory(kw: string) {
  searchHistory.value = searchHistory.value.filter((h) => h !== kw);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(searchHistory.value));
}

function clearHistory() {
  searchHistory.value = [];
  localStorage.removeItem(HISTORY_KEY);
}
</script>

<style scoped>
.advanced-search {
  padding: 0;
}

.search-header {
  margin-bottom: 16px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 16px;
}

.search-input-wrap {
  margin-bottom: 16px;
}

.search-tags,
.search-history {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.tag-label {
  font-size: 13px;
  color: #666;
}

.hot-tag,
.history-tag {
  cursor: pointer;
}
</style>
