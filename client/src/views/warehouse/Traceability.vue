<template>
  <div class="traceability">
    <el-card>
      <template #header>
        <span>物料追溯查询</span>
      </template>

      <el-form inline>
        <el-form-item label="批次号">
          <el-input v-model="batchId" placeholder="输入批次 ID 进行追溯" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleTrace" :loading="loading">追溯</el-button>
        </el-form-item>
      </el-form>

      <el-divider v-if="traceResult" />

      <el-tree
        v-if="traceResult"
        :data="treeData"
        :props="{ label: 'label', children: 'children' }"
        default-expand-all
      />

      <el-empty v-if="searched && !traceResult" description="未找到追溯数据" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { traceabilityApi } from '@/api/warehouse';

const loading = ref(false);
const searched = ref(false);
const batchId = ref('');
const traceResult = ref<any>(null);

const treeData = computed(() => {
  if (!traceResult.value) return [];
  return [{ label: `追溯结果: ${batchId.value}`, children: buildTree(traceResult.value) }];
});

const buildTree = (data: any): any[] => {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data.map((item: any) => ({
      label: item.name || item.batchNumber || item.id || '未知',
      children: item.children ? buildTree(item.children) : [],
    }));
  }
  return [{ label: JSON.stringify(data) }];
};

const handleTrace = async () => {
  if (!batchId.value.trim()) {
    ElMessage.warning('请输入批次 ID');
    return;
  }
  loading.value = true;
  searched.value = true;
  try {
    const res: any = await traceabilityApi.trace(batchId.value.trim());
    traceResult.value = res;
  } catch (error) {
    traceResult.value = null;
    ElMessage.error('追溯查询失败');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.traceability { padding: 0; }
</style>
