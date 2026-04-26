<template>
  <div class="read-confirmation-center">
    <div class="toolbar">
      <el-input v-model="documentId" placeholder="输入文档ID查看阅读状态" clearable />
      <el-button type="primary" @click="load">查询</el-button>
    </div>
    <el-table :data="rows" v-loading="loading" stripe>
      <el-table-column prop="scopeType" label="范围类型" width="120" />
      <el-table-column prop="scopeId" label="范围对象" width="180" />
      <el-table-column prop="dueAt" label="截止时间" width="180" />
      <el-table-column label="状态" width="120">
        <template #default="{ row }">
          <el-tag :type="row.confirmed ? 'success' : row.overdue ? 'danger' : 'warning'">
            {{ row.confirmed ? '已确认' : row.overdue ? '逾期' : '待确认' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="reason" label="原因" min-width="220" show-overflow-tooltip />
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { documentOperationsApi } from '@/api/document-operations';

const documentId = ref('');
const rows = ref<any[]>([]);
const loading = ref(false);

const load = async () => {
  if (!documentId.value) {
    ElMessage.error('请输入文档ID');
    return;
  }
  loading.value = true;
  try {
    rows.value = await documentOperationsApi.getReadStatus(documentId.value) as any[];
  } catch {
    ElMessage.error('获取阅读确认状态失败');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.toolbar {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) auto;
  gap: 10px;
  margin-bottom: 12px;
}
</style>
