<template>
  <div class="sanitizer-concentration-page">
    <PageHeaderBlock
      eyebrow="清洁消毒"
      title="消毒液浓度记录"
      description="记录并追踪清洁消毒过程中消毒液的浓度检测结果"
    />

    <div class="app-panel app-panel--padded">
      <el-table :data="records" v-loading="loading" style="width: 100%">
        <el-table-column prop="area" label="区域" />
        <el-table-column prop="chemical_name" label="消毒剂名称" />
        <el-table-column prop="target_concentration" label="目标浓度 (ppm)" />
        <el-table-column prop="actual_concentration" label="实测浓度 (ppm)" />
        <el-table-column prop="result" label="结果">
          <template #default="{ row }">
            <el-tag :type="row.result === 'pass' ? 'success' : 'danger'" size="small">
              {{ row.result === 'pass' ? '合格' : '不合格' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="checked_at" label="检测时间">
          <template #default="{ row }">
            {{ row.checked_at ? new Date(row.checked_at).toLocaleString('zh-CN') : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="operator" label="操作人" />
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import PageHeaderBlock from '@/components/layout/PageHeaderBlock.vue';

interface SanitizerConcentrationRecord {
  id: string;
  area?: string;
  chemical_name?: string;
  target_concentration?: number;
  actual_concentration?: number;
  result: 'pass' | 'fail';
  checked_at?: string;
  operator?: string;
}

const loading = ref(false);
const records = ref<SanitizerConcentrationRecord[]>([]);

async function loadRecords() {
  loading.value = true;
  try {
    const res = await fetch('/api/sanitizer-concentration-checks', {
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    records.value = (await res.json()) as SanitizerConcentrationRecord[];
  } catch {
    ElMessage.error('加载消毒液浓度记录失败，请稍后重试');
    records.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadRecords();
});
</script>

<style scoped>
.sanitizer-concentration-page {
  padding: 0 0 32px;
}
</style>
