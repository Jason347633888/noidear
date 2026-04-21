<template>
  <div class="excel-viewer">
    <div v-if="loading" class="viewer-loading">
      <el-skeleton :rows="8" animated />
    </div>

    <template v-else-if="tableData.length > 0">
      <div class="viewer-toolbar">
        <span class="row-count">共 {{ tableData.length - 1 }} 行数据</span>
        <el-button size="small" @click="load">刷新</el-button>
      </div>
      <el-table
        :data="tableData.slice(1)"
        stripe
        border
        size="small"
        class="excel-table"
        max-height="600"
      >
        <el-table-column
          v-for="(header, idx) in headers"
          :key="idx"
          :label="header"
          :prop="String(idx)"
          min-width="120"
          show-overflow-tooltip
        />
      </el-table>
    </template>

    <el-empty
      v-else-if="error"
      :description="error"
      :image-size="80"
    >
      <el-button @click="load">重新加载</el-button>
    </el-empty>

    <el-empty v-else-if="!loading" description="无表格数据" :image-size="80" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import request from '@/api/request';

interface ConvertResult {
  htmlUrl: string;
  cachedAt?: string;
}

const props = defineProps<{
  filePath: string;
}>();

const loading = ref(false);
const rawHtml = ref('');
const error = ref('');

const parseHtmlToTable = (html: string): string[][] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const rows = doc.querySelectorAll('tr');
  const result: string[][] = [];
  rows.forEach((tr) => {
    const cells = tr.querySelectorAll('td, th');
    const row: string[] = [];
    cells.forEach((cell) => {
      row.push((cell.textContent || '').trim());
    });
    if (row.some((c) => c !== '')) {
      result.push(row);
    }
  });
  return result;
};

const tableData = computed(() => {
  if (!rawHtml.value) return [];
  return parseHtmlToTable(rawHtml.value);
});

const headers = computed(() => {
  if (tableData.value.length === 0) return [];
  return tableData.value[0];
});

const load = async () => {
  if (!props.filePath) return;
  loading.value = true;
  error.value = '';
  rawHtml.value = '';
  try {
    const convertRes = await request.post<ConvertResult>('/documents/convert', {
      minioPath: props.filePath,
    });
    const htmlRes = await fetch(convertRes.htmlUrl);
    rawHtml.value = await htmlRes.text();
  } catch (err: any) {
    const msg = err?.response?.data?.message || 'Excel 转换失败，请检查服务配置';
    error.value = msg;
    ElMessage.error(msg);
  } finally {
    loading.value = false;
  }
};

watch(() => props.filePath, () => {
  load();
});

onMounted(() => {
  load();
});
</script>

<style scoped>
.excel-viewer {
  width: 100%;
  min-height: 200px;
}

.viewer-loading {
  padding: 24px;
}

.viewer-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.row-count {
  font-size: 13px;
  color: #909399;
}

.excel-table {
  width: 100%;
}
</style>
