<template>
  <div class="audit-chain-explorer">
    <div class="toolbar">
      <el-select v-model="sourceType" placeholder="来源类型">
        <el-option value="document" label="文件" />
      </el-select>
      <el-input v-model="sourceId" placeholder="来源ID" />
      <el-button type="primary" @click="load">查看链路</el-button>
    </div>
    <el-card>
      <template #header>链路节点</template>
      <el-table :data="chain?.nodes || []" v-loading="loading" stripe>
        <el-table-column prop="type" label="类型" width="140" />
        <el-table-column prop="label" label="节点" min-width="240" />
        <el-table-column prop="depth" label="层级" width="100" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { documentOperationsApi } from '@/api/document-operations';

const sourceType = ref('document');
const sourceId = ref('');
const chain = ref<any | null>(null);
const loading = ref(false);

const load = async () => {
  if (!sourceId.value) {
    ElMessage.error('请输入来源ID');
    return;
  }
  loading.value = true;
  try {
    chain.value = await documentOperationsApi.getAuditChain({
      sourceType: sourceType.value,
      sourceId: sourceId.value,
      maxDepth: 4,
    });
  } catch {
    ElMessage.error('获取审核链路失败');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.toolbar {
  display: grid;
  grid-template-columns: 160px minmax(260px, 1fr) auto;
  gap: 10px;
  margin-bottom: 12px;
}
</style>
