<template>
  <div class="training-need-center">
    <div class="toolbar">
      <el-select v-model="status" clearable placeholder="状态" @change="load">
        <el-option value="suggested" label="待评估" />
        <el-option value="accepted" label="已接受" />
        <el-option value="dismissed" label="已驳回" />
        <el-option value="linked" label="已关联培训" />
      </el-select>
      <el-button type="primary" @click="load">刷新</el-button>
    </div>
    <el-table :data="rows" v-loading="loading" stripe>
      <el-table-column prop="document.title" label="文件" min-width="220" show-overflow-tooltip />
      <el-table-column prop="targetDepartment" label="目标部门" width="140" />
      <el-table-column prop="status" label="状态" width="110" />
      <el-table-column prop="reason" label="原因" min-width="260" show-overflow-tooltip />
      <el-table-column label="操作" width="180">
        <template #default="{ row }">
          <el-button link type="primary" @click="accept(row.id)">接受</el-button>
          <el-button link type="danger" @click="dismiss(row.id)">驳回</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { documentOperationsApi } from '@/api/document-operations';

const status = ref('');
const rows = ref<any[]>([]);
const loading = ref(false);

const load = async () => {
  loading.value = true;
  try {
    rows.value = await documentOperationsApi.listTrainingNeeds(status.value || undefined) as any[];
  } catch {
    ElMessage.error('获取培训需求失败');
  } finally {
    loading.value = false;
  }
};

const accept = async (id: string) => {
  await documentOperationsApi.acceptTrainingNeed(id);
  await load();
};

const dismiss = async (id: string) => {
  await documentOperationsApi.dismissTrainingNeed(id, '当前不适用');
  await load();
};

onMounted(load);
</script>

<style scoped>
.toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}
</style>
