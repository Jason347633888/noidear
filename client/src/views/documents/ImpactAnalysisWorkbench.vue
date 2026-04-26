<template>
  <div class="impact-analysis-workbench">
    <div class="toolbar">
      <el-select v-model="sourceType" placeholder="来源类型">
        <el-option value="document" label="文件" />
        <el-option value="external_file" label="外来文件" />
        <el-option value="change_event" label="变更" />
        <el-option value="corrective_action" label="CAPA" />
        <el-option value="recall" label="召回" />
        <el-option value="traceability" label="追溯" />
      </el-select>
      <el-input v-model="sourceId" placeholder="来源ID" />
      <el-input v-model="title" placeholder="评估标题" />
      <el-button type="primary" @click="createReview">生成影响评估</el-button>
    </div>
    <el-table :data="review?.items || []" v-loading="loading" stripe>
      <el-table-column prop="targetType" label="目标类型" width="150" />
      <el-table-column prop="targetLabel" label="目标" min-width="220" />
      <el-table-column prop="impactLevel" label="影响等级" width="120" />
      <el-table-column prop="suggestedAction" label="建议动作" min-width="240" />
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { documentOperationsApi } from '@/api/document-operations';

const sourceType = ref('document');
const sourceId = ref('');
const title = ref('');
const review = ref<any | null>(null);
const loading = ref(false);

const createReview = async () => {
  if (!sourceId.value || !title.value) {
    ElMessage.error('请输入来源ID和标题');
    return;
  }
  loading.value = true;
  try {
    review.value = await documentOperationsApi.createImpactReview({
      sourceType: sourceType.value,
      sourceId: sourceId.value,
      title: title.value,
    });
  } catch {
    ElMessage.error('生成影响评估失败');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.toolbar {
  display: grid;
  grid-template-columns: 160px 1fr 1fr auto;
  gap: 10px;
  margin-bottom: 12px;
}
</style>
